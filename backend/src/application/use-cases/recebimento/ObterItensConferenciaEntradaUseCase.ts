import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IConfiguracaoTelasRepository } from '../../../domain/ports/IConfiguracaoTelasRepository.js';
import {
  ItemNotaEntrada,
  CodigoAlternativoEntrada,
  UnidadeAlternativaEntrada,
  SessaoConferenciaEntrada,
  FracaoLoteItem,
} from '../../../domain/entities/ConferenciaEntrada.js';

export interface ObterItensConferenciaEntradaInput {
  conferenciaId?: string;
  nunotas?: number[];
  usuario: string;
  origem?: 'coletor' | 'gestao';
}

export interface ObterItensConferenciaEntradaOutput {
  sessao?: SessaoConferenciaEntrada | null;
  itens: ItemNotaEntrada[];
  bipagens: any[];
  ocultarStatus?: boolean;
}

export class ObterItensConferenciaEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly configTelasRepo: IConfiguracaoTelasRepository
  ) {}

  async execute(
    input: ObterItensConferenciaEntradaInput,
    correlationId?: string
  ): Promise<ObterItensConferenciaEntradaOutput> {
    let sessao: SessaoConferenciaEntrada | null = null;
    let nunotas: number[] = [];

    if (input.conferenciaId) {
      sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
      if (sessao) {
        nunotas = sessao.nunotas;
      }
    }

    if (input.nunotas && input.nunotas.length > 0) {
      nunotas = Array.from(new Set([...nunotas, ...input.nunotas.filter(Boolean)]));
    }

    // Se ainda não temos a sessão carregada, busca por nunotas
    if (!sessao && nunotas.length > 0) {
      const sessoes = await this.conferenciaRepo.obterSessoesPorNunotas(nunotas);
      sessao = sessoes.find((s) => s.status !== 'Conferido' && s.status !== 'Enviado ao Sankhya') || null;
    }

    if (sessao && !input.conferenciaId && nunotas.length > sessao.nunotas.length) {
      sessao.nunotas = nunotas;
      sessao.atualizadoEm = new Date().toISOString();
      await this.conferenciaRepo.salvarSessao(sessao);
    }

    if (nunotas.length === 0) {
      return { sessao, itens: [], bipagens: [] };
    }

    const nunotasStr = nunotas.join(', ');

    // 1. Buscar Itens e Produtos
    const sqlItens = `
SELECT
    ITE.NUNOTA,
    CAB.NUMNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(PRO.DESCRPROD, 'PRODUTO NÃO IDENTIFICADO') AS DESCRPROD,
    NVL(PRO.REFERENCIA, ' ') AS REFERENCIA,
    NVL(PRO.REFFORN, ' ') AS REFFORN,
    NVL(ITE.CODVOL, 'UN') AS CODVOL,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    ITE.CODLOCALORIG,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'FORNECEDOR NÃO INFORMADO')) AS NOMEPARC,
    CAB.CODPARC
FROM TGFITE ITE
INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
WHERE ITE.NUNOTA IN (${nunotasStr})
ORDER BY ITE.NUNOTA, ITE.SEQUENCIA
    `.trim();

    // 2. Buscar Códigos de Barras e Volumes Alternativos (TGFVOA + TGFBAR)
    const sqlBarras = `
SELECT
    VOA.CODPROD,
    NVL(VOA.CODBARRA, ' ') AS CODBARRA,
    NVL(VOA.CODVOL, 'UN') AS CODVOL,
    NVL(VOA.DIVIDEMULTIPLICA, 'M') AS DIVIDEMULTIPLICA,
    NVL(VOA.QUANTIDADE, 1) AS QUANTIDADE,
    NVL(VOA.ATIVO, 'S') AS ATIVO
FROM TGFVOA VOA
WHERE (VOA.ATIVO IS NULL OR VOA.ATIVO = 'S')
  AND VOA.CODPROD IN (
      SELECT DISTINCT CODPROD FROM TGFITE WHERE NUNOTA IN (${nunotasStr})
  )
UNION ALL
SELECT
    BAR.CODPROD,
    NVL(BAR.CODBARRA, ' ') AS CODBARRA,
    NVL(BAR.CODVOL, 'UN') AS CODVOL,
    'M' AS DIVIDEMULTIPLICA,
    1 AS QUANTIDADE,
    'S' AS ATIVO
FROM TGFBAR BAR
WHERE BAR.CODPROD IN (
      SELECT DISTINCT CODPROD FROM TGFITE WHERE NUNOTA IN (${nunotasStr})
  )
  AND NOT EXISTS (
      SELECT 1 FROM TGFVOA VOA 
      WHERE VOA.CODPROD = BAR.CODPROD 
        AND VOA.CODBARRA = BAR.CODBARRA 
        AND (VOA.ATIVO IS NULL OR VOA.ATIVO = 'S')
  )
    `.trim();

    // 3. Buscar Unidades Alternativas da TGFVOA (apenas ativas com CODVOL e QUANTIDADE)
    const sqlVoa = `
SELECT DISTINCT
    VOA.CODPROD,
    NVL(VOA.CODVOL, 'UN') AS CODVOL,
    NVL(VOA.QUANTIDADE, 1) AS QUANTIDADE
FROM TGFVOA VOA
WHERE (VOA.ATIVO IS NULL OR VOA.ATIVO = 'S')
  AND VOA.CODPROD IN (
      SELECT DISTINCT CODPROD FROM TGFITE WHERE NUNOTA IN (${nunotasStr})
  )
ORDER BY 1, 2
    `.trim();

    const [respItens, respBarras, respVoa] = await Promise.all([
      this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlItens } },
        correlationId
      ),
      this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlBarras } },
        correlationId
      ),
      this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlVoa } },
        correlationId
      ),
    ]);

    // Mapear Códigos Alternativos por CODPROD
    const barrasRows: any[] = respBarras?.responseBody?.rows || [];
    const barrasFields: any[] = respBarras?.responseBody?.fieldsMetadata || [];
    const barrasIndex: Record<string, number> = {};
    barrasFields.forEach((f: any, idx: number) => {
      barrasIndex[f.name.toUpperCase()] = idx;
    });

    const mapaBarras: Record<number, CodigoAlternativoEntrada[]> = {};
    for (const r of barrasRows) {
      const codprod = Number(r[barrasIndex['CODPROD']]);
      const codbarra = String(r[barrasIndex['CODBARRA']] || '').trim();
      if (!codbarra) continue;

      const alt: CodigoAlternativoEntrada = {
        codprod,
        codbarra,
        codvol: String(r[barrasIndex['CODVOL']] || 'UN'),
        divideMultiplica: r[barrasIndex['DIVIDEMULTIPLICA']] === 'D' ? 'D' : 'M',
        quantidade: Number(r[barrasIndex['QUANTIDADE']] || 1),
        ativo: String(r[barrasIndex['ATIVO']] || 'S'),
      };

      if (!mapaBarras[codprod]) mapaBarras[codprod] = [];
      mapaBarras[codprod].push(alt);
    }

    // Mapear Unidades Alternativas por CODPROD (apenas CODVOL e QUANTIDADE)
    const voaRows: any[] = respVoa?.responseBody?.rows || [];
    const voaFields: any[] = respVoa?.responseBody?.fieldsMetadata || [];
    const voaIndex: Record<string, number> = {};
    voaFields.forEach((f: any, idx: number) => {
      voaIndex[f.name.toUpperCase()] = idx;
    });

    const mapaUnidadesAlternativas: Record<number, UnidadeAlternativaEntrada[]> = {};
    for (const r of voaRows) {
      const codprod = Number(r[voaIndex['CODPROD']]);
      const codvol = String(r[voaIndex['CODVOL']] || '').trim();
      const quantidade = Number(r[voaIndex['QUANTIDADE']] || 1);
      if (!codvol) continue;

      if (!mapaUnidadesAlternativas[codprod]) mapaUnidadesAlternativas[codprod] = [];
      if (!mapaUnidadesAlternativas[codprod].some(u => u.codvol === codvol && u.quantidade === quantidade)) {
        mapaUnidadesAlternativas[codprod].push({ codvol, quantidade });
      }
    }

    // Buscar Bipagens do Repositório
    const bipagens = sessao ? await this.conferenciaRepo.listarBipagens(sessao.id) : [];

    // Mapear detalhes de contagem por item e por nível (lotes, validades, conferentes)
    const mapBipsDetalhadas: Record<
      string,
      {
        n1: number;
        n2: number;
        n3: number;
        conferenteN1?: string;
        conferenteN2?: string;
        conferenteN3?: string;
        dadosPorNivel: Record<number, { lote?: string; validade?: string; fabricacao?: string }>;
        lotesMapN1: Record<string, FracaoLoteItem>;
        lotesMapN2: Record<string, FracaoLoteItem>;
        lotesMapN3: Record<string, FracaoLoteItem>;
      }
    > = {};

    for (const b of bipagens) {
      if (b.anulado) continue;
      const key = `${b.nunota}|${b.codprod}|${b.sequencia}`;
      if (!mapBipsDetalhadas[key]) {
        mapBipsDetalhadas[key] = {
          n1: 0,
          n2: 0,
          n3: 0,
          dadosPorNivel: {},
          lotesMapN1: {},
          lotesMapN2: {},
          lotesMapN3: {},
        };
      }
      const qtd = Number(b.qtdConferida) || 0;
      const nivel = b.nivel || 1;
      if (nivel === 1) {
        mapBipsDetalhadas[key].n1 += qtd;
        if (b.conferente) mapBipsDetalhadas[key].conferenteN1 = b.conferente;
      } else if (nivel === 2) {
        mapBipsDetalhadas[key].n2 += qtd;
        if (b.conferente) mapBipsDetalhadas[key].conferenteN2 = b.conferente;
      } else if (nivel === 3) {
        mapBipsDetalhadas[key].n3 += qtd;
        if (b.conferente) mapBipsDetalhadas[key].conferenteN3 = b.conferente;
      }

      if (!mapBipsDetalhadas[key].dadosPorNivel[nivel]) {
        mapBipsDetalhadas[key].dadosPorNivel[nivel] = {};
      }
      if (b.lote && !mapBipsDetalhadas[key].dadosPorNivel[nivel].lote) {
        mapBipsDetalhadas[key].dadosPorNivel[nivel].lote = b.lote.trim();
      }
      if (b.validade && !mapBipsDetalhadas[key].dadosPorNivel[nivel].validade) {
        mapBipsDetalhadas[key].dadosPorNivel[nivel].validade = b.validade.trim();
      }
      if (b.fabricacao && !mapBipsDetalhadas[key].dadosPorNivel[nivel].fabricacao) {
        mapBipsDetalhadas[key].dadosPorNivel[nivel].fabricacao = b.fabricacao.trim();
      }

      // Agrupamento estruturado por Lote + Validade + Fabricação SEPARADO POR NÍVEL (Regra Mandatória 5)
      if (b.lote && b.lote.trim()) {
        const lLimpo = b.lote.trim();
        const subKey = `${lLimpo.toUpperCase()}|${b.validade || ''}|${b.fabricacao || ''}`;
        const targetMap =
          nivel === 3
            ? mapBipsDetalhadas[key].lotesMapN3
            : nivel === 2
            ? mapBipsDetalhadas[key].lotesMapN2
            : mapBipsDetalhadas[key].lotesMapN1;

        if (!targetMap[subKey]) {
          targetMap[subKey] = {
            lote: lLimpo,
            validade: b.validade?.trim() || undefined,
            fabricacao: b.fabricacao?.trim() || undefined,
            quantidade: 0,
            bipagemIds: [],
            ultimoHorario: b.timestamp,
            conferente: b.conferente,
          };
        }
        targetMap[subKey].quantidade += qtd;
        targetMap[subKey].bipagemIds!.push(b.id);
        targetMap[subKey].ultimoHorario = b.timestamp;
      }
    }

    // Regras de Ocultação de Campos Sensíveis para conferencia_entrada
    const ocultarQtdNota = (
      await this.configTelasRepo.deveOcultarCampo('conferencia_entrada', 'qtdNota', input.usuario)
    ) || (
      await this.configTelasRepo.deveOcultarCampo('conferencia_entrada', 'qtdPed', input.usuario)
    );
    const ocultarCodBarra = await this.configTelasRepo.deveOcultarCampo(
      'conferencia_entrada',
      'codBarra',
      input.usuario
    );
    const ocultarReferencia = await this.configTelasRepo.deveOcultarCampo(
      'conferencia_entrada',
      'referencia',
      input.usuario
    );
    const ocultarStatus = await this.configTelasRepo.deveOcultarCampo(
      'conferencia_entrada',
      'status',
      input.usuario
    );

    // Mapear Itens
    const itensRows: any[] = respItens?.responseBody?.rows || [];
    const itensFields: any[] = respItens?.responseBody?.fieldsMetadata || [];
    const itensIndex: Record<string, number> = {};
    itensFields.forEach((f: any, idx: number) => {
      itensIndex[f.name.toUpperCase()] = idx;
    });

    // Rebalanceamento FIFO inteligente para produtos com múltiplas sequências na mesma nota fiscal
    const totaisProdNota: Record<
      string,
      {
        esperado: number;
        n1: number;
        n2: number;
        n3: number;
        conferenteN1?: string;
        conferenteN2?: string;
        conferenteN3?: string;
        lotesMapN1: Record<string, FracaoLoteItem>;
        lotesMapN2: Record<string, FracaoLoteItem>;
        lotesMapN3: Record<string, FracaoLoteItem>;
        dadosPorNivel: Record<number, { lote?: string; validade?: string; fabricacao?: string }>;
        seqs: Array<{ sequencia: number; rawQtd: number }>;
      }
    > = {};

    itensRows.forEach((r) => {
      const nunota = Number(r[itensIndex['NUNOTA']]);
      const codprod = Number(r[itensIndex['CODPROD']]);
      const sequencia = Number(r[itensIndex['SEQUENCIA']]);
      const rawQtd = Number(r[itensIndex['QTDNEG']] || 0);
      const prodKey = `${nunota}|${codprod}`;

      if (!totaisProdNota[prodKey]) {
        totaisProdNota[prodKey] = {
          esperado: 0,
          n1: 0,
          n2: 0,
          n3: 0,
          lotesMapN1: {},
          lotesMapN2: {},
          lotesMapN3: {},
          dadosPorNivel: {},
          seqs: [],
        };
      }
      totaisProdNota[prodKey].esperado += rawQtd;
      totaisProdNota[prodKey].seqs.push({ sequencia, rawQtd });

      const itemKey = `${nunota}|${codprod}|${sequencia}`;
      const bip = mapBipsDetalhadas[itemKey];
      if (bip) {
        totaisProdNota[prodKey].n1 += bip.n1;
        totaisProdNota[prodKey].n2 += bip.n2;
        totaisProdNota[prodKey].n3 += bip.n3;
        if (bip.conferenteN1) totaisProdNota[prodKey].conferenteN1 = bip.conferenteN1;
        if (bip.conferenteN2) totaisProdNota[prodKey].conferenteN2 = bip.conferenteN2;
        if (bip.conferenteN3) totaisProdNota[prodKey].conferenteN3 = bip.conferenteN3;
        Object.assign(totaisProdNota[prodKey].lotesMapN1, bip.lotesMapN1 || {});
        Object.assign(totaisProdNota[prodKey].lotesMapN2, bip.lotesMapN2 || {});
        Object.assign(totaisProdNota[prodKey].lotesMapN3, bip.lotesMapN3 || {});
        Object.assign(totaisProdNota[prodKey].dadosPorNivel, bip.dadosPorNivel || {});
      }
    });

    Object.entries(totaisProdNota).forEach(([prodKey, data]) => {
      if (data.seqs.length <= 1) return;

      data.seqs.sort((a, b) => a.sequencia - b.sequencia);
      let saldoN1 = data.n1;
      let saldoN2 = data.n2;
      let saldoN3 = data.n3;

      data.seqs.forEach((seqInfo, idx) => {
        const itemKey = `${prodKey}|${seqInfo.sequencia}`;
        const ehUltima = idx === data.seqs.length - 1;
        const esp = seqInfo.rawQtd;

        const alocN1 = (!ehUltima && saldoN1 > esp) ? esp : saldoN1;
        const alocN2 = (!ehUltima && saldoN2 > esp) ? esp : saldoN2;
        const alocN3 = (!ehUltima && saldoN3 > esp) ? esp : saldoN3;

        saldoN1 = Math.max(0, saldoN1 - alocN1);
        saldoN2 = Math.max(0, saldoN2 - alocN2);
        saldoN3 = Math.max(0, saldoN3 - alocN3);

        if (!mapBipsDetalhadas[itemKey]) {
          mapBipsDetalhadas[itemKey] = {
            n1: 0,
            n2: 0,
            n3: 0,
            dadosPorNivel: {},
            lotesMapN1: {},
            lotesMapN2: {},
            lotesMapN3: {},
          };
        }

        mapBipsDetalhadas[itemKey].n1 = alocN1;
        mapBipsDetalhadas[itemKey].n2 = alocN2;
        mapBipsDetalhadas[itemKey].n3 = alocN3;
        if (data.conferenteN1 && !mapBipsDetalhadas[itemKey].conferenteN1) {
          mapBipsDetalhadas[itemKey].conferenteN1 = data.conferenteN1;
        }
        if (data.conferenteN2 && !mapBipsDetalhadas[itemKey].conferenteN2) {
          mapBipsDetalhadas[itemKey].conferenteN2 = data.conferenteN2;
        }
        if (data.conferenteN3 && !mapBipsDetalhadas[itemKey].conferenteN3) {
          mapBipsDetalhadas[itemKey].conferenteN3 = data.conferenteN3;
        }
        if (Object.keys(mapBipsDetalhadas[itemKey].dadosPorNivel).length === 0) {
          mapBipsDetalhadas[itemKey].dadosPorNivel = data.dadosPorNivel;
        }
        if (Object.keys(mapBipsDetalhadas[itemKey].lotesMapN1).length === 0) {
          mapBipsDetalhadas[itemKey].lotesMapN1 = data.lotesMapN1;
        }
        if (Object.keys(mapBipsDetalhadas[itemKey].lotesMapN2).length === 0) {
          mapBipsDetalhadas[itemKey].lotesMapN2 = data.lotesMapN2;
        }
        if (Object.keys(mapBipsDetalhadas[itemKey].lotesMapN3).length === 0) {
          mapBipsDetalhadas[itemKey].lotesMapN3 = data.lotesMapN3;
        }
      });
    });

    const itens: ItemNotaEntrada[] = itensRows.map((r) => {
      const nunota = Number(r[itensIndex['NUNOTA']]);
      const numnota = Number(r[itensIndex['NUMNOTA']] || 0);
      const sequencia = Number(r[itensIndex['SEQUENCIA']]);
      const codprod = Number(r[itensIndex['CODPROD']]);
      const rawQtd = Number(r[itensIndex['QTDNEG']] || 0);

      const key = `${nunota}|${codprod}|${sequencia}`;
      const bip = mapBipsDetalhadas[key] || {
        n1: 0,
        n2: 0,
        n3: 0,
        dadosPorNivel: {},
        lotesMapN1: {},
        lotesMapN2: {},
        lotesMapN3: {},
      };

      // Se houve contagem em N1 e N2, compara N1 x N2 x NF.
      // Se não houve N1 (iniciado direto em N2), compara N2 x NF.
      // Se não houve N2 (contagem única em N1), compara N1 x NF.
      const houveNivel1 = bipagens.some((b) => !b.anulado && b.nivel === 1);
      const houveNivel2 = bipagens.some((b) => !b.anulado && b.nivel === 2);
      const divergente =
        houveNivel1 && houveNivel2
          ? bip.n1 !== rawQtd || bip.n2 !== rawQtd || bip.n1 !== bip.n2
          : houveNivel2
          ? bip.n2 !== rawQtd
          : bip.n1 !== rawQtd;

      // Contagem física final apurada
      const contagemFinal = bip.n3 > 0 ? bip.n3 : bip.n2 > 0 ? bip.n2 : bip.n1;
      const diferenca = contagemFinal - rawQtd;

      // Na conferência cega, indica se a contagem do nível ativo atingiu ou superou a quantidade esperada da NF
      const nivelAtivo = sessao?.nivelAtual || 1;
      const conferidoNivelAtivo = nivelAtivo === 1 ? bip.n1 : nivelAtivo === 2 ? bip.n2 : bip.n3;
      const conferidoCompleto = rawQtd > 0 ? conferidoNivelAtivo >= rawQtd : conferidoNivelAtivo > 0;

      const codigosAlternativos = mapaBarras[codprod] || [];

      // Resolução de Decisão Fiscal e Nível Adotado (Regra Mandatória 5: NUNCA somar N2 e N3)
      const itemKey = `${nunota}-${codprod}-${sequencia}`;
      const decisao = sessao?.decisoesFiscais?.[itemKey] || sessao?.decisoesFiscais?.[String(codprod)];
      const nivelEscolhido = decisao?.nivelEscolhido;

      let nivelAdotado: number = 1;
      if (nivelEscolhido) {
        nivelAdotado = nivelEscolhido;
      } else if (bip.n3 > 0 || sessao?.nivelAtual === 3) {
        nivelAdotado = bip.n3 > 0 ? 3 : bip.n2 > 0 ? 2 : 1;
      } else if (bip.n2 > 0 || sessao?.nivelAtual === 2) {
        nivelAdotado = bip.n2 > 0 ? 2 : 1;
      }

      // Frações de lote EXCLUSIVAMENTE do nível adotado
      let lotesConferidos: FracaoLoteItem[] = [];
      if (nivelAdotado === 3) {
        lotesConferidos = Object.values(bip.lotesMapN3 || {});
      } else if (nivelAdotado === 2) {
        lotesConferidos = Object.values(bip.lotesMapN2 || {});
      } else {
        lotesConferidos = Object.values(bip.lotesMapN1 || {});
      }

      const dadosDoNivel = (bip.dadosPorNivel && bip.dadosPorNivel[nivelAdotado]) || {};
      const loteFinal =
        dadosDoNivel.lote ||
        bip.dadosPorNivel?.[2]?.lote ||
        bip.dadosPorNivel?.[3]?.lote ||
        bip.dadosPorNivel?.[1]?.lote;
      const validadeFinal =
        dadosDoNivel.validade ||
        bip.dadosPorNivel?.[2]?.validade ||
        bip.dadosPorNivel?.[3]?.validade ||
        bip.dadosPorNivel?.[1]?.validade;
      const fabricacaoFinal =
        dadosDoNivel.fabricacao ||
        bip.dadosPorNivel?.[2]?.fabricacao ||
        bip.dadosPorNivel?.[3]?.fabricacao ||
        bip.dadosPorNivel?.[1]?.fabricacao;

      return {
        nunota,
        numnota,
        sequencia,
        codprod,
        descrprod: String(r[itensIndex['DESCRPROD']] || ''),
        referencia: ocultarReferencia ? '—' : String(r[itensIndex['REFERENCIA']] || '').trim(),
        refforn: String(r[itensIndex['REFFORN']] || '').trim(),
        codbarra: codigosAlternativos[0]?.codbarra || '',
        codvol: String(r[itensIndex['CODVOL']] || 'UN'),
        qtdneg: ocultarQtdNota ? null : rawQtd,
        conferidoCompleto: ocultarStatus ? false : conferidoCompleto,
        qtdConferidaN1: bip.n1,
        qtdConferidaN2: bip.n2,
        qtdConferidaN3: bip.n3,
        codigosAlternativos,
        unidadesAlternativas: mapaUnidadesAlternativas[codprod] || [],
        divergente,
        lote: loteFinal,
        validade: validadeFinal,
        fabricacao: fabricacaoFinal,
        lotesConferidos,
        conferenteN1: bip.conferenteN1,
        conferenteN2: bip.conferenteN2,
        conferenteN3: bip.conferenteN3,
        diferenca,
        codlocal: r[itensIndex['CODLOCALORIG']] !== null && r[itensIndex['CODLOCALORIG']] !== undefined ? Number(r[itensIndex['CODLOCALORIG']]) : undefined,
        codlocalorig: r[itensIndex['CODLOCALORIG']] !== null && r[itensIndex['CODLOCALORIG']] !== undefined ? Number(r[itensIndex['CODLOCALORIG']]) : undefined,
        nomeparc: r[itensIndex['NOMEPARC']] ? String(r[itensIndex['NOMEPARC']]).trim() : undefined,
        codparc: r[itensIndex['CODPARC']] !== null && r[itensIndex['CODPARC']] !== undefined ? Number(r[itensIndex['CODPARC']]) : undefined,
        decisaoFiscal: decisao,
        nivelEscolhido: nivelEscolhido || (sessao?.status === 'Enviado ao Sankhya' ? nivelAdotado : undefined),
      };
    });

    // Mapa de Descrições e Referências dos Produtos
    const mapaProdutos: Record<number, { descrprod: string; referencia: string }> = {};
    for (const r of itensRows) {
      const codprod = Number(r[itensIndex['CODPROD']]);
      if (!mapaProdutos[codprod]) {
        mapaProdutos[codprod] = {
          descrprod: String(r[itensIndex['DESCRPROD']] || ''),
          referencia: String(r[itensIndex['REFERENCIA']] || '').trim(),
        };
      }
    }

    // Se a conferência estiver ativamente sendo recontada no Coletor no Nível 3,
    // o conferente no coletor recebe apenas os itens pendentes que divergiram.
    // MAS no painel de gestão, ou quando a conferência/nota já foi aprovada/concluída
    // ('Conferido', 'Aguardando Aprovação', 'Enviado ao Sankhya'), SEMPRE retornamos
    // todos os itens para que o gestor possa visualizar na tela e enviar ao Sankhya.
    const statusPermiteFiltragemN3 =
      sessao?.status === 'Aguardando N3' ||
      sessao?.status === 'N3 em Andamento' ||
      sessao?.status === 'Aguardando Recontagem N3' ||
      sessao?.status === 'Recontagem N3 em Andamento' ||
      (sessao?.status === 'Divergente' && sessao?.nivelAtual === 3);

    const ehNivel3AtivoNoColetor =
      statusPermiteFiltragemN3 &&
      sessao?.nivelAtual === 3 &&
      input.origem !== 'gestao';

    // Se houver recontagem parcial ativa (itens específicos selecionados pelo gestor para N1/N2/N3)
    const ehStatusRecontagemOuAndamento = Boolean(
      sessao?.status?.includes('Recontagem') ||
      sessao?.status === 'Aguardando N2' ||
      sessao?.status === 'N2 em Andamento' ||
      sessao?.status === 'Aguardando N3' ||
      sessao?.status === 'N3 em Andamento'
    );

    const temRecontagemParcialNoColetor =
      Boolean(sessao?.itensRecontagem && sessao.itensRecontagem.length > 0) &&
      input.origem !== 'gestao' &&
      ehStatusRecontagemOuAndamento;

    let itensRetornados = itens;

    if (temRecontagemParcialNoColetor && sessao?.itensRecontagem) {
      const setChavesRecontagem = new Set(
        sessao.itensRecontagem.map((r) => `${r.nunota}|${r.sequencia}|${r.codprod}`)
      );
      itensRetornados = itens.filter((i) =>
        setChavesRecontagem.has(`${i.nunota}|${i.sequencia}|${i.codprod}`)
      );
    } else if (ehNivel3AtivoNoColetor) {
      itensRetornados = itens.filter((i) => {
        const statusNota = sessao?.statusPorNota?.[i.nunota];
        if (statusNota === 'Conferido' || statusNota === 'Enviado ao Sankhya') {
          return false;
        }
        return i.divergente;
      });
    }

    // Se nunotas específicas foram solicitadas no input (ex: expansão do card de uma nota específica na Gestão ou foco no coletor)
    if (input.nunotas && input.nunotas.length > 0) {
      const setFiltro = new Set(input.nunotas);
      itensRetornados = itensRetornados.filter((i) => setFiltro.has(i.nunota));
    }

    // Enriquecer bipagens com dados descritivos do produto
    let bipagensEnriquecidas = bipagens
      .filter((b) => !input.nunotas || input.nunotas.length === 0 || input.nunotas.includes(b.nunota))
      .map((b) => {
        const prod = mapaProdutos[b.codprod];
        return {
          ...b,
          descrprod: prod?.descrprod || 'PRODUTO NÃO IDENTIFICADO',
          referencia: prod?.referencia || '',
        };
      });

    // Se estiver no coletor, filtra estritamente as bipagens do nível atual para preservar o sigilo da conferência cega
    if (input.origem === 'coletor' && sessao?.nivelAtual) {
      bipagensEnriquecidas = bipagensEnriquecidas.filter((b) => b.nivel === sessao.nivelAtual);
    }

    // Se estiver no coletor em recontagem seletiva, filtra apenas as bipagens dos itens selecionados
    if (temRecontagemParcialNoColetor && sessao?.itensRecontagem) {
      const setChavesRecontagem = new Set(
        sessao.itensRecontagem.map((r) => `${r.nunota}|${r.sequencia}|${r.codprod}`)
      );
      bipagensEnriquecidas = bipagensEnriquecidas.filter((b) =>
        setChavesRecontagem.has(`${b.nunota}|${b.sequencia}|${b.codprod}`)
      );
    }

    return {
      sessao,
      itens: itensRetornados,
      bipagens: bipagensEnriquecidas,
      ocultarStatus,
    };
  }
}
