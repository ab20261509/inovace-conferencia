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
    nunotas?: number[],
    origem?: 'coletor' | 'gestao'
  ): Promise<ObterItensConferenciaResponse> {
    const url = conferenciaId ? `/api/recebimento/conferencia/${conferenciaId}/itens` : `/api/recebimento/conferencia/novo/itens`;
    const params: Record<string, string> = {};
    if (nunotas && nunotas.length > 0) {
      params.nunotas = nunotas.join(',');
    }
    if (origem) {
      params.origem = origem;
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
    motivo?: string,
    nunota?: number
  ): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.post<SessaoConferenciaEntrada>(
      `/api/recebimento/conferencia/${conferenciaId}/reiniciar`,
      { motivo, nunota }
    );
    return response.data;
  }

  async enviarSankhya(
    conferenciaId: string,
    dadosOuObservacao?: string | import('../../domain/models/ConferenciaEntrada').EnviarSankhyaInput
  ): Promise<import('../../domain/models/ConferenciaEntrada').EnviarSankhyaResponse> {
    const payload = typeof dadosOuObservacao === 'string'
      ? { observacao: dadosOuObservacao }
      : (dadosOuObservacao || {});

    const response = await httpClient.post<import('../../domain/models/ConferenciaEntrada').EnviarSankhyaResponse>(
      `/api/recebimento/conferencia/${conferenciaId}/enviar-sankhya`,
      payload
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
    dados: {
      nivel: number;
      motivo?: string;
      itens?: Array<{ nunota: number; sequencia: number; codprod: number }>;
    }
  ): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.post<{ success: boolean; sessao: SessaoConferenciaEntrada }>(
      `/api/recebimento/conferencia/${conferenciaId}/recontar`,
      dados
    );
    return response.data.sessao;
  }

  async recuperarContagem(
    conferenciaId: string,
    motivo?: string,
    backupConferenciaId?: string
  ): Promise<SessaoConferenciaEntrada> {
    const response = await httpClient.post<{ success: boolean; sessao: SessaoConferenciaEntrada }>(
      `/api/recebimento/conferencia/${conferenciaId}/recuperar`,
      { motivo, backupConferenciaId }
    );
    return response.data.sessao;
  }

  async sincronizarDesmembramento(
    conferenciaId: string,
    params: { nunota: number; codprod?: number; sequencia?: number }
  ): Promise<{ sucesso: boolean; alterado: boolean; mensagem: string; divergencias?: any[] }> {
    const response = await httpClient.post<{ sucesso: boolean; alterado: boolean; mensagem: string; divergencias?: any[] }>(
      `/api/recebimento/conferencia/${conferenciaId}/sincronizar-desmembramento`,
      params
    );
    return response.data;
  }

  async desmembrarItem(
    conferenciaId: string,
    params: {
      nunota: number;
      sequencia: number;
      lotes: Array<{ lote: string; qtd: number; dtval?: string; dtfab?: string; codlocal?: number }>;
    }
  ): Promise<{ sucesso: boolean; mensagem: string; divergencias?: any[] }> {
    const response = await httpClient.post<{ sucesso: boolean; mensagem: string; divergencias?: any[] }>(
      `/api/recebimento/conferencia/${conferenciaId}/desmembrar-item`,
      params
    );
    return response.data;
  }

  async alterarLocalItem(params: {
    nunota: number;
    sequencia: number;
    codlocal: number;
    conferenciaId?: string;
  }): Promise<{ sucesso: boolean; mensagem: string; nunota: number; sequencia: number; codlocal: number }> {
    const response = await httpClient.put<{ sucesso: boolean; mensagem: string; nunota: number; sequencia: number; codlocal: number }>(
      '/api/recebimento/conferencia/item/local',
      params
    );
    return response.data;
  }

  /* ══════════════════════════════════════════════════════
     OCORRÊNCIAS & PENDÊNCIAS (AVARIA, VENCIDOS, ETC.)
     ══════════════════════════════════════════════════════ */

  async registrarOcorrencia(
    dados: import('../../domain/models/OcorrenciaRecebimento').RegistrarOcorrenciaInput
  ): Promise<import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento> {
    const response = await httpClient.post<import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento>(
      '/api/recebimento/ocorrencias',
      dados
    );
    return response.data;
  }

  async listarOcorrencias(filtros?: {
    conferenciaId?: string;
    nunota?: number;
    tipo?: string;
    status?: string;
  }): Promise<import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento[]> {
    const response = await httpClient.get<import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento[]>(
      '/api/recebimento/ocorrencias',
      { params: filtros }
    );
    return response.data;
  }

  async atualizarOcorrencia(
    id: string,
    dados: Partial<import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento>
  ): Promise<import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento> {
    const response = await httpClient.put<import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento>(
      `/api/recebimento/ocorrencias/${id}`,
      dados
    );
    return response.data;
  }

  async removerOcorrencia(id: string): Promise<void> {
    await httpClient.delete(`/api/recebimento/ocorrencias/${id}`);
  }

  async buscarCatalogoProdutos(
    termo: string
  ): Promise<import('../../domain/models/OcorrenciaRecebimento').ProdutoCatalogoItem[]> {
    const response = await httpClient.get<import('../../domain/models/OcorrenciaRecebimento').ProdutoCatalogoItem[]>(
      '/api/recebimento/produtos/catalogo',
      { params: { termo } }
    );
    return response.data;
  }

  async buscarProdutoInternet(
    codbarra: string
  ): Promise<import('../../domain/models/OcorrenciaRecebimento').ProdutoInternetResultado> {
    const response = await httpClient.get<import('../../domain/models/OcorrenciaRecebimento').ProdutoInternetResultado>(
      '/api/recebimento/produtos/buscar-internet',
      { params: { codbarra } }
    );
    return response.data;
  }

  async listarLocaisEstoque(): Promise<import('../../domain/models/OcorrenciaRecebimento').LocalEstoqueItem[]> {
    const response = await httpClient.get<import('../../domain/models/OcorrenciaRecebimento').LocalEstoqueItem[]>(
      '/api/recebimento/locais-estoque'
    );
    return response.data;
  }

  async notificarDiscordOcorrencias(payload: {
    nunota: number;
    numnota?: number;
    razaosocial?: string;
    ocorrencias: import('../../domain/models/OcorrenciaRecebimento').OcorrenciaRecebimento[];
    usuario?: string;
  }): Promise<{ sucesso: boolean; mensagem: string }> {
    const response = await httpClient.post<{ sucesso: boolean; mensagem: string }>(
      '/api/recebimento/ocorrencias/notificar-discord',
      payload
    );
    return response.data;
  }
}

