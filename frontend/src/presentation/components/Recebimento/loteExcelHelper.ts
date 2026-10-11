import * as XLSX from 'xlsx';

export interface ItemParaTemplate {
  codprod: number;
  codbarra?: string;
  refforn?: string;
  descrprod?: string;
  lote?: string;
  validade?: string;
  fabricacao?: string;
}

export interface LoteImportadoExcel {
  codprod: number;
  lote: string;
  qtd?: number;
  validade?: string;
  fabricacao?: string;
  veioDoExcel: true;
}

export interface ResumoProdutoImportado {
  codprod: number;
  descrprod?: string;
  codbarra?: string;
  refforn?: string;
  lotes: Array<{ lote: string; validade?: string; fabricacao?: string }>;
}

export interface ResultadoImportacaoExcel {
  sucesso: boolean;
  lotesValidos: LoteImportadoExcel[];
  resumoPorProduto: ResumoProdutoImportado[];
  totalLotes: number;
  totalProdutosAtualizados: number;
  avisos: string[];
  erros: string[];
}

/**
 * Normaliza qualquer formato de data (Excel serial, DD/MM/AAAA, AAAA-MM-DD) para AAAA-MM-DD
 */
export function normalizarDataExcel(valor: any): string | undefined {
  if (!valor) return undefined;

  // Se já for string tipo YYYY-MM-DD
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    return valor.trim();
  }

  // Se for DD/MM/YYYY ou DD-MM-YYYY
  if (typeof valor === 'string') {
    const limpo = valor.trim();
    const partes = limpo.split(/[/.-]/);
    if (partes.length === 3) {
      if (partes[0].length === 2 && partes[2].length === 4) {
        // DD/MM/YYYY -> YYYY-MM-DD
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
      if (partes[0].length === 4) {
        // YYYY/MM/DD -> YYYY-MM-DD
        return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
      }
    }
  }

  // Se o Excel salvou como número serial de data
  if (typeof valor === 'number' && valor > 20000 && valor < 70000) {
    const dataJs = new Date(Math.round((valor - 25569) * 86400 * 1000));
    if (!isNaN(dataJs.getTime())) {
      const ano = dataJs.getUTCFullYear();
      const mes = String(dataJs.getUTCMonth() + 1).padStart(2, '0');
      const dia = String(dataJs.getUTCDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
  }

  return String(valor).trim();
}

/**
 * Gera e faz download do modelo .xlsx contendo apenas CODPROD, CODBARRA, REFFORN, DESCRICAO, LOTE, DTVAL, DTFABRICACAO
 */
export function exportarTemplateLotesExcel(itens: ItemParaTemplate[], nomeArquivo = 'modelo_importacao_lotes.xlsx'): void {
  const linhas = itens.map((item) => ({
    CODPROD: item.codprod,
    CODBARRA: item.codbarra || '',
    REFFORN: item.refforn || '',
    DESCRICAO: item.descrprod || '',
    LOTE: item.lote || '',
    DTVAL: item.validade || '',
    DTFABRICACAO: item.fabricacao || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(linhas);

  // Definir larguras de colunas legíveis
  worksheet['!cols'] = [
    { wch: 14 }, // CODPROD
    { wch: 18 }, // CODBARRA
    { wch: 18 }, // REFFORN
    { wch: 35 }, // DESCRICAO
    { wch: 18 }, // LOTE
    { wch: 14 }, // DTVAL
    { wch: 14 }, // DTFABRICACAO
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotes');

  XLSX.writeFile(workbook, nomeArquivo);
}

/**
 * Lê uma planilha Excel/CSV e ajusta apenas LOTE, DTVAL e DTFABRICACAO, identificando por CODPROD, CODBARRA ou REFFORN
 */
export async function processarArquivoLotesExcel(
  file: File,
  itensValidos: Array<{
    codprod: number;
    codbarra?: string;
    refforn?: string;
    descrprod?: string;
    codigosAlternativos?: Array<{ codbarra: string }>;
  }>
): Promise<ResultadoImportacaoExcel> {
  const avisos: string[] = [];
  const erros: string[] = [];

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const primeiraAba = workbook.SheetNames[0];
  if (!primeiraAba) {
    throw new Error('A planilha está vazia ou não possui abas válidas.');
  }

  const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba]);

  if (!rawData || rawData.length === 0) {
    throw new Error('Nenhuma linha de dados encontrada na primeira aba da planilha.');
  }

  // Mapas rápidos para localização de produtos por CODPROD, CODBARRA ou REFFORN
  const mapaPorCodprod = new Map<number, (typeof itensValidos)[0]>();
  const mapaPorBarra = new Map<string, (typeof itensValidos)[0]>();
  const mapaPorRefforn = new Map<string, (typeof itensValidos)[0]>();

  itensValidos.forEach((item) => {
    mapaPorCodprod.set(item.codprod, item);

    if (item.codbarra && item.codbarra.trim()) {
      mapaPorBarra.set(item.codbarra.trim().toLowerCase(), item);
    }
    if (item.codigosAlternativos) {
      item.codigosAlternativos.forEach((alt) => {
        if (alt.codbarra && alt.codbarra.trim()) {
          mapaPorBarra.set(alt.codbarra.trim().toLowerCase(), item);
        }
      });
    }

    if (item.refforn && item.refforn.trim()) {
      mapaPorRefforn.set(item.refforn.trim().toLowerCase(), item);
    }
  });

  const lotesValidos: LoteImportadoExcel[] = [];
  const mapaAgrupamento = new Map<number, ResumoProdutoImportado>();

  let linhaIndex = 1;
  for (const raw of rawData) {
    linhaIndex++;

    const rawCodprod = Number(raw.CODPROD || raw.codprod || raw.PRODUTO || raw.Codprod);
    const rawCodbarra = String(raw.CODBARRA || raw.codbarra || raw.BARRAS || raw.EAN || '').trim();
    const rawRefforn = String(raw.REFFORN || raw.refforn || raw.REF_FORN || raw.REFERENCIA_FORNECEDOR || '').trim();

    const lote = String(raw.LOTE || raw.lote || raw.CONTROLE || raw.Lote || '').trim();
    const validade = normalizarDataExcel(raw.DTVAL || raw.dtval || raw.VALIDADE || raw.Validade);
    const fabricacao = normalizarDataExcel(raw.DTFABRICACAO || raw.dtfabricacao || raw.FABRICACAO || raw.Fabricacao);

    // 1. Localização inteligente do item na conferência
    let itemEncontrado: (typeof itensValidos)[0] | undefined;

    if (rawCodprod && mapaPorCodprod.has(rawCodprod)) {
      itemEncontrado = mapaPorCodprod.get(rawCodprod);
    } else if (rawCodbarra && mapaPorBarra.has(rawCodbarra.toLowerCase())) {
      itemEncontrado = mapaPorBarra.get(rawCodbarra.toLowerCase());
    } else if (rawRefforn && mapaPorRefforn.has(rawRefforn.toLowerCase())) {
      itemEncontrado = mapaPorRefforn.get(rawRefforn.toLowerCase());
    }

    if (!itemEncontrado) {
      const identificador = rawCodprod || rawCodbarra || rawRefforn || `Linha ${linhaIndex}`;
      avisos.push(`Linha ${linhaIndex}: Produto não localizado na conferência (${identificador}).`);
      continue;
    }

    if (!lote) {
      avisos.push(`Linha ${linhaIndex} (Prod ${itemEncontrado.codprod}): LOTE não informado.`);
    }

    const rawQtd = Number(raw.QTD || raw.qtd || raw.QUANTIDADE || raw.quantidade || raw.QTDNEG || raw.qtdneg) || undefined;

    const codprodFinal = itemEncontrado.codprod;

    lotesValidos.push({
      codprod: codprodFinal,
      lote: lote || 'PADRAO',
      qtd: rawQtd,
      validade,
      fabricacao,
      veioDoExcel: true,
    });

    if (!mapaAgrupamento.has(codprodFinal)) {
      mapaAgrupamento.set(codprodFinal, {
        codprod: codprodFinal,
        descrprod: itemEncontrado.descrprod || `Produto ${codprodFinal}`,
        codbarra: itemEncontrado.codbarra || rawCodbarra,
        refforn: itemEncontrado.refforn || rawRefforn,
        lotes: [],
      });
    }

    mapaAgrupamento.get(codprodFinal)!.lotes.push({
      lote: lote || 'PADRAO',
      validade,
      fabricacao,
    });
  }

  const resumoPorProduto = Array.from(mapaAgrupamento.values());

  return {
    sucesso: erros.length === 0 && lotesValidos.length > 0,
    lotesValidos,
    resumoPorProduto,
    totalLotes: lotesValidos.length,
    totalProdutosAtualizados: resumoPorProduto.length,
    avisos,
    erros,
  };
}
