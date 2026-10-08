import { IConfiguracaoTelasRepository } from '../../../domain/ports/IConfiguracaoTelasRepository.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { AcessoNegadoError, DadosInvalidosError } from '../../../domain/errors/AppError.js';

export interface SalvarConfiguracaoTelaInput {
  codUsuSolicitante: number;
  nomeUsuSolicitante: string;
  idTela: string;
  campos: Record<string, boolean>;
}

export class SalvarConfiguracaoTelaUseCase {
  constructor(
    private readonly configTelasRepo: IConfiguracaoTelasRepository,
    private readonly permissoesRepo: IPermissoesRepository,
  ) {}

  async execute(input: SalvarConfiguracaoTelaInput): Promise<void> {
    if (!input.idTela || !input.campos) {
      throw new DadosInvalidosError('Identificador da tela e campos são obrigatórios');
    }

    const permissoes = await this.permissoesRepo.obterPermissoes(
      input.codUsuSolicitante,
      input.nomeUsuSolicitante,
    );

    if (!permissoes.gerenciar_acessos) {
      throw new AcessoNegadoError('Apenas administradores podem alterar configurações de telas');
    }

    await this.configTelasRepo.salvarCamposSensiveis(
      input.idTela,
      input.campos,
      input.nomeUsuSolicitante,
    );
  }
}
