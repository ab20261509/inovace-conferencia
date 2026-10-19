import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { BipagemEntrada } from '../../../domain/entities/ConferenciaEntrada.js';

export interface RegistrarBipagemEntradaInput {
  conferenciaId: string;
  codigo: string;
  quantidade?: number;
  nivel?: number;
  conferente: string;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  nunota?: number;
}

export interface RegistrarBipagemEntradaOutput {
  bipagem: BipagemEntrada;
  descrprod: string;
  referencia: string;
  fatorAplicado: number;
  statusSessao?: string;
}

export class RegistrarBipagemEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository
  ) {}

  async execute(input: RegistrarBipagemEntradaInput, correlationId?: string): Promise<RegistrarBipagemEntradaOutput> {
    const codigoLimpo = (input.codigo || '').trim();
    if (!codigoLimpo) {
      throw new Error('Código de barras não informado.');
    }

    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const statusBloqueados = ['Conferido', 'Enviado ao Sankhya', 'Divergente'];
    if (statusBloqueados.includes(sessao.status) && !(sessao.status === 'Divergente' && sessao.nivelAtual === 3)) {
      throw new Error(`Esta conferência está com status "${sessao.status}" e não aceita novas bipagens.`);
    }

    const nunotasStr = sessao.nunotas.join(', ');

    // 1. Buscar se o código corresponde a produto principal (REFERENCIA) ou alternativo (TGFVOA + TGFBAR)
    const sql = `
SELECT
    ITE.NUNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(PRO.REFERENCIA, ' ') AS REFERENCIA,
    NVL(PRO.DESCRPROD, ' ') AS DESCRPROD,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    NVL(BAR.CODBARRA, ' ') AS CODBARRA_ALT,
    NVL(BAR.DIVIDEMULTIPLICA, 'M') AS DIVIDEMULTIPLICA,
    NVL(BAR.QUANTIDADE, 1) AS FATOR_ALT
FROM TGFITE ITE
INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
LEFT JOIN (
    SELECT CODPROD, CODBARRA, DIVIDEMULTIPLICA, QUANTIDADE
    FROM TGFVOA
    WHERE (ATIVO IS NULL OR ATIVO = 'S')
    UNION ALL
    SELECT BAR.CODPROD, BAR.CODBARRA, 'M' AS DIVIDEMULTIPLICA, 1 AS QUANTIDADE
    FROM TGFBAR BAR
    WHERE NOT EXISTS (
        SELECT 1 FROM TGFVOA VOA 
        WHERE VOA.CODPROD = BAR.CODPROD 
          AND VOA.CODBARRA = BAR.CODBARRA 
          AND (VOA.ATIVO IS NULL OR VOA.ATIVO = 'S')
    )
) BAR ON BAR.CODPROD = ITE.CODPROD
     AND (UPPER(BAR.CODBARRA) = UPPER('${codigoLimpo}') OR UPPER(BAR.CODBARRA) = UPPER(TRIM('${codigoLimpo}')))
WHERE ITE.NUNOTA IN (${nunotasStr})
  AND (
       UPPER(PRO.REFERENCIA) = UPPER('${codigoLimpo}')
    OR UPPER(BAR.CODBARRA) = UPPER('${codigoLimpo}')
    OR TO_CHAR(PRO.CODPROD) = '${codigoLimpo}'
  )
ORDER BY ITE.NUNOTA, ITE.SEQUENCIA
    `.trim();

    const response = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
      correlationId
    );

    const rows: any[] = response?.responseBody?.rows || [];
    const fields: any[] = response?.responseBody?.fieldsMetadata || [];

    if (rows.length === 0) {
      throw new Error(`Código "${codigoLimpo}" não encontrado nos itens desta carga.`);
    }

    const fieldIndex: Record<string, number> = {};
    fields.forEach((f: any, idx: number) => {
      fieldIndex[f.name.toUpperCase()] = idx;
    });

    const nivelAtual = input.nivel || sessao.nivelAtual || 1;
    let candidateRows = rows;

    if (input.nunota) {
      const rowsDaNota = rows.filter((r) => Number(r[fieldIndex['NUNOTA']]) === input.nunota);
      if (rowsDaNota.length === 0) {
        const outraNota = rows[0][fieldIndex['NUNOTA']];
        throw new Error(`Código "${codigoLimpo}" pertence à NF #${outraNota} e não à NF #${input.nunota} selecionada.`);
      }
      candidateRows = rowsDaNota;
    }

    let targetRow = candidateRows[0];

    // Se houver múltiplas ocorrências do produto na carga (ex: em notas diferentes da conferência conjunta),
    // aloca na nota/linha que ainda possui saldo pendente de conferência no nível atual
    if (candidateRows.length > 1) {
      const todasBipagens = await this.conferenciaRepo.listarBipagens(sessao.id);
      let melhorLinha = candidateRows[0];
      let encontrouComSaldo = false;

      for (const row of candidateRows) {
        const rowNunota = Number(row[fieldIndex['NUNOTA']]);
        const rowSeq = Number(row[fieldIndex['SEQUENCIA']]);
        const rowCodprod = Number(row[fieldIndex['CODPROD']]);
        const rowQtdNeg = Number(row[fieldIndex['QTDNEG']] || 0);

        let conferidoNivel = 0;
        for (const b of todasBipagens) {
          if (
            !b.anulado &&
            b.nunota === rowNunota &&
            b.sequencia === rowSeq &&
            b.codprod === rowCodprod &&
            b.nivel === nivelAtual
          ) {
            conferidoNivel += b.qtdConferida;
          }
        }

        if (rowQtdNeg - conferidoNivel > 0) {
          melhorLinha = row;
          encontrouComSaldo = true;
          break;
        }
      }

      if (encontrouComSaldo) {
        targetRow = melhorLinha;
      }
    }

    const nunota = Number(targetRow[fieldIndex['NUNOTA']]);
    const sequencia = Number(targetRow[fieldIndex['SEQUENCIA']]);
    const codprod = Number(targetRow[fieldIndex['CODPROD']]);
    const referencia = String(targetRow[fieldIndex['REFERENCIA']] || '').trim();
    const descrprod = String(targetRow[fieldIndex['DESCRPROD']] || '').trim();
    const codBarraAlt = String(targetRow[fieldIndex['CODBARRA_ALT']] || '').trim();
    const divideMultiplica = String(targetRow[fieldIndex['DIVIDEMULTIPLICA']] || 'M');
    const fatorAlt = Number(targetRow[fieldIndex['FATOR_ALT']] || 1);

    if (sessao.statusPorNota && sessao.statusPorNota[nunota]) {
      const statusNota = sessao.statusPorNota[nunota];
      if (statusBloqueados.includes(statusNota) && !(statusNota === 'Divergente' && sessao.nivelAtual === 3)) {
        throw new Error(
          `A nota fiscal #${nunota} já está com status "${statusNota}" e não aceita novas bipagens.`
        );
      }
    }

    // 2. Se a conferência estiver no Nível 3 (Reconferência / Desempate),
    // validar se o item bipado é realmente divergente nos níveis anteriores
    if (nivelAtual === 3) {
      const todasBipagens = await this.conferenciaRepo.listarBipagens(sessao.id);
      let n1Item = 0;
      let n2Item = 0;
      for (const b of todasBipagens) {
        if (!b.anulado && b.nunota === nunota && b.codprod === codprod && b.sequencia === sequencia) {
          if (b.nivel === 1) n1Item += b.qtdConferida;
          if (b.nivel === 2) n2Item += b.qtdConferida;
        }
      }
      const qtdEsperada = Number(targetRow[fieldIndex['QTDNEG']] || 0);
      const houveN2 = todasBipagens.some((b) => !b.anulado && b.nivel === 2);
      const divergente = houveN2
        ? n1Item !== qtdEsperada || n2Item !== qtdEsperada || n1Item !== n2Item
        : n1Item !== qtdEsperada;

      if (!divergente) {
        throw new Error(
          `O produto "${descrprod}" já foi conferido e validado com sucesso nos níveis anteriores (${n1Item} un). No Nível 3, bipe apenas os itens divergentes.`
        );
      }
    }

    // 3. Calcular quantidade efetiva considerando fator se for embalagem alternativa
    let fator = 1;
    if (codBarraAlt.toUpperCase() === codigoLimpo.toUpperCase() && fatorAlt > 0) {
      fator = divideMultiplica === 'D' ? 1 / fatorAlt : fatorAlt;
    }

    const qtdBase = input.quantidade !== undefined && input.quantidade > 0 ? input.quantidade : 1;
    const qtdEfetiva = qtdBase * fator;

    // 3. Criar registro de bipagem
    const novaBipagem: BipagemEntrada = {
      id: randomUUID(),
      conferenciaId: sessao.id,
      nunota,
      codprod,
      sequencia,
      codbarra: codigoLimpo,
      qtdConferida: qtdEfetiva,
      nivel: input.nivel || sessao.nivelAtual || 1,
      conferente: input.conferente || sessao.conferente || 'Operador',
      timestamp: new Date().toISOString(),
      lote: input.lote ? input.lote.trim().toUpperCase() : undefined,
      validade: input.validade ? input.validade.trim() : undefined,
      fabricacao: input.fabricacao ? input.fabricacao.trim() : undefined,
      anulado: false,
    };

    await this.conferenciaRepo.salvarBipagem(novaBipagem);

    // Garantir que a conferência reflita o status de andamento no nível corrente
    const statusEsperado =
      (novaBipagem.nivel === 2)
        ? 'N2 em Andamento'
        : (novaBipagem.nivel === 3)
        ? 'N3 em Andamento'
        : 'N1 em Andamento';

    if (
      sessao.status !== statusEsperado &&
      sessao.status !== 'Conferido' &&
      sessao.status !== 'Enviado ao Sankhya'
    ) {
      sessao.status = statusEsperado;
      sessao.atualizadoEm = new Date().toISOString();
      await this.conferenciaRepo.salvarSessao(sessao);
    }

    return {
      bipagem: novaBipagem,
      descrprod,
      referencia,
      fatorAplicado: fator,
      statusSessao: sessao.status,
    };
  }
}
