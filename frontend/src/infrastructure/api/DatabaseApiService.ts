import { httpClient } from './httpClient';

export interface TableSummary {
  name: string;
  rowCount: number;
  columnCount: number;
  primaryKeys: string[];
}

export interface TableColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  defaultValue: any;
}

export interface QueryResult {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  columns: TableColumnInfo[];
}

export interface SqlExecutionResult {
  columns: string[];
  rows: any[];
  rowsAffected: number;
  executionTimeMs: number;
}

export interface DatabaseStatus {
  isTursoConfigured: boolean;
  mode: 'turso_replica' | 'sqlite_local';
  databasePath: string;
  syncUrl?: string;
  syncIntervalMs: number;
}

export interface TableDocColumn {
  nome: string;
  tipo: string;
  pk: boolean;
  notnull: boolean;
  descricao: string;
}

export interface TableDoc {
  nome: string;
  descricao: string;
  colunas: TableDocColumn[];
}

export interface DatabaseDocumentation {
  regrasArquiteturais: string[];
  relacionamentos: Array<{
    origem: string;
    cardinalidade: string;
    destino: string;
    chave: string;
    descricao: string;
  }>;
  tabelas: TableDoc[];
}

export class DatabaseApiService {
  async obterStatus(): Promise<DatabaseStatus> {
    const response = await httpClient.get<DatabaseStatus>('/api/database/status');
    return response.data;
  }

  async sincronizar(): Promise<{ sucesso: boolean; mensagem: string }> {
    const response = await httpClient.post<{ sucesso: boolean; mensagem: string }>('/api/database/sync');
    return response.data;
  }

  async obterDocumentacao(): Promise<DatabaseDocumentation> {
    const response = await httpClient.get<DatabaseDocumentation>('/api/database/docs');
    return response.data;
  }

  async listarTabelas(): Promise<TableSummary[]> {
    const response = await httpClient.get<TableSummary[]>('/api/database/tables');
    return response.data;
  }

  async obterSchema(nomeTabela: string): Promise<TableColumnInfo[]> {
    const response = await httpClient.get<TableColumnInfo[]>(`/api/database/tables/${encodeURIComponent(nomeTabela)}/schema`);
    return response.data;
  }

  async consultarRegistros(
    nomeTabela: string,
    params: { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: 'ASC' | 'DESC' } = {},
  ): Promise<QueryResult> {
    const response = await httpClient.get<QueryResult>(`/api/database/tables/${encodeURIComponent(nomeTabela)}/records`, {
      params,
    });
    return response.data;
  }

  async atualizarRegistro(
    nomeTabela: string,
    pk: Record<string, any>,
    data: Record<string, any>,
  ): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.put<{ success: boolean; message: string }>(
      `/api/database/tables/${encodeURIComponent(nomeTabela)}/records`,
      { pk, data },
    );
    return response.data;
  }

  async excluirRegistro(
    nomeTabela: string,
    pk: Record<string, any>,
  ): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.delete<{ success: boolean; message: string }>(
      `/api/database/tables/${encodeURIComponent(nomeTabela)}/records`,
      { data: { pk } },
    );
    return response.data;
  }

  async inserirRegistro(
    nomeTabela: string,
    data: Record<string, any>,
  ): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.post<{ success: boolean; message: string }>(
      `/api/database/tables/${encodeURIComponent(nomeTabela)}/records`,
      { data },
    );
    return response.data;
  }

  async executarQuery(sql: string): Promise<SqlExecutionResult> {
    const response = await httpClient.post<SqlExecutionResult>('/api/database/query', { sql });
    return response.data;
  }
}
