import React from 'react';
import {
  ConferenciaEntradaResumo,
  ObterItensConferenciaResponse,
} from '../../../domain/models/ConferenciaEntrada';
import { Container } from '../Container/Container';
import { SkeletonItens } from './SkeletonItens';
import {
  getStatusBadgeClass,
  formatarConferentes,
  formatarDataSimples,
} from './recebimentoHelpers';

export type FiltroStatusConferencia =
  | 'todas'
  | 'em_andamento'
  | 'recontagem'
  | 'concluidas'
  | 'com_backup';

export interface AbaConferenciasViewProps {
  conferenciasFiltradas: ConferenciaEntradaResumo[];
  filtroStatus: FiltroStatusConferencia;
  setFiltroStatus: (filtro: FiltroStatusConferencia) => void;
  contagensFiltros: {
    todas: number;
    emAndamento: number;
    recontagem: number;
    concluidas: number;
    comBackup: number;
  };
  buscaTexto: string;
  setBuscaTexto: (texto: string) => void;
  conferenciasExpandidas: Record<string, boolean>;
  detalhesConferencias: Record<string, ObterItensConferenciaResponse>;
  loadingDetalhes: string | null;
  toggleDetalhesConferencia: (conferenciaId: string, nunotas: number[]) => void;
  onSolicitarRecontagem: (conf: ConferenciaEntradaResumo) => void;
  onReiniciar: (conf: ConferenciaEntradaResumo) => void;
  onRecuperarContagem: (conf: ConferenciaEntradaResumo) => void;
  onAbrirColetor: (conf: ConferenciaEntradaResumo) => void;
}

export const AbaConferenciasView: React.FC<AbaConferenciasViewProps> = ({
  conferenciasFiltradas,
  filtroStatus,
  setFiltroStatus,
  contagensFiltros,
  buscaTexto,
  setBuscaTexto,
  conferenciasExpandidas,
  detalhesConferencias,
  loadingDetalhes,
  toggleDetalhesConferencia,
  onSolicitarRecontagem,
  onReiniciar,
  onRecuperarContagem,
  onAbrirColetor,
}) => {
  return (
    <div className="gestao-rec-lista">
      {/* Filtros e Barra de Busca */}
      <div className="gestao-rec-filtro-bar">
        <div className="gestao-rec-filtros-chips">
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatus === 'todas' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatus('todas')}
          >
            Todas <span className="chip-count">{contagensFiltros.todas}</span>
          </button>
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatus === 'em_andamento' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatus('em_andamento')}
          >
            Em Andamento <span className="chip-count">{contagensFiltros.emAndamento}</span>
          </button>
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatus === 'recontagem' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatus('recontagem')}
          >
            Recontagem / Pendente <span className="chip-count">{contagensFiltros.recontagem}</span>
          </button>
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatus === 'concluidas' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatus('concluidas')}
          >
            Concluídas <span className="chip-count">{contagensFiltros.concluidas}</span>
          </button>
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatus === 'com_backup' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatus('com_backup')}
            title="Conferências que foram reiniciadas e possuem contagem anterior recuperável"
          >
            💾 Com Backup <span className="chip-count">{contagensFiltros.comBackup}</span>
          </button>
        </div>

        <input
          type="text"
          className="gestao-rec-busca-input"
          placeholder="Buscar por NF, fornecedor ou conferente..."
          value={buscaTexto}
          onChange={(e) => setBuscaTexto(e.target.value)}
        />
      </div>

      {conferenciasFiltradas.length === 0 ? (
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
            <span style={{ fontSize: '2.5rem' }}>🔍</span>
            <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
              Nenhuma conferência encontrada
            </h3>
            <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
              Nenhuma conferência corresponde aos filtros ou critério de busca selecionados.
            </p>
          </div>
        </Container>
      ) : (
        conferenciasFiltradas.map((conf) => {
          const statusClasse = getStatusBadgeClass(conf.status);
          const isExpandido = !!conferenciasExpandidas[conf.id];
          const isCarregandoDetalhes = loadingDetalhes === conf.id;
          const detalhes = detalhesConferencias[conf.id];

          return (
            <div key={conf.id} className="gestao-rec-card">
              {/* Cabeçalho */}
              <div className="gestao-rec-card-header">
                <div className="gestao-rec-card-info">
                  <div className="gestao-rec-card-notas">
                    <span>📄 NF(s): {conf.numerosNotas}</span>
                  </div>
                  <span className="gestao-rec-card-fornecedor">
                    Fornecedor: {conf.fornecedor}
                  </span>
                  <span className="gestao-rec-card-meta">
                    Conferente: {conf.conferente || '—'} • Iniciado em:{' '}
                    {new Date(conf.criadoEm).toLocaleString('pt-BR')}
                    {conf.finalizadoEm &&
                      ` • Concluído em: ${new Date(conf.finalizadoEm).toLocaleString('pt-BR')}`}
                  </span>
                </div>

                <div className="gestao-rec-card-badges">
                  <span className="badge-nivel-rec">Nível Atual: N{conf.nivelAtual}</span>
                  <span className={`badge-status-rec ${statusClasse}`}>
                    {conf.status}
                  </span>
                  {conf.temBackupContagem && (
                    <span
                      className="badge-backup-recuperavel"
                      title={`Contagem anterior arquivada com ${conf.backupContagem?.totalBipagensAnuladas || 0} itens. Pode ser recuperada a qualquer momento.`}
                    >
                      💾 Backup Recuperável ({conf.backupContagem?.totalBipagensAnuladas || 0})
                    </span>
                  )}
                </div>
              </div>

              {/* Detalhamento de Status Individual por Nota (para conferências agrupadas) */}
              {conf.statusPorNota && Object.keys(conf.statusPorNota).length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'var(--slate-50, #f8fafc)',
                    borderBottom: '1px solid var(--slate-200, #e2e8f0)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--slate-600, #475569)' }}>
                    Status por Nota:
                  </span>
                  {Object.entries(conf.statusPorNota).map(([nunotaStr, st]) => (
                    <span
                      key={nunotaStr}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span style={{ color: 'var(--slate-700, #334155)' }}>
                        NUNOTA {nunotaStr}:
                      </span>
                      <span
                        className={`badge-status-rec ${getStatusBadgeClass(st)}`}
                        style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                      >
                        {st}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Aviso de Backup Disponível */}
              {conf.temBackupContagem && conf.backupContagem && (
                <div className="gestao-card-backup-aviso">
                  <span style={{ fontSize: '1.2rem' }}>💾</span>
                  <div>
                    <strong>Backup de Contagem Disponível:</strong> Esta conferência foi reiniciada em{' '}
                    {new Date(conf.backupContagem.reiniciadoEm).toLocaleString('pt-BR')} por{' '}
                    <strong>{conf.backupContagem.reiniciadoPor}</strong>. Status anterior:{' '}
                    <em>
                      {conf.backupContagem.statusAnterior} (N{conf.backupContagem.nivelAnterior})
                    </em>
                    . Foram guardadas <strong>{conf.backupContagem.totalBipagensAnuladas} bipagens</strong>.
                    {conf.backupContagem.motivo && (
                      <div>Motivo registrado: "{conf.backupContagem.motivo}"</div>
                    )}
                  </div>
                </div>
              )}

              {/* Resumo de Contagem */}
              <div className="gestao-rec-contagem-resumo">
                <div className="contagem-box">
                  <span className="contagem-rotulo">Itens Faturados</span>
                  <span className="contagem-valor">{conf.totalItens}</span>
                </div>
                <div className="contagem-box">
                  <span className="contagem-rotulo">Contagem N1</span>
                  <span className="contagem-valor">{conf.totalBipadoN1}</span>
                </div>
                <div className="contagem-box">
                  <span className="contagem-rotulo">Contagem N2</span>
                  <span className="contagem-valor">{conf.totalBipadoN2}</span>
                </div>
                {conf.totalBipadoN3 > 0 && (
                  <div className="contagem-box">
                    <span className="contagem-rotulo">Contagem N3</span>
                    <span className="contagem-valor">{conf.totalBipadoN3}</span>
                  </div>
                )}
                {conf.temBackupContagem && conf.backupContagem && (
                  <div className="contagem-box">
                    <span className="contagem-rotulo">Itens em Backup</span>
                    <span className="contagem-valor" style={{ color: '#854d0e' }}>
                      {conf.backupContagem.totalBipagensAnuladas}
                    </span>
                  </div>
                )}
              </div>

              {/* Tabela de Itens Expandida */}
              {isExpandido && (
                <div style={{ marginTop: '8px' }}>
                  {isCarregandoDetalhes ? (
                    <SkeletonItens linhas={4} mensagem="Carregando dados dos itens e contagens..." />
                  ) : detalhes ? (
                    <>
                      <div className="gestao-rec-tabela-desktop">
                        <table className="gestao-rec-tabela">
                          <thead>
                            <tr>
                              <th>Produto</th>
                              <th>Vol.</th>
                              <th>Nota</th>
                              <th>N1</th>
                              <th>N2</th>
                              {(conf.totalBipadoN3 > 0 ||
                                detalhes.itens.some((i) => (i.qtdConferidaN3 || 0) > 0)) && (
                                <th>N3</th>
                              )}
                              <th>Diferença</th>
                              <th>Lote</th>
                              <th>Validade</th>
                              <th>Fabricação</th>
                              <th>Conferentes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalhes.itens.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={11}
                                  style={{ textAlign: 'center', color: 'var(--slate-400)' }}
                                >
                                  Nenhum item faturado encontrado para esta conferência.
                                </td>
                              </tr>
                            ) : (
                              detalhes.itens.map((item) => {
                                const diferenca =
                                  item.diferenca !== undefined
                                    ? item.diferenca
                                    : ((item.qtdConferidaN3 || 0) > 0
                                        ? item.qtdConferidaN3 || 0
                                        : (item.qtdConferidaN2 || 0) > 0
                                        ? item.qtdConferidaN2 || 0
                                        : item.qtdConferidaN1 || 0) - (item.qtdneg || 0);
                                const classeDif =
                                  diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';

                                return (
                                  <tr key={`conf-${item.nunota}-${item.codprod}-${item.sequencia}`}>
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
                                        {item.descrprod || `Produto ${item.codprod}`}
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
                                        {item.codbarra ? ` • EAN: ${item.codbarra}` : ''}
                                      </div>
                                    </td>
                                    <td>{item.codvol || 'UN'}</td>
                                    <td>
                                      <strong>{item.qtdneg ?? '—'}</strong>
                                    </td>
                                    <td>{item.qtdConferidaN1 || 0}</td>
                                    <td>{item.qtdConferidaN2 || 0}</td>
                                    {(conf.totalBipadoN3 > 0 ||
                                      detalhes.itens.some((i) => (i.qtdConferidaN3 || 0) > 0)) && (
                                      <td>{item.qtdConferidaN3 || 0}</td>
                                    )}
                                    <td>
                                      <span className={`diferenca-badge ${classeDif}`}>
                                        {diferenca > 0 ? `+${diferenca}` : diferenca}
                                      </span>
                                    </td>
                                    <td>
                                      {item.lote ? (
                                        <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                                          {item.lote}
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--slate-400)' }}>—</span>
                                      )}
                                    </td>
                                    <td>
                                      {item.validade ? (
                                        <span>{formatarDataSimples(item.validade)}</span>
                                      ) : (
                                        <span style={{ color: 'var(--slate-400)' }}>—</span>
                                      )}
                                    </td>
                                    <td>
                                      {item.fabricacao ? (
                                        <span>{formatarDataSimples(item.fabricacao)}</span>
                                      ) : (
                                        <span style={{ color: 'var(--slate-400)' }}>—</span>
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
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Cards Mobile Padronizados (<= 1024px) */}
                      <div className="gestao-rec-itens-mobile" style={{ marginTop: '8px' }}>
                        {detalhes.itens.length === 0 ? (
                          <div
                            style={{
                              textAlign: 'center',
                              color: 'var(--slate-400)',
                              padding: '12px',
                            }}
                          >
                            Nenhum item faturado encontrado para esta conferência.
                          </div>
                        ) : (
                          detalhes.itens.map((item) => {
                            const diferenca =
                              item.diferenca !== undefined
                                ? item.diferenca
                                : ((item.qtdConferidaN3 || 0) > 0
                                    ? item.qtdConferidaN3 || 0
                                    : (item.qtdConferidaN2 || 0) > 0
                                    ? item.qtdConferidaN2 || 0
                                    : item.qtdConferidaN1 || 0) - (item.qtdneg || 0);
                            const classeDif =
                              diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';

                            return (
                              <div
                                key={`conf-mob-${item.nunota}-${item.codprod}-${item.sequencia}`}
                                className="gestao-item-card-mobile"
                              >
                                <div className="gestao-item-mobile-header">
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="gestao-item-mobile-descr">
                                      {item.descrprod || `Produto ${item.codprod}`}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                                      Cód: {item.codprod}
                                      {item.refforn
                                        ? ` • Ref: ${item.refforn}`
                                        : item.referencia
                                        ? ` • Ref: ${item.referencia}`
                                        : ''}{' '}
                                      • Vol: {item.codvol || 'UN'}
                                      {item.codbarra ? ` • EAN: ${item.codbarra}` : ''}
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
                                  {(conf.totalBipadoN3 > 0 || (item.qtdConferidaN3 || 0) > 0) && (
                                    <div>
                                      N3: <strong>{item.qtdConferidaN3 || 0}</strong>
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
                                    gap: '4px',
                                  }}
                                >
                                  <div>
                                    {item.lote ? `Lote: ${item.lote}` : 'Sem lote'}
                                    {item.validade
                                      ? ` • Val: ${formatarDataSimples(item.validade)}`
                                      : ''}
                                    {item.fabricacao
                                      ? ` • Fab: ${formatarDataSimples(item.fabricacao)}`
                                      : ''}
                                  </div>
                                  {(item.conferenteN1 ||
                                    item.conferenteN2 ||
                                    item.conferenteN3) && (
                                    <div
                                      style={{
                                        fontSize: '0.70rem',
                                        color: 'var(--slate-500)',
                                      }}
                                    >
                                      {formatarConferentes(item)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* Ações da Conferência */}
              <div className="gestao-rec-card-acoes">
                {/* 1. Solicitar Recontagem */}
                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-recontar"
                  onClick={() => onSolicitarRecontagem(conf)}
                >
                  <span>🔁 Solicitar Recontagem</span>
                </button>

                {/* 2. Reiniciar Conferência */}
                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-reiniciar"
                  onClick={() => onReiniciar(conf)}
                >
                  <span>↺ Reiniciar</span>
                </button>

                {/* 3. Recuperar Contagem Anterior (se houver backup) */}
                {conf.temBackupContagem && (
                  <button
                    type="button"
                    className="gestao-btn-acao gestao-btn-recuperar"
                    onClick={() => onRecuperarContagem(conf)}
                  >
                    <span>
                      💾 Recuperar Contagem ({conf.backupContagem?.totalBipagensAnuladas})
                    </span>
                  </button>
                )}

                {/* 4. Ver / Ocultar Itens */}
                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-csv"
                  onClick={() => toggleDetalhesConferencia(conf.id, conf.nunotas)}
                >
                  <span>{isExpandido ? '▲ Ocultar Itens' : '🔍 Ver Bipagens'}</span>
                </button>

                {/* 5. Abrir no Coletor */}
                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-coletor"
                  onClick={() => onAbrirColetor(conf)}
                >
                  <span>📱 Abrir no Coletor</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
