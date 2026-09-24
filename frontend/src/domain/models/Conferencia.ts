export interface PedidoConferencia {
  nunota: number;
  codEmp: number;
  dtFaturamento: string | null;
  dtInicioConferencia: string | null;
  nuConf: number | null;
  usuarioConferente: string | null;
  nroUnico: number;
  statusConferencia: string;
  rotaEntrega: string | null;
  transportadora: string | null;
  ordemCarga: number | null;
  numNota: number;
  parceiro: string | null;
  obsPedido: string | null;
  qtdVolumes: number | null;
  qtdProdutosDistintos: number;
}

/**
 * Situação do item, calculada pelo backend.
 *
 * A tela usa este campo em vez de comparar `qtdConf` com `qtdPed`, porque
 * `qtdPed` não é enviada para usuários não privilegiados (conferência cega).
 */
export type StatusItem = 'pendente' | 'parcial' | 'completo';

export interface ItemPedido {
  codProd: string;
  sequencia: string;
  descrProd: string | null;
  codBarra: string | null;
  referencia: string | null;
  /** `null` quando o usuário não tem permissão para ver a quantidade pedida */
  qtdPed: string | null;
  qtdConf: string;
  controle: string | null;
  status: StatusItem;
}

export interface ConferenciaIniciada {
  numConf: string;
  numNota: string;
  tipMov: string;
  vendedor: string;
  parceiro: string;
  /** 'S' quando o Sankhya identificou início de recontagem */
  isRecontagem?: string;
  /** Tipo de contagem retornado pelo Sankhya */
  tipoContagem?: string;
  configuracoes: Record<string, string>;
}

export interface ProdutoConferencia {
  codProd: string;
  descrProd: string;
  tipoContagem: string;
  aferidoPelaBalanca: string;
  ignoraLote: string;
  decQtd: string;
}

export interface ItemConferidoResponse {
  codProd: string;
  descrProd: string;
  codVol: string;
  seqConf: string;
  referencia?: string;
}

export interface ItemConferidoDetalhe {
  nuConf: string;
  seqConf: string;
  codProd: string;
  descrProd: string;
  referencia: string | null;
  controle: string | null;
  qtdConf: number;
  codBarra: string | null;
  codVol: string;
  dhAlter: string;
}

export interface ConferirItemResponse {
  resultado: ItemConferidoResponse;
  itens: ItemPedido[];
  itensConferidos?: ItemConferidoDetalhe[];
}

export interface ExcluirItemConferidoResponse {
  sucesso: boolean;
  resultado: any;
  itens: ItemPedido[];
  itensConferidos: ItemConferidoDetalhe[];
}
