export type TipoAcaoEnderecamento = 'VINCULAR' | 'MOVER' | 'RETIRAR' | 'DEFINIR_PICKING';

export type TipoEnderecoWMS = 'PICKING' | 'PULMAO';

export interface RegistroHistoricoEnderecamento {
  id: string;
  codprod: number;
  descrprod?: string | null;
  controle: string;
  tipoAcao: TipoAcaoEnderecamento;
  codendOrigem?: number | null;
  enderecoOrigem?: string | null;
  tipoOrigem?: TipoEnderecoWMS | null;
  codendDestino?: number | null;
  enderecoDestino?: string | null;
  tipoDestino?: TipoEnderecoWMS | null;
  motivo?: string | null;
  usuario: string;
  criadoEm: string;
}

export interface EnderecoVinculado {
  codend: number;
  endereco: string;
  descrend?: string | null;
  tipo: TipoEnderecoWMS;
  controle: string;
  ativo: boolean;
  dtInicio?: string | null;
  dtFim?: string | null;
}

export interface ProdutoEnderecamentoDetalhe {
  codprod: number;
  descrprod: string;
  referencia?: string | null;
  codbarra?: string | null;
  codvol: string;
  tipconrest?: string | null; // 'L' para lote
  estoqueTotal: number;
  picking: EnderecoVinculado | null;
  pulmoes: EnderecoVinculado[];
}

export interface EnderecoOcupacaoDetalhe {
  codend: number;
  endereco: string;
  descrend?: string | null;
  tipo: TipoEnderecoWMS;
  ativo: boolean;
  produtos: {
    codprod: number;
    descrprod: string;
    referencia?: string | null;
    codbarra?: string | null;
    controle: string;
    codvol: string;
    dtInicio?: string | null;
  }[];
}
