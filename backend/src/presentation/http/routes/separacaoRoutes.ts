import { Router } from 'express';
import { SeparacaoController } from '../controllers/SeparacaoController.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { createPermissionMiddleware } from '../middlewares/permissionMiddleware.js';

export function createSeparacaoRoutes(
  controller: SeparacaoController,
  permissoesRepo?: IPermissoesRepository
): Router {
  const router = Router();

  const permIniciar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'separacao_iniciar')
    : (_req: any, _res: any, next: any) => next();

  const permBipar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'separacao_bipar')
    : (_req: any, _res: any, next: any) => next();

  const permFinalizar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'separacao_finalizar')
    : (_req: any, _res: any, next: any) => next();

  const permCortar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'separacao_cortar')
    : (_req: any, _res: any, next: any) => next();

  router.get('/cargas', (req, res) => controller.listarCargas(req, res));
  router.post('/iniciar', permIniciar, (req, res) => controller.iniciar(req, res));
  router.get('/:id', (req, res) => controller.obter(req, res));
  router.post('/:id/sincronizar', (req, res) => controller.sincronizar(req, res));
  router.post('/:id/bipar', permBipar, (req, res) => controller.bipar(req, res));
  router.post('/:id/endereco', permBipar, (req, res) => controller.atualizarEndereco(req, res));
  router.post('/:id/falta', permCortar, (req, res) => controller.registrarFalta(req, res));
  router.post('/:id/resolver-falta', permCortar, (req, res) => controller.resolverFalta(req, res));
  router.post('/:id/solicitar-reabastecimento', (req, res) => controller.solicitarReabastecimento(req, res));
  router.post('/:id/finalizar', permFinalizar, (req, res) => controller.finalizar(req, res));
  router.get('/:id/bipagens', (req, res) => controller.listarBipagens(req, res));
  router.post('/bipagem/:bipId/anular', permBipar, (req, res) => controller.anularBipagem(req, res));

  return router;
}
