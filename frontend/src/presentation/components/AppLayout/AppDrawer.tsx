import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../application/contexts/AuthContext';
import './AppDrawer.css';

interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirConsultaProduto?: () => void;
}

export function AppDrawer({ isOpen, onClose, onAbrirConsultaProduto }: AppDrawerProps) {
  const { user, logout, temPermissao } = useAuth();
  const navigate = useNavigate();

  // Fechar ao pressionar ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  function handleLogout() {
    onClose();
    logout();
    navigate('/login');
  }

  function handleConsultaClick() {
    onClose();
    if (onAbrirConsultaProduto) {
      onAbrirConsultaProduto();
    }
  }

  const inicialNome = user?.nomeUsu ? user.nomeUsu.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`app-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Sidebar Drawer */}
      <aside className={`app-drawer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        {/* Header */}
        <div className="app-drawer-header">
          <div className="app-drawer-header-top">
            <div className="app-drawer-brand">
              <span className="app-drawer-brand-badge">C</span>
              <span>ConferCheck</span>
            </div>
            <button
              type="button"
              className="app-drawer-close-btn"
              onClick={onClose}
              title="Fechar menu"
              aria-label="Fechar menu"
            >
              ✕
            </button>
          </div>

          <div className="app-drawer-user">
            <div className="app-drawer-avatar">{inicialNome}</div>
            <div className="app-drawer-user-info">
              <span className="app-drawer-user-name" title={user?.nomeUsu}>
                {user?.nomeUsu || 'Usuário'}
              </span>
              <span className="app-drawer-user-code">
                CODUSU: {user?.codUsu || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="app-drawer-nav">
          <span className="app-drawer-section-title">Módulos Operacionais</span>

          {temPermissao('conferencia_saida') && (
            <NavLink
              to="/conferencias"
              className={({ isActive }) => `app-drawer-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="app-drawer-item-icon">📦</span>
              <span>Conferência de Saída</span>
            </NavLink>
          )}

          {temPermissao('conferencia_entrada') && (
            <NavLink
              to="/recebimento"
              className={({ isActive }) => `app-drawer-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="app-drawer-item-icon">📥</span>
              <span>Conferência de Entrada</span>
              <span className="app-drawer-item-badge">Recebimento</span>
            </NavLink>
          )}

          {temPermissao('consulta_produtos') && (
            <button
              type="button"
              className="app-drawer-item"
              onClick={handleConsultaClick}
            >
              <span className="app-drawer-item-icon">🔍</span>
              <span>Consultar Produto</span>
            </button>
          )}

          {temPermissao('gerenciar_acessos') && (
            <>
              <span className="app-drawer-section-title">Administração</span>
              <NavLink
                to="/configuracoes/acessos"
                className={({ isActive }) => `app-drawer-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="app-drawer-item-icon">⚙️</span>
                <span>Gestão de Acessos</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="app-drawer-footer">
          <button type="button" className="app-drawer-logout-btn" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}
