import { IConfiguracaoTelasRepository } from '../../../domain/ports/IConfiguracaoTelasRepository.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { CatalogoTela, CamposSensiveisConfig } from '../../../domain/entities/ConfiguracaoTela.js';
import { AcessoNegadoError } from '../../../domain/errors/AppError.js';

export interface ListarConfiguracaoTelasInput {
  codUsuSolicitante: number;
  nomeUsuSolicitante: string;
}

export interface ListarConfiguracaoTelasOutput {
  catalogo: CatalogoTela[];
  configuracao: CamposSensiveisConfig;
}

export class ListarConfiguracaoTelasUseCase {
  constructor(
    private readonly configTelasRepo: IConfiguracaoTelasRepository,
    private readonly permissoesRepo: IPermissoesRepository,
  ) {}

  async execute(input: ListarConfiguracaoTelasInput): Promise<ListarConfiguracaoTelasOutput> {
    const permissoes = await this.permissoesRepo.obterPermissoes(
      input.codUsuSolicitante,
      input.nomeUsuSolicitante,
    );

    if (!permissoes.gerenciar_acessos) {
      throw new AcessoNegadoError('Apenas administradores podem visualizar configurações de telas');
    }

    return await this.configTelasRepo.obterCatalogoEConfiguracao();
  }
}
