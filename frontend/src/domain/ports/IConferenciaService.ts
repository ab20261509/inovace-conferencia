import {
  PedidoConferencia,
  ItemPedido,
  ConferenciaIniciada,
  ProdutoConferencia,
  ConferirItemResponse,
  ItemConferidoDetalhe,
  ExcluirItemConferidoResponse,
} from '../models/Conferencia';

export interface IConferenciaService {
  listarPedidos(): Promise<PedidoConferencia[]>;
  iniciarConferencia(nuNota: number, codUsu?: number, nomeUsu?: string, mgeSession?: string): Promise<ConferenciaIniciada>;
  listarItensPedido(nuNota: number): Promise<{ conferenciaIniciada: boolean; itens: ItemPedido[] }>;
  listarItensConferidos(nuConf: string | number): Promise<ItemConferidoDetalhe[]>;
  getProduto(nuNota: number, codBarra: string): Promise<ProdutoConferencia>;
  conferirItem(params: {
    numConf: string;
    nuNota: number;
    codBarra: string;
    qtdConf: string;
  }): Promise<ConferirItemResponse>;
  excluirItemConferido(params: {
    nuConf: string;
    seqConf: string;
    nuNota: number;
  }): Promise<ExcluirItemConferidoResponse>;
  finalizarConferencia(nuConf: string, peso?: number, qtdVol?: number): Promise<any>;
  excluirConferencia(nuNota: number): Promise<{ qtdConferenciasExcluidas: number }>;
}
