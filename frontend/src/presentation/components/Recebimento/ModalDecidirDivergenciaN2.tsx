import React from 'react';
import { ItemDivergenciaResumo, ConferenciaDivergenciaGrupo } from '../../../domain/models/ConferenciaEntrada.js';

interface ModalDecidirDivergenciaN2Props {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDivergenciaResumo | null;
  grupo: ConferenciaDivergenciaGrupo | null;
  onAdotarN2: () => void;
  onEnviarN3: () => void;
}

function formatarDataSimples(dataStr?: string | null): string {
  if (!dataStr) return '';
  const s = dataStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [ano, mes, dia] = s.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{8}/.test(s)) {
    const dia = s.substring(0, 2);
    const mes = s.substring(2, 4);
    const ano = s.substring(4, 8);
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    return s.substring(0, 10);
  }
  return s.split(' ')[0] || s;
}

export const ModalDecidirDivergenciaN2: React.FC<ModalDecidirDivergenciaN2Props> = ({
  isOpen,
  onClose,
  item,
  grupo,
  onAdotarN2,
  onEnviarN3,
}) => {
  if (!isOpen || !item) return null;

  const lotesN2: any[] = (item as any).lotesConferidosN2 || (item as any).lotesConferidos || [];
  const temMultiplosLotes = lotesN2.length > 1;

  const loteExibicao = (item as any).loteN2 || item.lote || 'Sem Lote';
  const validadeExibicao = formatarDataSimples((item as any).validadeN2 || item.validade);
  const fabricacaoExibicao = formatarDataSimples((item as any).fabricacaoN2 || item.fabricacao);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(to right, #f8fafc, #fef3c7)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>⚖️</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Decisão Gerencial de Divergência
              </h3>
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #fde68a',
                }}
              >
                NF #{grupo?.numnota || item.nunota}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              <strong>{item.descrprod}</strong> • Cód: {item.codprod}
              {item.referencia ? ` • Ref: ${item.referencia}` : ''} • Volume: {item.codvol || 'UN'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Faixa de Comparação: Nota Fiscal vs N2 */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.84rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📦</span> Dados Faturados na Nota Fiscal (ERP):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', color: '#334155' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Qtd Faturada</span>
                <strong>{item.qtdEsperada} {item.codvol || 'UN'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Lote da Nota</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                  {item.controleOriginal || 'Sem Lote'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Validade</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatarDataSimples(item.validadeOriginal) || '—'}
                </span>
              </div>
              {item.fabricacaoOriginal && (
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Fabricação</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatarDataSimples(item.fabricacaoOriginal)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.84rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>👤</span> Contagem Apurada na Conferência (N2):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', color: '#14532d' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#15803d', display: 'block' }}>Qtd Contada N2</span>
                <strong>{item.qtdN2} {item.codvol || 'UN'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#15803d', display: 'block' }}>Lote Bipado N2</span>
                {temMultiplosLotes ? (
                  <span style={{ fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                    🏷️ {lotesN2.length} Frações de Lote
                  </span>
                ) : (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {loteExibicao}
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#15803d', display: 'block' }}>Validade N2</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {temMultiplosLotes ? 'Múltiplas' : (validadeExibicao || '—')}
                </span>
              </div>
              {fabricacaoExibicao && (
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#15803d', display: 'block' }}>Fabricação N2</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {temMultiplosLotes ? 'Múltiplas' : fabricacaoExibicao}
                  </span>
                </div>
              )}
            </div>

            {item.conferenteN2 && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#166534' }}>
                Conferente: <strong>{item.conferenteN2}</strong>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 14px',
              background: '#fffbeb',
              borderRadius: '8px',
              border: '1px solid #fef3c7',
              fontSize: '0.80rem',
              color: '#92400e',
            }}
          >
            💡 <strong>Como deseja proceder com este produto?</strong>
            <br />
            Você pode <strong>Adotar a Conferência N2</strong> para acatar os dados físicos bipados ou <strong>Enviar para Reconferência N3</strong> para realizar uma contagem cega de desempate no coletor.
          </div>
        </div>

        {/* Rodapé com as duas opções de ação */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Voltar
          </button>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                onEnviarN3();
                onClose();
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #93c5fd',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Solicitar que outro conferente faça a contagem cega N3 no coletor"
            >
              <span>🔍 Enviar para Reconferência N3</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onAdotarN2();
                onClose();
              }}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
              }}
              title="Acatar a contagem física N2 e resolver a divergência fiscal"
            >
              <span>✓ Adotar Conferência N2</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
