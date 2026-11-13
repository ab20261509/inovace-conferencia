import { httpClient } from './httpClient';
import {
  TarefaReabastecimento,
  ListarReabastecimentoResponse,
  StatusReabastecimento,
} from '../../domain/models/Reabastecimento';

export class ReabastecimentoApiService {
  async listar(filtros?: {
    status?: StatusReabastecimento;
    ordemCarga?: number;
    codprod?: number;
  }): Promise<ListarReabastecimentoResponse> {
    const params = new URLSearchParams();
    if (filtros?.status) params.append('status', filtros.status);
    if (filtros?.ordemCarga) params.append('ordemCarga', String(filtros.ordemCarga));
    if (filtros?.codprod) params.append('codprod', String(filtros.codprod));

    const qs = params.toString();
    const url = qs ? `/api/reabastecimento?${qs}` : '/api/reabastecimento';

    const res = await httpClient.get<ListarReabastecimentoResponse>(url);
    return res.data;
  }

  async concluir(
    id: string,
    quantidadeAtendida?: number,
    observacao?: string,
  ): Promise<{ sucesso: boolean; mensagem: string; tarefa: TarefaReabastecimento }> {
    const res = await httpClient.post<{
      sucesso: boolean;
      mensagem: string;
      tarefa: TarefaReabastecimento;
    }>(`/api/reabastecimento/${id}/concluir`, {
      quantidadeAtendida,
      observacao,
    });
    return res.data;
  }

  async cancelar(
    id: string,
    motivo?: string,
  ): Promise<{ sucesso: boolean; mensagem: string; tarefa: TarefaReabastecimento }> {
    const res = await httpClient.post<{
      sucesso: boolean;
      mensagem: string;
      tarefa: TarefaReabastecimento;
    }>(`/api/reabastecimento/${id}/cancelar`, {
      motivo,
    });
    return res.data;
  }

  async registrarFalta(
    id: string,
    motivo?: string,
  ): Promise<{ sucesso: boolean; mensagem: string; tarefa: TarefaReabastecimento }> {
    const res = await httpClient.post<{
      sucesso: boolean;
      mensagem: string;
      tarefa: TarefaReabastecimento;
    }>(`/api/reabastecimento/${id}/falta`, {
      motivo,
    });
    return res.data;
  }

  async finalizarFalta(
    id: string,
    acao: 'CORTAR' = 'CORTAR',
    observacao?: string,
  ): Promise<{ sucesso: boolean; mensagem: string; tarefa: TarefaReabastecimento }> {
    const res = await httpClient.post<{
      sucesso: boolean;
      mensagem: string;
      tarefa: TarefaReabastecimento;
    }>(`/api/reabastecimento/${id}/finalizar-falta`, {
      acao,
      observacao,
    });
    return res.data;
  }
}

export const reabastecimentoApiService = new ReabastecimentoApiService();
