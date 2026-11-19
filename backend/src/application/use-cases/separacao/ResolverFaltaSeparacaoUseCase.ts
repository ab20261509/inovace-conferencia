import { randomUUID } from 'node:crypto';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import { SeparacaoBipagem, SeparacaoItem } from '../../../domain/entities/Separacao.js';

export interface ResolverFaltaSeparacaoInput {
  separacaoId: string;
  itemId?: string;
  codprod?: number;
  nunota?: number;
  acao: 'RESEPARAR' | 'CORTAR';
  quantidade?: number;
  lote?: string;
  usuario: string;
  observacao?: string;
}

export interface ResolverFaltaSeparacaoOutput {
  sucesso: boolean;
  mensagem: string;
  itensAtualizados: SeparacaoItem[];
}

export class ResolverFaltaSeparacaoUseCase {
  constructor(private readonly separacaoRepo: ISeparacaoRepository) {}

  async execute(input: ResolverFaltaSeparacaoInput): Promise<ResolverFaltaSeparacaoOutput> {
    const { separacaoId, itemId, codprod, nunota, acao, quantidade, lote, usuario, observacao } = input;

    if (!separacaoId) {
      throw new Error('ID da separação é obrigatório.');
    }
    if (!acao || (acao !== 'RESEPARAR' && acao !== 'CORTAR')) {
      throw new Error("Ação inválida. Use 'RESEPARAR' ou 'CORTAR'.");
    }

    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }

    const todosItens = await this.separacaoRepo.listarItens(separacaoId);
    let itensAlvo: SeparacaoItem[] = [];

    if (itemId) {
      const item = todosItens.find((i) => i.id === itemId);
      if (!item) {
        throw new Error(`Item de separação '${itemId}' não encontrado.`);
      }
      itensAlvo = [item];
    } else if (codprod) {
      itensAlvo = todosItens.filter((i) => {
        if (i.codprod !== codprod) return false;
        if (nunota && i.nunota !== nunota) return false;
        return i.statusItem === 'FALTA' || (i.qtdFalta && i.qtdFalta > 0);
      });
      if (itensAlvo.length === 0) {
        throw new Error(`Nenhum item com falta pendente encontrado para o produto ${codprod}.`);
      }
    } else {
      throw new Error('Informe itemId ou codprod para resolver a falta.');
    }

    const agora = new Date().toISOString();
    const itensAtualizados: SeparacaoItem[] = [];

    if (acao === 'CORTAR') {
      for (const item of itensAlvo) {
        const obsCorte = `Corte definitivo de ${item.qtdFalta ?? (item.qtdEsperada - item.qtdSeparada)} UN confirmado por ${usuario}. ${observacao || ''}`.trim();
        const dadosAtualizados: Partial<SeparacaoItem> = {
          statusItem: 'CORTADO_DEFINITIVO',
          observacaoAlteracao: obsCorte,
          atualizadoEm: agora,
        };

        await this.separacaoRepo.atualizarItem(item.id, dadosAtualizados);
        itensAtualizados.push({
          ...item,
          ...dadosAtualizados,
        } as SeparacaoItem);
      }

      return {
        sucesso: true,
        mensagem: `Corte definitivo confirmado para ${itensAtualizados.length} item(ns).`,
        itensAtualizados,
      };
    }

    // Ação: RESEPARAR (re-separar do pulmão ou reserva)
    let saldoQtdParaDistribuir = quantidade && quantidade > 0
      ? quantidade
      : itensAlvo.reduce((acc, i) => acc + (i.qtdFalta || Math.max(0, i.qtdEsperada - i.qtdSeparada)), 0);

    for (const item of itensAlvo) {
      if (saldoQtdParaDistribuir <= 0) break;

      const faltaItem = item.qtdFalta && item.qtdFalta > 0
        ? item.qtdFalta
        : Math.max(0, item.qtdEsperada - item.qtdSeparada);

      const qtdAplicada = Math.min(saldoQtdParaDistribuir, faltaItem);
      saldoQtdParaDistribuir -= qtdAplicada;

      const novaQtdSeparada = item.qtdSeparada + qtdAplicada;
      const novaQtdFalta = Math.max(0, (item.qtdFalta || faltaItem) - qtdAplicada);
      const novoStatus = novaQtdSeparada >= item.qtdEsperada
        ? 'SEPARADO'
        : (novaQtdFalta > 0 ? 'FALTA' : 'PARCIAL');

      const dadosAtualizados: Partial<SeparacaoItem> = {
        qtdSeparada: novaQtdSeparada,
        qtdFalta: novaQtdFalta,
        statusItem: novoStatus,
        controle: lote || item.controle,
        observacaoAlteracao: `Re-separado ${qtdAplicada} UN do Pulmão por ${usuario}. ${observacao || ''}`.trim(),
        atualizadoEm: agora,
      };

      await this.separacaoRepo.atualizarItem(item.id, dadosAtualizados);

      // Registrar histórico de bipagem / re-separação
      const bipagem: SeparacaoBipagem = {
        id: randomUUID(),
        separacaoId,
        itemId: item.id,
        nunota: item.nunota,
        codprod: item.codprod,
        codbarra: item.codbarra?.split(',')[0]?.split(' ')[0] || String(item.codprod),
        quantidade: qtdAplicada,
        lote: lote || item.controle || null,
        usuario,
        timestamp: agora,
        anulado: 0,
      };
      await this.separacaoRepo.registrarBipagem(bipagem);

      itensAtualizados.push({
        ...item,
        ...dadosAtualizados,
      } as SeparacaoItem);
    }

    return {
      sucesso: true,
      mensagem: `Re-separação registrada com sucesso para ${itensAtualizados.length} item(ns).`,
      itensAtualizados,
    };
  }
}
