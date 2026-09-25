import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  gateway: {
    url: string;
    clientId: string;
    clientSecret: string;
    xToken: string;
  };
  session: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string;
  };
  logging: {
    level: string;
  };
  discord: {
    webhookUrl: string;
  };
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  gateway: {
    url: process.env.GATEWAY_URL || '',
    clientId: process.env.GATEWAY_CLIENT_ID || '',
    clientSecret: process.env.GATEWAY_CLIENT_SECRET || '',
    xToken: process.env.GATEWAY_X_TOKEN || '',
  },
  session: {
    secret: process.env.SESSION_SECRET || '',
    expiresIn: process.env.SESSION_EXPIRES_IN || '24h',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  },
};

// Validação de configurações obrigatórias
const requiredEnvVars = [
  'GATEWAY_URL',
  'GATEWAY_CLIENT_ID',
  'GATEWAY_CLIENT_SECRET',
  'GATEWAY_X_TOKEN',
  'SESSION_SECRET',
];

const missing = requiredEnvVars.filter((env) => !process.env[env]);

if (missing.length > 0) {
  console.warn(`⚠️  Variáveis de ambiente não configuradas: ${missing.join(', ')}`);
  console.warn('Copie .env.example para .env e configure os valores');
}
