import React, { useEffect, useMemo } from 'react';
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
  referencia?: string | null;
  codBarra: string | null;
  qtd?: string | number | null;
  numnota?: number | string | null;
  nunota?: number | string | null;
  nomeparc?: string | null;
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

interface GrupoNotaFolha {
  key: string;
  numnota?: number | string | null;
  nunota?: number | string | null;
  parceiro?: string | null;
  itens: ItemFolhaBipagem[];
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
  // Agrupar itens por Nota Fiscal / Fornecedor quando houver notas distintas
  const gruposNotas: GrupoNotaFolha[] = useMemo(() => {
    const temDadosMultiplasNotas = itens.some((it) => it.numnota || it.nunota);
    if (!temDadosMultiplasNotas) {
      return [
        {
          key: 'UNICA',
          numnota: identificadorNota,
          nunota: nunota,
          parceiro: parceiro,
          itens,
        },
      ];
    }

    const mapa = new Map<string, GrupoNotaFolha>();
    itens.forEach((it) => {
      const chave = String(it.numnota || it.nunota || 'OUTROS');
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          key: chave,
          numnota: it.numnota || chave,
          nunota: it.nunota || nunota,
          parceiro: it.nomeparc || parceiro,
          itens: [],
        });
      }
      mapa.get(chave)!.itens.push(it);
    });

    return Array.from(mapa.values());
  }, [itens, identificadorNota, nunota, parceiro]);

  useEffect(() => {
    // Renderizar códigos de barras compactos lado a lado para cada item com IDs 100% únicos por grupo e índice
    gruposNotas.forEach((grupo, gIdx) => {
      grupo.itens.forEach((item, itemIdx) => {
        // 1. Código de barras do produto (Prioridade: 1º Referência -> 2º Demais Códigos / EAN -> 3º Cód. Produto)
        const refLimpa =
          item.referencia && item.referencia.trim() !== '' && item.referencia.trim() !== '—' && item.referencia.trim() !== '-'
            ? item.referencia.trim()
            : null;
        const codBarraLimpo =
          item.codBarra && item.codBarra.trim() !== ''
            ? item.codBarra.trim()
            : null;
        const codBarraVal = refLimpa || codBarraLimpo || String(item.codProd).trim();

        const svgProdId = `barcode-prod-${gIdx}-${itemIdx}`;
        const svgProd = document.getElementById(svgProdId);
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
              const svgLoteId = `barcode-lote-${gIdx}-${itemIdx}-${lIdx}`;
              const svgLote = document.getElementById(svgLoteId);
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
    });
  }, [gruposNotas]);

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
          {gruposNotas.map((grupo, gIdx) => {
            const identNotaGrupo = grupo.numnota ? `NF ${grupo.numnota}` : identificadorNota;
            return (
              <section key={grupo.key || gIdx} className="folha-secao-nota">
                {/* Cabeçalho Ultra Compacto de 2 Linhas por Nota */}
                <header className="folha-cabecalho-compact">
                  <div className="folha-cabecalho-linha1">
                    <span className="folha-doc-titulo-compact">
                      FOLHA DE CONFERÊNCIA & BIPAGEM • {subtituloModulo} • SANKHYA OM
                    </span>
                    <span className="folha-badge-nota-compact">
                      {identNotaGrupo}
                    </span>
                  </div>

                  <div className="folha-cabecalho-linha2">
                    {grupo.nunota && <span><strong>Nº Único:</strong> {grupo.nunota}</span>}
                    {grupo.parceiro && <span><strong>Razão Social:</strong> {grupo.parceiro}</span>}
                    {vendedor && <span><strong>Vendedor:</strong> {vendedor}</span>}
                    <span><strong>Emissão:</strong> {dataAtual}</span>
                    <span><strong>Total:</strong> {grupo.itens.length} produto(s)</span>
                  </div>
                </header>

                {/* Grid de 2 Colunas com Códigos Lado a Lado */}
                <main className="folha-itens-grid-2col">
                  {grupo.itens.length === 0 ? (
                    <div className="folha-sem-itens">Nenhum produto encontrado nesta conferência.</div>
                  ) : (
                    grupo.itens.map((item, itemIdx) => {
                      const temLotes = item.lotes && item.lotes.length > 0;

                      return (
                        <div key={itemIdx} className="folha-item-card-compact">
                          {/* Topo do Item: Linha 1 Metadados (Seq, Cód, NF, Qtd) + Linha 2 Descrição */}
                          <div className="folha-item-topo-compact">
                            <div className="folha-item-meta-linha1">
                              <span className="item-seq-badge-compact">#{itemIdx + 1}</span>
                              <span className="item-codprod-compact">[{item.codProd}]</span>
                              {item.numnota && <span className="item-nf-compact">NF: {item.numnota}</span>}
                              {verCamposSensiveis && item.qtd !== null && item.qtd !== undefined && (
                                <span className="item-qtd-compact">Qtd: {item.qtd}</span>
                              )}
                            </div>
                            <div className="folha-item-descr-linha2">
                              <strong className="item-descr-compact">{item.descrProd || 'PRODUTO NÃO IDENTIFICADO'}</strong>
                            </div>
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
                                CÓDIGO DE BARRAS
                              </span>
                              <div className="barcode-svg-wrapper-compact">
                                <svg id={`barcode-prod-${gIdx}-${itemIdx}`}></svg>
                              </div>
                            </div>

                            {/* Código de barras do Lote (lado a lado com o produto) */}
                            {temLotes && item.lotes.length > 0 && (
                              <div className="barcode-bloco-compact">
                                <span className="barcode-rotulo-compact">
                                  LOTE
                                </span>
                                <div className="barcode-svg-wrapper-compact">
                                  <svg id={`barcode-lote-${gIdx}-${itemIdx}-0`}></svg>
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
                                    <svg id={`barcode-lote-${gIdx}-${itemIdx}-${exIdx + 1}`}></svg>
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

                {/* Rodapé do Documento por nota */}
                <footer className="folha-rodape-compact">
                  <div>ConferCheck • Sistema de Conferência Integrado ao Sankhya OM</div>
                </footer>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
