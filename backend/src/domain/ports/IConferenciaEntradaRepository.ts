import {
  SessaoConferenciaEntrada,
  BipagemEntrada,
  StatusConferenciaEntrada,
} from '../entities/ConferenciaEntrada.js';

export interface IConferenciaEntradaRepository {
  obterSessaoPorId(id: string): Promise<SessaoConferenciaEntrada | null>;
  obterSessaoPorNunota(nunota: number): Promise<SessaoConferenciaEntrada | null>;
  obterSessoesPorNunotas(nunotas: number[]): Promise<SessaoConferenciaEntrada[]>;
  listarTodasSessoes(): Promise<SessaoConferenciaEntrada[]>;
  salvarSessao(sessao: SessaoConferenciaEntrada): Promise<void>;
  listarBipagens(conferenciaId: string, nivel?: number): Promise<BipagemEntrada[]>;
  salvarBipagem(bipagem: BipagemEntrada): Promise<void>;
  anularBipagem(bipagemId: string): Promise<void>;
  restaurarBipagens(conferenciaId: string): Promise<number>;
  migrarBipagens(deConferenciaId: string, paraConferenciaId: string, nunotas?: number[]): Promise<number>;
  excluirSessao(id: string): Promise<void>;
  obterMapaStatusNotas(nunotas: number[]): Promise<Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number; conferente?: string }>>;
  reatribuirSequenciasBipagens(
    conferenciaId: string,
    nunota: number,
    codprod: number,
    itensTGFITE: Array<{ sequencia: number; controle?: string; qtdneg: number }>
  ): Promise<number>;
  obterSessoesComBackupPorChaveOuNota(
    chavenfe?: string,
    numnota?: number,
    codparc?: number,
    excluirConferenciaId?: string
  ): Promise<SessaoConferenciaEntrada[]>;
  migrarERestaurarBipagensParaNovaNota(
    deConferenciaId: string,
    paraConferenciaId: string,
    novoNunota: number,
    mapaSequenciasPorProd: Record<number, number>
  ): Promise<number>;
  anularBipagensPorItens(
    conferenciaId: string,
    nivel: number,
    itens: Array<{ nunota: number; sequencia: number; codprod: number }>
  ): Promise<number>;
}

