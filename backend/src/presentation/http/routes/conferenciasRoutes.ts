import { Router } from 'express';
import { ConferenciasController } from '../controllers/ConferenciasController.js';

/**
 * Rotas de Conferência de Saída
 *
 * GET  /                   → Lista pedidos pendentes de conferência
 * POST /verificar-excluidos → Verifica se nota tem apenas excluídos
 * POST /iniciar            → Inicia conferência
 * POST /excluir            → Exclui/cancela conferência
 * POST /itens-pedido       → Lista itens do pedido
 * POST /itens-conferidos   → Lista itens já conferidos
 * POST /produto            → Busca produto por código de barras
 * POST /conferir-item      → Confere um item
 * POST /divergentes        → Lista produtos divergentes
 * POST /volume             → Registra volume
 * POST /finalizar          → Finaliza conferência
 * POST /cortar             → Corta nota por divergência
 */
export function createConferenciasRoutes(controller: ConferenciasController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.list(req, res));
  router.post('/verificar-excluidos', (req, res) => controller.verificarExcluidos(req, res));
  router.post('/iniciar', (req, res) => controller.iniciar(req, res));
  router.post('/excluir', (req, res) => controller.excluir(req, res));
  router.post('/itens-pedido', (req, res) => controller.itensPedido(req, res));
  router.post('/itens-conferidos', (req, res) => controller.itensConferidos(req, res));
  router.post('/produto', (req, res) => controller.getProduto(req, res));
  router.post('/conferir-item', (req, res) => controller.conferirItem(req, res));
  router.post('/excluir-item-conferido', (req, res) => controller.excluirItemConferido(req, res));
  router.post('/divergentes', (req, res) => controller.divergentes(req, res));
  router.post('/volume', (req, res) => controller.salvarVolume(req, res));
  router.post('/finalizar', (req, res) => controller.finalizar(req, res));
  router.post('/cortar', (req, res) => controller.cortar(req, res));

  return router;
}
