import { IGatewayPort } from '../../domain/ports/IGatewayPort.js';
import {
  IDesmembrarItemNotaService,
  DesmembrarItemInput,
  DesmembrarItemOutput,
} from '../../domain/ports/IDesmembrarItemNotaService.js';

function formatarDataSankhya(val?: string): string | undefined {
  if (!val) return undefined;
  const s = val.trim();
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

export class SankhyaDesmembrarItemService implements IDesmembrarItemNotaService {
  constructor(private readonly gateway: IGatewayPort) {}

  async desmembrarItemPorLote(
    input: DesmembrarItemInput,
    correlationId?: string
  ): Promise<DesmembrarItemOutput> {
    const { nunota, sequenciaOriginal, codprod, lotes, usuario } = input;

    if (!lotes || lotes.length <= 1) {
      return {
        sucesso: true,
        totalFracionado: 0,
        sequenciasCriadas: [sequenciaOriginal],
        mensagem: 'Item possui apenas um lote, não requer desmembramento.',
      };
    }

    console.log(
      `[SankhyaDesmembrarItem] Invocando CACSP.desmembrarItem (NUNOTA=${nunota}, SEQ=${sequenciaOriginal}, PROD=${codprod}) em ${lotes.length} lotes por ${usuario}`
    );

    const lotesPayload = lotes.map((l) => {
      const loteObj: Record<string, any> = {
        QTDNEG: String(l.quantidade),
        $: l.lote ? String(l.lote).trim() : '',
      };
      const dtval = formatarDataSankhya(l.validade);
      if (dtval) loteObj.DTVAL = dtval;
      const dtfab = formatarDataSankhya(l.fabricacao);
      if (dtfab) loteObj.DTFAB = dtfab;
      return loteObj;
    });

    const payloadSankhya = {
      serviceName: 'CACSP.desmembrarItem',
      requestBody: {
        ITEM: {
          NUNOTA: String(nunota),
          SEQUENCIA: String(sequenciaOriginal),
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

    await this.gateway.serviceCall('CACSP.desmembrarItem', payloadSankhya, correlationId, 'mgecom');

    return {
      sucesso: true,
      totalFracionado: lotes.length,
      sequenciasCriadas: [sequenciaOriginal],
      mensagem: `Item desmembrado no Sankhya com sucesso em ${lotes.length} frações.`,
    };
  }
}
