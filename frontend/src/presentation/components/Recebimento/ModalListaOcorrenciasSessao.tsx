import React, { useState } from 'react';
import {
  OcorrenciaRecebimento,
  StatusOcorrenciaRecebimento,
} from '../../../domain/models/OcorrenciaRecebimento';
import { Botao } from '../Botao/Botao';

export interface ModalListaOcorrenciasSessaoProps {
  isOpen: boolean;
  onClose: () => void;
  ocorrencias: OcorrenciaRecebimento[];
  onRemoverOcorrencia?: (id: string) => Promise<void>;
  isSomenteLeitura?: boolean;
}

export const getStatusOcorrenciaInfo = (status: StatusOcorrenciaRecebimento) => {
  switch (status) {
    case 'PENDENTE':
      return { label: 'Pendente', bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '⏳' };
    case 'RESOLVIDO':
      return { label: 'Resolvido', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', icon: '✓' };
    case 'INTEGRADO_ERP':
      return { label: 'Integrado ERP', bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', icon: '📦' };
    case 'DEVOLVIDO':
      return { label: 'Devolvido', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', icon: '↩' };
    default:
      return { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: 'ℹ️' };
  }
};

export const ModalListaOcorrenciasSessao: React.FC<ModalListaOcorrenciasSessaoProps> = ({
  isOpen,
  onClose,
  ocorrencias,
  onRemoverOcorrencia,
  isSomenteLeitura = false,
}) => {
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExcluir = async (id: string) => {
    if (!onRemoverOcorrencia) return;
    if (!window.confirm('Deseja realmente remover esta ocorrência? A quantidade contabilizada será ajustada.')) {
      return;
    }
    setRemovendoId(id);
    try {
      await onRemoverOcorrencia(id);
    } finally {
      setRemovendoId(null);
    }
  };

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          zIndex: 1200,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '640px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div
            className="modal-header-row"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              margin: 0,
              background: '#ffffff',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                ⚠️ Ocorrências da Conferência
              </h3>
              <span style={{ fontSize: '0.80rem', color: '#64748b', fontWeight: 500 }}>
                Total de {ocorrencias.length} {ocorrencias.length > 1 ? 'ocorrências registradas' : 'ocorrência registrada'}
              </span>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              title="Fechar"
              style={{
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              ✕
            </button>
          </div>

          <div
            className="modal-body"
            style={{
              overflowY: 'auto',
              padding: '16px 20px',
              flex: 1,
              background: '#f8fafc',
            }}
          >
            {ocorrencias.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>✓</span>
                Nenhuma ocorrência registrada nesta conferência.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ocorrencias.map((oc, index) => {
                  const st = getStatusOcorrenciaInfo(oc.status);
                  const emojiTipo =
                    oc.tipo === 'AVARIA'
                      ? '💥'
                      : oc.tipo === 'VENCIDO'
                      ? '⛔'
                      : oc.tipo === 'VALIDADE_PROXIMA'
                      ? '⚠️'
                      : oc.tipo === 'PRODUTO_TROCADO' || oc.tipo === 'NAO_IDENTIFICADO'
                      ? '🔄'
                      : 'ℹ️';

                  return (
                    <div
                      key={oc.id || `oc-${index}`}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span
                              style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>{emojiTipo}</span>
                              <span>{oc.tipo}</span>
                            </span>

                            <span
                              style={{
                                background: st.bg,
                                color: st.color,
                                border: `1px solid ${st.border}`,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>{st.icon}</span>
                              <span>Status: {st.label}</span>
                            </span>

                            {(oc.numnota || oc.nunota) && (
                              <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                                NF {oc.numnota || oc.nunota}
                                {oc.nunota && (
                                  <span style={{ fontSize: '0.66rem', color: '#94a3b8', marginLeft: '3px' }}>
                                    (#{oc.nunota})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                            {oc.descrprod || `Produto Cód: ${oc.codprod || 'Sem código'}`}
                          </div>
                          {oc.codprod && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Código: {oc.codprod} {oc.sequencia ? `• Item Seq: ${oc.sequencia}` : ''}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 800,
                              color: '#b91c1c',
                              background: '#fff1f2',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecdd3',
                              display: 'inline-block',
                            }}
                          >
                            {oc.quantidade} un
                          </span>
                        </div>
                      </div>

                      {/* Detalhes do Lote / Validade */}
                      {(oc.lote || oc.validade || oc.fabricacao) && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '6px 10px',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: '#334155',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          {oc.lote && (
                            <span>
                              Lote: <strong>{oc.lote}</strong>
                            </span>
                          )}
                          {oc.validade && (
                            <span>
                              Validade: <strong>{oc.validade}</strong>
                            </span>
                          )}
                          {oc.fabricacao && (
                            <span>
                              Fabricação: <strong>{oc.fabricacao}</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Motivo e Observação */}
                      {oc.motivo && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '0.76rem',
                            color: '#475569',
                            background: '#fffbeb',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #fef3c7',
                          }}
                        >
                          <strong>Motivo / Observação:</strong> {oc.motivo}
                        </div>
                      )}

                      {/* Fotos */}
                      {oc.fotos && oc.fotos.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {oc.fotos.map((foto, fIdx) => (
                            <img
                              key={fIdx}
                              src={foto}
                              alt={`Foto ocorrência ${fIdx + 1}`}
                              onClick={() => setFotoAmpliada(foto)}
                              style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Rodapé com botão excluir */}
                      {!isSomenteLeitura && onRemoverOcorrencia && (
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleExcluir(oc.id)}
                            disabled={removendoId === oc.id}
                            style={{
                              background: '#fff1f2',
                              color: '#b91c1c',
                              border: '1px solid #fecdd3',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>🗑️</span>
                            <span>{removendoId === oc.id ? 'Removendo...' : 'Excluir Ocorrência'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#ffffff',
            }}
          >
            <Botao variant="secondary" size="md" onClick={onClose}>
              Fechar
            </Botao>
          </div>
        </div>
      </div>

      {/* Visualizador de Foto Ampliada Desacoplado */}
      {fotoAmpliada && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setFotoAmpliada(null);
          }}
          style={{
            zIndex: 1300,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            inset: 0,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={fotoAmpliada}
              alt="Foto ampliada da ocorrência"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFotoAmpliada(null);
              }}
              title="Fechar foto ampliada"
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                background: '#ffffff',
                color: '#1e293b',
                border: '2px solid #e2e8f0',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '1.2rem',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1310,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};
