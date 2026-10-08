import fs from 'node:fs';
import path from 'node:path';
import { IPermissoesRepository } from '../../domain/ports/IPermissoesRepository.js';
import {
  ModulosUsuario,
  UsuarioAcesso,
  PERMISSOES_ADMINISTRADOR,
  PERMISSOES_PADRAO_OPERADOR,
} from '../../domain/entities/PermissaoUsuario.js';

const ADMINS_PADRAO = new Set(['SUP', 'ANTONY', 'ANTONY.B']);

function normalizarLogin(login: string): string {
  return (login || '').trim().toUpperCase();
}

export class JsonPermissoesRepository implements IPermissoesRepository {
  private readonly filePath: string;
  private cache: Record<string, UsuarioAcesso> | null = null;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      // Procura primeiro em /app/data (ambiente Docker) ou na pasta local data/
      const dockerPath = '/app/data/acessos.json';
      const localPath = path.resolve(process.cwd(), 'data/acessos.json');
      const rootLocalPath = path.resolve(process.cwd(), 'backend/data/acessos.json');

      if (fs.existsSync('/app/data')) {
        this.filePath = dockerPath;
      } else if (fs.existsSync(path.resolve(process.cwd(), 'backend'))) {
        this.filePath = rootLocalPath;
      } else {
        this.filePath = localPath;
      }
    }

    this.garantirDiretorio();
    this.carregar();
  }

  private garantirDiretorio(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn('⚠️ Não foi possível criar diretório de dados:', dir);
      }
    }
  }

  private carregar(): Record<string, UsuarioAcesso> {
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      if (fs.existsSync(this.filePath)) {
        const conteudo = fs.readFileSync(this.filePath, 'utf-8');
        this.cache = JSON.parse(conteudo);
      } else {
        this.cache = {};
        this.persistir();
      }
    } catch (err) {
      console.error('❌ Erro ao ler arquivo de acessos:', err);
      this.cache = {};
    }

    return this.cache!;
  }

  private persistir(): void {
    try {
      this.garantirDiretorio();
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache || {}, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Erro ao persistir arquivo de acessos:', err);
    }
  }

  async obterPermissoes(codUsu: number, nomeUsu: string): Promise<ModulosUsuario> {
    const dados = this.carregar();
    const loginNorm = normalizarLogin(nomeUsu);

    // Administradores nativos sempre têm acesso total garantido
    if (ADMINS_PADRAO.has(loginNorm)) {
      return { ...PERMISSOES_ADMINISTRADOR };
    }

    // Busca por codUsu ou por nomeUsu
    const chave = String(codUsu);
    const registro = dados[chave] || dados[loginNorm];

    if (registro && registro.modulos) {
      return {
        ...PERMISSOES_PADRAO_OPERADOR,
        ...registro.modulos,
      };
    }

    // Se o usuário ainda não foi configurado, recebe o perfil padrão de operador
    return { ...PERMISSOES_PADRAO_OPERADOR };
  }

  async salvarPermissoes(
    codUsu: number,
    nomeUsu: string,
    modulos: Partial<ModulosUsuario>,
    atualizadoPor?: string,
  ): Promise<UsuarioAcesso> {
    const dados = this.carregar();
    const chave = String(codUsu);
    const anterior = dados[chave]?.modulos || (await this.obterPermissoes(codUsu, nomeUsu));

    const modulosAtualizados: ModulosUsuario = {
      ...anterior,
      ...modulos,
    };

    const registro: UsuarioAcesso = {
      codUsu,
      nomeUsu,
      modulos: modulosAtualizados,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor,
    };

    dados[chave] = registro;
    this.persistir();

    return registro;
  }

  async registrarAcesso(codUsu: number, nomeUsu: string): Promise<UsuarioAcesso> {
    const dados = this.carregar();
    const chave = String(codUsu);
    const loginNorm = normalizarLogin(nomeUsu);
    const agora = new Date().toISOString();

    const existente = dados[chave] || dados[loginNorm];

    if (existente) {
      existente.codUsu = codUsu;
      existente.nomeUsu = nomeUsu || existente.nomeUsu;
      existente.ultimoAcessoEm = agora;
      if (!existente.primeiroAcessoEm) {
        existente.primeiroAcessoEm = agora;
      }
      dados[chave] = existente;
      this.persistir();
      return existente;
    }

    const ehAdmin = ADMINS_PADRAO.has(loginNorm);
    const novo: UsuarioAcesso = {
      codUsu,
      nomeUsu,
      modulos: ehAdmin ? { ...PERMISSOES_ADMINISTRADOR } : { ...PERMISSOES_PADRAO_OPERADOR },
      primeiroAcessoEm: agora,
      ultimoAcessoEm: agora,
      atualizadoEm: agora,
    };

    dados[chave] = novo;
    this.persistir();
    return novo;
  }

  async listarTodas(): Promise<Record<string, UsuarioAcesso>> {
    return { ...this.carregar() };
  }
}
