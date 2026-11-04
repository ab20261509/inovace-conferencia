import React from 'react';

export function getStatusBadgeClass(status: string): string {
  if (status === 'Em Aberto') return 'em-aberto';
  if (status === 'Divergente') return 'divergente';
  // Reconferência N3 e Aguardando N3 -> Índigo/Azul
  if (status.includes('N3') || status === 'Aguardando N3' || status.includes('Reconferência')) return 'n3-desempate';
  // Recontagem N2 e Aguardando Recontagem -> Âmbar/Amarelo
  if (status.includes('Aguardando Recontagem') || status.includes('Aguardando N') || status.includes('N2')) return 'reconferencia';
  if (status.includes('Recontagem')) return 'reconferencia';
  if (status === 'Conferido') return 'conferido';
  if (status === 'Aguardando Aprovação') return 'aguardando';
  if (status === 'Enviado ao Sankhya') return 'enviado';
  if (status.includes('em Andamento') || status === 'Iniciado') return 'andamento';
  if (status === 'Cancelado') return 'cancelado';
  return 'andamento';
}

export function ehStatusEmAndamento(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s.includes('andamento') ||
    s === 'iniciado' ||
    s.includes('em reconferência') ||
    s.includes('em reconferencia')
  );
}

export function verificarItemEmN3(
  sessaoOuGrupo: {
    nivelAtual?: number;
    status?: string;
    itensRecontagem?: Array<{ nunota: number; sequencia: number; codprod: number }>;
  },
  item: {
    nunota?: number;
    sequencia?: number;
    codprod?: number;
    diferenca?: number;
    qtdN2?: number;
    qtdEsperada?: number;
  }
): boolean {
  const statusStr = (sessaoOuGrupo.status || '').trim();

  // 1. A conferência DEVE estar ativamente com reconferência N3 solicitada pelo gestor ou em andamento
  const statusAtivoN3 = [
    'Aguardando N3',
    'N3 em Andamento',
    'Em Reconferência',
    'Aguardando Recontagem N3',
    'Recontagem N3 em Andamento',
  ].includes(statusStr) || (statusStr.toLowerCase().includes('reconferência') && statusStr.includes('3'));

  if (!statusAtivoN3) {
    return false;
  }

  // 2. O item DEVE constar expressamente na lista de itensRecontagem enviada pelo gestor
  const itensRec = sessaoOuGrupo.itensRecontagem;
  if (!itensRec || itensRec.length === 0) {
    return false;
  }

  return itensRec.some(
    (r) =>
      Number(r.codprod) === Number(item.codprod) &&
      Number(r.sequencia) === Number(item.sequencia) &&
      (!r.nunota || !item.nunota || Number(r.nunota) === Number(item.nunota))
  );
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
      texto: '📅 Prev: Não informada',
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

export function obterOcorrenciasDoItem(
  ocorrencias?: any[],
  nunota?: number,
  codprod?: number,
  sequencia?: number
): any[] {
  if (!ocorrencias || !ocorrencias.length || !codprod) return [];
  return ocorrencias.filter((oc) => {
    if (oc.status === 'CANCELADO') return false;
    if (Number(oc.codprod) !== Number(codprod)) return false;
    if (nunota && oc.nunota && Number(oc.nunota) !== Number(nunota)) return false;
    if (sequencia && oc.sequencia && Number(oc.sequencia) !== Number(sequencia)) return false;
    return true;
  });
}

export function renderBadgesOcorrenciasItem(ocorrenciasItem: any[]) {
  if (!ocorrenciasItem || ocorrenciasItem.length === 0) return null;

  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px', alignItems: 'center' }}>
      {ocorrenciasItem.map((oc) => {
        const isSobra = oc.tipo === 'SOBRA';
        const isAvaria = oc.tipo === 'AVARIA';
        const isVencido = oc.tipo === 'VENCIDO';
        const isFalta = oc.tipo === 'FALTA';

        const bg = isSobra
          ? '#f0fdf4'
          : isAvaria
          ? '#fff1f2'
          : isVencido
          ? '#fef2f2'
          : isFalta
          ? '#fff7ed'
          : '#f8fafc';

        const border = isSobra
          ? '#86efac'
          : isAvaria
          ? '#fda4af'
          : isVencido
          ? '#fca5a5'
          : isFalta
          ? '#fed7aa'
          : '#e2e8f0';

        const color = isSobra
          ? '#15803d'
          : isAvaria
          ? '#be123c'
          : isVencido
          ? '#b91c1c'
          : isFalta
          ? '#c2410c'
          : '#334155';

        const emoji = isSobra ? '➕' : isAvaria ? '💥' : isVencido ? '⛔' : isFalta ? '➖' : '⚠️';
        const label = isSobra
          ? 'Sobra Física'
          : isAvaria
          ? 'Avaria'
          : isVencido
          ? 'Vencido'
          : isFalta
          ? 'Falta'
          : oc.tipo;

        const infoLocal = oc.codlocalDestino ? ` (Local ${oc.codlocalDestino})` : '';

        return (
          <span
            key={`tag-oc-${oc.id}`}
            title={`${label}: ${oc.quantidade} UN${infoLocal} • Motivo: ${oc.motivo || 'Sem apontamento'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '6px',
              background: bg,
              border: `1px solid ${border}`,
              color: color,
              lineHeight: '1.2',
            }}
          >
            <span>{emoji}</span>
            <span>
              {label}: {oc.quantidade} UN{infoLocal}
            </span>
          </span>
        );
      })}
    </div>
  );
}

