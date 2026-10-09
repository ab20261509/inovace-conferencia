import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';
import {
  SessaoConferenciaEntrada,
  StatusConferenciaEntrada,
} from '../../../domain/entities/ConferenciaEntrada.js';

export interface FinalizarNivelEntradaInput {
  conferenciaId: string;
  nivel: number;
}

export interface FinalizarNivelEntradaOutput {
  sessao: SessaoConferenciaEntrada;
  statusFinal: StatusConferenciaEntrada;
  possuiDivergencias: boolean;
  totalItens: number;
  totalConferidos: number;
}

export class FinalizarNivelEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly configSistemaRepo?: IConfiguracaoSistemaRepository
  ) {}

  async execute(
    input: FinalizarNivelEntradaInput,
    correlationId?: string
  ): Promise<FinalizarNivelEntradaOutput> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const nunotasStr = sessao.nunotas.join(', ');

    // 1. Buscar itens esperados na nota fiscal
    const sql = `
SELECT
    ITE.NUNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(ITE.QTDNEG, 0) AS QTDNEG
FROM TGFITE ITE
WHERE ITE.NUNOTA IN (${nunotasStr})
    `.trim();

    const response = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
      correlationId
    );

    const rows: any[] = response?.responseBody?.rows || [];
    const fields: any[] = response?.responseBody?.fieldsMetadata || [];
    const fieldIndex: Record<string, number> = {};
    fields.forEach((f: any, idx: number) => {
      fieldIndex[f.name.toUpperCase()] = idx;
    });

    // 2. Buscar todas as bipagens
    const todasBipagens = await this.conferenciaRepo.listarBipagens(sessao.id);

    // Mapear totais por item e nível
    const mapTotais: Record<string, { n1: number; n2: number; n3: number; esperado: number }> = {};
    for (const r of rows) {
      const nunota = Number(r[fieldIndex['NUNOTA']]);
      const codprod = Number(r[fieldIndex['CODPROD']]);
      const sequencia = Number(r[fieldIndex['SEQUENCIA']]);
      const esperado = Number(r[fieldIndex['QTDNEG']] || 0);

      const key = `${nunota}|${codprod}|${sequencia}`;
      mapTotais[key] = { n1: 0, n2: 0, n3: 0, esperado };
    }

    for (const b of todasBipagens) {
      if (b.anulado) continue;
      const key = `${b.nunota}|${b.codprod}|${b.sequencia}`;
      if (!mapTotais[key]) {
        mapTotais[key] = { n1: 0, n2: 0, n3: 0, esperado: 0 };
      }
      if (b.nivel === 1) mapTotais[key].n1 += b.qtdConferida;
      else if (b.nivel === 2) mapTotais[key].n2 += b.qtdConferida;
      else if (b.nivel === 3) mapTotais[key].n3 += b.qtdConferida;
    }

    const agora = new Date().toISOString();
    let statusFinal: StatusConferenciaEntrada;
    let possuiDivergencias = false;

    if (input.nivel === 1) {
      const n2Param = this.configSistemaRepo
        ? await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel2_ativo')
        : 'true';
      const usarNivel2 = n2Param !== 'false';

      if (!usarNivel2) {
        // FLUXO DE NÍVEL ÚNICO: Compara N1 diretamente com a NF
        for (const item of Object.values(mapTotais)) {
          if (item.n1 !== item.esperado) {
            possuiDivergencias = true;
            break;
          }
        }

        if (possuiDivergencias) {
          statusFinal = 'Divergente';
          sessao.nivelAtual = 3;
          sessao.status = statusFinal;
          sessao.atualizadoEm = agora;
        } else {
          statusFinal = 'Conferido';
          sessao.status = statusFinal;
          sessao.atualizadoEm = agora;
          sessao.finalizadoEm = agora;
        }
      } else {
        // FLUXO EM 2 NÍVEIS (Padrão): Avança para Aguardando N2
        statusFinal = 'Aguardando N2';
        sessao.nivelAtual = 2;
        sessao.status = statusFinal;
        sessao.atualizadoEm = agora;
      }
    } else if (input.nivel === 2) {
      // Comparar N1 x N2 x Esperado
      for (const item of Object.values(mapTotais)) {
        if (item.n1 !== item.esperado || item.n2 !== item.esperado || item.n1 !== item.n2) {
          possuiDivergencias = true;
          break;
        }
      }

      if (possuiDivergencias) {
        statusFinal = 'Divergente';
        sessao.nivelAtual = 3;
        sessao.status = statusFinal;
        sessao.atualizadoEm = agora;
      } else {
        statusFinal = 'Conferido';
        sessao.status = statusFinal;
        sessao.atualizadoEm = agora;
        sessao.finalizadoEm = agora;
      }
    } else {
      // N3 é o nível final de conferência
      statusFinal = 'Conferido';
      sessao.status = statusFinal;
      sessao.atualizadoEm = agora;
      sessao.finalizadoEm = agora;
    }

    await this.conferenciaRepo.salvarSessao(sessao);

    return {
      sessao,
      statusFinal,
      possuiDivergencias,
      totalItens: Object.keys(mapTotais).length,
      totalConferidos: Object.values(mapTotais).filter((i) => i.n1 > 0 || i.n2 > 0).length,
    };
  }
}
