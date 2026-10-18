export interface ProdutoInternetResultado {
  encontrado: boolean;
  codbarra?: string;
  descrprod?: string;
  marca?: string;
  imagemUrl?: string;
  fonte?: string;
}

export class BuscarProdutoInternetUseCase {
  async execute(codbarra: string): Promise<ProdutoInternetResultado> {
    const barraLimpa = codbarra ? codbarra.trim().replace(/\D/g, '') : '';
    if (!barraLimpa || barraLimpa.length < 8) {
      return { encontrado: false };
    }

    // 1. Consulta Open Food Facts API (gratuita e aberta, excelente cobertura de alimentos, pets e supermercado no Brasil)
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barraLimpa}.json`, {
        headers: { 'User-Agent': 'SankhyaConferCheck/1.0 (internal tool)' },
        signal: AbortSignal.timeout(5000),
      });

      if (resp.ok) {
        const data: any = await resp.json();
        if (data && data.status === 1 && data.product) {
          const nome =
            data.product.product_name_pt ||
            data.product.product_name ||
            data.product.generic_name_pt ||
            data.product.generic_name;

          if (nome && String(nome).trim()) {
            return {
              encontrado: true,
              codbarra: barraLimpa,
              descrprod: String(nome).trim(),
              marca: data.product.brands ? String(data.product.brands).trim() : undefined,
              imagemUrl: data.product.image_url || undefined,
              fonte: 'Open Food Facts',
            };
          }
        }
      }
    } catch {
      // Falha ou timeout no Open Food Facts, tenta fallback
    }

    // 2. Fallback via DuckDuckGo / Busca pública rápida
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(barraLimpa)}`;
      const respHtml = await fetch(ddgUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (respHtml.ok) {
        const html = await respHtml.text();
        const matchTitle =
          html.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
          html.match(/<h2[^>]*class="result__title"[^>]*>([\s\S]*?)<\/h2>/i);

        if (matchTitle && matchTitle[1]) {
          const textoLimpo = matchTitle[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

          if (textoLimpo.length > 5 && !textoLimpo.toLowerCase().includes('nenhum resultado')) {
            const partes = textoLimpo.split(/ [|\-–—:] /);
            const tituloFinal = partes[0].trim();
            if (tituloFinal.length >= 4) {
              return {
                encontrado: true,
                codbarra: barraLimpa,
                descrprod: tituloFinal,
                fonte: 'Busca Web',
              };
            }
          }
        }
      }
    } catch {
      // Ignora erro no fallback
    }

    return { encontrado: false, codbarra: barraLimpa };
  }
}
