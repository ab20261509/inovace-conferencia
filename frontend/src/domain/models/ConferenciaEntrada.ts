export type StatusConferenciaEntrada =
  | 'Em Aberto'
  | 'N1 em Andamento'
  | 'Aguardando N2'
  | 'N2 em Andamento'
  | 'Aguardando N3'
  | 'N3 em Andamento'
  | 'Divergente'
  | 'Em Reconferência'
  | 'Conferido'
  | 'Aguardando Aprovação'
  | 'Enviado ao Sankhya';

export interface NotaEntrada {
  nunota: number;
  numnota: number;
  serie: string;
  dtneg: string;
  dtentsai: string;
  codparc: number;
  nomeparc: string;
  codtipoper: number;
  tipmov: string;
  vlrnota: number;
  statusnota: string;
  qtdItens: number;
  codemp: number;
  statusConferencia: StatusConferenciaEntrada;
  conferenciaId?: string;
  nivelAtual?: number;
}

export interface CodigoAlternativoEntrada {
  codprod: number;
  codbarra: string;
  codvol?: string;
  ativo: string;
  divideMultiplica: 'M' | 'D';
  quantidade: number;
}

export interface ItemNotaEntrada {
  nunota: number;
  sequencia: number;
  codprod: number;
  descrprod: string;
  referencia: string;
  codvol: string;
  qtdneg: number | null; // pode ser null se for campo sensível protegido
  qtdConferidaN1: number;
  qtdConferidaN2: number;
  qtdConferidaN3: number;
  codigosAlternativos: CodigoAlternativoEntrada[];
  divergente?: boolean;
}

export interface SessaoConferenciaEntrada {
  id: string;
  nunotas: number[];
  status: StatusConferenciaEntrada;
  nivelAtual: number;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
  conferente: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  enviadoSankhyaEm?: string;
  observacaoAprovacao?: string;
  respostaSankhyaJson?: string;
}

export interface BipagemEntrada {
  id: string;
  conferenciaId: string;
  nunota: number;
  codprod: number;
  sequencia: number;
  codbarra: string;
  qtdConferida: number;
  nivel: number;
  conferente: string;
  timestamp: string;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  anulado: boolean;
}

export interface ObterItensConferenciaResponse {
  sessao?: SessaoConferenciaEntrada | null;
  itens: ItemNotaEntrada[];
  bipagens: BipagemEntrada[];
}

export interface BiparResponse {
  bipagem: BipagemEntrada;
  descrprod: string;
  referencia: string;
  fatorAplicado: number;
}

export interface FinalizarNivelResponse {
  sessao: SessaoConferenciaEntrada;
  statusFinal: StatusConferenciaEntrada;
  possuiDivergencias: boolean;
  totalItens: number;
  totalConferidos: number;
}

export interface ItemDivergenciaResumo {
  nunota: number;
  codprod: number;
  sequencia: number;
  descrprod: string;
  referencia: string;
  codvol: string;
  qtdEsperada: number;
  qtdN1: number;
  qtdN2: number;
  qtdN3: number;
  diferenca: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
}

export interface ConferenciaDivergenciaGrupo {
  id: string;
  nunotas: number[];
  numerosNotas: string;
  fornecedor: string;
  status: string;
  nivelAtual: number;
  conferente: string;
  criadoEm: string;
  atualizadoEm: string;
  totalN1: number;
  totalN2: number;
  totalN3: number;
  totalEsperado: number;
  itensDivergentes: ItemDivergenciaResumo[];
  todosItens: ItemDivergenciaResumo[];
}

export interface ResolverDivergenciaInput {
  acao: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3';
  observacao?: string;
}

export interface ReiniciarConferenciaInput {
  motivo?: string;
}

export interface EnviarSankhyaInput {
  observacao?: string;
}

export interface EnviarSankhyaResponse {
  sucesso: boolean;
  mensagem: string;
  sessao: SessaoConferenciaEntrada;
  itensAtualizados: number;
  estoqueAtualizado: number;
}
