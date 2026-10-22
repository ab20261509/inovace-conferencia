export type TipoOcorrenciaRecebimento =
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

export type StatusOcorrenciaRecebimento =
  | 'PENDENTE'
  | 'RESOLVIDO'
  | 'INTEGRADO_ERP'
  | 'DEVOLVIDO'
  | 'CANCELADO';

export type OrigemOcorrenciaRecebimento = 'COLETOR' | 'GESTAO';

export interface OcorrenciaRecebimento {
  id: string;
  conferenciaId?: string;
  nunota?: number;
  numnota?: number;
  sequencia?: number;
  codprod?: number;
  descrprod?: string;
  tipo: TipoOcorrenciaRecebimento;
  quantidade: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  motivo?: string;
  codlocalDestino?: number;
  fotos?: string[];
  jaBipado?: boolean;
  status: StatusOcorrenciaRecebimento;
  origem: OrigemOcorrenciaRecebimento;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegistrarOcorrenciaInput {
  conferenciaId?: string;
  nunota?: number;
  numnota?: number;
  sequencia?: number;
  codprod?: number;
  descrprod?: string;
  tipo: TipoOcorrenciaRecebimento;
  quantidade: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  motivo?: string;
  codlocalDestino?: number;
  fotos?: string[];
  jaBipado?: boolean;
  origem?: OrigemOcorrenciaRecebimento;
  criadoPor?: string;
}

export interface ProdutoCatalogoItem {
  codprod?: number;
  descrprod: string;
  referencia?: string;
  codvol?: string;
  marca?: string;
  codbarra?: string;
  imagemUrl?: string;
  fonte?: 'SANKHYA' | 'INTERNET' | 'AVULSO';
}

export interface LocalEstoqueItem {
  codlocal: number;
  descrlocal: string;
  ativo?: string;
}

export interface ProdutoInternetResultado {
  encontrado: boolean;
  codbarra?: string;
  descrprod?: string;
  marca?: string;
  imagemUrl?: string;
  fonte?: string;
}

export const TIPOS_OCORRENCIA_LABELS: Record<TipoOcorrenciaRecebimento, string> = {
  AVARIA: 'Avaria Física',
  VENCIDO: 'Produto Vencido',
  VALIDADE_PROXIMA: 'Validade Próxima',
  PRODUTO_TROCADO: 'Produto Trocado',
  NAO_IDENTIFICADO: 'Não Identificado',
  FALTA: 'Falta Faturada',
  SOBRA: 'Sobra Física',
  DIVERGENCIA_LOTE: 'Divergência de Lote',
  DIVERGENCIA_VALIDADE: 'Divergência de Validade',
  QUANTIDADE_DIVERGENTE: 'Quantidade Divergente',
};

export interface TermosOcorrencia {
  nome: string;
  adjetivoUnidade: string;
  termoAcao: string;
  marcadaComo: string;
}

export function obterTermosOcorrencia(tipo: TipoOcorrenciaRecebimento): TermosOcorrencia {
  switch (tipo) {
    case 'VENCIDO':
      return {
        nome: 'Produto Vencido',
        adjetivoUnidade: 'vencida',
        termoAcao: 'produto vencido',
        marcadaComo: 'vencida',
      };
    case 'VALIDADE_PROXIMA':
      return {
        nome: 'Validade Próxima',
        adjetivoUnidade: 'com validade próxima',
        termoAcao: 'validade próxima',
        marcadaComo: 'com validade próxima',
      };
    case 'AVARIA':
    default:
      return {
        nome: 'Avaria',
        adjetivoUnidade: 'avariada',
        termoAcao: 'avaria',
        marcadaComo: 'avariada',
      };
  }
}

