import { IGatewayPort } from '../../../../domain/ports/IGatewayPort.js';

export interface ExcluirItemConferidoInput {
  nuConf: string | number;
  seqConf: string | number;
}

export interface ExcluirItemConferidoOutput {
  sucesso: boolean;
}

/**
 * Use Case: Excluir um item conferido (registro da TGFCOI2)
 *
 * Utiliza DatasetSP.removeRecord com DetalhesConferenciaCRUDListener,
 * disparando a atualização automática dos saldos e divergências da conferência.
 */
export class ExcluirItemConferidoUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(input: ExcluirItemConferidoInput, correlationId?: string): Promise<ExcluirItemConferidoOutput> {
    await this.gateway.serviceCall<any>(
      'DatasetSP.removeRecord',
      {
        serviceName: 'DatasetSP.removeRecord',
        requestBody: {
          dataSetID: '007',
          entityName: 'DetalhesConferencia',
          standAlone: false,
          pks: [
            {
              NUCONF: String(input.nuConf),
              SEQCONF: String(input.seqConf),
            },
          ],
          crudListener: 'br.com.sankhya.modelcore.crudlisteners.DetalhesConferenciaCRUDListener',
          ignoreListenerMethods: '',
          clientEventList: {
            clientEvent: [
              { $: 'fila.conferencia.client.event.produtos.divergentes' },
              { $: 'client.event.produtos.escolha.unidade.mov.armazenamento' },
              { $: 'client.event.escolha.empresa.local.destino' },
              { $: 'client.event.produtos.excluidos.conferencia' },
              { $: 'client.event.volumes.produto.recontado' },
              { $: 'br.com.sankhya.mgecom.busca.identificador.produto' },
              { $: 'conferencia.lista.produtos.divergentes' },
              { $: 'client.event.escolha.etiqueta.peso' },
            ],
          },
        },
      },
      correlationId,
      'mge',
    );

    return { sucesso: true };
  }
}
