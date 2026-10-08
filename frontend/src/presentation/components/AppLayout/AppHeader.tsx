import { ReactNode } from 'react';
import { useAuth } from '../../../application/contexts/AuthContext';
import { Botao } from '../Botao/Botao';
import './AppDrawer.css';

interface AppHeaderProps {
  titulo: string;
  subtitulo?: string;
  onOpenDrawer: () => void;
  onAbrirConsultaProduto?: () => void;
  children?: ReactNode;
}

export function AppHeader({
  titulo,
  subtitulo,
  onOpenDrawer,
  onAbrirConsultaProduto,
  children,
}: AppHeaderProps) {
  const { user, logout, temPermissao } = useAuth();

  return (
    <header className="app-global-header">
      <div className="app-header-left">
        <button
          type="button"
          className="app-hamburger-btn"
          onClick={onOpenDrawer}
          title="Abrir menu de navegação"
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="app-header-title-container">
          <h1 className="app-header-title">{titulo}</h1>
          {subtitulo && <span className="app-header-subtitle">{subtitulo}</span>}
        </div>
      </div>

      <div className="app-header-actions">
        {children}
        {temPermissao('consulta_produtos') && onAbrirConsultaProduto && (
          <Botao variant="secondary" size="sm" onClick={onAbrirConsultaProduto}>
            Consultar Produto
          </Botao>
        )}
        <span className="user-info">{user?.nomeUsu}</span>
        <Botao variant="ghost" size="sm" onClick={logout}>
          Sair
        </Botao>
      </div>
    </header>
  );
}
