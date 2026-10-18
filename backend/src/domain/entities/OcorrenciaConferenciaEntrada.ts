export type TipoOcorrenciaEntrada =
  | 'AVARIA'
  | 'VENCIDO'
  | 'VALIDADE_PROXIMA'
  | 'PRODUTO_TROCADO'
  | 'NAO_IDENTIFICADO'
  | 'FALTA'
  | 'SOBRA'
  | 'DIVERGENCIA_LOTE'
  | 'DIVERGENCIA_VALIDADE'
  | 'QUANTIDADE_DIVERGENTE';

export type StatusOcorrenciaEntrada =
  | 'PENDENTE'
  | 'RESOLVIDO'
  | 'INTEGRADO_ERP'
  | 'DEVOLVIDO';

export type OrigemOcorrenciaEntrada = 'COLETOR' | 'GESTAO';

export interface OcorrenciaConferenciaEntrada {
  id: string;
  conferenciaId?: string;
  nunota?: number;
  sequencia?: number;
  codprod?: number;
  descrprod?: string;
  tipo: TipoOcorrenciaEntrada;
  quantidade: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  motivo?: string;
  codlocalDestino?: number;
  fotos?: string[]; // URLs ou Base64 das fotos anexadas
  status: StatusOcorrenciaEntrada;
  origem: OrigemOcorrenciaEntrada;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm: string;
}
