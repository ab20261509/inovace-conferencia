export interface ParametroSistema {
  chave: string;
  valor: string;
  descricao?: string;
  atualizadoEm: string;
}

export interface IConfiguracaoSistemaRepository {
  obterParametro(chave: string): Promise<string | null>;
  salvarParametro(chave: string, valor: string, descricao?: string): Promise<void>;
  listarParametros(): Promise<Record<string, ParametroSistema>>;
}
