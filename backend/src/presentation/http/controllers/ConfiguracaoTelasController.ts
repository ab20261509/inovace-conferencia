import { Request, Response } from 'express';
import { ListarConfiguracaoTelasUseCase } from '../../../application/use-cases/configuracoes/ListarConfiguracaoTelasUseCase.js';
import { SalvarConfiguracaoTelaUseCase } from '../../../application/use-cases/configuracoes/SalvarConfiguracaoTelaUseCase.js';

export class ConfiguracaoTelasController {
  constructor(
    private readonly listarConfiguracaoTelasUseCase: ListarConfiguracaoTelasUseCase,
    private readonly salvarConfiguracaoTelaUseCase: SalvarConfiguracaoTelaUseCase,
  ) {}

  /**
   * GET /api/configuracoes/telas
   * Retorna o catálogo de telas do sistema e a configuração de campos sensíveis
   */
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const codUsuSolicitante = Number(req.userId || (req as any).user?.userId || 0);
      const nomeUsuSolicitante = String(req.username || (req as any).user?.username || '').trim();

      const result = await this.listarConfiguracaoTelasUseCase.execute({
        codUsuSolicitante,
        nomeUsuSolicitante,
      });

      res.status(200).json(result);
    } catch (err: any) {
      console.error('❌ Erro em /api/configuracoes/telas:', err);
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao listar telas' });
    }
  }

  /**
   * PUT /api/configuracoes/telas/:idTela
   * Atualiza quais campos são considerados sensíveis em uma tela específica
   */
  async salvar(req: Request, res: Response): Promise<void> {
    try {
      const codUsuSolicitante = Number(req.userId || (req as any).user?.userId || 0);
      const nomeUsuSolicitante = String(req.username || (req as any).user?.username || '').trim();
      const idTela = String(req.params.idTela || '').trim();
      const { campos } = req.body;

      await this.salvarConfiguracaoTelaUseCase.execute({
        codUsuSolicitante,
        nomeUsuSolicitante,
        idTela,
        campos,
      });

      res.status(200).json({ success: true, idTela, campos });
    } catch (err: any) {
      console.error('❌ Erro em /api/configuracoes/telas/:idTela:', err);
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao salvar configuração de tela' });
    }
  }
}
