import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import { NotaEntrada, StatusConferenciaEntrada } from '../../domain/models/ConferenciaEntrada';
import { AppLayout, AppHeader, Botao, Campo, Container, Painel, Label } from '../components';
import { Loading } from '../components/Loading/Loading';

const recebimentoService = new RecebimentoApiService();

function classeStatusEntrada(status: StatusConferenciaEntrada): string {
  if (status === 'Conferido') return 'badge-success';
  if (['N1 em Andamento', 'N2 em Andamento', 'N3 em Andamento', 'Aguardando N2', 'Aguardando N3'].includes(status)) return 'badge-warning';
  if (['Divergente', 'Em Reconferência'].includes(status)) return 'badge-danger';
  return 'badge-pending';
}

function formatarMoeda(valor?: number): string {
  if (valor === undefined || valor === null) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataStr?: string): string {
  if (!dataStr) return '—';
  // Ex: "02092026 00:00:00" ou ISO
  const limpa = dataStr.trim();
  if (limpa.length >= 8 && /^\d{8}/.test(limpa)) {
    const dia = limpa.substring(0, 2);
    const mes = limpa.substring(2, 4);
    const ano = limpa.substring(4, 8);
    return `${dia}/${mes}/${ano}`;
  }
  return limpa.split(' ')[0] || dataStr;
}

export function RecebimentoPage() {
  const { temPermissao } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notas, setNotas] = useState<NotaEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [selectedNunotas, setSelectedNunotas] = useState<Set<number>>(new Set());

  const podeAcessar = temPermissao('conferencia_entrada');

  useEffect(() => {
    const locState = location.state as { mensagem?: string } | null;
    if (locState?.mensagem) {
      setSucesso(locState.mensagem);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const carregarNotas = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const dados = await recebimentoService.listarNotas();
      setNotas(dados);
      setSelectedNunotas(new Set());
    } catch (err: any) {
      setErro(err.response?.data?.error || err.message || 'Erro ao carregar notas de entrada.');
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

  const handleIniciarConferencia = (nunotasParaConferir: number[], confId?: string, nivel?: number) => {
    if (nunotasParaConferir.length === 0) return;
    navigate('/recebimento/conferencia', {
      state: {
        nunotas: nunotasParaConferir,
        conferenciaId: confId,
        nivel: nivel,
      },
    });
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
          {/* Header */}
          <AppHeader
            titulo="Conferência de Entrada"
            subtitulo="Recebimento de Mercadorias e Pedidos de Compra"
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          {/* Feedback de Erro */}
          {erro && (
            <div className="error-message" onClick={() => setErro(null)}>
              {erro}
            </div>
          )}

          {/* Feedback de Sucesso */}
          {sucesso && (
            <div style={{ marginBottom: '14px', cursor: 'pointer' }} onClick={() => setSucesso(null)}>
              <Container variant="default" padding="sm" className="feedback-success">
                <strong>{sucesso}</strong>
              </Container>
            </div>
          )}

          {/* Toolbar: atualizar + pesquisa + seleção em lote + contadores de status */}
          <Container variant="default" padding="sm" className="toolbar-container">
            <div className="toolbar-row">
              <Botao variant="secondary" size="sm" onClick={carregarNotas} loading={loading}>
                Atualizar
              </Botao>

              {selectedNunotas.size > 0 && (
                <Botao
                  variant="primary"
                  size="sm"
                  onClick={() => handleIniciarConferencia(Array.from(selectedNunotas))}
                >
                  📦 Conferir {selectedNunotas.size} Nota(s)
                </Botao>
              )}

              <div style={{ flex: '1', minWidth: '220px', maxWidth: '380px' }}>
                <Campo
                  type="text"
                  placeholder="Filtrar por NF, fornecedor ou NUNOTA..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <Label variant="caption" className="toolbar-contador">
                {notasFiltradas.length} de {notas.length} notas
              </Label>
            </div>

            {/* Contadores por Status (Pills idênticos à conferência de saída) */}
            <div className="status-contadores">
              <button
                type="button"
                className={`status-contador badge-pending ${filtroStatus === 'todos' ? 'status-contador--ativo' : ''}`}
                onClick={() => setFiltroStatus('todos')}
                title="Mostrar todas as notas"
              >
                <span className="status-contador-num">{contadores.todos}</span>
                <span className="status-contador-txt">Todas</span>
              </button>

              <button
                type="button"
                className={`status-contador badge-pending ${filtroStatus === 'pendentes' ? 'status-contador--ativo' : ''}`}
                onClick={() => setFiltroStatus(filtroStatus === 'pendentes' ? 'todos' : 'pendentes')}
                title="Mostrar notas pendentes"
              >
                <span className="status-contador-num">{contadores.pendentes}</span>
                <span className="status-contador-txt">Pendentes</span>
              </button>

              <button
                type="button"
                className={`status-contador badge-warning ${filtroStatus === 'conferindo' ? 'status-contador--ativo' : ''}`}
                onClick={() => setFiltroStatus(filtroStatus === 'conferindo' ? 'todos' : 'conferindo')}
                title="Mostrar notas em andamento"
              >
                <span className="status-contador-num">{contadores.conferindo}</span>
                <span className="status-contador-txt">Em Andamento</span>
              </button>

              <button
                type="button"
                className={`status-contador badge-success ${filtroStatus === 'concluidos' ? 'status-contador--ativo' : ''}`}
                onClick={() => setFiltroStatus(filtroStatus === 'concluidos' ? 'todos' : 'concluidos')}
                title="Mostrar notas concluídas"
              >
                <span className="status-contador-num">{contadores.concluidos}</span>
                <span className="status-contador-txt">Concluídas</span>
              </button>

              {filtroStatus !== 'todos' && (
                <Botao variant="ghost" size="sm" onClick={() => setFiltroStatus('todos')}>
                  Ver todas
                </Botao>
              )}
            </div>
          </Container>

          {/* Loading */}
          {loading && <Loading mensagem="Carregando notas de compra no Sankhya..." />}

          {/* Lista de Cards de Conferência */}
          {!loading && (
            <Painel titulo="Notas de Entrada (Recebimento)" className="lista-painel">
              <div className="lista-conferencias">
                {notasFiltradas.map((n) => {
                  const isEmAndamento =
                    n.statusConferencia !== 'Em Aberto' && n.statusConferencia !== 'Conferido';
                  const isSelected = selectedNunotas.has(n.nunota);

                  return (
                    <Container
                      key={n.nunota}
                      variant="outlined"
                      padding="md"
                      className={`card-conferencia ${isEmAndamento ? 'em-andamento' : ''}`}
                    >
                      <div
                        onClick={() => handleIniciarConferencia([n.nunota], n.conferenciaId, n.nivelAtual)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleIniciarConferencia([n.nunota], n.conferenciaId, n.nivelAtual)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="card-header">
                          <div className="card-header-left" style={{ alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectNota(n.nunota)}
                              onClick={(e) => e.stopPropagation()}
                              title="Selecionar para conferência em lote"
                              style={{ width: '18px', height: '18px', cursor: 'pointer', marginRight: '6px' }}
                            />
                            <Label variant="title">Nota {n.numnota}</Label>
                            <span className="card-nunota">#{n.nunota}</span>
                            <span className="card-parceiro">{n.nomeparc}</span>
                          </div>

                          <span className={`status-badge ${classeStatusEntrada(n.statusConferencia)}`}>
                            {n.statusConferencia}
                          </span>
                        </div>

                        <div className="card-body-compact">
                          <div className="card-metrics-inline">
                            <span><strong>Empresa:</strong> {n.codemp}</span>
                            <span><strong>Itens:</strong> {n.qtdItens}</span>
                            <span><strong>Valor:</strong> {formatarMoeda(n.vlrnota)}</span>
                            <span><strong>Data:</strong> {formatarData(n.dtneg)}</span>
                            {n.serie && <span><strong>Série:</strong> {n.serie}</span>}
                            {n.nivelAtual && <span><strong>Nível Atual:</strong> N{n.nivelAtual}</span>}
                          </div>
                        </div>
                      </div>
                    </Container>
                  );
                })}

                {!loading && notasFiltradas.length === 0 && (
                  <div className="empty-state">
                    <p>
                      {filtroStatus !== 'todos'
                        ? `Nenhuma nota de compra encontrada com o filtro selecionado.`
                        : 'Nenhuma nota de compra pendente de conferência no momento.'}
                    </p>
                  </div>
                )}
              </div>
            </Painel>
          )}
        </div>
      )}
    </AppLayout>
  );
}
