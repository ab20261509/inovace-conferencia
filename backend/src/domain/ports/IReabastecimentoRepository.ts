import { TarefaReabastecimento, StatusReabastecimento } from '../entities/Reabastecimento.js';

export interface FiltrosReabastecimento {
  status?: StatusReabastecimento;
  ordemCarga?: number;
  codprod?: number;
}

export interface IReabastecimentoRepository {
  criarTarefa(tarefa: TarefaReabastecimento): Promise<void>;
  criarTarefasEmLote(tarefas: TarefaReabastecimento[]): Promise<void>;
  buscarPorId(id: string): Promise<TarefaReabastecimento | null>;
  listar(filtros?: FiltrosReabastecimento): Promise<TarefaReabastecimento[]>;
  atualizar(id: string, dados: Partial<TarefaReabastecimento>): Promise<void>;
}
