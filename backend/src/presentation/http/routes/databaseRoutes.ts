import { Router } from 'express';
import { DatabaseExplorerController } from '../controllers/DatabaseExplorerController.js';

export function createDatabaseRoutes(controller: DatabaseExplorerController): Router {
  const router = Router();

  // Status e sincronização com Turso
  router.get('/status', (req, res) => controller.obterStatus(req, res));
  router.post('/sync', (req, res) => controller.sincronizar(req, res));

  // Dicionário de dados vivo e relacionamentos
  router.get('/docs', (req, res) => controller.obterDocumentacao(req, res));

  // Tabelas e Esquema
  router.get('/tables', (req, res) => controller.listarTabelas(req, res));
  router.get('/tables/:nomeTabela/schema', (req, res) => controller.obterSchema(req, res));

  // CRUD Dinâmico
  router.get('/tables/:nomeTabela/records', (req, res) => controller.consultarRegistros(req, res));
  router.put('/tables/:nomeTabela/records', (req, res) => controller.atualizarRegistro(req, res));
  router.delete('/tables/:nomeTabela/records', (req, res) => controller.excluirRegistro(req, res));
  router.post('/tables/:nomeTabela/records', (req, res) => controller.inserirRegistro(req, res));

  // Terminal / Console SQL
  router.post('/query', (req, res) => controller.executarQuery(req, res));

  return router;
}
