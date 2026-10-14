import React, { useState, useEffect } from 'react';
import { ItemDivergenciaResumo, ConferenciaDivergenciaGrupo } from '../../../domain/models/ConferenciaEntrada.js';

export interface FracaoLoteEditavel {
  id: string;
  lote: string;
  quantidade: number;
  validade: string;
  fabricacao: string;
  isFalta?: boolean;
}

interface ModalDesmembrarItemProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDivergenciaResumo | null;
  grupo: ConferenciaDivergenciaGrupo | null;
  onConfirmar: (dados: {
    nunota: number;
    sequencia: number;
    lotes: Array<{ lote: string; qtd: number; dtval?: string; dtfab?: string }>;
  }) => Promise<void>;
  loading?: boolean;
}

export const ModalDesmembrarItem: React.FC<ModalDesmembrarItemProps> = ({
  isOpen,
  onClose,
  item,
  grupo,
  onConfirmar,
  loading = false,
}) => {
  const [fracoes, setFracoes] = useState<FracaoLoteEditavel[]>([]);

  // Inicializa as frações quando o modal abre com base no item
  useEffect(() => {
    if (!isOpen || !item) {
      setFracoes([]);
      return;
    }

    const numnotaStr = String(grupo?.numnota || item.nunota || '');
    const lotesConf: any[] = (item as any).lotesConferidos || [];
    const novasFracoes: FracaoLoteEditavel[] = [];

    // 1. Frações conferidas pelo coletor
    if (lotesConf.length > 0) {
      lotesConf.forEach((l, idx) => {
        novasFracoes.push({
          id: `conf-${idx}-${Date.now()}`,
          lote: String(l.lote || '').trim(),
          quantidade: Number(l.quantidade) || 0,
          validade: l.validade || item.validade || '',
          fabricacao: l.fabricacao || item.fabricacao || '',
          isFalta: false,
        });
      });
    } else {
      const qtdFisica = Number(item.qtdN3 > 0 ? item.qtdN3 : item.qtdN2 > 0 ? item.qtdN2 : item.qtdN1) || 0;
      if (qtdFisica > 0) {
        novasFracoes.push({
          id: `conf-single-${Date.now()}`,
          lote: String(item.lote || item.controleOriginal || '').trim(),
          quantidade: qtdFisica,
          validade: item.validade || item.validadeOriginal || '',
          fabricacao: item.fabricacao || item.fabricacaoOriginal || '',
          isFalta: false,
        });
      }
    }

    // 2. Fração faltante (saldo negativo de falta) com o número da nota como lote
    if (item.diferenca < 0) {
      const qtdFalta = Math.abs(item.diferenca);
      novasFracoes.push({
        id: `falta-${Date.now()}`,
        lote: numnotaStr,
        quantidade: qtdFalta,
        validade: item.validadeOriginal || item.validade || '',
        fabricacao: item.fabricacaoOriginal || item.fabricacao || '',
        isFalta: true,
      });
    }

    // Se por acaso ainda não tiver nenhuma linha criada, cria uma linha padrão com a quantidade esperada
    if (novasFracoes.length === 0) {
      novasFracoes.push({
        id: `default-${Date.now()}`,
        lote: item.lote || item.controleOriginal || numnotaStr,
        quantidade: item.qtdEsperada,
        validade: item.validade || item.validadeOriginal || '',
        fabricacao: item.fabricacao || item.fabricacaoOriginal || '',
        isFalta: false,
      });
    }

    setFracoes(novasFracoes);
  }, [isOpen, item, grupo]);

  if (!isOpen || !item) return null;

  const numnota = grupo?.numnota || item.nunota;
  const qtdEsperadaTotal = Number(item.qtdEsperada) || 0;
  const somaAtual = fracoes.reduce((acc, f) => acc + (Number(f.quantidade) || 0), 0);
  const diferencaBalanco = Number((qtdEsperadaTotal - somaAtual).toFixed(4));
  const isSomaCorreta = Math.abs(diferencaBalanco) < 0.0001;

  const lotesPreenchidos = fracoes.every((f) => f.lote.trim().length > 0 && f.quantidade > 0);
  const podeConfirmar = isSomaCorreta && lotesPreenchidos && fracoes.length > 0 && !loading;

  const handleUpdateFracao = (id: string, campo: keyof FracaoLoteEditavel, valor: any) => {
    setFracoes((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        return { ...f, [campo]: valor };
      })
    );
  };

  const handleRemoverFracao = (id: string) => {
    if (fracoes.length <= 1) return;
    setFracoes((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAdicionarFracao = () => {
    setFracoes((prev) => [
      ...prev,
      {
        id: `nova-${Date.now()}`,
        lote: '',
        quantidade: diferencaBalanco > 0 ? diferencaBalanco : 0,
        validade: item.validadeOriginal || item.validade || '',
        fabricacao: item.fabricacaoOriginal || item.fabricacao || '',
        isFalta: false,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeConfirmar) return;

    const payloadLotes = fracoes.map((f) => ({
      lote: f.lote.trim(),
      qtd: Number(f.quantidade),
      dtval: f.validade ? f.validade.trim() : undefined,
      dtfab: f.fabricacao ? f.fabricacao.trim() : undefined,
    }));

    await onConfirmar({
      nunota: item.nunota,
      sequencia: item.sequencia,
      lotes: payloadLotes,
    });
  };

  return (
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
        className="modal-desmembrar-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--slate-50, #ffffff)',
          color: 'var(--slate-900, #0f172a)',
          borderRadius: '12px',
          maxWidth: '720px',
          width: '95%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--slate-200, #e2e8f0)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--slate-100, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>✂️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate-900)' }}>
                Desmembrar Item no Sankhya
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                Nota Fiscal #{numnota} • NUNOTA {item.nunota} • Sequência {item.sequencia}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--slate-400)',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card Resumo do Produto */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--slate-200, #e2e8f0)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--slate-900)' }}>
                  {item.descrprod}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Cód: <strong>{item.codprod}</strong> {item.referencia ? ` • Ref: ${item.referencia}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    background: 'var(--slate-100)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    color: 'var(--slate-700)',
                  }}
                >
                  Faturado: <strong>{item.qtdEsperada} {item.codvol || 'UN'}</strong>
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    color: '#1d4ed8',
                  }}
                >
                  Conferido: <strong>{(item.qtdN3 || item.qtdN2 || item.qtdN1)} {item.codvol || 'UN'}</strong>
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    background: item.diferenca < 0 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${item.diferenca < 0 ? '#fecaca' : '#bbf7d0'}`,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    color: item.diferenca < 0 ? '#b91c1c' : '#15803d',
                    fontWeight: 600,
                  }}
                >
                  {item.diferenca < 0 ? `⚠️ ${item.diferenca} (Falta)` : `+${item.diferenca} (Sobra)`}
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.78rem',
                background: '#f8fafc',
                padding: '8px 12px',
                borderRadius: '6px',
                color: 'var(--slate-600)',
                borderLeft: '3px solid #3b82f6',
              }}
            >
              💡 <strong>Regra de Desmembramento:</strong> Os itens conferidos fisicamente mantêm os lotes bipados.
              A quantidade faltante física entra com o <strong>número da nota fiscal ({numnota})</strong> como lote para identificação no Sankhya.
            </div>
          </div>

          {/* Tabela de Frações de Lote */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--slate-800)' }}>
                Frações de Lote a Desmembrar ({fracoes.length})
              </span>
              <button
                type="button"
                onClick={handleAdicionarFracao}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                + Adicionar Lote
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--slate-200)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--slate-200)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--slate-600)', fontWeight: 600 }}>Lote / Controle</th>
                    <th style={{ padding: '8px 12px', color: 'var(--slate-600)', fontWeight: 600, width: '110px' }}>Quantidade</th>
                    <th style={{ padding: '8px 12px', color: 'var(--slate-600)', fontWeight: 600, width: '130px' }}>Validade</th>
                    <th style={{ padding: '8px 12px', color: 'var(--slate-600)', fontWeight: 600, width: '130px' }}>Fabricação</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fracoes.map((fracao, idx) => (
                    <tr
                      key={fracao.id}
                      style={{
                        borderBottom: idx < fracoes.length - 1 ? '1px solid #e2e8f0' : 'none',
                        background: fracao.isFalta ? '#fffbeb' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={fracao.lote}
                            onChange={(e) => handleUpdateFracao(fracao.id, 'lote', e.target.value)}
                            placeholder="Identificador do lote..."
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: fracao.lote.trim() ? '1px solid #cbd5e1' : '1px solid #ef4444',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.82rem',
                            }}
                          />
                          {fracao.isFalta && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                              }}
                              title="Lote gerado automaticamente com o número da NF para isolar a falta"
                            >
                              Falta (NF)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          value={fracao.quantidade || ''}
                          onChange={(e) => handleUpdateFracao(fracao.id, 'quantidade', parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: fracao.quantidade > 0 ? '1px solid #cbd5e1' : '1px solid #ef4444',
                            fontWeight: 600,
                            textAlign: 'right',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.82rem',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          value={fracao.validade}
                          onChange={(e) => handleUpdateFracao(fracao.id, 'validade', e.target.value)}
                          placeholder="DD/MM/AAAA"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.82rem',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          value={fracao.fabricacao}
                          onChange={(e) => handleUpdateFracao(fracao.id, 'fabricacao', e.target.value)}
                          placeholder="DD/MM/AAAA"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.82rem',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {fracoes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoverFracao(fracao.id)}
                            title="Remover fração"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validação de Soma em Tempo Real */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '0.82rem',
              background: isSomaCorreta ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${isSomaCorreta ? '#bbf7d0' : '#fecaca'}`,
              color: isSomaCorreta ? '#166534' : '#991b1b',
            }}
          >
            <div>
              {isSomaCorreta ? (
                <span>
                  ✓ <strong>Balanço Perfeito:</strong> A soma das frações ({somaAtual} {item.codvol || 'UN'}) atende 100% da quantidade faturada ({qtdEsperadaTotal} {item.codvol || 'UN'}).
                </span>
              ) : (
                <span>
                  ⚠️ <strong>Divergência na Soma:</strong> Total configurado: <strong>{somaAtual}</strong> / Esperado: <strong>{qtdEsperadaTotal}</strong>.
                  {diferencaBalanco > 0
                    ? ` Faltam distribuir ${diferencaBalanco} ${item.codvol || 'UN'}.`
                    : ` Ultrapassou em ${Math.abs(diferencaBalanco)} ${item.codvol || 'UN'}.`}
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              {somaAtual} / {qtdEsperadaTotal} {item.codvol || 'UN'}
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--slate-100, #f8fafc)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!podeConfirmar}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: podeConfirmar ? '#2563eb' : '#94a3b8',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: podeConfirmar ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: podeConfirmar ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none',
            }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
                Desmembrando no Sankhya...
              </>
            ) : (
              <>
                <span>✂️</span>
                Confirmar e Desmembrar no Sankhya
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
