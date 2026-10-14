import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IDesmembrarItemNotaService } from '../../../domain/ports/IDesmembrarItemNotaService.js';
import { SessaoConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface ItemAssociacaoEnvio {
  nunota: number;
  sequencia: number;
  codprod: number;
  lote: string;
  validade?: string;
  fabricacao?: string;
  qtdConferida: number;
  codlocal?: number;
}

export interface EnviarConferenciaSankhyaInput {
  conferenciaId: string;
  nunotas?: number[];
  usuario: string;
  observacao?: string;
  nivelEscolhido?: number;
  itensCustomizados?: ItemAssociacaoEnvio[];
}

export interface EnviarConferenciaSankhyaOutput {
  sessao: SessaoConferenciaEntrada;
  itensAtualizados: number;
  itensDivididos?: number;
  estoqueAtualizado: number;
  protocolo: string;
}

export class EnviarConferenciaSankhyaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService,
    private readonly desmembrarItemService?: IDesmembrarItemNotaService
  ) {}

  async execute(
    input: EnviarConferenciaSankhyaInput,
    correlationId?: string
  ): Promise<EnviarConferenciaSankhyaOutput> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const nunotasParaEnvio = input.nunotas && input.nunotas.length > 0 ? input.nunotas : sessao.nunotas;
    const nunotasStr = nunotasParaEnvio.join(', ');

    // Validação de status por nota: permite envio individual de qualquer nota aprovada ('Conferido')
    // ou aprovada pelo gestor ('Divergente'), mesmo que outra nota da mesma conferência ainda esteja em N3
    for (const nunota of nunotasParaEnvio) {
      const statusNota = sessao.statusPorNota?.[nunota] || sessao.status;
      if (statusNota !== 'Conferido' && statusNota !== 'Divergente') {
        throw new Error(
          `A nota fiscal #${nunota} está com status "${statusNota}" e ainda não foi conferida/aprovada para envio.`
        );
      }
    }

    // 1. Buscar dados dos itens e empresa no Sankhya
    const sqlCab = `SELECT CODEMP FROM TGFCAB WHERE NUNOTA IN (${nunotasStr})`.trim();
    const respCab = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlCab } },
      correlationId
    );

    const codemp = Number(respCab?.responseBody?.rows?.[0]?.[0]) || 1;

    // Buscar itens na TGFITE com CODLOCALORIG
    const sqlIte = `
      SELECT 
        ITE.NUNOTA, 
        ITE.SEQUENCIA, 
        ITE.CODPROD, 
        NVL(ITE.QTDNEG, 0) AS QTDNEG, 
        ITE.CODLOCALORIG,
        PRO.DESCRPROD,
        CAB.NUMNOTA
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
      INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
      WHERE ITE.NUNOTA IN (${nunotasStr})
      ORDER BY ITE.NUNOTA, ITE.SEQUENCIA
    `.trim();

    const respIte = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlIte } },
      correlationId
    );

    const iteRows: any[] = respIte?.responseBody?.rows || [];

    // 2. Coletar lotes e validades das bipagens da conferência ou itens customizados
    const bipagens = await this.conferenciaRepo.listarBipagens(sessao.id);
    const bipagensValidas = bipagens.filter((b) => !b.anulado);

    const mapaLotesPorProd: Record<
      string,
      Array<{ lote: string; validade?: string; fabricacao?: string; qtd: number }>
    > = {};

    if (input.itensCustomizados && input.itensCustomizados.length > 0) {
      for (const item of input.itensCustomizados) {
        if (!item.lote) continue;
        const key = `${item.nunota}|${item.codprod}`;
        if (!mapaLotesPorProd[key]) {
          mapaLotesPorProd[key] = [];
        }
        mapaLotesPorProd[key].push({
          lote: item.lote.trim(),
          validade: item.validade?.trim(),
          fabricacao: item.fabricacao?.trim(),
          qtd: item.qtdConferida,
        });
      }
    } else {
      let bipsParaUso = bipagensValidas;
      if (input.nivelEscolhido) {
        const filtrados = bipagensValidas.filter((b) => b.nivel === input.nivelEscolhido && Boolean(b.lote));
        if (filtrados.length > 0) {
          bipsParaUso = filtrados;
        }
      } else {
        const temLoteN3 = bipagensValidas.some((b) => b.nivel === 3 && Boolean(b.lote));
        const temLoteN2 = bipagensValidas.some((b) => b.nivel === 2 && Boolean(b.lote));
        if (temLoteN3) {
          bipsParaUso = bipagensValidas.filter((b) => b.nivel === 3 && Boolean(b.lote));
        } else if (temLoteN2) {
          bipsParaUso = bipagensValidas.filter((b) => b.nivel === 2 && Boolean(b.lote));
        }
      }

      for (const b of bipsParaUso) {
        if (!b.lote) continue;
        const key = `${b.nunota}|${b.codprod}`;
        const itemKey = `${b.nunota}-${b.codprod}-${b.sequencia}`;
        const decisao = sessao.decisoesFiscais?.[itemKey] || sessao.decisoesFiscais?.[String(b.codprod)];

        // Se a decisão do gestor for manter o lote original do ERP, não envia o lote conferido
        if (decisao?.lote === 'ERP') {
          continue;
        }

        const validadeParaUso = decisao?.validade === 'ERP' ? undefined : b.validade?.trim();
        const fabricacaoParaUso = decisao?.fabricacao === 'ERP' ? undefined : b.fabricacao?.trim();

        if (!mapaLotesPorProd[key]) {
          mapaLotesPorProd[key] = [];
        }
        const loteExistente = mapaLotesPorProd[key].find(
          (l) => l.lote.toUpperCase() === b.lote!.trim().toUpperCase()
        );
        if (loteExistente) {
          loteExistente.qtd += b.qtdConferida;
          if (validadeParaUso && !loteExistente.validade) loteExistente.validade = validadeParaUso;
          if (fabricacaoParaUso && !loteExistente.fabricacao) loteExistente.fabricacao = fabricacaoParaUso;
        } else {
          mapaLotesPorProd[key].push({
            lote: b.lote.trim(),
            validade: validadeParaUso,
            fabricacao: fabricacaoParaUso,
            qtd: b.qtdConferida,
          });
        }
      }
    }

    // 2.1 Validação Prévia de Local de Estoque (CODLOCALORIG)
    // Se algum item da nota não tiver CODLOCALORIG definido na TGFITE, bloqueia e avisa o usuário
    const itensSemLocal = iteRows.filter(
      (r) => r[4] === null || r[4] === undefined || String(r[4]).trim() === ''
    );
    if (itensSemLocal.length > 0) {
      const detalhesSemLocal = itensSemLocal
        .map((r) => `NF ${r[6]} - Prod #${r[2]} (${r[5] || 'Sem descrição'})`)
        .slice(0, 5)
        .join('; ');
      throw new Error(
        `Impossível integrar: Os seguintes itens não possuem Local de Origem (CODLOCALORIG) definido na nota: ${detalhesSemLocal}. ` +
        `Por favor, informe o Local de Estoque no Sankhya antes de finalizar o envio.`
      );
    }

    // 2.2 Validação Prévia de Fracionamento de Lotes x Linhas da NF
    // Se um produto possui mais de 1 lote e existe apenas 1 sequência para ele na NF, bloqueia e orienta o desmembramento
    const contagemLinhasPorProd: Record<string, number> = {};
    for (const r of iteRows) {
      const key = `${r[0]}|${r[2]}`;
      contagemLinhasPorProd[key] = (contagemLinhasPorProd[key] || 0) + 1;
    }

    for (const [key, lotes] of Object.entries(mapaLotesPorProd)) {
      if (lotes.length > 1) {
        const totalLinhasNaNota = contagemLinhasPorProd[key] || 0;
        if (totalLinhasNaNota < lotes.length) {
          const [nunotaStr, codprodStr] = key.split('|');
          const itemRef = iteRows.find((r) => String(r[0]) === nunotaStr && String(r[2]) === codprodStr);
          const descrprod = itemRef?.[5] || `Produto #${codprodStr}`;
          const numnota = itemRef?.[6] || nunotaStr;
          const resumoLotes = lotes.map((l) => `${l.lote} (${l.qtd} un)`).join(', ');
          throw new Error(
            `Atenção: Na NF ${numnota}, o produto "${descrprod}" possui ${lotes.length} lotes conferidos (${resumoLotes}), ` +
            `mas possui apenas ${totalLinhasNaNota} linha(s) na nota fiscal. ` +
            `Por favor, realize o desmembramento do item na nota pelo Sankhya para acomodar os lotes e clique em Atualizar para concluir o envio.`
          );
        }
      }
    }

    // Função de sanitização e formatação de datas compatível com DatasetSP.save (DD/MM/YYYY)
    const formatarDataSankhya = (dataStr?: string | null): string | undefined => {
      if (!dataStr) return undefined;
      const limpo = dataStr.trim();
      if (!limpo) return undefined;

      // Se já estiver em YYYY-MM-DD
      const matchIso = limpo.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (matchIso) {
        return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
      }

      // Se já estiver em DD/MM/YYYY
      const matchBr = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (matchBr) {
        return `${matchBr[1]}/${matchBr[2]}/${matchBr[3]}`;
      }

      // Se estiver em YYYYMMDD
      const matchNum = limpo.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (matchNum) {
        return `${matchNum[3]}/${matchNum[2]}/${matchNum[1]}`;
      }

      return undefined;
    };

    let itensAtualizados = 0;
    let itensDivididos = 0;
    let estoqueAtualizado = 0;
    const agoraFormatada = new Date().toLocaleString('pt-BR');
    const agoraIso = new Date().toISOString();

    // 3. Atualizar TGFITE (ItemNota) e garantir dados na TGFEST (Estoque) via DatasetSP.save
    for (const r of iteRows) {
      const nunota = Number(r[0]);
      const sequencia = Number(r[1]);
      const codprod = Number(r[2]);
      const codlocal = Number(r[4]);

      const key = `${nunota}|${codprod}`;
      const lotesDoItem = mapaLotesPorProd[key] || [];

      if (lotesDoItem.length > 0) {
        // Se houver múltiplas sequências na nota para o mesmo produto, casa 1:1 por índice
        const linhasDesteProd = iteRows.filter((it) => Number(it[0]) === nunota && Number(it[2]) === codprod);
        const indiceSequencia = linhasDesteProd.findIndex((it) => Number(it[1]) === sequencia);
        const loteParaEstaSequencia = lotesDoItem[indiceSequencia] || lotesDoItem[0];
        const loteLimpo = loteParaEstaSequencia.lote.trim();

        // 3.1 Atualizar ItemNota (TGFITE) via DatasetSP.save
        await this.gateway.serviceCall<any>(
          'DatasetSP.save',
          {
            serviceName: 'DatasetSP.save',
            requestBody: {
              entityName: 'ItemNota',
              standAlone: false,
              fields: ['CONTROLE'],
              records: [
                {
                  pk: {
                    NUNOTA: String(nunota),
                    SEQUENCIA: String(sequencia),
                  },
                  values: {
                    '0': loteLimpo,
                  },
                },
              ],
            },
          },
          correlationId
        );
        itensAtualizados++;

        // 3.2 Garantir cada lote conferido na TGFEST (Estoque) via DatasetSP.save
        for (const loteObj of lotesDoItem) {
          const lLimpo = loteObj.lote.trim();
          if (!lLimpo) continue;

          const validadeFormatada = formatarDataSankhya(loteObj.validade);
          const fabricacaoFormatada = formatarDataSankhya(loteObj.fabricacao);

          // Verificar se já existe saldo/registro na TGFEST para esta chave
          const checkEstSql = `
            SELECT COUNT(1) FROM TGFEST
            WHERE CODPROD = ${codprod} 
              AND CODLOCAL = ${codlocal} 
              AND CODEMP = ${codemp} 
              AND CONTROLE = '${lLimpo}'
              AND CODPARC = 0
              AND TIPO = 'P'
          `.trim();

          try {
            const respEst = await this.gateway.serviceCall<any>(
              'DbExplorerSP.executeQuery',
              { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: checkEstSql } },
              correlationId
            );
            const existeEst = Number(respEst?.responseBody?.rows?.[0]?.[0]) > 0;

            if (existeEst) {
              // Se já existe, atualiza apenas DTVAL e/ou DTFABRICACAO, preservando o ESTOQUE real!
              const fieldsUpdate: string[] = [];
              const valuesUpdate: Record<string, string | number> = {};
              let fIdx = 0;
              if (validadeFormatada) {
                fieldsUpdate.push('DTVAL');
                valuesUpdate[String(fIdx++)] = validadeFormatada;
              }
              if (fabricacaoFormatada) {
                fieldsUpdate.push('DTFABRICACAO');
                valuesUpdate[String(fIdx++)] = fabricacaoFormatada;
              }

              if (fieldsUpdate.length > 0) {
                await this.gateway.serviceCall<any>(
                  'DatasetSP.save',
                  {
                    serviceName: 'DatasetSP.save',
                    requestBody: {
                      entityName: 'Estoque',
                      standAlone: false,
                      fields: fieldsUpdate,
                      records: [
                        {
                          pk: {
                            CODPROD: String(codprod),
                            CODLOCAL: codlocal,
                            CODEMP: String(codemp),
                            CODPARC: '0',
                            TIPO: 'P',
                            CONTROLE: lLimpo,
                          },
                          values: valuesUpdate,
                        },
                      ],
                    },
                  },
                  correlationId
                );
              }
            } else {
              // Se não existe, cria novo registro com ESTOQUE = 0 e RESERVADO = 0 via foreignKey
              const fieldsInsert = ['CODLOCAL', 'CONTROLE', 'TIPO', 'ESTOQUE', 'RESERVADO'];
              const valuesInsert: Record<string, string | number> = {
                '0': codlocal,
                '1': lLimpo,
                '2': 'P',
                '3': 0,
                '4': 0,
              };
              let fIdx = 5;
              if (validadeFormatada) {
                fieldsInsert.push('DTVAL');
                valuesInsert[String(fIdx++)] = validadeFormatada;
              }
              if (fabricacaoFormatada) {
                fieldsInsert.push('DTFABRICACAO');
                valuesInsert[String(fIdx++)] = fabricacaoFormatada;
              }

              await this.gateway.serviceCall<any>(
                'DatasetSP.save',
                {
                  serviceName: 'DatasetSP.save',
                  requestBody: {
                    entityName: 'Estoque',
                    standAlone: false,
                    fields: fieldsInsert,
                    records: [
                      {
                        foreignKey: {
                          CODPROD: String(codprod),
                          CODEMP: String(codemp),
                          CODPARC: '0',
                        },
                        values: valuesInsert,
                      },
                    ],
                  },
                },
                correlationId
              );
            }
            estoqueAtualizado++;
          } catch (errEst: any) {
            console.warn(`[TGFEST] Aviso ao registrar lote ${lLimpo} para o produto ${codprod}:`, errEst.message);
          }
        }
      }
    }

    // 4. Atualizar TGFCAB (CabecalhoNota) com AD_CONFERENCIA ('CONFERIDO') e AD_USUARIOCONF (conferente(s)) via DatasetSP.save
    for (const n of nunotasParaEnvio) {
      try {
        const bipagensDaNota = bipagensValidas.filter((b) => b.nunota === n);
        const conferentesSet = new Set<string>();
        for (const b of bipagensDaNota) {
          const confNome = b.conferente?.trim();
          if (confNome) {
            conferentesSet.add(confNome);
          }
        }
        let conferenteFinal = Array.from(conferentesSet).join(' / ');
        if (!conferenteFinal) {
          conferenteFinal = sessao.conferente?.trim() || input.usuario?.trim() || 'Conferente';
        }

        await this.gateway.serviceCall<any>(
          'DatasetSP.save',
          {
            serviceName: 'DatasetSP.save',
            requestBody: {
              entityName: 'CabecalhoNota',
              standAlone: false,
              fields: ['AD_CONFERENCIA', 'AD_USUARIOCONF'],
              records: [
                {
                  pk: {
                    NUNOTA: String(n),
                  },
                  values: {
                    '0': 'CONFERIDO',
                    '1': conferenteFinal,
                  },
                },
              ],
            },
          },
          correlationId
        );
        console.log(
          `[TGFCAB] Nota #${n} atualizada com sucesso no Sankhya: AD_CONFERENCIA='CONFERIDO', AD_USUARIOCONF='${conferenteFinal}'.`
        );
      } catch (errCab: any) {
        console.warn(
          `[TGFCAB] Aviso ao atualizar AD_CONFERENCIA/AD_USUARIOCONF da nota #${n}:`,
          errCab.message
        );
      }
    }

    // 5. Atualizar sessão local no SQLite/Turso
    sessao.statusPorNota = sessao.statusPorNota || {};
    for (const n of nunotasParaEnvio) {
      sessao.statusPorNota[n] = 'Enviado ao Sankhya';
    }
    sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);

    const todasEnviadas = sessao.nunotas.every((n) => sessao.statusPorNota?.[n] === 'Enviado ao Sankhya');
    if (todasEnviadas) {
      sessao.status = 'Enviado ao Sankhya';
      sessao.enviadoSankhyaEm = agoraIso;
    }
    sessao.atualizadoEm = agoraIso;
    sessao.aprovadoPor = input.usuario;
    sessao.aprovadoEm = agoraIso;
    sessao.observacaoAprovacao = input.observacao || 'Conferência aprovada e enviada com sucesso ao Sankhya.';
    sessao.respostaSankhyaJson = JSON.stringify({
      itensAtualizados,
      itensDivididos,
      estoqueAtualizado,
      nivelEscolhido: input.nivelEscolhido || sessao.nivelAtual,
      protocolo: sessao.id,
      timestamp: agoraIso,
    });

    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario,
        acao: 'ENVIAR_SANKHYA_CONFERENCIA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunotas: sessao.nunotas,
          itensAtualizados,
          itensDivididos,
          estoqueAtualizado,
          nivelEscolhido: input.nivelEscolhido || sessao.nivelAtual,
          observacao: input.observacao,
        },
      });
    }

    return {
      sessao,
      itensAtualizados,
      itensDivididos,
      estoqueAtualizado,
      protocolo: sessao.id,
    };
  }
}
