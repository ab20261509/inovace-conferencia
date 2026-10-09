import { Client } from '@libsql/client';
import {
  IConfiguracaoSistemaRepository,
  ParametroSistema,
} from '../../domain/ports/IConfiguracaoSistemaRepository.js';
import { AuditService } from '../database/AuditService.js';

export class LibsqlConfiguracaoSistemaRepository implements IConfiguracaoSistemaRepository {
  constructor(
    private readonly client: Client,
    private readonly audit?: AuditService
  ) {}

  async obterParametro(chave: string): Promise<string | null> {
    const res = await this.client.execute({
      sql: `SELECT valor FROM configuracoes_sistema WHERE chave = ?;`,
      args: [chave],
    });

    if (res.rows.length === 0) return null;
    return String(res.rows[0].valor);
  }

  async salvarParametro(chave: string, valor: string, descricao?: string): Promise<void> {
    const agora = new Date().toISOString();

    await this.client.execute({
      sql: `
        INSERT INTO configuracoes_sistema (chave, valor, descricao, atualizado_em)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(chave) DO UPDATE SET
          valor = excluded.valor,
          descricao = COALESCE(excluded.descricao, configuracoes_sistema.descricao),
          atualizado_em = excluded.atualizado_em;
      `,
      args: [chave, valor, descricao || null, agora],
    });

    if (this.audit) {
      await this.audit.registrar({
        usuario: 'SISTEMA',
        acao: 'ATUALIZAR_PARAMETRO',
        recurso: 'configuracoes_sistema',
        detalhes: { chave, valor, descricao },
      });
    }
  }

  async listarParametros(): Promise<Record<string, ParametroSistema>> {
    const res = await this.client.execute(`
      SELECT chave, valor, descricao, atualizado_em FROM configuracoes_sistema;
    `);

    const resultado: Record<string, ParametroSistema> = {};
    for (const r of res.rows) {
      const chave = String(r.chave);
      resultado[chave] = {
        chave,
        valor: String(r.valor),
        descricao: r.descricao ? String(r.descricao) : undefined,
        atualizadoEm: String(r.atualizado_em),
      };
    }

    return resultado;
  }
}
