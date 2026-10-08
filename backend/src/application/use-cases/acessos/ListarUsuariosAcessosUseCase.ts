import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { ModulosUsuario } from '../../../domain/entities/PermissaoUsuario.js';
import { AcessoNegadoError } from '../../../domain/errors/AppError.js';

export interface UsuarioComAcessos {
  codUsu: number;
  nomeUsu: string;
  codGrupo?: number;
  ativo: string;
  modulos: ModulosUsuario;
  primeiroAcessoEm?: string;
  ultimoAcessoEm?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
}

export interface ListarUsuariosAcessosInput {
  codUsuSolicitante: number;
  nomeUsuSolicitante: string;
}

export interface ListarUsuariosAcessosOutput {
  usuarios: UsuarioComAcessos[];
}

export class ListarUsuariosAcessosUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly permissoesRepo: IPermissoesRepository,
  ) {}

  async execute(
    input: ListarUsuariosAcessosInput,
    correlationId?: string,
  ): Promise<ListarUsuariosAcessosOutput> {
    // 1. Valida se o solicitante tem permissão para gerenciar acessos
    const minhasPermissoes = await this.permissoesRepo.obterPermissoes(
      input.codUsuSolicitante,
      input.nomeUsuSolicitante,
    );

    if (!minhasPermissoes.gerenciar_acessos) {
      throw new AcessoNegadoError('Apenas administradores podem gerenciar acessos');
    }

    // 2. Consulta usuários ativos na TSIUSU do Sankhya
    const sql = `
      SELECT CODUSU, NOMEUSU, CODGRUPO, ATIVO 
      FROM TSIUSU 
      WHERE ATIVO = 'S' 
      ORDER BY NOMEUSU
    `.trim();

    let rows: any[] = [];
    try {
      const response = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        {
          serviceName: 'DbExplorerSP.executeQuery',
          requestBody: { sql },
        },
        correlationId,
      );
      rows = response?.responseBody?.rows || [];
    } catch (err: any) {
      console.error('⚠️ Falha ao consultar TSIUSU no Sankhya:', err.message);
    }

    // Garante que o usuário solicitante está registrado com seu último acesso
    if (input.codUsuSolicitante && input.nomeUsuSolicitante) {
      try {
        await this.permissoesRepo.registrarAcesso(
          input.codUsuSolicitante,
          input.nomeUsuSolicitante,
        );
      } catch (err) {
        console.warn('⚠️ Falha ao registrar acesso do solicitante:', err);
      }
    }

    // 3. Carrega todas as permissões e acessos cadastrados no repositório
    const todasPermissoes = await this.permissoesRepo.listarTodas();

    const usuarios: UsuarioComAcessos[] = [];
    const usuariosProcessados = new Set<number>();

    for (const r of rows) {
      const codUsu = Number(r[0]);
      const nomeUsu = String(r[1] || '').trim();
      const codGrupo = r[2] ? Number(r[2]) : undefined;
      const ativo = String(r[3] || 'S').trim();

      usuariosProcessados.add(codUsu);

      const modulos = await this.permissoesRepo.obterPermissoes(codUsu, nomeUsu);
      const registroSalvo = todasPermissoes[String(codUsu)];

      usuarios.push({
        codUsu,
        nomeUsu,
        codGrupo,
        ativo,
        modulos,
        primeiroAcessoEm: registroSalvo?.primeiroAcessoEm,
        ultimoAcessoEm: registroSalvo?.ultimoAcessoEm,
        atualizadoEm: registroSalvo?.atualizadoEm,
        atualizadoPor: registroSalvo?.atualizadoPor,
      });
    }

    // Inclui todos os usuários que já logaram ou foram cadastrados no repositório
    for (const [chave, reg] of Object.entries(todasPermissoes)) {
      const codUsu = Number(chave);
      if (!isNaN(codUsu) && !usuariosProcessados.has(codUsu)) {
        usuarios.push({
          codUsu: reg.codUsu,
          nomeUsu: reg.nomeUsu,
          ativo: 'S',
          modulos: reg.modulos,
          primeiroAcessoEm: reg.primeiroAcessoEm,
          ultimoAcessoEm: reg.ultimoAcessoEm,
          atualizadoEm: reg.atualizadoEm,
          atualizadoPor: reg.atualizadoPor,
        });
      }
    }

    // Ordenação: quem acessou mais recentemente aparece no topo
    usuarios.sort((a, b) => {
      if (a.ultimoAcessoEm && b.ultimoAcessoEm) {
        return new Date(b.ultimoAcessoEm).getTime() - new Date(a.ultimoAcessoEm).getTime();
      }
      if (a.ultimoAcessoEm) return -1;
      if (b.ultimoAcessoEm) return 1;
      return a.nomeUsu.localeCompare(b.nomeUsu);
    });

    return { usuarios };
  }
}
