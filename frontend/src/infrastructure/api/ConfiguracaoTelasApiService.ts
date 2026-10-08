import { httpClient } from './httpClient';
import { ConfiguracaoTelasResponse } from '../../domain/models/ConfiguracaoTela';

export class ConfiguracaoTelasApiService {
  async listarConfiguracaoTelas(): Promise<ConfiguracaoTelasResponse> {
    const response = await httpClient.get<ConfiguracaoTelasResponse>('/api/configuracoes/telas');
    return response.data;
  }

  async salvarConfiguracaoTela(idTela: string, campos: Record<string, boolean>): Promise<void> {
    await httpClient.put(`/api/configuracoes/telas/${idTela}`, { campos });
  }
}
