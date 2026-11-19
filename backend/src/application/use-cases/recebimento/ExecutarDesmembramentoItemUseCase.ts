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

function normalizarDataComp(dataStr?: string): string {
  if (!dataStr) return '';
  const s = dataStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [ano, mes, dia] = s.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    return s.substring(0, 10);
  }
  if (/^\d{8}/.test(s)) {
    const dia = s.substring(0, 2);
    const mes = s.substring(2, 4);
    const ano = s.substring(4, 8);
    return `${dia}/${mes}/${ano}`;
  }
  return s.split(' ')[0] || s;
}

export class ExecutarDesmembramentoItemUseCase {
  private static readonly processandoPorItem = new Set<string>();

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

    const lockKey = `${nunota}-${sequencia}`;
    if (ExecutarDesmembramentoItemUseCase.processandoPorItem.has(lockKey)) {
      throw new Error(
        `O item da NF #${nunota} (Seq ${sequencia}) já está sendo desmembrado no Sankhya. Por favor, aguarde.`
      );
    }
    ExecutarDesmembramentoItemUseCase.processandoPorItem.add(lockKey);

    try {
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

    // 3.1 Pré-verificação de Idempotência: Checar se o desmembramento já existe na TGFITE do Sankhya
    let jaDesmembradoNoSankhya = false;
    let itensTGFITE: Array<{
      sequencia: number;
      controle?: string;
      qtdneg: number;
    }> = [];

    if (codprod) {
      const sqlChecagemPrevia = `
SELECT
    ITE.SEQUENCIA,
    ITE.CODPROD,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    ITE.CONTROLE,
    ITE.DTVAL,
    ITE.DTFABRICACAO
FROM TGFITE ITE
WHERE ITE.NUNOTA = ${nunota} AND ITE.CODPROD = ${codprod}
ORDER BY ITE.SEQUENCIA
      `.trim();

      const respChecagem = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlChecagemPrevia } },
        correlationId
      );

      const rowsPre: any[] = respChecagem?.responseBody?.rows || [];
      const fieldsPre: any[] = respChecagem?.responseBody?.fieldsMetadata || [];
      const fieldIndexPre: Record<string, number> = {};
      fieldsPre.forEach((f: any, idx: number) => {
        fieldIndexPre[f.name.toUpperCase()] = idx;
      });

      const itensPreExistentes = rowsPre.map((r) => ({
        sequencia: Number(r[fieldIndexPre['SEQUENCIA']]),
        controle: r[fieldIndexPre['CONTROLE']] ? String(r[fieldIndexPre['CONTROLE']]).trim() : undefined,
        qtdneg: Number(r[fieldIndexPre['QTDNEG']] || 0),
        dtval: r[fieldIndexPre['DTVAL']] ? String(r[fieldIndexPre['DTVAL']]).trim() : undefined,
        dtfabricacao: r[fieldIndexPre['DTFABRICACAO']] ? String(r[fieldIndexPre['DTFABRICACAO']]).trim() : undefined,
      }));

      // Se a nota já possuir linhas suficientes para comportar as frações solicitadas:
      if (itensPreExistentes.length >= input.lotes.length && input.lotes.length > 1) {
        const indicesUsados = new Set<number>();
        let todasBateram = true;

        for (const fracao of input.lotes) {
          let qtdSankhyaEsperada = Number(fracao.qtd);
          if (fatorVolume > 1) {
            if (operacaoVolume === 'M') {
              qtdSankhyaEsperada = Number((Number(fracao.qtd) / fatorVolume).toFixed(6));
            } else if (operacaoVolume === 'D') {
              qtdSankhyaEsperada = Number((Number(fracao.qtd) * fatorVolume).toFixed(6));
            }
          }

          const loteEsperado = (fracao.lote || '').trim().toUpperCase();
          const valEsperada = normalizarDataComp(fracao.dtval);
          const fabEsperada = normalizarDataComp(fracao.dtfab);

          // Procura linha correspondente com os 4 campos idênticos (Lote, Qtd, Validade e Fabricação)
          const idxMatch = itensPreExistentes.findIndex((it, idx) => {
            if (indicesUsados.has(idx)) return false;
            const loteRow = (it.controle || '').trim().toUpperCase();
            const valRow = normalizarDataComp(it.dtval);
            const fabRow = normalizarDataComp(it.dtfabricacao);
            const diffQtd = Math.abs(it.qtdneg - qtdSankhyaEsperada);

            const loteOk = loteRow === loteEsperado;
            const qtdOk = diffQtd < 0.0001;
            const valOk = valRow === valEsperada;
            const fabOk = fabRow === fabEsperada;

            return loteOk && qtdOk && valOk && fabOk;
          });

          if (idxMatch !== -1) {
            indicesUsados.add(idxMatch);
          } else {
            todasBateram = false;
            break;
          }
        }

        if (todasBateram && indicesUsados.size === input.lotes.length) {
          jaDesmembradoNoSankhya = true;
          itensTGFITE = itensPreExistentes.map((it) => ({
            sequencia: it.sequencia,
            controle: it.controle,
            qtdneg: it.qtdneg,
          }));
          console.log(
            `[ExecutarDesmembramentoItemUseCase] ✓ Desmembramento já existente no Sankhya detectado via TGFITE (NUNOTA=${nunota}, CODPROD=${codprod}, ${input.lotes.length} frações). Pulando CACSP.desmembrarItem.`
          );
        }
      }
    }

    if (!jaDesmembradoNoSankhya) {
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

        itensTGFITE = rowsNovos.map((r) => ({
          sequencia: Number(r[fieldIndexNovos['SEQUENCIA']]),
          controle: r[fieldIndexNovos['CONTROLE']] ? String(r[fieldIndexNovos['CONTROLE']]).trim() : undefined,
          qtdneg: Number(r[fieldIndexNovos['QTDNEG']] || 0),
        }));
      }
    }

    if (codprod && itensTGFITE.length > 0) {

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

      // 5. Reavaliar divergências de entrada no banco/memória (com tolerância a falhas/timeouts)
      let divergenciasAtualizadas: any[] | undefined = undefined;
      try {
        divergenciasAtualizadas = await this.listarDivergenciasUseCase.execute(correlationId);

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
      } catch (eDiv: any) {
        console.warn('[ExecutarDesmembramentoItemUseCase] Aviso ao atualizar divergências pós-desmembramento:', eDiv?.message);
      }

      return {
        sucesso: true,
        mensagem: jaDesmembradoNoSankhya
          ? `Item da Nota ${nunota} já se encontrava desmembrado no Sankhya (validado na TGFITE)!`
          : `Item da Nota ${nunota} desmembrado com sucesso no Sankhya!`,
        divergencias: divergenciasAtualizadas,
      };
    } finally {
      ExecutarDesmembramentoItemUseCase.processandoPorItem.delete(lockKey);
    }
  }
}
