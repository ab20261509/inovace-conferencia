import {
  IOcorrenciaConferenciaEntradaRepository,
  FiltroOcorrenciasInput,
} from '../../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';
import { OcorrenciaConferenciaEntrada } from '../../../domain/entities/OcorrenciaConferenciaEntrada.js';

export class ListarOcorrenciasEntradaUseCase {
  constructor(
    private readonly ocorrenciaRepo: IOcorrenciaConferenciaEntradaRepository
  ) {}

  async execute(
    filtros?: FiltroOcorrenciasInput
  ): Promise<OcorrenciaConferenciaEntrada[]> {
    return this.ocorrenciaRepo.listar(filtros);
  }
}
