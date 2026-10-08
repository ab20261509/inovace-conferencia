import fs from 'node:fs';
import path from 'node:path';
import { IConfiguracaoTelasRepository } from '../../domain/ports/IConfiguracaoTelasRepository.js';
import { IPermissoesRepository } from '../../domain/ports/IPermissoesRepository.js';
import {
  CatalogoTela,
  CamposSensiveisConfig,
  CATALOGO_TELAS_SISTEMA,
} from '../../domain/entities/ConfiguracaoTela.js';

export class JsonConfiguracaoTelasRepository implements IConfiguracaoTelasRepository {
  private readonly filePath: string;
  private cache: CamposSensiveisConfig | null = null;

  constructor(
    private readonly permissoesRepo: IPermissoesRepository,
    customPath?: string,
  ) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const dockerPath = '/app/data/campos_telas.json';
      const rootLocalPath = path.resolve(process.cwd(), 'backend/data/campos_telas.json');
      const localPath = path.resolve(process.cwd(), 'data/campos_telas.json');

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
        console.warn('⚠️ Não foi possível criar diretório de configurações de tela:', dir);
      }
    }
  }

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

  private carregar(): CamposSensiveisConfig {
    if (this.cache !== null) {
      return this.cache;
    }

    const padroes = this.obterPadroes();

    try {
      if (fs.existsSync(this.filePath)) {
        const conteudo = fs.readFileSync(this.filePath, 'utf-8');
        const lido = JSON.parse(conteudo);
        // Faz merge com padrões para garantir que campos novos de catálogo existam
        this.cache = {};
        for (const [idTela, camposPadrao] of Object.entries(padroes)) {
          this.cache[idTela] = {
            ...camposPadrao,
            ...(lido[idTela] || {}),
          };
        }
      } else {
        this.cache = padroes;
        this.persistir();
      }
    } catch (err) {
      console.error('❌ Erro ao ler arquivo de campos de tela:', err);
      this.cache = padroes;
    }

    return this.cache;
  }

  private persistir(): void {
    try {
      this.garantirDiretorio();
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache || {}, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Erro ao persistir arquivo de campos de tela:', err);
    }
  }

  async obterCatalogoEConfiguracao(): Promise<{
    catalogo: CatalogoTela[];
    configuracao: CamposSensiveisConfig;
  }> {
    const configuracao = this.carregar();
    return {
      catalogo: CATALOGO_TELAS_SISTEMA,
      configuracao,
    };
  }

  async obterCamposSensiveis(idTela: string): Promise<Record<string, boolean>> {
    const dados = this.carregar();
    return dados[idTela] || this.obterPadroes()[idTela] || {};
  }

  async salvarCamposSensiveis(
    idTela: string,
    campos: Record<string, boolean>,
    _atualizadoPor?: string,
  ): Promise<void> {
    const dados = this.carregar();
    dados[idTela] = {
      ...(dados[idTela] || {}),
      ...campos,
    };
    this.persistir();
  }

  async deveOcultarCampo(idTela: string, chaveCampo: string, usuario?: string): Promise<boolean> {
    // 1. Se o campo não for considerado sensível na configuração da tela, não oculta
    const camposTela = await this.obterCamposSensiveis(idTela);
    const ehSensivel = camposTela[chaveCampo] ?? false;
    if (!ehSensivel) {
      return false;
    }

    // 2. Se o usuário tiver permissão 'ver_campos_sensiveis', não oculta
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

    // Usuário sem permissão e campo marcado como sensível: deve ocultar!
    return true;
  }
}
