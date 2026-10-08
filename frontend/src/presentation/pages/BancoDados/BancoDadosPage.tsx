import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '../../components/AppLayout/AppLayout';
import {
  DatabaseApiService,
  TableSummary,
  TableColumnInfo,
  QueryResult,
  DatabaseStatus,
  DatabaseDocumentation,
  SqlExecutionResult,
} from '../../../infrastructure/api/DatabaseApiService';
import './BancoDadosPage.css';

const dbService = new DatabaseApiService();

export function BancoDadosPage() {
  const [tabAtiva, setTabAtiva] = useState<'tabelas' | 'terminal' | 'docs'>('tabelas');

  // Status & Sync
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  // Aba Tabelas
  const [tabelas, setTabelas] = useState<TableSummary[]>([]);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('');
  const [dadosTabela, setDadosTabela] = useState<QueryResult | null>(null);
  const [loadingDados, setLoadingDados] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(25);
  const [busca, setBusca] = useState('');
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [ordenacao, setOrdenacao] = useState<{ coluna?: string; dir?: 'ASC' | 'DESC' }>({});

  // Modais CRUD
  const [registroEditando, setRegistroEditando] = useState<Record<string, any> | null>(null);
  const [formEdit, setFormEdit] = useState<Record<string, any>>({});
  const [registroExcluindo, setRegistroExcluindo] = useState<Record<string, any> | null>(null);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [formNovo, setFormNovo] = useState<Record<string, any>>({});

  // Aba Terminal SQL
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM logs_auditoria ORDER BY timestamp DESC LIMIT 20;');
  const [sqlResult, setSqlResult] = useState<SqlExecutionResult | null>(null);
  const [executandoSql, setExecutandoSql] = useState(false);

  // Aba Documentação
  const [docs, setDocs] = useState<DatabaseDocumentation | null>(null);

  // Toast Feedback
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarToast = useCallback((texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 3800);
  }, []);

  // 1. Carregar Status e Tabelas iniciais
  const carregarStatusETabelas = useCallback(async () => {
    try {
      const [st, tabs] = await Promise.all([
        dbService.obterStatus(),
        dbService.listarTabelas(),
      ]);
      setStatus(st);
      setTabelas(tabs);
      if (tabs.length > 0 && !tabelaSelecionada) {
        setTabelaSelecionada(tabs[0].name);
      }
    } catch (err: any) {
      mostrarToast(err.response?.data?.error || 'Erro ao carregar status do banco de dados.', 'erro');
    }
  }, [tabelaSelecionada, mostrarToast]);

  useEffect(() => {
    carregarStatusETabelas();
  }, [carregarStatusETabelas]);

  // 2. Carregar Registros da Tabela Selecionada
  const carregarRegistros = useCallback(async (tabName: string, p = pagina, l = limite, b = busca, ord = ordenacao) => {
    if (!tabName) return;
    setLoadingDados(true);
    try {
      const res = await dbService.consultarRegistros(tabName, {
        page: p,
        limit: l,
        search: b,
        sortBy: ord.coluna,
        sortDir: ord.dir,
      });
      setDadosTabela(res);
    } catch (err: any) {
      mostrarToast(err.response?.data?.error || `Erro ao consultar registros de ${tabName}.`, 'erro');
    } finally {
      setLoadingDados(false);
    }
  }, [pagina, limite, busca, ordenacao, mostrarToast]);

  useEffect(() => {
    if (tabAtiva === 'tabelas' && tabelaSelecionada) {
      carregarRegistros(tabelaSelecionada, pagina, limite, busca, ordenacao);
    }
  }, [tabAtiva, tabelaSelecionada, pagina, limite, busca, ordenacao, carregarRegistros]);

  // 3. Carregar Documentação ao alternar para aba 'docs'
  useEffect(() => {
    if (tabAtiva === 'docs' && !docs) {
      dbService.obterDocumentacao()
        .then(setDocs)
        .catch((err) => mostrarToast(err.response?.data?.error || 'Erro ao carregar documentação.', 'erro'));
    }
  }, [tabAtiva, docs, mostrarToast]);

  // Sincronizar com Turso
  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const res = await dbService.sincronizar();
      if (res.sucesso) {
        mostrarToast(res.mensagem, 'sucesso');
      } else {
        mostrarToast(res.mensagem, 'erro');
      }
      await carregarStatusETabelas();
    } catch (err: any) {
      mostrarToast(err.response?.data?.error || 'Falha ao sincronizar com Turso.', 'erro');
    } finally {
      setSincronizando(false);
    }
  };

  // Busca rápida com submissão
  const handleAplicarBusca = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    setBusca(buscaDigitada);
  };

  const handleLimparBusca = () => {
    setBuscaDigitada('');
    setBusca('');
    setPagina(1);
  };

  // Ordenação ao clicar no cabeçalho
  const handleOrdenarColuna = (colName: string) => {
    setOrdenacao((prev) => {
      if (prev.coluna === colName) {
        return { coluna: colName, dir: prev.dir === 'ASC' ? 'DESC' : 'ASC' };
      }
      return { coluna: colName, dir: 'ASC' };
    });
  };

  // Identificar chave primária da linha
  const extrairPk = (row: any, colunas: TableColumnInfo[]): Record<string, any> => {
    const pks = colunas.filter((c) => c.pk);
    const pkObj: Record<string, any> = {};
    if (pks.length > 0) {
      pks.forEach((p) => {
        pkObj[p.name] = row[p.name];
      });
    } else if (row.rowid !== undefined) {
      pkObj.rowid = row.rowid;
    }
    return pkObj;
  };

  // Abrir Modal de Edição
  const handleAbrirEdicao = (row: any) => {
    setRegistroEditando(row);
    setFormEdit({ ...row });
  };

  // Salvar Edição (UPDATE)
  const handleSalvarEdicao = async () => {
    if (!registroEditando || !dadosTabela) return;
    const pk = extrairPk(registroEditando, dadosTabela.columns);
    const camposNaoPk = dadosTabela.columns.filter((c) => !c.pk).map((c) => c.name);

    const dadosAtualizados: Record<string, any> = {};
    for (const campo of camposNaoPk) {
      dadosAtualizados[campo] = formEdit[campo];
    }

    try {
      await dbService.atualizarRegistro(tabelaSelecionada, pk, dadosAtualizados);
      mostrarToast('Registro atualizado com sucesso!', 'sucesso');
      setRegistroEditando(null);
      carregarRegistros(tabelaSelecionada);
    } catch (err: any) {
      mostrarToast(err.response?.data?.error || 'Erro ao atualizar registro.', 'erro');
    }
  };

  // Abrir Modal de Exclusão
  const handleAbrirExclusao = (row: any) => {
    setRegistroExcluindo(row);
  };

  // Confirmar Exclusão (DELETE)
  const handleConfirmarExclusao = async () => {
    if (!registroExcluindo || !dadosTabela) return;
    const pk = extrairPk(registroExcluindo, dadosTabela.columns);

    try {
      await dbService.excluirRegistro(tabelaSelecionada, pk);
      mostrarToast('Registro excluído com sucesso!', 'sucesso');
      setRegistroExcluindo(null);
      carregarRegistros(tabelaSelecionada);
      carregarStatusETabelas();
    } catch (err: any) {
      mostrarToast(err.response?.data?.error || 'Erro ao excluir registro.', 'erro');
    }
  };

  // Abrir Modal de Novo Registro
  const handleAbrirNovo = () => {
    if (!dadosTabela) return;
    const initialForm: Record<string, any> = {};
    dadosTabela.columns.forEach((c) => {
      initialForm[c.name] = c.defaultValue || '';
    });
    setFormNovo(initialForm);
    setModalNovoAberto(true);
  };

  // Salvar Novo Registro (INSERT)
  const handleSalvarNovo = async () => {
    try {
      await dbService.inserirRegistro(tabelaSelecionada, formNovo);
      mostrarToast('Novo registro inserido com sucesso!', 'sucesso');
      setModalNovoAberto(false);
      carregarRegistros(tabelaSelecionada);
      carregarStatusETabelas();
    } catch (err: any) {
      mostrarToast(err.response?.data?.error || 'Erro ao inserir registro.', 'erro');
    }
  };

  // Executar Query no Terminal SQL
  const handleExecutarSql = async () => {
    if (!sqlQuery.trim()) return;
    setExecutandoSql(true);
    try {
      const res = await dbService.executarQuery(sqlQuery);
      setSqlResult(res);
      mostrarToast(`Query executada em ${res.executionTimeMs}ms!`, 'sucesso');
    } catch (err: any) {
      mostrarToast(err.response?.data?.error || 'Erro na sintaxe SQL ou execução.', 'erro');
    } finally {
      setExecutandoSql(false);
    }
  };

  // Exportar resultado do SQL para JSON
  const handleExportarJson = () => {
    if (!sqlResult || !sqlResult.rows.length) return;
    const blob = new Blob([JSON.stringify(sqlResult.rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Formatação de valores nas células
  const formatarValorCelula = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="db-cell-null">null</span>;
    }
    if (typeof val === 'object') {
      const jsonStr = JSON.stringify(val);
      return <span className="db-cell-json" title={jsonStr}>{jsonStr}</span>;
    }
    const strVal = String(val);
    if (strVal.startsWith('{') || strVal.startsWith('[')) {
      return <span className="db-cell-json" title={strVal}>{strVal}</span>;
    }
    return strVal;
  };

  const tabelaAtualInfo = useMemo(() => {
    return tabelas.find((t) => t.name === tabelaSelecionada);
  }, [tabelas, tabelaSelecionada]);

  return (
    <AppLayout>
      {({ openDrawer }) => (
        <div className="db-manager-container">
          {/* Top Header */}
          <div className="db-header">
            <div className="db-title-group">
              <h1>
                <button
                  type="button"
                  className="drawer-toggle-btn"
                  onClick={openDrawer}
                  title="Abrir Menu"
                  style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', marginRight: '6px' }}
                >
                  ☰
                </button>
                <span>🗄️ Gerenciador de Banco de Dados</span>
              </h1>
              <p>Visualização, consultas avançadas, CRUD e controle de esquema (SQLite & Turso)</p>
            </div>

            <div className="db-header-actions">
              {status && (
                <div className={`db-status-badge ${status.mode === 'turso_replica' ? 'turso' : 'local'}`}>
                  <span className="db-status-dot" />
                  <span>{status.mode === 'turso_replica' ? 'Turso Cloud (Ativo)' : 'SQLite Local (Offline)'}</span>
                </div>
              )}

              <button
                type="button"
                className="db-sync-btn"
                onClick={handleSincronizar}
                disabled={sincronizando}
                title="Sincronizar réplica local com Turso na nuvem"
              >
                <span>{sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar com Turso'}</span>
              </button>
            </div>
          </div>

          {/* Abas Superiores */}
          <nav className="db-tabs">
            <button
              type="button"
              className={`db-tab-btn ${tabAtiva === 'tabelas' ? 'active' : ''}`}
              onClick={() => setTabAtiva('tabelas')}
            >
              <span>📊 Explorador de Tabelas</span>
            </button>
            <button
              type="button"
              className={`db-tab-btn ${tabAtiva === 'terminal' ? 'active' : ''}`}
              onClick={() => setTabAtiva('terminal')}
            >
              <span>💻 Terminal SQL</span>
            </button>
            <button
              type="button"
              className={`db-tab-btn ${tabAtiva === 'docs' ? 'active' : ''}`}
              onClick={() => setTabAtiva('docs')}
            >
              <span>📖 Documentação & Relacionamentos</span>
            </button>
          </nav>

          {/* ══════════════════════════════════════════════════════════
              ABA 1: EXPLORADOR DE TABELAS (CRUD)
              ══════════════════════════════════════════════════════════ */}
          {tabAtiva === 'tabelas' && (
            <div>
              {/* Seletor de Tabelas */}
              <div className="db-table-selector">
                {tabelas.map((tab) => (
                  <button
                    key={tab.name}
                    type="button"
                    className={`db-table-pill ${tabelaSelecionada === tab.name ? 'active' : ''}`}
                    onClick={() => {
                      setTabelaSelecionada(tab.name);
                      setPagina(1);
                      setBusca('');
                      setBuscaDigitada('');
                    }}
                  >
                    <span className="db-table-pill-name">{tab.name}</span>
                    <span className="db-table-pill-count">{tab.rowCount}</span>
                  </button>
                ))}
              </div>

              {/* Barra de Ferramentas */}
              <div className="db-toolbar">
                <form className="db-toolbar-left" onSubmit={handleAplicarBusca}>
                  <input
                    type="text"
                    className="db-search-input"
                    placeholder="Filtrar dados nesta tabela..."
                    value={buscaDigitada}
                    onChange={(e) => setBuscaDigitada(e.target.value)}
                  />
                  <button type="submit" className="db-btn db-btn-secondary">
                    🔍 Filtrar
                  </button>
                  {busca && (
                    <button type="button" className="db-btn db-btn-secondary" onClick={handleLimparBusca}>
                      ✕ Limpar
                    </button>
                  )}
                </form>

                <div className="db-toolbar-right">
                  <select
                    className="db-search-input"
                    style={{ width: 'auto' }}
                    value={limite}
                    onChange={(e) => {
                      setLimite(Number(e.target.value));
                      setPagina(1);
                    }}
                  >
                    <option value={10}>10 por página</option>
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>

                  <button
                    type="button"
                    className="db-btn db-btn-primary"
                    onClick={handleAbrirNovo}
                  >
                    ➕ Novo Registro
                  </button>

                  <button
                    type="button"
                    className="db-btn db-btn-secondary"
                    onClick={() => carregarRegistros(tabelaSelecionada)}
                    title="Recarregar dados"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* Grid de Dados */}
              {loadingDados ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-500)' }}>
                  Carregando registros...
                </div>
              ) : dadosTabela && dadosTabela.rows.length > 0 ? (
                <>
                  {/* Visualização Desktop (Tabela) */}
                  <div className="db-table-wrapper">
                    <div className="db-table-scroll">
                      <table className="db-table">
                        <thead>
                          <tr>
                            {dadosTabela.columns.map((col) => (
                              <th
                                key={col.name}
                                className="sortable"
                                onClick={() => handleOrdenarColuna(col.name)}
                              >
                                <span>{col.name}</span>
                                {col.pk && <span className="db-pk-badge">PK</span>}
                                {ordenacao.coluna === col.name && (
                                  <span style={{ marginLeft: '4px' }}>
                                    {ordenacao.dir === 'ASC' ? '▲' : '▼'}
                                  </span>
                                )}
                              </th>
                            ))}
                            <th className="db-actions-cell">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dadosTabela.rows.map((row, idx) => (
                            <tr key={idx}>
                              {dadosTabela.columns.map((col) => (
                                <td key={col.name}>
                                  {formatarValorCelula(row[col.name])}
                                </td>
                              ))}
                              <td className="db-actions-cell">
                                <button
                                  type="button"
                                  className="db-action-icon-btn"
                                  title="Editar registro (UPDATE)"
                                  onClick={() => handleAbrirEdicao(row)}
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  className="db-action-icon-btn"
                                  title="Excluir registro (DELETE)"
                                  onClick={() => handleAbrirExclusao(row)}
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Visualização Mobile/Tablet (Cards Verticais <= 1024px) */}
                  <div className="db-cards-view">
                    {dadosTabela.rows.map((row, idx) => (
                      <div key={idx} className="db-card-item">
                        {dadosTabela.columns.map((col) => (
                          <div key={col.name} className="db-card-row">
                            <span className="db-card-label">
                              {col.name}
                              {col.pk && <span className="db-pk-badge">PK</span>}
                            </span>
                            <span className="db-card-value">
                              {formatarValorCelula(row[col.name])}
                            </span>
                          </div>
                        ))}
                        <div className="db-card-actions">
                          <button
                            type="button"
                            className="db-btn db-btn-secondary"
                            onClick={() => handleAbrirEdicao(row)}
                            style={{ flex: 1 }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="db-btn db-btn-danger"
                            onClick={() => handleAbrirExclusao(row)}
                            style={{ flex: 1 }}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginação */}
                  <div className="db-pagination">
                    <span>
                      Mostrando {dadosTabela.rows.length} de {dadosTabela.total} registros
                      (Página {dadosTabela.page} de {dadosTabela.totalPages})
                    </span>
                    <div className="db-pagination-btns">
                      <button
                        type="button"
                        className="db-btn db-btn-secondary"
                        disabled={dadosTabela.page <= 1}
                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      >
                        ◀ Anterior
                      </button>
                      <button
                        type="button"
                        className="db-btn db-btn-secondary"
                        disabled={dadosTabela.page >= dadosTabela.totalPages}
                        onClick={() => setPagina((p) => p + 1)}
                      >
                        Próxima ▶
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '14px', border: '1px solid var(--slate-200)' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                    Nenhum registro encontrado na tabela {tabelaSelecionada}.
                  </p>
                  <p style={{ color: 'var(--slate-500)', marginTop: '6px' }}>
                    {busca ? 'Tente ajustar ou limpar o filtro de busca.' : 'Você pode inserir um novo registro usando o botão "+ Novo Registro".'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              ABA 2: TERMINAL / CONSOLE SQL
              ══════════════════════════════════════════════════════════ */}
          {tabAtiva === 'terminal' && (
            <div className="db-terminal-container">
              <div className="db-terminal-editor-card">
                <div className="db-terminal-quick-queries">
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--slate-500)', alignSelf: 'center' }}>
                    Atalhos Rápidos:
                  </span>
                  <button
                    type="button"
                    className="db-quick-query-btn"
                    onClick={() => setSqlQuery('SELECT * FROM logs_auditoria ORDER BY timestamp DESC LIMIT 20;')}
                  >
                    📋 Logs de Auditoria
                  </button>
                  <button
                    type="button"
                    className="db-quick-query-btn"
                    onClick={() => setSqlQuery('SELECT * FROM bipagens_entrada ORDER BY timestamp DESC LIMIT 25;')}
                  >
                    📦 Bipagens Recentes
                  </button>
                  <button
                    type="button"
                    className="db-quick-query-btn"
                    onClick={() => setSqlQuery('SELECT status, COUNT(*) as qtd FROM conferencias_entrada GROUP BY status;')}
                  >
                    📊 Conferências por Status
                  </button>
                  <button
                    type="button"
                    className="db-quick-query-btn"
                    onClick={() => setSqlQuery('SELECT * FROM usuarios_acessos;')}
                  >
                    👥 Permissões de Usuários
                  </button>
                </div>

                <textarea
                  className="db-sql-textarea"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleExecutarSql();
                    }
                  }}
                  placeholder="Digite sua query SQL aqui (Ex: SELECT * FROM conferencias_entrada;)"
                />

                <div className="db-terminal-actions">
                  <span className="db-terminal-hint">
                    Dica: Pressione <b>Ctrl + Enter</b> para executar rapidamente.
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="db-btn db-btn-secondary"
                      onClick={() => setSqlQuery('')}
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      className="db-btn db-btn-primary"
                      onClick={handleExecutarSql}
                      disabled={executandoSql}
                    >
                      {executandoSql ? '⏳ Executando...' : '▶ Executar Query'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Resultados da Query */}
              {sqlResult && (
                <div className="db-terminal-results-card">
                  <div className="db-results-header">
                    <span className="db-results-metrics">
                      ✓ Executado em {sqlResult.executionTimeMs} ms • {sqlResult.rows.length} linhas retornadas
                      {sqlResult.rowsAffected > 0 && ` • ${sqlResult.rowsAffected} linhas afetadas`}
                    </span>
                    {sqlResult.rows.length > 0 && (
                      <button
                        type="button"
                        className="db-btn db-btn-secondary"
                        onClick={handleExportarJson}
                      >
                        ⬇ Exportar JSON
                      </button>
                    )}
                  </div>

                  {sqlResult.columns.length > 0 && sqlResult.rows.length > 0 ? (
                    <div className="db-table-wrapper">
                      <div className="db-table-scroll">
                        <table className="db-table">
                          <thead>
                            <tr>
                              {sqlResult.columns.map((c) => (
                                <th key={c}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sqlResult.rows.map((row, idx) => (
                              <tr key={idx}>
                                {sqlResult.columns.map((c) => (
                                  <td key={c}>{formatarValorCelula(row[c])}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                      Comando executado com sucesso sem linhas de retorno.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              ABA 3: DOCUMENTAÇÃO & RELACIONAMENTOS (DICIONÁRIO)
              ══════════════════════════════════════════════════════════ */}
          {tabAtiva === 'docs' && docs && (
            <div className="db-docs-container">
              {/* Regra Arquitetural Obrigatória */}
              <div className="db-rule-alert">
                <h3>⚠️ REGRA ARQUITETURAL MANDATÓRIA — EVOLUÇÃO DO BANCO</h3>
                <ul>
                  {docs.regrasArquiteturais.map((regra, i) => (
                    <li key={i}>{regra}</li>
                  ))}
                </ul>
              </div>

              {/* Relações entre Tabelas */}
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '12px' }}>
                  🔗 Relacionamento entre as Tabelas
                </h2>
                <div className="db-relations-grid">
                  {docs.relacionamentos.map((rel, i) => (
                    <div key={i} className="db-relation-card">
                      <div className="db-relation-title">
                        <span>{rel.origem}</span>
                        <span>➔</span>
                        <span>{rel.destino}</span>
                      </div>
                      <span className="db-relation-cardinality">{rel.cardinalidade}</span>
                      <div>
                        <code className="db-relation-key">{rel.chave}</code>
                      </div>
                      <p className="db-relation-desc">{rel.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dicionário de Dados */}
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '12px' }}>
                  📖 Dicionário de Dados do Sistema
                </h2>
                {docs.tabelas.map((tab) => (
                  <div key={tab.nome} className="db-dict-table-card">
                    <div className="db-dict-table-header">
                      <div className="db-dict-table-name">
                        <span>📋 {tab.nome}</span>
                      </div>
                      <p className="db-dict-table-desc">{tab.descricao}</p>
                    </div>
                    <div className="db-table-scroll">
                      <table className="db-table">
                        <thead>
                          <tr>
                            <th>Coluna</th>
                            <th>Tipo</th>
                            <th>Chave</th>
                            <th>Obrigatório</th>
                            <th>Descrição Funcional no ConferCheck</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tab.colunas.map((col) => (
                            <tr key={col.nome}>
                              <td>
                                <b>{col.nome}</b>
                              </td>
                              <td>
                                <code style={{ color: 'var(--orange-600)' }}>{col.tipo}</code>
                              </td>
                              <td>{col.pk ? <span className="db-pk-badge">PK</span> : '—'}</td>
                              <td>{col.notnull ? 'Sim' : 'Não'}</td>
                              <td>{col.descricao}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              MODAIS: EDIÇÃO, NOVO, EXCLUSÃO
              ══════════════════════════════════════════════════════════ */}

          {/* Modal de Edição (UPDATE) */}
          {registroEditando && dadosTabela && (
            <div className="db-modal-overlay">
              <div className="db-modal">
                <div className="db-modal-header">
                  <h2>✏️ Editar Registro ({tabelaSelecionada})</h2>
                  <button
                    type="button"
                    className="db-modal-close-btn"
                    onClick={() => setRegistroEditando(null)}
                  >
                    ✕
                  </button>
                </div>

                <div>
                  {dadosTabela.columns.map((col) => {
                    const isPk = col.pk;
                    const val = formEdit[col.name];
                    const isLongOrJson = typeof val === 'object' || (typeof val === 'string' && (val.length > 50 || val.startsWith('{') || val.startsWith('[')));

                    return (
                      <div key={col.name} className="db-form-group">
                        <label className="db-form-label">
                          {col.name} {isPk && <span className="db-pk-badge">PK (Imutável)</span>}
                        </label>
                        {isLongOrJson ? (
                          <textarea
                            className="db-form-textarea"
                            disabled={isPk}
                            value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val ?? ''}
                            onChange={(e) => {
                              setFormEdit({ ...formEdit, [col.name]: e.target.value });
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            className="db-form-input"
                            disabled={isPk}
                            value={val ?? ''}
                            onChange={(e) => {
                              setFormEdit({ ...formEdit, [col.name]: e.target.value });
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="db-modal-actions">
                  <button
                    type="button"
                    className="db-btn db-btn-secondary"
                    onClick={() => setRegistroEditando(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="db-btn db-btn-primary"
                    onClick={handleSalvarEdicao}
                  >
                    💾 Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Exclusão (DELETE) */}
          {registroExcluindo && dadosTabela && (
            <div className="db-modal-overlay">
              <div className="db-modal" style={{ maxWidth: '480px' }}>
                <div className="db-modal-header">
                  <h2 style={{ color: '#b91c1c' }}>🗑️ Confirmar Exclusão</h2>
                  <button
                    type="button"
                    className="db-modal-close-btn"
                    onClick={() => setRegistroExcluindo(null)}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ color: 'var(--slate-700)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '14px' }}>
                  Tem certeza que deseja excluir este registro da tabela <b>{tabelaSelecionada}</b>?
                  Esta ação não pode ser desfeita e será registrada na auditoria.
                </p>

                <div style={{ background: 'var(--slate-100)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <b>Chave Identificadora:</b>
                  <pre style={{ margin: '4px 0 0', fontFamily: 'monospace' }}>
                    {JSON.stringify(extrairPk(registroExcluindo, dadosTabela.columns), null, 2)}
                  </pre>
                </div>

                <div className="db-modal-actions">
                  <button
                    type="button"
                    className="db-btn db-btn-secondary"
                    onClick={() => setRegistroExcluindo(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="db-btn db-btn-danger"
                    onClick={handleConfirmarExclusao}
                  >
                    Sim, Excluir Registro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Inserção (INSERT) */}
          {modalNovoAberto && dadosTabela && (
            <div className="db-modal-overlay">
              <div className="db-modal">
                <div className="db-modal-header">
                  <h2>➕ Novo Registro ({tabelaSelecionada})</h2>
                  <button
                    type="button"
                    className="db-modal-close-btn"
                    onClick={() => setModalNovoAberto(false)}
                  >
                    ✕
                  </button>
                </div>

                <div>
                  {dadosTabela.columns.map((col) => {
                    return (
                      <div key={col.name} className="db-form-group">
                        <label className="db-form-label">
                          {col.name} {col.pk && <span className="db-pk-badge">PK</span>}
                          {col.notnull && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                        </label>
                        <input
                          type="text"
                          className="db-form-input"
                          placeholder={col.defaultValue ? `Padrão: ${col.defaultValue}` : ''}
                          value={formNovo[col.name] ?? ''}
                          onChange={(e) => {
                            setFormNovo({ ...formNovo, [col.name]: e.target.value });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="db-modal-actions">
                  <button
                    type="button"
                    className="db-btn db-btn-secondary"
                    onClick={() => setModalNovoAberto(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="db-btn db-btn-primary"
                    onClick={handleSalvarNovo}
                  >
                    ➕ Inserir no Banco
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast de Feedback */}
          {toast && (
            <div className={`db-toast ${toast.tipo}`}>
              {toast.texto}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
