import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/Login';
import { ListaConferenciasPage } from '../pages/ListaConferencias';
import { ConferenciaProdutosPage } from '../pages/ConferenciaProdutos';
import { RecebimentoPage } from '../pages/Recebimento';
import { ConferenciaEntradaPage } from '../pages/ConferenciaEntradaPage';
import { GestaoRecebimentoPage } from '../pages/GestaoRecebimento';
import { GestaoAcessosPage } from '../pages/GestaoAcessos';
import { BancoDadosPage } from '../pages/BancoDados/BancoDadosPage';
import { PrivateRoute } from './PrivateRoute';

import { useAuth } from '../../application/contexts/AuthContext';

function RotaInicialRedirect() {
  const { isAuthenticated, temPermissao, loadingPermissoes, permissoes } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (loadingPermissoes && !permissoes) return null;
  if (temPermissao('conferencia_saida')) return <Navigate to="/conferencias" replace />;
  if (temPermissao('conferencia_entrada')) return <Navigate to="/recebimento" replace />;
  if (temPermissao('gestao_recebimento')) return <Navigate to="/recebimento/gestao" replace />;
  if (temPermissao('gerenciar_acessos')) return <Navigate to="/configuracoes/acessos" replace />;
  return <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Conferência de Saída */}
        <Route
          path="/conferencias"
          element={
            <PrivateRoute modulo="conferencia_saida">
              <ListaConferenciasPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/conferencias/:nunota"
          element={
            <PrivateRoute modulo="conferencia_saida">
              <ConferenciaProdutosPage />
            </PrivateRoute>
          }
        />

        {/* Conferência de Entrada (Recebimento) */}
        <Route
          path="/recebimento"
          element={
            <PrivateRoute modulo="conferencia_entrada">
              <RecebimentoPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/recebimento/conferencia"
          element={
            <PrivateRoute modulo="conferencia_entrada">
              <ConferenciaEntradaPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/recebimento/gestao"
          element={
            <PrivateRoute modulo="gestao_recebimento">
              <GestaoRecebimentoPage />
            </PrivateRoute>
          }
        />

        {/* Gestão de Acessos / Configurações */}
        <Route
          path="/configuracoes/acessos"
          element={
            <PrivateRoute modulo="gerenciar_acessos">
              <GestaoAcessosPage />
            </PrivateRoute>
          }
        />

        {/* Gerenciador de Banco de Dados (SQLite / Turso) */}
        <Route
          path="/configuracoes/banco"
          element={
            <PrivateRoute modulo="gerenciar_acessos">
              <BancoDadosPage />
            </PrivateRoute>
          }
        />

        {/* Fallback Inteligente */}
        <Route path="*" element={<RotaInicialRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
