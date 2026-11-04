/**
 * Alertas sonoros, falados e táteis da conferência.
 *
 * O bipe é sintetizado em tempo de execução pela Web Audio API em vez de vir
 * de um arquivo .mp3/.wav: não pesa no bundle, dispensa request de rede (o
 * coletor pode estar em rede instável) e funciona offline.
 *
 * A leitura da mensagem usa a Web Speech API (SpeechSynthesis), nativa dos
 * navegadores, sem dependência externa.
 *
 * Todas as funções falham em silêncio se a API não existir no dispositivo.
 */

let contexto: AudioContext | null = null;

type JanelaComWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function criarContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const Ctor = window.AudioContext ?? (window as JanelaComWebkit).webkitAudioContext;
  if (!Ctor) return null;

  if (!contexto) {
    try {
      contexto = new Ctor();
    } catch {
      return null;
    }
  }

  return contexto;
}

/**
 * Destrava o áudio do navegador.
 *
 * IMPORTANTE: precisa ser chamada de dentro do handler do evento do usuário
 * (Enter, clique), de forma síncrona e ANTES de qualquer `await`. A política de
 * autoplay do Chrome só libera o AudioContext enquanto a ativação do gesto
 * está válida; criar o contexto depois do `await`, no `catch`, resultava em
 * contexto suspenso e alerta mudo.
 */
export function prepararAudio(): void {
  const ctx = criarContexto();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
}

/** Agenda um bipe único no contexto de áudio */
function bipe(
  ctx: AudioContext,
  frequencia: number,
  inicio: number,
  duracao: number,
  volume: number,
): void {
  const oscilador = ctx.createOscillator();
  const ganho = ctx.createGain();

  oscilador.type = 'square';
  oscilador.frequency.value = frequencia;

  // Rampas curtas de entrada/saída evitam o "clique" audível nas bordas
  ganho.gain.setValueAtTime(0, inicio);
  ganho.gain.linearRampToValueAtTime(volume, inicio + 0.01);
  ganho.gain.setValueAtTime(volume, inicio + duracao - 0.02);
  ganho.gain.linearRampToValueAtTime(0, inicio + duracao);

  oscilador.connect(ganho).connect(ctx.destination);
  oscilador.start(inicio);
  oscilador.stop(inicio + duracao);
}

/** Dois bipes descendentes de atenção */
function tocarBipeErro(): void {
  const ctx = criarContexto();
  if (!ctx) return;

  const agendar = () => {
    const agora = ctx.currentTime;
    bipe(ctx, 660, agora, 0.16, 0.18);
    bipe(ctx, 440, agora + 0.2, 0.28, 0.18);
  };

  // Se o contexto ainda estiver suspenso, espera o resume para agendar —
  // agendar em contexto suspenso faz o som se perder.
  if (ctx.state === 'suspended') {
    ctx.resume().then(agendar).catch(() => undefined);
  } else {
    agendar();
  }
}

/** Dois bipes ascendentes de confirmação (sucesso) */
function tocarBipeSucesso(): void {
  const ctx = criarContexto();
  if (!ctx) return;

  const agendar = () => {
    const agora = ctx.currentTime;
    bipe(ctx, 880, agora, 0.07, 0.12);
    bipe(ctx, 1175, agora + 0.08, 0.11, 0.12);
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(agendar).catch(() => undefined);
  } else {
    agendar();
  }
}

/** Vibração de erro (ignorada em desktop e no iOS Safari) */
export function vibrarErro(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([120, 80, 220]);
  }
}

/** Vibração curta de sucesso */
export function vibrarSucesso(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(60);
  }
}

/** Alerta de sucesso: bipe ascendente curto e vibração leve */
export function tocarAlertaSucesso(): void {
  tocarBipeSucesso();
  vibrarSucesso();
}

/** Resolve um CODPROD para a descrição do produto, quando conhecida */
export type ResolverProduto = (codProd: string) => string | undefined | null;

/**
 * Transforma a mensagem crua do Sankhya em algo que faça sentido ouvido.
 *
 * Entrada:
 *   "[Sankhya ConferenciaSP.salvarItemConferido] Quantidade conferida maior do
 *    que quantidade negociada no pedido/nota. (Produto: 11321)"
 *
 * Saída com resolvedor (produto está na lista do pedido):
 *   "Quantidade conferida maior do que quantidade negociada no pedido.
 *    Produto PARAFUSO SEXTAVADO 1/2"
 *
 * Saída sem resolvedor, ou produto desconhecido (ex.: item fora do pedido):
 *   "... Produto 1 1 3 2 1"   ← dígito a dígito, para conferir na etiqueta
 *
 * @param mensagem Texto retornado pelo Sankhya
 * @param resolverProduto Busca a descrição pelo CODPROD (opcional)
 */
export function prepararTextoParaFala(
  mensagem: string,
  resolverProduto?: ResolverProduto,
): string {
  return mensagem
    // Remove o prefixo técnico entre colchetes (nome do serviço Sankhya)
    .replace(/^\s*\[[^\]]*\]\s*/, '')
    // Troca o código pelo nome do produto. Sem nome disponível, fala dígito a
    // dígito: "onze mil trezentos e vinte e um" não ajuda quem procura a
    // etiqueta na caixa.
    .replace(/\(?\s*Produto:\s*(\d+)\s*\)?/gi, (_todo, codigo: string) => {
      const descricao = resolverProduto?.(codigo)?.trim();
      if (descricao) return `Produto ${descricao}`;
      return `Produto ${codigo.split('').join(' ')}`;
    })
    // "pedido/nota" é lido como "pedido barra nota" por algumas vozes
    .replace(/pedido\/nota/gi, 'pedido')
    .replace(/\s+/g, ' ')
    .trim()
    // Trava de segurança: mensagem inesperadamente longa não prende o operador
    .slice(0, 200);
}

/** Escolhe a melhor voz pt-BR disponível, se houver */
function vozPortugues(sintese: SpeechSynthesis): SpeechSynthesisVoice | null {
  const vozes = sintese.getVoices();
  if (!vozes.length) return null;
  return (
    vozes.find((v) => v.lang === 'pt-BR') ??
    vozes.find((v) => v.lang?.toLowerCase().startsWith('pt')) ??
    null
  );
}

/** Lê um texto em voz alta */
export function falar(texto: string, onFim?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onFim?.();
    return;
  }
  if (!texto) {
    onFim?.();
    return;
  }

  const sintese = window.speechSynthesis;

  try {
    // Cancela a fala anterior: em leitura em sequência, o operador precisa
    // ouvir o erro atual, não a fila acumulada.
    sintese.cancel();

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.rate = 1.05;
    fala.volume = 1;

    const voz = vozPortugues(sintese);
    if (voz) fala.voice = voz;

    if (onFim) {
      let finalizado = false;
      const finalizar = () => {
        if (!finalizado) {
          finalizado = true;
          onFim();
        }
      };
      fala.onend = finalizar;
      fala.onerror = finalizar;
      // Timeout de segurança caso a síntese trave no dispositivo
      window.setTimeout(finalizar, 2000);
    }

    sintese.speak(fala);
  } catch {
    onFim?.();
  }
}

/**
 * Alerta de erro: bipe de atenção, vibração e leitura da mensagem.
 *
 * @param mensagem Texto retornado pelo Sankhya. Se omitido, só bipa.
 * @param resolverProduto Traduz o CODPROD da mensagem para o nome do produto
 */
export function tocarAlertaErro(mensagem?: string, resolverProduto?: ResolverProduto): void {
  tocarBipeErro();
  vibrarErro();

  if (!mensagem) return;

  const texto = prepararTextoParaFala(mensagem, resolverProduto);
  if (!texto) return;

  // Espera o bipe terminar (~0,48 s) para a voz não competir com ele
  window.setTimeout(() => falar(texto), 520);
}

/**
 * Emite um som duplo suave e instrui vocalmente de acordo com o campo:
 * "Informe o lote", "Informe a validade" ou "Informe a fabricação".
 * Chama onProntoParaOuvir assim que a fala termina, para que o microfone
 * não capture o próprio áudio do dispositivo.
 */
export function tocarAlertaPedirCampo(
  campoNome: 'lote' | 'validade' | 'fabricacao',
  onProntoParaOuvir?: () => void
): void {
  const ctx = criarContexto();
  if (ctx) {
    const agendar = () => {
      const agora = ctx.currentTime;
      bipe(ctx, 750, agora, 0.09, 0.14);
      bipe(ctx, 980, agora + 0.10, 0.14, 0.14);
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(agendar).catch(() => undefined);
    } else {
      agendar();
    }
  }

  const frase =
    campoNome === 'validade'
      ? 'Informe a validade'
      : campoNome === 'fabricacao'
      ? 'Informe a fabricação'
      : 'Informe o lote';

  // Fala sintetizada suave
  window.setTimeout(() => falar(frase, onProntoParaOuvir), 240);
}

/**
 * Emite um som duplo suave e instrui vocalmente: "Informe o lote".
 * (Mantido por compatibilidade com implementações existentes)
 */
export function tocarAlertaPedirLote(onProntoParaOuvir?: () => void): void {
  tocarAlertaPedirCampo('lote', onProntoParaOuvir);
}
