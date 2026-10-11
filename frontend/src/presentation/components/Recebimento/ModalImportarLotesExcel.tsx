import React, { useState, useRef } from 'react';
import './ModalLotes.css';
import {
  exportarTemplateLotesExcel,
  processarArquivoLotesExcel,
  ResultadoImportacaoExcel,
  LoteImportadoExcel,
} from './loteExcelHelper';

export interface ModalImportarLotesExcelProps {
  isOpen: boolean;
  onClose: () => void;
  itensConferencia: Array<{
    nunota: number;
    sequencia: number;
    codprod: number;
    descrprod?: string;
    referencia?: string;
    refforn?: string;
    codbarra?: string;
    lote?: string;
    validade?: string;
    fabricacao?: string;
    codigosAlternativos?: Array<{ codbarra: string }>;
  }>;
  onAplicarImportacao: (lotesImportados: LoteImportadoExcel[]) => void;
}

export const ModalImportarLotesExcel: React.FC<ModalImportarLotesExcelProps> = ({
  isOpen,
  onClose,
  itensConferencia,
  onAplicarImportacao,
}) => {
  const [processando, setProcessando] = useState(false);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacaoExcel | null>(null);
  const [erroFatal, setErroFatal] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBaixarModelo = () => {
    const dadosParaTemplate = itensConferencia.map((i) => ({
      codprod: i.codprod,
      codbarra: i.codbarra || (i.codigosAlternativos && i.codigosAlternativos[0]?.codbarra) || '',
      refforn: i.refforn || '',
      descrprod: i.descrprod || `Produto ${i.codprod}`,
      lote: i.lote || '',
      validade: i.validade || '',
      fabricacao: i.fabricacao || '',
    }));
    const nuNotaRef = itensConferencia[0]?.nunota ? `_NF_${itensConferencia[0].nunota}` : '';
    exportarTemplateLotesExcel(dadosParaTemplate, `modelo_lotes${nuNotaRef}.xlsx`);
  };

  const handleProcessarArquivo = async (file: File) => {
    setProcessando(true);
    setErroFatal(null);
    setResultado(null);
    setArquivoNome(file.name);

    try {
      const itensValidos = itensConferencia.map((i) => ({
        codprod: i.codprod,
        codbarra: i.codbarra || (i.codigosAlternativos && i.codigosAlternativos[0]?.codbarra) || '',
        refforn: i.refforn || '',
        descrprod: i.descrprod,
        codigosAlternativos: i.codigosAlternativos,
      }));

      const res = await processarArquivoLotesExcel(file, itensValidos);
      setResultado(res);
    } catch (err: any) {
      console.error('Erro ao processar planilha de lotes:', err);
      setErroFatal(err.message || 'Erro ao ler ou processar o arquivo.');
    } finally {
      setProcessando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleProcessarArquivo(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleProcessarArquivo(files[0]);
    }
  };

  const handleConfirmar = () => {
    if (!resultado || resultado.lotesValidos.length === 0) return;
    onAplicarImportacao(resultado.lotesValidos);
    onClose();
  };

  return (
    <div className="modal-lotes-backdrop">
      <div className="modal-lotes-box" style={{ maxWidth: '820px' }}>
        {/* Cabeçalho */}
        <div className="modal-lotes-header">
          <div className="modal-lotes-header-info">
            <h3>
              <span>📥</span> Importação de Lotes e Validades (Excel / CSV)
            </h3>
            <p>
              Carga rápida de lotes, datas de validade e fabricação. O sistema vincula automaticamente por Código, Código de Barras ou Referência do Fornecedor.
            </p>
          </div>
          <button type="button" className="modal-lotes-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Corpo */}
        <div className="modal-lotes-body">
          {/* Barra de Template */}
          <div className="modal-excel-template-bar">
            <div className="modal-excel-template-info">
              💡 <strong>Modelo personalizado:</strong> Baixe a planilha já preenchida com Código, Código de Barras e Ref. Fornecedor dos produtos desta NF.
            </div>
            <button
              type="button"
              className="gestao-btn-acao gestao-btn-csv"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              onClick={handleBaixarModelo}
            >
              <span>📄 Baixar Planilha Modelo (.xlsx)</span>
            </button>
          </div>

          {/* Área de Upload / Dropzone */}
          <div
            className={`modal-excel-dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
            />
            <span className="modal-excel-dropzone-icone">📊</span>
            <span className="modal-excel-dropzone-texto">
              {arquivoNome ? `Arquivo selecionado: ${arquivoNome}` : 'Clique ou arraste sua planilha (.xlsx / .csv) aqui'}
            </span>
            <span className="modal-excel-dropzone-dica">
              Colunas esperadas: CODPROD, CODBARRA, REFFORN, LOTE, DTVAL, DTFABRICACAO
            </span>
          </div>

          {/* Estado de Processamento */}
          {processando && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--slate-800)', fontWeight: 600 }}>
              ⏳ Lendo e validando linhas da planilha...
            </div>
          )}

          {/* Erro Fatal */}
          {erroFatal && (
            <div className="modal-excel-alerta-box erro">
              <strong>❌ Falha na importação:</strong> {erroFatal}
            </div>
          )}

          {/* Resultado do Processamento */}
          {resultado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Métricas do arquivo */}
              <div className="modal-lotes-balanco-card">
                <div className="modal-lotes-balanco-metricas">
                  <div className="modal-lotes-metrica-item">
                    <span className="modal-lotes-metrica-rotulo">Lotes Identificados</span>
                    <span className="modal-lotes-metrica-valor">{resultado.totalLotes}</span>
                  </div>
                  <div className="modal-lotes-metrica-item">
                    <span className="modal-lotes-metrica-rotulo">Produtos Atualizados</span>
                    <span className="modal-lotes-metrica-valor">{resultado.totalProdutosAtualizados}</span>
                  </div>
                  <div>
                    <span className={`modal-lotes-balanco-status ${resultado.sucesso ? 'ok' : 'falta'}`}>
                      {resultado.sucesso ? '✓ Planilha Pronta para Aplicação' : '⚠️ Contém Avisos'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Avisos */}
              {resultado.avisos.length > 0 && (
                <div className="modal-excel-alerta-box aviso">
                  <strong>⚠️ Avisos da Planilha:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {resultado.avisos.slice(0, 5).map((aviso, idx) => (
                      <li key={idx}>{aviso}</li>
                    ))}
                    {resultado.avisos.length > 5 && (
                      <li>...e mais {resultado.avisos.length - 5} avisos.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview da Tabela de Produtos Importados */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <table className="modal-excel-preview-tabela">
                  <thead>
                    <tr>
                      <th>Cód. / Ref.</th>
                      <th>Cód. Barras</th>
                      <th>Ref. Fornecedor</th>
                      <th>Descrição</th>
                      <th>Lote(s) / Validade / Fab.</th>
                      <th>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.resumoPorProduto.map((prod) => (
                      <tr key={prod.codprod}>
                        <td>
                          <strong>{prod.codprod}</strong>
                        </td>
                        <td>{prod.codbarra || '—'}</td>
                        <td>{prod.refforn || '—'}</td>
                        <td>{prod.descrprod}</td>
                        <td>
                          {prod.lotes.map((l, i) => (
                            <div key={i} style={{ fontSize: '0.78rem' }}>
                              <strong>{l.lote}</strong>
                              {l.validade ? ` • Val: ${l.validade}` : ''}
                              {l.fabricacao ? ` • Fab: ${l.fabricacao}` : ''}
                            </div>
                          ))}
                        </td>
                        <td>
                          <span className="badge-status-rec andamento" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                            📊 Excel
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botões */}
        <div className="modal-lotes-footer">
          <button type="button" className="modal-lotes-btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="modal-lotes-btn-salvar"
            onClick={handleConfirmar}
            disabled={!resultado || resultado.lotesValidos.length === 0}
          >
            <span>✓ Aplicar Lotes à Conferência</span>
          </button>
        </div>
      </div>
    </div>
  );
};
