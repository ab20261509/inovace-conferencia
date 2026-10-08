import { randomUUID } from 'node:crypto';
import { Client } from '@libsql/client';

export interface AuditLogInput {
  usuario: string;
  acao: string;
  recurso: string;
  detalhes?: Record<string, any> | string;
}

export class AuditService {
  constructor(private readonly client: Client) {}

  /**
   * Grava um registro de auditoria na tabela logs_auditoria usando Prepared Statement.
   */
  async registrar(input: AuditLogInput): Promise<void> {
    try {
      const id = randomUUID();
      const timestamp = new Date().toISOString();
      const detalhesJson =
        typeof input.detalhes === 'object'
          ? JSON.stringify(input.detalhes)
          : input.detalhes || null;

      await this.client.execute({
        sql: `INSERT INTO logs_auditoria (id, usuario, acao, recurso, detalhes_json, timestamp)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          input.usuario || 'Sistema',
          input.acao,
          input.recurso,
          detalhesJson,
          timestamp,
        ],
      });
    } catch (err: any) {
      console.error('❌ [AuditService] Falha ao gravar log de auditoria:', err.message);
    }
  }
}
