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
import { createAuthMiddleware } from './presentation/http/middlewares/authMiddleware.js';
import { createServer } from './presentation/server.js';

/**
 * Composition Root
 * Monta o grafo completo de dependências e retorna a aplicação configurada
 *
 * Fluxo: Config → Adapters → Use Cases → Controllers → Server
 */
export function buildApp(): Application {
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

  // 2. Use Cases (Application)
  const loginUseCase = new LoginUseCase(authAdapter, tokenAdapter);
  const loginSankhyaUseCase = new LoginSankhyaUseCase(gatewayAdapter, tokenAdapter);
  const logoutUseCase = new LogoutUseCase();
  const validateSessionUseCase = new ValidateSessionUseCase(tokenAdapter);

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
  const getConferenciaSaidaUseCase = new GetConferenciaSaidaUseCase(gatewayAdapter);
  const iniciarConferenciaUseCase = new IniciarConferenciaUseCase(gatewayAdapter);
  const excluirConferenciaUseCase = new ExcluirConferenciaUseCase(gatewayAdapter);
  const listarItensPedidoUseCase = new ListarItensPedidoUseCase(gatewayAdapter);
  const listarItensConferidosUseCase = new ListarItensConferidosUseCase(gatewayAdapter);
  const getProdutoUseCase = new GetProdutoUseCase(gatewayAdapter);
  const salvarItemConferidoUseCase = new SalvarItemConferidoUseCase(gatewayAdapter);
  const getProdutosDivergentesUseCase = new GetProdutosDivergentesUseCase(gatewayAdapter);
  const salvarVolumeUseCase = new SalvarVolumeUseCase(gatewayAdapter);
  const excluirItemConferidoUseCase = new ExcluirItemConferidoUseCase(gatewayAdapter);
  const finalizarConferenciaUseCase = new FinalizarConferenciaUseCase(gatewayAdapter);
  const cortarNotaUseCase = new CortarNotaUseCase(gatewayAdapter);
  const verificarExcluidosUseCase = new VerificarExcluidosUseCase(gatewayAdapter);

  // 3. Controllers (Presentation)
  const authController = new AuthController(loginUseCase, loginSankhyaUseCase, logoutUseCase, validateSessionUseCase);
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
  );

  // 4. Middleware de autenticação
  const authMiddleware = createAuthMiddleware(tokenAdapter);

  // 5. Montar servidor
  const app = createServer(
    { corsOrigin: appConfig.cors.origin },
    { authController, crudController, apiProxyController, conferenciasController, produtoController },
    authMiddleware,
  );

  return app;
}
