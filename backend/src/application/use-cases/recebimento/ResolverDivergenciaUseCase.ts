import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, DecisaoFiscalItem } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface ResolverDivergenciaInput {
  conferenciaId: string;
  nunota?: number;
  usuario: string;
  acao?: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3';
  observacao?: string;
  decisoesFiscais?: Record<string, DecisaoFiscalItem>;
}

export class ResolverDivergenciaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService
  ) {}

  async execute(input: ResolverDivergenciaInput): Promise<SessaoConferenciaEntrada> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const agora = new Date().toISOString();
    sessao.statusPorNota = sessao.statusPorNota || {};

    if (input.decisoesFiscais) {
      sessao.decisoesFiscais = { ...(sessao.decisoesFiscais || {}), ...input.decisoesFiscais };
      sessao.decisoesFiscaisJson = JSON.stringify(sessao.decisoesFiscais);
    }

    if (input.acao === 'RECONFERIR_N3') {
      if (input.nunota) {
        sessao.statusPorNota[input.nunota] = 'Aguardando N3';
      } else {
        sessao.nunotas.forEach((n) => {
          sessao.statusPorNota![n] = 'Aguardando N3';
        });
      }
      sessao.status = 'Divergente';
      sessao.nivelAtual = 3;
      sessao.finalizadoEm = undefined;
      sessao.conferente = '';
      sessao.atualizadoEm = agora;
      sessao.observacaoAprovacao = input.observacao
        ? `Reconferência N3${input.nunota ? ` (Nota #${input.nunota})` : ''}: ${input.observacao}`
        : `Reconferência Nível 3 solicitada pelo gestor${input.nunota ? ` para a nota #${input.nunota}` : ''}.`;
      sessao.aprovadoPor = undefined;
      sessao.aprovadoEm = undefined;
    } else {
      // APROVAR_DIVERGENCIA (padrão)
      if (input.nunota) {
        sessao.statusPorNota[input.nunota] = 'Conferido';
      } else {
        sessao.nunotas.forEach((n) => {
          sessao.statusPorNota![n] = 'Conferido';
        });
      }

      // Se todas as notas estiverem como 'Conferido' ou 'Enviado ao Sankhya', a sessão inteira é finalizada como 'Conferido'
      const todasConferidas = sessao.nunotas.every(
        (n) => sessao.statusPorNota?.[n] === 'Conferido' || sessao.statusPorNota?.[n] === 'Enviado ao Sankhya'
      );

      if (todasConferidas) {
        sessao.status = 'Conferido';
        sessao.finalizadoEm = agora;
      }

      sessao.atualizadoEm = agora;
      sessao.aprovadoPor = input.usuario;
      sessao.aprovadoEm = agora;
      sessao.observacaoAprovacao = input.observacao || `Divergência${input.nunota ? ` da nota #${input.nunota}` : ''} resolvida e aprovada pelo gestor.`;
    }

    sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);
    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario,
        acao: 'RESOLVER_DIVERGENCIA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunota: input.nunota,
          nunotas: sessao.nunotas,
          observacao: sessao.observacaoAprovacao,
        },
      });
    }

    return sessao;
  }
}
