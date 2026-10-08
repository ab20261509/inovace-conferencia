import { Router } from 'express';
import { AcessosController } from '../controllers/AcessosController.js';

export function createAcessosRoutes(controller: AcessosController): Router {
  const router = Router();

  router.get('/me', (req, res) => controller.me(req, res));
  router.get('/usuarios', (req, res) => controller.listarUsuarios(req, res));
  router.put('/usuarios/:codUsu', (req, res) => controller.salvarAcessos(req, res));

  return router;
}
