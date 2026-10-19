import express, { Application, RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { correlationIdMiddleware } from './http/middlewares/correlationId.js';
import { requestLoggerMiddleware } from './http/middlewares/requestLogger.js';
import { errorHandler } from './http/middlewares/errorHandler.js';
import { registerRoutes, RouteControllers } from './http/routes/index.js';
import { IPermissoesRepository } from '../domain/ports/IPermissoesRepository.js';

export interface ServerConfig {
  corsOrigin: string;
}

/**
 * Cria e configura a aplicação Express
 * Sem conhecer detalhes de infraestrutura — recebe tudo por parâmetro
 */
export function createServer(
  config: ServerConfig,
  controllers: RouteControllers,
  authMiddleware: RequestHandler,
  permissoesRepo: IPermissoesRepository,
): Application {
  const app = express();

  // Middlewares globais
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(morgan('tiny'));

  // Middlewares de contexto
  app.use(correlationIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Registrar rotas
  registerRoutes(app, controllers, authMiddleware, permissoesRepo);

  // Error handler (último)
  app.use(errorHandler);

  return app;
}
