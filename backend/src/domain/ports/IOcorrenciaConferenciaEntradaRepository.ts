import { OcorrenciaConferenciaEntrada } from '../entities/OcorrenciaConferenciaEntrada.js';

export interface FiltroOcorrenciasInput {
  conferenciaId?: string;
  nunota?: number;
  numnota?: number;
  tipo?: string;
  status?: string;
}

export interface IOcorrenciaConferenciaEntradaRepository {
  criar(ocorrencia: OcorrenciaConferenciaEntrada): Promise<OcorrenciaConferenciaEntrada>;
  obterPorId(id: string): Promise<OcorrenciaConferenciaEntrada | null>;
  listar(filtros?: FiltroOcorrenciasInput): Promise<OcorrenciaConferenciaEntrada[]>;
  listarPorConferencia(conferenciaId: string): Promise<OcorrenciaConferenciaEntrada[]>;
  listarPorNuNota(nunota: number): Promise<OcorrenciaConferenciaEntrada[]>;
  atualizar(id: string, dados: Partial<OcorrenciaConferenciaEntrada>): Promise<OcorrenciaConferenciaEntrada>;
  remover(id: string): Promise<void>;
}
