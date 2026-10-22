import React, { useState, useEffect } from 'react';
import { ItemDivergenciaResumo, ConferenciaDivergenciaGrupo } from '../../../domain/models/ConferenciaEntrada';
import { RecebimentoApiService } from '../../../infrastructure/api/RecebimentoApiService';
import { ModalPesquisaLocalEstoque } from './ModalPesquisaLocalEstoque';

interface ModalOcorrenciaSobraProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDivergenciaResumo | null;
  grupo: ConferenciaDivergenciaGrupo | null;
  onConfirmar: (dados: {
    conferenciaId: string;
    nunota: number;
    numnota?: number;
    sequencia?: number;
    codprod: number;
    descrprod?: string;
    quantidadeSobra: number;
    lote?: string;
    validade?: string;
    fabricacao?: string;
    motivo?: string;
    codlocalDestino?: number;
    fotos?: string[];
  }) => Promise<void>;
  loading?: boolean;
}

export const ModalOcorrenciaSobra: React.FC<ModalOcorrenciaSobraProps> = ({
  isOpen,
  onClose,
  item,
  grupo,
  onConfirmar,
  loading = false,
}) => {
  const [qtdSobra, setQtdSobra] = useState<number>(0);
  const [lote, setLote] = useState<string>('');
  const [validade, setValidade] = useState<string>('');
  const [fabricacao, setFabricacao] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [codlocalDestino, setCodlocalDestino] = useState<number | undefined>(undefined);
  const [modalPesquisaLocal, setModalPesquisaLocal] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !item) return;

    const sobraCalculada = item.diferenca > 0 ? item.diferenca : 0;
    setQtdSobra(sobraCalculada);
    setLote(item.lote || item.controleOriginal || '');
    setValidade(item.validade || item.validadeOriginal || '');
    setFabricacao(item.fabricacao || item.fabricacaoOriginal || '');
    setCodlocalDestino(undefined);
    setMotivo(
      `Sobra física de ${sobraCalculada} ${item.codvol || 'UN'} identificada na conferência de recebimento. Quantidade excedente deduzida da contagem física para acerto comercial e eliminação da divergência.`
    );
  }, [isOpen, item]);

  if (!isOpen || !item || !grupo) return null;

  const numnota = grupo.numnota || item.nunota;
  const conferenciaId = grupo.conferenciaId || grupo.id;

  const handleSalvar = async () => {
    if (qtdSobra <= 0) {
      alert('A quantidade da sobra deve ser maior que zero.');
      return;
    }

    await onConfirmar({
      conferenciaId,
      nunota: item.nunota,
      numnota: grupo.numnota,
      sequencia: item.sequencia,
      codprod: item.codprod,
      descrprod: item.descrprod,
      quantidadeSobra: qtdSobra,
      lote: lote.trim() || undefined,
      validade: validade.trim() || undefined,
      fabricacao: fabricacao.trim() || undefined,
      motivo: motivo.trim() || undefined,
      codlocalDestino,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s ease-out',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📦</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                Gerar Ocorrência de Sobra
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '1px' }}>
                Nota Fiscal <strong style={{ color: 'var(--slate-700)' }}>#{numnota}</strong> • NUNOTA <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.nunota}</span>
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

        {/* Conteúdo */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Resumo do Produto */}
          <div
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--slate-900)' }}>
              {item.descrprod}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)' }}>
              Cód: <strong>{item.codprod}</strong> {item.referencia ? ` • Ref: ${item.referencia}` : ''} • Seq: <strong>{item.sequencia}</strong>
            </div>
            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.78rem' }}>
              <div>Faturado NF: <strong>{item.qtdEsperada} {item.codvol || 'UN'}</strong></div>
              <div>Conferido: <strong>{(item.qtdN3 > 0 ? item.qtdN3 : item.qtdN2 > 0 ? item.qtdN2 : item.qtdN1)} {item.codvol || 'UN'}</strong></div>
              <div style={{ color: '#047857', fontWeight: 700 }}>
                Sobra: +{item.diferenca} {item.codvol || 'UN'}
              </div>
            </div>
          </div>

          {/* Banner Informativo sobre Eliminação da Divergência */}
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.75rem',
              color: '#065f46',
              lineHeight: '1.35',
            }}
          >
            💡 <strong>Ação Automática:</strong> Ao registrar esta ocorrência, a quantidade excedente (<strong>{qtdSobra} {item.codvol || 'UN'}</strong>) será deduzida da contagem física da conferência. A quantidade conferida igualará à faturada (<strong>{item.qtdEsperada} {item.codvol || 'UN'}</strong>), <strong>eliminando esta divergência</strong>.
          </div>

          {/* Campos do Formulário */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Quantidade da Sobra *
              </label>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={qtdSobra || ''}
                onChange={(e) => setQtdSobra(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Lote da Sobra
              </label>
              <input
                type="text"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder="Lote..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Validade
              </label>
              <input
                type="text"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.80rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Fabricação
              </label>
              <input
                type="text"
                value={fabricacao}
                onChange={(e) => setFabricacao(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.80rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Local de Destino Opcional */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Local de Armazenagem da Sobra (Opcional)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                value={codlocalDestino !== undefined ? codlocalDestino : ''}
                onChange={(e) => setCodlocalDestino(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Digite o código ou pesquise..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.80rem',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <button
                type="button"
                onClick={() => setModalPesquisaLocal(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔍 Pesquisar Local
              </button>
            </div>
          </div>

          {/* Motivo / Justificativa */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Justificativa / Motivo da Ocorrência
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva a identificação da sobra e tratativa comercial..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.80rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={loading || qtdSobra <= 0}
            style={{
              padding: '7px 18px',
              borderRadius: '6px',
              border: 'none',
              background: loading || qtdSobra <= 0 ? '#94a3b8' : '#059669',
              color: '#ffffff',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: loading || qtdSobra <= 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border-sm" />
                Registrando e Ajustando...
              </>
            ) : (
              'Confirmar e Eliminar Divergência'
            )}
          </button>
        </div>
      </div>

      {/* Modal de Pesquisa de Local de Estoque */}
      <ModalPesquisaLocalEstoque
        isOpen={modalPesquisaLocal}
        onClose={() => setModalPesquisaLocal(false)}
        onSelecionar={(cod) => {
          setCodlocalDestino(cod);
          setModalPesquisaLocal(false);
        }}
        codlocalAtual={codlocalDestino}
        tituloContexto={`Sobra: ${item.descrprod} (+${qtdSobra} un)`}
      />
    </div>
  );
};
