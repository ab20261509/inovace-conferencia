import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import { NotaEntrada, StatusConferenciaEntrada } from '../../domain/models/ConferenciaEntrada';
import { AppLayout, AppHeader, Botao, Campo, Container } from '../components';
import { Loading } from '../components/Loading/Loading';
import './Recebimento.css';

const recebimentoService = new RecebimentoApiService();

export function RecebimentoPage() {
  const { temPermissao } = useAuth();
  const navigate = useNavigate();

  const [notas, setNotas] = useState<NotaEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [selectedNunotas, setSelectedNunotas] = useState<Set<number>>(new Set());

  const podeAcessar = temPermissao('conferencia_entrada');

  const carregarNotas = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const dados = await recebimentoService.listarNotas();
      setNotas(dados);
      setSelectedNunotas(new Set());
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao carregar notas de entrada.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!podeAcessar) return;
    carregarNotas();
  }, [podeAcessar, carregarNotas]);

  // Contadores
  const contadores = useMemo(() => {
    const pendentes = notas.filter((n) => n.statusConferencia === 'Em Aberto').length;
    const conferindo = notas.filter((n) =>
      ['N1 em Andamento', 'Aguardando N2', 'N2 em Andamento', 'Aguardando N3', 'N3 em Andamento', 'Em Reconferência', 'Divergente'].includes(
        n.statusConferencia
      )
    ).length;
    const concluidos = notas.filter((n) => n.statusConferencia === 'Conferido').length;
    return {
      todos: notas.length,
      pendentes,
      conferindo,
      concluidos,
    };
  }, [notas]);

  // Filtro
  const notasFiltradas = useMemo(() => {
    let resultado = [...notas];
    const termo = busca.trim().toLowerCase();

    if (termo) {
      resultado = resultado.filter(
        (n) =>
          String(n.numnota).includes(termo) ||
          n.nomeparc.toLowerCase().includes(termo) ||
          String(n.nunota).includes(termo)
      );
    }

    if (filtroStatus === 'pendentes') {
      resultado = resultado.filter((n) => n.statusConferencia === 'Em Aberto');
    } else if (filtroStatus === 'conferindo') {
      resultado = resultado.filter((n) =>
        ['N1 em Andamento', 'Aguardando N2', 'N2 em Andamento', 'Aguardando N3', 'N3 em Andamento', 'Em Reconferência', 'Divergente'].includes(
          n.statusConferencia
        )
      );
    } else if (filtroStatus === 'concluidos') {
      resultado = resultado.filter((n) => n.statusConferencia === 'Conferido');
    }

    return resultado;
  }, [notas, busca, filtroStatus]);

  const toggleSelectNota = (nunota: number) => {
    setSelectedNunotas((prev) => {
      const novo = new Set(prev);
      if (novo.has(nunota)) {
        novo.delete(nunota);
      } else {
        novo.add(nunota);
      }
      return novo;
    });
  };

  const toggleSelectTodos = () => {
    if (selectedNunotas.size === notasFiltradas.length && notasFiltradas.length > 0) {
      setSelectedNunotas(new Set());
    } else {
      setSelectedNunotas(new Set(notasFiltradas.map((n) => n.nunota)));
    }
  };

  const handleIniciarConferencia = (nunotasParaConferir: number[]) => {
    if (nunotasParaConferir.length === 0) return;
    navigate('/recebimento/conferencia', {
      state: {
        nunotas: nunotasParaConferir,
      },
    });
  };

  const getStatusBadgeClass = (status: StatusConferenciaEntrada) => {
    switch (status) {
      case 'Conferido':
        return 'badge-status-conferido';
      case 'Divergente':
      case 'Em Reconferência':
        return 'badge-status-divergente';
      case 'N1 em Andamento':
      case 'N2 em Andamento':
      case 'N3 em Andamento':
        return 'badge-status-andamento';
      case 'Aguardando N2':
      case 'Aguardando N3':
        return 'badge-status-aguardando';
      default:
        return 'badge-status-aberto';
    }
  };

  if (!podeAcessar) {
    return (
      <AppLayout>
        {({ openDrawer, abrirConsultaProduto }) => (
          <div className="page-container">
            <AppHeader
              titulo="Conferência de Entrada"
              onOpenDrawer={openDrawer}
              onAbrirConsultaProduto={abrirConsultaProduto}
            />
            <Container variant="default" padding="lg">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span style={{ fontSize: '3rem' }}>🔒</span>
                <h2 style={{ marginTop: '16px', color: 'var(--slate-800)' }}>Acesso Restrito</h2>
                <p style={{ color: 'var(--slate-500)', marginTop: '8px' }}>
                  Seu usuário não possui permissão para acessar o módulo de Conferência de Entrada (Recebimento).
                </p>
              </div>
            </Container>
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {({ openDrawer, abrirConsultaProduto }) => (
        <div className="page-container">
          <AppHeader
            titulo="Conferência de Entrada"
            subtitulo="Recebimento de Mercadorias e Pedidos de Compra"
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          <div className="recebimento-container">
            {/* Feedback / Erro */}
            {erro && <div className="recebimento-alerta-erro">⚠️ {erro}</div>}

            {/* Toolbar e Ações */}
            <Container variant="default" padding="sm" className="recebimento-toolbar">
              <div className="recebimento-toolbar-top">
                <div className="recebimento-search">
                  <Campo
                    type="text"
                    placeholder="Buscar por Nota Fiscal, Fornecedor ou NUNOTA..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>

                <div className="recebimento-actions">
                  {selectedNunotas.size > 0 && (
                    <Botao
                      variant="primary"
                      onClick={() => handleIniciarConferencia(Array.from(selectedNunotas))}
                    >
                      📦 Conferir {selectedNunotas.size} Nota(s)
                    </Botao>
                  )}
                  <Botao variant="secondary" onClick={carregarNotas} disabled={loading}>
                    🔄 Atualizar
                  </Botao>
                </div>
              </div>

              {/* Contadores / Abas de Status */}
              <div className="contadores-status-row">
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'todos' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('todos')}
                >
                  <span className="contador-label">Todas</span>
                  <span className="contador-valor">{contadores.todos}</span>
                </button>
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'pendentes' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('pendentes')}
                >
                  <span className="contador-label">Pendentes</span>
                  <span className="contador-valor">{contadores.pendentes}</span>
                </button>
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'conferindo' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('conferindo')}
                >
                  <span className="contador-label">Em Andamento</span>
                  <span className="contador-valor">{contadores.conferindo}</span>
                </button>
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'concluidos' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('concluidos')}
                >
                  <span className="contador-label">Concluídas</span>
                  <span className="contador-valor">{contadores.concluidos}</span>
                </button>
              </div>
            </Container>

            {/* Loading */}
            {loading ? (
              <Loading mensagem="Consultando notas de compra no Sankhya..." />
            ) : notasFiltradas.length === 0 ? (
              <Container variant="default" padding="lg">
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-500)' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📦🚚</span>
                  <h3 style={{ color: 'var(--slate-800)', marginBottom: '8px' }}>
                    Nenhuma nota de entrada encontrada
                  </h3>
                  <p style={{ maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem' }}>
                    Não foram encontradas notas fiscais de compra liberadas no Sankhya com os filtros selecionados.
                  </p>
                </div>
              </Container>
            ) : (
              <>
                {/* Visualização Desktop: Tabela (> 1024px) */}
                <div className="recebimento-tabela-desktop">
                  <table className="recebimento-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedNunotas.size === notasFiltradas.length && notasFiltradas.length > 0}
                            onChange={toggleSelectTodos}
                            title="Selecionar todas"
                          />
                        </th>
                        <th>NF / Série</th>
                        <th>Fornecedor</th>
                        <th>Itens</th>
                        <th>Valor Total</th>
                        <th>Data Neg.</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notasFiltradas.map((n) => {
                        const isSelected = selectedNunotas.has(n.nunota);
                        return (
                          <tr key={n.nunota} className={isSelected ? 'linha-selecionada' : ''}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectNota(n.nunota)}
                              />
                            </td>
                            <td>
                              <div className="nota-cell-id">
                                <span className="nota-numero">NF {n.numnota}</span>
                                <span className="nota-sub">Série {n.serie || '1'} • NUNOTA {n.nunota}</span>
                              </div>
                            </td>
                            <td>
                              <div className="nota-fornecedor-nome" title={n.nomeparc}>
                                {n.nomeparc}
                              </div>
                              <span className="nota-sub">Cód. Parc: {n.codparc}</span>
                            </td>
                            <td>
                              <span className="badge-itens-count">{n.qtdItens} itens</span>
                            </td>
                            <td>
                              <span className="nota-valor">
                                {n.vlrnota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </td>
                            <td>
                              <span className="nota-sub">{n.dtneg || '—'}</span>
                            </td>
                            <td>
                              <span className={`badge-status ${getStatusBadgeClass(n.statusConferencia)}`}>
                                {n.statusConferencia}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Botao
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIniciarConferencia([n.nunota])}
                              >
                                {n.statusConferencia === 'Conferido' ? '👁️ Ver' : 'Conferir'}
                              </Botao>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visualização Mobile / Tablet: Cards (<= 1024px) */}
                <div className="recebimento-cards-mobile">
                  {notasFiltradas.map((n) => {
                    const isSelected = selectedNunotas.has(n.nunota);
                    return (
                      <div
                        key={`card-${n.nunota}`}
                        className={`recebimento-card-mobile ${isSelected ? 'selecionado' : ''}`}
                      >
                        <div className="card-mobile-top">
                          <label className="card-mobile-checkbox-label">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectNota(n.nunota)}
                            />
                            <span className="card-mobile-nf">NF {n.numnota}</span>
                          </label>
                          <span className={`badge-status ${getStatusBadgeClass(n.statusConferencia)}`}>
                            {n.statusConferencia}
                          </span>
                        </div>

                        <div className="card-mobile-fornecedor">
                          <span className="card-mobile-fornecedor-nome">{n.nomeparc}</span>
                          <span className="card-mobile-meta">
                            NUNOTA: {n.nunota} {n.serie ? `• Série: ${n.serie}` : ''}
                          </span>
                        </div>

                        <div className="card-mobile-metrics">
                          <div className="card-mobile-metric-item">
                            <span className="card-mobile-metric-label">Itens</span>
                            <span className="card-mobile-metric-valor">{n.qtdItens}</span>
                          </div>
                          <div className="card-mobile-metric-item">
                            <span className="card-mobile-metric-label">Valor</span>
                            <span className="card-mobile-metric-valor">
                              {n.vlrnota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                          <div className="card-mobile-metric-item">
                            <span className="card-mobile-metric-label">Data</span>
                            <span className="card-mobile-metric-valor">{n.dtneg || '—'}</span>
                          </div>
                        </div>

                        <div className="card-mobile-footer">
                          <Botao
                            variant="primary"
                            size="md"
                            style={{ width: '100%' }}
                            onClick={() => handleIniciarConferencia([n.nunota])}
                          >
                            {n.statusConferencia === 'Conferido' ? '👁️ Ver Conferência' : '▶ Iniciar Conferência'}
                          </Botao>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

