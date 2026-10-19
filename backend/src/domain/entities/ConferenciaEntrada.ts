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
  adPreventrega?: string | null;
  conferente?: string | null;
  chavenfe?: string | null;
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
  qtdneg: number | null; // pode ser mascarado se for campo sensível
  qtdConferidaN1: number;
  qtdConferidaN2: number;
  qtdConferidaN3: number;
  codigosAlternativos: CodigoAlternativoEntrada[];
  divergente?: boolean;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  lotesConferidos?: FracaoLoteItem[];
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
  diferenca?: number;
  codlocal?: number;
  codlocalorig?: number;
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
  decisoesFiscais?: Record<string, DecisaoFiscalItem>;
  decisoesFiscaisJson?: string;
  chavenfe?: string;
  numnota?: number;
  codparc?: number;
  itensRecontagem?: Array<{ nunota: number; sequencia: number; codprod: number }>;
  itensRecontagemJson?: string;
}

export interface DecisaoFiscalItem {
  nunota: number;
  codprod: number;
  sequencia: number;
  lote?: 'ERP' | 'BIP';
  validade?: 'ERP' | 'BIP';
  fabricacao?: 'ERP' | 'BIP';
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
  adPreventrega?: string | null;
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
  backupsDisponiveis?: BackupDisponivelResumo[];
  conferenciaIdOrig?: string;
  sessaoConjunta?: boolean;
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
