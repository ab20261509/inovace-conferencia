/**
 * Entidade e tipos de permissões de módulos e acessos por usuário
 */

export interface ModulosUsuario {
  conferencia_saida: boolean;
  conferencia_entrada: boolean;
  separacao?: boolean;
  separacao_iniciar?: boolean;
  separacao_bipar?: boolean;
  separacao_finalizar?: boolean;
  separacao_cortar?: boolean;
  reabastecimento?: boolean;
  reabastecimento_confirmar?: boolean;
  reabastecimento_cancelar?: boolean;
  reabastecimento_finalizar_falta?: boolean;
  enderecamento?: boolean;
  enderecamento_visualizar?: boolean;
  enderecamento_manipular?: boolean;
  enderecamento_cadastrar?: boolean;
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
  bipar_por_codprod?: boolean;
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
  separacao: true,
  separacao_iniciar: true,
  separacao_bipar: true,
  separacao_finalizar: true,
  separacao_cortar: true,
  reabastecimento: true,
  reabastecimento_confirmar: true,
  reabastecimento_cancelar: true,
  reabastecimento_finalizar_falta: true,
  enderecamento: true,
  enderecamento_visualizar: true,
  enderecamento_manipular: true,
  enderecamento_cadastrar: true,
  gestao_recebimento: true,
  gestao_recebimento_aba_divergencias: true,
  gestao_recebimento_aba_envio_sankhya: true,
  gestao_recebimento_aba_ocorrencias: true,
  gestao_recebimento_backup: true,
  conferencia_entrada_n1: true,
  conferencia_entrada_n2: true,
  conferencia_entrada_n3: true,
  conferencia_entrada_divergente: true,
  conferencia_entrada_conferido: true,
  consulta_produtos: true,
  ver_campos_sensiveis: true,
  gerenciar_acessos: true,
  bipar_por_codprod: true,
};

/**
 * Permissões padrão para novos operadores/conferentes
 */
export const PERMISSOES_PADRAO_OPERADOR: ModulosUsuario = {
  conferencia_saida: true,
  conferencia_entrada: false,
  separacao: true,
  separacao_iniciar: false,
  separacao_bipar: false,
  separacao_finalizar: false,
  separacao_cortar: false,
  reabastecimento: false,
  reabastecimento_confirmar: false,
  reabastecimento_cancelar: false,
  reabastecimento_finalizar_falta: false,
  enderecamento: true,
  enderecamento_visualizar: true,
  enderecamento_manipular: false,
  enderecamento_cadastrar: false,
  gestao_recebimento: false,
  gestao_recebimento_aba_divergencias: false,
  gestao_recebimento_aba_envio_sankhya: false,
  gestao_recebimento_aba_ocorrencias: false,
  gestao_recebimento_backup: false,
  conferencia_entrada_n1: true,
  conferencia_entrada_n2: true,
  conferencia_entrada_n3: true,
  conferencia_entrada_divergente: false,
  conferencia_entrada_conferido: false,
  consulta_produtos: true,
  ver_campos_sensiveis: false,
  gerenciar_acessos: false,
  bipar_por_codprod: false,
};
