import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';

export interface AlterarLocalItemNotaInput {
  nunota: number;
  sequencia: number;
  codlocal: number;
  conferenciaId?: string;
}

export interface AlterarLocalItemNotaOutput {
  sucesso: boolean;
  mensagem: string;
  nunota: number;
  sequencia: number;
  codlocal: number;
}

export class AlterarLocalItemNotaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo?: IConferenciaEntradaRepository
  ) {}

  async execute(
    input: AlterarLocalItemNotaInput,
    correlationId?: string
  ): Promise<AlterarLocalItemNotaOutput> {
    const nunota = Number(input.nunota);
    const sequencia = Number(input.sequencia);
    const codlocal = Number(input.codlocal);

    if (!nunota || isNaN(nunota)) {
      throw new Error('Número único da nota (nunota) é obrigatório.');
    }
    if (!sequencia || isNaN(sequencia)) {
      throw new Error('Sequência do item na nota é obrigatória.');
    }
    if (isNaN(codlocal)) {
      throw new Error('Código do local de estoque (codlocal) é obrigatório.');
    }

    console.log(
      `[AlterarLocalItemNotaUseCase] Atualizando CODLOCALORIG=${codlocal} para NUNOTA=${nunota}, SEQ=${sequencia}...`
    );

    // 1. Atualizar CODLOCALORIG na tabela TGFITE via DatasetSP.save (ItemNota)
    await this.gateway.serviceCall<any>(
      'DatasetSP.save',
      {
        serviceName: 'DatasetSP.save',
        requestBody: {
          entityName: 'ItemNota',
          standAlone: false,
          fields: ['CODLOCALORIG'],
          records: [
            {
              pk: {
                NUNOTA: String(nunota),
                SEQUENCIA: String(sequencia),
              },
              values: {
                '0': String(codlocal),
              },
            },
          ],
        },
      },
      correlationId
    );

    console.log(
      `[AlterarLocalItemNotaUseCase] Sucesso ao atualizar CODLOCALORIG=${codlocal} (NUNOTA=${nunota}, SEQ=${sequencia}).`
    );

    return {
      sucesso: true,
      mensagem: `Local de estoque atualizado para [${codlocal}] com sucesso!`,
      nunota,
      sequencia,
      codlocal,
    };
  }
}
