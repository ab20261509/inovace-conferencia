import React from 'react';

export function getStatusBadgeClass(status: string): string {
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

export function formatarDataSimples(d?: string): string {
  if (!d) return '—';
  if (d.includes('T')) return d.split('T')[0];
  return d;
}
