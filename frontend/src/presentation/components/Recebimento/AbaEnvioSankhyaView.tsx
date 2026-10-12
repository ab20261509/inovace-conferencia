import React, { useState } from 'react';
import {
  NotaEntrada,
  ObterItensConferenciaResponse,
} from '../../../domain/models/ConferenciaEntrada';
import { Container } from '../Container/Container';
import { FracaoLote } from './ModalGerenciarLotes';
import { SkeletonItens } from './SkeletonItens';
import {
  formatarConferentes,
  formatarDataSimples,
} from './recebimentoHelpers';

export interface GrupoConferenciaPronta {
  key: string;
  conferenciaId: string;
  notas: NotaEntrada[];
  numerosNotas: string;
  fornecedor: string;
  status: string;
  nunotas: number[];
}

export interface AbaEnvioSankhyaViewProps {
  conferenciasProntasAgrupadas: GrupoConferenciaPronta[];
  detalhesConferencias: Record<string, ObterItensConferenciaResponse>;
  loadingDetalhes: string | null;
  conferenciasExpandidas: Record<string, boolean>;
  lotesCustomizadosPorConferencia: Record<
    string,
    Record<number, FracaoLote[]>
  >;
  origemExcelPorConferencia: Record<string, Set<number>>;
  selecionadasEnvio: Set<string>;
  onToggleSelecionar: (chave: string) => void;
  onToggleSelecionarTodas: () => void;
  onEnviarLote: () => void;
  carregarDetalhesConferencia: (
    conferenciaId: string,
    nunotas: number[]
  ) => Promise<void>;
  toggleDetalhesConferencia: (
    conferenciaId: string,
    nunotas: number[],
    cardKey?: string
  ) => void;
  onAbrirImportarExcel: (conferenciaId: string, nunotas: number[]) => void;
  onEditarLotesItem: (itemInfo: {
    nunota: number;
    sequencia: number;
    codprod: number;
    descrprod: string;
    qtdEsperada: number;
    conferenciaId: string;
  }) => void;
  onEnviarSankhya: (
    conferenciaId: string,
    numerosNotas: string,
    nunotas: number[]
  ) => void;
  obterLotesItem: (
    conferenciaId: string,
    item: any,
    bipagens?: any[]
  ) => FracaoLote[];
}

export const AbaEnvioSankhyaView: React.FC<AbaEnvioSankhyaViewProps> = ({
  conferenciasProntasAgrupadas,
  detalhesConferencias,
  loadingDetalhes,
  conferenciasExpandidas,
  lotesCustomizadosPorConferencia,
  origemExcelPorConferencia,
  selecionadasEnvio,
  onToggleSelecionar,
  onToggleSelecionarTodas,
  onEnviarLote,
  carregarDetalhesConferencia,
  toggleDetalhesConferencia,
  onAbrirImportarExcel,
  onEditarLotesItem,
  onEnviarSankhya,
  obterLotesItem,
}) => {
  const [filtroItensEnvio, setFiltroItensEnvio] = useState<
    Record<string, 'todos' | 'semlote' | 'excel' | 'coletor'>
  >({});

  const notasNaoEnviadas = conferenciasProntasAgrupadas.filter(
    (g) => g.status !== 'Enviado ao Sankhya'
  );
  const todasAptasSelecionadas =
    notasNaoEnviadas.length > 0 &&
    notasNaoEnviadas.every((g) => selecionadasEnvio.has(g.key));

  return (
    <div className="gestao-rec-lista">
      {/* Barra de Ações em Lote (Bulk Send) */}
      {notasNaoEnviadas.length > 0 && (
        <div className="gestao-rec-bulk-bar">
          <div className="gestao-bulk-selecao-info">
            <input
              type="checkbox"
              id="bulk-select-all"
              className="gestao-bulk-checkbox"
              checked={todasAptasSelecionadas}
              onChange={onToggleSelecionarTodas}
            />
            <label htmlFor="bulk-select-all" style={{ fontWeight: 600, cursor: 'pointer' }}>
              Selecionar todas as aptas ({notasNaoEnviadas.length} nota{notasNaoEnviadas.length > 1 ? 's' : ''})
            </label>
            {selecionadasEnvio.size > 0 && (
              <span style={{ fontSize: '0.80rem', color: 'var(--primary, #0f766e)', fontWeight: 700 }}>
                • {selecionadasEnvio.size} selecionada{selecionadasEnvio.size > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            type="button"
            className="gestao-btn-bulk-enviar"
            disabled={selecionadasEnvio.size === 0}
            onClick={onEnviarLote}
            title={
              selecionadasEnvio.size === 0
                ? 'Selecione uma ou mais notas para envio'
                : `Enviar ${selecionadasEnvio.size} notas selecionadas ao Sankhya`
            }
          >
            <span>🚀 Enviar Selecionadas ao Sankhya ({selecionadasEnvio.size})</span>
          </button>
        </div>
      )}

      {conferenciasProntasAgrupadas.length === 0 ? (
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
            <span style={{ fontSize: '2.5rem' }}>📦</span>
            <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
              Nenhuma conferência aguardando envio
            </h3>
            <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
              Assim que as conferências forem concluídas ou aprovadas pelo gestor, aparecerão aqui para envio direto ao Sankhya.
            </p>
          </div>
        </Container>
      ) : (
        conferenciasProntasAgrupadas.map((grupo) => {
          const jaEnviado = grupo.status === 'Enviado ao Sankhya';
          const detalhes = grupo.conferenciaId
            ? detalhesConferencias[grupo.conferenciaId]
            : null;
          const isCarregandoDetalhes = loadingDetalhes === grupo.conferenciaId;
          const isExpandido = Boolean(conferenciasExpandidas[grupo.key]);
          const itensDoCard = (detalhes?.itens || []).filter((i) =>
            grupo.nunotas.includes(i.nunota)
          );

          // Validação preventiva dos itens prontos para escrituração
          const totalItens = itensDoCard.length;
          const itensSemLocal = itensDoCard.filter(
            (i) => i.codlocalorig === undefined || i.codlocalorig === null
          );
          const todosLocaisOk = totalItens > 0 && itensSemLocal.length === 0;

          // Validação de múltiplos lotes para a mesma sequência faturada
          const contagemSeqPorProd: Record<number, number> = {};
          itensDoCard.forEach((i) => {
            contagemSeqPorProd[i.codprod] = (contagemSeqPorProd[i.codprod] || 0) + 1;
          });

          const itensMultiplosLotesNaoDesmembrados = itensDoCard.filter((i) => {
            const lotes = obterLotesItem(grupo.conferenciaId, i, detalhes?.bipagens);
            return lotes.length > 1 && (contagemSeqPorProd[i.codprod] || 1) < lotes.length;
          });
          const temBloqueioDesmembramento = itensMultiplosLotesNaoDesmembrados.length > 0;

          const itensComLote = itensDoCard.filter((i) => {
            const lotes = obterLotesItem(
              grupo.conferenciaId,
              i,
              detalhes?.bipagens
            );
            return lotes.length > 0 || !!i.lote;
          }).length;
          const todosLotesOk = totalItens > 0 && itensComLote === totalItens;

          return (
            <div key={grupo.key} className="gestao-rec-card">
              <div className="gestao-rec-card-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {!jaEnviado && (
                    <input
                      type="checkbox"
                      className="gestao-bulk-checkbox"
                      style={{ marginTop: '4px' }}
                      checked={selecionadasEnvio.has(grupo.key)}
                      onChange={() => onToggleSelecionar(grupo.key)}
                      title="Selecionar esta nota para envio em lote"
                    />
                  )}
                  <div className="gestao-rec-card-info">
                    <div className="gestao-rec-card-notas">
                      <span>📄 NF(s): {grupo.numerosNotas}</span>
                    </div>
                    <span className="gestao-rec-card-fornecedor">
                      Fornecedor: {grupo.fornecedor}
                    </span>
                    <span className="gestao-rec-card-meta">
                      Total de Itens Faturados:{' '}
                      {grupo.notas.reduce((acc, n) => acc + (n.qtdItens || 0), 0)}
                    </span>
                  </div>
                </div>

                <div className="gestao-rec-card-badges">
                  {detalhes && totalItens > 0 && (
                    <>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: todosLocaisOk ? '#f0fdf4' : '#fef2f2',
                          color: todosLocaisOk ? '#15803d' : '#b91c1c',
                          border: `1px solid ${todosLocaisOk ? '#bbf7d0' : '#fecaca'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title={
                          todosLocaisOk
                            ? 'Todos os itens possuem Local de Origem definido na TGFITE'
                            : `${itensSemLocal.length} item(ns) sem Local de Origem (CODLOCALORIG) na nota`
                        }
                      >
                        {todosLocaisOk ? '✓ Local Definido' : `⚠️ ${itensSemLocal.length} sem Local`}
                      </span>

                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: todosLotesOk ? '#f0fdf4' : '#fffbeb',
                          color: todosLotesOk ? '#15803d' : '#b45309',
                          border: `1px solid ${todosLotesOk ? '#bbf7d0' : '#fde68a'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title={
                          todosLotesOk
                            ? 'Todos os itens conferidos possuem lote vinculado para o ERP'
                            : `${totalItens - itensComLote} item(ns) ainda sem lote configurado`
                        }
                      >
                        {todosLotesOk ? '✓ Lotes 100% Prontos' : `⚠️ ${totalItens - itensComLote} sem Lote`}
                      </span>
                    </>
                  )}

                  <span
                    className={`badge-status-rec ${
                      jaEnviado
                        ? 'enviado'
                        : grupo.status === 'Aguardando Aprovação'
                        ? 'aguardando'
                        : 'conferido'
                    }`}
                  >
                    {grupo.status}
                  </span>
                </div>
              </div>

              {/* Checklist Pré-Envio Visual (Garante Integridade no ERP) */}
              <div className="gestao-rec-checklist-pre-envio">
                <div
                  className={`gestao-checklist-item ${
                    jaEnviado || grupo.status === 'Conferido' ? 'ok' : 'alerta'
                  }`}
                >
                  <span>{jaEnviado || grupo.status === 'Conferido' ? '✓' : '⚠️'}</span>
                  <span>
                    {jaEnviado
                      ? 'Integrado no Sankhya'
                      : grupo.status === 'Conferido'
                      ? 'Quantidades Físicas 100% OK'
                      : 'Aguardando Aprovação Gerencial'}
                  </span>
                </div>
                <div
                  className={`gestao-checklist-item ${
                    todosLotesOk || jaEnviado ? 'ok' : 'alerta'
                  }`}
                >
                  <span>{todosLotesOk || jaEnviado ? '✓' : '⚠️'}</span>
                  <span>
                    {todosLotesOk || jaEnviado
                      ? 'Lotes e Validades Configurados'
                      : `${totalItens - itensComLote} Itens sem Lote`}
                  </span>
                </div>
                <div
                  className={`gestao-checklist-item ${
                    todosLocaisOk || jaEnviado ? 'ok' : 'alerta'
                  }`}
                >
                  <span>{todosLocaisOk || jaEnviado ? '✓' : '⚠️'}</span>
                  <span>
                    {todosLocaisOk || jaEnviado
                      ? 'Locais de Estoque (TGFITE.CODLOCALORIG) OK'
                      : `${itensSemLocal.length} Item(ns) sem Local de Estoque`}
                  </span>
                </div>
                {temBloqueioDesmembramento && (
                  <div
                    className="gestao-checklist-item alerta"
                    style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}
                  >
                    <span>⚠️</span>
                    <span>
                      {itensMultiplosLotesNaoDesmembrados.length} produto(s) requerem desmembramento de linha no Sankhya
                    </span>
                  </div>
                )}
              </div>

              {/* Seção de Itens / Cruzamento de Lotes e Importação Excel */}
              {grupo.conferenciaId && (
                <div style={{ marginTop: '10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      marginBottom: '8px',
                    }}
                  >
                    <button
                      type="button"
                      className="gestao-btn-acao gestao-btn-csv"
                      onClick={async () => {
                        if (!detalhes && !isCarregandoDetalhes) {
                          await carregarDetalhesConferencia(
                            grupo.conferenciaId,
                            grupo.nunotas
                          );
                        }
                        toggleDetalhesConferencia(
                          grupo.conferenciaId,
                          grupo.nunotas,
                          grupo.key
                        );
                      }}
                    >
                      <span>
                        {detalhes && isExpandido
                          ? '▲ Ocultar Itens da NF'
                          : '🔍 Ver Cruzamento de Lotes & Itens da NF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="gestao-btn-acao gestao-btn-csv"
                      style={{ borderColor: '#3b82f6', color: '#1d4ed8' }}
                      onClick={async () => {
                        if (!detalhes) {
                          await carregarDetalhesConferencia(
                            grupo.conferenciaId,
                            grupo.nunotas
                          );
                        }
                        onAbrirImportarExcel(grupo.conferenciaId, grupo.nunotas);
                      }}
                    >
                      <span>📥 Importar Lotes (Excel)</span>
                    </button>
                  </div>

                  {isCarregandoDetalhes ? (
                    <SkeletonItens
                      linhas={4}
                      mensagem="Carregando dados dos lotes e itens para envio..."
                    />
                  ) : detalhes && isExpandido ? (
                    (() => {
                      const filtroItens = filtroItensEnvio[grupo.key] || 'todos';
                      const itensSemLote = itensDoCard.filter((item) => {
                        const lotes = obterLotesItem(
                          grupo.conferenciaId,
                          item,
                          detalhes.bipagens
                        );
                        return lotes.length === 0 && !item.lote;
                      });
                      const itensExcel = itensDoCard.filter((item) =>
                        origemExcelPorConferencia[grupo.conferenciaId]?.has(item.codprod)
                      );
                      const itensColetor = itensDoCard.filter(
                        (item) => !origemExcelPorConferencia[grupo.conferenciaId]?.has(item.codprod)
                      );
                      const itensParaExibir =
                        filtroItens === 'semlote'
                          ? itensSemLote
                          : filtroItens === 'excel'
                          ? itensExcel
                          : filtroItens === 'coletor'
                          ? itensColetor
                          : itensDoCard;

                      return (
                        <>
                          {/* Barra de Mini-Filtros Rápidos dos Itens para Envio */}
                          <div className="gestao-itens-mini-filtro-bar">
                            <div className="gestao-itens-mini-chips">
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'todos' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'todos',
                                  }))
                                }
                              >
                                Todos ({itensDoCard.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'semlote' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'semlote',
                                  }))
                                }
                              >
                                ⚠️ Sem Lote ({itensSemLote.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'excel' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'excel',
                                  }))
                                }
                              >
                                📊 Excel ({itensExcel.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'coletor' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'coletor',
                                  }))
                                }
                              >
                                📱 Coletor ({itensColetor.length})
                              </button>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                              Exibindo <strong>{itensParaExibir.length}</strong> de{' '}
                              {itensDoCard.length} itens
                            </span>
                          </div>
                      {/* Tabela Desktop */}
                      <div className="gestao-rec-tabela-desktop">
                        <table className="gestao-rec-tabela">
                          <thead>
                            <tr>
                              <th>Produto</th>
                              <th>Vol.</th>
                              <th>Nota</th>
                              <th>N1</th>
                              <th>N2</th>
                              {itensDoCard.some(
                                (i) => (i.qtdConferidaN3 || 0) > 0
                              ) && <th>N3</th>}
                              <th>Diferença</th>
                              <th>Local</th>
                              <th>Lote</th>
                              <th>Validade</th>
                              <th>Fabricação</th>
                              <th>Conferentes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensParaExibir.map((item) => {
                              const qtdNivel =
                                (item.qtdConferidaN3 || 0) > 0
                                  ? item.qtdConferidaN3 || 0
                                  : (item.qtdConferidaN2 || 0) > 0
                                  ? item.qtdConferidaN2 || 0
                                  : item.qtdConferidaN1 || 0;
                              const diferenca =
                                item.diferenca !== undefined
                                  ? item.diferenca
                                  : qtdNivel - (item.qtdneg || 0);
                              const classeDif =
                                diferenca < 0
                                  ? 'falta'
                                  : diferenca > 0
                                  ? 'sobra'
                                  : 'ok';

                              const lotesDoItem = obterLotesItem(
                                grupo.conferenciaId,
                                item,
                                detalhes.bipagens
                              );
                              const temMultiplosLotes = lotesDoItem.length > 1;
                              const isVeioExcel = origemExcelPorConferencia[
                                grupo.conferenciaId
                              ]?.has(item.codprod);

                              return (
                                <tr
                                  key={`sankhya-${item.nunota}-${item.codprod}-${item.sequencia}`}
                                >
                                  <td>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        color: 'var(--slate-900)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '280px',
                                      }}
                                      title={item.descrprod}
                                    >
                                      {item.descrprod ||
                                        `Produto ${item.codprod}`}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.72rem',
                                        color: 'var(--slate-500)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Cód: {item.codprod}
                                      {item.refforn
                                        ? ` • Ref: ${item.refforn}`
                                        : item.referencia
                                        ? ` • Ref: ${item.referencia}`
                                        : ''}
                                      {item.codbarra
                                        ? ` • EAN: ${item.codbarra}`
                                        : ''}
                                    </div>
                                  </td>
                                  <td>{item.codvol || 'UN'}</td>
                                  <td>
                                    <strong>{item.qtdneg ?? '—'}</strong>
                                  </td>
                                  <td>{item.qtdConferidaN1 || 0}</td>
                                  <td>{item.qtdConferidaN2 || 0}</td>
                                  {itensDoCard.some(
                                    (i) => (i.qtdConferidaN3 || 0) > 0
                                  ) && <td>{item.qtdConferidaN3 || 0}</td>}
                                  <td>
                                    <span
                                      className={`pill-contagem-status ${classeDif}`}
                                    >
                                      {diferenca === 0
                                        ? '✓ OK'
                                        : diferenca < 0
                                        ? `⚠️ ${diferenca}`
                                        : `+${diferenca}`}
                                    </span>
                                  </td>
                                  <td>
                                    {item.codlocalorig !== undefined && item.codlocalorig !== null ? (
                                      <span
                                        style={{
                                          fontSize: '0.8rem',
                                          fontWeight: 600,
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: 'var(--slate-100)',
                                          border: '1px solid var(--slate-200)',
                                          color: 'var(--slate-800)',
                                        }}
                                        title={`Local de Estoque de Origem: ${item.codlocalorig}`}
                                      >
                                        📍 {item.codlocalorig}
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: '#fef2f2',
                                          border: '1px solid #fecaca',
                                          color: '#b91c1c',
                                        }}
                                        title="Item sem Local de Origem na TGFITE. Necessário preencher no Sankhya antes do envio."
                                      >
                                        ⚠️ Sem Local
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {temMultiplosLotes ? (
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                        }}
                                      >
                                        <span
                                          title={
                                            isVeioExcel
                                              ? 'Importado via Excel'
                                              : 'Conferido pelo coletor'
                                          }
                                        >
                                          {isVeioExcel ? '📊' : '📱'}
                                        </span>
                                        <span
                                          className="badge-status-rec enviado"
                                          style={{
                                            fontSize: '0.72rem',
                                            padding: '1px 5px',
                                          }}
                                          title={lotesDoItem
                                            .map(
                                              (l) => `${l.lote} (${l.qtd} un)`
                                            )
                                            .join(', ')}
                                        >
                                          ✂️ {lotesDoItem.length} lotes
                                        </span>
                                        <button
                                          type="button"
                                          className="gestao-rec-btn-refresh"
                                          style={{
                                            padding: '1px 5px',
                                            fontSize: '0.70rem',
                                            lineHeight: 1,
                                          }}
                                          title="Gerenciar / Dividir lotes"
                                          onClick={() =>
                                            onEditarLotesItem({
                                              nunota: item.nunota,
                                              sequencia: item.sequencia,
                                              codprod: item.codprod,
                                              descrprod:
                                                item.descrprod ||
                                                `Produto ${item.codprod}`,
                                              qtdEsperada: item.qtdneg || 0,
                                              conferenciaId:
                                                grupo.conferenciaId,
                                            })
                                          }
                                        >
                                          ✂️
                                        </button>
                                      </div>
                                    ) : lotesDoItem.length === 1 ? (
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                        }}
                                      >
                                        <span
                                          title={
                                            isVeioExcel
                                              ? 'Importado via Excel'
                                              : 'Conferido pelo coletor'
                                          }
                                        >
                                          {isVeioExcel ? '📊' : '📱'}
                                        </span>
                                        <strong
                                          style={{ color: 'var(--slate-800)' }}
                                        >
                                          {lotesDoItem[0].lote}
                                        </strong>
                                        <button
                                          type="button"
                                          className="gestao-rec-btn-refresh"
                                          style={{
                                            padding: '1px 5px',
                                            fontSize: '0.70rem',
                                            lineHeight: 1,
                                          }}
                                          title="Dividir lote ou alterar"
                                          onClick={() =>
                                            onEditarLotesItem({
                                              nunota: item.nunota,
                                              sequencia: item.sequencia,
                                              codprod: item.codprod,
                                              descrprod:
                                                item.descrprod ||
                                                `Produto ${item.codprod}`,
                                              qtdEsperada: item.qtdneg || 0,
                                              conferenciaId:
                                                grupo.conferenciaId,
                                            })
                                          }
                                        >
                                          ✂️
                                        </button>
                                      </div>
                                    ) : item.lote ? (
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                        }}
                                      >
                                        <span
                                          title={
                                            isVeioExcel
                                              ? 'Importado via Excel'
                                              : 'Conferido pelo coletor'
                                          }
                                        >
                                          {isVeioExcel ? '📊' : '📱'}
                                        </span>
                                        <strong
                                          style={{ color: 'var(--slate-800)' }}
                                        >
                                          {item.lote}
                                        </strong>
                                        <button
                                          type="button"
                                          className="gestao-rec-btn-refresh"
                                          style={{
                                            padding: '1px 5px',
                                            fontSize: '0.70rem',
                                            lineHeight: 1,
                                          }}
                                          title="Dividir lote ou alterar"
                                          onClick={() =>
                                            onEditarLotesItem({
                                              nunota: item.nunota,
                                              sequencia: item.sequencia,
                                              codprod: item.codprod,
                                              descrprod:
                                                item.descrprod ||
                                                `Produto ${item.codprod}`,
                                              qtdEsperada: item.qtdneg || 0,
                                              conferenciaId:
                                                grupo.conferenciaId,
                                            })
                                          }
                                        >
                                          ✂️
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: 'var(--slate-400)',
                                            fontSize: '0.8rem',
                                          }}
                                        >
                                          Sem lote
                                        </span>
                                        <button
                                          type="button"
                                          className="gestao-rec-btn-refresh"
                                          style={{
                                            padding: '1px 5px',
                                            fontSize: '0.70rem',
                                            lineHeight: 1,
                                          }}
                                          title="Adicionar lote / Dividir item"
                                          onClick={() =>
                                            onEditarLotesItem({
                                              nunota: item.nunota,
                                              sequencia: item.sequencia,
                                              codprod: item.codprod,
                                              descrprod:
                                                item.descrprod ||
                                                `Produto ${item.codprod}`,
                                              qtdEsperada: item.qtdneg || 0,
                                              conferenciaId:
                                                grupo.conferenciaId,
                                            })
                                          }
                                        >
                                          + Lote
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {temMultiplosLotes ? (
                                      <span style={{ fontSize: '0.78rem' }}>
                                        {Array.from(
                                          new Set(
                                            lotesDoItem
                                              .map((l) =>
                                                formatarDataSimples(l.validade)
                                              )
                                              .filter((v) => v !== '—')
                                          )
                                        ).join(', ') || (
                                          <span
                                            style={{ color: 'var(--slate-400)' }}
                                          >
                                            —
                                          </span>
                                        )}
                                      </span>
                                    ) : lotesDoItem.length === 1 ? (
                                      <span>
                                        {formatarDataSimples(
                                          lotesDoItem[0].validade
                                        )}
                                      </span>
                                    ) : item.validade ? (
                                      <span>
                                        {formatarDataSimples(item.validade)}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--slate-400)' }}>
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {temMultiplosLotes ? (
                                      <span style={{ fontSize: '0.78rem' }}>
                                        {Array.from(
                                          new Set(
                                            lotesDoItem
                                              .map((l) =>
                                                formatarDataSimples(l.fabricacao)
                                              )
                                              .filter((v) => v !== '—')
                                          )
                                        ).join(', ') || (
                                          <span
                                            style={{ color: 'var(--slate-400)' }}
                                          >
                                            —
                                          </span>
                                        )}
                                      </span>
                                    ) : lotesDoItem.length === 1 ? (
                                      <span>
                                        {formatarDataSimples(
                                          lotesDoItem[0].fabricacao
                                        )}
                                      </span>
                                    ) : item.fabricacao ? (
                                      <span>
                                        {formatarDataSimples(item.fabricacao)}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--slate-400)' }}>
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      fontSize: '0.75rem',
                                      color: 'var(--slate-600)',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {formatarConferentes(item)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Cards Mobile Padronizados (<= 1024px) */}
                      <div
                        className="gestao-rec-itens-mobile"
                        style={{ marginTop: '8px' }}
                      >
                        {itensParaExibir.map((item) => {
                          const qtdNivel =
                            (item.qtdConferidaN3 || 0) > 0
                              ? item.qtdConferidaN3 || 0
                              : (item.qtdConferidaN2 || 0) > 0
                              ? item.qtdConferidaN2 || 0
                              : item.qtdConferidaN1 || 0;
                          const diferenca =
                            item.diferenca !== undefined
                              ? item.diferenca
                              : qtdNivel - (item.qtdneg || 0);
                          const classeDif =
                            diferenca < 0
                              ? 'falta'
                              : diferenca > 0
                              ? 'sobra'
                              : 'ok';

                          const lotesDoItem = obterLotesItem(
                            grupo.conferenciaId,
                            item,
                            detalhes.bipagens
                          );
                          const temMultiplosLotes = lotesDoItem.length > 1;
                          const isVeioExcel = origemExcelPorConferencia[
                            grupo.conferenciaId
                          ]?.has(item.codprod);

                          return (
                            <div
                              key={`sankhya-mob-${item.nunota}-${item.codprod}-${item.sequencia}`}
                              className="gestao-item-card-mobile"
                            >
                              <div className="gestao-item-mobile-header">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="gestao-item-mobile-descr">
                                    {item.descrprod || `Produto ${item.codprod}`}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--slate-500)',
                                    }}
                                  >
                                    Cód: {item.codprod}
                                    {item.refforn
                                      ? ` • Ref: ${item.refforn}`
                                      : item.referencia
                                      ? ` • Ref: ${item.referencia}`
                                      : ''}{' '}
                                    • Vol: {item.codvol || 'UN'}
                                    {item.codbarra
                                      ? ` • EAN: ${item.codbarra}`
                                      : ''}
                                  </div>
                                </div>
                                <span
                                  className={`pill-contagem-status ${classeDif}`}
                                >
                                  {diferenca === 0
                                    ? '✓ OK'
                                    : diferenca < 0
                                    ? `⚠️ ${diferenca}`
                                    : `+${diferenca}`}
                                </span>
                              </div>

                              <div className="gestao-item-mobile-grid">
                                <div>
                                  Nota: <strong>{item.qtdneg ?? '—'}</strong>
                                </div>
                                <div>
                                  N1: <strong>{item.qtdConferidaN1 || 0}</strong>
                                </div>
                                <div>
                                  N2: <strong>{item.qtdConferidaN2 || 0}</strong>
                                </div>
                                {(item.qtdConferidaN3 || 0) > 0 && (
                                  <div>
                                    N3:{' '}
                                    <strong>{item.qtdConferidaN3 || 0}</strong>
                                  </div>
                                )}
                                <div>
                                  Local:{' '}
                                  {item.codlocalorig !== undefined && item.codlocalorig !== null ? (
                                    <strong style={{ color: 'var(--slate-800)' }}>📍 {item.codlocalorig}</strong>
                                  ) : (
                                    <strong style={{ color: '#b91c1c' }}>⚠️ Sem Local</strong>
                                  )}
                                </div>
                              </div>

                              <div
                                className="gestao-item-mobile-lote-info"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <span
                                    title={
                                      isVeioExcel
                                        ? 'Importado via Excel'
                                        : 'Conferido pelo coletor'
                                    }
                                  >
                                    {isVeioExcel ? '📊' : '📱'}
                                  </span>
                                  {temMultiplosLotes ? (
                                    <span>
                                      {lotesDoItem.length} lotes (
                                      {lotesDoItem.map((l) => l.lote).join(', ')})
                                    </span>
                                  ) : lotesDoItem.length === 1 ? (
                                    <span>
                                      Lote: {lotesDoItem[0].lote}
                                      {lotesDoItem[0].validade
                                        ? ` • Val: ${formatarDataSimples(
                                            lotesDoItem[0].validade
                                          )}`
                                        : ''}
                                      {lotesDoItem[0].fabricacao
                                        ? ` • Fab: ${formatarDataSimples(
                                            lotesDoItem[0].fabricacao
                                          )}`
                                        : ''}
                                    </span>
                                  ) : item.lote ? (
                                    <span>
                                      Lote: {item.lote}
                                      {item.validade
                                        ? ` • Val: ${formatarDataSimples(
                                            item.validade
                                          )}`
                                        : ''}
                                      {item.fabricacao
                                        ? ` • Fab: ${formatarDataSimples(
                                            item.fabricacao
                                          )}`
                                        : ''}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--slate-400)' }}>
                                      Sem lote
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  className="gestao-rec-btn-refresh"
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '0.74rem',
                                  }}
                                  onClick={() =>
                                    onEditarLotesItem({
                                      nunota: item.nunota,
                                      sequencia: item.sequencia,
                                      codprod: item.codprod,
                                      descrprod:
                                        item.descrprod ||
                                        `Produto ${item.codprod}`,
                                      qtdEsperada: item.qtdneg || 0,
                                      conferenciaId: grupo.conferenciaId,
                                    })
                                  }
                                >
                                  ✂️{' '}
                                  {temMultiplosLotes
                                    ? 'Gerenciar'
                                    : 'Dividir / Lote'}
                                </button>
                              </div>

                              {(item.conferenteN1 ||
                                item.conferenteN2 ||
                                item.conferenteN3) && (
                                <div
                                  style={{
                                    fontSize: '0.70rem',
                                    color: 'var(--slate-500)',
                                    marginTop: '-2px',
                                  }}
                                >
                                  {formatarConferentes(item)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()
              ) : null}
            </div>
              )}

              {/* Ações de Envio */}
              <div className="gestao-rec-card-acoes">
                {!jaEnviado ? (
                  <button
                    type="button"
                    className="gestao-btn-acao gestao-btn-enviar-sankhya"
                    onClick={() =>
                      onEnviarSankhya(
                        grupo.conferenciaId,
                        grupo.numerosNotas,
                        grupo.nunotas
                      )
                    }
                  >
                    <span>🚀 Aprovar & Enviar ao Sankhya</span>
                  </button>
                ) : (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#6d28d9',
                      fontWeight: 600,
                    }}
                  >
                    ✓ Esta conferência já foi sincronizada com o ERP Sankhya com sucesso.
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
