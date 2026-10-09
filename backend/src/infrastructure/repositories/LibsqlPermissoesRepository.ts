import { Client } from '@libsql/client';
import { IPermissoesRepository } from '../../domain/ports/IPermissoesRepository.js';
import {
  ModulosUsuario,
  UsuarioAcesso,
  PERMISSOES_ADMINISTRADOR,
  PERMISSOES_PADRAO_OPERADOR,
} from '../../domain/entities/PermissaoUsuario.js';
import { AuditService } from '../database/AuditService.js';

const ADMINS_PADRAO = new Set(['SUP', 'ANTONY', 'ANTONY.B']);

function normalizarLogin(login: string): string {
  return (login || '').trim().toUpperCase();
}

export class LibsqlPermissoesRepository implements IPermissoesRepository {
  constructor(
    private readonly client: Client,
    private readonly auditService?: AuditService,
  ) {}

  async obterPermissoes(codUsu: number, nomeUsu: string): Promise<ModulosUsuario> {
    const loginNorm = normalizarLogin(nomeUsu);
    const ehAdminNativo = ADMINS_PADRAO.has(loginNorm);
    const defaults = ehAdminNativo ? PERMISSOES_ADMINISTRADOR : PERMISSOES_PADRAO_OPERADOR;

    const res = await this.client.execute({
      sql: `SELECT modulos_json FROM usuarios_acessos WHERE cod_usu = ? OR UPPER(nome_usu) = ? LIMIT 1`,
      args: [codUsu, loginNorm],
    });

    if (res.rows.length > 0) {
      try {
        const rawJson = String(res.rows[0].modulos_json || '{}');
        const modulos = JSON.parse(rawJson);
        const merged: ModulosUsuario = {
          ...defaults,
          ...modulos,
        };
        // Proteção anti-lockout: administradores nativos nunca perdem a permissão de gerenciar acessos
        if (ehAdminNativo) {
          merged.gerenciar_acessos = true;
        }
        return merged;
      } catch {
        return { ...defaults };
      }
    }

    return { ...defaults };
  }

  async salvarPermissoes(
    codUsu: number,
    nomeUsu: string,
    modulos: Partial<ModulosUsuario>,
    atualizadoPor?: string,
  ): Promise<UsuarioAcesso> {
    const anterior = await this.obterPermissoes(codUsu, nomeUsu);
    const modulosAtualizados: ModulosUsuario = {
      ...anterior,
      ...modulos,
    };
    const agora = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO usuarios_acessos (cod_usu, nome_usu, modulos_json, atualizado_em)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(cod_usu) DO UPDATE SET
              nome_usu = excluded.nome_usu,
              modulos_json = excluded.modulos_json,
              atualizado_em = excluded.atualizado_em`,
      args: [codUsu, nomeUsu, JSON.stringify(modulosAtualizados), agora],
    });

    if (this.auditService) {
      await this.auditService.registrar({
        usuario: atualizadoPor || 'Admin',
        acao: 'ALTERAR_PERMISSOES',
        recurso: `usuario:${codUsu}`,
        detalhes: { codUsu, nomeUsu, modulos: modulosAtualizados },
      });
    }

    return {
      codUsu,
      nomeUsu,
      modulos: modulosAtualizados,
      atualizadoEm: agora,
      atualizadoPor,
    };
  }

  async registrarAcesso(codUsu: number, nomeUsu: string): Promise<UsuarioAcesso> {
    const loginNorm = normalizarLogin(nomeUsu);
    const agora = new Date().toISOString();

    const res = await this.client.execute({
      sql: `SELECT cod_usu, nome_usu, modulos_json, primeiro_acesso_em, ultimo_acesso_em, atualizado_em
            FROM usuarios_acessos
            WHERE cod_usu = ? OR UPPER(nome_usu) = ?
            LIMIT 1`,
      args: [codUsu, loginNorm],
    });

    if (res.rows.length > 0) {
      const row = res.rows[0];
      const primeiroAcesso = (row.primeiro_acesso_em as string) || agora;
      const ehAdminNativo = ADMINS_PADRAO.has(loginNorm);
      const defaults = ehAdminNativo ? PERMISSOES_ADMINISTRADOR : PERMISSOES_PADRAO_OPERADOR;
      let modulos: ModulosUsuario = { ...defaults };
      try {
        modulos = { ...modulos, ...JSON.parse(String(row.modulos_json || '{}')) };
        if (ehAdminNativo) {
          modulos.gerenciar_acessos = true;
        }
      } catch {}

      await this.client.execute({
        sql: `UPDATE usuarios_acessos
              SET ultimo_acesso_em = ?, primeiro_acesso_em = ?, nome_usu = ?
              WHERE cod_usu = ?`,
        args: [agora, primeiroAcesso, nomeUsu || (row.nome_usu as string), codUsu],
      });

      return {
        codUsu,
        nomeUsu: nomeUsu || (row.nome_usu as string),
        modulos,
        primeiroAcessoEm: primeiroAcesso,
        ultimoAcessoEm: agora,
        atualizadoEm: (row.atualizado_em as string) || agora,
      };
    }

    const ehAdmin = ADMINS_PADRAO.has(loginNorm);
    const modulosIniciais = ehAdmin ? { ...PERMISSOES_ADMINISTRADOR } : { ...PERMISSOES_PADRAO_OPERADOR };

    await this.client.execute({
      sql: `INSERT INTO usuarios_acessos (cod_usu, nome_usu, modulos_json, primeiro_acesso_em, ultimo_acesso_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [codUsu, nomeUsu, JSON.stringify(modulosIniciais), agora, agora, agora],
    });

    return {
      codUsu,
      nomeUsu,
      modulos: modulosIniciais,
      primeiroAcessoEm: agora,
      ultimoAcessoEm: agora,
      atualizadoEm: agora,
    };
  }

  async listarTodas(): Promise<Record<string, UsuarioAcesso>> {
    const res = await this.client.execute({
      sql: `SELECT cod_usu, nome_usu, modulos_json, primeiro_acesso_em, ultimo_acesso_em, atualizado_em
            FROM usuarios_acessos
            ORDER BY cod_usu ASC`,
      args: [],
    });

    const resultado: Record<string, UsuarioAcesso> = {};

    for (const r of res.rows) {
      const codUsu = Number(r.cod_usu);
      let modulos: ModulosUsuario = { ...PERMISSOES_PADRAO_OPERADOR };
      try {
        modulos = { ...modulos, ...JSON.parse(String(r.modulos_json || '{}')) };
      } catch {}

      resultado[String(codUsu)] = {
        codUsu,
        nomeUsu: String(r.nome_usu || ''),
        modulos,
        primeiroAcessoEm: (r.primeiro_acesso_em as string) || undefined,
        ultimoAcessoEm: (r.ultimo_acesso_em as string) || undefined,
        atualizadoEm: (r.atualizado_em as string) || new Date().toISOString(),
      };
    }

    return resultado;
  }
}
