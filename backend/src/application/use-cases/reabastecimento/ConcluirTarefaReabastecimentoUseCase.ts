import { TarefaReabastecimento } from '../../../domain/entities/Reabastecimento.js';
import { IReabastecimentoRepository } from '../../../domain/ports/IReabastecimentoRepository.js';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';

export interface ConcluirTarefaReabastecimentoInput {
  tarefaId: string;
  usuario: string;
  quantidadeAtendida?: number;
  observacao?: string;
}

export class ConcluirTarefaReabastecimentoUseCase {
  constructor(
    private readonly reabastecimentoRepo: IReabastecimentoRepository,
    private readonly separacaoRepo?: ISeparacaoRepository,
  ) {}

  async execute(input: ConcluirTarefaReabastecimentoInput): Promise<{
    sucesso: boolean;
    mensagem: string;
    tarefa: TarefaReabastecimento;
  }> {
    const { tarefaId, usuario, quantidadeAtendida, observacao } = input;

    const tarefa = await this.reabastecimentoRepo.buscarPorId(tarefaId);
    if (!tarefa) {
      throw new Error(`Tarefa de reabastecimento '${tarefaId}' não encontrada.`);
    }

    if (tarefa.status === 'CONCLUIDO') {
      throw new Error(`Esta tarefa já foi concluída em ${tarefa.concluidoEm} por ${tarefa.concluidoPor}.`);
    }

    const agora = new Date().toISOString();
    const qtdFinal = quantidadeAtendida != null && quantidadeAtendida > 0 ? quantidadeAtendida : tarefa.quantidadeSolicitada;

    const obsFinal = observacao || (
      tarefa.status === 'FALTA_PULMAO'
        ? `${tarefa.observacao ? `${tarefa.observacao} | ` : ''}✓ Produto localizado e abastecido no picking por ${usuario} em ${new Date().toLocaleTimeString('pt-BR')}`
        : tarefa.observacao
    );

    await this.reabastecimentoRepo.atualizar(tarefaId, {
      status: 'CONCLUIDO',
      quantidadeAtendida: qtdFinal,
      concluidoEm: agora,
      concluidoPor: usuario,
      observacao: obsFinal,
    });

    // Se estiver associada a uma separação, atualizar os itens e o status da carga
    if (this.separacaoRepo && (tarefa.separacaoId || tarefa.ordemCarga)) {
      try {
        let separacao = tarefa.separacaoId ? await this.separacaoRepo.buscarPorId(tarefa.separacaoId) : null;
        if (!separacao && tarefa.ordemCarga) {
          separacao = await this.separacaoRepo.buscarPorOrdemCarga(tarefa.ordemCarga);
        }

        if (separacao && separacao.status !== 'FINALIZADA') {
          const itens = await this.separacaoRepo.listarItens(separacao.id);
          const itensProd = itens.filter(
            (i) => i.codprod === tarefa.codprod && i.statusItem !== 'SEPARADO' && i.statusItem !== 'REMOVIDO_ERP' && i.statusItem !== 'CORTADO_DEFINITIVO'
          );

          for (const item of itensProd) {
            await this.separacaoRepo.atualizarItem(item.id, {
              statusItem: 'REABASTECIDO',
              motivoFalta: null,
              atualizadoEm: agora,
            });
          }

          // Checar se todas as tarefas da carga foram resolvidas
          const todasTarefas = await this.reabastecimentoRepo.listar({ ordemCarga: separacao.ordemCarga });
          const tarefasPendentes = todasTarefas.filter((t) =>
            ['PENDENTE', 'VERIFICAR_ESTOQUE', 'EM_ANDAMENTO', 'FALTA_PULMAO'].includes(t.status)
          );

          if (tarefasPendentes.length === 0) {
            await this.separacaoRepo.atualizarSeparacao(separacao.id, {
              status: 'REABASTECIDO',
              observacoes: `Picking reabastecido pela empilhadeira em ${new Date().toLocaleTimeString('pt-BR')}. Pronto para finalizar separação.`,
            });
          }
        }
      } catch (err: any) {
        console.warn(`[ConcluirReabastecimento] Aviso ao sincronizar com separação: ${err.message}`);
      }
    }

    const tarefaAtualizada = await this.reabastecimentoRepo.buscarPorId(tarefaId);

    return {
      sucesso: true,
      mensagem: `Reabastecimento de ${qtdFinal} UN do produto ${tarefa.codprod} confirmado no Picking com sucesso!`,
      tarefa: tarefaAtualizada!,
    };
  }
}
