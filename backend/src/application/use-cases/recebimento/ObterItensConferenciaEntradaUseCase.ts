import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IConfiguracaoTelasRepository } from '../../../domain/ports/IConfiguracaoTelasRepository.js';
import {
  ItemNotaEntrada,
  CodigoAlternativoEntrada,
  SessaoConferenciaEntrada,
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

    if (sessao && nunotas.length > sessao.nunotas.length) {
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
    ITE.CODLOCALORIG
FROM TGFITE ITE
INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
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

    const [respItens, respBarras] = await Promise.all([
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

    // Buscar Bipagens do Repositório
    const bipagens = sessao ? await this.conferenciaRepo.listarBipagens(sessao.id) : [];

    // Mapear detalhes de contagem por item e por nível (lotes, validades, conferentes)
    const mapBipsDetalhadas: Record<
      string,
      {
        n1: number;
        n2: number;
        n3: number;
        lote?: string;
        validade?: string;
        fabricacao?: string;
        conferenteN1?: string;
        conferenteN2?: string;
        conferenteN3?: string;
        lotesMap: Record<
          string,
          {
            lote: string;
            validade?: string;
            fabricacao?: string;
            quantidade: number;
            bipagemIds: string[];
            ultimoHorario: string;
            conferente?: string;
          }
        >;
      }
    > = {};

    for (const b of bipagens) {
      if (b.anulado) continue;
      const key = `${b.nunota}|${b.codprod}|${b.sequencia}`;
      if (!mapBipsDetalhadas[key]) {
        mapBipsDetalhadas[key] = { n1: 0, n2: 0, n3: 0, lotesMap: {} };
      }
      const qtd = Number(b.qtdConferida) || 0;
      if (b.nivel === 1) {
        mapBipsDetalhadas[key].n1 += qtd;
        if (b.conferente) mapBipsDetalhadas[key].conferenteN1 = b.conferente;
      } else if (b.nivel === 2) {
        mapBipsDetalhadas[key].n2 += qtd;
        if (b.conferente) mapBipsDetalhadas[key].conferenteN2 = b.conferente;
      } else if (b.nivel === 3) {
        mapBipsDetalhadas[key].n3 += qtd;
        if (b.conferente) mapBipsDetalhadas[key].conferenteN3 = b.conferente;
      }

      // Agrupamento estruturado por Lote + Validade + Fabricação
      if (b.lote && b.lote.trim()) {
        const lLimpo = b.lote.trim();
        const subKey = `${lLimpo.toUpperCase()}|${b.validade || ''}|${b.fabricacao || ''}`;
        if (!mapBipsDetalhadas[key].lotesMap[subKey]) {
          mapBipsDetalhadas[key].lotesMap[subKey] = {
            lote: lLimpo,
            validade: b.validade?.trim() || undefined,
            fabricacao: b.fabricacao?.trim() || undefined,
            quantidade: 0,
            bipagemIds: [],
            ultimoHorario: b.timestamp,
            conferente: b.conferente,
          };
        }
        mapBipsDetalhadas[key].lotesMap[subKey].quantidade += qtd;
        mapBipsDetalhadas[key].lotesMap[subKey].bipagemIds.push(b.id);
        mapBipsDetalhadas[key].lotesMap[subKey].ultimoHorario = b.timestamp;
      }

      if (b.lote && !mapBipsDetalhadas[key].lote) mapBipsDetalhadas[key].lote = b.lote;
      if (b.validade && !mapBipsDetalhadas[key].validade) mapBipsDetalhadas[key].validade = b.validade;
      if (b.fabricacao && !mapBipsDetalhadas[key].fabricacao) mapBipsDetalhadas[key].fabricacao = b.fabricacao;
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

    // Mapear Itens
    const itensRows: any[] = respItens?.responseBody?.rows || [];
    const itensFields: any[] = respItens?.responseBody?.fieldsMetadata || [];
    const itensIndex: Record<string, number> = {};
    itensFields.forEach((f: any, idx: number) => {
      itensIndex[f.name.toUpperCase()] = idx;
    });

    const itens: ItemNotaEntrada[] = itensRows.map((r) => {
      const nunota = Number(r[itensIndex['NUNOTA']]);
      const numnota = Number(r[itensIndex['NUMNOTA']] || 0);
      const sequencia = Number(r[itensIndex['SEQUENCIA']]);
      const codprod = Number(r[itensIndex['CODPROD']]);
      const rawQtd = Number(r[itensIndex['QTDNEG']] || 0);

      const key = `${nunota}|${codprod}|${sequencia}`;
      const bip = mapBipsDetalhadas[key] || { n1: 0, n2: 0, n3: 0, lotesMap: {} };

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

      let codigosAlternativos = mapaBarras[codprod] || [];
      if (ocultarCodBarra) {
        codigosAlternativos = [];
      }

      const lotesConferidos = Object.values(bip.lotesMap || {});

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
        qtdConferidaN1: bip.n1,
        qtdConferidaN2: bip.n2,
        qtdConferidaN3: bip.n3,
        codigosAlternativos,
        divergente,
        lote: bip.lote,
        validade: bip.validade,
        fabricacao: bip.fabricacao,
        lotesConferidos,
        conferenteN1: bip.conferenteN1,
        conferenteN2: bip.conferenteN2,
        conferenteN3: bip.conferenteN3,
        diferenca,
        codlocal: r[itensIndex['CODLOCALORIG']] !== null && r[itensIndex['CODLOCALORIG']] !== undefined ? Number(r[itensIndex['CODLOCALORIG']]) : undefined,
        codlocalorig: r[itensIndex['CODLOCALORIG']] !== null && r[itensIndex['CODLOCALORIG']] !== undefined ? Number(r[itensIndex['CODLOCALORIG']]) : undefined,
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
      sessao?.status === 'Aguardando N3' || sessao?.status === 'N3 em Andamento';

    const ehNivel3AtivoNoColetor =
      statusPermiteFiltragemN3 &&
      sessao?.nivelAtual === 3 &&
      input.origem !== 'gestao';

    const itensRetornados = ehNivel3AtivoNoColetor
      ? itens.filter((i) => {
          const statusNota = sessao?.statusPorNota?.[i.nunota];
          if (statusNota === 'Conferido' || statusNota === 'Enviado ao Sankhya') {
            return false;
          }
          return i.divergente;
        })
      : itens;

    // Enriquecer bipagens com dados descritivos do produto
    const bipagensEnriquecidas = bipagens.map((b) => {
      const prod = mapaProdutos[b.codprod];
      return {
        ...b,
        descrprod: prod?.descrprod || 'PRODUTO NÃO IDENTIFICADO',
        referencia: prod?.referencia || '',
      };
    });

    return {
      sessao,
      itens: itensRetornados,
      bipagens: bipagensEnriquecidas,
    };
  }
}
