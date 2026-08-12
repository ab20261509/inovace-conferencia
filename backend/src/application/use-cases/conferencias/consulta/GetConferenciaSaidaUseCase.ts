import { IGatewayPort } from '../../../../domain/ports/IGatewayPort.js';

export interface ConferenciaSaidaRecord {
  nunota: number;
  codEmp: number;
  dtFaturamento: string | null;
  dtInicioConferencia: string | null;
  nuConf: number | null;
  usuarioConferente: string | null;
  nroUnico: number;
  statusConferencia: string;
  rotaEntrega: string | null;
  transportadora: string | null;
  ordemCarga: number | null;
  numNota: number;
  parceiro: string | null;
  obsPedido: string | null;
  qtdVolumes: number | null;
  qtdProdutosDistintos: number;
}

export interface GetConferenciaSaidaOutput {
  records: ConferenciaSaidaRecord[];
  total: number;
  timeQuery: string;
}

/**
 * Use Case: Listar pedidos pendentes de conferência de saída
 * Usa DbExplorerSP.executeQuery para query SQL complexa com JOINs
 */
export class GetConferenciaSaidaUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(correlationId?: string): Promise<GetConferenciaSaidaOutput> {
    const sql = `
SELECT
    CAB.NUNOTA,
    CAB.CODEMP,
    CAB.DTFATUR AS DT_FATURAMENTO,
    CON.DHINICONF AS DT_INICIO_CONFERENCIA,
    CON.NUCONF,
    CAB.AD_USUARIOCONF AS USUARIO_CONFERENTE,
    CAB.NUNOTA AS NRO_UNICO,
    DECODE(CON.STATUS||CON2.STATUS,'A','Em andamento',
                  'D','Finalizada Divergente',
                  'F', 'Finalizada OK',
                  'R', 'Aguardando recontagem',
                  'RR', 'Aguardando recontagem',
                  'AR', 'Recontagem em Andamento',
                  'FR', 'Recontagem Finalizada OK',
                  'Aguardando Conferência')
    AS STATUS_CONFERENCIA,
    ROT.DESCRROTA AS ROTA_ENTREGA,
    TRANS.RAZAOSOCIAL AS TRANSPORTADORA,
    CAB.ORDEMCARGA,
    CAB.NUMNOTA,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.OBSERVACAO AS OBS_PEDIDO,
    CAB.QTDVOL AS QTD_VOLUMES,
    ITE.QTD_PRODUTOS_DISTINTOS
FROM TGFCAB CAB
INNER JOIN TGFTOP TOP
        ON TOP.CODTIPOPER = CAB.CODTIPOPER
       AND TOP.DHALTER = CAB.DHTIPOPER
LEFT JOIN TGFCON2 CON
       ON CON.NUCONF = CAB.NUCONFATUAL
LEFT JOIN TGFCON2 CON2
       ON CON2.NUCONF = CON.NUCONFORIG
LEFT JOIN TGFPAR PAR
       ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN TGFPAR TRANS
       ON TRANS.CODPARC = CAB.CODPARCTRANSP
LEFT JOIN (
    SELECT RTP.CODPARC, MIN(ROT.DESCRROTA) AS DESCRROTA
    FROM TGFRTP RTP
    INNER JOIN TGFROT ROT ON ROT.CODROTA = RTP.CODROTA
    GROUP BY RTP.CODPARC
) ROT ON ROT.CODPARC = CAB.CODPARC
INNER JOIN (
    SELECT I.NUNOTA, COUNT(DISTINCT I.CODPROD) AS QTD_PRODUTOS_DISTINTOS
    FROM TGFITE I
    GROUP BY I.NUNOTA
) ITE ON ITE.NUNOTA = CAB.NUNOTA
WHERE CAB.TIPMOV = 'P'
    AND CAB.PENDENTE = 'S'
    AND CAB.STATUSNOTA = 'L'
    AND NOT EXISTS (
        SELECT 1 FROM TGFVAR WHERE NUNOTAORIG = CAB.NUNOTA
    )
    
    AND NVL(TOP.NUCCO,0) > 0
    AND CAB.CODVEND NOT IN (43)
    AND NVL(CON.STATUS,'S') IN ('A','R','S')
    `.trim();

    const response = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
      },
      correlationId,
    );

    const body = response.responseBody;
    const timeQuery = body?.timeQuery || '';
    if (timeQuery) {
      console.log(`[GetConferenciaSaida] Query Sankhya: ${timeQuery}`);
    }    const rows: any[] = body?.rows || [];
    const metadata: { name: string }[] = body?.fieldsMetadata || [];

    const records: ConferenciaSaidaRecord[] = rows.map((row) => {
      const obj: Record<string, any> = {};
      metadata.forEach((field, index) => {
        obj[field.name] = row[index];
      });

      return {
        nunota: obj.NUNOTA,
        codEmp: obj.CODEMP,
        dtFaturamento: obj.DT_FATURAMENTO || null,
        dtInicioConferencia: obj.DT_INICIO_CONFERENCIA || null,
        nuConf: obj.NUCONF || null,
        usuarioConferente: obj.USUARIO_CONFERENTE || null,
        nroUnico: obj.NRO_UNICO,
        statusConferencia: obj.STATUS_CONFERENCIA,
        rotaEntrega: obj.ROTA_ENTREGA || null,
        transportadora: obj.TRANSPORTADORA || null,
        ordemCarga: obj.ORDEMCARGA || null,
        numNota: obj.NUMNOTA,
        parceiro: obj.PARCEIRO || null,
        obsPedido: obj.OBS_PEDIDO || null,
        qtdVolumes: obj.QTD_VOLUMES || null,
        qtdProdutosDistintos: obj.QTD_PRODUTOS_DISTINTOS || 0,
      };
    });

    return {
      records,
      total: records.length,
      timeQuery: body?.timeQuery || '',
    };
  }
}
