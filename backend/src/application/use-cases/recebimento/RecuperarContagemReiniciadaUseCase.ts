import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { SessaoConferenciaEntrada, BackupContagemEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface RecuperarContagemInput {
  conferenciaId: string;
  backupConferenciaId?: string;
  usuario: string;
  motivo?: string;
}

export class RecuperarContagemReiniciadaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly gateway?: IGatewayPort,
    private readonly audit?: AuditService
  ) {}

  async execute(input: RecuperarContagemInput): Promise<SessaoConferenciaEntrada> {
    const sessaoDestino = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessaoDestino) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    // Bloqueio de segurança: não pode restaurar se a conferência atual já tiver bipagens ativas em andamento
    const bipagensAtuais = await this.conferenciaRepo.listarBipagens(sessaoDestino.id);
    const bipagensAtivas = bipagensAtuais.filter((b) => !b.anulado);
    if (bipagensAtivas.length > 0) {
      throw new Error(
        'Esta conferência já possui contagem em andamento. Reinicie a conferência antes de restaurar um backup anterior.'
      );
    }

    const origemId =
      input.backupConferenciaId && input.backupConferenciaId !== sessaoDestino.id
        ? input.backupConferenciaId
        : sessaoDestino.id;

    const sessaoOrigem =
      origemId === sessaoDestino.id ? sessaoDestino : await this.conferenciaRepo.obterSessaoPorId(origemId);

    if (!sessaoOrigem) {
      throw new Error('Sessão de origem do backup não encontrada.');
    }

    if (!sessaoOrigem.backupContagemJson) {
      throw new Error('Não há contagem arquivada/reiniciada disponível para recuperação nesta sessão.');
    }

    let backup: BackupContagemEntrada;
    try {
      backup = JSON.parse(sessaoOrigem.backupContagemJson);
    } catch {
      throw new Error('Dados de backup da contagem estão corrompidos ou em formato inválido.');
    }

    let totalRestauradas = 0;

    if (origemId === sessaoDestino.id) {
      // 1. Restaurar todas as bipagens anuladas da própria sessão
      totalRestauradas = await this.conferenciaRepo.restaurarBipagens(sessaoDestino.id);
    } else {
      // 2. Restaurar bipagens vindas de outra conferência (ex: nota cancelada/relançada com novo NUNOTA)
      const novoNunota = sessaoDestino.nunotas[0];
      const mapaSequencias: Record<number, number> = {};

      if (this.gateway && novoNunota) {
        try {
          const sql = `SELECT SEQUENCIA, CODPROD FROM TGFITE WHERE NUNOTA = ${novoNunota}`;
          const response = await this.gateway.serviceCall<any>('DbExplorerSP.executeQuery', {
            serviceName: 'DbExplorerSP.executeQuery',
            requestBody: { sql },
          });

          const rows: any[] = response?.responseBody?.rows || [];
          const fields: any[] = response?.responseBody?.fieldsMetadata || [];
          const fieldIndexMap: Record<string, number> = {};
          fields.forEach((f: any, idx: number) => {
            fieldIndexMap[f.name.toUpperCase()] = idx;
          });

          for (const r of rows) {
            const seq = Number(r[fieldIndexMap['SEQUENCIA']]);
            const codprod = Number(r[fieldIndexMap['CODPROD']]);
            if (codprod && !mapaSequencias[codprod]) {
              mapaSequencias[codprod] = seq;
            }
          }
        } catch (err) {
          console.warn('⚠️ Não foi possível obter sequências de TGFITE para migração de bipagens:', err);
        }
      }

      totalRestauradas = await this.conferenciaRepo.migrarERestaurarBipagensParaNovaNota(
        sessaoOrigem.id,
        sessaoDestino.id,
        novoNunota,
        mapaSequencias
      );

      // Excluir a sessão órfã antiga que foi totalmente migrada
      try {
        await this.conferenciaRepo.excluirSessao(sessaoOrigem.id);
      } catch (err) {
        console.warn('⚠️ Não foi possível excluir sessão órfã após migração:', err);
      }
    }

    // 3. Atualizar status e nível na sessão destino
    const agora = new Date().toISOString();
    sessaoDestino.status = backup.statusAnterior;
    sessaoDestino.nivelAtual = backup.nivelAnterior;
    sessaoDestino.atualizadoEm = agora;
    sessaoDestino.observacaoAprovacao = input.motivo
      ? `Contagem restaurada (${totalRestauradas} bipagens): ${input.motivo}`
      : `Contagem restaurada pelo gestor (${totalRestauradas} bipagens reativadas).`;

    // Limpar o backup na sessão destino
    sessaoDestino.backupContagemJson = undefined;
    sessaoDestino.backupContagem = undefined;

    await this.conferenciaRepo.salvarSessao(sessaoDestino);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario || 'Gestor',
        acao: 'RECUPERAR_CONTAGEM_REINICIADA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessaoDestino.id,
          origemId: sessaoOrigem.id,
          nunotas: sessaoDestino.nunotas,
          statusRestaurado: backup.statusAnterior,
          nivelRestaurado: backup.nivelAnterior,
          totalBipagensRestauradas: totalRestauradas,
          motivo: input.motivo,
        },
      });
    }

    return sessaoDestino;
  }
}

