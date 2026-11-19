import { TarefaReabastecimento } from '../../../domain/entities/Reabastecimento.js';
import { IReabastecimentoRepository } from '../../../domain/ports/IReabastecimentoRepository.js';

export interface CancelarTarefaReabastecimentoInput {
  tarefaId: string;
  usuario: string;
  motivo?: string;
}

export class CancelarTarefaReabastecimentoUseCase {
  constructor(private readonly reabastecimentoRepo: IReabastecimentoRepository) {}

  async execute(input: CancelarTarefaReabastecimentoInput): Promise<{
    sucesso: boolean;
    mensagem: string;
    tarefa: TarefaReabastecimento;
  }> {
    const { tarefaId, usuario, motivo } = input;

    const tarefa = await this.reabastecimentoRepo.buscarPorId(tarefaId);
    if (!tarefa) {
      throw new Error(`Tarefa de reabastecimento '${tarefaId}' não encontrada.`);
    }

    if (tarefa.status === 'CONCLUIDO') {
      throw new Error(`Esta tarefa já foi concluída e não pode ser cancelada.`);
    }

    if (tarefa.status === 'CANCELADO') {
      throw new Error(`Esta tarefa já se encontra cancelada.`);
    }

    const agora = new Date().toISOString();
    const obsCancelamento = motivo
      ? `Cancelado por ${usuario}: ${motivo}`
      : `Cancelado pelo operador ${usuario}`;

    await this.reabastecimentoRepo.atualizar(tarefaId, {
      status: 'CANCELADO',
      concluidoEm: agora,
      concluidoPor: usuario,
      observacao: tarefa.observacao ? `${tarefa.observacao} | ${obsCancelamento}` : obsCancelamento,
    });

    const tarefaAtualizada = await this.reabastecimentoRepo.buscarPorId(tarefaId);

    return {
      sucesso: true,
      mensagem: `Tarefa de reabastecimento do produto ${tarefa.codprod} cancelada com sucesso.`,
      tarefa: tarefaAtualizada!,
    };
  }
}
