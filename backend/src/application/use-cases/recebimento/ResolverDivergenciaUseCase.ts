import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface ResolverDivergenciaInput {
  conferenciaId: string;
  usuario: string;
  acao?: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3';
  observacao?: string;
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

    if (input.acao === 'RECONFERIR_N3') {
      sessao.status = 'Aguardando N3';
      sessao.nivelAtual = 3;
      sessao.atualizadoEm = agora;
      sessao.observacaoAprovacao = input.observacao
        ? `Reconferência N3: ${input.observacao}`
        : 'Reconferência Nível 3 solicitada pelo gestor.';
      sessao.aprovadoPor = undefined;
      sessao.aprovadoEm = undefined;
    } else {
      // APROVAR_DIVERGENCIA (padrão)
      sessao.status = 'Aguardando Aprovação';
      sessao.atualizadoEm = agora;
      sessao.finalizadoEm = agora;
      sessao.aprovadoPor = input.usuario;
      sessao.aprovadoEm = agora;
      sessao.observacaoAprovacao = input.observacao || 'Divergência resolvida e aprovada pelo gestor.';
    }

    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario,
        acao: 'RESOLVER_DIVERGENCIA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunotas: sessao.nunotas,
          observacao: sessao.observacaoAprovacao,
        },
      });
    }

    return sessao;
  }
}
