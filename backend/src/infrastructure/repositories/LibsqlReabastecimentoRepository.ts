import { Client } from '@libsql/client';
import { TarefaReabastecimento, StatusReabastecimento } from '../../domain/entities/Reabastecimento.js';
import { IReabastecimentoRepository, FiltrosReabastecimento } from '../../domain/ports/IReabastecimentoRepository.js';

export class LibsqlReabastecimentoRepository implements IReabastecimentoRepository {
  constructor(private readonly client: Client) {}

  private mapRow(row: any): TarefaReabastecimento {
    return {
      id: String(row.id),
      separacaoId: row.separacao_id ? String(row.separacao_id) : null,
      ordemCarga: Number(row.ordem_carga),
      codemp: row.codemp != null ? Number(row.codemp) : null,
      nomeEmpresa: row.nome_empresa ? String(row.nome_empresa) : null,
      codprod: Number(row.codprod),
      descrprod: row.descrprod ? String(row.descrprod) : null,
      referencia: row.referencia ? String(row.referencia) : null,
      codbarra: row.codbarra ? String(row.codbarra) : null,
      codendPulmao: row.codend_pulmao != null ? Number(row.codend_pulmao) : null,
      enderecoPulmao: row.endereco_pulmao ? String(row.endereco_pulmao) : null,
      descrendPulmao: row.descrend_pulmao ? String(row.descrend_pulmao) : null,
      codendPicking: row.codend_picking != null ? Number(row.codend_picking) : null,
      enderecoPicking: row.endereco_picking ? String(row.endereco_picking) : null,
      descrendPicking: row.descrend_picking ? String(row.descrend_picking) : null,
      quantidadeSolicitada: Number(row.quantidade_solicitada || 0),
      quantidadeAtendida: Number(row.quantidade_atendida || 0),
      status: row.status as StatusReabastecimento,
      observacao: row.observacao ? String(row.observacao) : null,
      solicitadoEm: String(row.solicitado_em),
      solicitadoPor: String(row.solicitado_por),
      concluidoEm: row.concluido_em ? String(row.concluido_em) : null,
      concluidoPor: row.concluido_por ? String(row.concluido_por) : null,
    };
  }

  async criarTarefa(tarefa: TarefaReabastecimento): Promise<void> {
    await this.criarTarefasEmLote([tarefa]);
  }

  async criarTarefasEmLote(tarefas: TarefaReabastecimento[]): Promise<void> {
    if (tarefas.length === 0) return;

    for (const t of tarefas) {
      await this.client.execute({
        sql: `INSERT INTO tarefas_reabastecimento (
          id, separacao_id, ordem_carga, codemp, nome_empresa, codprod, descrprod, referencia, codbarra,
          codend_pulmao, endereco_pulmao, descrend_pulmao,
          codend_picking, endereco_picking, descrend_picking,
          quantidade_solicitada, quantidade_atendida, status, observacao,
          solicitado_em, solicitado_por, concluido_em, concluido_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          t.id,
          t.separacaoId || null,
          t.ordemCarga,
          t.codemp ?? null,
          t.nomeEmpresa || null,
          t.codprod,
          t.descrprod || null,
          t.referencia || null,
          t.codbarra || null,
          t.codendPulmao != null ? t.codendPulmao : null,
          t.enderecoPulmao || null,
          t.descrendPulmao || null,
          t.codendPicking != null ? t.codendPicking : null,
          t.enderecoPicking || null,
          t.descrendPicking || null,
          t.quantidadeSolicitada,
          t.quantidadeAtendida || 0,
          t.status,
          t.observacao || null,
          t.solicitadoEm,
          t.solicitadoPor,
          t.concluidoEm || null,
          t.concluidoPor || null,
        ],
      });
    }
  }

  async buscarPorId(id: string): Promise<TarefaReabastecimento | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM tarefas_reabastecimento WHERE id = ? LIMIT 1;`,
      args: [id],
    });
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async listar(filtros?: FiltrosReabastecimento): Promise<TarefaReabastecimento[]> {
    let sql = `SELECT * FROM tarefas_reabastecimento WHERE 1=1`;
    const args: any[] = [];

    if (filtros?.status) {
      sql += ` AND status = ?`;
      args.push(filtros.status);
    }
    if (filtros?.ordemCarga) {
      sql += ` AND ordem_carga = ?`;
      args.push(filtros.ordemCarga);
    }
    if (filtros?.codprod) {
      sql += ` AND codprod = ?`;
      args.push(filtros.codprod);
    }

    sql += ` ORDER BY CASE status WHEN 'PENDENTE' THEN 1 WHEN 'VERIFICAR_ESTOQUE' THEN 2 WHEN 'EM_ANDAMENTO' THEN 3 ELSE 4 END, solicitado_em DESC;`;

    const res = await this.client.execute({ sql, args });
    return res.rows.map((r) => this.mapRow(r));
  }

  async atualizar(id: string, dados: Partial<TarefaReabastecimento>): Promise<void> {
    const campos: string[] = [];
    const args: any[] = [];

    if (dados.quantidadeAtendida !== undefined) {
      campos.push('quantidade_atendida = ?');
      args.push(dados.quantidadeAtendida);
    }
    if (dados.status !== undefined) {
      campos.push('status = ?');
      args.push(dados.status);
    }
    if (dados.observacao !== undefined) {
      campos.push('observacao = ?');
      args.push(dados.observacao);
    }
    if (dados.concluidoEm !== undefined) {
      campos.push('concluido_em = ?');
      args.push(dados.concluidoEm);
    }
    if (dados.concluidoPor !== undefined) {
      campos.push('concluido_por = ?');
      args.push(dados.concluidoPor);
    }

    if (campos.length === 0) return;

    args.push(id);
    await this.client.execute({
      sql: `UPDATE tarefas_reabastecimento SET ${campos.join(', ')} WHERE id = ?;`,
      args,
    });
  }
}
