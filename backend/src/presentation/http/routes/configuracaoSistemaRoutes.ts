import { Router } from 'express';
import { ConfiguracaoSistemaController } from '../controllers/ConfiguracaoSistemaController.js';

export function createConfiguracaoSistemaRoutes(controller: ConfiguracaoSistemaController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.listar(req, res));
  router.put('/:chave', (req, res) => controller.salvar(req, res));

  return router;
}
