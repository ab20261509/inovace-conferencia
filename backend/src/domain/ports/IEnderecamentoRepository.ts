import { RegistroHistoricoEnderecamento } from '../entities/Enderecamento.js';

export interface FiltrosHistoricoEnderecamento {
  codprod?: number;
  codend?: number;
  tipoAcao?: string;
  usuario?: string;
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
}

export interface IEnderecamentoRepository {
  salvarHistorico(registro: RegistroHistoricoEnderecamento): Promise<void>;
  listarHistorico(filtros?: FiltrosHistoricoEnderecamento): Promise<RegistroHistoricoEnderecamento[]>;
}
