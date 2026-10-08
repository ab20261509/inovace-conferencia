import fs from 'node:fs';
import path from 'node:path';
import { IConferenciaEntradaRepository } from '../../domain/ports/IConferenciaEntradaRepository.js';
import {
  SessaoConferenciaEntrada,
  BipagemEntrada,
  StatusConferenciaEntrada,
} from '../../domain/entities/ConferenciaEntrada.js';

interface StorageConferenciaEntrada {
  sessoes: Record<string, SessaoConferenciaEntrada>;
  bipagens: Record<string, BipagemEntrada[]>; // chave: conferenciaId
}

export class JsonConferenciaEntradaRepository implements IConferenciaEntradaRepository {
  private readonly filePath: string;
  private cache: StorageConferenciaEntrada | null = null;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const dockerPath = '/app/data/conferencias_entrada.json';
      const localPath = path.resolve(process.cwd(), 'data/conferencias_entrada.json');
      const rootLocalPath = path.resolve(process.cwd(), 'backend/data/conferencias_entrada.json');

      if (fs.existsSync('/app/data')) {
        this.filePath = dockerPath;
      } else if (fs.existsSync(path.resolve(process.cwd(), 'backend'))) {
        this.filePath = rootLocalPath;
      } else {
        this.filePath = localPath;
      }
    }

    this.garantirDiretorio();
    this.carregar();
  }

  private garantirDiretorio(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn('⚠️ Não foi possível criar diretório de conferências de entrada:', dir);
      }
    }
  }

  private carregar(): StorageConferenciaEntrada {
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      if (fs.existsSync(this.filePath)) {
        const conteudo = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(conteudo);
        this.cache = {
          sessoes: parsed.sessoes || {},
          bipagens: parsed.bipagens || {},
        };
      } else {
        this.cache = { sessoes: {}, bipagens: {} };
      }
    } catch (err) {
      console.error('❌ Erro ao ler conferencias_entrada.json:', err);
      this.cache = { sessoes: {}, bipagens: {} };
    }

    return this.cache;
  }

  private salvar(): void {
    if (!this.cache) return;
    try {
      this.garantirDiretorio();
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Erro ao salvar conferencias_entrada.json:', err);
    }
  }

  async obterSessaoPorId(id: string): Promise<SessaoConferenciaEntrada | null> {
    const data = this.carregar();
    return data.sessoes[id] || null;
  }

  async obterSessaoPorNunota(nunota: number): Promise<SessaoConferenciaEntrada | null> {
    const data = this.carregar();
    for (const sessao of Object.values(data.sessoes)) {
      if (sessao.nunotas.includes(nunota) && sessao.status !== 'Conferido') {
        return sessao;
      }
    }
    // Se não encontrou ativa, busca última finalizada
    for (const sessao of Object.values(data.sessoes)) {
      if (sessao.nunotas.includes(nunota)) {
        return sessao;
      }
    }
    return null;
  }

  async obterSessoesPorNunotas(nunotas: number[]): Promise<SessaoConferenciaEntrada[]> {
    const data = this.carregar();
    const nunotaSet = new Set(nunotas);
    return Object.values(data.sessoes).filter((s) => s.nunotas.some((n) => nunotaSet.has(n)));
  }

  async salvarSessao(sessao: SessaoConferenciaEntrada): Promise<void> {
    const data = this.carregar();
    data.sessoes[sessao.id] = sessao;
    this.salvar();
  }

  async listarBipagens(conferenciaId: string, nivel?: number): Promise<BipagemEntrada[]> {
    const data = this.carregar();
    const lista = data.bipagens[conferenciaId] || [];
    if (nivel !== undefined) {
      return lista.filter((b) => b.nivel === nivel);
    }
    return lista;
  }

  async salvarBipagem(bipagem: BipagemEntrada): Promise<void> {
    const data = this.carregar();
    if (!data.bipagens[bipagem.conferenciaId]) {
      data.bipagens[bipagem.conferenciaId] = [];
    }
    data.bipagens[bipagem.conferenciaId].push(bipagem);
    this.salvar();
  }

  async anularBipagem(bipagemId: string): Promise<void> {
    const data = this.carregar();
    for (const lista of Object.values(data.bipagens)) {
      const bipagem = lista.find((b) => b.id === bipagemId);
      if (bipagem) {
        bipagem.anulado = true;
        this.salvar();
        return;
      }
    }
  }

  async obterMapaStatusNotas(
    nunotas: number[]
  ): Promise<Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number }>> {
    const data = this.carregar();
    const mapa: Record<number, { status: StatusConferenciaEntrada; id: string; nivel: number }> = {};

    for (const nunota of nunotas) {
      // Buscar primeiro sessão ativa/em andamento
      const sessaoAtiva = Object.values(data.sessoes).find(
        (s) => s.nunotas.includes(nunota) && s.status !== 'Conferido'
      );
      if (sessaoAtiva) {
        mapa[nunota] = {
          status: sessaoAtiva.status,
          id: sessaoAtiva.id,
          nivel: sessaoAtiva.nivelAtual,
        };
        continue;
      }

      // Se não tem ativa, buscar finalizada
      const sessaoConcluida = Object.values(data.sessoes).find((s) => s.nunotas.includes(nunota));
      if (sessaoConcluida) {
        mapa[nunota] = {
          status: sessaoConcluida.status,
          id: sessaoConcluida.id,
          nivel: sessaoConcluida.nivelAtual,
        };
      }
    }

    return mapa;
  }
}
