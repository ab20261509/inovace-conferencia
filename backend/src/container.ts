import { Application } from 'express';
import { appConfig } from './infrastructure/config/env.js';

// Infrastructure (Adapters)
import { SankhyaGatewayAdapter } from './infrastructure/gateway/SankhyaGatewayAdapter.js';
import { JwtTokenAdapter } from './infrastructure/auth/JwtTokenAdapter.js';
import { InMemoryAuthAdapter } from './infrastructure/auth/InMemoryAuthAdapter.js';

// Application (Use Cases) - Auth
import { LoginUseCase } from './application/use-cases/auth/LoginUseCase.js';
import { LoginSankhyaUseCase } from './application/use-cases/auth/LoginSankhyaUseCase.js';
import { LogoutUseCase } from './application/use-cases/auth/LogoutUseCase.js';
import { ValidateSessionUseCase } from './application/use-cases/auth/ValidateSessionUseCase.js';

// Application (Use Cases) - CRUD
import { LoadRecordsUseCase } from './application/use-cases/crud/LoadRecordsUseCase.js';
import { LoadRecordUseCase } from './application/use-cases/crud/LoadRecordUseCase.js';
import { SaveRecordUseCase } from './application/use-cases/crud/SaveRecordUseCase.js';
import { RemoveRecordUseCase } from './application/use-cases/crud/RemoveRecordUseCase.js';
import { LoadViewUseCase } from './application/use-cases/crud/LoadViewUseCase.js';
import { GetProdutoImagemUseCase } from './application/use-cases/crud/GetProdutoImagemUseCase.js';

// Application (Use Cases) - Proxy
import { GatewayProxyUseCase } from './application/use-cases/proxy/GatewayProxyUseCase.js';

// Application (Use Cases) - Produtos
import { ConsultarProdutosUseCase } from './application/use-cases/produtos/ConsultarProdutosUseCase.js';
import { ConsultarEstoqueUseCase } from './application/use-cases/produtos/ConsultarEstoqueUseCase.js';

// Application (Use Cases) - Conferências (consulta)
import { GetConferenciaSaidaUseCase } from './application/use-cases/conferencias/consulta/GetConferenciaSaidaUseCase.js';
import { ListarItensPedidoUseCase } from './application/use-cases/conferencias/consulta/ListarItensPedidoUseCase.js';
import { ListarItensConferidosUseCase } from './application/use-cases/conferencias/consulta/ListarItensConferidosUseCase.js';
import { GetProdutoUseCase } from './application/use-cases/conferencias/consulta/GetProdutoUseCase.js';
import { GetProdutosDivergentesUseCase } from './application/use-cases/conferencias/consulta/GetProdutosDivergentesUseCase.js';
import { VerificarExcluidosUseCase } from './application/use-cases/conferencias/consulta/VerificarExcluidosUseCase.js';

// Application (Use Cases) - Conferências (operação)
import { SalvarItemConferidoUseCase } from './application/use-cases/conferencias/operacao/SalvarItemConferidoUseCase.js';
import { SalvarVolumeUseCase } from './application/use-cases/conferencias/operacao/SalvarVolumeUseCase.js';
import { ExcluirItemConferidoUseCase } from './application/use-cases/conferencias/operacao/ExcluirItemConferidoUseCase.js';
import { NotificarDiscordUseCase } from './application/use-cases/conferencias/operacao/NotificarDiscordUseCase.js';

// Infrastructure (Discord)
import { DiscordWebhookAdapter } from './infrastructure/discord/DiscordWebhookAdapter.js';

// Infrastructure (Database & Repositórios libSQL / Turso)
import { Client } from '@libsql/client';
import { getLibsqlClient, startAutoSync } from './infrastructure/database/libsqlClient.js';
import { initDatabaseSchema } from './infrastructure/database/schema.js';
import { AuditService } from './infrastructure/database/AuditService.js';
import { LibsqlPermissoesRepository } from './infrastructure/repositories/LibsqlPermissoesRepository.js';
import { LibsqlConfiguracaoTelasRepository } from './infrastructure/repositories/LibsqlConfiguracaoTelasRepository.js';
import { LibsqlConfiguracaoSistemaRepository } from './infrastructure/repositories/LibsqlConfiguracaoSistemaRepository.js';
import { LibsqlConferenciaEntradaRepository } from './infrastructure/repositories/LibsqlConferenciaEntradaRepository.js';
import { LibsqlDatabaseExplorerRepository } from './infrastructure/repositories/LibsqlDatabaseExplorerRepository.js';

// Application (Use Cases) - Acessos
import { ObterMeusAcessosUseCase } from './application/use-cases/acessos/ObterMeusAcessosUseCase.js';
import { ListarUsuariosAcessosUseCase } from './application/use-cases/acessos/ListarUsuariosAcessosUseCase.js';
import { SalvarAcessosUsuarioUseCase } from './application/use-cases/acessos/SalvarAcessosUsuarioUseCase.js';

// Application (Use Cases) - Configurações de Telas
import { ListarConfiguracaoTelasUseCase } from './application/use-cases/configuracoes/ListarConfiguracaoTelasUseCase.js';
import { SalvarConfiguracaoTelaUseCase } from './application/use-cases/configuracoes/SalvarConfiguracaoTelaUseCase.js';

// Application (Use Cases) - Conferência de Entrada (Recebimento)
import { ListarNotasEntradaUseCase } from './application/use-cases/recebimento/ListarNotasEntradaUseCase.js';
import { ObterItensConferenciaEntradaUseCase } from './application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.js';
import { IniciarConferenciaEntradaUseCase } from './application/use-cases/recebimento/IniciarConferenciaEntradaUseCase.js';
import { RegistrarBipagemEntradaUseCase } from './application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.js';
import { AnularBipagemEntradaUseCase } from './application/use-cases/recebimento/AnularBipagemEntradaUseCase.js';
import { FinalizarNivelEntradaUseCase } from './application/use-cases/recebimento/FinalizarNivelEntradaUseCase.js';
import { ListarDivergenciasEntradaUseCase } from './application/use-cases/recebimento/ListarDivergenciasEntradaUseCase.js';
import { ResolverDivergenciaUseCase } from './application/use-cases/recebimento/ResolverDivergenciaUseCase.js';
import { ReiniciarConferenciaEntradaUseCase } from './application/use-cases/recebimento/ReiniciarConferenciaEntradaUseCase.js';
import { EnviarConferenciaSankhyaUseCase } from './application/use-cases/recebimento/EnviarConferenciaSankhyaUseCase.js';
import { SankhyaDesmembrarItemService } from './infrastructure/services/SankhyaDesmembrarItemService.js';
import { ListarTodasConferenciasEntradaUseCase } from './application/use-cases/recebimento/ListarTodasConferenciasEntradaUseCase.js';
import { SolicitarRecontagemEntradaUseCase } from './application/use-cases/recebimento/SolicitarRecontagemEntradaUseCase.js';
import { RecuperarContagemReiniciadaUseCase } from './application/use-cases/recebimento/RecuperarContagemReiniciadaUseCase.js';
import { SincronizarDesmembramentoNotaUseCase } from './application/use-cases/recebimento/SincronizarDesmembramentoNotaUseCase.js';
import { ExecutarDesmembramentoItemUseCase } from './application/use-cases/recebimento/ExecutarDesmembramentoItemUseCase.js';
import { AlterarLocalItemNotaUseCase } from './application/use-cases/recebimento/AlterarLocalItemNotaUseCase.js';
import { RegistrarOcorrenciaSobraUseCase } from './application/use-cases/recebimento/RegistrarOcorrenciaSobraUseCase.js';

// Application (Use Cases) - Conferências (ciclo de vida)
import { IniciarConferenciaUseCase } from './application/use-cases/conferencias/ciclo-vida/IniciarConferenciaUseCase.js';
import { ExcluirConferenciaUseCase } from './application/use-cases/conferencias/ciclo-vida/ExcluirConferenciaUseCase.js';
import { FinalizarConferenciaUseCase } from './application/use-cases/conferencias/ciclo-vida/FinalizarConferenciaUseCase.js';
import { CortarNotaUseCase } from './application/use-cases/conferencias/ciclo-vida/CortarNotaUseCase.js';

// Presentation (Controllers + Middleware)
import { AuthController } from './presentation/http/controllers/AuthController.js';
import { CrudController } from './presentation/http/controllers/CrudController.js';
import { ApiProxyController } from './presentation/http/controllers/ApiProxyController.js';
import { ConferenciasController } from './presentation/http/controllers/ConferenciasController.js';
import { ProdutoController } from './presentation/http/controllers/ProdutoController.js';
import { AcessosController } from './presentation/http/controllers/AcessosController.js';
import { ConfiguracaoTelasController } from './presentation/http/controllers/ConfiguracaoTelasController.js';
import { ConfiguracaoSistemaController } from './presentation/http/controllers/ConfiguracaoSistemaController.js';
import { ConferenciaEntradaController } from './presentation/http/controllers/ConferenciaEntradaController.js';
import { DatabaseExplorerController } from './presentation/http/controllers/DatabaseExplorerController.js';
import { OcorrenciasRecebimentoController } from './presentation/http/controllers/OcorrenciasRecebimentoController.js';
import { LibsqlOcorrenciaConferenciaEntradaRepository } from './infrastructure/repositories/LibsqlOcorrenciaConferenciaEntradaRepository.js';
import { RegistrarOcorrenciaEntradaUseCase } from './application/use-cases/recebimento/RegistrarOcorrenciaEntradaUseCase.js';
import { ListarOcorrenciasEntradaUseCase } from './application/use-cases/recebimento/ListarOcorrenciasEntradaUseCase.js';
import { AtualizarOcorrenciaEntradaUseCase } from './application/use-cases/recebimento/AtualizarOcorrenciaEntradaUseCase.js';
import { RemoverOcorrenciaEntradaUseCase } from './application/use-cases/recebimento/RemoverOcorrenciaEntradaUseCase.js';
import { BuscarProdutoTGFPROUseCase } from './application/use-cases/recebimento/BuscarProdutoTGFPROUseCase.js';
import { BuscarProdutoInternetUseCase } from './application/use-cases/recebimento/BuscarProdutoInternetUseCase.js';
import { ListarLocaisSankhyaUseCase } from './application/use-cases/recebimento/ListarLocaisSankhyaUseCase.js';
import { createAuthMiddleware } from './presentation/http/middlewares/authMiddleware.js';
import { createServer } from './presentation/server.js';

// Application (Use Cases) - Separação de Cargas
import { LibsqlSeparacaoRepository } from './infrastructure/repositories/LibsqlSeparacaoRepository.js';
import { ListarCargasPendentesUseCase } from './application/use-cases/separacao/ListarCargasPendentesUseCase.js';
import { IniciarSeparacaoUseCase } from './application/use-cases/separacao/IniciarSeparacaoUseCase.js';
import { ObterSeparacaoUseCase } from './application/use-cases/separacao/ObterSeparacaoUseCase.js';
import { SincronizarItensSeparacaoUseCase } from './application/use-cases/separacao/SincronizarItensSeparacaoUseCase.js';
import { RegistrarBipagemSeparacaoUseCase } from './application/use-cases/separacao/RegistrarBipagemSeparacaoUseCase.js';
import { AnularBipagemSeparacaoUseCase } from './application/use-cases/separacao/AnularBipagemSeparacaoUseCase.js';
import { FinalizarSeparacaoUseCase } from './application/use-cases/separacao/FinalizarSeparacaoUseCase.js';
import { AtualizarEnderecoProdutoUseCase } from './application/use-cases/separacao/AtualizarEnderecoProdutoUseCase.js';
import { RegistrarFaltaItemUseCase } from './application/use-cases/separacao/RegistrarFaltaItemUseCase.js';
import { ResolverFaltaSeparacaoUseCase } from './application/use-cases/separacao/ResolverFaltaSeparacaoUseCase.js';
import { SolicitarReabastecimentoSeparacaoUseCase } from './application/use-cases/separacao/SolicitarReabastecimentoSeparacaoUseCase.js';
import { SeparacaoController } from './presentation/http/controllers/SeparacaoController.js';
import { LibsqlReabastecimentoRepository } from './infrastructure/repositories/LibsqlReabastecimentoRepository.js';
import { ListarTarefasReabastecimentoUseCase } from './application/use-cases/reabastecimento/ListarTarefasReabastecimentoUseCase.js';
import { ConcluirTarefaReabastecimentoUseCase } from './application/use-cases/reabastecimento/ConcluirTarefaReabastecimentoUseCase.js';
import { CancelarTarefaReabastecimentoUseCase } from './application/use-cases/reabastecimento/CancelarTarefaReabastecimentoUseCase.js';
import { RegistrarFaltaPulmaoUseCase } from './application/use-cases/reabastecimento/RegistrarFaltaPulmaoUseCase.js';
import { FinalizarFaltaPulmaoUseCase } from './application/use-cases/reabastecimento/FinalizarFaltaPulmaoUseCase.js';
import { ReabastecimentoController } from './presentation/http/controllers/ReabastecimentoController.js';

// Application (Use Cases) - Endereçamento WMS
import { LibsqlEnderecamentoRepository } from './infrastructure/repositories/LibsqlEnderecamentoRepository.js';
import { BuscarEnderecosProdutoUseCase } from './application/use-cases/enderecamento/BuscarEnderecosProdutoUseCase.js';
import { BuscarProdutosPorEnderecoUseCase } from './application/use-cases/enderecamento/BuscarProdutosPorEnderecoUseCase.js';
import { VincularEnderecoProdutoUseCase } from './application/use-cases/enderecamento/VincularEnderecoProdutoUseCase.js';
import { MovimentarEnderecoProdutoUseCase } from './application/use-cases/enderecamento/MovimentarEnderecoProdutoUseCase.js';
import { DesenderecarProdutoUseCase } from './application/use-cases/enderecamento/DesenderecarProdutoUseCase.js';
import { ListarHistoricoEnderecamentoUseCase } from './application/use-cases/enderecamento/ListarHistoricoEnderecamentoUseCase.js';
import { ListarEnderecosAnaliticoUseCase } from './application/use-cases/enderecamento/ListarEnderecosAnaliticoUseCase.js';
import { CadastrarProdutoEnderecoUseCase } from './application/use-cases/enderecamento/CadastrarProdutoEnderecoUseCase.js';
import { EnderecamentoController } from './presentation/http/controllers/EnderecamentoController.js';

/**
 * Composition Root
 * Monta o grafo completo de dependências e retorna a aplicação configurada
 *
 * Fluxo: Config → Adapters → Use Cases → Controllers → Server
 */
export async function buildApp(customClient?: Client): Promise<Application> {
  // Inicialização do Banco de Dados SQLite / Turso
  const dbClient = customClient || getLibsqlClient();
  await initDatabaseSchema(dbClient);
  startAutoSync();

  const auditService = new AuditService(dbClient);

  // 1. Adapters (Infrastructure)
  const gatewayAdapter = new SankhyaGatewayAdapter({
    url: appConfig.gateway.url,
    clientId: appConfig.gateway.clientId,
    clientSecret: appConfig.gateway.clientSecret,
    xToken: appConfig.gateway.xToken,
  });

  const tokenAdapter = new JwtTokenAdapter({
    secret: appConfig.session.secret,
    expiresIn: appConfig.session.expiresIn,
  });

  const authAdapter = new InMemoryAuthAdapter();
  const permissoesRepo = new LibsqlPermissoesRepository(dbClient, auditService);
  const configTelasRepo = new LibsqlConfiguracaoTelasRepository(dbClient, permissoesRepo, auditService);
  const configSistemaRepo = new LibsqlConfiguracaoSistemaRepository(dbClient, auditService);
  const conferenciaEntradaRepo = new LibsqlConferenciaEntradaRepository(dbClient, auditService);
  const ocorrenciaEntradaRepo = new LibsqlOcorrenciaConferenciaEntradaRepository(dbClient);
  const separacaoRepo = new LibsqlSeparacaoRepository(dbClient, auditService);
  const reabastecimentoRepo = new LibsqlReabastecimentoRepository(dbClient);

  // 2. Use Cases (Application)
  const loginUseCase = new LoginUseCase(authAdapter, tokenAdapter);
  const loginSankhyaUseCase = new LoginSankhyaUseCase(gatewayAdapter, tokenAdapter, permissoesRepo);
  const logoutUseCase = new LogoutUseCase();
  const validateSessionUseCase = new ValidateSessionUseCase(tokenAdapter);

  // Acessos
  const obterMeusAcessosUseCase = new ObterMeusAcessosUseCase(permissoesRepo);
  const listarUsuariosAcessosUseCase = new ListarUsuariosAcessosUseCase(gatewayAdapter, permissoesRepo);
  const salvarAcessosUsuarioUseCase = new SalvarAcessosUsuarioUseCase(permissoesRepo);

  // Configurações de Telas
  const listarConfiguracaoTelasUseCase = new ListarConfiguracaoTelasUseCase(configTelasRepo, permissoesRepo);
  const salvarConfiguracaoTelaUseCase = new SalvarConfiguracaoTelaUseCase(configTelasRepo, permissoesRepo);

  // Conferência de Entrada (Recebimento)
  const listarNotasEntradaUseCase = new ListarNotasEntradaUseCase(
    gatewayAdapter,
    conferenciaEntradaRepo,
    configTelasRepo,
    permissoesRepo
  );
  const obterItensConferenciaEntradaUseCase = new ObterItensConferenciaEntradaUseCase(
    gatewayAdapter,
    conferenciaEntradaRepo,
    configTelasRepo
  );
  const iniciarConferenciaEntradaUseCase = new IniciarConferenciaEntradaUseCase(
    conferenciaEntradaRepo,
    configSistemaRepo,
    gatewayAdapter
  );
  const registrarBipagemEntradaUseCase = new RegistrarBipagemEntradaUseCase(gatewayAdapter, conferenciaEntradaRepo, permissoesRepo);
  const anularBipagemEntradaUseCase = new AnularBipagemEntradaUseCase(conferenciaEntradaRepo);
  const finalizarNivelEntradaUseCase = new FinalizarNivelEntradaUseCase(gatewayAdapter, conferenciaEntradaRepo, configSistemaRepo);
  const listarDivergenciasEntradaUseCase = new ListarDivergenciasEntradaUseCase(
    gatewayAdapter,
    conferenciaEntradaRepo,
    configSistemaRepo
  );
  const resolverDivergenciaUseCase = new ResolverDivergenciaUseCase(
    conferenciaEntradaRepo,
    auditService,
    listarDivergenciasEntradaUseCase
  );
  const reiniciarConferenciaEntradaUseCase = new ReiniciarConferenciaEntradaUseCase(
    conferenciaEntradaRepo,
    auditService,
    configSistemaRepo,
    ocorrenciaEntradaRepo
  );
  const desmembrarItemService = new SankhyaDesmembrarItemService(gatewayAdapter);
  const enviarConferenciaSankhyaUseCase = new EnviarConferenciaSankhyaUseCase(
    gatewayAdapter,
    conferenciaEntradaRepo,
    auditService,
    desmembrarItemService,
    ocorrenciaEntradaRepo
  );
  const listarTodasConferenciasUseCase = new ListarTodasConferenciasEntradaUseCase(gatewayAdapter, conferenciaEntradaRepo);
  const solicitarRecontagemEntradaUseCase = new SolicitarRecontagemEntradaUseCase(conferenciaEntradaRepo, auditService);
  const recuperarContagemReiniciadaUseCase = new RecuperarContagemReiniciadaUseCase(
    conferenciaEntradaRepo,
    gatewayAdapter,
    auditService
  );
  const sincronizarDesmembramentoNotaUseCase = new SincronizarDesmembramentoNotaUseCase(
    conferenciaEntradaRepo,
    gatewayAdapter,
    listarDivergenciasEntradaUseCase
  );
  const executarDesmembramentoItemUseCase = new ExecutarDesmembramentoItemUseCase(
    conferenciaEntradaRepo,
    gatewayAdapter,
    listarDivergenciasEntradaUseCase,
    ocorrenciaEntradaRepo
  );
  const alterarLocalItemNotaUseCase = new AlterarLocalItemNotaUseCase(gatewayAdapter, conferenciaEntradaRepo);
  const registrarOcorrenciaSobraUseCase = new RegistrarOcorrenciaSobraUseCase(conferenciaEntradaRepo, ocorrenciaEntradaRepo, listarDivergenciasEntradaUseCase, auditService);

  const loadRecordsUseCase = new LoadRecordsUseCase(gatewayAdapter);
  const loadRecordUseCase = new LoadRecordUseCase(gatewayAdapter);
  const saveRecordUseCase = new SaveRecordUseCase(gatewayAdapter);
  const removeRecordUseCase = new RemoveRecordUseCase(gatewayAdapter);
  const loadViewUseCase = new LoadViewUseCase(gatewayAdapter);
  const getProdutoImagemUseCase = new GetProdutoImagemUseCase(gatewayAdapter);

  const gatewayProxyUseCase = new GatewayProxyUseCase(gatewayAdapter);

  // Produtos
  const consultarProdutosUseCase = new ConsultarProdutosUseCase(gatewayAdapter);
  const consultarEstoqueUseCase = new ConsultarEstoqueUseCase(gatewayAdapter);

  // Conferências
  const getConferenciaSaidaUseCase = new GetConferenciaSaidaUseCase(gatewayAdapter, separacaoRepo);
  const iniciarConferenciaUseCase = new IniciarConferenciaUseCase(gatewayAdapter, separacaoRepo);
  const excluirConferenciaUseCase = new ExcluirConferenciaUseCase(gatewayAdapter);
  const listarItensPedidoUseCase = new ListarItensPedidoUseCase(gatewayAdapter, permissoesRepo, configTelasRepo);
  const listarItensConferidosUseCase = new ListarItensConferidosUseCase(gatewayAdapter);
  const getProdutoUseCase = new GetProdutoUseCase(gatewayAdapter);
  const salvarItemConferidoUseCase = new SalvarItemConferidoUseCase(gatewayAdapter, permissoesRepo);
  const getProdutosDivergentesUseCase = new GetProdutosDivergentesUseCase(gatewayAdapter);
  const salvarVolumeUseCase = new SalvarVolumeUseCase(gatewayAdapter);
  const excluirItemConferidoUseCase = new ExcluirItemConferidoUseCase(gatewayAdapter);
  const finalizarConferenciaUseCase = new FinalizarConferenciaUseCase(gatewayAdapter);
  const cortarNotaUseCase = new CortarNotaUseCase(gatewayAdapter);
  const verificarExcluidosUseCase = new VerificarExcluidosUseCase(gatewayAdapter);

  // Discord
  const discordAdapter = new DiscordWebhookAdapter(appConfig.discord.webhookUrl);
  const notificarDiscordUseCase = new NotificarDiscordUseCase(
    gatewayAdapter,
    listarItensPedidoUseCase,
    discordAdapter,
  );

  // 3. Controllers (Presentation)
  const authController = new AuthController(loginUseCase, loginSankhyaUseCase, logoutUseCase, validateSessionUseCase);
  const acessosController = new AcessosController(
    obterMeusAcessosUseCase,
    listarUsuariosAcessosUseCase,
    salvarAcessosUsuarioUseCase,
  );
  const configuracaoTelasController = new ConfiguracaoTelasController(
    listarConfiguracaoTelasUseCase,
    salvarConfiguracaoTelaUseCase,
  );
  const configuracaoSistemaController = new ConfiguracaoSistemaController(configSistemaRepo);
  const conferenciaEntradaController = new ConferenciaEntradaController(
    listarNotasEntradaUseCase,
    obterItensConferenciaEntradaUseCase,
    iniciarConferenciaEntradaUseCase,
    registrarBipagemEntradaUseCase,
    anularBipagemEntradaUseCase,
    finalizarNivelEntradaUseCase,
    listarDivergenciasEntradaUseCase,
    resolverDivergenciaUseCase,
    reiniciarConferenciaEntradaUseCase,
    enviarConferenciaSankhyaUseCase,
    listarTodasConferenciasUseCase,
    solicitarRecontagemEntradaUseCase,
    recuperarContagemReiniciadaUseCase,
    sincronizarDesmembramentoNotaUseCase,
    executarDesmembramentoItemUseCase,
    alterarLocalItemNotaUseCase,
    registrarOcorrenciaSobraUseCase
  );
  const crudController = new CrudController(
    loadRecordsUseCase,
    loadRecordUseCase,
    saveRecordUseCase,
    removeRecordUseCase,
    loadViewUseCase,
    getProdutoImagemUseCase,
  );
  const apiProxyController = new ApiProxyController(gatewayProxyUseCase);
  const produtoController = new ProdutoController(consultarProdutosUseCase, consultarEstoqueUseCase);
  const conferenciasController = new ConferenciasController(
    getConferenciaSaidaUseCase,
    iniciarConferenciaUseCase,
    excluirConferenciaUseCase,
    listarItensPedidoUseCase,
    listarItensConferidosUseCase,
    getProdutoUseCase,
    salvarItemConferidoUseCase,
    getProdutosDivergentesUseCase,
    salvarVolumeUseCase,
    finalizarConferenciaUseCase,
    cortarNotaUseCase,
    verificarExcluidosUseCase,
    excluirItemConferidoUseCase,
    notificarDiscordUseCase,
  );

  const databaseExplorerRepo = new LibsqlDatabaseExplorerRepository(dbClient, auditService);
  const databaseExplorerController = new DatabaseExplorerController(databaseExplorerRepo, permissoesRepo);

  // Ocorrências do Recebimento (Avaria, Vencidos, Trocados, etc.)
  const registrarOcorrenciaEntradaUseCase = new RegistrarOcorrenciaEntradaUseCase(ocorrenciaEntradaRepo, configSistemaRepo, gatewayAdapter);
  const listarOcorrenciasEntradaUseCase = new ListarOcorrenciasEntradaUseCase(ocorrenciaEntradaRepo, gatewayAdapter);
  const atualizarOcorrenciaEntradaUseCase = new AtualizarOcorrenciaEntradaUseCase(
    ocorrenciaEntradaRepo,
    conferenciaEntradaRepo,
    listarDivergenciasEntradaUseCase
  );
  const removerOcorrenciaEntradaUseCase = new RemoverOcorrenciaEntradaUseCase(ocorrenciaEntradaRepo);
  const buscarProdutoTGFPROUseCase = new BuscarProdutoTGFPROUseCase(gatewayAdapter);
  const buscarProdutoInternetUseCase = new BuscarProdutoInternetUseCase();
  const listarLocaisSankhyaUseCase = new ListarLocaisSankhyaUseCase(gatewayAdapter);

  const ocorrenciasRecebimentoController = new OcorrenciasRecebimentoController(
    registrarOcorrenciaEntradaUseCase,
    listarOcorrenciasEntradaUseCase,
    atualizarOcorrenciaEntradaUseCase,
    removerOcorrenciaEntradaUseCase,
    buscarProdutoTGFPROUseCase,
    buscarProdutoInternetUseCase,
    listarLocaisSankhyaUseCase,
    discordAdapter
  );

  // Separação de Cargas (Vendas agrupadas por ORDEMCARGA)
  const listarCargasPendentesUseCase = new ListarCargasPendentesUseCase(gatewayAdapter, separacaoRepo);
  const iniciarSeparacaoUseCase = new IniciarSeparacaoUseCase(gatewayAdapter, separacaoRepo);
  const obterSeparacaoUseCase = new ObterSeparacaoUseCase(separacaoRepo);
  const sincronizarItensSeparacaoUseCase = new SincronizarItensSeparacaoUseCase(gatewayAdapter, separacaoRepo);
  const registrarBipagemSeparacaoUseCase = new RegistrarBipagemSeparacaoUseCase(
    separacaoRepo,
    configSistemaRepo,
    gatewayAdapter,
  );
  const anularBipagemSeparacaoUseCase = new AnularBipagemSeparacaoUseCase(separacaoRepo);
  const finalizarSeparacaoUseCase = new FinalizarSeparacaoUseCase(
    separacaoRepo,
    sincronizarItensSeparacaoUseCase,
    gatewayAdapter,
    reabastecimentoRepo,
  );
  const atualizarEnderecoProdutoUseCase = new AtualizarEnderecoProdutoUseCase(gatewayAdapter, separacaoRepo);
  const registrarFaltaItemUseCase = new RegistrarFaltaItemUseCase(separacaoRepo);
  const resolverFaltaSeparacaoUseCase = new ResolverFaltaSeparacaoUseCase(separacaoRepo);
  const solicitarReabastecimentoUseCase = new SolicitarReabastecimentoSeparacaoUseCase(separacaoRepo, reabastecimentoRepo);

  const separacaoController = new SeparacaoController(
    listarCargasPendentesUseCase,
    iniciarSeparacaoUseCase,
    obterSeparacaoUseCase,
    sincronizarItensSeparacaoUseCase,
    registrarBipagemSeparacaoUseCase,
    anularBipagemSeparacaoUseCase,
    finalizarSeparacaoUseCase,
    separacaoRepo,
    atualizarEnderecoProdutoUseCase,
    registrarFaltaItemUseCase,
    resolverFaltaSeparacaoUseCase,
    solicitarReabastecimentoUseCase,
  );

  // Reabastecimento de Picking (Equipe de Empilhadeira)
  const listarTarefasReabastecimentoUseCase = new ListarTarefasReabastecimentoUseCase(reabastecimentoRepo, gatewayAdapter);
  const concluirTarefaReabastecimentoUseCase = new ConcluirTarefaReabastecimentoUseCase(reabastecimentoRepo, separacaoRepo);
  const cancelarTarefaReabastecimentoUseCase = new CancelarTarefaReabastecimentoUseCase(reabastecimentoRepo);
  const registrarFaltaPulmaoUseCase = new RegistrarFaltaPulmaoUseCase(reabastecimentoRepo);
  const finalizarFaltaPulmaoUseCase = new FinalizarFaltaPulmaoUseCase(reabastecimentoRepo, separacaoRepo);
  const reabastecimentoController = new ReabastecimentoController(
    listarTarefasReabastecimentoUseCase,
    concluirTarefaReabastecimentoUseCase,
    cancelarTarefaReabastecimentoUseCase,
    registrarFaltaPulmaoUseCase,
    finalizarFaltaPulmaoUseCase,
  );

  // Endereçamento WMS (Produto x Endereço & Movimentações)
  const enderecamentoRepo = new LibsqlEnderecamentoRepository(dbClient);
  const buscarEnderecosProdutoUseCase = new BuscarEnderecosProdutoUseCase(gatewayAdapter);
  const buscarProdutosPorEnderecoUseCase = new BuscarProdutosPorEnderecoUseCase(gatewayAdapter);
  const vincularEnderecoProdutoUseCase = new VincularEnderecoProdutoUseCase(gatewayAdapter, enderecamentoRepo);
  const movimentarEnderecoProdutoUseCase = new MovimentarEnderecoProdutoUseCase(gatewayAdapter, enderecamentoRepo);
  const desenderecarProdutoUseCase = new DesenderecarProdutoUseCase(gatewayAdapter, enderecamentoRepo);
  const listarHistoricoEnderecamentoUseCase = new ListarHistoricoEnderecamentoUseCase(enderecamentoRepo);
  const listarEnderecosAnaliticoUseCase = new ListarEnderecosAnaliticoUseCase(gatewayAdapter);
  const cadastrarProdutoEnderecoUseCase = new CadastrarProdutoEnderecoUseCase(gatewayAdapter, enderecamentoRepo);
  const enderecamentoController = new EnderecamentoController(
    buscarEnderecosProdutoUseCase,
    buscarProdutosPorEnderecoUseCase,
    vincularEnderecoProdutoUseCase,
    movimentarEnderecoProdutoUseCase,
    desenderecarProdutoUseCase,
    listarHistoricoEnderecamentoUseCase,
    listarEnderecosAnaliticoUseCase,
    cadastrarProdutoEnderecoUseCase,
  );

  // 4. Middleware de autenticação
  const authMiddleware = createAuthMiddleware(tokenAdapter);

  // 5. Montar servidor
  const app = createServer(
    { corsOrigin: appConfig.cors.origin },
    {
      authController,
      crudController,
      apiProxyController,
      conferenciasController,
      produtoController,
      acessosController,
      configuracaoTelasController,
      configuracaoSistemaController,
      conferenciaEntradaController,
      databaseExplorerController,
      ocorrenciasRecebimentoController,
      separacaoController,
      reabastecimentoController,
      enderecamentoController,
    },
    authMiddleware,
    permissoesRepo,
  );

  return app;
}
