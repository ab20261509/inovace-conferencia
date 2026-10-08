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

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
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

export interface IDatabaseExplorerRepository {
  listarTabelas(): Promise<TableSummary[]>;
  obterEstruturaTabela(nomeTabela: string): Promise<TableColumnInfo[]>;
  consultarRegistros(nomeTabela: string, params: QueryParams): Promise<QueryResult>;
  atualizarRegistro(
    nomeTabela: string,
    pk: Record<string, any>,
    valores: Record<string, any>,
    usuario: string,
  ): Promise<void>;
  excluirRegistro(
    nomeTabela: string,
    pk: Record<string, any>,
    usuario: string,
  ): Promise<void>;
  inserirRegistro(
    nomeTabela: string,
    valores: Record<string, any>,
    usuario: string,
  ): Promise<void>;
  executarQuerySql(sql: string, usuario: string): Promise<SqlExecutionResult>;
  obterStatus(): Promise<DatabaseStatus>;
  sincronizar(): Promise<{ sucesso: boolean; mensagem: string }>;
  obterDocumentacao(): Promise<DatabaseDocumentation>;
}
