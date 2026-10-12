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
        if (!mapaLotesPorProd[key]) {
          mapaLotesPorProd[key] = [];
        }
        const loteExistente = mapaLotesPorProd[key].find(
          (l) => l.lote.toUpperCase() === b.lote!.trim().toUpperCase()
        );
        if (loteExistente) {
          loteExistente.qtd += b.qtdConferida;
          if (b.validade && !loteExistente.validade) loteExistente.validade = b.validade;
          if (b.fabricacao && !loteExistente.fabricacao) loteExistente.fabricacao = b.fabricacao;
        } else {
          mapaLotesPorProd[key].push({
            lote: b.lote.trim(),
            validade: b.validade?.trim(),
            fabricacao: b.fabricacao?.trim(),
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

    // Função de sanitização e formatação de datas compatível com Oracle (DD/MM/YYYY)
    const formatarDataOracle = (dataStr?: string | null): string => {
      if (!dataStr) return 'NULL';
      const limpo = dataStr.trim();
      if (!limpo) return 'NULL';

      // Se já estiver em YYYY-MM-DD
      const matchIso = limpo.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (matchIso) {
        const dia = matchIso[3];
        const mes = matchIso[2];
        const ano = matchIso[1];
        return `TO_DATE('${dia}/${mes}/${ano}', 'DD/MM/YYYY')`;
      }

      // Se já estiver em DD/MM/YYYY
      const matchBr = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (matchBr) {
        return `TO_DATE('${matchBr[1]}/${matchBr[2]}/${matchBr[3]}', 'DD/MM/YYYY')`;
      }

      // Se estiver em YYYYMMDD
      const matchNum = limpo.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (matchNum) {
        return `TO_DATE('${matchNum[3]}/${matchNum[2]}/${matchNum[1]}', 'DD/MM/YYYY')`;
      }

      return 'NULL';
    };

    let itensAtualizados = 0;
    let itensDivididos = 0;
    let estoqueAtualizado = 0;
    const agoraFormatada = new Date().toLocaleString('pt-BR');
    const agoraIso = new Date().toISOString();

    // 3. Atualizar TGFITE e garantir dados na TGFEST
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

        const updateIteSql = `
          UPDATE TGFITE
          SET CONTROLE = '${loteLimpo}'
          WHERE NUNOTA = ${nunota} AND SEQUENCIA = ${sequencia}
        `.trim();

        await this.gateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: updateIteSql } },
          correlationId
        );
        itensAtualizados++;

        // Garantir cada lote conferido na TGFEST (Estoque por lote)
        for (const loteObj of lotesDoItem) {
          const lLimpo = loteObj.lote.trim();
          if (!lLimpo) continue;

          const validadeSql = formatarDataOracle(loteObj.validade);
          const fabricacaoSql = formatarDataOracle(loteObj.fabricacao);

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
              // Se já existe, atualiza APENAS DTVAL e DTFABRICACAO caso informadas, preservando o ESTOQUE real!
              const setPartes: string[] = [];
              if (validadeSql !== 'NULL') setPartes.push(`DTVAL = ${validadeSql}`);
              if (fabricacaoSql !== 'NULL') setPartes.push(`DTFABRICACAO = ${fabricacaoSql}`);

              if (setPartes.length > 0) {
                const updateEstSql = `
                  UPDATE TGFEST
                  SET ${setPartes.join(', ')}
                  WHERE CODPROD = ${codprod} 
                    AND CODLOCAL = ${codlocal} 
                    AND CODEMP = ${codemp} 
                    AND CONTROLE = '${lLimpo}'
                    AND CODPARC = 0
                    AND TIPO = 'P'
                `.trim();

                await this.gateway.serviceCall<any>(
                  'DbExplorerSP.executeQuery',
                  { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: updateEstSql } },
                  correlationId
                );
              }
            } else {
              // Se não existe, insere o registro com ESTOQUE = 0 (saldo será alimentado na confirmação da TOP)
              const insertEstSql = `
                INSERT INTO TGFEST (CODPROD, CODLOCAL, CODEMP, CODPARC, TIPO, CONTROLE, ESTOQUE, DTVAL, DTFABRICACAO)
                VALUES (${codprod}, ${codlocal}, ${codemp}, 0, 'P', '${lLimpo}', 0, ${validadeSql}, ${fabricacaoSql})
              `.trim();

              await this.gateway.serviceCall<any>(
                'DbExplorerSP.executeQuery',
                { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: insertEstSql } },
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

    // 4. Atualizar TGFCAB com log de conferência e protocolo
    const obsTexto = `[ConferCheck] Conferência de Entrada aprovada por ${input.usuario} em ${agoraFormatada}. Protocolo: ${sessao.id.slice(0, 8)}. ${input.observacao ? `Obs: ${input.observacao}` : ''}`.trim();
    const updateCabSql = `
      UPDATE TGFCAB
      SET OBSERVACAO = SUBSTR(NVL(OBSERVACAO, '') || ' | ' || '${obsTexto.replace(/'/g, "''")}', 1, 1000)
      WHERE NUNOTA IN (${nunotasStr})
    `.trim();

    try {
      await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: updateCabSql } },
        correlationId
      );
    } catch {
      // Fallback
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
