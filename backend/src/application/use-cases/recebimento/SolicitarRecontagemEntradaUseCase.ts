import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, StatusConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface ItemRecontagemAlvo {
  nunota: number;
  sequencia: number;
  codprod: number;
}

export interface SolicitarRecontagemInput {
  conferenciaId: string;
  nivel: number; // 1, 2 ou 3
  usuario: string;
  motivo?: string;
  itens?: ItemRecontagemAlvo[];
}

export class SolicitarRecontagemEntradaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService
  ) {}

  async execute(input: SolicitarRecontagemInput): Promise<SessaoConferenciaEntrada> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const statusAlvo = (sessao.status || '').toLowerCase();
    const emAndamento =
      statusAlvo.includes('andamento') ||
      statusAlvo === 'iniciado' ||
      statusAlvo.includes('em reconferência') ||
      statusAlvo.includes('em reconferencia');

    if (emAndamento) {
      const conferenteAtivo = sessao.conferente ? `pelo conferente ${sessao.conferente}` : 'no coletor';
      throw new Error(
        `Ação bloqueada: a conferência já está em andamento ${conferenteAtivo}. Só é permitido solicitar recontagem quando a conferência estiver finalizada ou aguardando.`
      );
    }

    const nivelAlvo = Number(input.nivel);
    if (![1, 2, 3].includes(nivelAlvo)) {
      throw new Error('Nível de recontagem inválido. Escolha Nível 1, 2 ou 3.');
    }

    const agora = new Date().toISOString();
    let novoStatus: StatusConferenciaEntrada = 'Aguardando Recontagem N2';

    if (nivelAlvo === 1) {
      novoStatus = 'Aguardando Recontagem N1';
    } else if (nivelAlvo === 2) {
      novoStatus = 'Aguardando Recontagem N2';
    } else if (nivelAlvo === 3) {
      novoStatus = 'Aguardando Recontagem N3';
    }

    sessao.status = novoStatus;
    sessao.nivelAtual = nivelAlvo;
    sessao.atualizadoEm = agora;
    sessao.finalizadoEm = undefined;
    sessao.conferente = '';
    sessao.aprovadoPor = undefined;
    sessao.aprovadoEm = undefined;
    sessao.enviadoSankhyaEm = undefined;

    // Se foram especificados itens para recontagem parcial
    if (input.itens && input.itens.length > 0) {
      const mesmoNivel = sessao.nivelAtual === nivelAlvo;
      const itensExistentes = mesmoNivel ? (sessao.itensRecontagem || []) : [];
      const setChavesExistentes = new Set(
        itensExistentes.map((i) => `${i.nunota}-${i.sequencia}-${i.codprod}`)
      );
      const novosItens = input.itens.filter(
        (i) => !setChavesExistentes.has(`${i.nunota}-${i.sequencia}-${i.codprod}`)
      );
      const itensCombinados = [...itensExistentes, ...novosItens];

      sessao.itensRecontagem = itensCombinados;
      sessao.itensRecontagemJson = JSON.stringify(itensCombinados);
      // Anula apenas as bipagens do nível alvo para os itens selecionados (novos)
      const itensParaAnular = novosItens.length > 0 ? novosItens : input.itens;
      await this.conferenciaRepo.anularBipagensPorItens(sessao.id, nivelAlvo, itensParaAnular);
      sessao.observacaoAprovacao = input.motivo
        ? `Recontagem N${nivelAlvo} parcial (${itensCombinados.length} itens): ${input.motivo}`
        : `Recontagem N${nivelAlvo} parcial (${itensCombinados.length} itens) solicitada pelo gestor.`;
    } else {
      sessao.itensRecontagem = undefined;
      sessao.itensRecontagemJson = undefined;
      sessao.observacaoAprovacao = input.motivo
        ? `Recontagem N${nivelAlvo} solicitada: ${input.motivo}`
        : `Recontagem N${nivelAlvo} solicitada pelo gestor.`;
    }

    if (sessao.statusPorNota) {
      for (const nu of sessao.nunotas) {
        sessao.statusPorNota[nu] = novoStatus;
      }
      sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);
    }

    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario || 'Gestor',
        acao: 'SOLICITAR_RECONTAGEM',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunotas: sessao.nunotas,
          nivelAlvo,
          novoStatus,
          motivo: input.motivo,
        },
      });
    }

    return sessao;
  }
}
