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

    if (nunotas.length === 0 && input.nunotas && input.nunotas.length > 0) {
      nunotas = input.nunotas;
    }

    // Se ainda não temos a sessão carregada, busca por nunotas
    if (!sessao && nunotas.length > 0) {
      const sessoes = await this.conferenciaRepo.obterSessoesPorNunotas(nunotas);
      sessao = sessoes.find((s) => s.status !== 'Conferido') || null;
    }

    if (nunotas.length === 0) {
      return { sessao, itens: [], bipagens: [] };
    }

    const nunotasStr = nunotas.join(', ');

    // 1. Buscar Itens e Produtos
    const sqlItens = `
SELECT
    ITE.NUNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(PRO.DESCRPROD, 'PRODUTO NÃO IDENTIFICADO') AS DESCRPROD,
    NVL(PRO.REFERENCIA, ' ') AS REFERENCIA,
    NVL(ITE.CODVOL, 'UN') AS CODVOL,
    NVL(ITE.QTDNEG, 0) AS QTDNEG
FROM TGFITE ITE
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

    // Mapear totais bipados por item e por nível
    const mapQtdBipada: Record<string, { n1: number; n2: number; n3: number }> = {};
    for (const b of bipagens) {
      if (b.anulado) continue;
      const key = `${b.nunota}|${b.codprod}|${b.sequencia}`;
      if (!mapQtdBipada[key]) {
        mapQtdBipada[key] = { n1: 0, n2: 0, n3: 0 };
      }
      const qtd = Number(b.qtdConferida) || 0;
      if (b.nivel === 1) mapQtdBipada[key].n1 += qtd;
      else if (b.nivel === 2) mapQtdBipada[key].n2 += qtd;
      else if (b.nivel === 3) mapQtdBipada[key].n3 += qtd;
    }

    // Regras de Ocultação de Campos Sensíveis para conferencia_entrada
    const ocultarQtdPed = await this.configTelasRepo.deveOcultarCampo(
      'conferencia_entrada',
      'qtdPed',
      input.usuario
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
      const sequencia = Number(r[itensIndex['SEQUENCIA']]);
      const codprod = Number(r[itensIndex['CODPROD']]);
      const rawQtd = Number(r[itensIndex['QTDNEG']] || 0);

      const key = `${nunota}|${codprod}|${sequencia}`;
      const bip = mapQtdBipada[key] || { n1: 0, n2: 0, n3: 0 };

      // Se N3 estiver em jogo, identificar divergência
      const divergente = bip.n1 !== rawQtd || bip.n2 !== rawQtd || bip.n1 !== bip.n2;

      let codigosAlternativos = mapaBarras[codprod] || [];
      if (ocultarCodBarra) {
        codigosAlternativos = [];
      }

      return {
        nunota,
        sequencia,
        codprod,
        descrprod: String(r[itensIndex['DESCRPROD']] || ''),
        referencia: ocultarReferencia ? '—' : String(r[itensIndex['REFERENCIA']] || '').trim(),
        codvol: String(r[itensIndex['CODVOL']] || 'UN'),
        qtdneg: ocultarQtdPed ? null : rawQtd,
        qtdConferidaN1: bip.n1,
        qtdConferidaN2: bip.n2,
        qtdConferidaN3: bip.n3,
        codigosAlternativos,
        divergente,
      };
    });

    return {
      sessao,
      itens,
      bipagens,
    };
  }
}
