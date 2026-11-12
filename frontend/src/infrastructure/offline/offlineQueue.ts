/**
 * Fila local de tolerância a falhas de rede (Buffer Offline) para coletores.
 * Permite ao conferente continuar bipando em áreas de sombra de Wi-Fi e
 * sincroniza automaticamente assim que a conexão é restabelecida.
 */

export interface PendingBip {
  id: string;
  tipo: 'saida' | 'entrada';
  nuNota: number;
  codBarra: string;
  quantidade: string;
  timestamp: number;
  extras?: Record<string, any>;
}

const STORAGE_KEY = 'confercheck_offline_bips';

class OfflineQueueService {
  private listeners: Set<() => void> = new Set();
  private onlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.onlineStatus = true;
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.onlineStatus = false;
        this.notify();
      });
    }
  }

  public isOnline(): boolean {
    return this.onlineStatus;
  }

  public getPendingBips(): PendingBip[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getPendingCount(): number {
    return this.getPendingBips().length;
  }

  public enqueue(bip: Omit<PendingBip, 'id' | 'timestamp'>): PendingBip {
    const list = this.getPendingBips();
    const newBip: PendingBip = {
      ...bip,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    list.push(newBip);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar bip offline no localStorage', e);
    }
    this.notify();
    return newBip;
  }

  public remove(id: string): void {
    const list = this.getPendingBips().filter((b) => b.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao atualizar fila offline', e);
    }
    this.notify();
  }

  public clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Erro em listener do offlineQueue:', err);
      }
    });
  }

  /**
   * Processa itens pendentes usando a função executora fornecida.
   */
  public async syncQueue(
    executor: (bip: PendingBip) => Promise<boolean>,
  ): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    const items = this.getPendingBips();
    if (items.length === 0) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const ok = await executor(item);
        if (ok) {
          this.remove(item.id);
          synced++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        break; // Interrompe se o servidor estiver inacessível
      }
    }

    this.isSyncing = false;
    this.notify();
    return { synced, failed };
  }
}

export const offlineQueue = new OfflineQueueService();
