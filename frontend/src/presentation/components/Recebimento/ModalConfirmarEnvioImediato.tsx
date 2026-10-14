import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface DadosNotaEnvioImediato {
  conferenciaId: string;
  nunota: number;
  numnota: string | number;
  numerosNotas?: string;
  fornecedor?: string;
}

export interface ResultadoEnvioImediato {
  protocolo?: string;
  itensAtualizados?: number;
  estoqueAtualizado?: number;
  comprovante?: any;
}

interface ModalConfirmarEnvioImediatoProps {
  isOpen: boolean;
  onClose: () => void;
  dadosNota: DadosNotaEnvioImediato | null;
  onEnviarAgora: (nota: DadosNotaEnvioImediato) => Promise<ResultadoEnvioImediato>;
  onVisualizarComprovante?: (comprovante: any) => void;
}

type EtapaEnvio = 'pergunta' | 'enviando' | 'sucesso' | 'erro';

export const ModalConfirmarEnvioImediato: React.FC<ModalConfirmarEnvioImediatoProps> = ({
  isOpen,
  onClose,
  dadosNota,
  onEnviarAgora,
  onVisualizarComprovante,
}) => {
  const [etapa, setEtapa] = useState<EtapaEnvio>('pergunta');
  const [progresso, setProgresso] = useState<number>(0);
  const [statusTexto, setStatusTexto] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoEnvioImediato | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setEtapa('pergunta');
      setProgresso(0);
      setStatusTexto('');
      setResultado(null);
      setMensagemErro('');
    }
  }, [isOpen, dadosNota]);

  if (!isOpen || !dadosNota) return null;

  const handleIniciarEnvio = async () => {
    setEtapa('enviando');
    setProgresso(15);
    setStatusTexto('Preparando parâmetros e decisões fiscais...');

    // Simulação progressiva e realista enquanto a requisição HTTP executa
    const timer1 = setTimeout(() => {
      setProgresso(45);
      setStatusTexto('Transmitindo itens e lotes para o ERP Sankhya...');
    }, 600);

    const timer2 = setTimeout(() => {
      setProgresso(75);
      setStatusTexto('Atualizando estoque e validando regras de entrada...');
    }, 1400);

    try {
      const res = await onEnviarAgora(dadosNota);
      clearTimeout(timer1);
      clearTimeout(timer2);

      setProgresso(100);
      setStatusTexto('Transmissão concluída com sucesso!');
      setResultado(res);
      setEtapa('sucesso');
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setEtapa('erro');
      setMensagemErro(
        err.response?.data?.error ||
        err.message ||
        'Ocorreu uma falha ao comunicar com o ERP Sankhya.'
      );
    }
  };

  const modalContent = (
    <div
      className="gestao-modal-backdrop"
      onClick={() => {
        if (etapa !== 'enviando') onClose();
      }}
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
          maxWidth: '560px',
          width: '95%',
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '14px',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.35), 0 15px 15px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--border, #cbd5e1)',
          animation: 'fadeInScale 0.25s ease-out',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              etapa === 'sucesso'
                ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
                : etapa === 'erro'
                ? 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>
              {etapa === 'sucesso'
                ? '🎉'
                : etapa === 'erro'
                ? '⚠️'
                : etapa === 'enviando'
                ? '⏳'
                : '✨'}
            </span>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.18rem',
                  fontWeight: 700,
                  color:
                    etapa === 'sucesso'
                      ? '#065f46'
                      : etapa === 'erro'
                      ? '#991b1b'
                      : 'var(--slate-800, #1e293b)',
                }}
              >
                {etapa === 'pergunta' && 'Divergência Resolvida com Sucesso!'}
                {etapa === 'enviando' && 'Transmitindo para o Sankhya...'}
                {etapa === 'sucesso' && 'Nota Enviada com Sucesso!'}
                {etapa === 'erro' && 'Falha no Envio ao Sankhya'}
              </h3>
              <span style={{ fontSize: '0.84rem', color: 'var(--slate-500, #64748b)' }}>
                NF <strong>{dadosNota.numnota}</strong> (NÚ: {dadosNota.nunota})
                {dadosNota.fornecedor ? ` • ${dadosNota.fornecedor}` : ''}
              </span>
            </div>
          </div>
          {etapa !== 'enviando' && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.25rem',
                color: 'var(--slate-400, #94a3b8)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="Fechar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '22px' }}>
          {etapa === 'pergunta' && (
            <div>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.45 }}>
                  A conferência foi <strong>aprovada</strong> e as decisões fiscais e de contagem
                  foram consolidadas no banco de dados.
                </div>
              </div>

              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--slate-800, #1e293b)',
                }}
              >
                Deseja enviar esta nota para o Sankhya agora mesmo?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.86rem',
                  color: 'var(--slate-500, #64748b)',
                  lineHeight: 1.4,
                }}
              >
                O sistema fará a transmissão exclusiva dos itens da NF <strong>{dadosNota.numnota}</strong> para a Central de Compras e atualizará o estoque imediatamente.
              </p>
            </div>
          )}

          {etapa === 'enviando' && (
            <div style={{ textAlign: 'center', padding: '12px 6px' }}>
              <div style={{ marginBottom: '16px', fontSize: '0.92rem', color: '#1e293b' }}>
                <strong>{statusTexto}</strong>
              </div>

              {/* Barra de Progresso Externa */}
              <div
                style={{
                  width: '100%',
                  height: '24px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  marginBottom: '10px',
                }}
              >
                {/* Barra de Preenchimento Interna */}
                <div
                  style={{
                    width: `${progresso}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                    borderRadius: '12px',
                    transition: 'width 0.4s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: progresso > 15 ? '8px' : '0px',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}
                >
                  {progresso > 15 ? `${progresso}%` : ''}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: '#64748b',
                  marginTop: '4px',
                }}
              >
                <span>ConferCheck</span>
                <span>{progresso}%</span>
                <span>ERP Sankhya</span>
              </div>
            </div>
          )}

          {etapa === 'sucesso' && (
            <div>
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#065f46',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    marginBottom: '8px',
                  }}
                >
                  <span>✓</span>
                  <span>Transmissão confirmada pelo Sankhya</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', lineHeight: 1.5 }}>
                  {resultado?.protocolo && (
                    <div>
                      Protocolo gerado: <strong>{resultado.protocolo}</strong>
                    </div>
                  )}
                  {resultado?.itensAtualizados !== undefined && (
                    <div>
                      Itens atualizados na nota: <strong>{resultado.itensAtualizados}</strong>
                    </div>
                  )}
                  {resultado?.estoqueAtualizado !== undefined && (
                    <div>
                      Registros de estoque atualizados: <strong>{resultado.estoqueAtualizado}</strong>
                    </div>
                  )}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                A nota fiscal foi processada com sucesso no Sankhya e a conferência foi finalizada.
              </p>
            </div>
          )}

          {etapa === 'erro' && (
            <div>
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '16px',
                  color: '#991b1b',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ display: 'block', marginBottom: '6px' }}>
                  Não foi possível concluir a transmissão:
                </strong>
                {mensagemErro}
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                A divergência continua salva e aprovada. Você pode tentar reenviar agora ou acessar a
                aba <strong>Envio Sankhya</strong> mais tarde.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé / Ações do Modal */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--slate-50, #f8fafc)',
          }}
        >
          {etapa === 'pergunta' && (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Não, Enviar Depois
              </button>
              <button
                type="button"
                onClick={handleIniciarEnvio}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Sim, Enviar Agora</span>
                <span>🚀</span>
              </button>
            </>
          )}

          {etapa === 'enviando' && (
            <button
              type="button"
              disabled
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#94a3b8',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Processando Envio...</span>
            </button>
          )}

          {etapa === 'sucesso' && (
            <>
              {resultado?.comprovante && onVisualizarComprovante && (
                <button
                  type="button"
                  onClick={() => {
                    onVisualizarComprovante(resultado.comprovante);
                    onClose();
                  }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1e293b',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📄 Ver Comprovante</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Concluir
              </button>
            </>
          )}

          {etapa === 'erro' && (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Enviar Mais Tarde
              </button>
              <button
                type="button"
                onClick={handleIniciarEnvio}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tentar Novamente
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
