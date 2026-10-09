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

  async listarDivergencias(): Promise<import('../../domain/models/ConferenciaEntrada').ConferenciaDivergenciaGrupo[]> {
    const response = await httpClient.get<import('../../domain/models/ConferenciaEntrada').ConferenciaDivergenciaGrupo[]>(
      '/api/recebimento/conferencia/divergencias'
    );
    return response.data;
  }

  async resolverDivergencia(
    conferenciaId: string,
    dados: import('../../domain/models/ConferenciaEntrada').ResolverDivergenciaInput
  ): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.put<SessaoConferenciaEntrada>(
      `/api/recebimento/conferencia/${conferenciaId}/resolver-divergencia`,
      dados
    );
    return response.data;
  }

  async reiniciarConferencia(
    conferenciaId: string,
    motivo?: string
  ): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.post<SessaoConferenciaEntrada>(
      `/api/recebimento/conferencia/${conferenciaId}/reiniciar`,
      { motivo }
    );
    return response.data;
  }

  async enviarSankhya(
    conferenciaId: string,
    observacao?: string
  ): Promise<import('../../domain/models/ConferenciaEntrada').EnviarSankhyaResponse> {
    const response = await httpClient.post<import('../../domain/models/ConferenciaEntrada').EnviarSankhyaResponse>(
      `/api/recebimento/conferencia/${conferenciaId}/enviar-sankhya`,
      { observacao }
    );
    return response.data;
  }

  async listarTodasConferencias(): Promise<import('../../domain/models/ConferenciaEntrada').ConferenciaEntradaResumo[]> {
    const response = await httpClient.get<import('../../domain/models/ConferenciaEntrada').ConferenciaEntradaResumo[]>(
      '/api/recebimento/conferencias'
    );
    return response.data;
  }

  async solicitarRecontagem(
    conferenciaId: string,
    dados: { nivel: number; motivo?: string }
  ): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.post<{ success: boolean; sessao: SessaoConferenciaEntrada }>(
      `/api/recebimento/conferencia/${conferenciaId}/recontar`,
      dados
    );
    return response.data.sessao;
  }

  async recuperarContagem(
    conferenciaId: string,
    motivo?: string
  ): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.post<{ success: boolean; sessao: SessaoConferenciaEntrada }>(
      `/api/recebimento/conferencia/${conferenciaId}/recuperar`,
      { motivo }
    );
    return response.data.sessao;
  }
}
