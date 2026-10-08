import fs from 'node:fs';
import path from 'node:path';
import { createClient, Client } from '@libsql/client';
import { appConfig } from '../config/env.js';

let clientInstance: Client | null = null;
let syncIntervalTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Resolve o caminho físico do arquivo SQLite local (.db).
 * Garante compatibilidade tanto em contêiner Docker (/app/data) quanto localmente no Node.
 */
export function getLocalDatabasePath(): string {
  if (appConfig.turso.localDbPath) {
    return path.resolve(appConfig.turso.localDbPath);
  }

  const dockerPath = '/app/data/confercheck.db';
  const rootLocalPath = path.resolve(process.cwd(), 'backend/data/confercheck.db');
  const localPath = path.resolve(process.cwd(), 'data/confercheck.db');

  if (fs.existsSync('/app/data')) {
    return dockerPath;
  }
  if (fs.existsSync(path.resolve(process.cwd(), 'backend/data')) || fs.existsSync(path.resolve(process.cwd(), 'backend'))) {
    return rootLocalPath;
  }
  return localPath;
}

/**
 * Cria ou retorna o singleton do cliente libSQL / Turso.
 *
 * Configuração:
 * - Se TURSO_DATABASE_URL e TURSO_AUTH_TOKEN estiverem definidos: opera como Embedded Replica
 *   (banco local ultra-rápido sincronizando periodicamente com o cluster Turso na nuvem via TLS 1.3).
 * - Se não estiverem definidos: opera como SQLite local com o mesmo motor libSQL,
 *   garantindo 100% de disponibilidade mesmo sem internet.
 */
export function getLibsqlClient(): Client {
  if (clientInstance) {
    return clientInstance;
  }

  const dbPath = getLocalDatabasePath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn('⚠️ Não foi possível criar diretório para banco SQLite:', dir, err);
    }
  }

  const hasTursoConfig = Boolean(appConfig.turso.databaseUrl && appConfig.turso.authToken);

  if (hasTursoConfig) {
    console.log(`📡 [libSQL/Turso] Conectando com Embedded Replica: local=${dbPath} | sync=${appConfig.turso.databaseUrl}`);
    clientInstance = createClient({
      url: `file:${dbPath.replace(/\\/g, '/')}`,
      syncUrl: appConfig.turso.databaseUrl,
      authToken: appConfig.turso.authToken,
    });
  } else {
    console.log(`💾 [libSQL/SQLite] Operando em modo Local-Only: ${dbPath}`);
    clientInstance = createClient({
      url: `file:${dbPath.replace(/\\/g, '/')}`,
    });
  }

  return clientInstance;
}

/**
 * Força sincronização imediata da réplica local com a nuvem Turso.
 * Se o modo Turso não estiver ativo ou a rede oscilar, trata a falha de forma graciosa.
 */
export async function syncDatabase(): Promise<boolean> {
  if (!clientInstance || !appConfig.turso.databaseUrl) {
    return false;
  }

  try {
    if (typeof (clientInstance as any).sync === 'function') {
      await (clientInstance as any).sync();
      return true;
    }
  } catch (err: any) {
    console.warn('⚠️ [Turso Sync] Falha temporária na sincronização com nuvem (operando offline):', err.message);
  }
  return false;
}

/**
 * Inicia loop seguro de sincronização periódica em background.
 */
export function startAutoSync(): void {
  if (!appConfig.turso.databaseUrl || syncIntervalTimer) {
    return;
  }

  const intervalMs = Math.max(10000, appConfig.turso.syncIntervalMs || 30000);
  console.log(`⏱️ [Turso Sync] Sincronização periódica ativa (intervalo: ${intervalMs / 1000}s)`);

  syncIntervalTimer = setInterval(async () => {
    await syncDatabase();
  }, intervalMs);
}

/**
 * Encerra o agendamento de sincronização
 */
export function stopAutoSync(): void {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
    syncIntervalTimer = null;
  }
}
