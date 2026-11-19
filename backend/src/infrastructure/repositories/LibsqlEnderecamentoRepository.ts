import { Client } from '@libsql/client';
import { RegistroHistoricoEnderecamento, TipoAcaoEnderecamento, TipoEnderecoWMS } from '../../domain/entities/Enderecamento.js';
import { IEnderecamentoRepository, FiltrosHistoricoEnderecamento } from '../../domain/ports/IEnderecamentoRepository.js';

export class LibsqlEnderecamentoRepository implements IEnderecamentoRepository {
  constructor(private readonly client: Client) {}

  private mapRow(row: any): RegistroHistoricoEnderecamento {
    return {
      id: String(row.id),
      codprod: Number(row.codprod),
      descrprod: row.descrprod ? String(row.descrprod) : null,
      controle: String(row.controle || ' '),
      tipoAcao: row.tipo_acao as TipoAcaoEnderecamento,
      codendOrigem: row.codend_origem != null ? Number(row.codend_origem) : null,
      enderecoOrigem: row.endereco_origem ? String(row.endereco_origem) : null,
      tipoOrigem: row.tipo_origem ? (row.tipo_origem as TipoEnderecoWMS) : null,
      codendDestino: row.codend_destino != null ? Number(row.codend_destino) : null,
      enderecoDestino: row.endereco_destino ? String(row.endereco_destino) : null,
      tipoDestino: row.tipo_destino ? (row.tipo_destino as TipoEnderecoWMS) : null,
      motivo: row.motivo ? String(row.motivo) : null,
      usuario: String(row.usuario),
      criadoEm: String(row.criado_em),
    };
  }

  async salvarHistorico(registro: RegistroHistoricoEnderecamento): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO historico_enderecamento (
        id, codprod, descrprod, controle, tipo_acao,
        codend_origem, endereco_origem, tipo_origem,
        codend_destino, endereco_destino, tipo_destino,
        motivo, usuario, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        registro.id,
        registro.codprod,
        registro.descrprod || null,
        registro.controle || ' ',
        registro.tipoAcao,
        registro.codendOrigem != null ? registro.codendOrigem : null,
        registro.enderecoOrigem || null,
        registro.tipoOrigem || null,
        registro.codendDestino != null ? registro.codendDestino : null,
        registro.enderecoDestino || null,
        registro.tipoDestino || null,
        registro.motivo || null,
        registro.usuario,
        registro.criadoEm,
      ],
    });
  }

  async listarHistorico(filtros?: FiltrosHistoricoEnderecamento): Promise<RegistroHistoricoEnderecamento[]> {
    let sql = 'SELECT * FROM historico_enderecamento WHERE 1=1';
    const args: any[] = [];

    if (filtros?.codprod) {
      sql += ' AND codprod = ?';
      args.push(filtros.codprod);
    }

    if (filtros?.codend) {
      sql += ' AND (codend_origem = ? OR codend_destino = ?)';
      args.push(filtros.codend, filtros.codend);
    }

    if (filtros?.tipoAcao) {
      sql += ' AND tipo_acao = ?';
      args.push(filtros.tipoAcao);
    }

    if (filtros?.usuario) {
      sql += ' AND LOWER(usuario) LIKE ?';
      args.push(`%${filtros.usuario.toLowerCase()}%`);
    }

    if (filtros?.dataInicio) {
      sql += ' AND criado_em >= ?';
      args.push(filtros.dataInicio);
    }

    if (filtros?.dataFim) {
      sql += ' AND criado_em <= ?';
      args.push(filtros.dataFim);
    }

    sql += ' ORDER BY criado_em DESC';

    const limite = filtros?.limite || 100;
    sql += ` LIMIT ${limite}`;

    const res = await this.client.execute({ sql, args });
    return res.rows.map((r: any) => this.mapRow(r));
  }
}
