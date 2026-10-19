/**
 * Entidade e tipos de permissões de módulos e acessos por usuário
 */

export interface ModulosUsuario {
  conferencia_saida: boolean;
  conferencia_entrada: boolean;
  conferencia_entrada_n1: boolean;
  conferencia_entrada_n2: boolean;
  conferencia_entrada_n3: boolean;
  conferencia_entrada_divergente?: boolean;
  conferencia_entrada_conferido?: boolean;
  consulta_produtos: boolean;
  ver_campos_sensiveis: boolean;
  gerenciar_acessos: boolean;
}

export interface UsuarioAcesso {
  codUsu: number;
  nomeUsu: string;
  modulos: ModulosUsuario;
  primeiroAcessoEm?: string;
  ultimoAcessoEm?: string;
  atualizadoEm: string;
  atualizadoPor?: string;
}

/**
 * Permissões completas atribuídas a Administradores/Supervisores
 */
export const PERMISSOES_ADMINISTRADOR: ModulosUsuario = {
  conferencia_saida: true,
  conferencia_entrada: true,
  conferencia_entrada_n1: true,
  conferencia_entrada_n2: true,
  conferencia_entrada_n3: true,
  conferencia_entrada_divergente: true,
  conferencia_entrada_conferido: true,
  consulta_produtos: true,
  ver_campos_sensiveis: true,
  gerenciar_acessos: true,
};

/**
 * Permissões padrão para novos operadores/conferentes
 */
export const PERMISSOES_PADRAO_OPERADOR: ModulosUsuario = {
  conferencia_saida: true,
  conferencia_entrada: false,
  conferencia_entrada_n1: true,
  conferencia_entrada_n2: true,
  conferencia_entrada_n3: true,
  conferencia_entrada_divergente: false,
  conferencia_entrada_conferido: false,
  consulta_produtos: true,
  ver_campos_sensiveis: false,
  gerenciar_acessos: false,
};
