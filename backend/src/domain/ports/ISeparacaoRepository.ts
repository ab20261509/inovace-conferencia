import {
  Separacao,
  SeparacaoItem,
  SeparacaoBipagem,
  StatusSeparacao,
} from '../entities/Separacao.js';

export interface ISeparacaoRepository {
  criarSeparacao(separacao: Separacao, itens: SeparacaoItem[]): Promise<void>;
  buscarPorId(id: string): Promise<Separacao | null>;
  buscarPorOrdemCarga(ordemCarga: number, status?: StatusSeparacao): Promise<Separacao | null>;
  listarAtivas(): Promise<Separacao[]>;
  listarItens(separacaoId: string): Promise<SeparacaoItem[]>;
  buscarItemPorId(itemId: string): Promise<SeparacaoItem | null>;
  atualizarSeparacao(id: string, dados: Partial<Separacao>): Promise<void>;
  atualizarItem(id: string, dados: Partial<SeparacaoItem>): Promise<void>;
  inserirItem(item: SeparacaoItem): Promise<void>;
  registrarBipagem(bipagem: SeparacaoBipagem): Promise<void>;
  listarBipagens(separacaoId: string): Promise<SeparacaoBipagem[]>;
  anularBipagem(bipId: string): Promise<SeparacaoBipagem | null>;
}
