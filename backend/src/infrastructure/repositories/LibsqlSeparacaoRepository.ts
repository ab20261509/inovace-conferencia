import { Client } from '@libsql/client';
import { ISeparacaoRepository } from '../../domain/ports/ISeparacaoRepository.js';
import {
  Separacao,
  SeparacaoItem,
  SeparacaoBipagem,
  StatusSeparacao,
  StatusItemSeparacao,
} from '../../domain/entities/Separacao.js';
import { AuditService } from '../database/AuditService.js';

export class LibsqlSeparacaoRepository implements ISeparacaoRepository {
  constructor(
    private readonly client: Client,
    private readonly auditService?: AuditService,
  ) {}

  private mapSeparacao(row: any): Separacao {
    return {
      id: String(row.id),
      ordemCarga: Number(row.ordem_carga),
      codemp: row.codemp != null ? Number(row.codemp) : undefined,
      nomeEmpresa: row.nome_empresa ? String(row.nome_empresa) : null,
      status: row.status as StatusSeparacao,
      usuario: String(row.usuario || '').trim(),
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),
      finalizadoEm: row.finalizado_em ? String(row.finalizado_em) : null,
      totalPedidos: Number(row.total_pedidos || 0),
      totalItens: Number(row.total_itens || 0),
      totalUnidades: Number(row.total_unidades || 0),
      observacoes: row.observacoes ? String(row.observacoes) : null,
      dadosCargaJson: row.dados_carga_json ? String(row.dados_carga_json) : null,
    };
  }

  private mapItem(row: any): SeparacaoItem {
    return {
      id: String(row.id),
      separacaoId: String(row.separacao_id),
      ordemCarga: Number(row.ordem_carga),
      nunota: Number(row.nunota),
      sequencia: Number(row.sequencia),
      codprod: Number(row.codprod),
      descrprod: row.descrprod ? String(row.descrprod) : null,
      referencia: row.referencia ? String(row.referencia) : null,
      codbarra: row.codbarra ? String(row.codbarra) : null,
      controle: row.controle ? String(row.controle) : null,
      codlocal: row.codlocal != null ? Number(row.codlocal) : null,
      codvol: row.codvol ? String(row.codvol) : null,
      codend: row.codend != null ? Number(row.codend) : null,
      endereco: row.endereco ? String(row.endereco) : null,
      descrend: row.descrend ? String(row.descrend) : null,
      lado: row.lado ? String(row.lado) : null,
      codendPulmao: row.codend_pulmao != null ? Number(row.codend_pulmao) : null,
      enderecoPulmao: row.endereco_pulmao ? String(row.endereco_pulmao) : null,
      descrendPulmao: row.descrend_pulmao ? String(row.descrend_pulmao) : null,
      ladoPulmao: row.lado_pulmao ? String(row.lado_pulmao) : null,
      qtdEsperada: Number(row.qtd_esperada || 0),
      qtdSeparada: Number(row.qtd_separada || 0),
      qtdFalta: Number(row.qtd_falta || 0),
      motivoFalta: row.motivo_falta ? String(row.motivo_falta) : null,
      statusItem: row.status_item as StatusItemSeparacao,
      qtdErpAtual: row.qtd_erp_atual != null ? Number(row.qtd_erp_atual) : null,
      observacaoAlteracao: row.observacao_alteracao ? String(row.observacao_alteracao) : null,
      atualizadoEm: String(row.atualizado_em),
    };
  }

  private mapBipagem(row: any): SeparacaoBipagem {
    return {
      id: String(row.id),
      separacaoId: String(row.separacao_id),
      itemId: row.item_id ? String(row.item_id) : null,
      nunota: Number(row.nunota),
      codprod: Number(row.codprod),
      codbarra: String(row.codbarra),
      quantidade: Number(row.quantidade || 0),
      lote: row.lote ? String(row.lote) : null,
      usuario: String(row.usuario || '').trim(),
      timestamp: String(row.timestamp),
      anulado: Number(row.anulado || 0),
    };
  }

  async criarSeparacao(separacao: Separacao, itens: SeparacaoItem[]): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO separacoes (
        id, ordem_carga, codemp, nome_empresa, status, usuario, criado_em, atualizado_em,
        total_pedidos, total_itens, total_unidades, observacoes, dados_carga_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        separacao.id,
        separacao.ordemCarga,
        separacao.codemp ?? null,
        separacao.nomeEmpresa || null,
        separacao.status,
        separacao.usuario,
        separacao.criadoEm,
        separacao.atualizadoEm,
        separacao.totalPedidos,
        separacao.totalItens,
        separacao.totalUnidades,
        separacao.observacoes || null,
        separacao.dadosCargaJson || null,
      ],
    });

    for (const item of itens) {
      await this.client.execute({
        sql: `INSERT INTO separacoes_itens (
          id, separacao_id, ordem_carga, nunota, sequencia, codprod,
          descrprod, referencia, codbarra, controle, codlocal, codvol,
          codend, endereco, descrend, lado, codend_pulmao, endereco_pulmao, descrend_pulmao, lado_pulmao,
          qtd_esperada, qtd_separada, qtd_falta, motivo_falta, status_item, qtd_erp_atual,
          observacao_alteracao, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          item.id,
          item.separacaoId,
          item.ordemCarga,
          item.nunota,
          item.sequencia,
          item.codprod,
          item.descrprod || null,
          item.referencia || null,
          item.codbarra || null,
          item.controle || null,
          item.codlocal != null ? item.codlocal : null,
          item.codvol || null,
          item.codend != null ? item.codend : null,
          item.endereco || null,
          item.descrend || null,
          item.lado || null,
          item.codendPulmao != null ? item.codendPulmao : null,
          item.enderecoPulmao || null,
          item.descrendPulmao || null,
          item.ladoPulmao || null,
          item.qtdEsperada,
          item.qtdSeparada,
          item.qtdFalta != null ? item.qtdFalta : 0,
          item.motivoFalta || null,
          item.statusItem,
          item.qtdErpAtual != null ? item.qtdErpAtual : null,
          item.observacaoAlteracao || null,
          item.atualizadoEm,
        ],
      });
    }

    if (this.auditService) {
      await this.auditService.registrar({
        usuario: separacao.usuario,
        acao: 'CRIAR_SEPARACAO',
        recurso: 'separacoes',
        detalhes: {
          separacaoId: separacao.id,
          ordemCarga: separacao.ordemCarga,
          totalPedidos: separacao.totalPedidos,
          totalItens: separacao.totalItens,
        },
      });
    }
  }

  async buscarPorId(id: string): Promise<Separacao | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM separacoes WHERE id = ? LIMIT 1;`,
      args: [id],
    });
    if (res.rows.length === 0) return null;
    return this.mapSeparacao(res.rows[0]);
  }

  async buscarPorOrdemCarga(ordemCarga: number, status?: StatusSeparacao): Promise<Separacao | null> {
    let sql = `SELECT * FROM separacoes WHERE ordem_carga = ?`;
    const args: any[] = [ordemCarga];
    if (status) {
      sql += ` AND status = ?`;
      args.push(status);
    } else {
      sql += ` ORDER BY criado_em DESC`;
    }
    sql += ` LIMIT 1;`;

    const res = await this.client.execute({ sql, args });
    if (res.rows.length === 0) return null;
    return this.mapSeparacao(res.rows[0]);
  }

  async listarAtivas(): Promise<Separacao[]> {
    const res = await this.client.execute({
      sql: `SELECT * FROM separacoes WHERE status = 'EM_ANDAMENTO' ORDER BY criado_em DESC;`,
      args: [],
    });
    return res.rows.map((row) => this.mapSeparacao(row));
  }

  async listarItens(separacaoId: string): Promise<SeparacaoItem[]> {
    const res = await this.client.execute({
      sql: `SELECT * FROM separacoes_itens WHERE separacao_id = ? ORDER BY nunota ASC, sequencia ASC;`,
      args: [separacaoId],
    });
    return res.rows.map((row) => this.mapItem(row));
  }

  async buscarItemPorId(itemId: string): Promise<SeparacaoItem | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM separacoes_itens WHERE id = ? LIMIT 1;`,
      args: [itemId],
    });
    if (res.rows.length === 0) return null;
    return this.mapItem(res.rows[0]);
  }

  async atualizarSeparacao(id: string, dados: Partial<Separacao>): Promise<void> {
    const campos: string[] = [];
    const args: any[] = [];

    if (dados.status !== undefined) {
      campos.push('status = ?');
      args.push(dados.status);
    }
    if (dados.finalizadoEm !== undefined) {
      campos.push('finalizado_em = ?');
      args.push(dados.finalizadoEm);
    }
    if (dados.observacoes !== undefined) {
      campos.push('observacoes = ?');
      args.push(dados.observacoes);
    }
    if (dados.totalPedidos !== undefined) {
      campos.push('total_pedidos = ?');
      args.push(dados.totalPedidos);
    }
    if (dados.totalItens !== undefined) {
      campos.push('total_itens = ?');
      args.push(dados.totalItens);
    }
    if (dados.totalUnidades !== undefined) {
      campos.push('total_unidades = ?');
      args.push(dados.totalUnidades);
    }

    campos.push('atualizado_em = ?');
    args.push(new Date().toISOString());

    args.push(id);

    await this.client.execute({
      sql: `UPDATE separacoes SET ${campos.join(', ')} WHERE id = ?;`,
      args,
    });
  }

  async atualizarItem(id: string, dados: Partial<SeparacaoItem>): Promise<void> {
    const campos: string[] = [];
    const args: any[] = [];

    if (dados.qtdSeparada !== undefined) {
      campos.push('qtd_separada = ?');
      args.push(dados.qtdSeparada);
    }
    if (dados.qtdFalta !== undefined) {
      campos.push('qtd_falta = ?');
      args.push(dados.qtdFalta);
    }
    if (dados.motivoFalta !== undefined) {
      campos.push('motivo_falta = ?');
      args.push(dados.motivoFalta);
    }
    if (dados.statusItem !== undefined) {
      campos.push('status_item = ?');
      args.push(dados.statusItem);
    }
    if (dados.qtdErpAtual !== undefined) {
      campos.push('qtd_erp_atual = ?');
      args.push(dados.qtdErpAtual);
    }
    if (dados.observacaoAlteracao !== undefined) {
      campos.push('observacao_alteracao = ?');
      args.push(dados.observacaoAlteracao);
    }
    if (dados.controle !== undefined) {
      campos.push('controle = ?');
      args.push(dados.controle);
    }
    if (dados.codend !== undefined) {
      campos.push('codend = ?');
      args.push(dados.codend);
    }
    if (dados.endereco !== undefined) {
      campos.push('endereco = ?');
      args.push(dados.endereco);
    }
    if (dados.descrend !== undefined) {
      campos.push('descrend = ?');
      args.push(dados.descrend);
    }
    if (dados.lado !== undefined) {
      campos.push('lado = ?');
      args.push(dados.lado);
    }
    if (dados.codendPulmao !== undefined) {
      campos.push('codend_pulmao = ?');
      args.push(dados.codendPulmao);
    }
    if (dados.enderecoPulmao !== undefined) {
      campos.push('endereco_pulmao = ?');
      args.push(dados.enderecoPulmao);
    }
    if (dados.descrendPulmao !== undefined) {
      campos.push('descrend_pulmao = ?');
      args.push(dados.descrendPulmao);
    }
    if (dados.ladoPulmao !== undefined) {
      campos.push('lado_pulmao = ?');
      args.push(dados.ladoPulmao);
    }

    campos.push('atualizado_em = ?');
    args.push(new Date().toISOString());

    args.push(id);

    await this.client.execute({
      sql: `UPDATE separacoes_itens SET ${campos.join(', ')} WHERE id = ?;`,
      args,
    });
  }

  async inserirItem(item: SeparacaoItem): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO separacoes_itens (
        id, separacao_id, ordem_carga, nunota, sequencia, codprod,
        descrprod, referencia, codbarra, controle, codlocal, codvol,
        codend, endereco, descrend, codend_pulmao, endereco_pulmao, descrend_pulmao,
        qtd_esperada, qtd_separada, qtd_falta, motivo_falta, status_item, qtd_erp_atual,
        observacao_alteracao, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        item.id,
        item.separacaoId,
        item.ordemCarga,
        item.nunota,
        item.sequencia,
        item.codprod,
        item.descrprod || null,
        item.referencia || null,
        item.codbarra || null,
        item.controle || null,
        item.codlocal != null ? item.codlocal : null,
        item.codvol || null,
        item.codend != null ? item.codend : null,
        item.endereco || null,
        item.descrend || null,
        item.codendPulmao != null ? item.codendPulmao : null,
        item.enderecoPulmao || null,
        item.descrendPulmao || null,
        item.qtdEsperada,
        item.qtdSeparada,
        item.qtdFalta != null ? item.qtdFalta : 0,
        item.motivoFalta || null,
        item.statusItem,
        item.qtdErpAtual != null ? item.qtdErpAtual : null,
        item.observacaoAlteracao || null,
        item.atualizadoEm,
      ],
    });
  }

  async registrarBipagem(bipagem: SeparacaoBipagem): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO separacoes_bipagens (
        id, separacao_id, item_id, nunota, codprod, codbarra,
        quantidade, lote, usuario, timestamp, anulado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        bipagem.id,
        bipagem.separacaoId,
        bipagem.itemId || null,
        bipagem.nunota,
        bipagem.codprod,
        bipagem.codbarra,
        bipagem.quantidade,
        bipagem.lote || null,
        bipagem.usuario,
        bipagem.timestamp,
        bipagem.anulado,
      ],
    });
  }

  async listarBipagens(separacaoId: string): Promise<SeparacaoBipagem[]> {
    const res = await this.client.execute({
      sql: `SELECT * FROM separacoes_bipagens WHERE separacao_id = ? AND anulado = 0 ORDER BY timestamp DESC;`,
      args: [separacaoId],
    });
    return res.rows.map((row) => this.mapBipagem(row));
  }

  async anularBipagem(bipId: string): Promise<SeparacaoBipagem | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM separacoes_bipagens WHERE id = ? LIMIT 1;`,
      args: [bipId],
    });
    if (res.rows.length === 0) return null;
    const bip = this.mapBipagem(res.rows[0]);

    await this.client.execute({
      sql: `UPDATE separacoes_bipagens SET anulado = 1 WHERE id = ?;`,
      args: [bipId],
    });

    if (this.auditService) {
      await this.auditService.registrar({
        usuario: bip.usuario,
        acao: 'ESTORNO_BIP_SEPARACAO',
        recurso: 'separacoes_bipagens',
        detalhes: { bipId, codprod: bip.codprod, quantidade: bip.quantidade },
      });
    }

    return bip;
  }
}
