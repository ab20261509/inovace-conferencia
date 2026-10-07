import { Router } from 'express';
import { SistemaController } from '../controllers/SistemaController.js';

/**
 * Rotas de Sistema
 *
 * GET /certificado → Baixa o certificado raiz CA
 */
export function createSistemaRoutes(controller: SistemaController): Router {
  const router = Router();

  router.get('/certificado', (req, res) => controller.baixarCertificado(req, res));

  return router;
}
