import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';

export class AnularBipagemEntradaUseCase {
  constructor(private readonly conferenciaRepo: IConferenciaEntradaRepository) {}

  async execute(bipagemId: string): Promise<void> {
    if (!bipagemId) {
      throw new Error('ID da bipagem não informado.');
    }
    await this.conferenciaRepo.anularBipagem(bipagemId);
  }
}
