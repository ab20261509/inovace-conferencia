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

export interface FracaoLoteItem {
  lote: string;
  validade?: string;
  fabricacao?: string;
  quantidade: number;
  bipagemIds?: string[];
  ultimoHorario?: string;
  conferente?: string;
}

export interface ItemNotaEntrada {
  nunota: number;
  numnota?: number;
  sequencia: number;
  codprod: number;
  descrprod: string;
  referencia: string;
  refforn?: string;
  codbarra?: string;
  codvol: string;
  qtdneg: number | null; // pode ser null se for campo sensível protegido
  qtdConferidaN1: number;
  qtdConferidaN2: number;
  qtdConferidaN3: number;
  codigosAlternativos: CodigoAlternativoEntrada[];
  divergente?: boolean;
  codlocal?: number;
  codlocalorig?: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  lotesConferidos?: FracaoLoteItem[];
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
  diferenca?: number;
  nomeparc?: string;
  codparc?: number;
}

export interface BackupContagemEntrada {
  statusAnterior: StatusConferenciaEntrada;
  nivelAnterior: number;
  reiniciadoEm: string;
  reiniciadoPor: string;
  motivo?: string;
  totalBipagensAnuladas: number;
}

export interface ItemBackupResumo {
  codprod: number;
  descrprod?: string;
  referencia?: string;
  quantidade: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
}

export interface BackupDisponivelResumo {
  conferenciaIdOrigem: string;
  nunotaOrigem: number;
  numnotaOrigem?: number;
  chavenfe?: string;
  statusAnterior: StatusConferenciaEntrada;
  nivelAnterior: number;
  reiniciadoEm: string;
  reiniciadoPor: string;
  motivo?: string;
  totalBipagensAnuladas: number;
  itens: ItemBackupResumo[];
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
  backupContagemJson?: string;
  backupContagem?: BackupContagemEntrada;
  statusPorNota?: Record<number, StatusConferenciaEntrada>;
  statusPorNotaJson?: string;
  chavenfe?: string;
  numnota?: number;
  codparc?: number;
  itensRecontagem?: Array<{ nunota: number; sequencia: number; codprod: number }>;
  itensRecontagemJson?: string;
}

export interface ConferenciaEntradaResumo {
  id: string;
  nunotas: number[];
  numerosNotas: string;
  fornecedor: string;
  status: StatusConferenciaEntrada;
  nivelAtual: number;
  conferente: string;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
  enviadoSankhyaEm?: string;
  aprovadoPor?: string;
  totalItens: number;
  totalBipadoN1: number;
  totalBipadoN2: number;
  totalBipadoN3: number;
  temBackupContagem: boolean;
  backupContagem?: BackupContagemEntrada;
  observacaoAprovacao?: string;
  statusPorNota?: Record<number, StatusConferenciaEntrada>;
  notasDetalhadas?: Array<{ nunota: number; numnota: number }>;
  chavenfe?: string;
  numnota?: number;
  codparc?: number;
  backupsDisponiveis?: BackupDisponivelResumo[];
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
  descrprod?: string;
  referencia?: string;
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
  statusSessao?: StatusConferenciaEntrada;
}

export interface ResumoNotaFinalizacao {
  nunota: number;
  numnota: number;
  status: StatusConferenciaEntrada;
  totalItens: number;
  itensConferidosOk: number;
  itensPendentes: number;
  itensComSobra: number;
  itensSemBipagem: number;
  possuiDivergencias: boolean;
}

export interface FinalizarNivelResponse {
  sessao: SessaoConferenciaEntrada;
  statusFinal: StatusConferenciaEntrada;
  possuiDivergencias: boolean;
  possuiDivergenciasQtd?: boolean;
  possuiDivergenciasLote?: boolean;
  totalItens: number;
  totalConferidos: number;
  resumoPorNota?: ResumoNotaFinalizacao[];
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
  controleOriginal?: string;
  validadeOriginal?: string;
  fabricacaoOriginal?: string;
  divergenciaLote?: boolean;
  divergenciaValidade?: boolean;
  divergenciaFabricacao?: boolean;
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
  lotesConferidos?: any[];
  codlocalorig?: number;
}

export interface ConferenciaDivergenciaGrupo {
  id: string;
  conferenciaId?: string;
  nunota?: number;
  numnota?: number;
  nunotas: number[];
  numerosNotas: string;
  fornecedor: string;
  status: string;
  nivelAtual: number;
  conferente: string;
  conferentesN1?: string[];
  conferentesN2?: string[];
  conferentesN3?: string[];
  criadoEm: string;
  atualizadoEm: string;
  totalN1: number;
  totalN2: number;
  totalN3: number;
  totalEsperado: number;
  nivel1Ativo?: boolean;
  nivel2Ativo?: boolean;
  itensDivergentes: ItemDivergenciaResumo[];
  todosItens: ItemDivergenciaResumo[];
}

export interface DecisaoFiscalItem {
  nunota: number;
  codprod: number;
  sequencia: number;
  lote?: 'ERP' | 'BIP';
  validade?: 'ERP' | 'BIP';
  fabricacao?: 'ERP' | 'BIP';
}

export interface ResolverDivergenciaInput {
  acao: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3';
  observacao?: string;
  nunota?: number;
  decisoesFiscais?: Record<string, DecisaoFiscalItem>;
}

export interface ReiniciarConferenciaInput {
  motivo?: string;
}

export interface ItemAssociacaoEnvio {
  nunota: number;
  sequencia: number;
  codprod: number;
  lote: string;
  validade?: string;
  fabricacao?: string;
  qtdConferida: number;
  codlocal?: number;
}

export interface EnviarSankhyaInput {
  observacao?: string;
  nivelEscolhido?: number;
  itensCustomizados?: ItemAssociacaoEnvio[];
  nunotas?: number[];
}

export interface EnviarSankhyaResponse {
  success?: boolean;
  sucesso?: boolean;
  mensagem?: string;
  sessao: SessaoConferenciaEntrada;
  itensAtualizados: number;
  itensDivididos?: number;
  estoqueAtualizado: number;
  protocolo?: string;
}
