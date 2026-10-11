export interface LoteFracionado {
  lote: string;
  validade?: string;
  fabricacao?: string;
  quantidade: number;
}

export interface DesmembrarItemInput {
  nunota: number;
  sequenciaOriginal: number;
  codprod: number;
  lotes: LoteFracionado[];
  usuario: string;
}

export interface DesmembrarItemOutput {
  sucesso: boolean;
  totalFracionado: number;
  sequenciasCriadas: number[];
  mensagem?: string;
}

export interface IDesmembrarItemNotaService {
  /**
   * Executa a divisão/desmembramento do item na TGFITE por múltiplos lotes no ERP Sankhya.
   */
  desmembrarItemPorLote(
    input: DesmembrarItemInput,
    correlationId?: string
  ): Promise<DesmembrarItemOutput>;
}
