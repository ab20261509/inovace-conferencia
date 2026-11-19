import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { EnderecoOcupacaoDetalhe } from '../../../domain/entities/Enderecamento.js';

export interface BuscarProdutosPorEnderecoInput {
  termo: string; // CODEND, ENDERECO mascarado ou DESCREND
}

export class BuscarProdutosPorEnderecoUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(input: BuscarProdutosPorEnderecoInput): Promise<EnderecoOcupacaoDetalhe | null> {
    const termoOriginal = input.termo ? input.termo.trim().toUpperCase() : '';
    if (!termoOriginal) {
      return null;
    }

    const termoSemZero = termoOriginal.replace(/^0+/, '');
    const termoLimpo = termoOriginal.replace(/[._]/g, '');

    // 1. Localizar o endereço na tabela TGWEND
    const sqlEnd = `
SELECT 
    CODEND, 
    ENDERECO, 
    DESCREND, 
    NVL(PICKING, 'N') AS PICKING,
    NVL(ATIVO, 'S') AS ATIVO
FROM TGWEND
WHERE (
    TO_CHAR(CODEND) = '${termoOriginal}'
    OR TO_CHAR(CODEND) = '${termoSemZero}'
    OR UPPER(TRIM(ENDERECO)) = '${termoOriginal}'
    OR REPLACE(REPLACE(UPPER(TRIM(ENDERECO)), '.', ''), '_', '') = '${termoLimpo}'
    OR UPPER(TRIM(DESCREND)) = '${termoOriginal}'
  )
  AND ROWNUM = 1
    `.trim();

    const respEnd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlEnd } },
      randomUUID(),
    );

    const rowsEnd: any[] = respEnd?.responseBody?.rows || [];
    if (rowsEnd.length === 0) {
      return null;
    }

    const rowEnd = rowsEnd[0];
    const codend = Number(rowEnd[0]);
    const endereco = String(rowEnd[1] || '').trim();
    const descrend = rowEnd[2] ? String(rowEnd[2]).trim() : null;
    const ehPicking = String(rowEnd[3] || 'N').trim().toUpperCase() === 'S';
    const ativo = String(rowEnd[4] || 'S').trim().toUpperCase() === 'S';

    // 2. Buscar produtos vinculados ativos em TGWEXP
    const sqlProds = `
SELECT 
    EXP.CODPROD,
    PRO.DESCRPROD,
    PRO.REFERENCIA,
    (SELECT MAX(BAR.CODBARRA) FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD) AS CODBARRA,
    NVL(EXP.CONTROLE, ' ') AS CONTROLE,
    NVL(EXP.CODVOL, NVL(PRO.CODVOL, 'UN')) AS CODVOL,
    TO_CHAR(EXP.DTINICIO, 'DD/MM/YYYY') AS DTINICIO
FROM TGWEXP EXP
JOIN TGFPRO PRO ON PRO.CODPROD = EXP.CODPROD
WHERE EXP.CODEND = ${codend}
  AND EXP.ATIVO = 'S'
ORDER BY PRO.DESCRPROD
    `.trim();

    const respProds = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlProds } },
      randomUUID(),
    );

    const rowsProds: any[] = respProds?.responseBody?.rows || [];
    const produtos = rowsProds.map((r: any) => ({
      codprod: Number(r[0]),
      descrprod: String(r[1] || '').trim(),
      referencia: r[2] ? String(r[2]).trim() : null,
      codbarra: r[3] ? String(r[3]).trim() : null,
      controle: String(r[4] || ' ').trim(),
      codvol: String(r[5] || 'UN').trim(),
      dtInicio: r[6] ? String(r[6]).trim() : null,
    }));

    return {
      codend,
      endereco,
      descrend,
      tipo: ehPicking ? 'PICKING' : 'PULMAO',
      ativo,
      produtos,
    };
  }
}
