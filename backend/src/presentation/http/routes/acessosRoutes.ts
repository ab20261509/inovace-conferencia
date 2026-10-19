import { Router, RequestHandler } from 'express';
import { AcessosController } from '../controllers/AcessosController.js';

export function createAcessosRoutes(
  controller: AcessosController,
  adminMiddleware?: RequestHandler
): Router {
  const router = Router();

  router.get('/me', (req, res) => controller.me(req, res));
  
  if (adminMiddleware) {
    router.get('/usuarios', adminMiddleware, (req, res) => controller.listarUsuarios(req, res));
    router.put('/usuarios/:codUsu', adminMiddleware, (req, res) => controller.salvarAcessos(req, res));
  } else {
    router.get('/usuarios', (req, res) => controller.listarUsuarios(req, res));
    router.put('/usuarios/:codUsu', (req, res) => controller.salvarAcessos(req, res));
  }

  return router;
}
