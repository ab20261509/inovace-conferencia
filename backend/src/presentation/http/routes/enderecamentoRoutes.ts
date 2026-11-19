import { Router } from 'express';
import { EnderecamentoController } from '../controllers/EnderecamentoController.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { createPermissionMiddleware } from '../middlewares/permissionMiddleware.js';

export function createEnderecamentoRoutes(
  controller: EnderecamentoController,
  permissoesRepo?: IPermissoesRepository,
): Router {
  const router = Router();

  const permVisualizar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'enderecamento_visualizar')
    : (_req: any, _res: any, next: any) => next();

  const permManipular = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'enderecamento_manipular')
    : (_req: any, _res: any, next: any) => next();

  const permCadastrar = permissoesRepo
    ? createPermissionMiddleware(permissoesRepo, 'enderecamento_cadastrar')
    : (_req: any, _res: any, next: any) => next();

  router.get('/analitico', permVisualizar, (req, res) => controller.listarAnalitico(req, res));
  router.get('/por-produto', permVisualizar, (req, res) => controller.buscarPorProduto(req, res));
  router.get('/por-endereco', permVisualizar, (req, res) => controller.buscarPorEndereco(req, res));
  router.get('/historico', permVisualizar, (req, res) => controller.historico(req, res));

  router.post('/vincular', permManipular, (req, res) => controller.vincular(req, res));
  router.post('/movimentar', permManipular, (req, res) => controller.movimentar(req, res));
  router.post('/desenderecar', permManipular, (req, res) => controller.desenderecar(req, res));
  router.post('/cadastrar', permCadastrar, (req, res) => controller.cadastrar(req, res));

  return router;
}
