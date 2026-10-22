export interface ModulosUsuario {
  conferencia_saida: boolean;
  conferencia_entrada: boolean;
  gestao_recebimento?: boolean;
  gestao_recebimento_aba_divergencias?: boolean;
  gestao_recebimento_aba_envio_sankhya?: boolean;
  gestao_recebimento_aba_ocorrencias?: boolean;
  gestao_recebimento_backup?: boolean;
  conferencia_entrada_n1: boolean;
  conferencia_entrada_n2: boolean;
  conferencia_entrada_n3: boolean;
  conferencia_entrada_divergente?: boolean;
  conferencia_entrada_conferido?: boolean;
  consulta_produtos: boolean;
  ver_campos_sensiveis: boolean;
  gerenciar_acessos: boolean;
}

export interface UsuarioAcessoInfo {
  codUsu: number;
  nomeUsu: string;
  codGrupo?: number;
  ativo?: string;
  modulos: ModulosUsuario;
  primeiroAcessoEm?: string;
  ultimoAcessoEm?: string;
}

export interface UserSession {
  codUsu: number;
  nomeUsu: string;
  jsessionid: string;
  modulos?: ModulosUsuario;
}

export interface LoginResponse {
  token: string;
  user: UserSession;
}
