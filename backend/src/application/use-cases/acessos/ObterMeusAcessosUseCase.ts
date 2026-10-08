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
    if (input.codUsu && input.nomeUsu) {
      try {
        await this.permissoesRepo.registrarAcesso(input.codUsu, input.nomeUsu);
      } catch (err) {
        console.warn('⚠️ Falha ao registrar acesso:', err);
      }
    }

    const modulos = await this.permissoesRepo.obterPermissoes(input.codUsu, input.nomeUsu);

    return {
      codUsu: input.codUsu,
      nomeUsu: input.nomeUsu,
      modulos,
    };
  }
}
