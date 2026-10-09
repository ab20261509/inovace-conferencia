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
            <PrivateRoute modulo="conferencia_entrada">
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/conferencias" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
