import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { ConferenciaEntradaResumo } from '../../../domain/entities/ConferenciaEntrada.js';

export class ListarTodasConferenciasEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository
  ) {}

  async execute(correlationId?: string): Promise<ConferenciaEntradaResumo[]> {
    // 1. Buscar todas as sessões registradas no repositório SQLite / Turso
    const sessoes = await this.conferenciaRepo.listarTodasSessoes();
    if (sessoes.length === 0) {
      return [];
    }

    // 2. Coletar todas as NUNOTAs distintas para buscar dados no Sankhya
    const todasNunotasSet = new Set<number>();
    for (const s of sessoes) {
      for (const n of s.nunotas) {
        if (n) todasNunotasSet.add(n);
      }
    }

    const nunotasArr = Array.from(todasNunotasSet);
    const mapaNotasSankhya: Record<
      number,
      { numnota: number; fornecedor: string; qtdItens: number }
    > = {};

    if (nunotasArr.length > 0) {
      try {
        const nunotasStr = nunotasArr.join(', ');
        const sql = `
SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'FORNECEDOR NÃO INFORMADO')) AS NOMEPARC,
    NVL(ITE.QTD_ITENS, 0) AS QTD_ITENS
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN (
    SELECT NUNOTA, COUNT(DISTINCT CODPROD) AS QTD_ITENS
    FROM TGFITE
    GROUP BY NUNOTA
) ITE ON ITE.NUNOTA = CAB.NUNOTA
WHERE CAB.NUNOTA IN (${nunotasStr})
        `.trim();

        const response = await this.gateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
          correlationId
        );

        const rows: any[] = response?.responseBody?.rows || [];
        const fields: any[] = response?.responseBody?.fieldsMetadata || [];
        const fieldIndexMap: Record<string, number> = {};
        fields.forEach((f: any, idx: number) => {
          fieldIndexMap[f.name.toUpperCase()] = idx;
        });

        for (const r of rows) {
          const nunota = Number(r[fieldIndexMap['NUNOTA']]);
          const numnota = Number(r[fieldIndexMap['NUMNOTA']]) || 0;
          const fornecedor = String(r[fieldIndexMap['NOMEPARC']] || 'FORNECEDOR NÃO INFORMADO').trim();
          const qtdItens = Number(r[fieldIndexMap['QTD_ITENS']]) || 0;

          mapaNotasSankhya[nunota] = { numnota, fornecedor, qtdItens };
        }
      } catch (err) {
        console.warn('⚠️ Falha ao buscar dados de cabeçalho das notas no Sankhya:', err);
      }
    }

    // 3. Montar resumo de cada conferência cruzando com bipagens
    const resultado: ConferenciaEntradaResumo[] = [];

    for (const sessao of sessoes) {
      const bipagens = await this.conferenciaRepo.listarBipagens(sessao.id);

      let totalBipadoN1 = 0;
      let totalBipadoN2 = 0;
      let totalBipadoN3 = 0;

      for (const b of bipagens) {
        if (b.anulado) continue;
        const qtd = Number(b.qtdConferida) || 0;
        if (b.nivel === 1) totalBipadoN1 += qtd;
        else if (b.nivel === 2) totalBipadoN2 += qtd;
        else if (b.nivel === 3) totalBipadoN3 += qtd;
      }

      // Dados das notas fiscais vinculadas
      const numerosNotasArr: number[] = [];
      const fornecedoresSet = new Set<string>();
      let totalItens = 0;

      for (const nunota of sessao.nunotas) {
        const info = mapaNotasSankhya[nunota];
        if (info) {
          if (info.numnota) numerosNotasArr.push(info.numnota);
          if (info.fornecedor) fornecedoresSet.add(info.fornecedor);
          totalItens += info.qtdItens;
        } else {
          numerosNotasArr.push(nunota);
        }
      }

      const numerosNotas =
        numerosNotasArr.length > 0 ? numerosNotasArr.join(', ') : sessao.nunotas.join(', ');
      const fornecedor =
        fornecedoresSet.size > 0 ? Array.from(fornecedoresSet).join(' / ') : 'Fornecedor da Nota';

      resultado.push({
        id: sessao.id,
        nunotas: sessao.nunotas,
        numerosNotas,
        fornecedor,
        status: sessao.status,
        nivelAtual: sessao.nivelAtual,
        conferente: sessao.conferente || 'Operador',
        criadoEm: sessao.criadoEm,
        atualizadoEm: sessao.atualizadoEm,
        finalizadoEm: sessao.finalizadoEm,
        enviadoSankhyaEm: sessao.enviadoSankhyaEm,
        totalItens,
        totalBipadoN1,
        totalBipadoN2,
        totalBipadoN3,
        temBackupContagem: !!sessao.backupContagemJson,
        backupContagem: sessao.backupContagem,
        observacaoAprovacao: sessao.observacaoAprovacao,
      });
    }

    return resultado;
  }
}
