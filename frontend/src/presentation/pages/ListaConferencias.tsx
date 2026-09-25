import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { useConferencias } from '../../application/hooks/useConferencias';
import { Botao, Container, Painel, Label } from '../components';
import { FiltrosDinamicos } from '../components/FiltrosDinamicos/FiltrosDinamicos';
import { Loading } from '../components/Loading/Loading';
import { ModalConsultaProduto } from '../components/ModalConsultaProduto/ModalConsultaProduto';
import { ModalNotificarDiscord } from '../components/ModalNotificarDiscord/ModalNotificarDiscord';
import { PedidoConferencia } from '../../domain/models/Conferencia';
import { useState, useEffect, useMemo } from 'react';

/** Cor do badge conforme o status, usada no card e nos contadores */
function classeStatus(status: string): string {
  if (status === 'Em andamento') return 'badge-warning';
  if (status.toLowerCase().includes('recontagem')) return 'badge-danger';
  return 'badge-pending';
}

export function ListaConferenciasPage() {
  const { user, logout } = useAuth();
  const { pedidos, loading, error, recarregar } = useConferencias();
  const [pedidosFiltrados, setPedidosFiltrados] = useState<PedidoConferencia[]>([]);
  const [statusSelecionado, setStatusSelecionado] = useState<string | null>(() => {
    return localStorage.getItem('conferencia_status_selecionado');
  });
  const [filtrosDinamicos, setFiltrosDinamicos] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('conferencia_filtros');
    return stored ? JSON.parse(stored) : {};
  });
  const [showModalProduto, setShowModalProduto] = useState(false);
  const [pedidoNotificarDiscord, setPedidoNotificarDiscord] = useState<PedidoConferencia | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const mensagemSucesso = (location.state as any)?.mensagem || null;

  // Salvar status selecionado no localStorage
  useEffect(() => {
    if (statusSelecionado) {
      localStorage.setItem('conferencia_status_selecionado', statusSelecionado);
    } else {
      localStorage.removeItem('conferencia_status_selecionado');
    }
  }, [statusSelecionado]);

  // Salvar filtros dinâmicos no localStorage
  useEffect(() => {
    localStorage.setItem('conferencia_filtros', JSON.stringify(filtrosDinamicos));
  }, [filtrosDinamicos]);

  // Contagem por status. Calculada sobre o resultado dos FiltrosDinamicos (e não
  // sobre o total) para os números refletirem o que está de fato disponível na
  // lista. Não considera o status selecionado, senão os outros zerariam.
  const contagemPorStatus = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const pedido of pedidosFiltrados) {
      const status = pedido.statusConferencia || 'Sem status';
      mapa.set(status, (mapa.get(status) ?? 0) + 1);
    }
    // Maior primeiro, e desempate alfabético para a ordem não dançar entre renders
    return [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [pedidosFiltrados]);

  // Lista final: resultado dos filtros dinâmicos + o status clicado.
  // Encadear aqui, em vez de mexer no estado interno do FiltrosDinamicos,
  // evita as duas fontes de filtro brigarem entre si.
  const pedidosVisiveis = useMemo(
    () =>
      statusSelecionado
        ? pedidosFiltrados.filter((p) => (p.statusConferencia || 'Sem status') === statusSelecionado)
        : pedidosFiltrados,
    [pedidosFiltrados, statusSelecionado],
  );

  function handleAbrirConferencia(nunota: number, statusConferencia?: string) {
    navigate(`/conferencias/${nunota}`, { state: { statusConferencia } });
  }

  function handleFiltroDinamicoChange(novosFiltros: Record<string, string>) {
    setFiltrosDinamicos(novosFiltros);
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <h1>Conferências de Saída</h1>
        <div className="header-actions">
          <span className="user-info">{user?.nomeUsu}</span>
          <Botao variant="secondary" size="sm" onClick={() => setShowModalProduto(true)}>
            Consultar Produto
          </Botao>
          <Botao variant="ghost" size="sm" onClick={logout}>Sair</Botao>
        </div>
      </header>

       {/* Toolbar: atualizar + filtros + contagem + contadores por status */}
      <Container variant="default" padding="sm" className="toolbar-container">
        <div className="toolbar-row">
          <Botao variant="secondary" size="sm" onClick={recarregar} loading={loading}>
            Atualizar
          </Botao>

          {!loading && (
            <FiltrosDinamicos
              dados={pedidos}
              onFiltrar={setPedidosFiltrados}
              filtrosIniciais={filtrosDinamicos}
              onFiltrosChange={handleFiltroDinamicoChange}
              className="filtros-container--inline"
            />
          )}

          <Label variant="caption" className="toolbar-contador">
            {pedidosVisiveis.length} de {pedidos.length} pedidos
          </Label>
        </div>

        {contagemPorStatus.length > 0 && (
          <div className="status-contadores">
            {contagemPorStatus.map(([status, total]) => {
              const ativo = statusSelecionado === status;
              return (
                <button
                  key={status}
                  type="button"
                  className={`status-contador ${classeStatus(status)} ${ativo ? 'status-contador--ativo' : ''}`}
                  onClick={() => setStatusSelecionado(ativo ? null : status)}
                  aria-pressed={ativo}
                  title={ativo ? 'Clique para remover o filtro' : `Mostrar só ${status}`}
                >
                  <span className="status-contador-num">{total}</span>
                  <span className="status-contador-txt">{status}</span>
                </button>
              );
            })}

            {statusSelecionado && (
              <Botao variant="ghost" size="sm" onClick={() => setStatusSelecionado(null)}>
                Ver todos
              </Botao>
            )}
          </div>
        )}
      </Container>

      {/* Mensagem de sucesso */}
      {mensagemSucesso && (
        <div className="success-message">{mensagemSucesso}</div>
      )}

      {/* Erro */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading */}
      {loading && <Loading mensagem="Carregando conferências..." />}

      {/* Lista */}
      {!loading && (
        <Painel titulo="Pedidos Pendentes" className="lista-painel">
        <div className="lista-conferencias">
          {pedidosVisiveis.map((pedido) => (
            <Container
              key={pedido.nunota}
              variant="outlined"
              padding="md"
              className={`card-conferencia ${pedido.statusConferencia === 'Em andamento' ? 'em-andamento' : ''}`}
            >
              <div
                onDoubleClick={() => handleAbrirConferencia(pedido.nunota, pedido.statusConferencia)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleAbrirConferencia(pedido.nunota, pedido.statusConferencia)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-header">
                  <div className="card-header-left">
                    <Label variant="title">Pedido {pedido.numNota}</Label>
                    <span className="card-nunota">#{pedido.nunota}</span>
                    <span className="card-parceiro">{pedido.parceiro}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pedido.statusConferencia === 'Em andamento' && (
                      <button
                        type="button"
                        className="btn-card-discord"
                        title="Notificar pendência no Discord"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPedidoNotificarDiscord(pedido);
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        <span>Discord</span>
                      </button>
                    )}
                    <span className={`status-badge ${classeStatus(pedido.statusConferencia)}`}>
                      {pedido.statusConferencia}
                    </span>
                  </div>
                </div>

                <div className="card-body-compact">
                  <div className="card-metrics-inline">
                    <span><strong>Rota:</strong> {pedido.rotaEntrega || '-'}</span>
                    <span><strong>Vol:</strong> {pedido.qtdVolumes || 0}</span>
                    <span><strong>Prod:</strong> {pedido.qtdProdutosDistintos}</span>
                    <span><strong>OC:</strong> {pedido.ordemCarga || '-'}</span>
                    <span><strong>Transp:</strong> {pedido.transportadora || '-'}</span>
                    {pedido.usuarioConferente && (
                      <span><strong>Conferente:</strong> {pedido.usuarioConferente}</span>
                    )}
                  </div>
                  {pedido.obsPedido && (
                    <span className="card-obs-inline">{pedido.obsPedido}</span>
                  )}
                </div>
              </div>
            </Container>
          ))}

          {!loading && pedidosVisiveis.length === 0 && (
            <div className="empty-state">
              <p>
                {statusSelecionado
                  ? `Nenhum pedido com status "${statusSelecionado}"`
                  : 'Nenhum pedido pendente de conferência'}
              </p>
            </div>
          )}
        </div>
      </Painel>
      )}

      {/* Modal de consulta de produtos */}
      <ModalConsultaProduto aberto={showModalProduto} onFechar={() => setShowModalProduto(false)} />

      {/* Modal de notificação no Discord */}
      <ModalNotificarDiscord
        aberto={!!pedidoNotificarDiscord}
        onFechar={() => setPedidoNotificarDiscord(null)}
        pedido={pedidoNotificarDiscord}
        usuario={user?.nomeUsu}
      />
    </div>
  );
}
