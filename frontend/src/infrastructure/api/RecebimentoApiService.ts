import { httpClient } from './httpClient';
import {
  NotaEntrada,
  SessaoConferenciaEntrada,
  ObterItensConferenciaResponse,
  BiparResponse,
  FinalizarNivelResponse,
} from '../../domain/models/ConferenciaEntrada';

export class RecebimentoApiService {
  async listarNotas(filtros?: {
    numeroNota?: string;
    fornecedor?: string;
    status?: string;
  }): Promise<NotaEntrada[]> {
    const params: Record<string, string> = {};
    if (filtros?.numeroNota) params.numeroNota = filtros.numeroNota;
    if (filtros?.fornecedor) params.fornecedor = filtros.fornecedor;
    if (filtros?.status) params.status = filtros.status;

    const response = await httpClient.get<NotaEntrada[]>('/api/recebimento/notas', { params });
    return response.data;
  }

  async obterItensConferencia(
    conferenciaId?: string,
    nunotas?: number[]
  ): Promise<ObterItensConferenciaResponse> {
    const url = conferenciaId ? `/api/recebimento/conferencia/${conferenciaId}/itens` : `/api/recebimento/conferencia/novo/itens`;
    const params: Record<string, string> = {};
    if (nunotas && nunotas.length > 0) {
      params.nunotas = nunotas.join(',');
    }

    const response = await httpClient.get<ObterItensConferenciaResponse>(url, { params });
    return response.data;
  }

  async iniciarConferencia(nunotas: number[], nivel?: number): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.post<SessaoConferenciaEntrada>(
      '/api/recebimento/conferencia/iniciar',
      { nunotas, nivel }
    );
    return response.data;
  }

  async bipar(
    conferenciaId: string,
    dados: {
      codigo: string;
      quantidade?: number;
      nivel?: number;
      lote?: string;
      validade?: string;
      fabricacao?: string;
    }
  ): Promise<BiparResponse> {
    const response = await httpClient.post<BiparResponse>(
      `/api/recebimento/conferencia/${conferenciaId}/bipar`,
      dados
    );
    return response.data;
  }

  async anularBipagem(bipagemId: string): Promise<void> {
    await httpClient.put(`/api/recebimento/conferencia/bipagens/${bipagemId}/anular`);
  }

  async finalizarNivel(conferenciaId: string, nivel: number): Promise<FinalizarNivelResponse> {
    const response = await httpClient.post<FinalizarNivelResponse>(
      `/api/recebimento/conferencia/${conferenciaId}/finalizar`,
      { nivel }
    );
    return response.data;
  }
}
