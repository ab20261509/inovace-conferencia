import React from 'react';
import { ConferenciaDivergenciaGrupo } from '../../../domain/models/ConferenciaEntrada';
import { Container } from '../Container/Container';
import {
  getStatusBadgeClass,
  formatarConferentes,
  formatarDataSimples,
} from './recebimentoHelpers';

export interface AbaDivergenciasViewProps {
  divergencias: ConferenciaDivergenciaGrupo[];
  itensDivergenciaExpandidos: Record<string, boolean>;
  filtroItensDivergencia: Record<string, 'divergentes' | 'todos'>;
  toggleItensDivergencia: (grupoId: string) => void;
  setFiltroItensDivergencia: React.Dispatch<
    React.SetStateAction<Record<string, 'divergentes' | 'todos'>>
  >;
  onResolverDivergencia: (grupo: ConferenciaDivergenciaGrupo) => void;
  onReconferirN3: (grupo: ConferenciaDivergenciaGrupo) => void;
  onReiniciar: (grupo: ConferenciaDivergenciaGrupo) => void;
}

export const AbaDivergenciasView: React.FC<AbaDivergenciasViewProps> = ({
  divergencias,
  itensDivergenciaExpandidos,
  filtroItensDivergencia,
  toggleItensDivergencia,
  setFiltroItensDivergencia,
  onResolverDivergencia,
  onReconferirN3,
  onReiniciar,
}) => {
  return (
    <div className="gestao-rec-lista">
      {divergencias.length === 0 ? (
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
            <span style={{ fontSize: '2.5rem' }}>✨</span>
            <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
              Nenhuma divergência pendente!
            </h3>
            <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
              Todas as conferências de entrada estão finalizadas sem discordâncias de contagem.
            </p>
          </div>
        </Container>
      ) : (
        divergencias.map((grupo) => {
          const isExpandido = itensDivergenciaExpandidos[grupo.id] === true;
          const filtroAtivo = filtroItensDivergencia[grupo.id] || 'divergentes';
          const todosDisponiveis = grupo.todosItens && grupo.todosItens.length > 0;
          const itensParaExibir =
            filtroAtivo === 'todos' && todosDisponiveis
              ? grupo.todosItens
              : grupo.itensDivergentes;

          return (
            <div key={grupo.id} className="gestao-rec-card">
              {/* Cabeçalho do Card */}
              <div className="gestao-rec-card-header">
                <div className="gestao-rec-card-info">
                  <div className="gestao-rec-card-notas">
                    <span>📄 Nota {grupo.numnota || grupo.numerosNotas}</span>
                    {grupo.nunota && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginLeft: '6px' }}>
                        (#{grupo.nunota})
                      </span>
                    )}
                  </div>
                  <span className="gestao-rec-card-fornecedor">
                    Fornecedor: {grupo.fornecedor}
                  </span>
                  {/* Rastreabilidade de quem conferiu */}
                  <div
                    style={{
                      margin: '4px 0',
                      fontSize: '0.82rem',
                      color: 'var(--slate-700)',
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                      background: 'var(--slate-100)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--slate-200)',
                    }}
                  >
                    <span><strong>👤 Conferentes:</strong></span>
                    <span>N1: <strong>{grupo.conferentesN1 && grupo.conferentesN1.length > 0 ? grupo.conferentesN1.join(', ') : '—'}</strong></span>
                    <span>N2: <strong>{grupo.conferentesN2 && grupo.conferentesN2.length > 0 ? grupo.conferentesN2.join(', ') : '—'}</strong></span>
                    {grupo.conferentesN3 && grupo.conferentesN3.length > 0 && (
                      <span style={{ color: '#dc2626' }}>N3: <strong>{grupo.conferentesN3.join(', ')}</strong></span>
                    )}
                  </div>
                  <span className="gestao-rec-card-meta">
                    Atualizado em: {new Date(grupo.atualizadoEm).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="gestao-rec-card-badges">
                  <span className="badge-nivel-rec">Nível Atual: {grupo.nivelAtual}</span>
                  <span
                    className={`badge-status-rec ${
                      grupo.status === 'Divergente'
                        ? 'divergente'
                        : grupo.status.includes('Reconferência')
                        ? 'reconferencia'
                        : 'aguardando'
                    }`}
                  >
                    {grupo.status}
                  </span>
                </div>
              </div>

              {/* Resumo Quantitativo de Contagem */}
              <div className="gestao-rec-contagem-resumo">
                <div className="contagem-box">
                  <span className="contagem-rotulo">Faturado (NF)</span>
                  <span className="contagem-valor">{grupo.totalEsperado}</span>
                </div>
                <div className="contagem-box">
                  <span className="contagem-rotulo">Contagem N1</span>
                  <span className="contagem-valor">{grupo.totalN1}</span>
                </div>
                <div className="contagem-box">
                  <span className="contagem-rotulo">Contagem N2</span>
                  <span className="contagem-valor">{grupo.totalN2}</span>
                </div>
                {grupo.totalN3 > 0 && (
                  <div className="contagem-box">
                    <span className="contagem-rotulo">Contagem N3</span>
                    <span className="contagem-valor">{grupo.totalN3}</span>
                  </div>
                )}
                <div className="contagem-box divergente">
                  <span className="contagem-rotulo">Itens Divergentes</span>
                  <span className="contagem-valor">{grupo.itensDivergentes.length}</span>
                </div>
              </div>

              {/* Sugestão Inteligente de Decisão (Decision Assist) */}
              {(() => {
                const itensDiv = grupo.itensDivergentes || [];
                const todosConcordamFalta =
                  itensDiv.length > 0 &&
                  itensDiv.every((i) => i.qtdN1 === i.qtdN2 && i.qtdN1 < i.qtdEsperada);
                const todosConcordamSobra =
                  itensDiv.length > 0 &&
                  itensDiv.every((i) => i.qtdN1 === i.qtdN2 && i.qtdN1 > i.qtdEsperada);
                const discordamN1N2 = itensDiv.some((i) => i.qtdN1 !== i.qtdN2);

                if (todosConcordamFalta) {
                  return (
                    <div className="gestao-dica-decisao concordante">
                      <span>💡</span>
                      <div>
                        <strong>Dica Gerencial (Consistência N1 = N2):</strong> Os conferentes contaram exatamente a mesma quantidade em todos os itens divergentes. Há forte indício de falta física originária da fábrica/fornecedor. Sugestão: <em>Aprovar Divergência</em> para liberar estoque ou acionar compras.
                      </div>
                    </div>
                  );
                }

                if (todosConcordamSobra) {
                  return (
                    <div className="gestao-dica-decisao concordante">
                      <span>💡</span>
                      <div>
                        <strong>Dica Gerencial (Sobra Confirmada N1 = N2):</strong> Ambos os conferentes identificaram sobra física em relação à nota faturada. Sugestão: Verificar bonificação ou contatar fornecedor antes de aceitar.
                      </div>
                    </div>
                  );
                }

                if (discordamN1N2) {
                  return (
                    <div className="gestao-dica-decisao discordante">
                      <span>⚠️</span>
                      <div>
                        <strong>Dica Gerencial (Discordância N1 ≠ N2):</strong> Houve discordância de contagem cega entre os conferentes N1 e N2. Sugestão: <em>Solicitar Reconferência N3</em> para um terceiro operador desempatar antes da aprovação.
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Barra de Controle de Exibição / Esconder Itens */}
              <div className="gestao-rec-itens-header" style={{ marginTop: '10px' }}>
                <div className="gestao-rec-itens-filtros">
                  <button
                    type="button"
                    className={`gestao-rec-item-chip ${filtroAtivo === 'divergentes' ? 'ativo' : ''}`}
                    onClick={() =>
                      setFiltroItensDivergencia((prev) => ({
                        ...prev,
                        [grupo.id]: 'divergentes',
                      }))
                    }
                  >
                    <span>⚠️ Divergentes</span>
                    <span className="chip-count">{grupo.itensDivergentes.length}</span>
                  </button>
                  {todosDisponiveis && (
                    <button
                      type="button"
                      className={`gestao-rec-item-chip ${filtroAtivo === 'todos' ? 'ativo' : ''}`}
                      onClick={() =>
                        setFiltroItensDivergencia((prev) => ({
                          ...prev,
                          [grupo.id]: 'todos',
                        }))
                      }
                    >
                      <span>📋 Todos os Itens</span>
                      <span className="chip-count">{grupo.todosItens.length}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="gestao-rec-btn-toggle-itens"
                  onClick={() => toggleItensDivergencia(grupo.id)}
                >
                  <span>
                    {isExpandido
                      ? '▲ Ocultar Itens'
                      : `▼ Exibir Itens (${itensParaExibir.length})`}
                  </span>
                </button>
              </div>

              {isExpandido && (
                <>
                  {/* Tabela Desktop (> 1024px) */}
                  <div className="gestao-rec-tabela-desktop" style={{ marginTop: '8px' }}>
                    <table className="gestao-rec-tabela">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Vol.</th>
                          <th>Nota</th>
                          <th>N1</th>
                          <th>N2</th>
                          {grupo.totalN3 > 0 && <th>N3</th>}
                          <th>Diferença</th>
                          <th>Lote</th>
                          <th>Validade</th>
                          <th>Fabricação</th>
                          <th>Conferentes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensParaExibir.map((item) => {
                          const diferenca = item.diferenca;
                          const classeDif =
                            diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';
                          return (
                            <tr key={`${item.nunota}-${item.codprod}-${item.sequencia}`}>
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
                                  {item.referencia ? ` • Ref: ${item.referencia}` : ''}
                                </div>
                              </td>
                              <td>{item.codvol || 'UN'}</td>
                              <td>
                                <strong>{item.qtdEsperada}</strong>
                              </td>
                              <td>{item.qtdN1}</td>
                              <td>{item.qtdN2}</td>
                              {grupo.totalN3 > 0 && <td>{item.qtdN3}</td>}
                              <td>
                                <span className={`pill-contagem-status ${classeDif}`}>
                                  {diferenca < 0
                                    ? `⚠️ ${diferenca} (Falta)`
                                    : diferenca > 0
                                    ? `+${diferenca} (Sobra)`
                                    : '✓ OK'}
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
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards Mobile (<= 1024px) */}
                  <div className="gestao-rec-itens-mobile" style={{ marginTop: '8px' }}>
                    {itensParaExibir.map((item) => {
                      const diferenca = item.diferenca;
                      const classeDif =
                        diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';
                      return (
                        <div
                          key={`mob-${item.nunota}-${item.codprod}-${item.sequencia}`}
                          className="gestao-item-card-mobile"
                        >
                          <div className="gestao-item-mobile-header">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="gestao-item-mobile-descr">
                                {item.descrprod || `Produto ${item.codprod}`}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                                Cód: {item.codprod}
                                {item.referencia ? ` • Ref: ${item.referencia}` : ''} • Vol:{' '}
                                {item.codvol || 'UN'}
                              </div>
                            </div>
                            <span className={`pill-contagem-status ${classeDif}`}>
                              {diferenca < 0
                                ? `⚠️ ${diferenca} (Falta)`
                                : diferenca > 0
                                ? `+${diferenca} (Sobra)`
                                : '✓ OK'}
                            </span>
                          </div>

                          <div className="gestao-item-mobile-grid">
                            <div>
                              Nota: <strong>{item.qtdEsperada}</strong>
                            </div>
                            <div>
                              N1: <strong>{item.qtdN1}</strong>
                            </div>
                            <div>
                              N2: <strong>{item.qtdN2}</strong>
                            </div>
                            {grupo.totalN3 > 0 && (
                              <div>
                                N3: <strong>{item.qtdN3}</strong>
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
                              {item.validade ? ` • Val: ${formatarDataSimples(item.validade)}` : ''}
                              {item.fabricacao
                                ? ` • Fab: ${formatarDataSimples(item.fabricacao)}`
                                : ''}
                            </div>
                            {(item.conferenteN1 || item.conferenteN2 || item.conferenteN3) && (
                              <div style={{ fontSize: '0.70rem', color: 'var(--slate-500)' }}>
                                {formatarConferentes(item)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Barra de Ações da Conferência */}
              <div className="gestao-rec-card-acoes">
                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-resolver"
                  onClick={() => onResolverDivergencia(grupo)}
                >
                  <span>✓ Resolver Divergência</span>
                </button>

                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-n3"
                  onClick={() => onReconferirN3(grupo)}
                >
                  <span>🔍 Reconferir (N3)</span>
                </button>

                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-reiniciar"
                  onClick={() => onReiniciar(grupo)}
                >
                  <span>↺ Reiniciar</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
