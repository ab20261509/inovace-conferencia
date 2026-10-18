import React, { useState, useEffect, useMemo } from 'react';
import { RecebimentoApiService } from '../../../infrastructure/api/RecebimentoApiService';
import { LocalEstoqueItem } from '../../../domain/models/OcorrenciaRecebimento';

interface ModalPesquisaLocalEstoqueProps {
  isOpen: boolean;
  onClose: () => void;
  onSelecionar: (codlocal?: number, descrlocal?: string) => void;
  codlocalAtual?: number;
  tituloContexto?: string;
}

const recebimentoService = new RecebimentoApiService();

export const ModalPesquisaLocalEstoque: React.FC<ModalPesquisaLocalEstoqueProps> = ({
  isOpen,
  onClose,
  onSelecionar,
  codlocalAtual,
  tituloContexto,
}) => {
  const [locais, setLocais] = useState<LocalEstoqueItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTermoBusca('');
    let ativo = true;

    const carregar = async () => {
      setCarregando(true);
      try {
        const resp = await recebimentoService.listarLocaisEstoque();
        if (ativo && resp && resp.length > 0) {
          setLocais(resp);
        }
      } catch (err) {
        console.warn('[ModalPesquisaLocalEstoque] Erro ao carregar locais:', err);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, [isOpen]);

  const locaisFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return locais;
    const t = termoBusca.toLowerCase().trim();
    return locais.filter(
      (loc) =>
        String(loc.codlocal).includes(t) ||
        loc.descrlocal.toLowerCase().includes(t)
    );
  }, [locais, termoBusca]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.70)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10050,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🏢</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>
                Pesquisar Local de Estoque (Sankhya)
              </h4>
              {tituloContexto && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {tituloContexto}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: 1,
            }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo da Pesquisa */}
        <div
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Campo de Busca em Tempo Real */}
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.85rem',
                color: '#94a3b8',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              autoFocus
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar por código ou descrição do local (TGFLOC)..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Cabeçalho da Lista */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              Locais da TGFLOC ({locaisFiltrados.length})
            </span>
            {carregando && (
              <span style={{ fontSize: '0.70rem', color: '#3b82f6' }}>Carregando TGFLOC...</span>
            )}
          </div>

          {/* Lista com Rolagem */}
          <div
            style={{
              flex: 1,
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#ffffff',
            }}
          >
            {locaisFiltrados.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.80rem',
                }}
              >
                {carregando ? 'Carregando locais do Sankhya...' : `Nenhum local encontrado para "${termoBusca}".`}
              </div>
            ) : (
              locaisFiltrados.map((loc) => {
                const isSelecionado = codlocalAtual === loc.codlocal;
                return (
                  <div
                    key={loc.codlocal}
                    onClick={() => {
                      onSelecionar(loc.codlocal, loc.descrlocal);
                      onClose();
                    }}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelecionado ? '#eff6ff' : '#ffffff',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelecionado) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelecionado) e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isSelecionado ? '#2563eb' : '#e2e8f0',
                          color: isSelecionado ? '#ffffff' : '#334155',
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.75rem',
                          minWidth: '38px',
                          textAlign: 'center',
                        }}
                      >
                        {loc.codlocal}
                      </span>
                      <span
                        style={{
                          fontSize: '0.80rem',
                          fontWeight: isSelecionado ? 700 : 500,
                          color: isSelecionado ? '#1d4ed8' : '#1e293b',
                        }}
                      >
                        {loc.descrlocal}
                      </span>
                    </div>

                    <button
                      type="button"
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        border: isSelecionado ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelecionado ? '#2563eb' : '#ffffff',
                        color: isSelecionado ? '#ffffff' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isSelecionado ? 'Selecionado' : 'Selecionar'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onSelecionar(undefined, undefined);
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Limpar / Usar Local Padrão do ERP
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
