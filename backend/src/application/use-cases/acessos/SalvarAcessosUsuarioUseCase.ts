import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { ModulosUsuario, UsuarioAcesso } from '../../../domain/entities/PermissaoUsuario.js';
import { AcessoNegadoError, DadosInvalidosError } from '../../../domain/errors/AppError.js';

export interface SalvarAcessosUsuarioInput {
  codUsuSolicitante: number;
  nomeUsuSolicitante: string;
  codUsuAlvo: number;
  nomeUsuAlvo: string;
  modulos: Partial<ModulosUsuario>;
}

export class SalvarAcessosUsuarioUseCase {
  constructor(private readonly permissoesRepo: IPermissoesRepository) {}

  async execute(input: SalvarAcessosUsuarioInput): Promise<UsuarioAcesso> {
    if (!input.codUsuAlvo || isNaN(input.codUsuAlvo)) {
      throw new DadosInvalidosError('Código de usuário inválido');
    }

    // 1. Valida se o solicitante tem permissão de gerenciar acessos
    const minhasPermissoes = await this.permissoesRepo.obterPermissoes(
      input.codUsuSolicitante,
      input.nomeUsuSolicitante,
    );

    if (!minhasPermissoes.gerenciar_acessos) {
      throw new AcessoNegadoError('Apenas administradores podem alterar permissões');
    }

    // 2. Persiste as novas permissões
    return await this.permissoesRepo.salvarPermissoes(
      input.codUsuAlvo,
      input.nomeUsuAlvo,
      input.modulos,
      input.nomeUsuSolicitante,
    );
  }
}
