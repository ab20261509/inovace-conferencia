import { httpClient } from './httpClient';

export type TipoAcaoEnderecamento = 'VINCULAR' | 'MOVER' | 'RETIRAR' | 'DEFINIR_PICKING';
export type TipoEnderecoWMS = 'PICKING' | 'PULMAO';

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
  tipconrest?: string | null;
  estoqueTotal: number;
  picking: EnderecoVinculado | null;
  pulmoes: EnderecoVinculado[];
}

export interface EnderecoAnaliticoItem {
  codend: number;
  endereco: string;
  descrend?: string | null;
  tipo: TipoEnderecoWMS;
  ativo: boolean;
  totalProdutos: number;
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

export class EnderecamentoApiService {
  async listarAnalitico(filtros?: {
    termo?: string;
    tipo?: 'TODOS' | 'PICKING' | 'PULMAO';
    ocupacao?: 'TODOS' | 'LIVRES' | 'OCUPADOS';
    limite?: number;
  }): Promise<EnderecoAnaliticoItem[]> {
    const res = await httpClient.get<any>('/api/enderecamento/analitico', {
      params: filtros,
    });
    return res.data.enderecos || [];
  }

  async buscarPorProduto(termo: string, limite = 20): Promise<ProdutoEnderecamentoDetalhe[]> {
    const res = await httpClient.get<any>('/api/enderecamento/por-produto', {
      params: { termo, limite },
    });
    return res.data.produtos || [];
  }

  async buscarPorCodprods(codprods: number[]): Promise<ProdutoEnderecamentoDetalhe[]> {
    if (!codprods || codprods.length === 0) return [];
    const res = await httpClient.get<any>('/api/enderecamento/por-produto', {
      params: { codprods: codprods.join(','), limite: codprods.length },
    });
    return res.data.produtos || [];
  }

  async buscarPorEndereco(termo: string): Promise<EnderecoOcupacaoDetalhe> {
    const res = await httpClient.get<any>('/api/enderecamento/por-endereco', {
      params: { termo },
    });
    return res.data.endereco;
  }

  async vincular(dados: {
    codprod: number;
    codigoEndereco: string;
    controle?: string;
    tipoEndereco?: TipoEnderecoWMS;
    motivo?: string;
  }): Promise<{ sucesso: boolean; mensagem: string; codend: number; endereco: string; tipo: TipoEnderecoWMS }> {
    const res = await httpClient.post<any>('/api/enderecamento/vincular', dados);
    return res.data;
  }

  async movimentar(dados: {
    codprod: number;
    codendOrigem: number;
    codigoEnderecoDestino: string;
    controle?: string;
    motivo?: string;
  }): Promise<{ sucesso: boolean; mensagem: string; enderecoOrigem: string; enderecoDestino: string }> {
    const res = await httpClient.post<any>('/api/enderecamento/movimentar', dados);
    return res.data;
  }

  async desenderecar(dados: {
    codprod: number;
    codend: number;
    controle?: string;
    motivo?: string;
  }): Promise<{ sucesso: boolean; mensagem: string; endereco: string }> {
    const res = await httpClient.post<any>('/api/enderecamento/desenderecar', dados);
    return res.data;
  }

  async listarHistorico(filtros?: {
    codprod?: number;
    codend?: number;
    tipoAcao?: string;
    usuario?: string;
    dataInicio?: string;
    dataFim?: string;
    limite?: number;
  }): Promise<RegistroHistoricoEnderecamento[]> {
    const res = await httpClient.get<any>('/api/enderecamento/historico', { params: filtros });
    return res.data.historico || [];
  }
}

export const enderecamentoApiService = new EnderecamentoApiService();
