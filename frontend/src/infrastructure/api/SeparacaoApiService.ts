import { httpClient } from './httpClient';
import {
  CargaPendente,
  ObterSeparacaoResponse,
  SincronizarSeparacaoResponse,
  BiparSeparacaoResponse,
  AtualizarEnderecoResponse,
  RegistrarFaltaResponse,
  ResolverFaltaResponse,
} from '../../domain/models/Separacao';

export class SeparacaoApiService {
  async listarCargas(ordemCarga?: number): Promise<CargaPendente[]> {
    const params: Record<string, any> = {};
    if (ordemCarga) params.ordemCarga = ordemCarga;
    const response = await httpClient.get<CargaPendente[]>('/api/separacao/cargas', { params });
    return response.data;
  }

  async iniciarSeparacao(ordemCarga: number): Promise<{ separacao: any; itens: any[]; recuperada: boolean }> {
    const response = await httpClient.post('/api/separacao/iniciar', { ordemCarga });
    return response.data;
  }

  async obterSeparacao(separacaoId: string): Promise<ObterSeparacaoResponse> {
    const response = await httpClient.get<ObterSeparacaoResponse>(`/api/separacao/${separacaoId}`);
    return response.data;
  }

  async sincronizar(separacaoId: string): Promise<SincronizarSeparacaoResponse> {
    const response = await httpClient.post<SincronizarSeparacaoResponse>(`/api/separacao/${separacaoId}/sincronizar`);
    return response.data;
  }

  async bipar(
    separacaoId: string,
    codigoBarras: string,
    quantidade: number = 1,
    lote?: string,
    nunotaFiltro?: number
  ): Promise<BiparSeparacaoResponse> {
    const response = await httpClient.post<BiparSeparacaoResponse>(`/api/separacao/${separacaoId}/bipar`, {
      codigoBarras,
      quantidade,
      lote,
      nunotaFiltro,
    });
    return response.data;
  }

  async anularBipagem(bipId: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const response = await httpClient.post(`/api/separacao/bipagem/${bipId}/anular`);
    return response.data;
  }

  async finalizar(
    separacaoId: string,
    permitirParcial: boolean = false,
    justificativa?: string
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    const response = await httpClient.post(`/api/separacao/${separacaoId}/finalizar`, {
      permitirParcial,
      justificativa,
    });
    return response.data;
  }

  async listarBipagens(separacaoId: string): Promise<any[]> {
    const response = await httpClient.get(`/api/separacao/${separacaoId}/bipagens`);
    return response.data;
  }

  async atualizarEndereco(
    separacaoId: string,
    codprod: number,
    codigoEndereco: string,
    controle?: string
  ): Promise<AtualizarEnderecoResponse> {
    const response = await httpClient.post<AtualizarEnderecoResponse>(`/api/separacao/${separacaoId}/endereco`, {
      codprod,
      codigoEndereco,
      controle,
    });
    return response.data;
  }

  async registrarFalta(
    separacaoId: string,
    codprod: number,
    motivoFalta: string,
    nunotaFiltro?: number
  ): Promise<RegistrarFaltaResponse> {
    const response = await httpClient.post<RegistrarFaltaResponse>(`/api/separacao/${separacaoId}/falta`, {
      codprod,
      motivoFalta,
      nunotaFiltro,
    });
    return response.data;
  }

  async resolverFalta(
    separacaoId: string,
    dados: {
      itemId?: string;
      codprod?: number;
      nunota?: number;
      acao: 'RESEPARAR' | 'CORTAR';
      quantidade?: number;
      lote?: string;
      observacao?: string;
    }
  ): Promise<ResolverFaltaResponse> {
    const response = await httpClient.post<ResolverFaltaResponse>(
      `/api/separacao/${separacaoId}/resolver-falta`,
      dados
    );
    return response.data;
  }

  async solicitarReabastecimento(
    separacaoId: string,
    dados?: { codprod?: number; observacao?: string }
  ): Promise<{ sucesso: boolean; mensagem: string; tarefasCriadas: number }> {
    const response = await httpClient.post<{ sucesso: boolean; mensagem: string; tarefasCriadas: number }>(
      `/api/separacao/${separacaoId}/solicitar-reabastecimento`,
      dados || {}
    );
    return response.data;
  }
}

export const separacaoApiService = new SeparacaoApiService();
