import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, BackupContagemEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface RecuperarContagemInput {
  conferenciaId: string;
  usuario: string;
  motivo?: string;
}

export class RecuperarContagemReiniciadaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService
  ) {}

  async execute(input: RecuperarContagemInput): Promise<SessaoConferenciaEntrada> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    if (!sessao.backupContagemJson) {
      throw new Error('Não há contagem arquivada/reiniciada disponível para recuperação nesta sessão.');
    }

    let backup: BackupContagemEntrada;
    try {
      backup = JSON.parse(sessao.backupContagemJson);
    } catch {
      throw new Error('Dados de backup da contagem estão corrompidos ou em formato inválido.');
    }

    const agora = new Date().toISOString();

    // 1. Restaurar todas as bipagens anuladas desta sessão
    const totalRestauradas = await this.conferenciaRepo.restaurarBipagens(sessao.id);

    // 2. Restaurar status e nível anteriores
    sessao.status = backup.statusAnterior;
    sessao.nivelAtual = backup.nivelAnterior;
    sessao.atualizadoEm = agora;
    sessao.observacaoAprovacao = input.motivo
      ? `Contagem restaurada (${totalRestauradas} bipagens): ${input.motivo}`
      : `Contagem restaurada pelo gestor (${totalRestauradas} bipagens reativadas).`;

    // 3. Limpar o snapshot de backup (já foi restaurado com sucesso)
    sessao.backupContagemJson = undefined;
    sessao.backupContagem = undefined;

    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario || 'Gestor',
        acao: 'RECUPERAR_CONTAGEM_REINICIADA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunotas: sessao.nunotas,
          statusRestaurado: backup.statusAnterior,
          nivelRestaurado: backup.nivelAnterior,
          totalBipagensRestauradas: totalRestauradas,
          motivo: input.motivo,
        },
      });
    }

    return sessao;
  }
}
