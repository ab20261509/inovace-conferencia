import {
  CatalogoTela,
  CamposSensiveisConfig,
} from '../entities/ConfiguracaoTela.js';

export interface IConfiguracaoTelasRepository {
  /** Retorna todo o catálogo de telas com a configuração atual de sensibilidade */
  obterCatalogoEConfiguracao(): Promise<{
    catalogo: CatalogoTela[];
    configuracao: CamposSensiveisConfig;
  }>;

  /** Obtém quais campos de uma tela específica estão marcados como sensíveis */
  obterCamposSensiveis(idTela: string): Promise<Record<string, boolean>>;

  /** Salva a configuração de campos sensíveis de uma tela */
  salvarCamposSensiveis(
    idTela: string,
    campos: Record<string, boolean>,
    atualizadoPor?: string,
  ): Promise<void>;

  /**
   * Avalia se um campo específico deve ser ocultado para um determinado usuário.
   * Retorna TRUE se o campo for sensível E o usuário NÃO tiver permissão 'ver_campos_sensiveis'.
   */
  deveOcultarCampo(idTela: string, chaveCampo: string, usuario?: string): Promise<boolean>;
}
