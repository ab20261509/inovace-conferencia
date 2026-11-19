import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';

export interface AnularBipagemSeparacaoInput {
  bipId: string;
  usuario: string;
}

export class AnularBipagemSeparacaoUseCase {
  constructor(private readonly separacaoRepo: ISeparacaoRepository) {}

  async execute(input: AnularBipagemSeparacaoInput): Promise<{ sucesso: boolean; mensagem: string }> {
    const { bipId } = input;

    const bip = await this.separacaoRepo.anularBipagem(bipId);
    if (!bip) {
      throw new Error(`Bipagem '${bipId}' não encontrada.`);
    }

    if (bip.itemId) {
      const item = await this.separacaoRepo.buscarItemPorId(bip.itemId);
      if (item) {
        const novaQtd = Math.max(0, Number((item.qtdSeparada - bip.quantidade).toFixed(4)));
        const novoStatus = novaQtd <= 0 ? 'PENDENTE' : novaQtd < item.qtdEsperada ? 'PARCIAL' : 'SEPARADO';
        await this.separacaoRepo.atualizarItem(item.id, {
          qtdSeparada: novaQtd,
          statusItem: novoStatus,
        });
      }
    }

    return {
      sucesso: true,
      mensagem: `Bipagem de ${bip.quantidade} UN estornada com sucesso.`,
    };
  }
}
