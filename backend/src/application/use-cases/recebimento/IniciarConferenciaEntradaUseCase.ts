import { randomUUID } from 'node:crypto';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';
import {
  SessaoConferenciaEntrada,
  StatusConferenciaEntrada,
} from '../../../domain/entities/ConferenciaEntrada.js';

export interface IniciarConferenciaEntradaInput {
  nunotas: number[];
  nivel?: number;
  conferente: string;
}

export class IniciarConferenciaEntradaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly configSistemaRepo?: IConfiguracaoSistemaRepository
  ) {}

  async execute(input: IniciarConferenciaEntradaInput): Promise<SessaoConferenciaEntrada> {
    let nivel = input.nivel;
    if (!nivel) {
      if (this.configSistemaRepo) {
        const n1Param = await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel1_ativo');
        nivel = n1Param === 'false' ? 2 : 1;
      } else {
        nivel = 1;
      }
    }
    const nunotas = Array.from(new Set(input.nunotas.filter(Boolean)));

    if (nunotas.length === 0) {
      throw new Error('Nenhuma nota informada para iniciar a conferência.');
    }

    // Busca sessões existentes que contenham qualquer uma das notas
    const sessoesExistentes = await this.conferenciaRepo.obterSessoesPorNunotas(nunotas);
    // Filtrar apenas sessões ativas (não finalizadas nem enviadas)
    const sessoesAtivas = sessoesExistentes.filter(
      (s) => s.status !== 'Conferido' && s.status !== 'Enviado ao Sankhya'
    );

    const agora = new Date().toISOString();
    const statusPorNivel: Record<number, StatusConferenciaEntrada> = {
      1: 'N1 em Andamento',
      2: 'N2 em Andamento',
      3: 'N3 em Andamento',
    };

    // 1. Verifica se existe uma sessão ativa com match exato das notas solicitadas
    const nunotasSorted = [...nunotas].sort((a, b) => a - b);
    const sessaoExata = sessoesAtivas.find((s) => {
      const sNunotasSorted = [...s.nunotas].sort((a, b) => a - b);
      return (
        sNunotasSorted.length === nunotasSorted.length &&
        sNunotasSorted.every((n, i) => n === nunotasSorted[i])
      );
    });

    let sessaoParaUsar: SessaoConferenciaEntrada;

    if (sessaoExata) {
      sessaoParaUsar = sessaoExata;
    } else if (sessoesAtivas.length > 0) {
      // 2. Se há sessões ativas com notas diferentes das solicitadas:
      // A seleção atual do operador é soberana.
      // Desmembra as notas solicitadas criando uma nova sessão exclusiva
      // e migra apenas as bipagens dessas notas para a nova sessão.
      const novaSessao: SessaoConferenciaEntrada = {
        id: randomUUID(),
        nunotas: nunotasSorted,
        status: statusPorNivel[nivel] || 'N2 em Andamento',
        nivelAtual: nivel,
        criadoEm: agora,
        atualizadoEm: agora,
        conferente: input.conferente || 'Operador',
      };

      // Salva a nova sessão para satisfazer FK antes da migração de bipagens
      await this.conferenciaRepo.salvarSessao(novaSessao);

      for (const sAntiga of sessoesAtivas) {
        const notasDestaSessao = nunotasSorted.filter((n) => sAntiga.nunotas.includes(n));
        if (notasDestaSessao.length > 0) {
          // Migra apenas as bipagens das notas selecionadas
          await this.conferenciaRepo.migrarBipagens(sAntiga.id, novaSessao.id, notasDestaSessao);

          // Remove as notas migradas da sessão antiga
          sAntiga.nunotas = sAntiga.nunotas.filter((n) => !notasDestaSessao.includes(n));

          if (sAntiga.statusPorNota) {
            for (const n of notasDestaSessao) {
              delete sAntiga.statusPorNota[n];
            }
            sAntiga.statusPorNotaJson = JSON.stringify(sAntiga.statusPorNota);
          }

          if (sAntiga.nunotas.length === 0) {
            await this.conferenciaRepo.excluirSessao(sAntiga.id);
          } else {
            sAntiga.atualizadoEm = agora;
            await this.conferenciaRepo.salvarSessao(sAntiga);
          }
        }
      }

      await this.conferenciaRepo.salvarSessao(novaSessao);
      return novaSessao;
    } else {
      // 3. Nenhuma sessão ativa: verificar se já existe uma sessão concluída que cobre todas as notas solicitadas
      const sessaoConcluidaExistente = sessoesExistentes.find((s) => {
        const todasEstaoNesta = nunotas.every((n) => s.nunotas.includes(n));
        const statusNotaOuGeral = s.status === 'Conferido' || s.status === 'Enviado ao Sankhya';
        return todasEstaoNesta && statusNotaOuGeral;
      });

      // Se todas as notas solicitadas já foram conferidas na mesma conferência e não foi pedido avanço de nível, retorna ela mesma
      if (sessaoConcluidaExistente && (!input.nivel || input.nivel === sessaoConcluidaExistente.nivelAtual)) {
        return sessaoConcluidaExistente;
      }

      // 4. Cria uma nova sessão com todas as nunotas
      const novaSessao: SessaoConferenciaEntrada = {
        id: randomUUID(),
        nunotas: nunotasSorted,
        status: statusPorNivel[nivel] || 'N2 em Andamento',
        nivelAtual: nivel,
        criadoEm: agora,
        atualizadoEm: agora,
        conferente: input.conferente || 'Operador',
      };

      await this.conferenciaRepo.salvarSessao(novaSessao);
      return novaSessao;
    }

    // Se já existe sessão (seja match exato ou unificada):
    if (input.nivel && [1, 2, 3].includes(input.nivel) && input.nivel !== sessaoParaUsar.nivelAtual) {
      sessaoParaUsar.nivelAtual = input.nivel;
      sessaoParaUsar.status = statusPorNivel[input.nivel] || sessaoParaUsar.status;
    } else {
      // Ativa o status de andamento para o nível corrente
      if (sessaoParaUsar.nivelAtual === 2) {
        sessaoParaUsar.status = 'N2 em Andamento';
      } else if (sessaoParaUsar.nivelAtual === 3) {
        sessaoParaUsar.status = 'N3 em Andamento';
      } else {
        sessaoParaUsar.status = 'N1 em Andamento';
      }
    }

    sessaoParaUsar.conferente = input.conferente || sessaoParaUsar.conferente;
    sessaoParaUsar.atualizadoEm = agora;
    await this.conferenciaRepo.salvarSessao(sessaoParaUsar);
    return sessaoParaUsar;
  }
}
