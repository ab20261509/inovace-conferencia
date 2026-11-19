import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import { IReabastecimentoRepository } from '../../../domain/ports/IReabastecimentoRepository.js';
import { TarefaReabastecimento } from '../../../domain/entities/Reabastecimento.js';
import { SincronizarItensSeparacaoUseCase } from './SincronizarItensSeparacaoUseCase.js';

export interface FinalizarSeparacaoInput {
  separacaoId: string;
  usuario: string;
  permitirParcial?: boolean;
  justificativa?: string;
}

export class FinalizarSeparacaoUseCase {
  constructor(
    private readonly separacaoRepo: ISeparacaoRepository,
    private readonly sincronizarUseCase: SincronizarItensSeparacaoUseCase,
    private readonly gateway?: IGatewayPort,
    private readonly reabastecimentoRepo?: IReabastecimentoRepository,
  ) {}

  async execute(input: FinalizarSeparacaoInput, correlationId?: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const { separacaoId, usuario, permitirParcial, justificativa } = input;

    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }
    if (separacao.status === 'FINALIZADA') {
      throw new Error(`Esta separação já foi finalizada em ${separacao.finalizadoEm}.`);
    }

    // 1. Re-sincronizar obrigatoriamente com o Sankhya antes de finalizar
    const syncRes = await this.sincronizarUseCase.execute(separacaoId, correlationId);
    if (syncRes.temAlteracoes) {
      const exigemAcao = syncRes.alteracoes.filter((a) => a.exigeAcaoFisica);
      if (exigemAcao.length > 0) {
        throw new Error(
          `Foram detectadas alterações críticas no ERP que exigem devolução física de produtos já bipados: ${exigemAcao.map((a) => a.mensagem).join(' | ')}`
        );
      }
    }

    // 2. Verificar itens pendentes
    const itens = await this.separacaoRepo.listarItens(separacaoId);
    const pendentes = itens.filter(
      (i) =>
        i.statusItem !== 'SEPARADO' &&
        i.statusItem !== 'REMOVIDO_ERP' &&
        i.statusItem !== 'CORTADO_DEFINITIVO'
    );

    if (pendentes.length > 0 && !permitirParcial) {
      throw new Error(
        `Ainda existem ${pendentes.length} item(ns) pendente(s) de separação nesta carga. Finalização bloqueada.`
      );
    }

    // 3. Atualizar status para FINALIZADA
    const agora = new Date().toISOString();
    await this.separacaoRepo.atualizarSeparacao(separacaoId, {
      status: 'FINALIZADA',
      finalizadoEm: agora,
      observacoes: justificativa || (pendentes.length > 0 ? `Finalizada com ${pendentes.length} pendências/faltas registradas por ${usuario}` : null),
    });

    // 4. Gerar tarefas de reabastecimento automáticas na fila do empilhadeirista para itens com falta
    if (this.reabastecimentoRepo && pendentes.length > 0) {
      try {
        const mapaFaltas = new Map<number, {
          item: typeof pendentes[0];
          qtdFaltaTotal: number;
        }>();

        for (const p of pendentes) {
          const falta = p.qtdFalta && p.qtdFalta > 0 ? p.qtdFalta : Math.max(0, p.qtdEsperada - p.qtdSeparada);
          if (falta > 0) {
            const existente = mapaFaltas.get(p.codprod);
            if (existente) {
              existente.qtdFaltaTotal += falta;
            } else {
              mapaFaltas.set(p.codprod, { item: p, qtdFaltaTotal: falta });
            }
          }
        }

        const tarefasParaCriar: TarefaReabastecimento[] = [];
        for (const [codprod, dados] of mapaFaltas.entries()) {
          const it = dados.item;
          const temPulmao = Boolean(it.codendPulmao || it.enderecoPulmao);
          tarefasParaCriar.push({
            id: randomUUID(),
            separacaoId: separacao.id,
            ordemCarga: separacao.ordemCarga,
            codemp: separacao.codemp || null,
            nomeEmpresa: separacao.nomeEmpresa || null,
            codprod,
            descrprod: it.descrprod || null,
            referencia: it.referencia || null,
            codbarra: it.codbarra?.split(',')[0]?.trim() || null,
            codendPulmao: it.codendPulmao || null,
            enderecoPulmao: it.enderecoPulmao || null,
            descrendPulmao: it.descrendPulmao || null,
            codendPicking: it.codend || null,
            enderecoPicking: it.endereco || null,
            descrendPicking: it.descrend || null,
            quantidadeSolicitada: dados.qtdFaltaTotal,
            quantidadeAtendida: 0,
            status: temPulmao ? 'PENDENTE' : 'VERIFICAR_ESTOQUE',
            observacao: temPulmao
              ? `Reabastecer do pulmão ${it.enderecoPulmao} para o picking ${it.endereco || 'Padrão'}`
              : 'Produto sem endereço de pulmão fixo. Verificar estoque geral no armazém.',
            solicitadoEm: agora,
            solicitadoPor: usuario,
          });
        }

        if (tarefasParaCriar.length > 0) {
          await this.reabastecimentoRepo.criarTarefasEmLote(tarefasParaCriar);
          console.log(`[Reabastecimento] ${tarefasParaCriar.length} tarefa(s) gerada(s) automaticamente para a carga ${separacao.ordemCarga}.`);
        }
      } catch (err: any) {
        console.warn(`[Reabastecimento] Aviso ao gerar tarefas automáticas de reabastecimento: ${err.message}`);
      }
    }

    // 5. Atualizar status na TGFORD no Sankhya ERP para 'F' (Finalizada)
    if (this.gateway) {
      await this.atualizarStatusCargaSankhya(separacao.ordemCarga, 'F', correlationId);
    }

    return {
      sucesso: true,
      mensagem: `Separação da Carga ${separacao.ordemCarga} finalizada com sucesso!`,
    };
  }

  private async atualizarStatusCargaSankhya(
    ordemCarga: number,
    status: 'P' | 'E' | 'F',
    correlationId?: string,
  ): Promise<void> {
    if (!this.gateway) return;
    try {
      const resCarga = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        {
          serviceName: 'DbExplorerSP.executeQuery',
          requestBody: { sql: `SELECT DISTINCT CODEMP FROM TGFORD WHERE ORDEMCARGA = ${Number(ordemCarga)}` },
        },
        correlationId,
      );

      const rows: any[] = resCarga?.responseBody?.rows || [];
      for (const row of rows) {
        const codemp = row[0];
        if (codemp != null) {
          await this.gateway.serviceCall(
            'CRUDServiceProvider.saveRecord',
            {
              serviceName: 'CRUDServiceProvider.saveRecord',
              requestBody: {
                dataSet: {
                  rootEntity: 'OrdemCarga',
                  includePresentationFields: 'N',
                  dataRow: {
                    localFields: {
                      CODEMP: { $: String(codemp) },
                      ORDEMCARGA: { $: String(ordemCarga) },
                      AD_STATUSSEP: { $: status },
                    },
                    key: {
                      CODEMP: { $: String(codemp) },
                      ORDEMCARGA: { $: String(ordemCarga) },
                    },
                  },
                  entity: {
                    fieldset: {
                      list: 'CODEMP,ORDEMCARGA,AD_STATUSSEP',
                    },
                  },
                },
              },
            },
            correlationId,
          );
        }
      }
      console.log(`[Separação] Status da Ordem de Carga ${ordemCarga} atualizado para AD_STATUSSEP = '${status}' no Sankhya.`);
    } catch (err: any) {
      console.warn(`[Separação] Aviso ao atualizar AD_STATUSSEP na TGFORD da carga ${ordemCarga}: ${err.message}`);
    }
  }
}
