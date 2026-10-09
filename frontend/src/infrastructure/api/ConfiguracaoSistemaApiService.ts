import { httpClient } from './httpClient';

export interface ParametroSistema {
  chave: string;
  valor: string;
  descricao?: string;
  atualizadoEm?: string;
}

export class ConfiguracaoSistemaApiService {
  async listarParametros(): Promise<Record<string, ParametroSistema>> {
    const response = await httpClient.get<Record<string, ParametroSistema>>('/api/configuracoes/sistema');
    return response.data;
  }

  async salvarParametro(chave: string, valor: string, descricao?: string): Promise<void> {
    await httpClient.put(`/api/configuracoes/sistema/${chave}`, { valor, descricao });
  }
}
