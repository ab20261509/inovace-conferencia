import { Router } from 'express';
import { ConferenciaEntradaController } from '../controllers/ConferenciaEntradaController.js';
import { OcorrenciasRecebimentoController } from '../controllers/OcorrenciasRecebimentoController.js';

export function createConferenciaEntradaRoutes(
  controller: ConferenciaEntradaController,
  ocorrenciasController?: OcorrenciasRecebimentoController
): Router {
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

  // Gestão de divergências e envio ao Sankhya
  router.get('/conferencias', (req, res) => controller.listarTodas(req, res));
  router.get('/conferencia/divergencias', (req, res) => controller.listarDivergencias(req, res));
  router.get('/gestao/divergencias', (req, res) => controller.listarDivergencias(req, res));
  router.get('/divergencias', (req, res) => controller.listarDivergencias(req, res));

  router.post('/conferencia/:id/resolver-divergencia', (req, res) => controller.resolverDivergencia(req, res));
  router.put('/conferencia/:id/resolver-divergencia', (req, res) => controller.resolverDivergencia(req, res));

  router.post('/conferencia/:id/reiniciar', (req, res) => controller.reiniciarConferencia(req, res));
  router.post('/conferencia/:id/recontar', (req, res) => controller.solicitarRecontagem(req, res));
  router.post('/conferencia/:id/recuperar', (req, res) => controller.recuperarContagem(req, res));
  router.post('/conferencia/:id/sincronizar-desmembramento', (req, res) => controller.sincronizarDesmembramento(req, res));
  router.post('/conferencia/:id/desmembrar-item', (req, res) => controller.desmembrarItem(req, res));
  router.post('/conferencia/:id/enviar-sankhya', (req, res) => controller.enviarSankhya(req, res));
  router.put('/conferencia/item/local', (req, res) => controller.alterarLocalItem(req, res));
  router.post('/conferencia/item/local', (req, res) => controller.alterarLocalItem(req, res));

  // Ocorrências e Pendências do Recebimento (Avaria, Vencidos, Trocados, etc.)
  if (ocorrenciasController) {
    router.post('/ocorrencias', (req, res) => ocorrenciasController.registrar(req, res));
    router.get('/ocorrencias', (req, res) => ocorrenciasController.listar(req, res));
    router.put('/ocorrencias/:id', (req, res) => ocorrenciasController.atualizar(req, res));
    router.delete('/ocorrencias/:id', (req, res) => ocorrenciasController.remover(req, res));
    router.get('/produtos/catalogo', (req, res) => ocorrenciasController.buscarCatalogo(req, res));
    router.get('/produtos/buscar-internet', (req, res) => ocorrenciasController.buscarInternet(req, res));
    router.get('/locais-estoque', (req, res) => ocorrenciasController.listarLocais(req, res));
    router.post('/ocorrencias/notificar-discord', (req, res) => ocorrenciasController.notificarDiscord(req, res));
  }

  return router;
}
