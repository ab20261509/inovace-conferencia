import React, { useState } from 'react';
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
  const [filtroItensCards, setFiltroItensCards] = useState<
    Record<string, 'todos' | 'divergentes' | 'semlote'>
  >({});

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
              {/* Ribbon Minimalista de Backup (se existir contagem anterior arquivada) */}
              {conf.temBackupContagem && conf.backupContagem && (
                <div className="gestao-card-backup-ribbon">
                  <div className="gestao-backup-ribbon-texto">
                    <span>
                      💾 <strong>Backup disponível:</strong> Reiniciada por{' '}
                      <em>{conf.backupContagem.reiniciadoPor}</em> em{' '}
                      {new Date(conf.backupContagem.reiniciadoEm).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(conf.backupContagem.reiniciadoEm).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      ({conf.backupContagem.totalBipagensAnuladas} bipagens guardadas).
                      {conf.backupContagem.motivo && ` Motivo: "${conf.backupContagem.motivo}"`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="gestao-backup-ribbon-btn"
                    onClick={() => onRecuperarContagem(conf)}
                    title="Recuperar as bipagens arquivadas desta conferência"
                  >
                    Restaurar Contagem
                  </button>
                </div>
              )}

              {/* Cabeçalho */}
              <div className="gestao-rec-card-header">
                <div className="gestao-rec-card-info">
                  <div className="gestao-rec-card-notas">
                    <span className="gestao-rec-card-nf-badge">📄 NF(s): {conf.numerosNotas}</span>
                    {conf.statusPorNota && Object.keys(conf.statusPorNota).length > 1 && (
                      <div className="gestao-notas-status-inline">
                        {Object.entries(conf.statusPorNota).map(([nunotaStr, st]) => (
                          <span
                            key={nunotaStr}
                            className={`gestao-mini-nota-status badge-status-rec ${getStatusBadgeClass(st)}`}
                            title={`Nota Fiscal ${nunotaStr}`}
                          >
                            NF {nunotaStr}: {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="gestao-rec-card-fornecedor">
                    Fornecedor: {conf.fornecedor}
                  </span>
                  <span className="gestao-rec-card-meta">
                    Conferente: <strong>{conf.conferente || '—'}</strong> • Iniciado em:{' '}
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
                </div>
              </div>

              {/* Progresso & Resumo de Contagem Unificado Minimalista */}
              {conf.totalItens > 0 && (() => {
                const totalBipadoNivel =
                  conf.nivelAtual === 3
                    ? conf.totalBipadoN3 || 0
                    : conf.nivelAtual === 2
                    ? conf.totalBipadoN2 || 0
                    : conf.totalBipadoN1 || 0;
                const isConferido =
                  conf.status === 'Conferido' || conf.status === 'Enviado ao Sankhya';
                const isDivergente =
                  conf.status === 'Divergente' || conf.status === 'Em Reconferência';
                const percentual = Math.min(
                  100,
                  Math.round(((totalBipadoNivel || 0) / conf.totalItens) * 100)
                );

                return (
                  <div className="gestao-rec-progresso-unificado">
                    <div className="gestao-progresso-topo">
                      <div className="gestao-progresso-metricas-resumo">
                        <span>
                          SKUs: <strong>{conf.totalItens} produtos</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Bipado (N{conf.nivelAtual}): <strong>{totalBipadoNivel} un.</strong>
                        </span>
                        {(conf.totalBipadoN2 > 0 || conf.totalBipadoN3 > 0) && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                            (N1: {conf.totalBipadoN1}
                            {conf.totalBipadoN2 > 0 && ` • N2: ${conf.totalBipadoN2}`}
                            {conf.totalBipadoN3 > 0 && ` • N3: ${conf.totalBipadoN3}`})
                          </span>
                        )}
                      </div>

                      <div
                        className={`gestao-progresso-pct ${
                          isConferido ? 'ok' : isDivergente ? 'alerta' : 'andamento'
                        }`}
                      >
                        {isConferido
                          ? '✓ 100% Batendo'
                          : isDivergente
                          ? '⚠️ Divergência Detectada'
                          : `${percentual}% Bipado`}
                      </div>
                    </div>

                    <div className="gestao-progresso-track-mini">
                      <div
                        className="gestao-progresso-fill-mini"
                        style={{
                          width: `${isConferido ? 100 : percentual}%`,
                          background: isConferido
                            ? '#10b981'
                            : isDivergente
                            ? '#f59e0b'
                            : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Tabela de Itens Expandida */}
              {isExpandido && (
                <div style={{ marginTop: '8px' }}>
                  {isCarregandoDetalhes ? (
                    <SkeletonItens linhas={4} mensagem="Carregando dados dos itens e contagens..." />
                  ) : detalhes ? (
                    (() => {
                      const filtroItens = filtroItensCards[conf.id] || 'todos';
                      const todosItens = detalhes.itens || [];
                      const itensDivergentes = todosItens.filter((item) => {
                        const qtdConf =
                          (item.qtdConferidaN3 || 0) > 0
                            ? item.qtdConferidaN3 || 0
                            : (item.qtdConferidaN2 || 0) > 0
                            ? item.qtdConferidaN2 || 0
                            : item.qtdConferidaN1 || 0;
                        const dif =
                          item.diferenca !== undefined
                            ? item.diferenca
                            : qtdConf - (item.qtdneg || 0);
                        return dif !== 0;
                      });
                      const itensSemLote = todosItens.filter((item) => !item.lote);
                      const itensParaExibir =
                        filtroItens === 'divergentes'
                          ? itensDivergentes
                          : filtroItens === 'semlote'
                          ? itensSemLote
                          : todosItens;

                      return (
                        <>
                          {/* Barra de Mini-Filtros Rápidos dos Itens */}
                          <div className="gestao-itens-mini-filtro-bar">
                            <div className="gestao-itens-mini-chips">
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'todos' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensCards((prev) => ({
                                    ...prev,
                                    [conf.id]: 'todos',
                                  }))
                                }
                              >
                                Todos ({todosItens.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'divergentes' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensCards((prev) => ({
                                    ...prev,
                                    [conf.id]: 'divergentes',
                                  }))
                                }
                              >
                                ⚠️ Divergências ({itensDivergentes.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'semlote' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensCards((prev) => ({
                                    ...prev,
                                    [conf.id]: 'semlote',
                                  }))
                                }
                              >
                                Sem Lote ({itensSemLote.length})
                              </button>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                              Exibindo <strong>{itensParaExibir.length}</strong> de{' '}
                              {todosItens.length} itens
                            </span>
                          </div>
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
                            {itensParaExibir.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={11}
                                  style={{ textAlign: 'center', color: 'var(--slate-400)' }}
                                >
                                  Nenhum item encontrado para o filtro selecionado.
                                </td>
                              </tr>
                            ) : (
                              itensParaExibir.map((item) => {
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
                                      <span className={`pill-contagem-status ${classeDif}`}>
                                        {diferenca === 0
                                          ? '✓ OK'
                                          : diferenca < 0
                                          ? `⚠️ ${diferenca}`
                                          : `+${diferenca}`}
                                      </span>
                                    </td>
                                    <td>
                                      {item.lotesConferidos && item.lotesConferidos.length > 1 ? (
                                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
                                          <span
                                            className="gestao-lote-pill"
                                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                            title={item.lotesConferidos.map((l) => `${l.lote} (${l.quantidade} un)`).join(', ')}
                                          >
                                            🏷️ {item.lotesConferidos.length} Lotes
                                          </span>
                                          <div style={{ fontSize: '0.70rem', color: 'var(--slate-600)' }}>
                                            {item.lotesConferidos.map((l) => `${l.lote} (${l.quantidade})`).join(', ')}
                                          </div>
                                        </div>
                                      ) : item.lotesConferidos && item.lotesConferidos.length === 1 ? (
                                        <span className="gestao-lote-pill">
                                          🏷️ {item.lotesConferidos[0].lote} ({item.lotesConferidos[0].quantidade} un)
                                        </span>
                                      ) : item.lote ? (
                                        <span className="gestao-lote-pill">
                                          🏷️ {item.lote}
                                        </span>
                                      ) : (
                                        <span className="gestao-lote-pill sem-lote">
                                          ⚠️ Sem Lote
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      {item.lotesConferidos && item.lotesConferidos.length > 1 ? (
                                        <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {Array.from(new Set(item.lotesConferidos.map((l) => formatarDataSimples(l.validade)).filter((v) => v !== '—'))).join(', ') || '—'}
                                        </span>
                                      ) : item.lotesConferidos && item.lotesConferidos.length === 1 && item.lotesConferidos[0].validade ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(item.lotesConferidos[0].validade)}
                                        </span>
                                      ) : item.validade ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(item.validade)}
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--slate-400)' }}>—</span>
                                      )}
                                    </td>
                                    <td>
                                      {item.lotesConferidos && item.lotesConferidos.length > 1 ? (
                                        <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {Array.from(new Set(item.lotesConferidos.map((l) => formatarDataSimples(l.fabricacao)).filter((v) => v !== '—'))).join(', ') || '—'}
                                        </span>
                                      ) : item.lotesConferidos && item.lotesConferidos.length === 1 && item.lotesConferidos[0].fabricacao ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(item.lotesConferidos[0].fabricacao)}
                                        </span>
                                      ) : item.fabricacao ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(item.fabricacao)}
                                        </span>
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
                        {itensParaExibir.length === 0 ? (
                          <div
                            style={{
                              textAlign: 'center',
                              color: 'var(--slate-400)',
                              padding: '12px',
                            }}
                          >
                            Nenhum item encontrado para o filtro selecionado.
                          </div>
                        ) : (
                          itensParaExibir.map((item) => {
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
                                  <span className={`pill-contagem-status ${classeDif}`}>
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
                  );
                })()
              ) : null}
                </div>
              )}

              {/* Ações da Conferência - Hierarquia Minimalista 1 + N */}
              <div className="gestao-rec-card-acoes">
                <button
                  type="button"
                  className={`gestao-btn-clean-toggle ${isExpandido ? 'ativo' : ''}`}
                  onClick={() => toggleDetalhesConferencia(conf.id, conf.nunotas)}
                >
                  <span>{isExpandido ? '▲ Ocultar Itens' : `🔍 Ver Itens (${conf.totalItens})`}</span>
                </button>

                <div className="gestao-acoes-grupo-secundario">
                  <button
                    type="button"
                    className="gestao-btn-clean-secundario"
                    onClick={() => onSolicitarRecontagem(conf)}
                    title="Solicitar que outro conferente realize recontagem (Nível 2)"
                  >
                    <span>🔁 Recontar</span>
                  </button>

                  <button
                    type="button"
                    className="gestao-btn-clean-secundario"
                    onClick={() => onAbrirColetor(conf)}
                    title="Abrir tela de contagem no coletor"
                  >
                    <span>📱 Coletor</span>
                  </button>

                  <button
                    type="button"
                    className="gestao-btn-clean-secundario danger"
                    onClick={() => onReiniciar(conf)}
                    title="Reiniciar conferência (guarda backup automático das bipagens)"
                  >
                    <span>↺ Reiniciar</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
