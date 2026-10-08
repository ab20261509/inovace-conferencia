import { Client } from '@libsql/client';
import {
  IDatabaseExplorerRepository,
  TableSummary,
  TableColumnInfo,
  QueryParams,
  QueryResult,
  SqlExecutionResult,
  DatabaseStatus,
  DatabaseDocumentation,
} from '../../domain/ports/IDatabaseExplorerRepository.js';
import { AuditService } from '../database/AuditService.js';
import { appConfig } from '../config/env.js';
import { getLocalDatabasePath, syncDatabase } from '../database/libsqlClient.js';
import { SCHEMA_DOCUMENTATION } from '../database/schema.js';
import { DadosInvalidosError } from '../../domain/errors/AppError.js';

export class LibsqlDatabaseExplorerRepository implements IDatabaseExplorerRepository {
  constructor(
    private readonly client: Client,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Valida se o nome da tabela existe no SQLite para evitar qualquer injeção de identificadores.
   */
  private async validarNomeTabela(nomeTabela: string): Promise<string> {
    const limpo = nomeTabela.trim();
    const result = await this.client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;`,
      args: [limpo],
    });

    if (result.rows.length === 0) {
      throw new DadosInvalidosError(`Tabela '${limpo}' não existe ou não é permitida.`);
    }

    return limpo;
  }

  async listarTabelas(): Promise<TableSummary[]> {
    const result = await this.client.execute(
      `SELECT name FROM sqlite_master 
       WHERE type = 'table' 
         AND name NOT LIKE 'sqlite_%' 
         AND name NOT LIKE '_litestream_%' 
       ORDER BY name;`
    );

    const summaries: TableSummary[] = [];

    for (const row of result.rows) {
      const tableName = String(row.name);
      try {
        const info = await this.client.execute(`PRAGMA table_info("${tableName}");`);
        const countRes = await this.client.execute(`SELECT COUNT(*) as total FROM "${tableName}";`);
        const rowCount = Number(countRes.rows[0]?.total ?? 0);

        const primaryKeys = info.rows
          .filter((col: any) => Number(col.pk) > 0)
          .map((col: any) => String(col.name));

        summaries.push({
          name: tableName,
          rowCount,
          columnCount: info.rows.length,
          primaryKeys,
        });
      } catch (err: any) {
        console.warn(`Erro ao inspecionar tabela ${tableName}:`, err.message);
      }
    }

    return summaries;
  }

  async obterEstruturaTabela(nomeTabela: string): Promise<TableColumnInfo[]> {
    const validTable = await this.validarNomeTabela(nomeTabela);
    const info = await this.client.execute(`PRAGMA table_info("${validTable}");`);

    return info.rows.map((row: any) => ({
      name: String(row.name),
      type: String(row.type || 'TEXT'),
      notnull: Boolean(row.notnull),
      pk: Number(row.pk) > 0,
      defaultValue: row.dflt_value,
    }));
  }

  async consultarRegistros(nomeTabela: string, params: QueryParams): Promise<QueryResult> {
    const validTable = await this.validarNomeTabela(nomeTabela);
    const columns = await this.obterEstruturaTabela(validTable);

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const columnNames = columns.map((c) => c.name);
    const whereClauses: string[] = [];
    const args: any[] = [];

    // Filtro de busca textual em todas as colunas
    if (params.search && params.search.trim() !== '') {
      const termo = `%${params.search.trim()}%`;
      const orClauses = columnNames.map((col) => `"${col}" LIKE ?`);
      whereClauses.push(`(${orClauses.join(' OR ')})`);
      for (let i = 0; i < columnNames.length; i++) {
        args.push(termo);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Contagem total
    const countQuery = `SELECT COUNT(*) as total FROM "${validTable}" ${whereSql};`;
    const countResult = await this.client.execute({ sql: countQuery, args: [...args] });
    const total = Number(countResult.rows[0]?.total ?? 0);

    // Ordenação segura
    let sortColumn = columns.find((c) => c.pk)?.name || 'rowid';
    if (params.sortBy && columnNames.includes(params.sortBy)) {
      sortColumn = params.sortBy;
    }
    const sortDirection = params.sortDir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Query paginada
    const selectQuery = `SELECT * FROM "${validTable}" ${whereSql} ORDER BY "${sortColumn}" ${sortDirection} LIMIT ? OFFSET ?;`;
    const rowsResult = await this.client.execute({
      sql: selectQuery,
      args: [...args, limit, offset],
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      rows: rowsResult.rows,
      total,
      page,
      limit,
      totalPages,
      columns,
    };
  }

  async atualizarRegistro(
    nomeTabela: string,
    pk: Record<string, any>,
    valores: Record<string, any>,
    usuario: string,
  ): Promise<void> {
    const validTable = await this.validarNomeTabela(nomeTabela);
    const columns = await this.obterEstruturaTabela(validTable);
    const columnMap = new Map(columns.map((c) => [c.name, c]));

    const pkEntries = Object.entries(pk);
    if (pkEntries.length === 0) {
      throw new DadosInvalidosError('Chave primária não fornecida para atualização.');
    }

    // Valida se as colunas da chave primária existem
    for (const [pkKey] of pkEntries) {
      if (!columnMap.has(pkKey)) {
        throw new DadosInvalidosError(`Coluna de chave primária '${pkKey}' não existe na tabela.`);
      }
    }

    // Filtra apenas colunas válidas que não são PK e estão sendo atualizadas
    const updateEntries = Object.entries(valores).filter(([key]) => columnMap.has(key));
    if (updateEntries.length === 0) {
      throw new DadosInvalidosError('Nenhum campo válido fornecido para atualização.');
    }

    const setClauses: string[] = [];
    const args: any[] = [];

    for (const [col, val] of updateEntries) {
      setClauses.push(`"${col}" = ?`);
      args.push(val === undefined ? null : val);
    }

    const whereClauses: string[] = [];
    for (const [pkCol, pkVal] of pkEntries) {
      whereClauses.push(`"${pkCol}" = ?`);
      args.push(pkVal);
    }

    const updateSql = `UPDATE "${validTable}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`;

    await this.client.execute({ sql: updateSql, args });

    await this.auditService.registrar({
      usuario: usuario || 'Admin',
      acao: 'DATABASE_UPDATE',
      recurso: validTable,
      detalhes: {
        pk,
        camposAtualizados: valores,
      },
    });
  }

  async excluirRegistro(
    nomeTabela: string,
    pk: Record<string, any>,
    usuario: string,
  ): Promise<void> {
    const validTable = await this.validarNomeTabela(nomeTabela);
    const columns = await this.obterEstruturaTabela(validTable);
    const columnMap = new Map(columns.map((c) => [c.name, c]));

    const pkEntries = Object.entries(pk);
    if (pkEntries.length === 0) {
      throw new DadosInvalidosError('Chave primária não fornecida para exclusão.');
    }

    for (const [pkKey] of pkEntries) {
      if (!columnMap.has(pkKey)) {
        throw new DadosInvalidosError(`Coluna de chave '${pkKey}' não existe na tabela.`);
      }
    }

    const whereClauses: string[] = [];
    const args: any[] = [];

    for (const [pkCol, pkVal] of pkEntries) {
      whereClauses.push(`"${pkCol}" = ?`);
      args.push(pkVal);
    }

    const deleteSql = `DELETE FROM "${validTable}" WHERE ${whereClauses.join(' AND ')};`;
    await this.client.execute({ sql: deleteSql, args });

    await this.auditService.registrar({
      usuario: usuario || 'Admin',
      acao: 'DATABASE_DELETE',
      recurso: validTable,
      detalhes: { pk },
    });
  }

  async inserirRegistro(
    nomeTabela: string,
    valores: Record<string, any>,
    usuario: string,
  ): Promise<void> {
    const validTable = await this.validarNomeTabela(nomeTabela);
    const columns = await this.obterEstruturaTabela(validTable);
    const columnMap = new Map(columns.map((c) => [c.name, c]));

    const entries = Object.entries(valores).filter(([key]) => columnMap.has(key));
    if (entries.length === 0) {
      throw new DadosInvalidosError('Nenhum campo válido fornecido para inserção.');
    }

    const colNames = entries.map(([col]) => `"${col}"`).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const args = entries.map(([, val]) => (val === undefined ? null : val));

    const insertSql = `INSERT INTO "${validTable}" (${colNames}) VALUES (${placeholders});`;
    await this.client.execute({ sql: insertSql, args });

    await this.auditService.registrar({
      usuario: usuario || 'Admin',
      acao: 'DATABASE_INSERT',
      recurso: validTable,
      detalhes: { valores },
    });
  }

  async executarQuerySql(sql: string, usuario: string): Promise<SqlExecutionResult> {
    const sqlLimpo = sql.trim();
    if (!sqlLimpo) {
      throw new DadosInvalidosError('Query SQL vazia.');
    }

    const startTime = performance.now();
    const result = await this.client.execute(sqlLimpo);
    const executionTimeMs = Math.round(performance.now() - startTime);

    const columns = result.columns || [];
    const rows = result.rows || [];
    const rowsAffected = result.rowsAffected || 0;

    // Se a query envolver mutação de dados ou DDL, audita a operação
    const isMutation = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)/i.test(sqlLimpo);
    if (isMutation) {
      await this.auditService.registrar({
        usuario: usuario || 'Admin',
        acao: 'DATABASE_RAW_QUERY',
        recurso: 'TERMINAL_SQL',
        detalhes: { sql: sqlLimpo, rowsAffected },
      });
    }

    return {
      columns,
      rows,
      rowsAffected,
      executionTimeMs,
    };
  }

  async obterStatus(): Promise<DatabaseStatus> {
    const isTursoConfigured = Boolean(appConfig.turso.databaseUrl && appConfig.turso.authToken);
    const dbPath = getLocalDatabasePath();

    return {
      isTursoConfigured,
      mode: isTursoConfigured ? 'turso_replica' : 'sqlite_local',
      databasePath: dbPath,
      syncUrl: appConfig.turso.databaseUrl,
      syncIntervalMs: appConfig.turso.syncIntervalMs,
    };
  }

  async sincronizar(): Promise<{ sucesso: boolean; mensagem: string }> {
    const sincronizou = await syncDatabase();
    if (sincronizou) {
      return { sucesso: true, mensagem: 'Sincronização com o cluster Turso concluída com sucesso!' };
    }
    if (!appConfig.turso.databaseUrl) {
      return {
        sucesso: false,
        mensagem: 'Replicação na nuvem não configurada. O sistema opera exclusivamente no SQLite local.',
      };
    }
    return {
      sucesso: false,
      mensagem: 'Não foi possível sincronizar no momento. O banco continuará operando localmente.',
    };
  }

  async obterDocumentacao(): Promise<DatabaseDocumentation> {
    return SCHEMA_DOCUMENTATION;
  }
}
