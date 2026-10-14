import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ListarDivergenciasEntradaUseCase } from './ListarDivergenciasEntradaUseCase.js';

export interface SincronizarDesmembramentoInput {
  conferenciaId: string;
  nunota: number;
  codprod?: number;
  sequencia?: number;
}

export interface SincronizarDesmembramentoOutput {
  sucesso: boolean;
  alterado: boolean;
  mensagem: string;
  divergencias?: any[];
}

/**
 * Consulta a TGFITE no Sankhya para verificar se o operador realizou o
 * desmembramento manual na Central de Compras para itens com falta física.
 */
export class SincronizarDesmembramentoNotaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly gateway: IGatewayPort,
    private readonly listarDivergenciasUseCase: ListarDivergenciasEntradaUseCase
  ) {}

  async execute(
    input: SincronizarDesmembramentoInput,
    correlationId?: string
  ): Promise<SincronizarDesmembramentoOutput> {
    const rawId = input.conferenciaId.includes('_')
      ? input.conferenciaId.split('_')[0]
      : input.conferenciaId;

    const sessao = await this.conferenciaRepo.obterSessaoPorId(rawId);
    if (!sessao) {
      throw new Error(`Conferência de entrada ${rawId} não encontrada.`);
    }

    const nunota = Number(input.nunota);
    if (!nunota) {
      throw new Error('Número único da nota (nunota) é obrigatório.');
    }

    // 1. Obter itens atuais da TGFITE direto no Sankhya
    const sql = `
SELECT
    ITE.NUNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    ITE.CONTROLE
FROM TGFITE ITE
WHERE ITE.NUNOTA = ${nunota}
ORDER BY ITE.SEQUENCIA
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

    if (rows.length === 0) {
      return {
        sucesso: false,
        alterado: false,
        mensagem: `Nenhum item localizado no Sankhya para a nota ${nunota}.`,
      };
    }

    // 2. Obter bipagens da conferência para calcular a contagem física
    const bipagens = await this.conferenciaRepo.listarBipagens(rawId);
    const bipagensNota = bipagens.filter((b) => !b.anulado && Number(b.nunota) === nunota);

    const mapBips: Record<string, { n1: number; n2: number; n3: number }> = {};
    for (const b of bipagensNota) {
      const key = `${b.codprod}|${b.sequencia}`;
      if (!mapBips[key]) {
        mapBips[key] = { n1: 0, n2: 0, n3: 0 };
      }
      if (b.nivel === 1) mapBips[key].n1 += b.qtdConferida;
      else if (b.nivel === 2) mapBips[key].n2 += b.qtdConferida;
      else if (b.nivel === 3) mapBips[key].n3 += b.qtdConferida;
    }

    // 3. Verificar se as quantidades da TGFITE agora atendem ou reduziram a falta
    let desmembramentoDetectado = false;

    // Se o usuário especificou um item pontual
    if (input.codprod && input.sequencia) {
      const rowItem = rows.find(
        (r) =>
          Number(r[fieldIndex['CODPROD']]) === Number(input.codprod) &&
          Number(r[fieldIndex['SEQUENCIA']]) === Number(input.sequencia)
      );

      if (rowItem) {
        const qtdNegAtual = Number(rowItem[fieldIndex['QTDNEG']] || 0);
        const key = `${input.codprod}|${input.sequencia}`;
        const b = mapBips[key] || { n1: 0, n2: 0, n3: 0 };
        const contagemFinal = b.n3 > 0 ? b.n3 : b.n2 > 0 ? b.n2 : b.n1;

        // Se a quantidade no ERP agora é exatamente a conferida (ou menor/igual à contagem)
        if (qtdNegAtual <= contagemFinal) {
          desmembramentoDetectado = true;
        }
      }
    } else {
      // Verificação ampla na nota: verificar se todos os itens negativos agora batem
      let todasFaltasZeradasOuReduzidas = true;
      for (const r of rows) {
        const codprod = Number(r[fieldIndex['CODPROD']]);
        const sequencia = Number(r[fieldIndex['SEQUENCIA']]);
        const qtdNegAtual = Number(r[fieldIndex['QTDNEG']] || 0);
        const key = `${codprod}|${sequencia}`;
        const b = mapBips[key] || { n1: 0, n2: 0, n3: 0 };
        const contagemFinal = b.n3 > 0 ? b.n3 : b.n2 > 0 ? b.n2 : b.n1;

        if (contagemFinal > 0 && qtdNegAtual > contagemFinal) {
          todasFaltasZeradasOuReduzidas = false;
        }
      }
      if (todasFaltasZeradasOuReduzidas) {
        desmembramentoDetectado = true;
      }
    }

    // 4. Sempre buscar a lista de divergências atualizada para refletir os números mais recentes da TGFITE
    const divergenciasAtualizadas = await this.listarDivergenciasUseCase.execute(correlationId);

    if (desmembramentoDetectado) {
      return {
        sucesso: true,
        alterado: true,
        mensagem:
          'Desmembramento identificado no Sankhya com sucesso! As quantidades faturadas foram sincronizadas e a divergência de quantidade foi atualizada.',
        divergencias: divergenciasAtualizadas,
      };
    } else {
      return {
        sucesso: true,
        alterado: false,
        mensagem:
          'Desmembramento ainda não identificado no Sankhya para esta nota. Por favor, realize o desmembramento na Central de Compras no ERP e clique novamente em Desmembrar.',
        divergencias: divergenciasAtualizadas,
      };
    }
  }
}
