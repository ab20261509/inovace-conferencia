import { useState } from 'react';
import { useAuth } from '../../application/contexts/AuthContext';
import { AppLayout, AppHeader, Botao, Campo, Container } from '../components';
import './Recebimento.css';

export function RecebimentoPage() {
  const { temPermissao } = useAuth();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'conferindo' | 'concluidos'>('todos');

  const podeAcessar = temPermissao('conferencia_entrada');

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
            {/* Hero / Banner do Módulo */}
            <div className="recebimento-hero">
              <div className="recebimento-hero-title">
                <span>📥 Módulo de Recebimento de Mercadorias</span>
                <span className="recebimento-hero-badge">Em Implantação</span>
              </div>
              <p className="recebimento-hero-text">
                Este espaço gerencia o processo de conferência física cega na entrada de mercadorias,
                validação de notas fiscais de fornecedores, batimento de quantidades de pedidos de compra e
                lançamento de estoque no Sankhya.
              </p>
            </div>

            {/* Toolbar e Filtros */}
            <Container variant="default" padding="sm" className="toolbar-container">
              <div className="toolbar-row">
                <Botao variant="secondary" size="sm">
                  Atualizar
                </Botao>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <Campo
                    type="text"
                    placeholder="Buscar por Nota Fiscal, Pedido ou Fornecedor..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>

              <div className="contadores-status-row" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'todos' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('todos')}
                >
                  <span className="contador-label">Todos</span>
                  <span className="contador-valor">0</span>
                </button>
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'pendentes' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('pendentes')}
                >
                  <span className="contador-label">Pendentes</span>
                  <span className="contador-valor">0</span>
                </button>
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'conferindo' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('conferindo')}
                >
                  <span className="contador-label">Em Conferência</span>
                  <span className="contador-valor">0</span>
                </button>
                <button
                  type="button"
                  className={`btn-contador-status ${filtroStatus === 'concluidos' ? 'ativo' : ''}`}
                  onClick={() => setFiltroStatus('concluidos')}
                >
                  <span className="contador-label">Concluídos</span>
                  <span className="contador-valor">0</span>
                </button>
              </div>
            </Container>

            {/* Empty state / informativo */}
            <Container variant="default" padding="lg">
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-500)' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📦🚚</span>
                <h3 style={{ color: 'var(--slate-800)', marginBottom: '8px' }}>
                  Nenhuma nota de entrada aguardando conferência no momento
                </h3>
                <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
                  As notas fiscais de entrada e pedidos de compra liberados pelo setor de compras no Sankhya
                  aparecerão listados aqui para conferência cega e recebimento no estoque.
                </p>
              </div>
            </Container>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
