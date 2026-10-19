import { Application, Request, Response } from 'express';
import { RequestHandler } from 'express';
import { createAuthRoutes } from './authRoutes.js';
import { createCrudRoutes } from './crudRoutes.js';
import { createApiRoutes } from './apiRoutes.js';
import { createConferenciasRoutes } from './conferenciasRoutes.js';
import { createProdutoRoutes } from './produtoRoutes.js';
import { createAcessosRoutes } from './acessosRoutes.js';
import { createConfiguracaoTelasRoutes } from './configuracaoTelasRoutes.js';
import { createConfiguracaoSistemaRoutes } from './configuracaoSistemaRoutes.js';
import { createConferenciaEntradaRoutes } from './conferenciaEntradaRoutes.js';
import { createDatabaseRoutes } from './databaseRoutes.js';
import { AuthController } from '../controllers/AuthController.js';
import { CrudController } from '../controllers/CrudController.js';
import { ApiProxyController } from '../controllers/ApiProxyController.js';
import { ConferenciasController } from '../controllers/ConferenciasController.js';
import { ProdutoController } from '../controllers/ProdutoController.js';
import { AcessosController } from '../controllers/AcessosController.js';
import { ConfiguracaoTelasController } from '../controllers/ConfiguracaoTelasController.js';
import { ConfiguracaoSistemaController } from '../controllers/ConfiguracaoSistemaController.js';
import { ConferenciaEntradaController } from '../controllers/ConferenciaEntradaController.js';
import { DatabaseExplorerController } from '../controllers/DatabaseExplorerController.js';
import { OcorrenciasRecebimentoController } from '../controllers/OcorrenciasRecebimentoController.js';

export interface RouteControllers {
  authController: AuthController;
  crudController: CrudController;
  apiProxyController: ApiProxyController;
  conferenciasController: ConferenciasController;
  produtoController: ProdutoController;
  acessosController: AcessosController;
  configuracaoTelasController: ConfiguracaoTelasController;
  configuracaoSistemaController: ConfiguracaoSistemaController;
  conferenciaEntradaController: ConferenciaEntradaController;
  databaseExplorerController: DatabaseExplorerController;
  ocorrenciasRecebimentoController: OcorrenciasRecebimentoController;
}

import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { createPermissionMiddleware } from '../middlewares/permissionMiddleware.js';

/**
 * Registra todas as rotas na aplicação
 */
export function registerRoutes(
  app: Application,
  controllers: RouteControllers,
  authMiddleware: RequestHandler,
  permissoesRepo: IPermissoesRepository
): void {
  // Rotas públicas
  app.use('/auth', createAuthRoutes(controllers.authController));

  // Imagem de produto (pública — usada por tags <img>)
  app.get('/api/crud/produto/:codProd/imagem', (req, res) => controllers.crudController.produtoImagem(req, res));

  // Middlewares de permissão por módulo
  const permSaida = createPermissionMiddleware(permissoesRepo, 'conferencia_saida');
  const permRecebimento = createPermissionMiddleware(permissoesRepo, ['conferencia_entrada', 'gestao_recebimento']);
  const permProdutos = createPermissionMiddleware(permissoesRepo, 'consulta_produtos');
  const permAdmin = createPermissionMiddleware(permissoesRepo, 'gerenciar_acessos');

  // Rotas protegidas
  app.use('/api/conferencias', authMiddleware, permSaida, createConferenciasRoutes(controllers.conferenciasController));
  app.use(
    '/api/recebimento',
    authMiddleware,
    permRecebimento,
    createConferenciaEntradaRoutes(
      controllers.conferenciaEntradaController,
      controllers.ocorrenciasRecebimentoController,
      permissoesRepo
    )
  );
  app.use('/api/crud', authMiddleware, createCrudRoutes(controllers.crudController));
  app.use('/api/produtos', authMiddleware, permProdutos, createProdutoRoutes(controllers.produtoController));
  app.use('/api/acessos', authMiddleware, createAcessosRoutes(controllers.acessosController, permAdmin));
  app.use('/api/configuracoes/telas', authMiddleware, permAdmin, createConfiguracaoTelasRoutes(controllers.configuracaoTelasController));
  app.use('/api/configuracoes/sistema', authMiddleware, permAdmin, createConfiguracaoSistemaRoutes(controllers.configuracaoSistemaController));
  app.use('/api/database', authMiddleware, permAdmin, createDatabaseRoutes(controllers.databaseExplorerController));
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
