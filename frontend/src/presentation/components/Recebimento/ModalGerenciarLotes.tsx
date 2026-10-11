import React, { useState, useEffect, useMemo } from 'react';
import './ModalLotes.css';

export interface FracaoLote {
  id?: string;
  lote: string;
  qtd: number;
  validade?: string;
  fabricacao?: string;
}

export interface ModalGerenciarLotesProps {
  isOpen: boolean;
  onClose: () => void;
  produto: {
    nunota: number;
    sequencia: number;
    codprod: number;
    descrprod: string;
    qtdEsperada: number;
  } | null;
  lotesIniciais: FracaoLote[];
  onSalvar: (lotes: FracaoLote[]) => void;
}

export const ModalGerenciarLotes: React.FC<ModalGerenciarLotesProps> = ({
  isOpen,
  onClose,
  produto,
  lotesIniciais,
  onSalvar,
}) => {
  const [lotes, setLotes] = useState<FracaoLote[]>([]);

  useEffect(() => {
    if (isOpen && produto) {
      if (lotesIniciais && lotesIniciais.length > 0) {
        setLotes(
          lotesIniciais.map((l, idx) => ({
            ...l,
            id: l.id || `lote-${idx}-${Date.now()}`,
          }))
        );
      } else {
        // Inicializa com 1 lote padrão com a quantidade total esperada
        setLotes([
          {
            id: `lote-0-${Date.now()}`,
            lote: '',
            qtd: produto.qtdEsperada || 0,
            validade: '',
            fabricacao: '',
          },
        ]);
      }
    }
  }, [isOpen, produto, lotesIniciais]);

  const totalAlocado = useMemo(() => {
    return lotes.reduce((acc, l) => acc + (Number(l.qtd) || 0), 0);
  }, [lotes]);

  const totalEsperado = produto?.qtdEsperada || 0;
  const diferenca = totalAlocado - totalEsperado;

  const statusBalanco: 'ok' | 'falta' | 'sobra' =
    diferenca === 0 ? 'ok' : diferenca < 0 ? 'falta' : 'sobra';

  const porcentagemBarra =
    totalEsperado > 0 ? Math.min(100, Math.max(0, (totalAlocado / totalEsperado) * 100)) : 100;

  if (!isOpen || !produto) return null;

  const handleAddLote = () => {
    const restante = Math.max(0, totalEsperado - totalAlocado);
    setLotes((prev) => [
      ...prev,
      {
        id: `lote-${prev.length}-${Date.now()}`,
        lote: '',
        qtd: restante,
        validade: '',
        fabricacao: '',
      },
    ]);
  };

  const handleRemoverLote = (index: number) => {
    if (lotes.length <= 1) return;
    setLotes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAtualizarLote = (index: number, campo: keyof FracaoLote, valor: any) => {
    setLotes((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [campo]: valor,
      };
      return copy;
    });
  };

  const handleSalvar = () => {
    // Validações básicas
    const lotesSemNome = lotes.some((l) => !l.lote.trim());
    if (lotesSemNome) {
      alert('Por favor, informe a identificação/número de todos os lotes.');
      return;
    }

    const lotesQtdInvalida = lotes.some((l) => isNaN(l.qtd) || l.qtd <= 0);
    if (lotesQtdInvalida) {
      alert('Todos os lotes devem possuir quantidade maior que zero.');
      return;
    }

    onSalvar(lotes);
    onClose();
  };

  return (
    <div className="modal-lotes-backdrop">
      <div className="modal-lotes-box">
        {/* Cabeçalho */}
        <div className="modal-lotes-header">
          <div className="modal-lotes-header-info">
            <h3>
              <span>✂️</span> Gerenciar e Dividir Lotes
            </h3>
            <p>
              Produto: <strong>{produto.codprod} - {produto.descrprod}</strong> (NF: {produto.nunota})
            </p>
          </div>
          <button type="button" className="modal-lotes-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Corpo */}
        <div className="modal-lotes-body">
          {/* Balanço de Quantidades */}
          <div className="modal-lotes-balanco-card">
            <div className="modal-lotes-balanco-metricas">
              <div className="modal-lotes-metrica-item">
                <span className="modal-lotes-metrica-rotulo">Faturado na NF</span>
                <span className="modal-lotes-metrica-valor">{totalEsperado} un</span>
              </div>
              <div className="modal-lotes-metrica-item">
                <span className="modal-lotes-metrica-rotulo">Soma dos Lotes</span>
                <span className="modal-lotes-metrica-valor">{totalAlocado} un</span>
              </div>
              <div>
                <span className={`modal-lotes-balanco-status ${statusBalanco}`}>
                  {statusBalanco === 'ok' && '✓ Total Balanceado'}
                  {statusBalanco === 'falta' && `⚠️ Faltam ${Math.abs(diferenca)} un`}
                  {statusBalanco === 'sobra' && `❌ Excede em ${diferenca} un`}
                </span>
              </div>
            </div>

            <div className="modal-lotes-barra-wrapper">
              <div
                className={`modal-lotes-barra-preenchimento ${statusBalanco}`}
                style={{ width: `${porcentagemBarra}%` }}
              />
            </div>
          </div>

          {/* Aviso quando houver múltiplos lotes */}
          {lotes.length > 1 && (
            <div className="modal-excel-alerta-box aviso">
              💡 <strong>Divisão Automática:</strong> Como você definiu {lotes.length} lotes para este produto, ao enviar ao Sankhya o sistema irá associar o primeiro lote e gerar o desmembramento para as frações restantes.
            </div>
          )}

          {/* Lista de Frações */}
          <div className="modal-lotes-lista">
            {lotes.map((lote, index) => (
              <div key={lote.id || index} className="modal-lote-linha-card">
                <div className="modal-lote-campo">
                  <label>Número do Lote *</label>
                  <input
                    type="text"
                    placeholder="Ex: LOTE-2026-A"
                    value={lote.lote}
                    onChange={(e) => handleAtualizarLote(index, 'lote', e.target.value)}
                  />
                </div>

                <div className="modal-lote-campo">
                  <label>Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={lote.qtd}
                    onChange={(e) => handleAtualizarLote(index, 'qtd', Number(e.target.value))}
                  />
                </div>

                <div className="modal-lote-campo">
                  <label>Data Validade (DTVAL)</label>
                  <input
                    type="date"
                    value={lote.validade || ''}
                    onChange={(e) => handleAtualizarLote(index, 'validade', e.target.value)}
                  />
                </div>

                <div className="modal-lote-campo">
                  <label>Data Fabricação</label>
                  <input
                    type="date"
                    value={lote.fabricacao || ''}
                    onChange={(e) => handleAtualizarLote(index, 'fabricacao', e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="modal-lote-remover-btn"
                  title="Remover este lote"
                  disabled={lotes.length <= 1}
                  style={{ opacity: lotes.length <= 1 ? 0.3 : 1, cursor: lotes.length <= 1 ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleRemoverLote(index)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Botão de Adicionar Fração */}
          <button type="button" className="modal-lotes-add-btn" onClick={handleAddLote}>
            <span>➕ Adicionar Outro Lote para Este Item</span>
          </button>
        </div>

        {/* Rodapé com botões de ação */}
        <div className="modal-lotes-footer">
          <button type="button" className="modal-lotes-btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="modal-lotes-btn-salvar" onClick={handleSalvar}>
            <span>💾 Confirmar Lotes do Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};
