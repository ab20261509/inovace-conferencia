import { IEnderecamentoRepository, FiltrosHistoricoEnderecamento } from '../../../domain/ports/IEnderecamentoRepository.js';
import { RegistroHistoricoEnderecamento } from '../../../domain/entities/Enderecamento.js';

export class ListarHistoricoEnderecamentoUseCase {
  constructor(private readonly enderecamentoRepo: IEnderecamentoRepository) {}

  async execute(filtros?: FiltrosHistoricoEnderecamento): Promise<RegistroHistoricoEnderecamento[]> {
    return this.enderecamentoRepo.listarHistorico(filtros);
  }
}
