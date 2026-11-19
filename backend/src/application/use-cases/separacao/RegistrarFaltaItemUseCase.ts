import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import { SeparacaoItem } from '../../../domain/entities/Separacao.js';

export interface RegistrarFaltaItemInput {
  separacaoId: string;
  codprod: number;
  motivoFalta: string;
  usuario: string;
  nunotaFiltro?: number;
}

export interface RegistrarFaltaItemOutput {
  sucesso: boolean;
  mensagem: string;
  itensAfetados: SeparacaoItem[];
}

export class RegistrarFaltaItemUseCase {
  constructor(private readonly separacaoRepo: ISeparacaoRepository) {}

  async execute(input: RegistrarFaltaItemInput): Promise<RegistrarFaltaItemOutput> {
    const { separacaoId, codprod, motivoFalta, usuario, nunotaFiltro } = input;

    if (!separacaoId) {
      throw new Error('ID da separação é obrigatório.');
    }
    if (!codprod) {
      throw new Error('Código do produto é obrigatório.');
    }

    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }
    if (separacao.status !== 'EM_ANDAMENTO') {
      throw new Error(`Separação não está em andamento (status atual: ${separacao.status}).`);
    }

    const todosItens = await this.separacaoRepo.listarItens(separacaoId);
    const itensCandidatos = todosItens.filter((i) => {
      if (i.codprod !== codprod) return false;
      if (i.statusItem === 'REMOVIDO_ERP' || i.statusItem === 'CORTADO_DEFINITIVO') return false;
      if (nunotaFiltro && i.nunota !== nunotaFiltro) return false;
      return true;
    });

    if (itensCandidatos.length === 0) {
      throw new Error(`Nenhum item pendente encontrado para o produto ${codprod}.`);
    }

    const agora = new Date().toISOString();
    const itensAfetados: SeparacaoItem[] = [];

    for (const item of itensCandidatos) {
      const saldoFalta = Math.max(0, item.qtdEsperada - item.qtdSeparada);
      const novaQtdFalta = saldoFalta > 0 ? saldoFalta : (item.qtdFalta || 0);

      const dadosAtualizados: Partial<SeparacaoItem> = {
        qtdFalta: novaQtdFalta,
        motivoFalta: motivoFalta ? `${motivoFalta} (${usuario})` : `Falta física no picking informada por ${usuario}`,
        statusItem: 'FALTA',
        atualizadoEm: agora,
      };

      await this.separacaoRepo.atualizarItem(item.id, dadosAtualizados);
      itensAfetados.push({
        ...item,
        ...dadosAtualizados,
      } as SeparacaoItem);
    }

    const totalFalta = itensAfetados.reduce((acc, curr) => acc + (curr.qtdFalta || 0), 0);

    return {
      sucesso: true,
      mensagem: `Falta de ${totalFalta} UN registrada para o produto ${codprod}. Item encaminhado para resolução/corte.`,
      itensAfetados,
    };
  }
}
