import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';

export interface ItemDivergenciaResumo {
  nunota: number;
  codprod: number;
  sequencia: number;
  descrprod: string;
  referencia: string;
  codvol: string;
  qtdEsperada: number;
  qtdN1: number;
  qtdN2: number;
  qtdN3: number;
  diferenca: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  controleOriginal?: string;
  validadeOriginal?: string;
  fabricacaoOriginal?: string;
  divergenciaLote?: boolean;
  divergenciaValidade?: boolean;
  divergenciaFabricacao?: boolean;
  temMultiplosLotes?: boolean;
  loteN2?: string;
  validadeN2?: string;
  fabricacaoN2?: string;
  lotesConferidosN2?: Array<{
    lote: string;
    validade?: string;
    fabricacao?: string;
    quantidade: number;
    conferente?: string;
  }>;
  loteN3?: string;
  validadeN3?: string;
  fabricacaoN3?: string;
  lotesConferidosN3?: Array<{
    lote: string;
    validade?: string;
    fabricacao?: string;
    quantidade: number;
    conferente?: string;
  }>;
  lotesConferidos?: Array<{
    lote: string;
    validade?: string;
    fabricacao?: string;
    quantidade: number;
    conferente?: string;
  }>;
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
  codlocalorig?: number;
}

export interface ConferênciaDivergenciaGrupo {
  id: string;
  conferenciaId: string;
  nunota: number;
  numnota: number;
  nunotas: number[];
  numerosNotas: string;
  fornecedor: string;
  status: string;
  nivelAtual: number;
  conferente: string;
  conferentesN1: string[];
  conferentesN2: string[];
  conferentesN3: string[];
  criadoEm: string;
  atualizadoEm: string;
  totalN1: number;
  totalN2: number;
  totalN3: number;
  totalEsperado: number;
  nivel1Ativo?: boolean;
  nivel2Ativo?: boolean;
  itensDivergentes: ItemDivergenciaResumo[];
  todosItens: ItemDivergenciaResumo[];
  itensRecontagem?: any[];
}

export class ListarDivergenciasEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly configSistemaRepo?: IConfiguracaoSistemaRepository
  ) {}

  async execute(correlationId?: string): Promise<ConferênciaDivergenciaGrupo[]> {
    let nivel1Ativo = true;
    let nivel2Ativo = true;
    if (this.configSistemaRepo) {
      const n1Param = await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel1_ativo');
      const n2Param = await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel2_ativo');
      if (n1Param === 'false') nivel1Ativo = false;
      if (n2Param === 'false') nivel2Ativo = false;
    }

    // 1. Buscar todas as sessões no SQLite que estão como Divergente, Em Reconferência, N3 ou com statusPorNota divergente
    const todasSessoes = await (this.conferenciaRepo as any).client?.execute(
      `SELECT id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
              aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao, resposta_sankhya_json,
              status_por_nota_json, itens_recontagem_json
       FROM conferencias_entrada
       WHERE status IN ('Divergente', 'Em Reconferência', 'Aguardando N3', 'N3 em Andamento')
          OR status_por_nota_json LIKE '%Divergente%'
       ORDER BY atualizado_em DESC`
    );

    const sessoesRows = todasSessoes?.rows || [];
    if (sessoesRows.length === 0) return [];

    const resultado: ConferênciaDivergenciaGrupo[] = [];

    for (const row of sessoesRows) {
      const id = String(row.id);
      let nunotas: number[] = [];
      try {
        nunotas = JSON.parse(String(row.nunotas_json || '[]'));
      } catch {
        nunotas = [];
      }
      if (nunotas.length === 0) continue;

      let statusPorNota: Record<number, string> = {};
      try {
        statusPorNota = JSON.parse(String(row.status_por_nota_json || '{}'));
      } catch {}

      let itensRecontagem: any[] | undefined;
      try {
        itensRecontagem = row.itens_recontagem_json ? JSON.parse(String(row.itens_recontagem_json)) : undefined;
      } catch {}

      let decisoesFiscais: Record<string, any> = {};
      try {
        decisoesFiscais = row.decisoes_fiscais_json ? JSON.parse(String(row.decisoes_fiscais_json)) : {};
      } catch {}

      const nunotasStr = nunotas.join(', ');

      // Buscar cabeçalho e itens no Sankhya incluindo CONTROLE e datas pré-existentes
      const sql = `
SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'FORNECEDOR NÃO INFORMADO')) AS NOMEPARC,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(PRO.DESCRPROD, 'PRODUTO SEM DESCRIÇÃO') AS DESCRPROD,
    NVL(PRO.REFERENCIA, ' ') AS REFERENCIA,
    NVL(ITE.CODVOL, 'UN') AS CODVOL,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    ITE.CONTROLE,
    ITE.CODLOCALORIG,
    TO_CHAR(EST.DTVAL, 'DD/MM/YYYY') AS DTVAL,
    TO_CHAR(EST.DTFABRICACAO, 'DD/MM/YYYY') AS DTFABRICACAO
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
LEFT JOIN TGFEST EST ON EST.CODPROD = ITE.CODPROD 
                    AND EST.CONTROLE = ITE.CONTROLE 
                    AND EST.CODEMP = CAB.CODEMP
                    AND EST.TIPO = 'P'
                    AND EST.CODPARC = 0
WHERE CAB.NUNOTA IN (${nunotasStr})
ORDER BY ITE.NUNOTA, ITE.SEQUENCIA
      `.trim();

      const resp = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
        correlationId
      );

      const rows: any[] = resp?.responseBody?.rows || [];
      const fields: any[] = resp?.responseBody?.fieldsMetadata || [];
      const fieldIndex: Record<string, number> = {};
      fields.forEach((f: any, idx: number) => {
        fieldIndex[f.name.toUpperCase()] = idx;
      });

      // Bipagens da sessão
      const bipagens = await this.conferenciaRepo.listarBipagens(id);
      const bipagensValidas = bipagens.filter((b) => !b.anulado);

      // Mapa de contagens por item (nunota|codprod|sequencia)
      const mapBips: Record<
        string,
        {
          n1: number;
          n2: number;
          n3: number;
          lote?: string;
          validade?: string;
          fabricacao?: string;
          loteN2?: string;
          validadeN2?: string;
          fabricacaoN2?: string;
          loteN3?: string;
          validadeN3?: string;
          fabricacaoN3?: string;
          lotesMapN2: Record<
            string,
            {
              lote: string;
              validade?: string;
              fabricacao?: string;
              quantidade: number;
              conferente?: string;
            }
          >;
          lotesMapN3: Record<
            string,
            {
              lote: string;
              validade?: string;
              fabricacao?: string;
              quantidade: number;
              conferente?: string;
            }
          >;
          conferenteN1?: string;
          conferenteN2?: string;
          conferenteN3?: string;
        }
      > = {};

      for (const b of bipagensValidas) {
        const key = `${b.nunota}|${b.codprod}|${b.sequencia}`;
        if (!mapBips[key]) {
          mapBips[key] = { n1: 0, n2: 0, n3: 0, lotesMapN2: {}, lotesMapN3: {} };
        }
        if (b.nivel === 1) {
          mapBips[key].n1 += b.qtdConferida;
          mapBips[key].conferenteN1 = b.conferente;
        } else if (b.nivel === 2) {
          mapBips[key].n2 += b.qtdConferida;
          mapBips[key].conferenteN2 = b.conferente;
          if (b.lote) {
            mapBips[key].loteN2 = b.lote;
            mapBips[key].lote = b.lote;
          }
          if (b.validade) {
            mapBips[key].validadeN2 = b.validade;
            mapBips[key].validade = b.validade;
          }
          if (b.fabricacao) {
            mapBips[key].fabricacaoN2 = b.fabricacao;
            mapBips[key].fabricacao = b.fabricacao;
          }

          if (b.lote) {
            const lLimpo = b.lote.trim();
            const subKey = `${lLimpo.toUpperCase()}|${b.validade || ''}|${b.fabricacao || ''}`;
            if (!mapBips[key].lotesMapN2[subKey]) {
              mapBips[key].lotesMapN2[subKey] = {
                lote: lLimpo,
                validade: b.validade?.trim() || undefined,
                fabricacao: b.fabricacao?.trim() || undefined,
                quantidade: 0,
                conferente: b.conferente,
              };
            }
            mapBips[key].lotesMapN2[subKey].quantidade += b.qtdConferida;
          }
        } else if (b.nivel === 3) {
          mapBips[key].n3 += b.qtdConferida;
          mapBips[key].conferenteN3 = b.conferente;
          if (b.lote) {
            mapBips[key].loteN3 = b.lote;
            mapBips[key].lote = b.lote;
          }
          if (b.validade) {
            mapBips[key].validadeN3 = b.validade;
            mapBips[key].validade = b.validade;
          }
          if (b.fabricacao) {
            mapBips[key].fabricacaoN3 = b.fabricacao;
            mapBips[key].fabricacao = b.fabricacao;
          }

          if (b.lote) {
            const lLimpo = b.lote.trim();
            const subKey = `${lLimpo.toUpperCase()}|${b.validade || ''}|${b.fabricacao || ''}`;
            if (!mapBips[key].lotesMapN3[subKey]) {
              mapBips[key].lotesMapN3[subKey] = {
                lote: lLimpo,
                validade: b.validade?.trim() || undefined,
                fabricacao: b.fabricacao?.trim() || undefined,
                quantidade: 0,
                conferente: b.conferente,
              };
            }
            mapBips[key].lotesMapN3[subKey].quantidade += b.qtdConferida;
          }
        }
      }

      const normalizarDataBr = (dt?: string): string => {
        if (!dt) return '';
        const mIso = dt.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (mIso) return `${mIso[3]}/${mIso[2]}/${mIso[1]}`;
        const mBr = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (mBr) return `${mBr[1]}/${mBr[2]}/${mBr[3]}`;
        return dt;
      };

      // Mapeamento de itens por nota fiscal individual
      const itensPorNota: Record<number, ItemDivergenciaResumo[]> = {};
      const fornecedorPorNota: Record<number, string> = {};
      const numnotaPorNota: Record<number, number> = {};

      for (const r of rows) {
        const nunotaItem = Number(r[fieldIndex['NUNOTA']]);
        const numnota = Number(r[fieldIndex['NUMNOTA']] || 0);
        numnotaPorNota[nunotaItem] = numnota;
        fornecedorPorNota[nunotaItem] = String(r[fieldIndex['NOMEPARC']] || 'FORNECEDOR');

        const codprod = Number(r[fieldIndex['CODPROD']]);
        const sequencia = Number(r[fieldIndex['SEQUENCIA']]);
        const descrprod = String(r[fieldIndex['DESCRPROD']] || '');
        const referencia = String(r[fieldIndex['REFERENCIA']] || '').trim();
        const codvol = String(r[fieldIndex['CODVOL']] || 'UN');
        const qtdEsperada = Number(r[fieldIndex['QTDNEG']] || 0);
        const controleOriginal = r[fieldIndex['CONTROLE']] ? String(r[fieldIndex['CONTROLE']]).trim() : undefined;
        const validadeOriginal = r[fieldIndex['DTVAL']] ? String(r[fieldIndex['DTVAL']]).trim() : undefined;
        const fabricacaoOriginal = r[fieldIndex['DTFABRICACAO']] ? String(r[fieldIndex['DTFABRICACAO']]).trim() : undefined;

        const key = `${nunotaItem}|${codprod}|${sequencia}`;
        const bips = mapBips[key] || {
          n1: 0,
          n2: 0,
          n3: 0,
          lotesMapN2: {},
          lotesMapN3: {},
        };

        const lotesConferidosN2 = Object.values(bips.lotesMapN2 || {});
        const lotesConferidosN3 = Object.values(bips.lotesMapN3 || {});

        // Avaliar decisão prévia salva na sessão para este item
        const itemKey = `${nunotaItem}-${codprod}-${sequencia}`;
        const decisaoPrevia = decisoesFiscais?.[itemKey] || decisoesFiscais?.[String(codprod)];

        let nivelAtivoItem: 2 | 3 = bips.n3 > 0 ? 3 : 2;
        if (decisaoPrevia?.nivelEscolhido === 2 || decisaoPrevia?.lote === 'N2') {
          nivelAtivoItem = 2;
        } else if (decisaoPrevia?.nivelEscolhido === 3 || decisaoPrevia?.lote === 'N3') {
          nivelAtivoItem = 3;
        }

        const lotesConferidos =
          nivelAtivoItem === 3 && lotesConferidosN3.length > 0
            ? lotesConferidosN3
            : lotesConferidosN2;

        const loteAtivo =
          nivelAtivoItem === 3 && bips.loteN3
            ? bips.loteN3
            : bips.loteN2;

        const validadeAtiva =
          nivelAtivoItem === 3 && bips.validadeN3
            ? bips.validadeN3
            : bips.validadeN2;

        const fabricacaoAtiva =
          nivelAtivoItem === 3 && bips.fabricacaoN3
            ? bips.fabricacaoN3
            : bips.fabricacaoN2;

        // Só há múltiplos lotes se dentro do nível ativo o conferente registrou mais de 1 lote físico
        const temMultiplosLotes = lotesConferidos.length > 1;

        const contagemFinal = bips.n3 > 0 ? bips.n3 : bips.n2 > 0 ? bips.n2 : bips.n1;
        const diferenca = contagemFinal - qtdEsperada;

        let divergenciaLote = false;
        let divergenciaValidade = false;
        let divergenciaFabricacao = false;

        // Se o conferente registrou múltiplos lotes para a mesma linha, há divergência cadastral que requer desmembramento
        if (temMultiplosLotes) {
          divergenciaLote = true;
        }

        if (contagemFinal > 0) {
          if (controleOriginal && loteAtivo && loteAtivo.toUpperCase() !== controleOriginal.toUpperCase()) {
            divergenciaLote = true;
          }
          if (validadeOriginal && validadeAtiva && normalizarDataBr(validadeAtiva) !== normalizarDataBr(validadeOriginal)) {
            divergenciaValidade = true;
          }
          if (fabricacaoOriginal && fabricacaoAtiva && normalizarDataBr(fabricacaoAtiva) !== normalizarDataBr(fabricacaoOriginal)) {
            divergenciaFabricacao = true;
          }
        }

        const itemResumo: ItemDivergenciaResumo = {
          nunota: nunotaItem,
          codprod,
          sequencia,
          descrprod,
          referencia,
          codvol,
          qtdEsperada,
          qtdN1: bips.n1,
          qtdN2: bips.n2,
          qtdN3: bips.n3,
          diferenca,
          lote: loteAtivo,
          validade: validadeAtiva,
          fabricacao: fabricacaoAtiva,
          loteN2: bips.loteN2,
          validadeN2: bips.validadeN2,
          fabricacaoN2: bips.fabricacaoN2,
          lotesConferidosN2,
          loteN3: bips.loteN3,
          validadeN3: bips.validadeN3,
          fabricacaoN3: bips.fabricacaoN3,
          lotesConferidosN3,
          controleOriginal,
          validadeOriginal,
          fabricacaoOriginal,
          divergenciaLote,
          divergenciaValidade,
          divergenciaFabricacao,
          temMultiplosLotes,
          lotesConferidos,
          conferenteN1: bips.conferenteN1,
          conferenteN2: bips.conferenteN2,
          conferenteN3: bips.conferenteN3,
          codlocalorig: r[fieldIndex['CODLOCALORIG']] !== undefined && r[fieldIndex['CODLOCALORIG']] !== null && r[fieldIndex['CODLOCALORIG']] !== ''
            ? Number(r[fieldIndex['CODLOCALORIG']])
            : undefined,
        };

        if (!itensPorNota[nunotaItem]) {
          itensPorNota[nunotaItem] = [];
        }
        itensPorNota[nunotaItem].push(itemResumo);
      }

      // Gerar um cartão de incidente independente para cada nota divergente
      for (const nunotaItem of nunotas) {
        const itensDestaNota = itensPorNota[nunotaItem] || [];
        if (itensDestaNota.length === 0) continue;

        const statusNota = statusPorNota[nunotaItem] || String(row.status);
        // Se a nota já estiver 100% aprovada ou enviada, não deve aparecer em divergências!
        if (statusNota === 'Conferido' || statusNota === 'Enviado ao Sankhya') {
          continue;
        }

        let totalN1Nota = 0;
        let totalN2Nota = 0;
        let totalN3Nota = 0;
        let totalEsperadoNota = 0;
        const confN1Set = new Set<string>();
        const confN2Set = new Set<string>();
        const confN3Set = new Set<string>();

        itensDestaNota.forEach((it) => {
          totalN1Nota += it.qtdN1;
          totalN2Nota += it.qtdN2;
          totalN3Nota += it.qtdN3;
          totalEsperadoNota += it.qtdEsperada;
          if (it.conferenteN1) confN1Set.add(it.conferenteN1);
          if (it.conferenteN2) confN2Set.add(it.conferenteN2);
          if (it.conferenteN3) confN3Set.add(it.conferenteN3);
        });

        // Identificar produtos com divergência (quantidade ou fiscal) ou com desmembramento
        const codprodsComDivergencia = new Set<number>();
        itensDestaNota.forEach((it) => {
          const temDivFiscal = it.divergenciaLote || it.divergenciaValidade || it.divergenciaFabricacao;
          let temDivQtd = false;
          if (it.qtdN3 > 0) temDivQtd = it.qtdN3 !== it.qtdEsperada;
          else if (totalN1Nota > 0 && totalN2Nota > 0) temDivQtd = it.qtdN1 !== it.qtdN2 || it.qtdN2 !== it.qtdEsperada;
          else if (totalN2Nota > 0) temDivQtd = it.qtdN2 !== it.qtdEsperada;
          else temDivQtd = it.qtdN1 !== it.qtdEsperada;

          if (temDivFiscal || temDivQtd || it.temMultiplosLotes) {
            codprodsComDivergencia.add(it.codprod);
          }
        });

        // Filtrar itens divergentes: inclui todas as sequências de produtos que possuem divergência ou desmembramento,
        // garantindo que o item conferido/bipado corretamente continue visível junto com a fração faltante desmembrada
        const itensDivergentesNota = itensDestaNota.filter((it) => {
          return codprodsComDivergencia.has(it.codprod);
        });

        // Se a nota tiver divergências ou seu status for expressamente Divergente/Aguardando N3
        if (itensDivergentesNota.length > 0 || statusNota === 'Divergente' || statusNota === 'Aguardando N3' || statusNota === 'N3 em Andamento') {
          const numnotaFinal = numnotaPorNota[nunotaItem] || nunotaItem;

          resultado.push({
            id: `${id}_${nunotaItem}`,
            conferenciaId: id,
            nunota: nunotaItem,
            numnota: numnotaFinal,
            nunotas: [nunotaItem],
            numerosNotas: String(numnotaFinal),
            fornecedor: fornecedorPorNota[nunotaItem] || 'FORNECEDOR',
            status: statusNota,
            nivelAtual: Number(row.nivel_atual),
            conferente: String(row.conferente || 'Operador'),
            conferentesN1: Array.from(confN1Set),
            conferentesN2: Array.from(confN2Set),
            conferentesN3: Array.from(confN3Set),
            criadoEm: String(row.criado_em),
            atualizadoEm: String(row.atualizado_em),
            totalN1: totalN1Nota,
            totalN2: totalN2Nota,
            totalN3: totalN3Nota,
            totalEsperado: totalEsperadoNota,
            nivel1Ativo,
            nivel2Ativo,
            itensDivergentes: itensDivergentesNota,
            todosItens: itensDestaNota,
            itensRecontagem,
          });
        }
      }
    }

    return resultado;
  }
}
