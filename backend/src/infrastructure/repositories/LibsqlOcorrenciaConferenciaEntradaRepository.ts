import { Client } from '@libsql/client';
import {
  IOcorrenciaConferenciaEntradaRepository,
  FiltroOcorrenciasInput,
} from '../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';
import {
  OcorrenciaConferenciaEntrada,
  TipoOcorrenciaEntrada,
  StatusOcorrenciaEntrada,
  OrigemOcorrenciaEntrada,
} from '../../domain/entities/OcorrenciaConferenciaEntrada.js';

export class LibsqlOcorrenciaConferenciaEntradaRepository
  implements IOcorrenciaConferenciaEntradaRepository
{
  constructor(private readonly client: Client) {}

  private mapRow(row: any): OcorrenciaConferenciaEntrada {
    let fotos: string[] = [];
    if (row.fotos_json) {
      try {
        fotos = JSON.parse(String(row.fotos_json));
      } catch {
        fotos = [];
      }
    }

    return {
      id: String(row.id),
      conferenciaId: row.conferencia_id ? String(row.conferencia_id) : undefined,
      nunota:
        row.nunota !== null && row.nunota !== undefined && Number(row.nunota) > 0
          ? Number(row.nunota)
          : undefined,
      sequencia:
        row.sequencia !== null && row.sequencia !== undefined
          ? Number(row.sequencia)
          : undefined,
      codprod:
        row.codprod !== null && row.codprod !== undefined
          ? Number(row.codprod)
          : undefined,
      descrprod: row.descrprod ? String(row.descrprod) : undefined,
      tipo: String(row.tipo) as TipoOcorrenciaEntrada,
      quantidade: Number(row.quantidade),
      lote: row.lote ? String(row.lote) : undefined,
      validade: row.validade ? String(row.validade) : undefined,
      fabricacao: row.fabricacao ? String(row.fabricacao) : undefined,
      motivo: row.motivo ? String(row.motivo) : undefined,
      codlocalDestino:
        row.codlocal_destino !== null && row.codlocal_destino !== undefined
          ? Number(row.codlocal_destino)
          : undefined,
      fotos,
      status: String(row.status || 'PENDENTE') as StatusOcorrenciaEntrada,
      origem: String(row.origem || 'COLETOR') as OrigemOcorrenciaEntrada,
      criadoPor: row.criado_por ? String(row.criado_por) : undefined,
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),
    };
  }

  async criar(
    ocorrencia: OcorrenciaConferenciaEntrada
  ): Promise<OcorrenciaConferenciaEntrada> {
    const fotosJson = ocorrencia.fotos ? JSON.stringify(ocorrencia.fotos) : null;

    await this.client.execute({
      sql: `
        INSERT INTO ocorrencias_conferencia_entrada (
          id, conferencia_id, nunota, sequencia, codprod, descrprod,
          tipo, quantidade, lote, validade, fabricacao, motivo,
          codlocal_destino, fotos_json, status, origem, criado_por,
          criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        ocorrencia.id,
        ocorrencia.conferenciaId ?? null,
        ocorrencia.nunota ?? null,
        ocorrencia.sequencia ?? null,
        ocorrencia.codprod ?? null,
        ocorrencia.descrprod ?? null,
        ocorrencia.tipo,
        ocorrencia.quantidade,
        ocorrencia.lote ?? null,
        ocorrencia.validade ?? null,
        ocorrencia.fabricacao ?? null,
        ocorrencia.motivo ?? null,
        ocorrencia.codlocalDestino ?? null,
        fotosJson,
        ocorrencia.status || 'PENDENTE',
        ocorrencia.origem || 'COLETOR',
        ocorrencia.criadoPor ?? null,
        ocorrencia.criadoEm,
        ocorrencia.atualizadoEm,
      ],
    });

    return ocorrencia;
  }

  async obterPorId(id: string): Promise<OcorrenciaConferenciaEntrada | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM ocorrencias_conferencia_entrada WHERE id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async listar(
    filtros?: FiltroOcorrenciasInput
  ): Promise<OcorrenciaConferenciaEntrada[]> {
    const conditions: string[] = [];
    const args: any[] = [];

    if (filtros?.conferenciaId) {
      conditions.push(`conferencia_id = ?`);
      args.push(filtros.conferenciaId);
    }
    if (filtros?.nunota) {
      conditions.push(`nunota = ?`);
      args.push(filtros.nunota);
    }
    if (filtros?.tipo) {
      conditions.push(`tipo = ?`);
      args.push(filtros.tipo);
    }
    if (filtros?.status) {
      conditions.push(`status = ?`);
      args.push(filtros.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ocorrencias_conferencia_entrada ${whereClause} ORDER BY criado_em DESC`;

    const res = await this.client.execute({ sql, args });
    return res.rows.map((r) => this.mapRow(r));
  }

  async listarPorConferencia(
    conferenciaId: string
  ): Promise<OcorrenciaConferenciaEntrada[]> {
    return this.listar({ conferenciaId });
  }

  async listarPorNuNota(
    nunota: number
  ): Promise<OcorrenciaConferenciaEntrada[]> {
    return this.listar({ nunota });
  }

  async atualizar(
    id: string,
    dados: Partial<OcorrenciaConferenciaEntrada>
  ): Promise<OcorrenciaConferenciaEntrada> {
    const atual = await this.obterPorId(id);
    if (!atual) {
      throw new Error(`Ocorrência com ID "${id}" não encontrada.`);
    }

    const agora = new Date().toISOString();
    const fotos = dados.fotos !== undefined ? dados.fotos : atual.fotos;
    const fotosJson = fotos ? JSON.stringify(fotos) : null;

    const camposParaAtualizar: string[] = ['atualizado_em = ?'];
    const args: any[] = [agora];

    if (dados.tipo !== undefined) {
      camposParaAtualizar.push('tipo = ?');
      args.push(dados.tipo);
    }
    if (dados.quantidade !== undefined) {
      camposParaAtualizar.push('quantidade = ?');
      args.push(dados.quantidade);
    }
    if (dados.lote !== undefined) {
      camposParaAtualizar.push('lote = ?');
      args.push(dados.lote);
    }
    if (dados.validade !== undefined) {
      camposParaAtualizar.push('validade = ?');
      args.push(dados.validade);
    }
    if (dados.fabricacao !== undefined) {
      camposParaAtualizar.push('fabricacao = ?');
      args.push(dados.fabricacao);
    }
    if (dados.motivo !== undefined) {
      camposParaAtualizar.push('motivo = ?');
      args.push(dados.motivo);
    }
    if (dados.codlocalDestino !== undefined) {
      camposParaAtualizar.push('codlocal_destino = ?');
      args.push(dados.codlocalDestino);
    }
    if (dados.fotos !== undefined) {
      camposParaAtualizar.push('fotos_json = ?');
      args.push(fotosJson);
    }
    if (dados.status !== undefined) {
      camposParaAtualizar.push('status = ?');
      args.push(dados.status);
    }

    args.push(id);

    await this.client.execute({
      sql: `UPDATE ocorrencias_conferencia_entrada SET ${camposParaAtualizar.join(', ')} WHERE id = ?`,
      args,
    });

    return (await this.obterPorId(id))!;
  }

  async remover(id: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM ocorrencias_conferencia_entrada WHERE id = ?`,
      args: [id],
    });
  }
}
