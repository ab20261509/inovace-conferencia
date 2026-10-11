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

    if (sessao.status !== 'Conferido' && sessao.status !== 'Divergente') {
      throw new Error(`A conferência está com status "${sessao.status}" e não pode ser enviada ao Sankhya.`);
    }

    const nunotasParaEnvio = input.nunotas && input.nunotas.length > 0 ? input.nunotas : sessao.nunotas;
    const nunotasStr = nunotasParaEnvio.join(', ');

    // 1. Buscar dados dos itens e empresa no Sankhya
    const sqlCab = `SELECT CODEMP FROM TGFCAB WHERE NUNOTA IN (${nunotasStr})`.trim();
    const respCab = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlCab } },
      correlationId
    );

    const codemp = Number(respCab?.responseBody?.rows?.[0]?.[0]) || 1;

    // Buscar itens na TGFITE
    const sqlIte = `
      SELECT NUNOTA, SEQUENCIA, CODPROD, NVL(QTDNEG, 0) AS QTDNEG, NVL(CODLOCALORIG, 1) AS CODLOCAL
      FROM TGFITE
      WHERE NUNOTA IN (${nunotasStr})
      ORDER BY NUNOTA, SEQUENCIA
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

    let itensAtualizados = 0;
    let itensDivididos = 0;
    let estoqueAtualizado = 0;
    const agoraFormatada = new Date().toLocaleString('pt-BR');
    const agoraIso = new Date().toISOString();

    // 3. Atualizar TGFITE e lançar na TGFLOT e TGFEST
    for (const r of iteRows) {
      const nunota = Number(r[0]);
      const sequencia = Number(r[1]);
      const codprod = Number(r[2]);
      const codlocal = Number(r[4]) || 1;

      const key = `${nunota}|${codprod}`;
      const lotesDoItem = mapaLotesPorProd[key] || [];

      // Múltiplos lotes para o mesmo item faturado -> Desmembramento
      if (lotesDoItem.length > 1) {
        itensDivididos++;
        if (this.desmembrarItemService) {
          await this.desmembrarItemService.desmembrarItemPorLote(
            {
              nunota,
              sequenciaOriginal: sequencia,
              codprod,
              lotes: lotesDoItem.map((l) => ({
                lote: l.lote,
                validade: l.validade,
                fabricacao: l.fabricacao,
                quantidade: l.qtd,
              })),
              usuario: input.usuario,
            },
            correlationId
          );
        }
      }

      // Atualiza o primeiro lote na TGFITE
      if (lotesDoItem.length > 0) {
        const primeiroLote = lotesDoItem[0];
        const loteLimpo = primeiroLote.lote.trim();

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

        // Garantir cada lote na TGFLOT e TGFEST
        for (const loteObj of lotesDoItem) {
          const lLimpo = loteObj.lote.trim();
          if (!lLimpo) continue;

          const valFormatada = loteObj.validade ? loteObj.validade.replace(/-/g, '').slice(0, 8) : null;
          const fabFormatada = loteObj.fabricacao ? loteObj.fabricacao.replace(/-/g, '').slice(0, 8) : null;

          const validadeSql = valFormatada
            ? `TO_DATE('${valFormatada}', 'YYYYMMDD')`
            : loteObj.validade
              ? `TO_DATE('${loteObj.validade}', 'YYYY-MM-DD')`
              : 'NULL';

          const fabricacaoSql = fabFormatada
            ? `TO_DATE('${fabFormatada}', 'YYYYMMDD')`
            : loteObj.fabricacao
              ? `TO_DATE('${loteObj.fabricacao}', 'YYYY-MM-DD')`
              : 'NULL';

          // Garantir lote na TGFLOT (se a tabela existir)
          const checkLotSql = `
            SELECT COUNT(1) FROM TGFLOT WHERE CODPROD = ${codprod} AND CONTROLE = '${lLimpo}'
          `.trim();
          try {
            const respLot = await this.gateway.serviceCall<any>(
              'DbExplorerSP.executeQuery',
              { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: checkLotSql } },
              correlationId
            );
            const existeLot = Number(respLot?.responseBody?.rows?.[0]?.[0]) > 0;
            if (!existeLot) {
              const insertLotSql = `
                INSERT INTO TGFLOT (CODPROD, CONTROLE, DTVAL, DTFABRICACAO)
                VALUES (${codprod}, '${lLimpo}', ${validadeSql}, ${fabricacaoSql})
              `.trim();
              await this.gateway.serviceCall<any>(
                'DbExplorerSP.executeQuery',
                { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: insertLotSql } },
                correlationId
              );
            }
          } catch {
            // Fallback silencioso caso TGFLOT não tenha permissão de insert direto
          }

          // Lançamento / Atualização na TGFEST (Estoque por lote)
          const checkEstSql = `
            SELECT COUNT(1) FROM TGFEST
            WHERE CODPROD = ${codprod} AND CODLOCAL = ${codlocal} AND CODEMP = ${codemp} AND CONTROLE = '${lLimpo}'
          `.trim();

          try {
            const respEst = await this.gateway.serviceCall<any>(
              'DbExplorerSP.executeQuery',
              { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: checkEstSql } },
              correlationId
            );
            const existeEst = Number(respEst?.responseBody?.rows?.[0]?.[0]) > 0;

            if (existeEst) {
              const updateEstSql = `
                UPDATE TGFEST
                SET DTVAL = ${validadeSql}, DTFABRICACAO = ${fabricacaoSql}
                WHERE CODPROD = ${codprod} AND CODLOCAL = ${codlocal} AND CODEMP = ${codemp} AND CONTROLE = '${lLimpo}'
              `.trim();
              await this.gateway.serviceCall<any>(
                'DbExplorerSP.executeQuery',
                { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: updateEstSql } },
                correlationId
              );
            } else {
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
          } catch {
            // Ignora se regras de gatilho do Sankhya controlarem o estoque automaticamente
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
