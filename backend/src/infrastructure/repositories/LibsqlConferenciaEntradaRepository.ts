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

    let statusPorNota: Record<number, StatusConferenciaEntrada> | undefined = undefined;
    if (row.status_por_nota_json) {
      try {
        statusPorNota = JSON.parse(String(row.status_por_nota_json));
      } catch {}
    }

    let decisoesFiscais: Record<string, any> | undefined = undefined;
    if (row.decisoes_fiscais_json) {
      try {
        decisoesFiscais = JSON.parse(String(row.decisoes_fiscais_json));
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
      finalizadoEm: row.finalizado_em ? String(row.finalizado_em) : undefined,
      aprovadoPor: row.aprovado_por ? String(row.aprovado_por) : undefined,
      aprovadoEm: row.aprovado_em ? String(row.aprovado_em) : undefined,
      enviadoSankhyaEm: row.enviado_sankhya_em ? String(row.enviado_sankhya_em) : undefined,
      observacaoAprovacao: row.observacao_aprovacao ? String(row.observacao_aprovacao) : undefined,
      respostaSankhyaJson: row.resposta_sankhya_json ? String(row.resposta_sankhya_json) : undefined,
      backupContagemJson: row.backup_contagem_json ? String(row.backup_contagem_json) : undefined,
      backupContagem,
      statusPorNota,
      statusPorNotaJson: row.status_por_nota_json ? String(row.status_por_nota_json) : undefined,
      decisoesFiscais,
      decisoesFiscaisJson: row.decisoes_fiscais_json ? String(row.decisoes_fiscais_json) : undefined,
      chavenfe: row.chavenfe ? String(row.chavenfe).trim() : undefined,
      numnota: row.numnota !== null && row.numnota !== undefined ? Number(row.numnota) : undefined,
      codparc: row.codparc !== null && row.codparc !== undefined ? Number(row.codparc) : undefined,
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
                   finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao,
                   resposta_sankhya_json, backup_contagem_json, status_por_nota_json, decisoes_fiscais_json,
                   chavenfe, numnota, codparc
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
                   finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao,
                   resposta_sankhya_json, backup_contagem_json, status_por_nota_json, decisoes_fiscais_json,
                   chavenfe, numnota, codparc
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
                   finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao,
                   resposta_sankhya_json, backup_contagem_json, status_por_nota_json, decisoes_fiscais_json,
                   chavenfe, numnota, codparc
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
                   finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao,
                   resposta_sankhya_json, backup_contagem_json, status_por_nota_json, decisoes_fiscais_json,
                   chavenfe, numnota, codparc
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
              finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao,
              resposta_sankhya_json, backup_contagem_json, status_por_nota_json, decisoes_fiscais_json,
              chavenfe, numnota, codparc
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              backup_contagem_json = excluded.backup_contagem_json,
              status_por_nota_json = excluded.status_por_nota_json,
              decisoes_fiscais_json = excluded.decisoes_fiscais_json,
              chavenfe = excluded.chavenfe,
              numnota = excluded.numnota,
              codparc = excluded.codparc`,
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
        sessao.statusPorNotaJson || (sessao.statusPorNota ? JSON.stringify(sessao.statusPorNota) : null),
        sessao.decisoesFiscaisJson || (sessao.decisoesFiscais ? JSON.stringify(sessao.decisoesFiscais) : null),
        sessao.chavenfe || null,
        sessao.numnota || null,
        sessao.codparc || null,
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

  async migrarBipagens(deConferenciaId: string, paraConferenciaId: string, nunotas?: number[]): Promise<number> {
    if (nunotas && nunotas.length > 0) {
      const placeholders = nunotas.map(() => '?').join(', ');
      const res = await this.client.execute({
        sql: `UPDATE bipagens_entrada SET conferencia_id = ? WHERE conferencia_id = ? AND nunota IN (${placeholders})`,
        args: [paraConferenciaId, deConferenciaId, ...nunotas],
      });
      return res.rowsAffected;
    }

    const res = await this.client.execute({
      sql: `UPDATE bipagens_entrada SET conferencia_id = ? WHERE conferencia_id = ?`,
      args: [paraConferenciaId, deConferenciaId],
    });
    return res.rowsAffected;
  }

  async excluirSessao(id: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM bipagens_entrada WHERE conferencia_id = ?`,
      args: [id],
    });
    const res = await this.client.execute({
      sql: `DELETE FROM conferencias_entrada WHERE id = ?`,
      args: [id],
    });
    if (this.auditService) {
      await this.auditService.registrar({
        usuario: 'Sistema',
        acao: 'EXCLUIR_SESSAO_CONFERENCIA_ENTRADA',
        recurso: `conferencia:${id}`,
        detalhes: { conferenciaId: id, rowsAffected: res.rowsAffected },
      });
    }
  }

  async obterMapaStatusNotas(
    nunotas: number[]
  ): Promise<Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number }>> {
    if (nunotas.length === 0) return {};

    const res = await this.client.execute({
      sql: `SELECT c.id, c.nunotas_json, c.status, c.nivel_atual, c.status_por_nota_json, c.atualizado_em,
                   (SELECT COUNT(*) FROM bipagens_entrada b WHERE b.conferencia_id = c.id AND b.anulado = 0) AS total_bipagens
            FROM conferencias_entrada c
            ORDER BY c.atualizado_em DESC`,
      args: [],
    });

    const sessoes = res.rows.map((r) => ({
      sessao: this.mapSessao(r),
      totalBipagens: Number(r.total_bipagens || 0),
    }));
    const mapa: Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number }> = {};

    for (const nunota of nunotas) {
      const sessoesDaNota = sessoes.filter((s) => s.sessao.nunotas.includes(nunota));
      if (sessoesDaNota.length === 0) continue;

      // 1. Procurar sessão finalizada/concluída
      const concluida = sessoesDaNota.find((s) => {
        const statusNota = s.sessao.statusPorNota?.[nunota] || s.sessao.status;
        return statusNota === 'Conferido' || statusNota === 'Enviado ao Sankhya';
      });

      // 2. Procurar sessão em andamento COM contagens reais (> 0 bipagens)
      const ativaComBipagens = sessoesDaNota.find((s) => {
        const statusNota = s.sessao.statusPorNota?.[nunota] || s.sessao.status;
        return statusNota !== 'Conferido' && statusNota !== 'Enviado ao Sankhya' && s.totalBipagens > 0;
      });

      // 3. Procurar qualquer sessão ativa
      const ativaQualquer = sessoesDaNota.find((s) => {
        const statusNota = s.sessao.statusPorNota?.[nunota] || s.sessao.status;
        return statusNota !== 'Conferido' && statusNota !== 'Enviado ao Sankhya';
      });

      // Se existir uma sessão ativa com bipagens, ela é o trabalho em andamento prioritário
      // Se não houver sessão ativa com bipagens, mas existir uma CONCLUÍDA, a concluída SEMPRE prevalece sobre sessões vazias (0 bipagens)
      let escolhida = sessoesDaNota[0];
      if (ativaComBipagens) {
        escolhida = ativaComBipagens;
      } else if (concluida) {
        escolhida = concluida;
      } else if (ativaQualquer) {
        escolhida = ativaQualquer;
      }

      const statusNota = escolhida.sessao.statusPorNota?.[nunota] || escolhida.sessao.status;
      mapa[nunota] = {
        status: statusNota,
        id: escolhida.sessao.id,
        nivel: escolhida.sessao.nivelAtual,
      };
    }

    return mapa;
  }

  async reatribuirSequenciasBipagens(
    conferenciaId: string,
    nunota: number,
    codprod: number,
    itensTGFITE: Array<{ sequencia: number; controle?: string; qtdneg: number }>
  ): Promise<number> {
    if (!itensTGFITE || itensTGFITE.length === 0) return 0;

    const sql = `SELECT id, sequencia, lote, qtd_conferida
                 FROM bipagens_entrada
                 WHERE conferencia_id = ? AND nunota = ? AND codprod = ? AND anulado = 0
                 ORDER BY timestamp ASC`;
    const res = await this.client.execute({ sql, args: [conferenciaId, nunota, codprod] });
    if (res.rows.length === 0) return 0;

    let alteradas = 0;

    for (const row of res.rows) {
      const bId = String(row.id);
      const bLote = row.lote ? String(row.lote).trim().toUpperCase() : '';
      const bSeqAtual = Number(row.sequencia);

      if (bLote) {
        const itemCorrespondente = itensTGFITE.find(
          (it) => it.controle && String(it.controle).trim().toUpperCase() === bLote
        );

        if (itemCorrespondente && itemCorrespondente.sequencia !== bSeqAtual) {
          await this.client.execute({
            sql: `UPDATE bipagens_entrada SET sequencia = ? WHERE id = ?`,
            args: [itemCorrespondente.sequencia, bId],
          });
          alteradas++;
        }
      }
    }

    if (alteradas > 0 && this.auditService) {
      await this.auditService.registrar({
        usuario: 'Sistema',
        acao: 'REATRIBUIR_SEQUENCIAS_DESMEMBRAMENTO',
        recurso: `conferencia:${conferenciaId}`,
        detalhes: { conferenciaId, nunota, codprod, alteradas },
      });
    }

    return alteradas;
  }

  async obterSessoesComBackupPorChaveOuNota(
    chavenfe?: string,
    numnota?: number,
    codparc?: number,
    excluirConferenciaId?: string
  ): Promise<SessaoConferenciaEntrada[]> {
    const clausulas: string[] = [];
    const args: any[] = [];

    if (chavenfe && chavenfe.trim().length > 0) {
      clausulas.push(`chavenfe = ?`);
      args.push(chavenfe.trim());
    }

    if (numnota && codparc) {
      clausulas.push(`(numnota = ? AND codparc = ?)`);
      args.push(numnota, codparc);
    } else if (numnota) {
      clausulas.push(`numnota = ?`);
      args.push(numnota);
    }

    let sqlWhere = `(${clausulas.join(' OR ')}) AND (
      backup_contagem_json IS NOT NULL OR 
      (SELECT COUNT(*) FROM bipagens_entrada b WHERE b.conferencia_id = conferencias_entrada.id) > 0
    )`;
    if (excluirConferenciaId) {
      sqlWhere += ` AND id <> ?`;
      args.push(excluirConferenciaId);
    }

    const res = await this.client.execute({
      sql: `SELECT id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em,
                   finalizado_em, aprovado_por, aprovado_em, enviado_sankhya_em, observacao_aprovacao,
                   resposta_sankhya_json, backup_contagem_json, status_por_nota_json, decisoes_fiscais_json,
                   chavenfe, numnota, codparc
            FROM conferencias_entrada
            WHERE ${sqlWhere}
            ORDER BY atualizado_em DESC`,
      args,
    });

    return res.rows.map((r) => this.mapSessao(r));
  }

  async migrarERestaurarBipagensParaNovaNota(
    deConferenciaId: string,
    paraConferenciaId: string,
    novoNunota: number,
    mapaSequenciasPorProd: Record<number, number>
  ): Promise<number> {
    const bipagens = await this.listarBipagens(deConferenciaId);
    const temAnuladas = bipagens.some((b) => b.anulado);
    const paraRestaurar = temAnuladas ? bipagens.filter((b) => b.anulado) : bipagens;
    let total = 0;

    for (const b of paraRestaurar) {
      const novaSeq = mapaSequenciasPorProd[b.codprod] ?? b.sequencia;
      await this.client.execute({
        sql: `UPDATE bipagens_entrada
              SET conferencia_id = ?, nunota = ?, sequencia = ?, anulado = 0
              WHERE id = ?`,
        args: [paraConferenciaId, novoNunota, novaSeq, b.id],
      });
      total++;
    }

    if (this.auditService) {
      await this.auditService.registrar({
        usuario: 'Gestor',
        acao: 'MIGRAR_E_RESTAURAR_BIPAGENS',
        recurso: `conferencia:${paraConferenciaId}`,
        detalhes: {
          deConferenciaId,
          paraConferenciaId,
          novoNunota,
          totalMigradas: total,
        },
      });
    }

    return total;
  }
}


