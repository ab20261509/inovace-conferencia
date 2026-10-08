import { ModulosUsuario, UsuarioAcesso } from '../entities/PermissaoUsuario.js';

/**
 * Porta de Repositório de Permissões
 *
 * Desacopla o armazenamento de permissões (atualmente arquivo JSON,
 * preparado para migração transparente para banco de dados ou Sankhya).
 */
export interface IPermissoesRepository {
  /**
   * Obtém as permissões de um usuário específico
   */
  obterPermissoes(codUsu: number, nomeUsu: string): Promise<ModulosUsuario>;

  /**
   * Salva ou atualiza as permissões de um usuário específico
   */
  salvarPermissoes(
    codUsu: number,
    nomeUsu: string,
    modulos: Partial<ModulosUsuario>,
    atualizadoPor?: string,
  ): Promise<UsuarioAcesso>;

  /**
   * Registra o acesso de um usuário (cria caso seja 1º acesso e atualiza ultimoAcessoEm)
   */
  registrarAcesso(codUsu: number, nomeUsu: string): Promise<UsuarioAcesso>;

  /**
   * Lista todas as permissões cadastradas
   */
  listarTodas(): Promise<Record<string, UsuarioAcesso>>;
}
