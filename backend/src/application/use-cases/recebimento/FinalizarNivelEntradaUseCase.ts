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

export interface ResumoNotaFinalizacao {
  nunota: number;
  numnota: number;
  status: StatusConferenciaEntrada;
  totalItens: number;
  itensConferidosOk: number;
  itensPendentes: number;
  itensComSobra: number;
  itensSemBipagem: number;
  possuiDivergencias: boolean;
}

export interface FinalizarNivelEntradaOutput {
  sessao: SessaoConferenciaEntrada;
  statusFinal: StatusConferenciaEntrada;
  possuiDivergencias: boolean;
  possuiDivergenciasQtd?: boolean;
  possuiDivergenciasLote?: boolean;
  totalItens: number;
  totalConferidos: number;
  resumoPorNota: ResumoNotaFinalizacao[];
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

    if (
      sessao.status === 'Conferido' ||
      sessao.status === 'Enviado ao Sankhya' ||
      (sessao.status === 'Divergente' && sessao.nivelAtual !== 3)
    ) {
      throw new Error(
        `Esta conferência já está finalizada (Status: "${sessao.status}") e não permite nova finalização.`
      );
    }

    const nunotasStr = sessao.nunotas.join(', ');

    // 1. Buscar itens esperados na nota fiscal com NUMNOTA, CONTROLE e datas pré-existentes
    const sql = `
SELECT
    ITE.NUNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    CAB.NUMNOTA,
    ITE.CONTROLE,
    TO_CHAR(EST.DTVAL, 'DD/MM/YYYY') AS DTVAL,
    TO_CHAR(EST.DTFABRICACAO, 'DD/MM/YYYY') AS DTFABRICACAO
FROM TGFITE ITE
INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN TGFEST EST ON EST.CODPROD = ITE.CODPROD 
                    AND EST.CONTROLE = ITE.CONTROLE 
                    AND EST.CODEMP = CAB.CODEMP
                    AND EST.TIPO = 'P'
                    AND EST.CODPARC = 0
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

    const numnotaPorNunota: Record<number, number> = {};

    // 2. Buscar todas as bipagens
    const todasBipagens = await this.conferenciaRepo.listarBipagens(sessao.id);

    // Mapear totais e metadados fiscais pré-existentes por item
    const mapTotais: Record<
      string,
      {
        n1: number;
        n2: number;
        n3: number;
        esperado: number;
        controleOriginal?: string;
        validadeOriginal?: string;
        fabricacaoOriginal?: string;
      }
    > = {};

    for (const r of rows) {
      const nunota = Number(r[fieldIndex['NUNOTA']]);
      const codprod = Number(r[fieldIndex['CODPROD']]);
      const sequencia = Number(r[fieldIndex['SEQUENCIA']]);
      const esperado = Number(r[fieldIndex['QTDNEG']] || 0);
      const numnota = Number(r[fieldIndex['NUMNOTA']] || 0);
      const controleOriginal = r[fieldIndex['CONTROLE']] ? String(r[fieldIndex['CONTROLE']]).trim() : undefined;
      const validadeOriginal = r[fieldIndex['DTVAL']] ? String(r[fieldIndex['DTVAL']]).trim() : undefined;
      const fabricacaoOriginal = r[fieldIndex['DTFABRICACAO']] ? String(r[fieldIndex['DTFABRICACAO']]).trim() : undefined;

      numnotaPorNunota[nunota] = numnota;

      const key = `${nunota}|${codprod}|${sequencia}`;
      mapTotais[key] = {
        n1: 0,
        n2: 0,
        n3: 0,
        esperado,
        controleOriginal,
        validadeOriginal,
        fabricacaoOriginal,
      };
    }

    // Mapa de bipagens por item e nível para checagem de lote/validade
    const bipsPorItemNivel: Record<string, Array<{ lote?: string; validade?: string; fabricacao?: string }>> = {};

    for (const b of todasBipagens) {
      if (b.anulado) continue;
      const key = `${b.nunota}|${b.codprod}|${b.sequencia}`;
      if (!mapTotais[key]) {
        mapTotais[key] = { n1: 0, n2: 0, n3: 0, esperado: 0 };
      }
      if (b.nivel === 1) mapTotais[key].n1 += b.qtdConferida;
      else if (b.nivel === 2) mapTotais[key].n2 += b.qtdConferida;
      else if (b.nivel === 3) mapTotais[key].n3 += b.qtdConferida;

      const keyNivel = `${key}|${b.nivel}`;
      if (!bipsPorItemNivel[keyNivel]) {
        bipsPorItemNivel[keyNivel] = [];
      }
      bipsPorItemNivel[keyNivel].push({
        lote: b.lote?.trim(),
        validade: b.validade?.trim(),
        fabricacao: b.fabricacao?.trim(),
      });
    }

    const normalizarDataBr = (dt?: string): string => {
      if (!dt) return '';
      const mIso = dt.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (mIso) return `${mIso[3]}/${mIso[2]}/${mIso[1]}`;
      const mBr = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (mBr) return `${mBr[1]}/${mBr[2]}/${mBr[3]}`;
      return dt;
    };

    const agora = new Date().toISOString();
    let statusFinal: StatusConferenciaEntrada;
    let possuiDivergencias = false;
    let possuiDivergenciasQtd = false;
    let possuiDivergenciasLote = false;

    const n2Param = this.configSistemaRepo
      ? await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel2_ativo')
      : 'true';
    const usarNivel2 = n2Param !== 'false';

    const statusPorNota: Record<number, StatusConferenciaEntrada> = {};
    const resumoPorNota: ResumoNotaFinalizacao[] = [];

    for (const nunota of sessao.nunotas) {
      let notaDivergenteQtd = false;
      let notaDivergenteLote = false;
      const itensDestaNota = Object.entries(mapTotais).filter(([key]) => key.startsWith(`${nunota}|`));
      const numnota = numnotaPorNunota[nunota] || nunota;

      let itensOk = 0;
      let itensPendentes = 0;
      let itensComSobra = 0;
      let itensSemBipagem = 0;

      for (const [key, item] of itensDestaNota) {
        const conferidoNivel = input.nivel === 1 ? item.n1 : input.nivel === 2 ? item.n2 : item.n3;
        if (conferidoNivel === item.esperado) {
          itensOk++;
        } else if (conferidoNivel > item.esperado) {
          itensComSobra++;
        } else {
          itensPendentes++;
          if (conferidoNivel === 0) {
            itensSemBipagem++;
          }
        }

        // Validação de Lote / Validade / Fabricação Pré-existentes na Nota (quando conferido > 0)
        if (conferidoNivel > 0) {
          const bipsDoNivel = bipsPorItemNivel[`${key}|${input.nivel}`] || [];

          // Se a nota já possuía CONTROLE preenchido
          if (item.controleOriginal) {
            for (const b of bipsDoNivel) {
              if (b.lote && b.lote.toUpperCase() !== item.controleOriginal.toUpperCase()) {
                notaDivergenteLote = true;
                break;
              }
            }
          }

          // Se a nota/estoque já possuía Validade preenchida
          if (item.validadeOriginal) {
            const valOrigNorm = normalizarDataBr(item.validadeOriginal);
            for (const b of bipsDoNivel) {
              if (b.validade && normalizarDataBr(b.validade) !== valOrigNorm) {
                notaDivergenteLote = true;
                break;
              }
            }
          }

          // Se a nota/estoque já possuía Fabricação preenchida
          if (item.fabricacaoOriginal) {
            const fabOrigNorm = normalizarDataBr(item.fabricacaoOriginal);
            for (const b of bipsDoNivel) {
              if (b.fabricacao && normalizarDataBr(b.fabricacao) !== fabOrigNorm) {
                notaDivergenteLote = true;
                break;
              }
            }
          }
        }
      }

      if (input.nivel === 1) {
        if (!usarNivel2) {
          // FLUXO DE NÍVEL ÚNICO: Compara N1 diretamente com a NF
          for (const [, item] of itensDestaNota) {
            if (item.n1 !== item.esperado) {
              notaDivergenteQtd = true;
              break;
            }
          }
          statusPorNota[nunota] = (notaDivergenteQtd || notaDivergenteLote) ? 'Divergente' : 'Conferido';
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
              notaDivergenteQtd = true;
              break;
            }
          }
        } else {
          // FLUXO COM N1 INATIVADO: N2 é a contagem única direta comparada com a NF
          for (const [, item] of itensDestaNota) {
            if (item.n2 !== item.esperado) {
              notaDivergenteQtd = true;
              break;
            }
          }
        }
        statusPorNota[nunota] = (notaDivergenteQtd || notaDivergenteLote) ? 'Divergente' : 'Conferido';
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
            notaDivergenteQtd = true;
            break;
          }
        }
        statusPorNota[nunota] = (notaDivergenteQtd || notaDivergenteLote) ? 'Divergente' : 'Conferido';
      }

      const notaDivergente = notaDivergenteQtd || notaDivergenteLote;
      if (notaDivergenteQtd) {
        possuiDivergenciasQtd = true;
      }
      if (notaDivergenteLote) {
        possuiDivergenciasLote = true;
      }
      if (notaDivergente) {
        possuiDivergencias = true;
      }

      resumoPorNota.push({
        nunota,
        numnota,
        status: statusPorNota[nunota],
        totalItens: itensDestaNota.length,
        itensConferidosOk: itensOk,
        itensPendentes,
        itensComSobra,
        itensSemBipagem,
        possuiDivergencias: notaDivergente,
      });
    }

    sessao.statusPorNota = statusPorNota;
    sessao.statusPorNotaJson = JSON.stringify(statusPorNota);

    if (input.nivel === 1 && usarNivel2) {
      statusFinal = 'Aguardando N2';
      sessao.nivelAtual = 2;
      sessao.status = statusFinal;
      sessao.atualizadoEm = agora;
    } else if (possuiDivergenciasQtd) {
      // Divergência de quantidade (falta, sobra ou contagens desencontradas) -> Fica retida como Divergente no nível atual (ex: 2)
      // aguardando parecer ou solicitação manual de reconferência N3 pelo gestor na Gestão de Recebimento.
      statusFinal = 'Divergente';
      sessao.nivelAtual = input.nivel; // Mantém no nível conferido (ex: 2). NÃO avança para N3 automaticamente!
      sessao.status = statusFinal;
      sessao.atualizadoEm = agora;
      sessao.finalizadoEm = agora;
    } else if (possuiDivergenciasLote) {
      // Quantidade 100% conferida e bate com a NF, mas lote/validade divergem do XML/cadastro da nota.
      // NÃO vai para reconferência física N3 no coletor!
      // Fica com status 'Divergente' aguardando liberação do gestor na Gerência de Recebimento.
      statusFinal = 'Divergente';
      sessao.nivelAtual = input.nivel; // Mantém no nível conferido (ex: 2)
      sessao.status = statusFinal;
      sessao.atualizadoEm = agora;
      sessao.finalizadoEm = agora;
    } else {
      statusFinal = 'Conferido';
      sessao.status = statusFinal;
      sessao.atualizadoEm = agora;
      sessao.finalizadoEm = agora;
    }

    // Limpa a recontagem parcial ao finalizar o nível
    sessao.itensRecontagem = undefined;
    sessao.itensRecontagemJson = undefined;

    await this.conferenciaRepo.salvarSessao(sessao);

    return {
      sessao,
      statusFinal,
      possuiDivergencias,
      possuiDivergenciasQtd,
      possuiDivergenciasLote,
      totalItens: Object.keys(mapTotais).length,
      totalConferidos: Object.values(mapTotais).filter((i) => i.n1 > 0 || i.n2 > 0 || i.n3 > 0).length,
      resumoPorNota,
    };
  }
}
