import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import {
  Separacao,
  SeparacaoItem,
  SeparacaoItemConsolidado,
  StatusItemSeparacao,
} from '../../../domain/entities/Separacao.js';

export interface ObterSeparacaoOutput {
  separacao: Separacao;
  itens: SeparacaoItem[];
  itensConsolidados: SeparacaoItemConsolidado[];
  progresso: {
    totalEsperado: number;
    totalSeparado: number;
    percentual: number;
    itensPendentes: number;
    itensSeparados: number;
  };
}

export class ObterSeparacaoUseCase {
  constructor(private readonly separacaoRepo: ISeparacaoRepository) {}

  async execute(separacaoId: string): Promise<ObterSeparacaoOutput> {
    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }

    const itens = await this.separacaoRepo.listarItens(separacaoId);

    // 1. Rebalancear automaticamente qualquer excedente de um mesmo produto entre pedidos da carga
    // (Garante consistência e redistribui quantidades que acumularam na primeira linha de pedido)
    const produtosItensMap = new Map<number, SeparacaoItem[]>();
    for (const item of itens) {
      if (item.statusItem === 'REMOVIDO_ERP' || item.statusItem === 'CORTADO_DEFINITIVO') continue;
      if (!produtosItensMap.has(item.codprod)) produtosItensMap.set(item.codprod, []);
      produtosItensMap.get(item.codprod)!.push(item);
    }

    for (const [, lista] of produtosItensMap.entries()) {
      const temExcedente = lista.some((i) => i.qtdSeparada > i.qtdEsperada);
      const temPendente = lista.some((i) => i.qtdSeparada < i.qtdEsperada);

      if (temExcedente && temPendente) {
        let totalSeparadoProd = Number(lista.reduce((acc, i) => acc + i.qtdSeparada, 0).toFixed(4));

        for (const item of lista) {
          const qtdParaEsteItem = Number(Math.min(item.qtdEsperada, totalSeparadoProd).toFixed(4));
          const novoStatus: StatusItemSeparacao =
            qtdParaEsteItem >= item.qtdEsperada
              ? 'SEPARADO'
              : qtdParaEsteItem > 0
              ? 'PARCIAL'
              : 'PENDENTE';

          if (item.qtdSeparada !== qtdParaEsteItem || item.statusItem !== novoStatus) {
            item.qtdSeparada = qtdParaEsteItem;
            item.statusItem = novoStatus;
            await this.separacaoRepo.atualizarItem(item.id, {
              qtdSeparada: qtdParaEsteItem,
              statusItem: novoStatus,
            });
          }

          totalSeparadoProd = Number(Math.max(0, totalSeparadoProd - qtdParaEsteItem).toFixed(4));
        }
      }
    }

    // 2. Consolidar produtos somando as quantidades de todos os pedidos da carga
    const mapaConsolidado = new Map<number, SeparacaoItemConsolidado>();

    let totalEsperado = 0;
    let totalSeparado = 0;

    for (const item of itens) {
      // Ignorar itens marcados como REMOVIDO_ERP do total esperado
      if (item.statusItem !== 'REMOVIDO_ERP') {
        totalEsperado = Number((totalEsperado + item.qtdEsperada).toFixed(4));
        totalSeparado = Number((totalSeparado + item.qtdSeparada).toFixed(4));
      }

      let consolidado = mapaConsolidado.get(item.codprod);
      if (!consolidado) {
        consolidado = {
          codprod: item.codprod,
          descrprod: item.descrprod,
          referencia: item.referencia,
          codbarra: item.codbarra,
          codvol: item.codvol,
          codend: item.codend,
          endereco: item.endereco,
          descrend: item.descrend,
          lado: item.lado,
          codendPulmao: item.codendPulmao,
          enderecoPulmao: item.enderecoPulmao,
          descrendPulmao: item.descrendPulmao,
          ladoPulmao: item.ladoPulmao,
          qtdEsperadaTotal: 0,
          qtdSeparadaTotal: 0,
          qtdFaltaTotal: 0,
          statusConsolidado: 'PENDENTE',
          pedidos: [],
        };
        mapaConsolidado.set(item.codprod, consolidado);
      }

      if (item.statusItem !== 'REMOVIDO_ERP') {
        consolidado.qtdEsperadaTotal = Number((consolidado.qtdEsperadaTotal + item.qtdEsperada).toFixed(4));
      }
      consolidado.qtdSeparadaTotal = Number((consolidado.qtdSeparadaTotal + item.qtdSeparada).toFixed(4));
      if (item.qtdFalta) {
        consolidado.qtdFaltaTotal = Number(((consolidado.qtdFaltaTotal || 0) + item.qtdFalta).toFixed(4));
      }

      consolidado.pedidos.push({
        nunota: item.nunota,
        sequencia: item.sequencia,
        controle: item.controle,
        qtdEsperada: item.qtdEsperada,
        qtdSeparada: item.qtdSeparada,
        qtdFalta: item.qtdFalta || 0,
        motivoFalta: item.motivoFalta,
        statusItem: item.statusItem,
        observacaoAlteracao: item.observacaoAlteracao,
      });
    }

    // Calcular status de cada consolidado
    for (const cons of mapaConsolidado.values()) {
      const faltaTotal = cons.qtdFaltaTotal || 0;
      const temItemReabastecido = cons.pedidos.some((p) => p.statusItem === 'REABASTECIDO');

      if (cons.qtdSeparadaTotal >= cons.qtdEsperadaTotal && cons.qtdEsperadaTotal > 0) {
        cons.statusConsolidado = 'SEPARADO';
      } else if (temItemReabastecido) {
        cons.statusConsolidado = 'REABASTECIDO';
      } else if (faltaTotal > 0 && cons.qtdSeparadaTotal + faltaTotal >= cons.qtdEsperadaTotal) {
        cons.statusConsolidado = 'FALTA';
      } else if (cons.qtdSeparadaTotal > 0) {
        cons.statusConsolidado = 'PARCIAL';
      } else {
        cons.statusConsolidado = 'PENDENTE';
      }
    }

    // Ordenar rota lógica por prioridade:
    // 1. REABASTECIDO (topo da rota)
    // 2. Por endereço estruturado de picking (TGWEND.ENDERECO)
    // 3. Por código do produto
    // Ocultar produtos com 0 UN esperado e 0 UN separado (cortados/removidos totalmente do ERP sem bipagem)
    const itensConsolidados = Array.from(mapaConsolidado.values())
      .filter((cons) => cons.qtdEsperadaTotal > 0 || cons.qtdSeparadaTotal > 0)
      .sort((a, b) => {
        const isReabA = a.statusConsolidado === 'REABASTECIDO' ? 1 : 0;
        const isReabB = b.statusConsolidado === 'REABASTECIDO' ? 1 : 0;
        if (isReabA !== isReabB) return isReabB - isReabA; // REABASTECIDO primeiro

        if (a.endereco && !b.endereco) return -1;
        if (!a.endereco && b.endereco) return 1;
        if (a.endereco && b.endereco) return a.endereco.localeCompare(b.endereco);
        return a.codprod - b.codprod;
      });

    // Contadores baseados nos produtos da rota lógica (consolidados)
    const produtosPendentes = itensConsolidados.filter(
      (c) => c.statusConsolidado !== 'SEPARADO' && c.statusConsolidado !== 'CORTADO_DEFINITIVO'
    ).length;
    const produtosConcluidos = itensConsolidados.length - produtosPendentes;

    const percentual = totalEsperado > 0
      ? Math.min(100, Math.round((totalSeparado / totalEsperado) * 100))
      : 0;

    return {
      separacao,
      itens,
      itensConsolidados,
      progresso: {
        totalEsperado,
        totalSeparado,
        percentual,
        itensPendentes: produtosPendentes,
        itensSeparados: produtosConcluidos,
      },
    };
  }
}
