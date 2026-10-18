import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';

export interface ProdutoCatalogoItem {
  codprod: number;
  descrprod: string;
  referencia?: string;
  codvol: string;
  marca?: string;
  codbarra?: string;
  imagemUrl?: string;
}

export class BuscarProdutoTGFPROUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(termo: string, correlationId?: string): Promise<ProdutoCatalogoItem[]> {
    if (!termo || termo.trim().length < 2) {
      return [];
    }

    const termoLimpo = termo.trim().replace(/'/g, "''");
    const isNumero = /^\d+$/.test(termoLimpo);

    const sql = `
SELECT DISTINCT
  PRO.CODPROD,
  PRO.DESCRPROD,
  PRO.REFERENCIA,
  PRO.CODVOL,
  PRO.MARCA,
  BAR.CODBARRA
FROM TGFPRO PRO
LEFT JOIN TGFBAR BAR ON BAR.CODPROD = PRO.CODPROD
WHERE (PRO.ATIVO IS NULL OR PRO.ATIVO = 'S')
  AND (
    ${isNumero ? `PRO.CODPROD = ${termoLimpo} OR BAR.CODBARRA = '${termoLimpo}' OR ` : ''}
    UPPER(PRO.REFERENCIA) LIKE UPPER('%${termoLimpo}%')
    OR UPPER(PRO.DESCRPROD) LIKE UPPER('%${termoLimpo}%')
    OR UPPER(BAR.CODBARRA) = UPPER('${termoLimpo}')
  )
ORDER BY PRO.DESCRPROD
FETCH FIRST 20 ROWS ONLY
    `.trim();

    try {
      const response = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
        correlationId
      );

      const rows: any[] = response?.responseBody?.rows || [];
      const fields: any[] = response?.responseBody?.fieldsMetadata || [];

      if (rows.length === 0) return [];

      const fieldIndex: Record<string, number> = {};
      fields.forEach((f: any, idx: number) => {
        fieldIndex[f.name.toUpperCase()] = idx;
      });

      const produtosMap = new Map<number, ProdutoCatalogoItem>();

      for (const row of rows) {
        const codprod = Number(row[fieldIndex['CODPROD']]);
        if (!produtosMap.has(codprod)) {
          produtosMap.set(codprod, {
            codprod,
            descrprod: String(row[fieldIndex['DESCRPROD']] || ''),
            referencia: row[fieldIndex['REFERENCIA']] ? String(row[fieldIndex['REFERENCIA']]) : undefined,
            codvol: String(row[fieldIndex['CODVOL']] || 'UN'),
            marca: row[fieldIndex['MARCA']] ? String(row[fieldIndex['MARCA']]) : undefined,
            codbarra: row[fieldIndex['CODBARRA']] ? String(row[fieldIndex['CODBARRA']]) : undefined,
            imagemUrl: `/api/crud/produto/${codprod}/imagem`,
          });
        }
      }

      return Array.from(produtosMap.values());
    } catch (err: any) {
      console.error('[BuscarProdutoTGFPROUseCase] Erro ao buscar produto na TGFPRO:', err);
      return [];
    }
  }
}
