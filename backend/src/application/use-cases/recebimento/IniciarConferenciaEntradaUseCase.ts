import { randomUUID } from 'node:crypto';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
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
  constructor(private readonly conferenciaRepo: IConferenciaEntradaRepository) {}

  async execute(input: IniciarConferenciaEntradaInput): Promise<SessaoConferenciaEntrada> {
    const nivel = input.nivel || 1;
    const nunotas = input.nunotas.filter(Boolean);

    if (nunotas.length === 0) {
      throw new Error('Nenhuma nota informada para iniciar a conferência.');
    }

    // Verifica se já existe sessão ativa
    const sessoesExistentes = await this.conferenciaRepo.obterSessoesPorNunotas(nunotas);
    const sessaoAtiva = sessoesExistentes.find((s) => s.status !== 'Conferido');

    const agora = new Date().toISOString();
    const statusPorNivel: Record<number, StatusConferenciaEntrada> = {
      1: 'N1 em Andamento',
      2: 'N2 em Andamento',
      3: 'N3 em Andamento',
    };

    if (sessaoAtiva) {
      // Se já existe, atualiza conferente e nível se for transição
      sessaoAtiva.nivelAtual = nivel;
      sessaoAtiva.status = statusPorNivel[nivel] || sessaoAtiva.status;
      sessaoAtiva.conferente = input.conferente || sessaoAtiva.conferente;
      sessaoAtiva.atualizadoEm = agora;
      await this.conferenciaRepo.salvarSessao(sessaoAtiva);
      return sessaoAtiva;
    }

    const novaSessao: SessaoConferenciaEntrada = {
      id: randomUUID(),
      nunotas,
      status: statusPorNivel[nivel] || 'N1 em Andamento',
      nivelAtual: nivel,
      criadoEm: agora,
      atualizadoEm: agora,
      conferente: input.conferente || 'Operador',
    };

    await this.conferenciaRepo.salvarSessao(novaSessao);
    return novaSessao;
  }
}
