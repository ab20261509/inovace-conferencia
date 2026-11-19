import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';

export interface CargaPendente {
  ordemCarga: number;
  codemp?: number;
  nomeEmpresa?: string;
  qtdPedidos: number;
  qtdItens: number;
  qtdUnidades: number;
  dtPrimeiroPedido: string;
  dtUltimoPedido: string;
  qtdClientes: number;
  statusLocal: 'SEM_INICIAR' | 'EM_ANDAMENTO' | 'AGUARDANDO_REABASTECIMENTO' | 'REABASTECIDO' | 'FINALIZADA';
  separacaoId?: string;
  usuarioSeparacao?: string;
  criadoEm?: string;
}

export class ListarCargasPendentesUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly separacaoRepo: ISeparacaoRepository,
  ) {}

  async execute(filtroOrdemCarga?: number, correlationId?: string): Promise<CargaPendente[]> {
    let sql = `
SELECT
    CAB.ORDEMCARGA,
    MAX(CAB.CODEMP) AS CODEMP,
    MAX(NVL(EMP.NOMEFANTASIA, EMP.RAZAOSOCIAL)) AS NOME_EMPRESA,
    COUNT(DISTINCT CAB.NUNOTA) AS QTD_PEDIDOS,
    COUNT(DISTINCT ITE.CODPROD) AS QTD_ITENS,
    SUM(NVL(ITE.QTDNEG, 0)) AS QTD_UNIDADES,
    TO_CHAR(MIN(CAB.DTNEG), 'YYYY-MM-DD') AS DT_PRIMEIRO_PEDIDO,
    TO_CHAR(MAX(CAB.DTNEG), 'YYYY-MM-DD') AS DT_ULTIMO_PEDIDO,
    COUNT(DISTINCT CAB.CODPARC) AS QTD_CLIENTES,
    NVL(MAX(ORD.AD_STATUSSEP), 'P') AS STATUS_SEPARACAO_ERP
FROM TGFCAB CAB
JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
LEFT JOIN TSIEMP EMP ON EMP.CODEMP = CAB.CODEMP
INNER JOIN TGFTOP TOP
        ON TOP.CODTIPOPER = CAB.CODTIPOPER
       AND TOP.DHALTER = CAB.DHTIPOPER
LEFT JOIN TGFCON2 CON
       ON CON.NUCONF = CAB.NUCONFATUAL
LEFT JOIN TGFORD ORD
       ON ORD.ORDEMCARGA = CAB.ORDEMCARGA
      AND ORD.CODEMP = CAB.CODEMP
WHERE CAB.TIPMOV = 'P'
  AND CAB.STATUSNOTA = 'L'
  AND CAB.PENDENTE = 'S'
  AND NVL(CAB.ORDEMCARGA, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM TGFVAR WHERE NUNOTAORIG = CAB.NUNOTA
  )
  AND NVL(TOP.NUCCO, 0) > 0
  AND CAB.CODVEND NOT IN (43)
  AND NVL(CON.STATUS, 'S') IN ('A', 'R', 'S')
    `.trim();

    if (filtroOrdemCarga) {
      sql += ` AND CAB.ORDEMCARGA = ${Number(filtroOrdemCarga)}`;
    } else {
      sql += ` AND NVL(ORD.AD_STATUSSEP, 'P') <> 'F'`;
    }

    sql += `
GROUP BY CAB.ORDEMCARGA
ORDER BY CAB.ORDEMCARGA DESC
    `.trim();

    const response = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
      },
      correlationId,
    );

    const rows: any[] = response?.responseBody?.rows || [];
    const fields: any[] = response?.responseBody?.fieldsMetadata || [];

    const fieldIndexMap: Record<string, number> = {};
    fields.forEach((f: any, idx: number) => {
      fieldIndexMap[f.name.toUpperCase()] = idx;
    });

    const getVal = (row: any[], fieldName: string) => {
      const idx = fieldIndexMap[fieldName.toUpperCase()];
      return idx !== undefined ? row[idx] : null;
    };

    const ativas = await this.separacaoRepo.listarAtivas();
    const mapAtivas = new Map<number, typeof ativas[0]>();
    ativas.forEach((a) => mapAtivas.set(a.ordemCarga, a));

    const cargas: CargaPendente[] = [];

    for (const r of rows) {
      const ordemCarga = Number(getVal(r, 'ORDEMCARGA'));
      if (!ordemCarga) continue;

      let sepLocal = mapAtivas.get(ordemCarga) || null;
      if (!sepLocal) {
        sepLocal = await this.separacaoRepo.buscarPorOrdemCarga(ordemCarga);
      }

      let statusLocal: 'SEM_INICIAR' | 'EM_ANDAMENTO' | 'AGUARDANDO_REABASTECIMENTO' | 'REABASTECIDO' | 'FINALIZADA' = 'SEM_INICIAR';
      const qtdPedidosErp = Number(getVal(r, 'QTD_PEDIDOS') || 0);
      const qtdUnidadesErp = Number(getVal(r, 'QTD_UNIDADES') || 0);

      if (sepLocal) {
        if (sepLocal.status === 'FINALIZADA') {
          // Se a sessão anterior foi finalizada mas o ERP possui mais pedidos ou unidades na carga,
          // a carga retorna para a fila de separação (próxima rodada complementar)
          if (qtdPedidosErp > sepLocal.totalPedidos || qtdUnidadesErp > sepLocal.totalUnidades) {
            statusLocal = 'SEM_INICIAR';
          } else {
            statusLocal = 'FINALIZADA';
          }
        } else if (sepLocal.status === 'AGUARDANDO_REABASTECIMENTO') {
          statusLocal = 'AGUARDANDO_REABASTECIMENTO';
        } else if (sepLocal.status === 'REABASTECIDO') {
          statusLocal = 'REABASTECIDO';
        } else {
          statusLocal = 'EM_ANDAMENTO';
        }
      }

      // Se não for uma busca específica por número de carga, oculta da lista cargas já finalizadas no sistema
      if (!filtroOrdemCarga && statusLocal === 'FINALIZADA') {
        continue;
      }

      cargas.push({
        ordemCarga,
        codemp: Number(getVal(r, 'CODEMP') || 0) || undefined,
        nomeEmpresa: String(getVal(r, 'NOME_EMPRESA') || '').trim() || undefined,
        qtdPedidos: Number(getVal(r, 'QTD_PEDIDOS') || 0),
        qtdItens: Number(getVal(r, 'QTD_ITENS') || 0),
        qtdUnidades: Number(getVal(r, 'QTD_UNIDADES') || 0),
        dtPrimeiroPedido: String(getVal(r, 'DT_PRIMEIRO_PEDIDO') || ''),
        dtUltimoPedido: String(getVal(r, 'DT_ULTIMO_PEDIDO') || ''),
        qtdClientes: Number(getVal(r, 'QTD_CLIENTES') || 0),
        statusLocal,
        separacaoId: sepLocal?.id,
        usuarioSeparacao: sepLocal?.usuario,
        criadoEm: sepLocal?.criadoEm,
      });
    }

    // Ordenação com prioridade: REABASTECIDO (topo absoluto) > EM_ANDAMENTO > AGUARDANDO_REABASTECIMENTO > SEM_INICIAR > FINALIZADA
    cargas.sort((a, b) => {
      const prioridadeStatus: Record<string, number> = {
        REABASTECIDO: 1,
        EM_ANDAMENTO: 2,
        AGUARDANDO_REABASTECIMENTO: 3,
        SEM_INICIAR: 4,
        FINALIZADA: 5,
      };
      const prioA = prioridadeStatus[a.statusLocal] || 99;
      const prioB = prioridadeStatus[b.statusLocal] || 99;
      if (prioA !== prioB) {
        return prioA - prioB;
      }
      return b.ordemCarga - a.ordemCarga;
    });

    return cargas;
  }
}
