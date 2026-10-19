import React from 'react';

export function getStatusBadgeClass(status: string): string {
  if (status === 'Em Aberto') return 'em-aberto';
  if (status === 'Divergente') return 'divergente';
  if (status.includes('Aguardando N') || status.includes('Reconferência')) return 'reconferencia';
  if (status === 'Conferido') return 'conferido';
  if (status === 'Aguardando Aprovação') return 'aguardando';
  if (status === 'Enviado ao Sankhya') return 'enviado';
  if (status.includes('em Andamento') || status === 'Iniciado') return 'andamento';
  if (status === 'Cancelado') return 'cancelado';
  return 'andamento';
}

export function formatarConferentes(item: {
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
}): React.ReactNode {
  const n1 = item.conferenteN1?.trim();
  const n2 = item.conferenteN2?.trim();
  const n3 = item.conferenteN3?.trim();

  if (!n1 && !n2 && !n3) {
    return <span style={{ color: 'var(--slate-400)' }}>—</span>;
  }

  if (n1 && n2 && n1 === n2 && !n3) {
    return (
      <span>
        {n1}{' '}
        <small style={{ color: 'var(--slate-500)', fontWeight: 500 }}>
          (N1/N2)
        </small>
      </span>
    );
  }

  const parts: string[] = [];
  if (n1) parts.push(`N1: ${n1}`);
  if (n2) parts.push(`N2: ${n2}`);
  if (n3) parts.push(`N3: ${n3}`);

  return <span>{parts.join(' • ')}</span>;
}

export function formatarConferentesTexto(item: {
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
}): string {
  const n1 = item.conferenteN1?.trim().toUpperCase();
  const n2 = item.conferenteN2?.trim().toUpperCase();
  const n3 = item.conferenteN3?.trim().toUpperCase();

  if (!n1 && !n2 && !n3) return '';

  if (n1 && n2 && n1 === n2 && !n3) {
    return `${n1} (N1/N2)`;
  }

  const parts: string[] = [];
  if (n1) parts.push(`N1: ${n1}`);
  if (n2) parts.push(`N2: ${n2}`);
  if (n3) parts.push(`N3: ${n3}`);

  return parts.join(' • ');
}

export const BadgeConferente: React.FC<{
  conferente?: string;
  conferenteN1?: string;
  conferenteN2?: string;
  conferenteN3?: string;
  prefixo?: string;
  className?: string;
}> = ({
  conferente,
  conferenteN1,
  conferenteN2,
  conferenteN3,
  prefixo = 'Conferente: ',
  className = 'badge-conferente-rec',
}) => {
  const conferentesPorNivel = formatarConferentesTexto({ conferenteN1, conferenteN2, conferenteN3 });
  const nomeExibicao = conferentesPorNivel || (conferente?.trim() ? conferente.trim().toUpperCase() : '');

  if (!nomeExibicao) return null;

  return (
    <span className={className} title={`Conferente responsável: ${nomeExibicao}`}>
      👤 {prefixo}{nomeExibicao}
    </span>
  );
};

export function formatarDataSimples(d?: string): string {
  if (!d) return '—';
  if (d.includes('T')) return d.split('T')[0];
  return d;
}

export interface InfoPrevisaoEntrega {
  temData: boolean;
  isAtrasado: boolean;
  diffDias: number | null;
  dataFormatada: string;
  texto: string;
  classe: 'badge-prev-atrasado' | 'badge-prev-hoje' | 'badge-prev-prazo' | 'badge-prev-sem-data';
}

export function calcularStatusPrevisaoEntrega(dataStr?: string | null): InfoPrevisaoEntrega {
  if (!dataStr || dataStr.trim() === '') {
    return {
      temData: false,
      isAtrasado: false,
      diffDias: null,
      dataFormatada: '—',
      texto: '🚫 Sem data entrega',
      classe: 'badge-prev-sem-data',
    };
  }

  const limpa = dataStr.trim().split('T')[0];
  let ano = 0;
  let mes = 0;
  let dia = 0;

  if (limpa.includes('-')) {
    const p = limpa.split('-').map(Number);
    ano = p[0];
    mes = p[1];
    dia = p[2];
  } else if (limpa.includes('/')) {
    const p = limpa.split('/').map(Number);
    dia = p[0];
    mes = p[1];
    ano = p[2];
  } else if (limpa.length === 8 && /^\d{8}$/.test(limpa)) {
    dia = Number(limpa.substring(0, 2));
    mes = Number(limpa.substring(2, 4));
    ano = Number(limpa.substring(4, 8));
  }

  if (!ano || !mes || !dia) {
    return {
      temData: false,
      isAtrasado: false,
      diffDias: null,
      dataFormatada: dataStr,
      texto: '🚫 Sem data entrega',
      classe: 'badge-prev-sem-data',
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataAlvo = new Date(ano, mes - 1, dia);
  dataAlvo.setHours(0, 0, 0, 0);

  const diffMs = dataAlvo.getTime() - hoje.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const dd = String(dia).padStart(2, '0');
  const mm = String(mes).padStart(2, '0');
  const dataFormatada = `${dd}/${mm}/${ano}`;

  if (diffDias < 0) {
    const diasAbs = Math.abs(diffDias);
    const textoAtraso = diasAbs === 1 ? 'Atrasado há 1 dia' : `Atrasado há ${diasAbs} dias`;
    return {
      temData: true,
      isAtrasado: true,
      diffDias,
      dataFormatada,
      texto: `⚠️ ${textoAtraso} (${dataFormatada})`,
      classe: 'badge-prev-atrasado',
    };
  }

  if (diffDias === 0) {
    return {
      temData: true,
      isAtrasado: false,
      diffDias: 0,
      dataFormatada,
      texto: `📅 Prev: ${dataFormatada} (Hoje)`,
      classe: 'badge-prev-hoje',
    };
  }

  const textoPrazo = diffDias === 1 ? 'amanhã' : `em ${diffDias} dias`;
  return {
    temData: true,
    isAtrasado: false,
    diffDias,
    dataFormatada,
    texto: `📅 Prev: ${dataFormatada} (${textoPrazo})`,
    classe: 'badge-prev-prazo',
  };
}

export const BadgePrevisaoEntrega: React.FC<{ data?: string | null }> = ({ data }) => {
  const info = calcularStatusPrevisaoEntrega(data);
  return (
    <span
      className={`badge-previsao-entrega ${info.classe}`}
      title={
        info.temData
          ? `Previsão de entrega: ${info.dataFormatada}`
          : 'Nota fiscal de compra sem previsão de entrega informada no ERP'
      }
    >
      {info.texto}
    </span>
  );
};

