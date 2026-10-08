export type StatusConferenciaEntrada =
  | 'Em Aberto'
  | 'N1 em Andamento'
  | 'Aguardando N2'
  | 'N2 em Andamento'
  | 'Aguardando N3'
  | 'N3 em Andamento'
  | 'Divergente'
  | 'Em Reconferência'
  | 'Conferido';

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
  qtdneg: number | null; // pode ser mascarado se for campo sensível
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
