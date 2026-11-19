import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ProdutoEnderecamentoDetalhe, EnderecoVinculado } from '../../../domain/entities/Enderecamento.js';

export interface BuscarEnderecosProdutoInput {
  termo?: string; // codprod, codbarra ou parte do nome
  codprods?: number[]; // lista explícita de códigos de produto
  limite?: number;
}

export class BuscarEnderecosProdutoUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(input: BuscarEnderecosProdutoInput): Promise<ProdutoEnderecamentoDetalhe[]> {
    const codprodsInput = input.codprods && input.codprods.length > 0 ? input.codprods : null;
    const termo = input.termo ? input.termo.trim().toUpperCase() : '';

    if (!codprodsInput && !termo) {
      return [];
    }

    const limite = input.limite || (codprodsInput ? codprodsInput.length : 20);

    let whereProd = '';
    let orderBy = 'PRO.CODPROD';

    if (codprodsInput) {
      whereProd = `PRO.CODPROD IN (${codprodsInput.join(',')})`;
    } else {
      const ehNumero = /^\d+$/.test(termo);
      if (ehNumero) {
        // Se digitou estritamente número: buscar exatamente pelo CODPROD ou pelo CODBARRA (evita match falso de %1% em referências)
        whereProd = `(PRO.CODPROD = ${termo} OR EXISTS (SELECT 1 FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD AND BAR.CODBARRA = '${termo}'))`;
        orderBy = `CASE WHEN PRO.CODPROD = ${termo} THEN 0 ELSE 1 END, PRO.CODPROD`;
      } else {
        whereProd = `(UPPER(PRO.DESCRPROD) LIKE '%${termo}%' OR UPPER(NVL(PRO.REFERENCIA, ' ')) LIKE '%${termo}%')`;
      }
    }

    // 1. Buscar produtos compatíveis
    const sqlProds = `
SELECT 
    PRO.CODPROD,
    PRO.DESCRPROD,
    PRO.REFERENCIA,
    (SELECT MAX(BAR.CODBARRA) FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD) AS CODBARRA,
    NVL(PRO.CODVOL, 'UN') AS CODVOL
FROM TGFPRO PRO
WHERE PRO.ATIVO = 'S'
  AND ${whereProd}
  AND ROWNUM <= ${limite}
ORDER BY ${orderBy}
    `.trim();

    const respProds = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlProds } },
      randomUUID(),
    );

    const rowsProds: any[] = respProds?.responseBody?.rows || [];
    if (rowsProds.length === 0) {
      return [];
    }

    const codprods = rowsProds.map((r) => Number(r[0]));
    const inCodprods = codprods.join(',');

    // 2. Buscar vínculos de endereçamento ativos em TGWEXP com TGWEND
    const sqlEnderecos = `
SELECT 
    EXP.CODPROD,
    EXP.CODEND,
    NVL(TRIM(END.ENDERECO), TO_CHAR(EXP.CODEND)) AS ENDERECO,
    END.DESCREND,
    NVL(END.PICKING, 'N') AS EH_PICKING,
    NVL(TRIM(EXP.CONTROLE), ' ') AS CONTROLE,
    EXP.ATIVO,
    TO_CHAR(EXP.DTINICIO, 'DD/MM/YYYY') AS DTINICIO,
    TO_CHAR(EXP.DTFIM, 'DD/MM/YYYY') AS DTFIM
FROM TGWEXP EXP
JOIN TGWEND END ON END.CODEND = EXP.CODEND
WHERE EXP.CODPROD IN (${inCodprods})
  AND EXP.ATIVO = 'S'
ORDER BY EXP.CODPROD, END.PICKING DESC, EXP.CODEND
    `.trim();

    const respEnd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlEnderecos } },
      randomUUID(),
    );
    const rowsEnd: any[] = respEnd?.responseBody?.rows || [];

    // Mapear endereços por codprod
    const mapaEnderecos = new Map<number, EnderecoVinculado[]>();
    for (const r of rowsEnd) {
      const cp = Number(r[0]);
      const codend = Number(r[1]);
      const endereco = String(r[2] || '').trim();
      const descrend = r[3] ? String(r[3]).trim() : null;
      const ehPicking = String(r[4] || 'N').toUpperCase() === 'S';
      const controle = String(r[5] || ' ').trim();
      const ativo = String(r[6] || 'S').toUpperCase() === 'S';
      const dtInicio = r[7] ? String(r[7]).trim() : null;
      const dtFim = r[8] ? String(r[8]).trim() : null;

      const item: EnderecoVinculado = {
        codend,
        endereco,
        descrend,
        tipo: ehPicking ? 'PICKING' : 'PULMAO',
        controle: controle || ' ',
        ativo,
        dtInicio,
        dtFim,
      };

      if (!mapaEnderecos.has(cp)) {
        mapaEnderecos.set(cp, []);
      }
      mapaEnderecos.get(cp)!.push(item);
    }

    // 3. Buscar saldos de estoque em TGFEST
    const sqlSaldo = `
SELECT 
    EST.CODPROD,
    NVL(SUM(EST.ESTOQUE - EST.RESERVADO), 0) AS SALDO_DISPONIVEL
FROM TGFEST EST
WHERE EST.CODPROD IN (${inCodprods})
GROUP BY EST.CODPROD
    `.trim();

    const respSaldo = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlSaldo } },
      randomUUID(),
    );
    const rowsSaldo: any[] = respSaldo?.responseBody?.rows || [];
    const mapaSaldo = new Map<number, number>();
    for (const s of rowsSaldo) {
      mapaSaldo.set(Number(s[0]), Number(s[1] || 0));
    }

    // Montar resultado consolidado
    const resultado: ProdutoEnderecamentoDetalhe[] = [];
    for (const rowP of rowsProds) {
      const codprod = Number(rowP[0]);
      const descrprod = String(rowP[1] || '').trim();
      const referencia = rowP[2] ? String(rowP[2]).trim() : null;
      const codbarra = rowP[3] ? String(rowP[3]).trim() : null;
      const codvol = String(rowP[4] || 'UN').trim();
      const tipconrest = null;

      const ends = mapaEnderecos.get(codprod) || [];
      const picking = ends.find((e) => e.tipo === 'PICKING') || null;
      const pulmoes = ends.filter((e) => e.tipo === 'PULMAO');
      const estoqueTotal = mapaSaldo.get(codprod) || 0;

      resultado.push({
        codprod,
        descrprod,
        referencia,
        codbarra,
        codvol,
        tipconrest,
        estoqueTotal,
        picking,
        pulmoes,
      });
    }

    return resultado;
  }
}
