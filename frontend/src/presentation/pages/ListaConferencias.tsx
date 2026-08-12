import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { useConferencias } from '../../application/hooks/useConferencias';
import { Botao, Container, Painel, Label } from '../components';
import { FiltrosDinamicos } from '../components/FiltrosDinamicos/FiltrosDinamicos';
import { Loading } from '../components/Loading/Loading';
import { ModalConsultaProduto } from '../components/ModalConsultaProduto/ModalConsultaProduto';
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
                  <span className={`status-badge ${classeStatus(pedido.statusConferencia)}`}>
                    {pedido.statusConferencia}
                  </span>
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
    </div>
  );
}
