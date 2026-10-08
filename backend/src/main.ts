import './presentation/http/types.js';
import { appConfig } from './infrastructure/config/env.js';
import { buildApp } from './container.js';

/**
 * Entry point da aplicação
 * Inicializa o servidor com todas as dependências montadas
 */
async function bootstrap(): Promise<void> {
  try {
    const app = await buildApp();

    app.listen(appConfig.port, () => {
      console.log(`
╔════════════════════════════════════════╗
║  Backend BFF iniciado com sucesso      ║
║  Porta: ${appConfig.port}                         ║
║  Ambiente: ${appConfig.nodeEnv}            ║
║  Gateway: ${appConfig.gateway.url}
║                                        ║
║  http://localhost:${appConfig.port}               ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

bootstrap();
