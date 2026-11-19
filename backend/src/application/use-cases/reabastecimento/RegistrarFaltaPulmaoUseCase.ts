import { TarefaReabastecimento } from '../../../domain/entities/Reabastecimento.js';
import { IReabastecimentoRepository } from '../../../domain/ports/IReabastecimentoRepository.js';

export interface RegistrarFaltaPulmaoInput {
  tarefaId: string;
  usuario: string;
  motivo?: string;
}

export class RegistrarFaltaPulmaoUseCase {
  constructor(private readonly reabastecimentoRepo: IReabastecimentoRepository) {}

  async execute(input: RegistrarFaltaPulmaoInput): Promise<{
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
      throw new Error('Esta tarefa já foi concluída anteriormente.');
    }
    if (tarefa.status === 'CANCELADO') {
      throw new Error('Esta tarefa foi cancelada.');
    }
    if (tarefa.status === 'FALTA_CONFIRMADA') {
      throw new Error('Esta falta já foi confirmada e cortada definitivamente.');
    }

    const agora = new Date().toISOString();
    const obsFalta = `⚠️ Produto não encontrado no estoque físico/pulmão por ${usuario} em ${new Date().toLocaleTimeString('pt-BR')}${
      motivo ? ` - Motivo: ${motivo}` : ''
    }`;

    const novaObs = tarefa.observacao ? `${tarefa.observacao} | ${obsFalta}` : obsFalta;

    await this.reabastecimentoRepo.atualizar(tarefaId, {
      status: 'FALTA_PULMAO',
      observacao: novaObs,
    });

    const tarefaAtualizada = await this.reabastecimentoRepo.buscarPorId(tarefaId);

    return {
      sucesso: true,
      mensagem: `Falta de estoque físico registrada para o produto ${tarefa.codprod} no pulmão. Tarefa enviada para a aba de Faltas de Pulmão.`,
      tarefa: tarefaAtualizada!,
    };
  }
}
