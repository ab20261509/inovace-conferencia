/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ARQUIVO PROTEGIDO — NÃO MODIFICAR SEM APROVAÇÃO DO RESPONSÁVEL       ║
 * ║                                                                        ║
 * ║  Este parser foi calibrado e testado em campo com etiquetas reais.     ║
 * ║  Qualquer alteração na lógica de extração pode quebrar a leitura OCR   ║
 * ║  em cenários já validados. Consulte o responsável antes de alterar.    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ocrParser.ts — Parser de texto OCR para conferência de carga (WMS)
 *
 * Responsabilidades:
 *   - parseOcrText(): parsing completo quando a imagem contém múltiplos campos
 *     com labels (LOTE:, FAB:, VAL:). Usado em modo de captura única.
 *   - extractFieldValue(): extração direta por campo individual, para uso com
 *     ROI (Region of Interest) onde o usuário seleciona a área exata na tela.
 */

export interface OcrParseResult {
  lote?: string;
  fabricacao?: string;
  validade?: string;
  confidence: number;
  rawText: string;
}

const MONTH_NAMES: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

const datePattern = /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/g;

export function parseOcrText(rawText: string): OcrParseResult {
  const result: OcrParseResult = {
    confidence: 0,
    rawText,
  };

  const cleanedText = rawText.replace(/\s+/g, ' ').trim();

  // --- Lote (com label) ---
  const lotePatterns = [
    /(?:LOTE?T?[:\s]+|LOT[:\s]+|LOTE\s*)([A-Z0-9]{3,20})/i,
    /L[-]?([A-Z0-9]{3,20})/i,
    /\b([A-Z]{1,3}[-]?\d{4,12})\b/i,
  ];

  for (const pattern of lotePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      result.lote = match[1].toUpperCase();
      result.confidence += 0.4;
      break;
    }
  }

  // --- Datas (sem label, por posição) ---
  const dateMatches = cleanedText.match(datePattern);
  if (dateMatches) {
    const dates = dateMatches.map((d) => {
      const normalized = d.replace(/[\.]/g, '/');
      const parts = normalized.split('/');
      if (parts[2] && parts[2].length === 2) {
        parts[2] = (Number(parts[2]) > 50 ? '19' : '20') + parts[2];
      }
      return { raw: `${parts[0]}/${parts[1]}/${parts[2]}`, date: new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) };
    }).filter((d) => !isNaN(d.date.getTime()));

    if (dates.length >= 2) {
      const sorted = [...dates].sort((a, b) => a.date.getTime() - b.date.getTime());
      result.fabricacao = formatDate(sorted[0].date);
      result.validade = formatDate(sorted[sorted.length - 1].date);
      result.confidence += 0.5;
    } else if (dates.length === 1) {
      result.validade = formatDate(dates[0].date);
      result.confidence += 0.25;
    }
  }

  // --- Labels explícitos (sobrescrevem heurística acima) ---
  const fabMatch = cleanedText.match(/(?:FAB|FABRICAÇÃO|FABRIC)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i);
  if (fabMatch) {
    result.fabricacao = normalizeRawDate(fabMatch[1]);
    result.confidence += 0.25;
  }

  const valMatch = cleanedText.match(/(?:VAL|VALIDADE|VALI|VENC)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i);
  if (valMatch) {
    result.validade = normalizeRawDate(valMatch[1]);
    result.confidence += 0.25;
  }

  return result;
}

export function extractFieldValue(rawText: string, field: 'lote' | 'fabricacao' | 'validade'): string {
  const cleaned = rawText.replace(/\s+/g, ' ').trim();

  if (field === 'lote') {
    return cleaned.replace(/\s+/g, '');
  }

  const parsed = parseFlexDate(cleaned);
  if (parsed) return parsed;

  return cleaned;
}

export function toIsoDate(ddmmyyyy: string): string {
  const match = ddmmyyyy.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return ddmmyyyy;
}

export function normalizeDate(input: string): string {
  const cleaned = input.replace(/[^\d\/]/g, '');
  const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[1]}/${match[2]}/${match[3]}`;
  }
  return input;
}

function expandYear(y: string): string {
  if (y.length === 4) return y;
  return (Number(y) > 50 ? '19' : '20') + y.padStart(2, '0');
}

function parseFlexDate(text: string): string | null {
  const t = text.trim();

  const monthNameMatch = t.match(
    /\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/i
  );
  if (monthNameMatch) {
    const mm = MONTH_NAMES[monthNameMatch[1].toLowerCase()];
    const nums = t.replace(monthNameMatch[0], '').match(/\d+/g);
    if (mm && nums && nums.length >= 1) {
      if (nums.length >= 2) {
        const [a, b] = nums.map(Number);
        const day = a <= 31 ? a : b <= 31 ? b : 1;
        const yearRaw = a > 31 ? nums[0] : b > 31 ? nums[1] : nums[1];
        return `${expandYear(yearRaw)}-${mm}-${String(day).padStart(2, '0')}`;
      }
      const yyyy = expandYear(nums[0]);
      return `${yyyy}-${mm}-01`;
    }
  }

  const nums = t.match(/\d+/g);
  if (!nums || nums.length < 2) return null;

  const values = nums.map(Number);

  if (nums.length >= 3) {
    const [a, b, c] = values;
    const [ra, , rc] = nums;

    let dd: number, mm: number, yyyy: string;

    if (ra.length === 4) {
      yyyy = ra;
      mm = b;
      dd = c;
    } else if (rc.length === 4) {
      dd = a;
      mm = b;
      yyyy = rc;
    } else if (a > 31) {
      yyyy = expandYear(ra);
      mm = b;
      dd = c;
    } else {
      dd = a;
      mm = b;
      yyyy = expandYear(rc);
    }

    if (mm > 12 && dd <= 12) {
      [dd, mm] = [mm, dd];
    }

    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  if (nums.length === 2) {
    const [a, b] = values;
    const [ra, rb] = nums;

    let mm: number, yyyy: string;

    if (rb.length === 4 || b > 12) {
      mm = a;
      yyyy = expandYear(rb);
    } else if (ra.length === 4 || a > 12) {
      mm = b;
      yyyy = expandYear(ra);
    } else {
      mm = a;
      yyyy = expandYear(rb);
    }

    if (mm >= 1 && mm <= 12) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-01`;
    }
  }

  return null;
}

function normalizeRawDate(raw: string): string {
  const parts = raw.replace(/[\.]/g, '/').split('/');
  if (parts[2] && parts[2].length === 2) {
    parts[2] = (Number(parts[2]) > 50 ? '19' : '20') + parts[2];
  }
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
