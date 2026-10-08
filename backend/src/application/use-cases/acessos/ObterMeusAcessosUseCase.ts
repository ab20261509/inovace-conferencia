import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { ModulosUsuario } from '../../../domain/entities/PermissaoUsuario.js';

export interface ObterMeusAcessosInput {
  codUsu: number;
  nomeUsu: string;
}

export interface ObterMeusAcessosOutput {
  codUsu: number;
  nomeUsu: string;
  modulos: ModulosUsuario;
}

export class ObterMeusAcessosUseCase {
  constructor(private readonly permissoesRepo: IPermissoesRepository) {}

  async execute(input: ObterMeusAcessosInput): Promise<ObterMeusAcessosOutput> {
    const modulos = await this.permissoesRepo.obterPermissoes(input.codUsu, input.nomeUsu);

    return {
      codUsu: input.codUsu,
      nomeUsu: input.nomeUsu,
      modulos,
    };
  }
}
