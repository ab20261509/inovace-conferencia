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

    const n2Param = this.configSistemaRepo
      ? await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel2_ativo')
      : 'true';
    const usarNivel2 = n2Param !== 'false';

    const statusPorNota: Record<number, StatusConferenciaEntrada> = {};

    for (const nunota of sessao.nunotas) {
      let notaDivergente = false;
      const itensDestaNota = Object.entries(mapTotais).filter(([key]) => key.startsWith(`${nunota}|`));

      if (input.nivel === 1) {
        if (!usarNivel2) {
          // FLUXO DE NÍVEL ÚNICO: Compara N1 diretamente com a NF
          for (const [, item] of itensDestaNota) {
            if (item.n1 !== item.esperado) {
              notaDivergente = true;
              break;
            }
          }
          statusPorNota[nunota] = notaDivergente ? 'Divergente' : 'Conferido';
        } else {
          // FLUXO EM 2 NÍVEIS (Padrão): Avança para Aguardando N2
          statusPorNota[nunota] = 'Aguardando N2';
        }
      } else if (input.nivel === 2) {
        const houveN1 = todasBipagens.some((b) => !b.anulado && b.nivel === 1 && b.nunota === nunota);
        if (houveN1) {
          // Comparar N1 x N2 x Esperado
          for (const [, item] of itensDestaNota) {
            if (item.n1 !== item.esperado || item.n2 !== item.esperado || item.n1 !== item.n2) {
              notaDivergente = true;
              break;
            }
          }
        } else {
          // FLUXO COM N1 INATIVADO: N2 é a contagem única direta comparada com a NF
          for (const [, item] of itensDestaNota) {
            if (item.n2 !== item.esperado) {
              notaDivergente = true;
              break;
            }
          }
        }
        statusPorNota[nunota] = notaDivergente ? 'Divergente' : 'Conferido';
      } else {
        // N3 é o nível final de conferência de desempate
        const houveN1 = todasBipagens.some((b) => !b.anulado && b.nivel === 1 && b.nunota === nunota);
        const houveN2 = todasBipagens.some((b) => !b.anulado && b.nivel === 2 && b.nunota === nunota);
        for (const [, item] of itensDestaNota) {
          let eraDivergente = false;
          if (houveN1 && houveN2) {
            eraDivergente = item.n1 !== item.esperado || item.n2 !== item.esperado || item.n1 !== item.n2;
          } else if (houveN2) {
            eraDivergente = item.n2 !== item.esperado;
          } else {
            eraDivergente = item.n1 !== item.esperado;
          }

          if (eraDivergente && item.n3 !== item.esperado) {
            notaDivergente = true;
            break;
          }
        }
        statusPorNota[nunota] = notaDivergente ? 'Divergente' : 'Conferido';
      }

      if (notaDivergente) {
        possuiDivergencias = true;
      }
    }

    sessao.statusPorNota = statusPorNota;
    sessao.statusPorNotaJson = JSON.stringify(statusPorNota);

    if (possuiDivergencias) {
      statusFinal = 'Divergente';
      sessao.nivelAtual = 3;
      sessao.status = statusFinal;
      sessao.atualizadoEm = agora;
    } else {
      if (input.nivel === 1 && usarNivel2) {
        statusFinal = 'Aguardando N2';
        sessao.nivelAtual = 2;
        sessao.status = statusFinal;
        sessao.atualizadoEm = agora;
      } else {
        statusFinal = 'Conferido';
        sessao.status = statusFinal;
        sessao.atualizadoEm = agora;
        sessao.finalizadoEm = agora;
      }
    }

    await this.conferenciaRepo.salvarSessao(sessao);

    return {
      sessao,
      statusFinal,
      possuiDivergencias,
      totalItens: Object.keys(mapTotais).length,
      totalConferidos: Object.values(mapTotais).filter((i) => i.n1 > 0 || i.n2 > 0 || i.n3 > 0).length,
    };
  }
}
