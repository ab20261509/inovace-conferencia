import React, { useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import './ModalFolhaBipagem.css';

export interface LoteFolhaBipagem {
  lote: string;
  validade?: string | null;
  fabricacao?: string | null;
  origem?: 'ERP' | 'BIP';
  quantidade?: number;
}

export interface ItemFolhaBipagem {
  sequencia: string | number;
  codProd: string | number;
  descrProd: string | null;
  referencia: string | null;
  codBarra: string | null;
  qtd?: string | number | null;
  numnota?: number | string | null;
  lotes: LoteFolhaBipagem[];
}

export interface ModalFolhaBipagemProps {
  modulo?: 'RECEBIMENTO' | 'EXPEDICAO';
  tituloModulo?: string;
  identificadorNota: string;
  nunota?: number | string;
  parceiro?: string | null;
  vendedor?: string | null;
  dataEmissao?: string | null;
  itens: ItemFolhaBipagem[];
  verCamposSensiveis: boolean;
  onClose: () => void;
}

export const ModalFolhaBipagem: React.FC<ModalFolhaBipagemProps> = ({
  modulo = 'EXPEDICAO',
  tituloModulo,
  identificadorNota,
  nunota,
  parceiro,
  vendedor,
  itens,
  verCamposSensiveis,
  onClose,
}) => {
  useEffect(() => {
    // Renderizar códigos de barras compactos lado a lado para cada item
    itens.forEach((item) => {
      // 1. Código de barras do produto (CODBARRA ou CODPROD como fallback)
      const codBarraVal =
        item.codBarra && item.codBarra.trim() !== ''
          ? item.codBarra.trim()
          : String(item.codProd).trim();

      const svgProd = document.getElementById(`barcode-prod-${item.sequencia}`);
      if (svgProd && codBarraVal) {
        try {
          JsBarcode(svgProd, codBarraVal, {
            format: 'CODE128',
            width: 1.25,
            height: 32,
            displayValue: true,
            fontSize: 10,
            font: 'monospace',
            textMargin: 1,
            margin: 1,
            lineColor: '#000000',
          });
        } catch (err) {
          console.warn(`Erro ao gerar código de barras do produto ${item.codProd}:`, err);
        }
      }

      // 2. Códigos de barras dos lotes (se houver lotes do ERP ou da bipagem)
      if (item.lotes && item.lotes.length > 0) {
        item.lotes.forEach((l, lIdx) => {
          if (l.lote && l.lote.trim() !== '') {
            const svgLote = document.getElementById(`barcode-lote-${item.sequencia}-${lIdx}`);
            if (svgLote) {
              try {
                JsBarcode(svgLote, l.lote.trim(), {
                  format: 'CODE128',
                  width: 1.25,
                  height: 32,
                  displayValue: true,
                  fontSize: 10,
                  font: 'monospace',
                  textMargin: 1,
                  margin: 1,
                  lineColor: '#000000',
                });
              } catch (err) {
                console.warn(`Erro ao gerar código de barras do lote ${l.lote}:`, err);
              }
            }
          }
        });
      }
    });
  }, [itens]);

  const handleImprimir = () => {
    window.print();
  };

  const dataAtual = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subtituloModulo =
    tituloModulo ||
    (modulo === 'RECEBIMENTO'
      ? 'RECEBIMENTO'
      : 'EXPEDIÇÃO');

  return (
    <div className="modal-folha-bipagem-overlay" onClick={onClose}>
      <div className="modal-folha-bipagem-card" onClick={(e) => e.stopPropagation()}>
        {/* Barra superior de controles na tela (oculta na impressão) */}
        <div className="modal-folha-bipagem-header-actions">
          <div className="modal-folha-titulo">
            <span className="folha-icone">📄</span>
            <div>
              <h3>Folha de Bipagem Minimalista (2 Colunas)</h3>
              <p>Layout compacto com códigos lado a lado otimizado para economia de papel</p>
            </div>
          </div>
          <div className="modal-folha-botoes">
            <button type="button" className="btn-imprimir-folha" onClick={handleImprimir}>
              🖨️ Imprimir / Salvar em PDF
            </button>
            <button type="button" className="btn-fechar-modal" onClick={onClose}>
              ✕ Fechar
            </button>
          </div>
        </div>

        {/* Documento A4 Imprimível */}
        <div className="folha-bipagem-documento" id="folha-bipagem-documento">
          {/* Cabeçalho Ultra Compacto de 2 Linhas */}
          <header className="folha-cabecalho-compact">
            <div className="folha-cabecalho-linha1">
              <span className="folha-doc-titulo-compact">
                FOLHA DE CONFERÊNCIA & BIPAGEM • {subtituloModulo} • SANKHYA OM
              </span>
              <span className="folha-badge-nota-compact">
                {identificadorNota}
              </span>
            </div>

            <div className="folha-cabecalho-linha2">
              {nunota && <span><strong>Nº Único:</strong> {nunota}</span>}
              {parceiro && <span><strong>Razão Social:</strong> {parceiro}</span>}
              {vendedor && <span><strong>Vendedor:</strong> {vendedor}</span>}
              <span><strong>Emissão:</strong> {dataAtual}</span>
              <span><strong>Total:</strong> {itens.length} produto(s)</span>
            </div>
          </header>

          {/* Grid de 2 Colunas com Códigos Lado a Lado */}
          <main className="folha-itens-grid-2col">
            {itens.length === 0 ? (
              <div className="folha-sem-itens">Nenhum produto encontrado nesta conferência.</div>
            ) : (
              itens.map((item, idx) => {
                const temLotes = item.lotes && item.lotes.length > 0;

                return (
                  <div key={item.sequencia || idx} className="folha-item-card-compact">
                    {/* Linha Superior: Sequência + Código + Descrição + Metadados */}
                    <div className="folha-item-topo-compact">
                      <span className="item-seq-badge-compact">#{idx + 1}</span>
                      <span className="item-codprod-compact">[{item.codProd}]</span>
                      <strong className="item-descr-compact">{item.descrProd || 'PRODUTO NÃO IDENTIFICADO'}</strong>
                      {item.referencia && <span className="item-ref-compact">Ref: {item.referencia}</span>}
                      {item.numnota && <span className="item-nf-compact">NF: {item.numnota}</span>}
                      {verCamposSensiveis && item.qtd !== null && item.qtd !== undefined && (
                        <span className="item-qtd-compact">Qtd: {item.qtd}</span>
                      )}
                    </div>

                    {/* Metadados de Lote (se houver lote do ERP ou Bipado) */}
                    {temLotes && (
                      <div className="folha-item-lotes-inline">
                        {item.lotes.map((loteItem, lIdx) => {
                          const ehBip = loteItem.origem === 'BIP';
                          return (
                            <div key={lIdx} className="folha-lote-info-compact">
                              <span className={`origem-tag-compact ${ehBip ? 'origem-bip' : 'origem-erp'}`}>
                                {ehBip ? '📱 Bip' : '🏢 ERP'}
                              </span>
                              <span><strong>Lote:</strong> {loteItem.lote}</span>
                              {loteItem.validade && <span>• <strong>Val:</strong> {loteItem.validade}</span>}
                              {loteItem.fabricacao && <span>• <strong>Fab:</strong> {loteItem.fabricacao}</span>}
                              {loteItem.quantidade !== undefined && (
                                <span>• <strong>Qtd:</strong> {loteItem.quantidade}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Códigos de Barras LADO A LADO (Produto e Lote) */}
                    <div className="folha-barcodes-lado-a-lado">
                      {/* Código de barras do Produto */}
                      <div className="barcode-bloco-compact">
                        <span className="barcode-rotulo-compact">
                          PROD ({item.codBarra ? 'EAN' : 'CÓD'})
                        </span>
                        <div className="barcode-svg-wrapper-compact">
                          <svg id={`barcode-prod-${item.sequencia}`}></svg>
                        </div>
                      </div>

                      {/* Código de barras do Lote (lado a lado com o produto) */}
                      {temLotes && item.lotes.length > 0 && (
                        <div className="barcode-bloco-compact">
                          <span className="barcode-rotulo-compact">
                            LOTE ({item.lotes[0].origem === 'BIP' ? 'BIP' : 'ERP'})
                          </span>
                          <div className="barcode-svg-wrapper-compact">
                            <svg id={`barcode-lote-${item.sequencia}-0`}></svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lotes extras (se o mesmo item tiver mais de 1 lote desmembrado) */}
                    {temLotes && item.lotes.length > 1 && (
                      <div className="folha-barcodes-extras-grid">
                        {item.lotes.slice(1).map((extraLot, exIdx) => (
                          <div key={exIdx} className="barcode-bloco-compact">
                            <span className="barcode-rotulo-compact">
                              LOTE #{exIdx + 2} ({extraLot.lote})
                            </span>
                            <div className="barcode-svg-wrapper-compact">
                              <svg id={`barcode-lote-${item.sequencia}-${exIdx + 1}`}></svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </main>

          {/* Rodapé do Documento */}
          <footer className="folha-rodape-compact">
            <div>ConferCheck • Sistema de Conferência Integrado ao Sankhya OM</div>
            <div>Folha minimalista em 2 colunas para leitura ótica rápida via pistola</div>
          </footer>
        </div>
      </div>
    </div>
  );
};
