import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { TipoEnderecoWMS } from '../../../domain/entities/Enderecamento.js';

export interface EnderecoAnaliticoItem {
  codend: number;
  endereco: string;
  descrend?: string | null;
  tipo: TipoEnderecoWMS;
  ativo: boolean;
  totalProdutos: number;
}

export interface ListarEnderecosAnaliticoInput {
  termo?: string;
  deposito?: string;
  rua?: string;
  torre?: string;
  nivel?: string;
  pos?: string;
  tipo?: 'TODOS' | 'PICKING' | 'PULMAO';
  ocupacao?: 'TODOS' | 'LIVRES' | 'OCUPADOS';
  limite?: number;
}

export function parseFiltroNumericoFlexivel(raw?: string | null): Set<number> | null {
  if (!raw || !raw.trim()) return null;
  const partes = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) return null;

  const resultado = new Set<number>();

  for (const parte of partes) {
    if (parte.includes('-')) {
      const subPartes = parte.split('-').map((s) => s.trim()).filter(Boolean);
      if (subPartes.length === 2) {
        const inicio = parseInt(subPartes[0], 10);
        const fim = parseInt(subPartes[1], 10);
        if (!isNaN(inicio) && !isNaN(fim)) {
          const menor = Math.min(inicio, fim);
          const maior = Math.max(inicio, fim);
          for (let n = menor; n <= maior; n++) {
            resultado.add(n);
          }
          continue;
        }
      }
    }

    const n = parseInt(parte, 10);
    if (!isNaN(n)) {
      resultado.add(n);
    }
  }

  return resultado.size > 0 ? resultado : null;
}

export function parseEnderecoCoords(
  endereco?: string | null,
  descrend?: string | null,
): {
  deposito: string;
  rua: string;
  torre: string;
  nivel: string;
  pos: string;
} | null {
  if (!endereco && !descrend) return null;
  const text = (descrend || '').trim();
  const rawEnd = (endereco || '').trim();

  let deposito = '';
  const partes = rawEnd.split(/[.-]/).map((p) => p.trim()).filter(Boolean);
  if (partes.length >= 5) {
    deposito = partes[0];
  } else {
    const matchDep = text.match(/D(?:EP(?:[OÓ]SITO)?)?\s*[:.-]?\s*(\d+)/i);
    if (matchDep) {
      deposito = matchDep[1];
    }
  }

  const regexDescrend =
    /R(?:UA)?\s*[:.-]?\s*(\d+)\s*T(?:ORRE)?\s*[:.-]?\s*(\d+)\s*N(?:[IÍ]VEL)?\s*[:.-]?\s*(\d+)\s*P(?:OS(?:I[ÇC][ÃA]O)?)?\s*[:.-]?\s*(\d+)/i;
  const match = text.match(regexDescrend);

  if (match) {
    return {
      deposito,
      rua: match[1],
      torre: match[2],
      nivel: match[3],
      pos: match[4],
    };
  }

  if (partes.length >= 4) {
    if (partes.length >= 5) {
      return {
        deposito: partes[0],
        rua: partes[1],
        torre: partes[2],
        nivel: partes[3],
        pos: partes[4],
      };
    }
    return {
      deposito,
      rua: partes[0],
      torre: partes[1],
      nivel: partes[2],
      pos: partes[3],
    };
  }

  return null;
}

export class ListarEnderecosAnaliticoUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(input: ListarEnderecosAnaliticoInput): Promise<EnderecoAnaliticoItem[]> {
    const termo = input.termo ? input.termo.trim().toUpperCase() : '';
    const tipo = input.tipo || 'TODOS';
    const ocupacao = input.ocupacao || 'TODOS';
    const limite = input.limite || 100;

    let whereClause = "END.ATIVO = 'S'";

    if (termo) {
      const termoSemZero = termo.replace(/^0+/, '');
      const termoLimpo = termo.replace(/[._]/g, '');
      whereClause += ` AND (
        TO_CHAR(END.CODEND) = '${termo}'
        OR TO_CHAR(END.CODEND) = '${termoSemZero}'
        OR UPPER(TRIM(END.ENDERECO)) LIKE '%${termo}%'
        OR REPLACE(REPLACE(UPPER(TRIM(END.ENDERECO)), '.', ''), '_', '') LIKE '%${termoLimpo}%'
        OR UPPER(TRIM(NVL(END.DESCREND, ' '))) LIKE '%${termo}%'
      )`;
    }

    if (tipo === 'PICKING') {
      whereClause += " AND NVL(END.PICKING, 'N') = 'S'";
    } else if (tipo === 'PULMAO') {
      whereClause += " AND NVL(END.PICKING, 'N') = 'N'";
    }

    // Consulta analítica trazendo contagem de SKUs ativos em TGWEXP
    const sql = `
SELECT 
    END.CODEND,
    NVL(TRIM(END.ENDERECO), TO_CHAR(END.CODEND)) AS ENDERECO,
    END.DESCREND,
    NVL(END.PICKING, 'N') AS EH_PICKING,
    NVL(END.ATIVO, 'S') AS ATIVO,
    (
      SELECT COUNT(DISTINCT EXP.CODPROD) 
      FROM TGWEXP EXP 
      WHERE EXP.CODEND = END.CODEND 
        AND EXP.ATIVO = 'S'
    ) AS TOTAL_PRODS
FROM TGWEND END
WHERE ${whereClause}
ORDER BY END.PICKING DESC, END.ENDERECO ASC, END.CODEND ASC
    `.trim();

    const resp = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
      randomUUID(),
    );

    const rows: any[] = resp?.responseBody?.rows || [];
    let itens: EnderecoAnaliticoItem[] = rows.map((r) => {
      const codend = Number(r[0]);
      const endereco = String(r[1] || codend).trim();
      const descrend = r[2] ? String(r[2]).trim() : null;
      const ehPicking = String(r[3] || 'N').toUpperCase() === 'S';
      const ativo = String(r[4] || 'S').toUpperCase() === 'S';
      const totalProdutos = Number(r[5] || 0);

      return {
        codend,
        endereco,
        descrend,
        tipo: ehPicking ? 'PICKING' : 'PULMAO',
        ativo,
        totalProdutos,
      };
    });

    if (ocupacao === 'LIVRES') {
      itens = itens.filter((i) => i.totalProdutos === 0);
    } else if (ocupacao === 'OCUPADOS') {
      itens = itens.filter((i) => i.totalProdutos > 0);
    }

    // ─── FILTRO POR COORDENADAS INDIVIDUAIS (DEPÓSITO, RUA, TORRE, NÍVEL, POSIÇÃO) ───
    // Suporta valores únicos (ex: 1), listas por vírgula (ex: 1,2 ou 1, 3, 5) e intervalos (ex: 1-5)
    const setDep = parseFiltroNumericoFlexivel(input.deposito);
    const setRua = parseFiltroNumericoFlexivel(input.rua);
    const setTorre = parseFiltroNumericoFlexivel(input.torre);
    const setNivel = parseFiltroNumericoFlexivel(input.nivel);
    const setPos = parseFiltroNumericoFlexivel(input.pos);

    if (setDep || setRua || setTorre || setNivel || setPos) {
      itens = itens.filter((i) => {
        const coords = parseEnderecoCoords(i.endereco, i.descrend);
        if (!coords) return false;

        if (setDep && !setDep.has(parseInt(coords.deposito, 10))) return false;
        if (setRua && !setRua.has(parseInt(coords.rua, 10))) return false;
        if (setTorre && !setTorre.has(parseInt(coords.torre, 10))) return false;
        if (setNivel && !setNivel.has(parseInt(coords.nivel, 10))) return false;
        if (setPos && !setPos.has(parseInt(coords.pos, 10))) return false;

        return true;
      });
    }

    return itens.slice(0, limite);
  }
}
