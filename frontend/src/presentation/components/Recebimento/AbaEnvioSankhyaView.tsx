import React from 'react';
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
  carregarDetalhesConferencia,
  toggleDetalhesConferencia,
  onAbrirImportarExcel,
  onEditarLotesItem,
  onEnviarSankhya,
  obterLotesItem,
}) => {
  return (
    <div className="gestao-rec-lista">
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

                <div className="gestao-rec-card-badges">
                  {detalhes && totalItens > 0 && (
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
                    <>
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
                              <th>Lote</th>
                              <th>Validade</th>
                              <th>Fabricação</th>
                              <th>Conferentes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensDoCard.map((item) => {
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
                                      className={`diferenca-badge ${classeDif}`}
                                    >
                                      {diferenca > 0 ? `+${diferenca}` : diferenca}
                                    </span>
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
                        {itensDoCard.map((item) => {
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
                                <span className={`diferenca-badge ${classeDif}`}>
                                  {diferenca > 0 ? `+${diferenca}` : diferenca}
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
