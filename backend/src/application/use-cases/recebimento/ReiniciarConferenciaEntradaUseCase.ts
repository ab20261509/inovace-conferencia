import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface ReiniciarConferenciaInput {
  conferenciaId: string;
  usuario: string;
  motivo?: string;
}

export class ReiniciarConferenciaEntradaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService
  ) {}

  async execute(input: ReiniciarConferenciaInput): Promise<SessaoConferenciaEntrada> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const agora = new Date().toISOString();

    // 1. Anular todas as bipagens ativas da sessão
    const bipagens = await this.conferenciaRepo.listarBipagens(sessao.id);
    for (const b of bipagens) {
      if (!b.anulado) {
        await this.conferenciaRepo.anularBipagem(b.id);
      }
    }

    // 2. Retornar status da sessão para Em Aberto e nível para 1
    sessao.status = 'Em Aberto';
    sessao.nivelAtual = 1;
    sessao.atualizadoEm = agora;
    sessao.finalizadoEm = undefined;
    sessao.aprovadoPor = undefined;
    sessao.aprovadoEm = undefined;
    sessao.enviadoSankhyaEm = undefined;
    sessao.observacaoAprovacao = input.motivo ? `Reiniciada: ${input.motivo}` : 'Conferência reiniciada pelo gestor.';

    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario,
        acao: 'REINICIAR_CONFERENCIA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunotas: sessao.nunotas,
          totalBipagensAnuladas: bipagens.length,
          motivo: input.motivo,
        },
      });
    }

    return sessao;
  }
}
