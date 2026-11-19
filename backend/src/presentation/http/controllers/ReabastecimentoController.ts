import { Request, Response } from 'express';
import { ListarTarefasReabastecimentoUseCase } from '../../../application/use-cases/reabastecimento/ListarTarefasReabastecimentoUseCase.js';
import { ConcluirTarefaReabastecimentoUseCase } from '../../../application/use-cases/reabastecimento/ConcluirTarefaReabastecimentoUseCase.js';
import { CancelarTarefaReabastecimentoUseCase } from '../../../application/use-cases/reabastecimento/CancelarTarefaReabastecimentoUseCase.js';
import { RegistrarFaltaPulmaoUseCase } from '../../../application/use-cases/reabastecimento/RegistrarFaltaPulmaoUseCase.js';
import { FinalizarFaltaPulmaoUseCase } from '../../../application/use-cases/reabastecimento/FinalizarFaltaPulmaoUseCase.js';
import { StatusReabastecimento } from '../../../domain/entities/Reabastecimento.js';

export class ReabastecimentoController {
  constructor(
    private readonly listarTarefasUseCase: ListarTarefasReabastecimentoUseCase,
    private readonly concluirTarefaUseCase: ConcluirTarefaReabastecimentoUseCase,
    private readonly cancelarTarefaUseCase?: CancelarTarefaReabastecimentoUseCase,
    private readonly registrarFaltaUseCase?: RegistrarFaltaPulmaoUseCase,
    private readonly finalizarFaltaUseCase?: FinalizarFaltaPulmaoUseCase,
  ) {}

  /**
   * GET /api/reabastecimento
   * Lista tarefas de reabastecimento de picking
   */
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const { status, ordemCarga, codprod } = req.query;

      const resultado = await this.listarTarefasUseCase.execute(
        {
          status: status ? (String(status) as StatusReabastecimento) : undefined,
          ordemCarga: ordemCarga ? Number(ordemCarga) : undefined,
          codprod: codprod ? Number(codprod) : undefined,
        },
        (req as any).correlationId,
      );

      res.status(200).json(resultado);
    } catch (err: any) {
      console.error('[ReabastecimentoController.listar] Erro:', err);
      res.status(500).json({ error: err.message || 'Erro ao listar tarefas de reabastecimento.' });
    }
  }

  /**
   * POST /api/reabastecimento/:id/concluir
   * Conclui uma tarefa de reabastecimento informando o abastecimento físico no picking
   */
  async concluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidadeAtendida, observacao } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.username || 'Empilhadeirista';

      const resultado = await this.concluirTarefaUseCase.execute({
        tarefaId: id,
        usuario,
        quantidadeAtendida: quantidadeAtendida != null ? Number(quantidadeAtendida) : undefined,
        observacao,
      });

      res.status(200).json(resultado);
    } catch (err: any) {
      console.error('[ReabastecimentoController.concluir] Erro:', err);
      res.status(400).json({ error: err.message || 'Erro ao concluir tarefa de reabastecimento.' });
    }
  }

  /**
   * POST /api/reabastecimento/:id/cancelar
   * Cancela ou recusa uma tarefa de reabastecimento
   */
  async cancelar(req: Request, res: Response): Promise<void> {
    try {
      if (!this.cancelarTarefaUseCase) {
        res.status(501).json({ error: 'Caso de uso de cancelamento não configurado.' });
        return;
      }

      const { id } = req.params;
      const { motivo } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.username || 'Empilhadeirista';

      const resultado = await this.cancelarTarefaUseCase.execute({
        tarefaId: id,
        usuario,
        motivo,
      });

      res.status(200).json(resultado);
    } catch (err: any) {
      console.error('[ReabastecimentoController.cancelar] Erro:', err);
      res.status(400).json({ error: err.message || 'Erro ao cancelar tarefa de reabastecimento.' });
    }
  }

  /**
   * POST /api/reabastecimento/:id/falta
   * Registra que o produto não foi encontrado fisicamente no pulmão/estoque (cria ocorrência de falta de pulmão)
   */
  async registrarFalta(req: Request, res: Response): Promise<void> {
    try {
      if (!this.registrarFaltaUseCase) {
        res.status(501).json({ error: 'Caso de uso de registro de falta no pulmão não configurado.' });
        return;
      }

      const { id } = req.params;
      const { motivo } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.username || (req as any).username || 'Empilhadeirista';

      const resultado = await this.registrarFaltaUseCase.execute({
        tarefaId: id,
        usuario,
        motivo: motivo ? String(motivo) : undefined,
      });

      res.status(200).json(resultado);
    } catch (err: any) {
      console.error('[ReabastecimentoController.registrarFalta] Erro:', err);
      res.status(400).json({ error: err.message || 'Erro ao registrar falta no pulmão.' });
    }
  }

  /**
   * POST /api/reabastecimento/:id/finalizar-falta
   * Finaliza uma ocorrência de falta de estoque no pulmão (confirmação de corte definitivo)
   */
  async finalizarFalta(req: Request, res: Response): Promise<void> {
    try {
      if (!this.finalizarFaltaUseCase) {
        res.status(501).json({ error: 'Caso de uso de finalização de falta no pulmão não configurado.' });
        return;
      }

      const { id } = req.params;
      const { acao, observacao } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.username || (req as any).username || 'Supervisor';

      const resultado = await this.finalizarFaltaUseCase.execute({
        tarefaId: id,
        usuario,
        acao: acao || 'CORTAR',
        observacao: observacao ? String(observacao) : undefined,
      });

      res.status(200).json(resultado);
    } catch (err: any) {
      console.error('[ReabastecimentoController.finalizarFalta] Erro:', err);
      res.status(400).json({ error: err.message || 'Erro ao finalizar falta no pulmão.' });
    }
  }
}
