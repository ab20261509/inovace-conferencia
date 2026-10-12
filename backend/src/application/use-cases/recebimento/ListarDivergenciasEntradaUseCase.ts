import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';

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
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
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
  itensDivergentes: ItemDivergenciaResumo[];
  todosItens: ItemDivergenciaResumo[];
}

export class ListarDivergenciasEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository
  ) {}

  async execute(correlationId?: string): Promise<ConferênciaDivergenciaGrupo[]> {
    // 1. Buscar todas as sessões no SQLite que estão como Divergente, Em Reconferência, N3 ou com statusPorNota divergente
    const todasSessoes = await (this.conferenciaRepo as any).client?.execute(
      `SELECT id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
              aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao, resposta_sankhya_json,
              status_por_nota_json
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

      const nunotasStr = nunotas.join(', ');

      // Buscar cabeçalho e itens no Sankhya
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
    NVL(ITE.QTDNEG, 0) AS QTDNEG
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
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
          conferenteN1?: string;
          conferenteN2?: string;
          conferenteN3?: string;
        }
      > = {};

      for (const b of bipagensValidas) {
        const key = `${b.nunota}|${b.codprod}|${b.sequencia}`;
        if (!mapBips[key]) {
          mapBips[key] = { n1: 0, n2: 0, n3: 0 };
        }
        if (b.nivel === 1) {
          mapBips[key].n1 += b.qtdConferida;
          mapBips[key].conferenteN1 = b.conferente;
        } else if (b.nivel === 2) {
          mapBips[key].n2 += b.qtdConferida;
          mapBips[key].conferenteN2 = b.conferente;
          if (b.lote) mapBips[key].lote = b.lote;
          if (b.validade) mapBips[key].validade = b.validade;
          if (b.fabricacao) mapBips[key].fabricacao = b.fabricacao;
        } else if (b.nivel === 3) {
          mapBips[key].n3 += b.qtdConferida;
          mapBips[key].conferenteN3 = b.conferente;
          if (b.lote) mapBips[key].lote = b.lote;
          if (b.validade) mapBips[key].validade = b.validade;
          if (b.fabricacao) mapBips[key].fabricacao = b.fabricacao;
        }
      }

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

        const key = `${nunotaItem}|${codprod}|${sequencia}`;
        const bips = mapBips[key] || { n1: 0, n2: 0, n3: 0 };

        const contagemFinal = bips.n3 > 0 ? bips.n3 : bips.n2 > 0 ? bips.n2 : bips.n1;
        const diferenca = contagemFinal - qtdEsperada;

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
          lote: bips.lote,
          validade: bips.validade,
          fabricacao: bips.fabricacao,
          conferenteN1: bips.conferenteN1,
          conferenteN2: bips.conferenteN2,
          conferenteN3: bips.conferenteN3,
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

        // Filtrar itens divergentes da nota
        const itensDivergentesNota = itensDestaNota.filter((it) => {
          if (it.qtdN3 > 0) return it.qtdN3 !== it.qtdEsperada;
          if (totalN1Nota > 0 && totalN2Nota > 0) return it.qtdN1 !== it.qtdN2 || it.qtdN2 !== it.qtdEsperada;
          if (totalN2Nota > 0) return it.qtdN2 !== it.qtdEsperada;
          return it.qtdN1 !== it.qtdEsperada;
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
            itensDivergentes: itensDivergentesNota,
            todosItens: itensDestaNota,
          });
        }
      }
    }

    return resultado;
  }
}
