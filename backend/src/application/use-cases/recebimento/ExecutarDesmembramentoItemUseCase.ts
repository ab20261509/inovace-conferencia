import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ListarDivergenciasEntradaUseCase } from './ListarDivergenciasEntradaUseCase.js';
import { IOcorrenciaConferenciaEntradaRepository } from '../../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';

export interface LoteDesmembramentoInput {
  lote: string;
  qtd: number;
  dtval?: string;
  dtfab?: string;
  codlocal?: number;
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
    private readonly listarDivergenciasUseCase: ListarDivergenciasEntradaUseCase,
    private readonly ocorrenciaRepo?: IOcorrenciaConferenciaEntradaRepository
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

    // 1. Obter dados do item original na TGFITE (CODPROD, CODVOL, QTDNEG)
    const sqlItem = `
SELECT
    ITE.NUNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(ITE.CODVOL, 'UN') AS CODVOL,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    ITE.CONTROLE
FROM TGFITE ITE
WHERE ITE.NUNOTA = ${nunota} AND ITE.SEQUENCIA = ${sequencia}
    `.trim();

    const respItem = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlItem } },
      correlationId
    );

    const rowsItem: any[] = respItem?.responseBody?.rows || [];
    const fieldsItem: any[] = respItem?.responseBody?.fieldsMetadata || [];
    const fieldIndexItem: Record<string, number> = {};
    fieldsItem.forEach((f: any, idx: number) => {
      fieldIndexItem[f.name.toUpperCase()] = idx;
    });

    const codprod = rowsItem.length > 0 ? Number(rowsItem[0][fieldIndexItem['CODPROD']]) : undefined;
    const codvol = rowsItem.length > 0 ? String(rowsItem[0][fieldIndexItem['CODVOL']] || 'UN') : 'UN';

    // 2. Verificar se existe fator de conversão de volume no TGFVOA
    let fatorVolume = 1;
    let operacaoVolume = 'M';
    if (codprod) {
      const sqlVoa = `
SELECT
    NVL(VOA.DIVIDEMULTIPLICA, 'M') AS DIVIDEMULTIPLICA,
    NVL(VOA.QUANTIDADE, 1) AS QUANTIDADE
FROM TGFVOA VOA
WHERE (VOA.ATIVO IS NULL OR VOA.ATIVO = 'S')
  AND VOA.CODPROD = ${codprod}
  AND VOA.CODVOL = '${codvol}'
      `.trim();

      const respVoa = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlVoa } },
        correlationId
      );
      const rowsVoa: any[] = respVoa?.responseBody?.rows || [];
      const fieldsVoa: any[] = respVoa?.responseBody?.fieldsMetadata || [];
      const fieldIndexVoa: Record<string, number> = {};
      fieldsVoa.forEach((f: any, idx: number) => {
        fieldIndexVoa[f.name.toUpperCase()] = idx;
      });

      if (rowsVoa.length > 0) {
        fatorVolume = Number(rowsVoa[0][fieldIndexVoa['QUANTIDADE']]) || 1;
        operacaoVolume = String(rowsVoa[0][fieldIndexVoa['DIVIDEMULTIPLICA']] || 'M').toUpperCase();
      }
    }

    // 3. Monta a lista de LOTES com a quantidade convertida conforme a expectativa do CACSP.desmembrarItem
    const lotesPayload = input.lotes.map((item) => {
      let qtdSankhya = Number(item.qtd);
      if (fatorVolume > 1) {
        if (operacaoVolume === 'M') {
          qtdSankhya = Number((Number(item.qtd) / fatorVolume).toFixed(6));
        } else if (operacaoVolume === 'D') {
          qtdSankhya = Number((Number(item.qtd) * fatorVolume).toFixed(6));
        }
      }

      const loteObj: Record<string, any> = {
        QTDNEG: String(qtdSankhya),
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

    console.log(
      `[ExecutarDesmembramentoItemUseCase] Invocando CACSP.desmembrarItem no Sankhya (NUNOTA=${nunota}, SEQ=${sequencia}, FATOR=${fatorVolume})...`
    );

    // Invocação do serviço Sankhya via módulo mgecom
    const resp = await this.gateway.serviceCall<any>(
      'CACSP.desmembrarItem',
      payloadSankhya,
      correlationId,
      'mgecom'
    );

    console.log(`[ExecutarDesmembramentoItemUseCase] Resposta do Sankhya: status=${resp?.status}`);

    // 4. Reatribuir sequências nas bipagens locais com base nas novas sequências criadas no Sankhya
    if (codprod) {
      const sqlItensAtualizados = `
SELECT
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    ITE.CONTROLE
FROM TGFITE ITE
WHERE ITE.NUNOTA = ${nunota} AND ITE.CODPROD = ${codprod}
ORDER BY ITE.SEQUENCIA
      `.trim();

      const respNovosItens = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlItensAtualizados } },
        correlationId
      );

      const rowsNovos: any[] = respNovosItens?.responseBody?.rows || [];
      const fieldsNovos: any[] = respNovosItens?.responseBody?.fieldsMetadata || [];
      const fieldIndexNovos: Record<string, number> = {};
      fieldsNovos.forEach((f: any, idx: number) => {
        fieldIndexNovos[f.name.toUpperCase()] = idx;
      });

      const itensTGFITE = rowsNovos.map((r) => ({
        sequencia: Number(r[fieldIndexNovos['SEQUENCIA']]),
        controle: r[fieldIndexNovos['CONTROLE']] ? String(r[fieldIndexNovos['CONTROLE']]).trim() : undefined,
        qtdneg: Number(r[fieldIndexNovos['QTDNEG']] || 0),
      }));

      await this.conferenciaRepo.reatribuirSequenciasBipagens(rawId, nunota, codprod, itensTGFITE);

      // 4.1 Se houver frações com CODLOCAL customizado (ex: Avaria, Vencidos), atualizar CODLOCALORIG na TGFITE
      for (let i = 0; i < input.lotes.length; i++) {
        const fracao = input.lotes[i];
        if (fracao.codlocal && itensTGFITE[i]) {
          const seqAlvo = itensTGFITE[i].sequencia;
          try {
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
                        SEQUENCIA: String(seqAlvo),
                      },
                      values: {
                        '0': String(fracao.codlocal),
                      },
                    },
                  ],
                },
              },
              correlationId
            );
          } catch (eLocal: any) {
            console.warn(`[ExecutarDesmembramentoItemUseCase] Aviso ao atualizar CODLOCALORIG=${fracao.codlocal} na SEQ=${seqAlvo}:`, eLocal?.message);
          }
        }
      }

      // 4.2 Sincronizar ocorrências pendentes (Avaria, Vencidos, Shelf-Life):
      // Refletir o CODLOCAL escolhido na ocorrência e marcá-la como RESOLVIDO
      if (this.ocorrenciaRepo && nunota) {
        try {
          const ocorrenciasDaNota = await this.ocorrenciaRepo.listarPorNuNota(nunota);
          const ocorrenciasPendentes = ocorrenciasDaNota.filter(
            (oc) => oc.status === 'PENDENTE' || oc.status === 'RESOLVIDO'
          );

          for (const fracao of input.lotes) {
            const loteFracao = fracao.lote ? fracao.lote.trim().toUpperCase() : '';

            // Encontra ocorrência com o mesmo lote ou para o mesmo codprod de Avaria/Vencido/Validade Próxima
            const ocAlvo = ocorrenciasPendentes.find(
              (oc) =>
                (loteFracao && oc.lote && oc.lote.trim().toUpperCase() === loteFracao) ||
                (codprod && oc.codprod === codprod && ['AVARIA', 'VENCIDO', 'VALIDADE_PROXIMA'].includes(oc.tipo))
            );

            if (ocAlvo) {
              const dadosAtualizar: any = {
                status: 'RESOLVIDO',
              };
              if (fracao.codlocal !== undefined && fracao.codlocal !== null) {
                dadosAtualizar.codlocalDestino = Number(fracao.codlocal);
              }
              await this.ocorrenciaRepo.atualizar(ocAlvo.id, dadosAtualizar);
              console.log(
                `[ExecutarDesmembramentoItemUseCase] Ocorrência ${ocAlvo.id} (${ocAlvo.tipo}) atualizada com Local ${fracao.codlocal} e status RESOLVIDO.`
              );
            }
          }
        } catch (eOc: any) {
          console.warn('[ExecutarDesmembramentoItemUseCase] Aviso ao sincronizar ocorrências no desmembramento:', eOc?.message);
        }
      }
    }

    // 5. Reavaliar divergências de entrada no banco/memória
    const divergenciasAtualizadas = await this.listarDivergenciasUseCase.execute(correlationId);

    // Se para esta nota não houver mais divergências pendentes no grupo retornado
    const grupoNota = divergenciasAtualizadas.find((g: any) => Number(g.nunota) === nunota);
    const temDivergenciaRestante = Boolean(
      grupoNota && grupoNota.itensDivergentes && grupoNota.itensDivergentes.length > 0
    );

    if (!temDivergenciaRestante) {
      sessao.statusPorNota = sessao.statusPorNota || {};
      sessao.statusPorNota[nunota] = 'Conferido';
      sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);

      const todasConferidas = sessao.nunotas.every(
        (n) => sessao.statusPorNota?.[n] === 'Conferido' || sessao.statusPorNota?.[n] === 'Enviado ao Sankhya'
      );

      if (todasConferidas) {
        sessao.status = 'Conferido';
        sessao.finalizadoEm = new Date().toISOString();
      }
      sessao.atualizadoEm = new Date().toISOString();
      await this.conferenciaRepo.salvarSessao(sessao);
    }

    return {
      sucesso: true,
      mensagem: `Item da Nota ${nunota} desmembrado com sucesso no Sankhya!`,
      divergencias: divergenciasAtualizadas,
    };
  }
}
