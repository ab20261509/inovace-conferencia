import { Application, Request, Response } from 'express';
import { RequestHandler } from 'express';
import { createAuthRoutes } from './authRoutes.js';
import { createCrudRoutes } from './crudRoutes.js';
import { createApiRoutes } from './apiRoutes.js';
import { createConferenciasRoutes } from './conferenciasRoutes.js';
import { createProdutoRoutes } from './produtoRoutes.js';
import { AuthController } from '../controllers/AuthController.js';
import { CrudController } from '../controllers/CrudController.js';
import { ApiProxyController } from '../controllers/ApiProxyController.js';
import { ConferenciasController } from '../controllers/ConferenciasController.js';
import { ProdutoController } from '../controllers/ProdutoController.js';

export interface RouteControllers {
  authController: AuthController;
  crudController: CrudController;
  apiProxyController: ApiProxyController;
  conferenciasController: ConferenciasController;
  produtoController: ProdutoController;
}

/**
 * Registra todas as rotas na aplicação
 */
export function registerRoutes(app: Application, controllers: RouteControllers, authMiddleware: RequestHandler): void {
  // Rotas públicas
  app.use('/auth', createAuthRoutes(controllers.authController));

  // Imagem de produto (pública — usada por tags <img>)
  app.get('/api/crud/produto/:codProd/imagem', (req, res) => controllers.crudController.produtoImagem(req, res));

  // Rotas protegidas
  app.use('/api/conferencias', authMiddleware, createConferenciasRoutes(controllers.conferenciasController));
  app.use('/api/crud', authMiddleware, createCrudRoutes(controllers.crudController));
  app.use('/api/produtos', authMiddleware, createProdutoRoutes(controllers.produtoController));
  app.use('/api', authMiddleware, createApiRoutes(controllers.apiProxyController));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // 404
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Rota não encontrada',
      path: req.path,
      method: req.method,
    });
  });
}
