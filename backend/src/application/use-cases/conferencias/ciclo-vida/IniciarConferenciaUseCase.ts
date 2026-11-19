import { IGatewayPort } from '../../../../domain/ports/IGatewayPort.js';
import { ISeparacaoRepository } from '../../../../domain/ports/ISeparacaoRepository.js';
import { CONFERENCIA_CLIENT_EVENTS } from '../shared/clientEvents.js';

export interface IniciarConferenciaInput {
  nuNota: number;
  codUsu?: number;
  nomeUsu?: string;
  mgeSession?: string;
  iniciarRecontagem?: boolean;
}

export interface IniciarConferenciaOutput {
  numConf: string;
  numNota: string;
  tipMov: string;
  isRecontagem: string;
  tipoContagem: string;
  vendedor: string;
  parceiro: string;
  statusSeparacao?: 'SEPARADO' | 'EM_ANDAMENTO' | 'PENDENTE' | null;
  configuracoes: {
    mostrarProdPed: string;
    autoFeedback: string;
    mostrarProdConf: string;
    mostrarQtdPed: string;
    mostrarQtdConf: string;
    mostrarProdDiver: string;
    mostrarAlertaSonoroDivergencia: string;
    formacaoVolumes: string;
    ignorarComponenteKit: string;
    fatAoConcluir: string;
    mostrarCodBarrasPed: string;
    registrarPeso: string;
    exigeIdentif: string;
    produtosForaPedido: string;
  };
}

/**
 * Use Case: Iniciar conferência de saída
 * Cria registro TGFCON2 e retorna configurações da tela
 */
export class IniciarConferenciaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly separacaoRepo?: ISeparacaoRepository,
  ) {}

  async execute(input: IniciarConferenciaInput, correlationId?: string): Promise<IniciarConferenciaOutput> {
    // 1. Criar a conferência
    const response = await this.gateway.serviceCall<any>(
      'ConferenciaSP.salvarCabecalhoConferencia',
      {
        serviceName: 'ConferenciaSP.salvarCabecalhoConferencia',
        requestBody: {
          params: {
            nuNota: input.nuNota,
            iniciarRecontagem: input.iniciarRecontagem || false,
          },
          ...CONFERENCIA_CLIENT_EVENTS,
        },
      },
      correlationId,
      'mgecom',
    );

    const body = response.responseBody;

    // 2. Atualizar conferente na TGFCAB via DatasetSP.save
    if (input.nomeUsu) {
      try {
        await this.gateway.serviceCall(
          'DatasetSP.save',
          {
            serviceName: 'DatasetSP.save',
            requestBody: {
              entityName: 'CabecalhoNota',
              standAlone: false,
              fields: ['AD_USUARIOCONF'],
              records: [
                {
                  pk: { NUNOTA: input.nuNota },
                  values: { '0': input.nomeUsu },
                },
              ],
            },
          },
          correlationId,
        );
      } catch (err) {
        console.warn('[IniciarConferencia] Falha ao atualizar AD_USUARIOCONF:', (err as Error).message);
      }
    }

    // 3. Consultar status de separação da ordem de carga do pedido
    let statusSeparacao: 'SEPARADO' | 'EM_ANDAMENTO' | 'PENDENTE' | null = null;
    try {
      const sqlSep = `
        SELECT ORD.AD_STATUSSEP, CAB.ORDEMCARGA
        FROM TGFCAB CAB
        LEFT JOIN TGFORD ORD ON ORD.ORDEMCARGA = CAB.ORDEMCARGA AND ORD.CODEMP = CAB.CODEMP
        WHERE CAB.NUNOTA = ${Number(input.nuNota)}
      `;
      const resSep = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlSep } },
        correlationId,
      );
      const rowSep = resSep?.responseBody?.rows?.[0];
      const erpStatusSep = rowSep?.[0] ? String(rowSep[0]).trim().toUpperCase() : null;
      const oc = rowSep?.[1] ? Number(rowSep[1]) : null;

      let localStatus: string | null = null;
      if (oc && this.separacaoRepo) {
        const localSep = await this.separacaoRepo.buscarPorOrdemCarga(oc);
        if (localSep) localStatus = localSep.status;
      }

      if (erpStatusSep === 'F' || localStatus === 'FINALIZADA') {
        statusSeparacao = 'SEPARADO';
      } else if (erpStatusSep === 'E' || localStatus === 'EM_ANDAMENTO') {
        statusSeparacao = 'EM_ANDAMENTO';
      } else if (oc != null && oc > 0) {
        statusSeparacao = 'PENDENTE';
      }
    } catch (err: any) {
      console.warn('[IniciarConferencia] Aviso ao consultar status de separação:', err.message);
    }

    return {
      numConf: body.numConf,
      numNota: body.numNota,
      tipMov: body.tipMov,
      isRecontagem: body.isRecontagem,
      tipoContagem: body.tipoContagem,
      vendedor: body.vendedor?.$ || '',
      parceiro: body.parceiro?.$ || '',
      statusSeparacao,
      configuracoes: {
        mostrarProdPed: body.mostrarProdPed,
        autoFeedback: body.autoFeedback,
        mostrarProdConf: body.mostrarProdConf,
        mostrarQtdPed: body.mostrarQtdPed,
        mostrarQtdConf: body.mostrarQtdConf,
        mostrarProdDiver: body.mostrarProdDiver,
        mostrarAlertaSonoroDivergencia: body.mostrarAlertaSonoroDivergencia,
        formacaoVolumes: body.formacaoVolumes,
        ignorarComponenteKit: body.ignorarComponenteKit,
        fatAoConcluir: body.fatAoConcluir,
        mostrarCodBarrasPed: body.mostrarCodBarrasPed,
        registrarPeso: body.registrarPeso,
        exigeIdentif: body.exigeIdentif,
        produtosForaPedido: body.produtosForaPedido,
      },
    };
  }
}
