import { Request, Response } from 'express';
import { ObterMeusAcessosUseCase } from '../../../application/use-cases/acessos/ObterMeusAcessosUseCase.js';
import { ListarUsuariosAcessosUseCase } from '../../../application/use-cases/acessos/ListarUsuariosAcessosUseCase.js';
import { SalvarAcessosUsuarioUseCase } from '../../../application/use-cases/acessos/SalvarAcessosUsuarioUseCase.js';

export class AcessosController {
  constructor(
    private readonly obterMeusAcessosUseCase: ObterMeusAcessosUseCase,
    private readonly listarUsuariosAcessosUseCase: ListarUsuariosAcessosUseCase,
    private readonly salvarAcessosUsuarioUseCase: SalvarAcessosUsuarioUseCase,
  ) {}

  /**
   * GET /api/acessos/me
   * Retorna os módulos e privilégios do usuário atualmente logado
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const codUsu = Number(req.userId || (req as any).user?.userId || 0);
      const nomeUsu = String(req.username || (req as any).user?.username || '').trim();

      const result = await this.obterMeusAcessosUseCase.execute({ codUsu, nomeUsu });
      res.status(200).json(result);
    } catch (err: any) {
      console.error('❌ Erro em /api/acessos/me:', err);
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao obter acessos' });
    }
  }

  /**
   * GET /api/acessos/usuarios
   * Lista todos os usuários do Sankhya com suas permissões ativas
   */
  async listarUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const codUsuSolicitante = Number(req.userId || (req as any).user?.userId || 0);
      const nomeUsuSolicitante = String(req.username || (req as any).user?.username || '').trim();

      const result = await this.listarUsuariosAcessosUseCase.execute(
        { codUsuSolicitante, nomeUsuSolicitante },
        req.correlationId,
      );
      res.status(200).json(result);
    } catch (err: any) {
      console.error('❌ Erro em /api/acessos/usuarios:', err);
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao listar usuários' });
    }
  }

  /**
   * PUT /api/acessos/usuarios/:codUsu
   * Atualiza as permissões de um usuário específico
   */
  async salvarAcessos(req: Request, res: Response): Promise<void> {
    try {
      const codUsuSolicitante = Number(req.userId || (req as any).user?.userId || 0);
      const nomeUsuSolicitante = String(req.username || (req as any).user?.username || '').trim();

      const codUsuAlvo = Number(req.params.codUsu);
      const { nomeUsu, modulos } = req.body;

      const result = await this.salvarAcessosUsuarioUseCase.execute({
        codUsuSolicitante,
        nomeUsuSolicitante,
        codUsuAlvo,
        nomeUsuAlvo: String(nomeUsu || '').trim(),
        modulos,
      });

      res.status(200).json(result);
    } catch (err: any) {
      console.error('❌ Erro em /api/acessos/usuarios/:codUsu:', err);
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao salvar acessos' });
    }
  }
}
