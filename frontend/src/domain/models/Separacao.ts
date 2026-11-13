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

export interface CargaPendente {
  ordemCarga: number;
  codemp?: number;
  nomeEmpresa?: string;
  qtdPedidos: number;
  qtdItens: number;
  qtdUnidades: number;
  dtPrimeiroPedido: string;
  dtUltimoPedido: string;
  qtdClientes: number;
  statusLocal:
    | 'SEM_INICIAR'
    | 'EM_ANDAMENTO'
    | 'AGUARDANDO_REABASTECIMENTO'
    | 'REABASTECIDO'
    | 'FINALIZADA';
  separacaoId?: string;
  usuarioSeparacao?: string;
  criadoEm?: string;
}

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
  exigeAcaoFisica: boolean;
}

export interface ObterSeparacaoResponse {
  separacao: Separacao;
  itens: SeparacaoItem[];
  itensConsolidados: SeparacaoItemConsolidado[];
  progresso: {
    totalEsperado: number;
    totalSeparado: number;
    percentual: number;
    itensPendentes: number;
    itensSeparados: number;
  };
}

export interface SincronizarSeparacaoResponse {
  temAlteracoes: boolean;
  alteracoes: AlteracaoErpItem[];
  itensAtualizados: SeparacaoItem[];
}

export interface BiparSeparacaoResponse {
  sucesso: boolean;
  mensagem: string;
  itemAtualizado: SeparacaoItem;
  bipagem: {
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
  };
  concluidoProduto: boolean;
}

export interface AtualizarEnderecoResponse {
  sucesso: boolean;
  mensagem: string;
  codend: number;
  endereco: string;
  descrend: string;
  tipoEndereco: 'PICKING' | 'PULMAO';
  itensAtualizados: SeparacaoItem[];
}

export interface RegistrarFaltaResponse {
  sucesso: boolean;
  mensagem: string;
  itensAfetados: SeparacaoItem[];
}

export interface ResolverFaltaResponse {
  sucesso: boolean;
  mensagem: string;
  itensAtualizados: SeparacaoItem[];
}
