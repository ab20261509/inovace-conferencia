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
}

export interface RegistrarBipagemEntradaOutput {
  bipagem: BipagemEntrada;
  descrprod: string;
  referencia: string;
  fatorAplicado: number;
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

    const targetRow = rows[0];
    const nunota = Number(targetRow[fieldIndex['NUNOTA']]);
    const sequencia = Number(targetRow[fieldIndex['SEQUENCIA']]);
    const codprod = Number(targetRow[fieldIndex['CODPROD']]);
    const referencia = String(targetRow[fieldIndex['REFERENCIA']] || '').trim();
    const descrprod = String(targetRow[fieldIndex['DESCRPROD']] || '').trim();
    const codBarraAlt = String(targetRow[fieldIndex['CODBARRA_ALT']] || '').trim();
    const divideMultiplica = String(targetRow[fieldIndex['DIVIDEMULTIPLICA']] || 'M');
    const fatorAlt = Number(targetRow[fieldIndex['FATOR_ALT']] || 1);

    // 2. Se a conferência estiver no Nível 3 (Reconferência / Desempate),
    // validar se o item bipado é realmente divergente nos níveis anteriores
    const nivelAtual = input.nivel || sessao.nivelAtual || 1;
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

    return {
      bipagem: novaBipagem,
      descrprod,
      referencia,
      fatorAplicado: fator,
    };
  }
}
