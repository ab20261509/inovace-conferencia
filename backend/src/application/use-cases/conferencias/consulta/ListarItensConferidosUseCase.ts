import { IGatewayPort } from '../../../../domain/ports/IGatewayPort.js';

export interface ItemConferidoDetalhe {
  nuConf: string;
  seqConf: string;
  codProd: string;
  descrProd: string;
  referencia: string | null;
  controle: string | null;
  qtdConf: number;
  codBarra: string | null;
  codVol: string;
  dhAlter: string;
}

export interface ListarItensConferidosInput {
  nuNota?: number;
  nuConf: number | string;
}

export interface ListarItensConferidosOutput {
  itens: ItemConferidoDetalhe[];
  paginacao: boolean;
}

/**
 * Use Case: Listar registros já conferidos na conferência atual (TGFCOI2)
 */
export class ListarItensConferidosUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(input: ListarItensConferidosInput, correlationId?: string): Promise<ListarItensConferidosOutput> {
    const sql = `
      SELECT 
          COI.NUCONF,
          COI.SEQCONF,
          COI.CODPROD,
          PRO.DESCRPROD,
          PRO.REFERENCIA,
          COI.CONTROLE,
          COI.QTDCONF,
          COI.CODBARRA,
          COI.CODVOL,
          COI.DHALTER
      FROM TGFCOI2 COI
      LEFT JOIN TGFPRO PRO ON PRO.CODPROD = COI.CODPROD
      WHERE COI.NUCONF = ${input.nuConf}
      ORDER BY COI.SEQCONF DESC
    `.trim();

    try {
      const response = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        {
          serviceName: 'DbExplorerSP.executeQuery',
          requestBody: { sql },
        },
        correlationId,
      );

      const rows: any[] = response.responseBody?.rows || [];

      const itens: ItemConferidoDetalhe[] = rows.map((row) => ({
        nuConf: String(row[0]),
        seqConf: String(row[1]),
        codProd: String(row[2]),
        descrProd: row[3] || `Cod ${row[2]}`,
        referencia: row[4] || null,
        controle: row[5] ? String(row[5]).trim() : null,
        qtdConf: Number(row[6] || 0),
        codBarra: row[7] ? String(row[7]).trim() : null,
        codVol: row[8] || '',
        dhAlter: row[9] || '',
      }));

      return {
        itens,
        paginacao: false,
      };
    } catch {
      return {
        itens: [],
        paginacao: false,
      };
    }
  }
}

