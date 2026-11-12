import React from 'react';

export interface EnderecoDetalhado {
  rua: string;
  torre: string;
  nivel: string;
  pos: string;
  lado: 'ESQUERDA' | 'DIREITA';
  rawEndereco?: string | null;
  rawDescrend?: string | null;
}

export function parseEndereco(
  endereco?: string | null,
  descrend?: string | null,
  ladoCadastrado?: string | null
): EnderecoDetalhado | null {
  if (!endereco && !descrend) return null;

  const text = (descrend || '').trim();
  const rawEnd = (endereco || '').trim();

  // 1. Tentar fazer regex sobre descrend (ex: "R 01  T 02  N 01  P 17", "Rua 01 Torre 02...")
  const regexDescrend =
    /R(?:UA)?\s*[:.-]?\s*(\d+)\s*T(?:ORRE)?\s*[:.-]?\s*(\d+)\s*N(?:[IÍ]VEL)?\s*[:.-]?\s*(\d+)\s*P(?:OS(?:I[ÇC][ÃA]O)?)?\s*[:.-]?\s*(\d+)/i;
  const match = text.match(regexDescrend);

  let rua = '';
  let torre = '';
  let nivel = '';
  let pos = '';

  if (match) {
    rua = match[1];
    torre = match[2];
    nivel = match[3];
    pos = match[4];
  } else {
    // 2. Fallback: split por ponto ou hífen em rawEnd (ex: 01.01.02.02.17)
    const partes = rawEnd.split(/[.-]/).map((p) => p.trim()).filter(Boolean);
    if (partes.length >= 4) {
      if (partes.length >= 5) {
        // [Emp/Galpão, Rua, Torre, Nível, Posição]
        rua = partes[1];
        torre = partes[2];
        nivel = partes[3];
        pos = partes[4];
      } else {
        rua = partes[0];
        torre = partes[1];
        nivel = partes[2];
        pos = partes[3];
      }
    }
  }

  if (!rua && !torre && !nivel && !pos) {
    return null;
  }

  // 3. Determinar o Lado (Esquerda vs Direita):
  // Regra do cliente: "sempre que for impa é do lado esquerdo"
  // TGWEND.PAR: 'N' = Ímpar, 'S' = Par
  let isEsquerda = false;
  if (ladoCadastrado) {
    const lUpper = ladoCadastrado.trim().toUpperCase();
    if (lUpper === 'N' || lUpper === 'I' || lUpper === 'ÍMPAR' || lUpper === 'IMPAR' || lUpper === 'ESQUERDA') {
      isEsquerda = true;
    } else if (lUpper === 'S' || lUpper === 'P' || lUpper === 'PAR' || lUpper === 'DIREITA') {
      isEsquerda = false;
    } else {
      const posNum = parseInt(pos, 10);
      isEsquerda = !isNaN(posNum) && posNum % 2 !== 0;
    }
  } else {
    const posNum = parseInt(pos, 10);
    isEsquerda = !isNaN(posNum) && posNum % 2 !== 0;
  }

  return {
    rua: rua.padStart(2, '0'),
    torre: torre.padStart(2, '0'),
    nivel: nivel.padStart(2, '0'),
    pos: pos.padStart(2, '0'),
    lado: isEsquerda ? 'ESQUERDA' : 'DIREITA',
    rawEndereco: rawEnd,
    rawDescrend: text,
  };
}

export interface EnderecoChipsProps {
  endereco?: string | null;
  descrend?: string | null;
  lado?: string | null;
  tipo?: 'PICKING' | 'PULMAO';
  tamanho?: 'normal' | 'destaque' | 'compacto';
  mostrarMascara?: boolean;
  className?: string;
}

export const EnderecoChips: React.FC<EnderecoChipsProps> = ({
  endereco,
  descrend,
  lado,
  tipo = 'PICKING',
  tamanho = 'normal',
  mostrarMascara = false,
  className = '',
}) => {
  const detalhe = parseEndereco(endereco, descrend, lado);

  if (!endereco && !descrend) {
    return (
      <span className="separacao-chip-sem-endereco" title="Sem endereço físico cadastrado no Sankhya">
        ⚠️ Sem endereço
      </span>
    );
  }

  // Fallback caso não seja possível decompor nas 4 coordenadas
  if (!detalhe) {
    return (
      <div className={`separacao-endereco-fallback ${tamanho}`}>
        <span className="separacao-chip-coord fallback">
          📍 {descrend || endereco}
        </span>
        {mostrarMascara && endereco && descrend && (
          <span className="separacao-chip-mascara">({endereco})</span>
        )}
      </div>
    );
  }

  const isEsquerda = detalhe.lado === 'ESQUERDA';

  return (
    <div
      className={`separacao-endereco-chips-container ${tipo.toLowerCase()} ${tamanho} ${className}`}
      title={
        tipo === 'PULMAO'
          ? `Endereço de Pulmão (Reserva): ${detalhe.lado} - Rua ${detalhe.rua}, Torre ${detalhe.torre}, Nível ${detalhe.nivel}, Pos ${detalhe.pos}${detalhe.rawEndereco ? ` (${detalhe.rawEndereco})` : ''}`
          : `Endereço de Picking: ${detalhe.lado} - Rua ${detalhe.rua}, Torre ${detalhe.torre}, Nível ${detalhe.nivel}, Pos ${detalhe.pos}${detalhe.rawEndereco ? ` (${detalhe.rawEndereco})` : ''}`
      }
    >
      {/* Badge de Lado (Ímpar = Esquerda ⬅️ / Par = Direita ➡️) */}
      <span
        className={`separacao-chip-lado ${isEsquerda ? 'lado-esq' : 'lado-dir'}`}
        title={isEsquerda ? 'Posição Ímpar: Corredor do Lado Esquerdo' : 'Posição Par: Corredor do Lado Direito'}
      >
        {isEsquerda ? (
          <>
            <span className="chip-arrow">⬅️</span> ESQUERDA
          </>
        ) : (
          <>
            DIREITA <span className="chip-arrow">➡️</span>
          </>
        )}
      </span>

      {/* Pílulas Coordenadas */}
      <span className="separacao-chip-coord" title={`Rua ${detalhe.rua}`}>
        <span className="chip-coord-rotulo">Rua</span>
        <span className="chip-coord-valor">{detalhe.rua}</span>
      </span>

      <span className="separacao-chip-coord" title={`Torre ${detalhe.torre}`}>
        <span className="chip-coord-rotulo">Torre</span>
        <span className="chip-coord-valor">{detalhe.torre}</span>
      </span>

      <span className="separacao-chip-coord" title={`Nível ${detalhe.nivel}`}>
        <span className="chip-coord-rotulo">Nível</span>
        <span className="chip-coord-valor">{detalhe.nivel}</span>
      </span>

      <span className="separacao-chip-coord destacada" title={`Posição ${detalhe.pos}`}>
        <span className="chip-coord-rotulo">Pos</span>
        <span className="chip-coord-valor">{detalhe.pos}</span>
      </span>

      {/* Código Hierárquico / Máscara (somente se explicitamente solicitado) */}
      {mostrarMascara && detalhe.rawEndereco && (
        <span className="separacao-chip-mascara">({detalhe.rawEndereco})</span>
      )}
    </div>
  );
};
