import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ConferenciaEntradaResumo,
  BackupDisponivelResumo,
} from '../../../domain/models/ConferenciaEntrada.js';

interface ModalRestaurarBackupProps {
  isOpen: boolean;
  onClose: () => void;
  conferencia: ConferenciaEntradaResumo | null;
  onConfirmar: (conferenciaId: string, motivo?: string, backupConferenciaId?: string) => Promise<void>;
  loading?: boolean;
}

export const ModalRestaurarBackup: React.FC<ModalRestaurarBackupProps> = ({
  isOpen,
  onClose,
  conferencia,
  onConfirmar,
  loading = false,
}) => {
  const [backupIndexSelecionado, setBackupIndexSelecionado] = useState<number>(0);
  const [motivo, setMotivo] = useState<string>('');

  if (!isOpen || !conferencia) return null;

  const backups: BackupDisponivelResumo[] = conferencia.backupsDisponiveis || [];
  const backupAtual = backups[backupIndexSelecionado] || backups[0];

  // Verifica se a conferência destino já possui bipagens ativas
  const totalBipadoAtivo =
    (conferencia.totalBipadoN1 || 0) +
    (conferencia.totalBipadoN2 || 0) +
    (conferencia.totalBipadoN3 || 0);
  const estaEmAndamento = totalBipadoAtivo > 0;

  const handleConfirmar = async () => {
    if (estaEmAndamento || !backupAtual) return;
    await onConfirmar(conferencia.id, motivo, backupAtual.conferenciaIdOrigem);
  };

  const totalQuantidadeItens =
    backupAtual?.itens?.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0) || 0;

  const modalContent = (
    <div
      className="gestao-modal-backdrop"
      onClick={onClose}
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
    >
      <div
        className="gestao-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '90vh',
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--border, #cbd5e1)',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--slate-50, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.6rem' }}>💾</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--slate-800, #1e293b)' }}>
                Restaurar Backup de Contagem
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--slate-500, #64748b)' }}>
                Nota(s) Fiscal(is): <strong>NF {conferencia.numerosNotas}</strong> &bull; Fornecedor: <strong>{conferencia.fornecedor}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--slate-400, #94a3b8)',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bloqueio de Segurança caso haja contagem em andamento */}
          {estaEmAndamento && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: '#991b1b',
              }}
            >
              <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>⚠️</span>
              <div style={{ fontSize: '0.85rem' }}>
                <strong style={{ display: 'block', marginBottom: '2px' }}>
                  Conferência em andamento ({totalBipadoAtivo} itens bipados)
                </strong>
                Para restaurar um backup anterior sem misturar bipagens, é obrigatório reiniciar a conferência atual primeiro.
              </div>
            </div>
          )}

          {/* Seletor de Backups (caso haja mais de 1) */}
          {backups.length > 1 && (
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700, #334155)', display: 'block', marginBottom: '8px' }}>
                Selecione o backup que deseja restaurar ({backups.length} disponíveis):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {backups.map((bkp, idx) => {
                  const isSelected = idx === backupIndexSelecionado;
                  const isOrigemOutra = bkp.conferenciaIdOrigem !== conferencia.id;
                  return (
                    <div
                      key={bkp.conferenciaIdOrigem || idx}
                      onClick={() => setBackupIndexSelecionado(idx)}
                      style={{
                        border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border, #cbd5e1)',
                        background: isSelected ? '#eff6ff' : 'var(--card-bg, #ffffff)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#334155' }}>
                          {isOrigemOutra ? `Backup Nota Antiga (#${bkp.numnotaOrigem || bkp.nunotaOrigem})` : 'Backup Desta Nota'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isSelected ? '#bfdbfe' : '#e2e8f0',
                            color: isSelected ? '#1e40af' : '#475569',
                            fontWeight: 600,
                          }}
                        >
                          {bkp.totalBipagensAnuladas} bipagens
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Reiniciado em {new Date(bkp.reiniciadoEm).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(bkp.reiniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {bkp.motivo && (
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                          "{bkp.motivo}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dados e Resumo do Backup Selecionado */}
          {backupAtual && (
            <div
              style={{
                background: 'var(--slate-50, #f8fafc)',
                border: '1px solid var(--slate-200, #e2e8f0)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.85rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Origem do Backup:</span>
                <strong>
                  {backupAtual.conferenciaIdOrigem !== conferencia.id
                    ? `Nota anterior #${backupAtual.numnotaOrigem || backupAtual.nunotaOrigem}`
                    : `Sessão atual da NF #${conferencia.numerosNotas}`}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Reiniciado Por:</span>
                <strong>{backupAtual.reiniciadoPor || 'Sistema'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Status a Restabelecer:</span>
                <strong>{backupAtual.statusAnterior} (N{backupAtual.nivelAnterior})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Data do Reinício:</span>
                <strong>
                  {new Date(backupAtual.reiniciadoEm).toLocaleDateString('pt-BR')}{' '}
                  {new Date(backupAtual.reiniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </div>
            </div>
          )}

          {/* Tabela de Prévia dos Itens do Backup */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700, #334155)' }}>
                📋 Prévia dos Itens Conferidos no Backup ({backupAtual?.itens?.length || 0} produtos distintos / {totalQuantidadeItens} unidades):
              </span>
            </div>

            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid var(--slate-200, #e2e8f0)',
                borderRadius: '8px',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-100, #f1f5f9)', textAlign: 'left', borderBottom: '1px solid var(--slate-200, #e2e8f0)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '8px 10px', width: '70px' }}>Cód.</th>
                    <th style={{ padding: '8px 10px' }}>Produto</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Qtd. Conf.</th>
                    <th style={{ padding: '8px 10px', width: '130px' }}>Lote</th>
                    <th style={{ padding: '8px 10px', width: '100px' }}>Validade</th>
                    <th style={{ padding: '8px 10px', width: '100px' }}>Fabricação</th>
                  </tr>
                </thead>
                <tbody>
                  {!backupAtual?.itens || backupAtual.itens.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                        Nenhum item com contagem encontrado no registro deste backup.
                      </td>
                    </tr>
                  ) : (
                    backupAtual.itens.map((it, idx) => (
                      <tr
                        key={`${it.codprod}-${it.lote || ''}-${idx}`}
                        style={{
                          borderBottom: '1px solid var(--slate-100, #f1f5f9)',
                          background: idx % 2 === 0 ? '#ffffff' : 'var(--slate-50, #f8fafc)',
                        }}
                      >
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>{it.codprod}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{it.descrprod || `Produto ${it.codprod}`}</div>
                          {it.referencia && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ref: {it.referencia}</div>
                          )}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#047857' }}>
                          {it.quantidade}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          {it.lote ? (
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                              {it.lote}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem lote</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 10px', color: it.validade ? '#1e293b' : '#94a3b8' }}>
                          {it.validade || '-'}
                        </td>
                        <td style={{ padding: '6px 10px', color: it.fabricacao ? '#1e293b' : '#94a3b8' }}>
                          {it.fabricacao || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--slate-50, #f8fafc)',
          }}
        >
          <button
            type="button"
            className="gestao-modal-btn-cancelar"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="gestao-modal-btn-confirmar"
            style={{
              background: estaEmAndamento ? '#94a3b8' : '#10b981',
              borderColor: estaEmAndamento ? '#94a3b8' : '#059669',
              cursor: estaEmAndamento || loading ? 'not-allowed' : 'pointer',
            }}
            onClick={handleConfirmar}
            disabled={loading || estaEmAndamento || !backupAtual}
          >
            {loading ? 'Restaurando...' : 'Restaurar Esta Contagem'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

