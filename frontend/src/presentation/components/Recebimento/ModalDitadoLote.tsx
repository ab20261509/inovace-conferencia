import React, { useState, useEffect, useRef } from 'react';
import { aplicarMascaraData, completarAnoData, validarData } from '../../utils/dateMaskHelper';
import './ModalDitadoLote.css';

export type TipoCampoDitado = 'lote' | 'validade' | 'fabricacao';

interface ModalDitadoLoteProps {
  isOpen: boolean;
  isOuvindo: boolean;
  tipoCampo?: TipoCampoDitado;
  valorTranscrito?: string;
  loteTranscrito?: string; // Retrocompatibilidade
  erroValidacao?: string | null;
  onConfirmar: (valor: string) => void;
  onRefazer: () => void;
  onClose: () => void;
}

export const ModalDitadoLote: React.FC<ModalDitadoLoteProps> = ({
  isOpen,
  isOuvindo,
  tipoCampo = 'lote',
  valorTranscrito,
  loteTranscrito,
  erroValidacao,
  onConfirmar,
  onRefazer,
  onClose,
}) => {
  const valorInicial = valorTranscrito !== undefined ? valorTranscrito : (loteTranscrito || '');
  const [valorEditado, setValorEditado] = useState(valorInicial);
  const [erroInterno, setErroInterno] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isData = tipoCampo === 'validade' || tipoCampo === 'fabricacao';

  useEffect(() => {
    const val = valorTranscrito !== undefined ? valorTranscrito : (loteTranscrito || '');
    setValorEditado(val);
    setErroInterno(null);
  }, [valorTranscrito, loteTranscrito]);

  useEffect(() => {
    if (isOpen && !isOuvindo) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, isOuvindo]);

  const handleValidarEConfirmar = () => {
    const textoLimpo = valorEditado.trim();
    if (!textoLimpo) return;

    if (isData) {
      const dataCompletada = completarAnoData(textoLimpo);
      const res = validarData(dataCompletada, true);
      if (!res.valida) {
        setErroInterno(res.erro || 'Data inválida (DD/MM/AAAA)');
        return;
      }
      setErroInterno(null);
      onConfirmar(dataCompletada);
    } else {
      onConfirmar(textoLimpo.toUpperCase());
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleValidarEConfirmar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, valorEditado, isData, onConfirmar, onClose]);

  if (!isOpen) return null;

  const titulo =
    tipoCampo === 'validade'
      ? 'Ditado de Validade por Voz'
      : tipoCampo === 'fabricacao'
      ? 'Ditado de Fabricação por Voz'
      : 'Ditado de Lote por Voz';

  const textoOuvindo =
    tipoCampo === 'validade'
      ? 'Ouvindo... Fale a data de validade'
      : tipoCampo === 'fabricacao'
      ? 'Ouvindo... Fale a data de fabricação'
      : 'Ouvindo... Fale o lote agora';

  const dica =
    isData
      ? 'Diga o Dia, Mês e Ano completos (ex: "15 de outubro de 2026" ou "15 10 26")'
      : 'Diga números por extenso, letras ou pontuações (ex: "um dois três f k", "ponto", "traço")';

  const labelResultado =
    tipoCampo === 'validade'
      ? 'Validade Reconhecida:'
      : tipoCampo === 'fabricacao'
      ? 'Fabricação Reconhecida:'
      : 'Lote Reconhecido:';

  const placeholderAjuste = isData ? 'DD/MM/AAAA' : 'Ex: 123456FKEF';
  const erroExibicao = erroValidacao || erroInterno;

  return (
    <div className="modal-ditado-backdrop" onClick={onClose}>
      <div className="modal-ditado-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="modal-ditado-header">
          <div className="modal-ditado-header-title">
            <span className="modal-ditado-icone-topo">{isOuvindo ? '🎙️' : '🎤'}</span>
            <h3>{titulo}</h3>
          </div>
          <button
            type="button"
            className="modal-ditado-btn-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Corpo */}
        <div className="modal-ditado-body">
          {isOuvindo ? (
            <div className="modal-ditado-escutando-container">
              <div className="modal-ditado-pulse-circle">
                <span className="modal-ditado-mic-gigante">🎙️</span>
              </div>
              <p className="modal-ditado-texto-escutando">{textoOuvindo}</p>
              <span className="modal-ditado-dica">{dica}</span>
            </div>
          ) : (
            <div className="modal-ditado-resultado-container">
              {erroExibicao && (
                <div className="modal-ditado-alerta-erro">
                  <span>⚠️</span>
                  <span>{erroExibicao}</span>
                </div>
              )}

              <label className="modal-ditado-resultado-label">{labelResultado}</label>

              <div className="modal-ditado-display-lote">
                {valorEditado ? (
                  valorEditado
                ) : (
                  <span className="lote-vazio-placeholder">Nenhuma fala capturada</span>
                )}
              </div>

              <div className="modal-ditado-input-ajuste-wrapper">
                <label htmlFor="input-ajuste-campo" className="modal-ditado-sublabel">
                  Ajustar manualmente caso necessário:
                </label>
                <input
                  ref={inputRef}
                  id="input-ajuste-campo"
                  type="text"
                  value={valorEditado}
                  onChange={(e) => {
                    const v = isData ? aplicarMascaraData(e.target.value) : e.target.value.toUpperCase();
                    setValorEditado(v);
                    setErroInterno(null);
                  }}
                  placeholder={placeholderAjuste}
                  className="modal-ditado-input-ajuste"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="modal-ditado-footer">
          <button
            type="button"
            className="modal-ditado-btn modal-ditado-btn-refazer"
            onClick={onRefazer}
            title="Ditar novamente por voz"
          >
            <span>🎤</span>
            <span>{isOuvindo ? 'Reiniciar Fala' : 'Falar Novamente'}</span>
          </button>

          <div className="modal-ditado-footer-actions-right">
            <button
              type="button"
              className="modal-ditado-btn modal-ditado-btn-cancelar"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="modal-ditado-btn modal-ditado-btn-confirmar"
              disabled={!valorEditado.trim()}
              onClick={handleValidarEConfirmar}
            >
              <span>Confirmar</span>
              <kbd className="modal-ditado-kbd">Enter</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
