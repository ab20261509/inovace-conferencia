import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';

export interface LocalEstoqueItem {
  codlocal: number;
  descrlocal: string;
  ativo?: string;
}

export class ListarLocaisSankhyaUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(correlationId?: string): Promise<LocalEstoqueItem[]> {
    const sql = `
SELECT CODLOCAL, DESCRLOCAL, ATIVO, ANALITICO
FROM TGFLOC 
WHERE (ATIVO IS NULL OR ATIVO = 'S')
  AND ANALITICO = 'S'
ORDER BY CODLOCAL
    `.trim();

    try {
      const response = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
        correlationId
      );

      const rows: any[] = response?.responseBody?.rows || [];
      const fields: any[] = response?.responseBody?.fieldsMetadata || [];

      if (rows.length === 0) {
        return this.obterLocaisPadraoFallback();
      }

      const fieldIndex: Record<string, number> = {};
      fields.forEach((f: any, idx: number) => {
        fieldIndex[f.name.toUpperCase()] = idx;
      });

      const lista = rows.map((row) => ({
        codlocal: Number(row[fieldIndex['CODLOCAL']]),
        descrlocal: String(row[fieldIndex['DESCRLOCAL']] || '').trim(),
        ativo: row[fieldIndex['ATIVO']] ? String(row[fieldIndex['ATIVO']]) : undefined,
      }));

      return lista.length > 0 ? lista : this.obterLocaisPadraoFallback();
    } catch (err: any) {
      console.error('[ListarLocaisSankhyaUseCase] Erro ao listar locais da TGFLOC:', err);
      return this.obterLocaisPadraoFallback();
    }
  }

  private obterLocaisPadraoFallback(): LocalEstoqueItem[] {
    return [
      { codlocal: 0, descrlocal: 'PADRÃO / GERAL' },
      { codlocal: 95, descrlocal: 'VALIDADE PRÓXIMA (SHELF-LIFE)' },
      { codlocal: 98, descrlocal: 'PRODUTO VENCIDO' },
      { codlocal: 99, descrlocal: 'AVARIA / BLOQUEADO' },
    ];
  }
}
