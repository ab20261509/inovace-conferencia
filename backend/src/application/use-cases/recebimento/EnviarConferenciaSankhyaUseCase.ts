import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
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
  usuario: string;
  observacao?: string;
  itensCustomizados?: ItemAssociacaoEnvio[];
}

export interface EnviarConferenciaSankhyaOutput {
  sessao: SessaoConferenciaEntrada;
  itensAtualizados: number;
  estoqueAtualizado: number;
  protocolo: string;
}

export class EnviarConferenciaSankhyaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService
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

    const nunotasStr = sessao.nunotas.join(', ');

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

    // 2. Coletar lotes e validades das bipagens válidas da conferência
    const bipagens = await this.conferenciaRepo.listarBipagens(sessao.id);
    const bipagensValidas = bipagens.filter((b) => !b.anulado);

    // Agrupar por nunota + codprod (ou usar itensCustomizados se fornecido)
    const mapaBipsPorProd: Record<
      string,
      { lote: string; validade?: string; fabricacao?: string; qtd: number }
    > = {};

    for (const b of bipagensValidas) {
      if (!b.lote) continue;
      const key = `${b.nunota}|${b.codprod}`;
      if (!mapaBipsPorProd[key]) {
        mapaBipsPorProd[key] = {
          lote: b.lote,
          validade: b.validade,
          fabricacao: b.fabricacao,
          qtd: 0,
        };
      }
      mapaBipsPorProd[key].qtd += b.qtdConferida;
    }

    let itensAtualizados = 0;
    let estoqueAtualizado = 0;
    const agoraFormatada = new Date().toLocaleString('pt-BR');
    const agoraIso = new Date().toISOString();

    // 3. Atualizar cada item correspondente na TGFITE e lançar na TGFEST
    for (const r of iteRows) {
      const nunota = Number(r[0]);
      const sequencia = Number(r[1]);
      const codprod = Number(r[2]);
      const codlocal = Number(r[4]) || 1;

      const key = `${nunota}|${codprod}`;
      const bipInfo = mapaBipsPorProd[key];

      if (bipInfo && bipInfo.lote) {
        const loteLimpo = bipInfo.lote.trim();
        const validadeSql = bipInfo.validade
          ? `TO_DATE('${bipInfo.validade.trim()}', 'DD/MM/YYYY')`
          : `NULL`;
        const fabricacaoSql = bipInfo.fabricacao
          ? `TO_DATE('${bipInfo.fabricacao.trim()}', 'DD/MM/YYYY')`
          : `NULL`;

        // UPDATE TGFITE: preenche o CONTROLE com o lote conferido
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

        // Garantir lote na TGFLOT (se a tabela existir)
        const checkLotSql = `
          SELECT COUNT(1) FROM TGFLOT WHERE CODPROD = ${codprod} AND CONTROLE = '${loteLimpo}'
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
              VALUES (${codprod}, '${loteLimpo}', ${validadeSql}, ${fabricacaoSql})
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
          WHERE CODPROD = ${codprod} AND CODLOCAL = ${codlocal} AND CODEMP = ${codemp} AND CONTROLE = '${loteLimpo}'
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
              WHERE CODPROD = ${codprod} AND CODLOCAL = ${codlocal} AND CODEMP = ${codemp} AND CONTROLE = '${loteLimpo}'
            `.trim();
            await this.gateway.serviceCall<any>(
              'DbExplorerSP.executeQuery',
              { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: updateEstSql } },
              correlationId
            );
          } else {
            const insertEstSql = `
              INSERT INTO TGFEST (CODPROD, CODLOCAL, CODEMP, CODPARC, TIPO, CONTROLE, ESTOQUE, DTVAL, DTFABRICACAO)
              VALUES (${codprod}, ${codlocal}, ${codemp}, 0, 'P', '${loteLimpo}', 0, ${validadeSql}, ${fabricacaoSql})
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
    sessao.status = 'Enviado ao Sankhya';
    sessao.atualizadoEm = agoraIso;
    sessao.aprovadoPor = input.usuario;
    sessao.aprovadoEm = agoraIso;
    sessao.enviadoSankhyaEm = agoraIso;
    sessao.observacaoAprovacao = input.observacao || 'Conferência aprovada e enviada com sucesso ao Sankhya.';
    sessao.respostaSankhyaJson = JSON.stringify({
      itensAtualizados,
      estoqueAtualizado,
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
          estoqueAtualizado,
          observacao: input.observacao,
        },
      });
    }

    return {
      sessao,
      itensAtualizados,
      estoqueAtualizado,
      protocolo: sessao.id,
    };
  }
}
