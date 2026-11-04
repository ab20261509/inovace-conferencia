import React, { useState, useEffect } from 'react';
import { ItemDivergenciaResumo, ConferenciaDivergenciaGrupo } from '../../../domain/models/ConferenciaEntrada.js';

interface ModalRevisarDesempateProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDivergenciaResumo | null;
  grupo: ConferenciaDivergenciaGrupo | null;
  decisaoAtual?: 'N1' | 'N2' | 'N3' | 'ERP';
  onConfirmarDecisao: (nivel: 'N1' | 'N2' | 'N3') => void;
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

export const ModalRevisarDesempate: React.FC<ModalRevisarDesempateProps> = ({
  isOpen,
  onClose,
  item,
  grupo,
  decisaoAtual,
  onConfirmarDecisao,
}) => {
  const [nivelEscolhido, setNivelEscolhido] = useState<'N1' | 'N2' | 'N3'>('N3');

  useEffect(() => {
    if (decisaoAtual && (decisaoAtual === 'N1' || decisaoAtual === 'N2' || decisaoAtual === 'N3')) {
      setNivelEscolhido(decisaoAtual);
    } else if (item && (item.qtdN3 > 0 || (item.loteN3 && item.loteN3.trim() !== ''))) {
      setNivelEscolhido('N3');
    } else {
      setNivelEscolhido('N2');
    }
  }, [decisaoAtual, item]);

  if (!isOpen || !item) return null;

  const lotesN1: any[] = (item as any).lotesConferidosN1 || [];
  const lotesN2: any[] = (item as any).lotesConferidosN2 || [];
  const lotesN3: any[] = (item as any).lotesConferidosN3 || [];
  const temN1Item = Boolean(item.qtdN1 > 0 || ((item as any).loteN1 && (item as any).loteN1.trim() !== ''));
  const temN3Item = Boolean(item.qtdN3 > 0 || ((item as any).loteN3 && (item as any).loteN3.trim() !== ''));

  const handleConfirmar = () => {
    onConfirmarDecisao(nivelEscolhido);
    onClose();
  };

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
          maxWidth: '960px',
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
            background: 'linear-gradient(to right, #f8fafc, #eff6ff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>⚖️</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Revisão de Desempate de Conferência
              </h3>
              <span
                style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
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

        {/* Faixa de Referência da Nota Fiscal (ERP) */}
        <div
          style={{
            padding: '10px 20px',
            background: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700 }}>
            <span>📦</span>
            <span>Referência Faturada no ERP (Nota Fiscal):</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#334155' }}>
            <span>
              <strong>Qtd:</strong> {item.qtdEsperada} {item.codvol || 'UN'}
            </span>
            <span>
              <strong>Lote da Nota:</strong>{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                {item.controleOriginal || 'Sem Lote'}
              </span>
            </span>
            <span>
              <strong>Validade:</strong>{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {formatarDataSimples(item.validadeOriginal) || '—'}
              </span>
            </span>
            {item.fabricacaoOriginal && (
              <span>
                <strong>Fabricação:</strong>{' '}
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatarDataSimples(item.fabricacaoOriginal)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Mensagem Explicativa de Arbitragem */}
        <div
          style={{
            padding: '10px 20px',
            background: '#fffbeb',
            borderBottom: '1px solid #fef3c7',
            fontSize: '0.80rem',
            color: '#92400e',
          }}
        >
          💡 <strong>Regra de Arbitragem:</strong> Por padrão, a reconferência <strong>N3 é adotada como a verdade física definitiva</strong>. Caso deseje acatar a contagem anterior de N2 ou N1, selecione o card correspondente e confirme.
        </div>

        {/* Corpo com os 3 Cards Comparativos Físicos */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card 1: Conferência N1 */}
          <div
            style={{
              border:
                nivelEscolhido === 'N1'
                  ? '2px solid #0284c7'
                  : temN1Item
                  ? '1px solid #e2e8f0'
                  : '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
              background: nivelEscolhido === 'N1' ? '#f0f9ff' : temN1Item ? '#ffffff' : '#f8fafc',
              cursor: temN1Item ? 'pointer' : 'not-allowed',
              opacity: temN1Item ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              boxShadow: nivelEscolhido === 'N1' ? '0 4px 6px -1px rgba(2, 132, 199, 0.15)' : 'none',
            }}
            onClick={() => temN1Item && setNivelEscolhido('N1')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: temN1Item ? '#0369a1' : '#94a3b8', textTransform: 'uppercase' }}>
                    👤 Conferência N1
                  </span>
                  {!temN1Item && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#e2e8f0', color: '#64748b', padding: '1px 5px', borderRadius: '4px' }}>
                      Sem contagem
                    </span>
                  )}
                </div>
                <input
                  type="radio"
                  name="escolhaNivel"
                  checked={nivelEscolhido === 'N1'}
                  onChange={() => temN1Item && setNivelEscolhido('N1')}
                  disabled={!temN1Item}
                  style={{ cursor: temN1Item ? 'pointer' : 'not-allowed' }}
                />
              </div>

              {temN1Item ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Quantidade Contada N1</span>
                    <strong style={{ fontSize: '1.1rem', color: '#0369a1' }}>
                      {item.qtdN1} {item.codvol || 'UN'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Lote(s) Bipado(s)</span>
                    {lotesN1.length > 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontSize: '0.74rem' }}>
                          🏷️ {lotesN1.length} Frações de Lote:
                        </span>
                        {lotesN1.map((l, idx) => (
                          <div key={idx} style={{ fontSize: '0.74rem', fontFamily: 'JetBrains Mono, monospace', background: '#ffffff', padding: '2px 4px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                            <strong>{l.lote}</strong>: {l.quantidade} {item.codvol || 'UN'} (Val: {formatarDataSimples(l.validade)})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#334155' }}>
                        {(item as any).loteN1 || item.lote || 'Sem Lote'}
                      </span>
                    )}
                  </div>

                  {lotesN1.length <= 1 && (
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Validade / Fabricação</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
                        {formatarDataSimples((item as any).validadeN1 || item.validade) || '—'}
                        {(item as any).fabricacaoN1 || item.fabricacao ? ` • Fab: ${formatarDataSimples((item as any).fabricacaoN1 || item.fabricacao)}` : ''}
                      </span>
                    </div>
                  )}

                  {item.conferenteN1 && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      Conferente: <strong>{item.conferenteN1}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  Não houve contagem registrada no Nível 1.
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!temN1Item}
              onClick={(e) => {
                e.stopPropagation();
                if (temN1Item) setNivelEscolhido('N1');
              }}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: nivelEscolhido === 'N1' ? '#0284c7' : '#cbd5e1',
                background: nivelEscolhido === 'N1' ? '#0284c7' : '#f8fafc',
                color: nivelEscolhido === 'N1' ? '#ffffff' : temN1Item ? '#334155' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: temN1Item ? 'pointer' : 'not-allowed',
              }}
            >
              {nivelEscolhido === 'N1' ? '✓ Selecionado: Adotar N1' : temN1Item ? 'Adotar Conferência N1' : 'Sem dados de N1'}
            </button>
          </div>

          {/* Card 2: Conferência N2 */}
          <div
            style={{
              border: nivelEscolhido === 'N2' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              background: nivelEscolhido === 'N2' ? '#f0fdf4' : '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              boxShadow: nivelEscolhido === 'N2' ? '0 4px 6px -1px rgba(22, 163, 74, 0.15)' : 'none',
            }}
            onClick={() => setNivelEscolhido('N2')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                  👤 Conferência N2
                </span>
                <input
                  type="radio"
                  name="escolhaNivel"
                  checked={nivelEscolhido === 'N2'}
                  onChange={() => setNivelEscolhido('N2')}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Quantidade Contada N2</span>
                  <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>
                    {item.qtdN2} {item.codvol || 'UN'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Lote(s) Bipado(s)</span>
                  {lotesN2.length > 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.74rem' }}>
                        🏷️ {lotesN2.length} Frações de Lote:
                      </span>
                      {lotesN2.map((l, idx) => (
                        <div key={idx} style={{ fontSize: '0.74rem', fontFamily: 'JetBrains Mono, monospace', background: '#ffffff', padding: '2px 4px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                          <strong>{l.lote}</strong>: {l.quantidade} {item.codvol || 'UN'} (Val: {formatarDataSimples(l.validade)})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#334155' }}>
                      {(item as any).loteN2 || item.lote || 'Sem Lote'}
                    </span>
                  )}
                </div>

                {lotesN2.length <= 1 && (
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Validade / Fabricação</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
                      {formatarDataSimples((item as any).validadeN2 || item.validade) || '—'}
                      {(item as any).fabricacaoN2 || item.fabricacao ? ` • Fab: ${formatarDataSimples((item as any).fabricacaoN2 || item.fabricacao)}` : ''}
                    </span>
                  </div>
                )}

                {item.conferenteN2 && (
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    Conferente: <strong>{item.conferenteN2}</strong>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNivelEscolhido('N2');
              }}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: nivelEscolhido === 'N2' ? '#16a34a' : '#cbd5e1',
                background: nivelEscolhido === 'N2' ? '#16a34a' : '#f8fafc',
                color: nivelEscolhido === 'N2' ? '#ffffff' : '#334155',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
              }}
            >
              {nivelEscolhido === 'N2' ? '✓ Selecionado: Adotar N2' : 'Adotar Conferência N2'}
            </button>
          </div>

          {/* Card 3: Nível 3 (N3 - Reconferência Desempate) */}
          <div
            style={{
              border: nivelEscolhido === 'N3' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              background: nivelEscolhido === 'N3' ? '#eef2ff' : '#ffffff',
              cursor: temN3Item ? 'pointer' : 'not-allowed',
              opacity: temN3Item ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              boxShadow: nivelEscolhido === 'N3' ? '0 4px 6px -1px rgba(79, 70, 229, 0.2)' : 'none',
              position: 'relative',
            }}
            onClick={() => temN3Item && setNivelEscolhido('N3')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>
                    🔍 Reconferência N3
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#c7d2fe', color: '#3730a3', padding: '1px 5px', borderRadius: '4px' }}>
                    DEFINITIVO
                  </span>
                </div>
                <input
                  type="radio"
                  name="escolhaNivel"
                  checked={nivelEscolhido === 'N3'}
                  onChange={() => temN3Item && setNivelEscolhido('N3')}
                  disabled={!temN3Item}
                  style={{ cursor: temN3Item ? 'pointer' : 'not-allowed' }}
                />
              </div>

              {temN3Item ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Quantidade Contada N3</span>
                    <strong style={{ fontSize: '1.1rem', color: '#4338ca' }}>
                      {item.qtdN3} {item.codvol || 'UN'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Lote(s) Apurado(s) N3</span>
                    {lotesN3.length > 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#3730a3', background: '#c7d2fe', padding: '2px 6px', borderRadius: '4px', fontSize: '0.74rem' }}>
                          🏷️ {lotesN3.length} Lotes Conferidos no N3:
                        </span>
                        {lotesN3.map((l, idx) => (
                          <div key={idx} style={{ fontSize: '0.74rem', fontFamily: 'JetBrains Mono, monospace', background: '#ffffff', padding: '3px 6px', border: '1px solid #c7d2fe', borderRadius: '4px' }}>
                            <strong>{l.lote}</strong>: {l.quantidade} {item.codvol || 'UN'} • Val: {formatarDataSimples(l.validade)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#334155' }}>
                        {(item as any).loteN3 || 'Sem Lote'}
                      </span>
                    )}
                  </div>

                  {lotesN3.length <= 1 && (
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Validade / Fabricação N3</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
                        {formatarDataSimples((item as any).validadeN3) || '—'}
                        {(item as any).fabricacaoN3 ? ` • Fab: ${formatarDataSimples((item as any).fabricacaoN3)}` : ''}
                      </span>
                    </div>
                  )}

                  {item.conferenteN3 && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      Conferente N3: <strong>{item.conferenteN3}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                  Este item não foi enviado para reconferência N3.
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!temN3Item}
              onClick={(e) => {
                e.stopPropagation();
                if (temN3Item) setNivelEscolhido('N3');
              }}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: nivelEscolhido === 'N3' ? '#4f46e5' : '#cbd5e1',
                background: nivelEscolhido === 'N3' ? '#4f46e5' : '#f8fafc',
                color: nivelEscolhido === 'N3' ? '#ffffff' : '#334155',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: temN3Item ? 'pointer' : 'not-allowed',
              }}
            >
              {nivelEscolhido === 'N3' ? '✓ Selecionado: Adotar N3 (Definitivo)' : 'Adotar Reconferência N3'}
            </button>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Confirmar Decisão ({nivelEscolhido})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
