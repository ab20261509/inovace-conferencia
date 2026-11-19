import { Router } from 'express';
import { ReabastecimentoController } from '../controllers/ReabastecimentoController.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { createPermissionMiddleware } from '../middlewares/permissionMiddleware.js';

export function createReabastecimentoRoutes(
  controller: ReabastecimentoController,
  permissoesRepo?: IPermissoesRepository
): Router {
  const router = Router();

  const permConfirmar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'reabastecimento_confirmar')
    : (_req: any, _res: any, next: any) => next();

  const permCancelar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'reabastecimento_cancelar')
    : (_req: any, _res: any, next: any) => next();

  const permFinalizarFalta = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'reabastecimento_finalizar_falta')
    : (_req: any, _res: any, next: any) => next();

  router.get('/', (req, res) => controller.listar(req, res));
  router.post('/:id/concluir', permConfirmar, (req, res) => controller.concluir(req, res));
  router.post('/:id/cancelar', permCancelar, (req, res) => controller.cancelar(req, res));
  router.post('/:id/falta', (req, res) => controller.registrarFalta(req, res));
  router.post('/:id/finalizar-falta', permFinalizarFalta, (req, res) => controller.finalizarFalta(req, res));

  return router;
}
