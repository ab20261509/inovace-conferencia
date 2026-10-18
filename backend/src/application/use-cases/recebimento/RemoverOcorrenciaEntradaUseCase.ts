import { IOcorrenciaConferenciaEntradaRepository } from '../../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';

export class RemoverOcorrenciaEntradaUseCase {
  constructor(
    private readonly ocorrenciaRepo: IOcorrenciaConferenciaEntradaRepository
  ) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID da ocorrência é obrigatório.');
    }
    await this.ocorrenciaRepo.remover(id);
  }
}
