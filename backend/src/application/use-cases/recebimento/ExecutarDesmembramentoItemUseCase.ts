import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ListarDivergenciasEntradaUseCase } from './ListarDivergenciasEntradaUseCase.js';

export interface LoteDesmembramentoInput {
  lote: string;
  qtd: number;
  dtval?: string;
  dtfab?: string;
}

export interface ExecutarDesmembramentoInput {
  conferenciaId: string;
  nunota: number;
  sequencia: number;
  lotes: LoteDesmembramentoInput[];
}

export interface ExecutarDesmembramentoOutput {
  sucesso: boolean;
  mensagem: string;
  divergencias?: any[];
}

function formatarDataSankhya(dataStr?: string): string | undefined {
  if (!dataStr) return undefined;
  const s = dataStr.trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [ano, mes, dia] = s.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    return s.substring(0, 10);
  }
  return s;
}

export class ExecutarDesmembramentoItemUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly gateway: IGatewayPort,
    private readonly listarDivergenciasUseCase: ListarDivergenciasEntradaUseCase
  ) {}

  async execute(
    input: ExecutarDesmembramentoInput,
    correlationId?: string
  ): Promise<ExecutarDesmembramentoOutput> {
    const rawId = input.conferenciaId.includes('_')
      ? input.conferenciaId.split('_')[0]
      : input.conferenciaId;

    const sessao = await this.conferenciaRepo.obterSessaoPorId(rawId);
    if (!sessao) {
      throw new Error(`Conferência de entrada ${rawId} não encontrada.`);
    }

    const nunota = Number(input.nunota);
    if (!nunota) {
      throw new Error('Número único da nota (nunota) é obrigatório.');
    }

    const sequencia = Number(input.sequencia);
    if (!sequencia) {
      throw new Error('Sequência do item na nota é obrigatória.');
    }

    if (!input.lotes || input.lotes.length === 0) {
      throw new Error('É necessário fornecer pelo menos uma fração de lote para desmembrar.');
    }

    // Monta a lista de LOTES no formato esperado pelo CACSP.desmembrarItem
    const lotesPayload = input.lotes.map((item) => {
      const loteObj: Record<string, any> = {
        QTDNEG: String(item.qtd),
        $: item.lote ? String(item.lote).trim() : '',
      };
      const dtvalFormatada = formatarDataSankhya(item.dtval);
      if (dtvalFormatada) {
        loteObj.DTVAL = dtvalFormatada;
      }
      const dtfabFormatada = formatarDataSankhya(item.dtfab);
      if (dtfabFormatada) {
        loteObj.DTFAB = dtfabFormatada;
      }
      return loteObj;
    });

    const payloadSankhya = {
      serviceName: 'CACSP.desmembrarItem',
      requestBody: {
        ITEM: {
          NUNOTA: String(nunota),
          SEQUENCIA: String(sequencia),
          ehVenda: 'false',
          LOTES: {
            LOTE: lotesPayload,
          },
        },
        clientEventList: {
          clientEvent: [
            { $: 'br.com.sankhya.comercial.recalcula.pis.cofins' },
            { $: 'br.com.sankhya.actionbutton.clientconfirm' },
            { $: 'br.com.sankhya.aprovar.nota.apos.baixa' },
            { $: 'br.com.sankhya.exibir.variacao.valor.item' },
            { $: 'br.com.sankhya.mgecom.compra.SolicitacaoComprador' },
            { $: 'br.com.sankhya.mgecom.valida.ChaveNFeCompraTerceiros' },
            { $: 'br.com.sankhya.mgecom.expedicao.SolicitarUsuarioConferente' },
            { $: 'br.com.sankhya.mgecom.nota.adicional.SolicitarUsuarioGerente' },
            { $: 'br.com.sankhya.mgecomercial.event.cadastrarDistancia' },
            { $: 'br.com.sankhya.mgecomercial.event.baixaPortal' },
            { $: 'br.com.sankhya.mgecomercial.event.faturamento.confirmacao' },
            { $: 'br.com.sankhya.mgecomercial.event.compensacao.credito.debito' },
            { $: 'br.com.utiliza.dtneg.servidor' },
            { $: 'br.com.sankhya.mgefin.solicitacao.liberacao.orcamento' },
            { $: 'br.com.sankhya.exibe.msg.variacao.preco' },
            { $: 'br.com.sankhya.importacaoxml.cfi.para.produto' },
            { $: 'br.com.sankhya.mgecom.parcelas.financeiro' },
            { $: 'br.com.sankhya.mgecom.cancelamento.notas.remessa' },
            { $: 'comercial.status.nfcom.situacao.diferente' },
            { $: 'br.com.sankhya.comercial.solicitaContingencia' },
            { $: 'comercial.status.nfe.aceita.naoSomarItem' },
            { $: 'br.com.sankhya.modelcore.comercial.centrais.alteracao.pedido.venda.mais' },
            { $: 'br.com.sankhya.modelcore.comercial.centrais.alteracao.pedido.venda.mais.sem.limite' },
            { $: 'central.save.grade.itens.mostrar.popup.serie' },
            { $: 'central.save.grade.itens.mostrar.popup.info.lote' },
            { $: 'br.com.sankhya.mgecom.central.itens.VendaCasada' },
            { $: 'br.com.sankhya.exclusao.gradeProduto' },
            { $: 'br.com.sankhya.mgecomercial.event.estoque.componentes' },
            { $: 'br.com.sankhya.mgecom.verifica.existe.op.criada.para.item.nota' },
            { $: 'br.com.sankhya.mgecomercial.event.estoque.insuficiente.produto' },
            { $: 'br.com.sankhya.mgecom.central.itens.KitRevenda' },
            { $: 'br.com.sankhya.mgecom.central.itens.KitRevenda.msgValidaFormula' },
            { $: 'br.com.sankhya.mgecom.imobilizado' },
            { $: 'br.com.sankhya.mgecom.item.multiplos.componentes.servico' },
            { $: 'br.com.sankhya.mgecom.coleta.entrega.recalculado' },
            { $: 'br.com.sankhya.central.alteracao.moeda.cabecalho' },
            { $: 'br.com.sankhya.mgecom.event.troca.item.por.produto.substituto' },
            { $: 'br.com.sankhya.mgecom.event.troca.item.por.produto.alternativo' },
            { $: 'br.com.sankhya.modelcore.comercial.centrais.alteracao.pedido.venda.mais.item' },
            { $: 'br.com.sankhya.modelcore.comercial.centrais.alteracao.pedido.venda.mais.item.sem.limite' },
            { $: 'br.com.sankhya.mgeprod.producao.terceiro.inclusao.item.nota' },
          ],
        },
      },
    };

    console.log(`[ExecutarDesmembramentoItemUseCase] Invocando CACSP.desmembrarItem no Sankhya (NUNOTA=${nunota}, SEQ=${sequencia})...`);

    // Invocação do serviço Sankhya via módulo mgecom
    const resp = await this.gateway.serviceCall<any>(
      'CACSP.desmembrarItem',
      payloadSankhya,
      correlationId,
      'mgecom'
    );

    console.log(`[ExecutarDesmembramentoItemUseCase] Resposta do Sankhya: status=${resp?.status}`);

    // Reavaliar divergências de entrada no banco/memória
    const divergenciasAtualizadas = await this.listarDivergenciasUseCase.execute(correlationId);

    return {
      sucesso: true,
      mensagem: `Item da Nota ${nunota} desmembrado com sucesso no Sankhya!`,
      divergencias: divergenciasAtualizadas,
    };
  }
}
