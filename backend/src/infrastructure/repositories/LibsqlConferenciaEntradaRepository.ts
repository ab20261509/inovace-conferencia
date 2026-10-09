import { Client } from '@libsql/client';
import { IConferenciaEntradaRepository } from '../../domain/ports/IConferenciaEntradaRepository.js';
import {
  SessaoConferenciaEntrada,
  BipagemEntrada,
  StatusConferenciaEntrada,
} from '../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../database/AuditService.js';

export class LibsqlConferenciaEntradaRepository implements IConferenciaEntradaRepository {
  constructor(
    private readonly client: Client,
    private readonly auditService?: AuditService,
  ) {}

  private mapSessao(row: any): SessaoConferenciaEntrada {
    let nunotas: number[] = [];
    try {
      nunotas = JSON.parse(String(row.nunotas_json || '[]'));
    } catch {
      nunotas = [];
    }

    let backupContagem: any = undefined;
    if (row.backup_contagem_json) {
      try {
        backupContagem = JSON.parse(String(row.backup_contagem_json));
      } catch {}
    }

    return {
      id: String(row.id),
      nunotas,
      status: row.status as StatusConferenciaEntrada,
      nivelAtual: Number(row.nivel_atual),
      conferente: String(row.conferente || 'Operador'),
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),
      aprovadoPor: row.aprovado_por ? String(row.aprovado_por) : undefined,
      aprovadoEm: row.aprovado_em ? String(row.aprovado_em) : undefined,
      enviadoSankhyaEm: row.enviado_sankhya_em ? String(row.enviado_sankhya_em) : undefined,
      observacaoAprovacao: row.observacao_aprovacao ? String(row.observacao_aprovacao) : undefined,
      respostaSankhyaJson: row.resposta_sankhya_json ? String(row.resposta_sankhya_json) : undefined,
      backupContagemJson: row.backup_contagem_json ? String(row.backup_contagem_json) : undefined,
      backupContagem,
    };
  }

  private mapBipagem(row: any): BipagemEntrada {
    return {
      id: String(row.id),
      conferenciaId: String(row.conferencia_id),
      nunota: Number(row.nunota),
      codprod: Number(row.codprod),
      sequencia: Number(row.sequencia),
      codbarra: String(row.codbarra),
      qtdConferida: Number(row.qtd_conferida),
      nivel: Number(row.nivel),
      conferente: String(row.conferente),
      timestamp: String(row.timestamp),
      lote: row.lote ? String(row.lote) : undefined,
      validade: row.validade ? String(row.validade) : undefined,
      fabricacao: row.fabricacao ? String(row.fabricacao) : undefined,
      anulado: Number(row.anulado) === 1,
    };
  }

  async obterSessaoPorId(id: string): Promise<SessaoConferenciaEntrada | null> {
    const res = await this.client.execute({
      sql: `SELECT id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
                   aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao, resposta_sankhya_json, backup_contagem_json
            FROM conferencias_entrada
            WHERE id = ?
            LIMIT 1`,
      args: [id],
    });

    if (res.rows.length === 0) return null;
    return this.mapSessao(res.rows[0]);
  }

  async obterSessaoPorNunota(nunota: number): Promise<SessaoConferenciaEntrada | null> {
    // Busca todas as sessões e localiza a ativa primeiro, ou a última
    const res = await this.client.execute({
      sql: `SELECT id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
                   aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao, resposta_sankhya_json, backup_contagem_json
            FROM conferencias_entrada
            ORDER BY atualizado_em DESC`,
      args: [],
    });

    const sessoes = res.rows.map((r) => this.mapSessao(r));
    const sessaoAtiva = sessoes.find((s) => s.nunotas.includes(nunota) && s.status !== 'Conferido' && s.status !== 'Enviado ao Sankhya');
    if (sessaoAtiva) return sessaoAtiva;

    const sessaoFinalizada = sessoes.find((s) => s.nunotas.includes(nunota));
    return sessaoFinalizada || null;
  }

  async obterSessoesPorNunotas(nunotas: number[]): Promise<SessaoConferenciaEntrada[]> {
    if (nunotas.length === 0) return [];
    const nunotaSet = new Set(nunotas);

    const res = await this.client.execute({
      sql: `SELECT id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
                   aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao, resposta_sankhya_json, backup_contagem_json
            FROM conferencias_entrada
            ORDER BY atualizado_em DESC`,
      args: [],
    });

    const sessoes = res.rows.map((r) => this.mapSessao(r));
    return sessoes.filter((s) => s.nunotas.some((n) => nunotaSet.has(n)));
  }

  async listarTodasSessoes(): Promise<SessaoConferenciaEntrada[]> {
    const res = await this.client.execute({
      sql: `SELECT id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
                   finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao, resposta_sankhya_json, backup_contagem_json
            FROM conferencias_entrada
            ORDER BY atualizado_em DESC`,
      args: [],
    });

    return res.rows.map((r) => this.mapSessao(r));
  }

  async salvarSessao(sessao: SessaoConferenciaEntrada): Promise<void> {
    const agora = new Date().toISOString();
    await this.client.execute({
      sql: `INSERT INTO conferencias_entrada (
              id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
              finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao, resposta_sankhya_json, backup_contagem_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              nunotas_json = excluded.nunotas_json,
              status = excluded.status,
              nivel_atual = excluded.nivel_atual,
              conferente = excluded.conferente,
              atualizado_em = excluded.atualizado_em,
              finalizado_em = excluded.finalizado_em,
              aprovado_por = excluded.aprovado_por,
              aprovado_em = excluded.aprovado_em,
              enviado_sankhya_em = excluded.enviado_sankhya_em,
              observacao_aprovacao = excluded.observacao_aprovacao,
              resposta_sankhya_json = excluded.resposta_sankhya_json,
              backup_contagem_json = excluded.backup_contagem_json`,
      args: [
        sessao.id,
        JSON.stringify(sessao.nunotas || []),
        sessao.status,
        sessao.nivelAtual,
        sessao.conferente || 'Operador',
        sessao.criadoEm || agora,
        sessao.atualizadoEm || agora,
        sessao.finalizadoEm || null,
        sessao.aprovadoPor || null,
        sessao.aprovadoEm || null,
        sessao.enviadoSankhyaEm || null,
        sessao.observacaoAprovacao || null,
        sessao.respostaSankhyaJson || null,
        sessao.backupContagemJson || (sessao.backupContagem ? JSON.stringify(sessao.backupContagem) : null),
      ],
    });
  }

  async listarBipagens(conferenciaId: string, nivel?: number): Promise<BipagemEntrada[]> {
    const sql =
      nivel !== undefined
        ? `SELECT id, conferencia_id, nunota, codprod, sequencia, codbarra, qtd_conferida, nivel, conferente, timestamp, lote, validade, fabricacao, anulado
           FROM bipagens_entrada
           WHERE conferencia_id = ? AND nivel = ?
           ORDER BY timestamp DESC`
        : `SELECT id, conferencia_id, nunota, codprod, sequencia, codbarra, qtd_conferida, nivel, conferente, timestamp, lote, validade, fabricacao, anulado
           FROM bipagens_entrada
           WHERE conferencia_id = ?
           ORDER BY timestamp DESC`;

    const args = nivel !== undefined ? [conferenciaId, nivel] : [conferenciaId];
    const res = await this.client.execute({ sql, args });

    return res.rows.map((r) => this.mapBipagem(r));
  }

  async salvarBipagem(bipagem: BipagemEntrada): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO bipagens_entrada
            (id, conferencia_id, nunota, codprod, sequencia, codbarra, qtd_conferida, nivel, conferente, timestamp, lote, validade, fabricacao, anulado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              anulado = excluded.anulado`,
      args: [
        bipagem.id,
        bipagem.conferenciaId,
        bipagem.nunota,
        bipagem.codprod,
        bipagem.sequencia,
        bipagem.codbarra,
        bipagem.qtdConferida,
        bipagem.nivel,
        bipagem.conferente,
        bipagem.timestamp,
        bipagem.lote || null,
        bipagem.validade || null,
        bipagem.fabricacao || null,
        bipagem.anulado ? 1 : 0,
      ],
    });
  }

  async anularBipagem(bipagemId: string): Promise<void> {
    await this.client.execute({
      sql: `UPDATE bipagens_entrada SET anulado = 1 WHERE id = ?`,
      args: [bipagemId],
    });

    if (this.auditService) {
      await this.auditService.registrar({
        usuario: 'Operador',
        acao: 'ESTORNAR_BIPAGEM',
        recurso: `bipagem:${bipagemId}`,
        detalhes: { bipagemId },
      });
    }
  }

  async restaurarBipagens(conferenciaId: string): Promise<number> {
    const res = await this.client.execute({
      sql: `UPDATE bipagens_entrada SET anulado = 0 WHERE conferencia_id = ?`,
      args: [conferenciaId],
    });

    if (this.auditService) {
      await this.auditService.registrar({
        usuario: 'Gestor',
        acao: 'RESTAURAR_BIPAGENS',
        recurso: `conferencia:${conferenciaId}`,
        detalhes: { conferenciaId, rowsAffected: res.rowsAffected },
      });
    }

    return res.rowsAffected;
  }

  async obterMapaStatusNotas(
    nunotas: number[]
  ): Promise<Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number }>> {
    if (nunotas.length === 0) return {};

    const res = await this.client.execute({
      sql: `SELECT id, nunotas_json, status, nivel_atual
            FROM conferencias_entrada
            ORDER BY atualizado_em DESC`,
      args: [],
    });

    const sessoes = res.rows.map((r) => this.mapSessao(r));
    const mapa: Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number }> = {};

    for (const nunota of nunotas) {
      const ativa = sessoes.find((s) => s.nunotas.includes(nunota) && s.status !== 'Conferido');
      if (ativa) {
        mapa[nunota] = {
          status: ativa.status,
          id: ativa.id,
          nivel: ativa.nivelAtual,
        };
        continue;
      }

      const concluida = sessoes.find((s) => s.nunotas.includes(nunota));
      if (concluida) {
        mapa[nunota] = {
          status: concluida.status,
          id: concluida.id,
          nivel: concluida.nivelAtual,
        };
      }
    }

    return mapa;
  }
}
