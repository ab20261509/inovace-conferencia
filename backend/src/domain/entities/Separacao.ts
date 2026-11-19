/**
 * Entidades e tipos de dados do módulo de Separação de Cargas
 */

export type StatusSeparacao =
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_REABASTECIMENTO'
  | 'REABASTECIDO'
  | 'FINALIZADA'
  | 'CANCELADA';

export type StatusItemSeparacao =
  | 'PENDENTE'
  | 'PARCIAL'
  | 'SEPARADO'
  | 'FALTA'
  | 'RESEPARADO'
  | 'REABASTECIDO'
  | 'CORTADO_DEFINITIVO'
  | 'REMOVIDO_ERP'
  | 'ALTERADO_ERP'
  | 'NOVO_ERP';

export interface Separacao {
  id: string;
  ordemCarga: number;
  codemp?: number;
  nomeEmpresa?: string | null;
  status: StatusSeparacao;
  usuario: string;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string | null;
  totalPedidos: number;
  totalItens: number;
  totalUnidades: number;
  observacoes?: string | null;
  dadosCargaJson?: string | null;
}

export interface SeparacaoItem {
  id: string;
  separacaoId: string;
  ordemCarga: number;
  nunota: number;
  sequencia: number;
  codprod: number;
  descrprod?: string | null;
  referencia?: string | null;
  codbarra?: string | null;
  controle?: string | null;
  codlocal?: number | null;
  codvol?: string | null;
  codend?: number | null;
  endereco?: string | null;
  descrend?: string | null;
  lado?: string | null;
  codendPulmao?: number | null;
  enderecoPulmao?: string | null;
  descrendPulmao?: string | null;
  ladoPulmao?: string | null;
  qtdEsperada: number;
  qtdSeparada: number;
  qtdFalta?: number;
  motivoFalta?: string | null;
  statusItem: StatusItemSeparacao;
  qtdErpAtual?: number | null;
  observacaoAlteracao?: string | null;
  atualizadoEm: string;
}

export interface SeparacaoBipagem {
  id: string;
  separacaoId: string;
  itemId?: string | null;
  nunota: number;
  codprod: number;
  codbarra: string;
  quantidade: number;
  lote?: string | null;
  usuario: string;
  timestamp: string;
  anulado: number;
}

/**
 * Item consolidado por produto na carga (visão de Onda / Carga Geral)
 */
export interface SeparacaoItemConsolidado {
  codprod: number;
  descrprod?: string | null;
  referencia?: string | null;
  codbarra?: string | null;
  codvol?: string | null;
  codend?: number | null;
  endereco?: string | null;
  descrend?: string | null;
  lado?: string | null;
  codendPulmao?: number | null;
  enderecoPulmao?: string | null;
  descrendPulmao?: string | null;
  ladoPulmao?: string | null;
  qtdEsperadaTotal: number;
  qtdSeparadaTotal: number;
  qtdFaltaTotal?: number;
  statusConsolidado: StatusItemSeparacao;
  pedidos: {
    nunota: number;
    sequencia: number;
    controle?: string | null;
    qtdEsperada: number;
    qtdSeparada: number;
    qtdFalta?: number;
    motivoFalta?: string | null;
    statusItem: StatusItemSeparacao;
    observacaoAlteracao?: string | null;
  }[];
}

/**
 * Representa alterações identificadas entre o Sankhya ERP (TGFITE) e o snapshot local
 */
export interface AlteracaoErpItem {
  tipo: 'REMOVIDO' | 'NOVO' | 'QUANTIDADE_ALTERADA';
  nunota: number;
  sequencia: number;
  codprod: number;
  descrprod?: string;
  qtdSnapshot: number;
  qtdSeparada: number;
  qtdErpAtual: number;
  mensagem: string;
  exigeAcaoFisica: boolean; // true se já havia bipagem e o item foi cortado/reduzido
}
