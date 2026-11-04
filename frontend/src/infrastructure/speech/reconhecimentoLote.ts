/**
 * Reconhecimento de fala e transcrição especializada para Lotes Industriais.
 * Converte palavras por extenso ("um", "dois"...) em dígitos ("1", "2"...),
 * sinais falados ("ponto", "traço"...) em símbolos (".", "-"...) e letras em MAIÚSCULAS contínuas.
 */

// Declaração de tipos para Web Speech API no TypeScript
interface IWindowSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * Normaliza o texto falado pelo conferente para o formato estrito de Lote.
 * Exemplo: "um dois três quatro cinco seis f k e f" -> "123456FKEF"
 * Exemplo: "vinte e quatro ponto zero cinco traço b" -> "24.05-B"
 */
export function normalizarLoteFalado(textoBruto: string): string {
  if (!textoBruto) return '';

  let t = textoBruto.toLowerCase().trim();

  // 1. Remover frases introdutórias comuns do operador
  t = t.replace(/^(o\s+)?lote\s+(é|e)?\s+/g, '');
  t = t.replace(/^código\s+(do\s+lote\s+)?(é|e)?\s+/g, '');

  // 2. Substituir comandos falados de pontuação e sinais
  t = t.replace(/\b(ponto|pontinho)\b/g, '.');
  t = t.replace(/\b(traço|traco|hífen|hifen|menos)\b/g, '-');
  t = t.replace(/\b(barra invertida)\b/g, '\\');
  t = t.replace(/\b(barra)\b/g, '/');
  t = t.replace(/\b(underline|sublinhado|subtraço|subtraco)\b/g, '_');
  t = t.replace(/\b(dois pontos)\b/g, ':');
  t = t.replace(/\b(arroba)\b/g, '@');
  t = t.replace(/\b(asterisco)\b/g, '*');

  // 3. Prefixos de soletração: "letra a" -> "a"
  t = t.replace(/\bletra\s+([a-z])\b/g, '$1');

  // 4. Dezenas compostas com 'e' (ex: "vinte e quatro" -> "24")
  const dezenas: Record<string, number> = {
    vinte: 20,
    trinta: 30,
    quarenta: 40,
    cinquenta: 50,
    sessenta: 60,
    setenta: 70,
    oitenta: 80,
    noventa: 90,
  };
  const unidades: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    três: 3,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    meia: 6,
    sete: 7,
    oito: 8,
    nove: 9,
  };

  for (const [dezStr, dezVal] of Object.entries(dezenas)) {
    for (const [uniStr, uniVal] of Object.entries(unidades)) {
      const regexComposto = new RegExp(`\\b${dezStr}\\s+e\\s+${uniStr}\\b`, 'g');
      t = t.replace(regexComposto, String(dezVal + uniVal));
    }
  }

  // 5. Números individuais por extenso
  const mapaNumeros: Record<string, string> = {
    zero: '0',
    um: '1',
    uma: '1',
    hum: '1',
    dois: '2',
    duas: '2',
    três: '3',
    tres: '3',
    quatro: '4',
    cinco: '5',
    seis: '6',
    meia: '6',
    sete: '7',
    oito: '8',
    nove: '9',
    dez: '10',
    onze: '11',
    doze: '12',
    treze: '13',
    quatorze: '14',
    catorze: '14',
    quinze: '15',
    dezesseis: '16',
    dezessete: '17',
    dezoito: '18',
    dezenove: '19',
    vinte: '20',
    trinta: '30',
    quarenta: '40',
    cinquenta: '50',
    sessenta: '60',
    setenta: '70',
    oitenta: '80',
    noventa: '90',
    cem: '100',
  };

  for (const [extenso, digito] of Object.entries(mapaNumeros)) {
    const regex = new RegExp(`\\b${extenso}\\b`, 'g');
    t = t.replace(regex, digito);
  }

  // 6. Remover todos os espaços e caracteres não alfanuméricos/pontuação de lote
  t = t.replace(/[^a-z0-9\.\-\/\_\:\@\*]/g, '');

  return t.toUpperCase();
}

/**
 * Normaliza o texto falado de uma data para o formato DD/MM/AAAA.
 * Converte meses por extenso ("outubro", "dezembro"), números por extenso,
 * e valida regras reais de calendário.
 *
 * Exigência: Dia, Mês e Ano completos.
 */
export function normalizarDataFalada(
  textoBruto: string
): { dataFormatada: string; valida: boolean; erro?: string } {
  if (!textoBruto) {
    return { dataFormatada: '', valida: false, erro: 'Nenhuma fala capturada' };
  }

  let t = textoBruto.toLowerCase().trim();

  // 1. Remover frases introdutórias comuns
  t = t.replace(/^(a\s+)?(data\s+(de\s+)?)?(validade|fabricação|fabricacao)\s+(é|e)?\s+/g, '');
  t = t.replace(/\b(barra)\b/g, '/');
  t = t.replace(/\b(de|do|da)\b/g, ' ');

  // 2. Mapeamento de meses por extenso
  const meses: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    março: 3,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };
  for (const [mNome, mNum] of Object.entries(meses)) {
    t = t.replace(new RegExp(`\\b${mNome}\\b`, 'g'), String(mNum));
  }

  // 3. Casos especiais ordinais comuns
  t = t.replace(/\b(primeiro|primeira)\b/g, '1');

  // 4. "Dois mil" falado em anos
  t = t.replace(/\bdois\s+mil\b/g, '2000');

  // 5. Dezenas compostas com 'e' (ex: "vinte e quatro" -> "24")
  const dezenas: Record<string, number> = {
    vinte: 20,
    trinta: 30,
    quarenta: 40,
    cinquenta: 50,
    sessenta: 60,
    setenta: 70,
    oitenta: 80,
    noventa: 90,
  };
  const unidades: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    três: 3,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    meia: 6,
    sete: 7,
    oito: 8,
    nove: 9,
  };
  for (const [dezStr, dezVal] of Object.entries(dezenas)) {
    for (const [uniStr, uniVal] of Object.entries(unidades)) {
      t = t.replace(new RegExp(`\\b${dezStr}\\s+(e\\s+)?${uniStr}\\b`, 'g'), String(dezVal + uniVal));
    }
  }

  // 6. Números individuais por extenso
  const mapaNumeros: Record<string, string> = {
    zero: '0',
    um: '1',
    uma: '1',
    dois: '2',
    duas: '2',
    três: '3',
    tres: '3',
    quatro: '4',
    cinco: '5',
    seis: '6',
    meia: '6',
    sete: '7',
    oito: '8',
    nove: '9',
    dez: '10',
    onze: '11',
    doze: '12',
    treze: '13',
    quatorze: '14',
    catorze: '14',
    quinze: '15',
    dezesseis: '16',
    dezessete: '17',
    dezoito: '18',
    dezenove: '19',
    vinte: '20',
    trinta: '30',
  };
  for (const [ext, dig] of Object.entries(mapaNumeros)) {
    t = t.replace(new RegExp(`\\b${ext}\\b`, 'g'), dig);
  }

  // 7. "2000 e 26" -> 2026
  t = t.replace(/2000\s+(e\s+)?(\d{1,2})/g, (_, __, p2) => String(2000 + parseInt(p2, 10)));

  // 8. Extrair tokens numéricos
  let tokens = t.match(/\d+/g) || [];
  if (tokens.length === 1) {
    const s = tokens[0];
    if (s.length === 8) {
      tokens = [s.slice(0, 2), s.slice(2, 4), s.slice(4)];
    } else if (s.length === 6) {
      tokens = [s.slice(0, 2), s.slice(2, 4), s.slice(4)];
    }
  }

  const t0 = tokens[0];
  const t1 = tokens[1];
  const t2 = tokens[2];

  if (!t0 || !t1 || !t2) {
    return {
      dataFormatada: '',
      valida: false,
      erro: 'Data incompleta. Fale o Dia, Mês e Ano (ex: 15 de Outubro de 2026).',
    };
  }

  const diaNum = parseInt(t0, 10);
  const mesNum = parseInt(t1, 10);
  let anoNum = parseInt(t2, 10);

  if (anoNum < 100) {
    anoNum = anoNum <= 50 ? 2000 + anoNum : 1900 + anoNum;
  }

  if (mesNum < 1 || mesNum > 12) {
    return { dataFormatada: '', valida: false, erro: 'Mês inválido (01 a 12).' };
  }

  const diasNoMes = new Date(anoNum, mesNum, 0).getDate();
  if (diaNum < 1 || diaNum > diasNoMes) {
    return {
      dataFormatada: '',
      valida: false,
      erro: `Dia ${diaNum} inválido para o mês ${mesNum}/${anoNum} (máx: ${diasNoMes} dias).`,
    };
  }

  if (anoNum < 1920 || anoNum > 2120) {
    return { dataFormatada: '', valida: false, erro: 'Ano fora da faixa permitida.' };
  }

  const diaStr = String(diaNum).padStart(2, '0');
  const mesStr = String(mesNum).padStart(2, '0');
  const dataFinal = `${diaStr}/${mesStr}/${anoNum}`;

  return { dataFormatada: dataFinal, valida: true };
}

/** Verifica se o navegador atual suporta reconhecimento de fala */
export function isReconhecimentoVozDisponivel(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as IWindowSpeech;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export type ModoReconhecimentoVoz = 'lote' | 'data';

export interface ReconhecimentoLoteController {
  iniciar: (
    onResultado: (resultado: string, erroValidacao?: string) => void,
    onStatusChange?: (ouvindo: boolean) => void,
    onError?: (mensagem: string) => void,
    modo?: ModoReconhecimentoVoz
  ) => void;
  parar: () => void;
  isOuvindo: () => boolean;
}

/**
 * Cria uma instância controladora de reconhecimento de voz para Lote ou Data
 */
export function criarReconhecedorLote(): ReconhecimentoLoteController {
  let recognizer: any = null;
  let ouvindo = false;

  return {
    iniciar(onResultado, onStatusChange, onError, modo = 'lote') {
      if (typeof window === 'undefined') return;
      const win = window as IWindowSpeech;
      const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechClass) {
        console.warn('SpeechRecognition não suportado neste navegador.');
        onError?.('Reconhecimento de voz não suportado neste navegador. Utilize o Google Chrome.');
        return;
      }

      if (ouvindo && recognizer) {
        try {
          recognizer.stop();
        } catch {
          // ignora
        }
      }

      try {
        recognizer = new SpeechClass();
        recognizer.lang = 'pt-BR';
        recognizer.continuous = false;
        recognizer.interimResults = false;
        recognizer.maxAlternatives = 3;

        recognizer.onstart = () => {
          ouvindo = true;
          onStatusChange?.(true);
        };

        recognizer.onresult = (event: any) => {
          if (event.results && event.results.length > 0) {
            const transcricao = event.results[0][0]?.transcript || '';
            if (modo === 'data') {
              const resData = normalizarDataFalada(transcricao);
              if (resData.valida) {
                onResultado(resData.dataFormatada);
              } else {
                onResultado('', resData.erro);
              }
            } else {
              const loteLimpo = normalizarLoteFalado(transcricao);
              if (loteLimpo) {
                onResultado(loteLimpo);
              }
            }
          }
        };

        recognizer.onerror = (event: any) => {
          console.warn('Erro no reconhecimento de voz:', event.error);
          ouvindo = false;
          onStatusChange?.(false);

          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            onError?.('Permissão de microfone negada. Conceda permissão nas configurações do navegador.');
          } else if (event.error === 'network') {
            onError?.('Falha de conexão com o serviço de voz do navegador.');
          } else if (event.error === 'no-speech') {
            // Silêncio, não precisa alarme
          } else {
            onError?.(`Microfone indisponível (${event.error}).`);
          }
        };

        recognizer.onend = () => {
          ouvindo = false;
          onStatusChange?.(false);
        };

        recognizer.start();
      } catch (err: any) {
        console.warn('Falha ao iniciar reconhecimento de voz:', err);
        ouvindo = false;
        onStatusChange?.(false);
        onError?.('Falha ao acessar o microfone. Verifique as permissões.');
      }
    },

    parar() {
      if (recognizer && ouvindo) {
        try {
          recognizer.stop();
        } catch {
          // ignora
        }
      }
      ouvindo = false;
    },

    isOuvindo() {
      return ouvindo;
    },
  };
}
