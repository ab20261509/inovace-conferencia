export type StatusReabastecimento =
  | 'PENDENTE'
  | 'VERIFICAR_ESTOQUE'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface EstoqueDisponivelDetalhe {
  codLocal: number;
  local?: string;
  controle?: string | null;
  estoque: number;
  reservado: number;
  disponivel: number;
}

export interface TarefaReabastecimento {
  id: string;
  separacaoId?: string | null;
  ordemCarga: number;
  codemp?: number | null;
  nomeEmpresa?: string | null;
  codprod: number;
  descrprod?: string | null;
  referencia?: string | null;
  codbarra?: string | null;
  codendPulmao?: number | null;
  enderecoPulmao?: string | null;
  descrendPulmao?: string | null;
  codendPicking?: number | null;
  enderecoPicking?: string | null;
  descrendPicking?: string | null;
  quantidadeSolicitada: number;
  quantidadeAtendida: number;
  status: StatusReabastecimento;
  observacao?: string | null;
  saldoDisponivel?: number;
  detalhesEstoque?: EstoqueDisponivelDetalhe[];
  solicitadoEm: string;
  solicitadoPor: string;
  concluidoEm?: string | null;
  concluidoPor?: string | null;
}

export interface ReabastecimentoResumo {
  total: number;
  pendentes: number;
  semPulmao: number;
  concluidasHoje: number;
}

export interface ListarReabastecimentoResponse {
  tarefas: TarefaReabastecimento[];
  resumo: ReabastecimentoResumo;
}
