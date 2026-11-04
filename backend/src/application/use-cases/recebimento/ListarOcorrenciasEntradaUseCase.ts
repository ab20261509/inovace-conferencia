import {
  IOcorrenciaConferenciaEntradaRepository,
  FiltroOcorrenciasInput,
} from '../../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';
import { OcorrenciaConferenciaEntrada } from '../../../domain/entities/OcorrenciaConferenciaEntrada.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';

export class ListarOcorrenciasEntradaUseCase {
  constructor(
    private readonly ocorrenciaRepo: IOcorrenciaConferenciaEntradaRepository,
    private readonly sankhyaGateway?: IGatewayPort
  ) {}

  async execute(
    filtros?: FiltroOcorrenciasInput
  ): Promise<OcorrenciaConferenciaEntrada[]> {
    const ocorrencias = await this.ocorrenciaRepo.listar(filtros);

    // Valida todos os NUNOTAs das ocorrências ativas ou sem numnota no Sankhya (TGFCAB)
    const todasNuNotas = Array.from(
      new Set(
        ocorrencias
          .filter((oc) => oc.nunota && Number(oc.nunota) > 0)
          .map((oc) => Number(oc.nunota))
      )
    );

    if (todasNuNotas.length > 0 && this.sankhyaGateway) {
      try {
        const sql = `SELECT NUNOTA, NUMNOTA FROM TGFCAB WHERE NUNOTA IN (${todasNuNotas.join(',')})`;
        const res = await this.sankhyaGateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          { requestBody: { sql } }
        );
        const rows: any[] = res?.responseBody?.rows || [];
        const fields: any[] = res?.responseBody?.fieldsMetadata || [];
        const nuIdx = fields.findIndex((f) => f.name.toUpperCase() === 'NUNOTA');
        const numIdx = fields.findIndex((f) => f.name.toUpperCase() === 'NUMNOTA');

        if (nuIdx !== -1) {
          const nunotasExistentesNoSankhya = new Set<number>();
          const mapaNumNotas: Record<number, number> = {};

          for (const r of rows) {
            const nu = Number(r[nuIdx]);
            nunotasExistentesNoSankhya.add(nu);
            if (numIdx !== -1 && r[numIdx] !== null && r[numIdx] !== undefined) {
              mapaNumNotas[nu] = Number(r[numIdx]);
            }
          }

          for (const oc of ocorrencias) {
            const nu = Number(oc.nunota);
            if (!nu) continue;

            // 1. Atualizar numnota se necessário
            if (mapaNumNotas[nu] && (!oc.numnota || oc.numnota === 0)) {
              oc.numnota = mapaNumNotas[nu];
              this.ocorrenciaRepo.atualizar(oc.id, { numnota: oc.numnota }).catch(() => {});
            }

            // 2. Se a nota fiscal foi excluída no Sankhya (NUNOTA inexistente no TGFCAB):
            if (!nunotasExistentesNoSankhya.has(nu)) {
              // Se ainda estava pendente ou resolvida, marca automaticamente como CANCELADO
              if (oc.status === 'PENDENTE' || oc.status === 'RESOLVIDO') {
                const motivoAtual = oc.motivo || '';
                const tagExcluida = '[Nota fiscal excluída no ERP (Sankhya)]';
                const novoMotivo = motivoAtual.includes(tagExcluida)
                  ? motivoAtual
                  : `${motivoAtual} ${tagExcluida}`.trim();

                oc.status = 'CANCELADO';
                oc.motivo = novoMotivo;

                this.ocorrenciaRepo
                  .atualizar(oc.id, {
                    status: 'CANCELADO',
                    motivo: novoMotivo,
                  })
                  .catch((e) => console.warn('Erro ao cancelar ocorrência de nota excluída:', e));
              }
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Falha ao verificar notas das ocorrências no Sankhya:', err);
      }
    }

    return ocorrencias;
  }
}
