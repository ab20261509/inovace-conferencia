import { IConferenciaService } from '../../domain/ports/IConferenciaService';
import {
  PedidoConferencia,
  ItemPedido,
  ConferenciaIniciada,
  ProdutoConferencia,
  ConferirItemResponse,
  ItemConferidoDetalhe,
  ExcluirItemConferidoResponse,
  NotificacaoDiscordDados,
  NotificarDiscordResponse,
} from '../../domain/models/Conferencia';
import { httpClient } from './httpClient';

export class ConferenciaApiService implements IConferenciaService {
  async listarPedidos(): Promise<PedidoConferencia[]> {
    const response = await httpClient.get<{ records: PedidoConferencia[] }>('/api/conferencias');
    return response.data.records;
  }

  async iniciarConferencia(nuNota: number, codUsu?: number, nomeUsu?: string, mgeSession?: string): Promise<ConferenciaIniciada> {
    const response = await httpClient.post<ConferenciaIniciada>('/api/conferencias/iniciar', { nuNota, codUsu, nomeUsu, mgeSession });
    return response.data;
  }

  async listarItensPedido(nuNota: number): Promise<{ conferenciaIniciada: boolean; itens: ItemPedido[] }> {
    const response = await httpClient.post<{ conferenciaIniciada: boolean; itens: ItemPedido[] }>(
      '/api/conferencias/itens-pedido',
      { nuNota },
    );
    return response.data;
  }

  async listarItensConferidos(nuConf: string | number, nuNota?: number): Promise<ItemConferidoDetalhe[]> {
    const response = await httpClient.post<{ itens: ItemConferidoDetalhe[] }>(
      '/api/conferencias/itens-conferidos',
      { nuConf, nuNota },
    );
    return response.data.itens;
  }

  async getProduto(nuNota: number, codBarra: string): Promise<ProdutoConferencia> {
    const response = await httpClient.post<{ produto: ProdutoConferencia }>(
      '/api/conferencias/produto',
      { nuNota, codBarra },
    );
    return response.data.produto;
  }

  async conferirItem(params: {
    numConf: string;
    nuNota: number;
    codBarra: string;
    qtdConf: string;
  }): Promise<ConferirItemResponse> {
    const response = await httpClient.post<ConferirItemResponse>(
      '/api/conferencias/conferir-item',
      params,
    );
    return response.data;
  }

  async excluirItemConferido(params: {
    nuConf: string;
    seqConf: string;
    nuNota: number;
  }): Promise<ExcluirItemConferidoResponse> {
    const response = await httpClient.post<ExcluirItemConferidoResponse>(
      '/api/conferencias/excluir-item-conferido',
      params,
    );
    return response.data;
  }

  async finalizarConferencia(nuConf: string, peso = 0, qtdVol = 0): Promise<any> {
    const response = await httpClient.post('/api/conferencias/finalizar', { nuConf, peso, qtdVol });
    return response.data;
  }

  async excluirConferencia(nuNota: number): Promise<{ qtdConferenciasExcluidas: number }> {
    const response = await httpClient.post<{ qtdConferenciasExcluidas: number }>(
      '/api/conferencias/excluir',
      { nuNota },
    );
    return response.data;
  }

  async cortarNota(nuNota: number, peso = 0, qtdVol = 0): Promise<any> {
    const response = await httpClient.post('/api/conferencias/cortar', { nuNota, peso, qtdVol });
    return response.data;
  }

  async obterPreviaDiscord(nuNota: number, usuario?: string): Promise<NotificacaoDiscordDados> {
    const response = await httpClient.post<NotificacaoDiscordDados>('/api/conferencias/previa-discord', {
      nuNota,
      usuario,
    });
    return response.data;
  }

  async notificarDiscord(nuNota: number, usuario?: string): Promise<NotificarDiscordResponse> {
    const response = await httpClient.post<NotificarDiscordResponse>('/api/conferencias/notificar-discord', {
      nuNota,
      usuario,
    });
    return response.data;
  }
}
