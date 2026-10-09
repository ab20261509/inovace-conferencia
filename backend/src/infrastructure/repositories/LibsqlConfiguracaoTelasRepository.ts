import { Client } from '@libsql/client';
import { IConfiguracaoTelasRepository } from '../../domain/ports/IConfiguracaoTelasRepository.js';
import { IPermissoesRepository } from '../../domain/ports/IPermissoesRepository.js';
import {
  CatalogoTela,
  CamposSensiveisConfig,
  CATALOGO_TELAS_SISTEMA,
} from '../../domain/entities/ConfiguracaoTela.js';
import { AuditService } from '../database/AuditService.js';

export class LibsqlConfiguracaoTelasRepository implements IConfiguracaoTelasRepository {
  constructor(
    private readonly client: Client,
    private readonly permissoesRepo: IPermissoesRepository,
    private readonly auditService?: AuditService,
  ) {}

  private obterPadroes(): CamposSensiveisConfig {
    const padroes: CamposSensiveisConfig = {};
    for (const tela of CATALOGO_TELAS_SISTEMA) {
      padroes[tela.idTela] = {};
      for (const campo of tela.campos) {
        padroes[tela.idTela][campo.chave] = campo.sensivelPadrao;
      }
    }
    return padroes;
  }

  async obterCatalogoEConfiguracao(): Promise<{
    catalogo: CatalogoTela[];
    configuracao: CamposSensiveisConfig;
  }> {
    const configuracao = await this.carregarConfiguracao();
    return {
      catalogo: CATALOGO_TELAS_SISTEMA,
      configuracao,
    };
  }

  async obterCamposSensiveis(idTela: string): Promise<Record<string, boolean>> {
    const padroes = this.obterPadroes()[idTela] || {};

    const res = await this.client.execute({
      sql: `SELECT chave_campo, sensivel FROM configuracoes_telas WHERE id_tela = ?`,
      args: [idTela],
    });

    const resultado: Record<string, boolean> = { ...padroes };
    for (const r of res.rows) {
      resultado[String(r.chave_campo)] = Number(r.sensivel) === 1;
    }

    return resultado;
  }

  async salvarCamposSensiveis(
    idTela: string,
    campos: Record<string, boolean>,
    atualizadoPor?: string,
  ): Promise<void> {
    for (const [chaveCampo, sensivel] of Object.entries(campos)) {
      await this.client.execute({
        sql: `INSERT INTO configuracoes_telas (id_tela, chave_campo, sensivel)
              VALUES (?, ?, ?)
              ON CONFLICT(id_tela, chave_campo) DO UPDATE SET
                sensivel = excluded.sensivel`,
        args: [idTela, chaveCampo, sensivel ? 1 : 0],
      });
    }

    if (this.auditService) {
      await this.auditService.registrar({
        usuario: atualizadoPor || 'Admin',
        acao: 'ALTERAR_CAMPOS_SENSIVEIS',
        recurso: `tela:${idTela}`,
        detalhes: { idTela, campos },
      });
    }
  }

  async deveOcultarCampo(idTela: string, chaveCampo: string, usuario?: string): Promise<boolean> {
    const camposTela = await this.obterCamposSensiveis(idTela);
    let ehSensivel = camposTela[chaveCampo] ?? false;

    // Compatibilidade de chaves entre telas/versões para campos de quantidade
    if (!ehSensivel && idTela === 'conferencia_entrada') {
      if (chaveCampo === 'qtdPed' && camposTela['qtdNota'] !== undefined) {
        ehSensivel = camposTela['qtdNota'];
      } else if (chaveCampo === 'qtdNota' && camposTela['qtdPed'] !== undefined) {
        ehSensivel = camposTela['qtdPed'];
      }
    }
    if (!ehSensivel && idTela === 'conferencia_saida') {
      if (chaveCampo === 'qtdNota' && camposTela['qtdPed'] !== undefined) {
        ehSensivel = camposTela['qtdPed'];
      }
    }

    if (!ehSensivel) {
      return false;
    }

    if (usuario) {
      try {
        const permissoes = await this.permissoesRepo.obterPermissoes(0, usuario);
        if (permissoes.ver_campos_sensiveis) {
          return false;
        }
      } catch (err) {
        console.warn('⚠️ Falha ao verificar permissões do usuário para campo sensível:', err);
      }
    }

    return true;
  }

  private async carregarConfiguracao(): Promise<CamposSensiveisConfig> {
    const padroes = this.obterPadroes();
    const res = await this.client.execute({
      sql: `SELECT id_tela, chave_campo, sensivel FROM configuracoes_telas`,
      args: [],
    });

    const config: CamposSensiveisConfig = {};
    for (const [idTela, camposPadrao] of Object.entries(padroes)) {
      config[idTela] = { ...camposPadrao };
    }

    for (const r of res.rows) {
      const idTela = String(r.id_tela);
      const chave = String(r.chave_campo);
      const sensivel = Number(r.sensivel) === 1;

      if (!config[idTela]) {
        config[idTela] = {};
      }
      config[idTela][chave] = sensivel;
    }

    return config;
  }
}
