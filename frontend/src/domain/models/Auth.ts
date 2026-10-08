export interface ModulosUsuario {
  conferencia_saida: boolean;
  conferencia_entrada: boolean;
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
