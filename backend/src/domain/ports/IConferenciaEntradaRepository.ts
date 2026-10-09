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
  obterMapaStatusNotas(nunotas: number[]): Promise<Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number }>>;
}
