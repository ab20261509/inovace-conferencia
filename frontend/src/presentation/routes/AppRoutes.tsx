import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/Login';
import { ListaConferenciasPage } from '../pages/ListaConferencias';
import { ConferenciaProdutosPage } from '../pages/ConferenciaProdutos';
import { RecebimentoPage } from '../pages/Recebimento';
import { GestaoAcessosPage } from '../pages/GestaoAcessos';
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

        {/* Gestão de Acessos / Configurações */}
        <Route
          path="/configuracoes/acessos"
          element={
            <PrivateRoute modulo="gerenciar_acessos">
              <GestaoAcessosPage />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/conferencias" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
