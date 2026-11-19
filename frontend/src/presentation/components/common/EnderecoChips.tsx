import React from 'react';
import './EnderecoChips.css';

export interface EnderecoDetalhado {
  deposito: string;
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

  let deposito = '';
  let rua = '';
  let torre = '';
  let nivel = '';
  let pos = '';

  const partes = rawEnd.split(/[.-]/).map((p) => p.trim()).filter(Boolean);
  if (partes.length >= 5) {
    deposito = partes[0];
  } else {
    const matchDep = text.match(/D(?:EP(?:[OÓ]SITO)?)?\s*[:.-]?\s*(\d+)/i);
    if (matchDep) {
      deposito = matchDep[1];
    }
  }

  if (match) {
    rua = match[1];
    torre = match[2];
    nivel = match[3];
    pos = match[4];
  } else {
    // 2. Fallback: split por ponto ou hífen em rawEnd (ex: 01.01.02.02.17)
    if (partes.length >= 4) {
      if (partes.length >= 5) {
        // [Depósito/Galpão, Rua, Torre, Nível, Posição]
        deposito = partes[0];
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
  // Regra do cliente: "sempre que for impar é do lado esquerdo"
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
    deposito: (deposito || '01').padStart(2, '0'),
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
  mostrarLado?: boolean;
  tipo?: 'PICKING' | 'PULMAO';
  tamanho?: 'normal' | 'destaque' | 'compacto';
  mostrarMascara?: boolean;
  className?: string;
}

export const EnderecoChips: React.FC<EnderecoChipsProps> = ({
  endereco,
  descrend,
  lado,
  mostrarLado = false,
  tipo = 'PICKING',
  tamanho = 'normal',
  mostrarMascara = false,
  className = '',
}) => {
  const detalhe = parseEndereco(endereco, descrend, lado);

  if (!endereco && !descrend) {
    return (
      <span className="endereco-chip-sem-endereco" title="Sem endereço físico cadastrado no Sankhya">
        ⚠️ Sem Endereço Cadastrado
      </span>
    );
  }

  // Fallback caso não seja possível decompor nas 4 coordenadas
  if (!detalhe) {
    return (
      <div className={`endereco-chips-fallback ${tamanho}`}>
        <span className="endereco-chip-coord fallback">
          📍 {descrend || endereco}
        </span>
        {mostrarMascara && endereco && descrend && (
          <span className="endereco-chip-mascara">({endereco})</span>
        )}
      </div>
    );
  }

  const isEsquerda = detalhe.lado === 'ESQUERDA';

  return (
    <div
      className={`endereco-chips-container ${tipo.toLowerCase()} ${tamanho} ${className}`}
      title={
        tipo === 'PULMAO'
          ? `Pulmão: Rua ${detalhe.rua}, Torre ${detalhe.torre}, Nível ${detalhe.nivel}, Pos ${detalhe.pos}`
          : `Picking: Rua ${detalhe.rua}, Torre ${detalhe.torre}, Nível ${detalhe.nivel}, Pos ${detalhe.pos}`
      }
    >
      {/* Badge de Lado (opcional - utilizado na Separação se solicitado) */}
      {mostrarLado && (
        <span
          className={`endereco-chip-lado ${isEsquerda ? 'lado-esq' : 'lado-dir'}`}
          title={isEsquerda ? 'Posição Ímpar: Corredor do Lado Esquerdo' : 'Posição Par: Corredor do Lado Direito'}
        >
          {isEsquerda ? (
            <>
              <span className="chip-arrow">⬅️</span> ESQ
            </>
          ) : (
            <>
              DIR <span className="chip-arrow">➡️</span>
            </>
          )}
        </span>
      )}

      {/* Pílulas Coordenadas (Exatamente como o design solicitado) */}
      <span className="endereco-chip-coord" title={`Rua ${detalhe.rua}`}>
        <span className="endereco-chip-rotulo">RUA</span>
        <span className="endereco-chip-valor">{detalhe.rua}</span>
      </span>

      <span className="endereco-chip-coord" title={`Torre ${detalhe.torre}`}>
        <span className="endereco-chip-rotulo">TORRE</span>
        <span className="endereco-chip-valor">{detalhe.torre}</span>
      </span>

      <span className="endereco-chip-coord" title={`Nível ${detalhe.nivel}`}>
        <span className="endereco-chip-rotulo">NÍVEL</span>
        <span className="endereco-chip-valor">{detalhe.nivel}</span>
      </span>

      <span className="endereco-chip-coord destacada" title={`Posição ${detalhe.pos}`}>
        <span className="endereco-chip-rotulo">POS</span>
        <span className="endereco-chip-valor">{detalhe.pos}</span>
      </span>

      {/* Máscara numérica opcional */}
      {mostrarMascara && detalhe.rawEndereco && (
        <span className="endereco-chip-mascara">({detalhe.rawEndereco})</span>
      )}
    </div>
  );
};
