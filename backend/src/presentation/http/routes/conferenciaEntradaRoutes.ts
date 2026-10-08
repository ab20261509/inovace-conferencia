import { Router } from 'express';
import { ConferenciaEntradaController } from '../controllers/ConferenciaEntradaController.js';

export function createConferenciaEntradaRoutes(controller: ConferenciaEntradaController): Router {
  const router = Router();

  // Listagem de notas
  router.get('/notas', (req, res) => controller.listarNotas(req, res));

  // Itens da conferência
  router.get('/conferencia/:id/itens', (req, res) => controller.obterItens(req, res));

  // Iniciar/retomar sessão de conferência
  router.post('/conferencia/iniciar', (req, res) => controller.iniciar(req, res));

  // Bipagem de código
  router.post('/conferencia/:id/bipar', (req, res) => controller.bipar(req, res));

  // Anular bipagem
  router.put('/conferencia/bipagens/:bipagemId/anular', (req, res) =>
    controller.anularBipagem(req, res)
  );

  // Finalizar nível
  router.post('/conferencia/:id/finalizar', (req, res) => controller.finalizarNivel(req, res));

  return router;
}
