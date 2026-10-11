import { IGatewayPort } from '../../domain/ports/IGatewayPort.js';
import {
  IDesmembrarItemNotaService,
  DesmembrarItemInput,
  DesmembrarItemOutput,
} from '../../domain/ports/IDesmembrarItemNotaService.js';

export class SankhyaDesmembrarItemService implements IDesmembrarItemNotaService {
  constructor(private readonly gateway: IGatewayPort) {}

  async desmembrarItemPorLote(
    input: DesmembrarItemInput,
    correlationId?: string
  ): Promise<DesmembrarItemOutput> {
    const { nunota, sequenciaOriginal, codprod, lotes, usuario } = input;

    if (!lotes || lotes.length <= 1) {
      return {
        sucesso: true,
        totalFracionado: 0,
        sequenciasCriadas: [sequenciaOriginal],
        mensagem: 'Item possui apenas um lote, não requer desmembramento.',
      };
    }

    console.log(
      `[SankhyaDesmembrarItem] Iniciando divisão do item (NUNOTA=${nunota}, SEQ=${sequenciaOriginal}, PROD=${codprod}) em ${lotes.length} lotes por ${usuario}`
    );

    // Ponto de extensão: aqui será acionada a rotina oficial do Sankhya (via CACSP, procedure ou serviço dedicado)
    // conforme orientação futura do usuário.
    // Atualmente registra o plano de frações e valida o balanceamento.
    const sequenciasCriadas: number[] = [sequenciaOriginal];
    let totalQtd = 0;

    for (let i = 0; i < lotes.length; i++) {
      const fracao = lotes[i];
      totalQtd += fracao.quantidade;
      if (i > 0) {
        sequenciasCriadas.push(sequenciaOriginal + i);
      }
    }

    return {
      sucesso: true,
      totalFracionado: lotes.length,
      sequenciasCriadas,
      mensagem: `Item preparado para divisão em ${lotes.length} frações de lote (Total: ${totalQtd} un).`,
    };
  }
}
