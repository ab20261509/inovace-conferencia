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

    // Se houver ocorrências sem numnota (número da NF fiscal), busca em lote no Sankhya (TGFCAB)
    const nunotasParaBuscar = Array.from(
      new Set(
        ocorrencias
          .filter((oc) => oc.nunota && (!oc.numnota || oc.numnota === 0))
          .map((oc) => Number(oc.nunota))
      )
    );

    if (nunotasParaBuscar.length > 0 && this.sankhyaGateway) {
      try {
        const sql = `SELECT NUNOTA, NUMNOTA FROM TGFCAB WHERE NUNOTA IN (${nunotasParaBuscar.join(',')})`;
        const res = await this.sankhyaGateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          { requestBody: { sql } }
        );
        const rows: any[] = res?.responseBody?.rows || [];
        const fields: any[] = res?.responseBody?.fieldsMetadata || [];
        const nuIdx = fields.findIndex((f) => f.name.toUpperCase() === 'NUNOTA');
        const numIdx = fields.findIndex((f) => f.name.toUpperCase() === 'NUMNOTA');

        if (nuIdx !== -1 && numIdx !== -1) {
          const mapaNumNotas: Record<number, number> = {};
          for (const r of rows) {
            mapaNumNotas[Number(r[nuIdx])] = Number(r[numIdx]);
          }

          for (const oc of ocorrencias) {
            if (oc.nunota && mapaNumNotas[oc.nunota]) {
              oc.numnota = mapaNumNotas[oc.nunota];
              // Persiste de forma assíncrona no SQLite para cache permanente
              this.ocorrenciaRepo.atualizar(oc.id, { numnota: oc.numnota }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Falha ao buscar NUMNOTA das ocorrências no Sankhya:', err);
      }
    }

    return ocorrencias;
  }
}
