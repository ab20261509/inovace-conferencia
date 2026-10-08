export interface CampoConfiguravel {
  chave: string;
  rotulo: string;
  descricao: string;
  sensivelPadrao: boolean;
}

export interface CatalogoTela {
  idTela: string;
  nomeTela: string;
  descricao: string;
  campos: CampoConfiguravel[];
}

export type CamposSensiveisConfig = Record<string, Record<string, boolean>>;

export interface ConfiguracaoTelasResponse {
  catalogo: CatalogoTela[];
  configuracao: CamposSensiveisConfig;
}
