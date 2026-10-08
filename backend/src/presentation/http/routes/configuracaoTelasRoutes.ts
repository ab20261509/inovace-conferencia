import { Router } from 'express';
import { ConfiguracaoTelasController } from '../controllers/ConfiguracaoTelasController.js';

export function createConfiguracaoTelasRoutes(controller: ConfiguracaoTelasController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.listar(req, res));
  router.put('/:idTela', (req, res) => controller.salvar(req, res));

  return router;
}
