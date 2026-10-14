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
  nivel1Ativo?: boolean;
  nivel2Ativo?: boolean;
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
  nivel1Ativo,
  nivel2Ativo,
}) => {
  const [filtroItensCards, setFiltroItensCards] = useState<
    Record<string, 'todos' | 'divergentes' | 'semlote'>
  >({});
  const [lotesExpandidos, setLotesExpandidos] = useState<Record<string, boolean>>({});

  const toggleLotesItem = (itemKey: string) => {
    setLotesExpandidos((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

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
          const jaEnviado = conf.status === 'Enviado ao Sankhya';
          const isExpandido = !!conferenciasExpandidas[conf.id];
          const isCarregandoDetalhes = loadingDetalhes === conf.id;
          const detalhes = detalhesConferencias[conf.id];

          return (
            <div key={conf.id} className="gestao-rec-card">
              {/* Ribbon Minimalista de Backup (se existir contagem anterior arquivada) */}
              {conf.temBackupContagem && (conf.backupContagem || (conf.backupsDisponiveis && conf.backupsDisponiveis.length > 0)) && (
                <div className="gestao-card-backup-ribbon">
                  <div className="gestao-backup-ribbon-texto">
                    <span>
                      💾 <strong>Backup disponível:</strong>{' '}
                      {conf.backupsDisponiveis && conf.backupsDisponiveis.length > 1 ? (
                        <>Existem <strong>{conf.backupsDisponiveis.length} backups disponíveis</strong> para esta nota / chave NF-e.</>
                      ) : (
                        (() => {
                          const bkp = conf.backupsDisponiveis?.[0] || conf.backupContagem;
                          if (!bkp) return <>Backup disponível para recuperação.</>;
                          return (
                            <>
                              Reiniciada por <em>{bkp.reiniciadoPor}</em> em{' '}
                              {new Date(bkp.reiniciadoEm).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(bkp.reiniciadoEm).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              ({bkp.totalBipagensAnuladas} bipagens guardadas).
                              {bkp.motivo && ` Motivo: "${bkp.motivo}"`}
                            </>
                          );
                        })()
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="gestao-backup-ribbon-btn"
                    onClick={() => onRecuperarContagem(conf)}
                    title="Visualizar e recuperar as bipagens arquivadas desta conferência"
                  >
                    Restaurar Contagem
                  </button>
                </div>
              )}

              {/* Cabeçalho */}
              <div className="gestao-rec-card-header">
                <div className="gestao-rec-card-info">
                  <div className="gestao-rec-card-notas" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="gestao-rec-card-nf-badge">📄 NF(s): {conf.numerosNotas}</span>
                    {conf.status === 'Enviado ao Sankhya' && conf.enviadoSankhyaEm && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                        title="Data/hora e responsável pela integração no Sankhya"
                      >
                        <span>✓</span>
                        <span>
                          Integrado em {new Date(conf.enviadoSankhyaEm).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(conf.enviadoSankhyaEm).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {conf.aprovadoPor ? ` por ${conf.aprovadoPor}` : ''}
                        </span>
                      </span>
                    )}
                    {conf.statusPorNota && Object.keys(conf.statusPorNota).length > 1 && (
                      <div className="gestao-notas-status-inline">
                        {Object.entries(conf.statusPorNota).map(([nunotaStr, st]) => {
                          const numnotaReal =
                            conf.notasDetalhadas?.find((nd) => nd.nunota === Number(nunotaStr))?.numnota ||
                            (() => {
                              const idx = conf.nunotas.indexOf(Number(nunotaStr));
                              if (idx !== -1 && conf.numerosNotas) {
                                const nums = conf.numerosNotas.split(',').map((s) => s.trim());
                                if (nums[idx]) return nums[idx];
                              }
                              return nunotaStr;
                            })();

                          return (
                            <span
                              key={nunotaStr}
                              className={`gestao-mini-nota-status badge-status-rec ${getStatusBadgeClass(st)}`}
                              title={`Nota Fiscal ${numnotaReal}`}
                            >
                              NF #{numnotaReal}: {st}
                            </span>
                          );
                        })}
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

                const houveN1Card = conf.totalBipadoN1 > 0;
                const houveN2Card = conf.totalBipadoN2 > 0;
                const exibirN1Card = nivel1Ativo !== false || houveN1Card;
                const exibirN2Card = nivel2Ativo !== false || houveN2Card;

                const partesNiveis: string[] = [];
                if (exibirN1Card) partesNiveis.push(`N1: ${conf.totalBipadoN1 || 0}`);
                if (exibirN2Card) partesNiveis.push(`N2: ${conf.totalBipadoN2 || 0}`);
                if (conf.totalBipadoN3 > 0) partesNiveis.push(`N3: ${conf.totalBipadoN3}`);

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
                        {partesNiveis.length > 0 && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                            ({partesNiveis.join(' • ')})
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

                      const itensDaConferencia = detalhes.itens || [];
                      const houveN1Itens = conf.totalBipadoN1 > 0 || itensDaConferencia.some((i) => (i.qtdConferidaN1 || 0) > 0);
                      const houveN2Itens = conf.totalBipadoN2 > 0 || itensDaConferencia.some((i) => (i.qtdConferidaN2 || 0) > 0);
                      const exibirN1Itens = nivel1Ativo !== false || houveN1Itens;
                      const exibirN2Itens = nivel2Ativo !== false || houveN2Itens;
                      const temN3Itens = conf.totalBipadoN3 > 0 || itensDaConferencia.some((i) => (i.qtdConferidaN3 || 0) > 0);

                      let totalColunas = 8;
                      if (exibirN1Itens) totalColunas++;
                      if (exibirN2Itens) totalColunas++;
                      if (temN3Itens) totalColunas++;

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
                                    {exibirN1Itens && <th>N1</th>}
                                    {exibirN2Itens && <th>N2</th>}
                                    {temN3Itens && <th>N3</th>}
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
                                        colSpan={totalColunas}
                                        style={{ textAlign: 'center', color: 'var(--slate-400)' }}
                                      >
                                        Nenhum item encontrado para o filtro selecionado.
                                      </td>
                                    </tr>
                                  ) : (
                                    itensParaExibir.map((item) => {
                                      const itemKey = `${item.nunota}-${item.codprod}-${item.sequencia}`;
                                      const temMultiplosLotes = Boolean(
                                        item.lotesConferidos && item.lotesConferidos.length > 1
                                      );
                                      const isLotesAberto = Boolean(lotesExpandidos[itemKey]);

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
                                        <React.Fragment key={`conf-frag-${itemKey}`}>
                                          <tr key={`conf-${itemKey}`}>
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
                                            {exibirN1Itens && <td>{item.qtdConferidaN1 || 0}</td>}
                                            {exibirN2Itens && <td>{item.qtdConferidaN2 || 0}</td>}
                                            {temN3Itens && (
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
                                        {temMultiplosLotes ? (
                                          <button
                                            type="button"
                                            className={`chip-dropdown-lote ${isLotesAberto ? 'ativo' : ''}`}
                                            onClick={() => toggleLotesItem(itemKey)}
                                            title={isLotesAberto ? 'Recolher gaveta de lotes' : 'Expandir lotes linha a linha'}
                                          >
                                            <span>🏷️ {item.lotesConferidos!.length} Lotes</span>
                                            <span style={{ fontSize: '0.65rem' }}>{isLotesAberto ? '▲' : '▼'}</span>
                                          </button>
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
                                        {temMultiplosLotes ? (
                                          <span
                                            style={{
                                              fontSize: '0.74rem',
                                              color: 'var(--primary, #0f766e)',
                                              cursor: 'pointer',
                                              fontStyle: 'italic',
                                              fontWeight: 600,
                                            }}
                                            onClick={() => toggleLotesItem(itemKey)}
                                            title="Clique para ver os lotes e validades linha a linha"
                                          >
                                            {isLotesAberto ? 'Linhas abaixo ▲' : 'Ver datas ▼'}
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
                                        {temMultiplosLotes ? (
                                          <span
                                            style={{
                                              fontSize: '0.74rem',
                                              color: 'var(--primary, #0f766e)',
                                              cursor: 'pointer',
                                              fontStyle: 'italic',
                                              fontWeight: 600,
                                            }}
                                            onClick={() => toggleLotesItem(itemKey)}
                                            title="Clique para ver os lotes e fabricações linha a linha"
                                          >
                                            {isLotesAberto ? 'Linhas abaixo ▲' : 'Ver datas ▼'}
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

                                    {/* Sub-Linha Gaveta: Lotes Linha a Linha (Modelo 1) */}
                                    {temMultiplosLotes && isLotesAberto && (
                                      <tr key={`conf-lotes-${itemKey}`} className="subrow-lotes-drawer">
                                        <td colSpan={totalColunas}>
                                          <div className="drawer-lotes-wrapper">
                                            <div className="drawer-lotes-header">
                                              <span>📦 Frações de Lote Desmembradas ({item.lotesConferidos!.length} lotes registrados):</span>
                                              <span style={{ color: 'var(--slate-500)', fontWeight: 500, textTransform: 'none' }}>
                                                Total conferido: <strong>{item.lotesConferidos!.reduce((acc, l) => acc + (l.quantidade || 0), 0)} {item.codvol || 'UN'}</strong>
                                              </span>
                                            </div>
                                            <table className="mini-tabela-lotes">
                                              <thead>
                                                <tr>
                                                  <th>Lote</th>
                                                  <th style={{ textAlign: 'center' }}>Quantidade</th>
                                                  <th>Data de Validade</th>
                                                  <th>Data de Fabricação</th>
                                                  <th>Conferente / Horário</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {item.lotesConferidos!.map((fracao, fIdx) => (
                                                  <tr key={`conf-f-${itemKey}-${fracao.lote}-${fIdx}`}>
                                                    <td>
                                                      <span className="gestao-lote-pill" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                                        🏷️ {fracao.lote}
                                                      </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                      <strong>{fracao.quantidade}</strong> {item.codvol || 'UN'}
                                                    </td>
                                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--slate-800)' }}>
                                                      {formatarDataSimples(fracao.validade)}
                                                    </td>
                                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-600)' }}>
                                                      {formatarDataSimples(fracao.fabricacao)}
                                                    </td>
                                                    <td style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                                                      {fracao.conferente ? `👤 ${fracao.conferente}` : '—'}
                                                      {fracao.ultimoHorario ? ` • ${new Date(fracao.ultimoHorario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
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
                            const itemKey = `${item.nunota}-${item.codprod}-${item.sequencia}`;
                            const temMultiplosLotes = Boolean(
                              item.lotesConferidos && item.lotesConferidos.length > 1
                            );
                            const isLotesAberto = Boolean(lotesExpandidos[itemKey]);

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
                                key={`conf-mob-${itemKey}`}
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
                                  {exibirN1Itens && (
                                    <div>
                                      N1: <strong>{item.qtdConferidaN1 || 0}</strong>
                                    </div>
                                  )}
                                  {exibirN2Itens && (
                                    <div>
                                      N2: <strong>{item.qtdConferidaN2 || 0}</strong>
                                    </div>
                                  )}
                                  {temN3Itens && (
                                    <div>
                                      N3: <strong>{item.qtdConferidaN3 || 0}</strong>
                                    </div>
                                  )}
                                </div>

                                <div
                                  className="gestao-item-mobile-lote-info"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}
                                >
                                  {temMultiplosLotes ? (
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <button
                                          type="button"
                                          className={`chip-dropdown-lote ${isLotesAberto ? 'ativo' : ''}`}
                                          onClick={() => toggleLotesItem(itemKey)}
                                        >
                                          <span>🏷️ {item.lotesConferidos!.length} Lotes Registrados</span>
                                          <span style={{ fontSize: '0.65rem' }}>{isLotesAberto ? '▲ recolher' : '▼ expandir'}</span>
                                        </button>
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

                                      {isLotesAberto && (
                                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {item.lotesConferidos!.map((fracao, fIdx) => (
                                            <div
                                              key={`mob-f-${itemKey}-${fracao.lote}-${fIdx}`}
                                              style={{
                                                background: '#ffffff',
                                                border: '1px solid var(--slate-200)',
                                                borderRadius: '6px',
                                                padding: '6px 8px',
                                                fontSize: '0.72rem',
                                              }}
                                            >
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-900)' }}>
                                                  🏷️ {fracao.lote}
                                                </span>
                                                <span style={{ background: 'var(--slate-100)', padding: '1px 5px', borderRadius: '4px' }}>
                                                  {fracao.quantidade} {item.codvol || 'UN'}
                                                </span>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                                                <span>Val: {formatarDataSimples(fracao.validade)}</span>
                                                <span>Fab: {formatarDataSimples(fracao.fabricacao)}</span>
                                              </div>
                                              {fracao.conferente && (
                                                <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)', marginTop: '2px' }}>
                                                  👤 {fracao.conferente}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '4px',
                                      }}
                                    >
                                      <div>
                                        {item.lotesConferidos && item.lotesConferidos.length === 1 ? (
                                          <>
                                            Lote: <strong>{item.lotesConferidos[0].lote}</strong> ({item.lotesConferidos[0].quantidade} un)
                                            {item.lotesConferidos[0].validade
                                              ? ` • Val: ${formatarDataSimples(item.lotesConferidos[0].validade)}`
                                              : ''}
                                            {item.lotesConferidos[0].fabricacao
                                              ? ` • Fab: ${formatarDataSimples(item.lotesConferidos[0].fabricacao)}`
                                              : ''}
                                          </>
                                        ) : item.lote ? (
                                          <>
                                            Lote: <strong>{item.lote}</strong>
                                            {item.validade
                                              ? ` • Val: ${formatarDataSimples(item.validade)}`
                                              : ''}
                                            {item.fabricacao
                                              ? ` • Fab: ${formatarDataSimples(item.fabricacao)}`
                                              : ''}
                                          </>
                                        ) : (
                                          <span style={{ color: 'var(--slate-400)' }}>Sem lote</span>
                                        )}
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
                    className={`gestao-btn-clean-secundario ${jaEnviado ? 'disabled-action' : ''}`}
                    disabled={jaEnviado}
                    onClick={() => !jaEnviado && onSolicitarRecontagem(conf)}
                    title={
                      jaEnviado
                        ? 'Conferência já enviada ao Sankhya'
                        : 'Solicitar que outro conferente realize recontagem (Nível 2)'
                    }
                    style={
                      jaEnviado
                        ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }
                        : undefined
                    }
                  >
                    <span>🔁 Recontar</span>
                  </button>

                  <button
                    type="button"
                    className={`gestao-btn-clean-secundario ${jaEnviado ? 'disabled-action' : ''}`}
                    disabled={jaEnviado}
                    onClick={() => !jaEnviado && onAbrirColetor(conf)}
                    title={
                      jaEnviado
                        ? 'Conferência já enviada ao Sankhya'
                        : 'Abrir tela de contagem no coletor'
                    }
                    style={
                      jaEnviado
                        ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }
                        : undefined
                    }
                  >
                    <span>📱 Coletor</span>
                  </button>

                  <button
                    type="button"
                    className={`gestao-btn-clean-secundario danger ${jaEnviado ? 'disabled-action' : ''}`}
                    disabled={jaEnviado}
                    onClick={() => !jaEnviado && onReiniciar(conf)}
                    title={
                      jaEnviado
                        ? 'Conferência já enviada ao Sankhya'
                        : 'Reiniciar conferência (guarda backup automático das bipagens)'
                    }
                    style={
                      jaEnviado
                        ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }
                        : undefined
                    }
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
