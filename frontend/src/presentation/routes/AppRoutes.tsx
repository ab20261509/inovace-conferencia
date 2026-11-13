import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginPage } from '../pages/Login';
import { ListaConferenciasPage } from '../pages/ListaConferencias';
import { ConferenciaProdutosPage } from '../pages/ConferenciaProdutos';
import { RecebimentoPage } from '../pages/Recebimento';
import { ConferenciaEntradaPage } from '../pages/ConferenciaEntradaPage';
import { GestaoRecebimentoPage } from '../pages/GestaoRecebimento';
import { GestaoAcessosPage } from '../pages/GestaoAcessos';
import { BancoDadosPage } from '../pages/BancoDados/BancoDadosPage';
import { SeparacaoPage } from '../pages/separacao/SeparacaoPage';
import { ReabastecimentoPage } from '../pages/reabastecimento/ReabastecimentoPage';
import { EnderecamentoPage } from '../pages/enderecamento/EnderecamentoPage';
import { HubPage } from '../pages/Hub/HubPage';
import { PrivateRoute } from './PrivateRoute';

import { useAuth } from '../../application/contexts/AuthContext';

function RotaInicialRedirect() {
  const { isAuthenticated, temPermissao, loadingPermissoes, permissoes } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (loadingPermissoes && !permissoes) return null;

  const rotasAutorizadas: string[] = [];
  if (temPermissao('conferencia_saida')) rotasAutorizadas.push('/conferencias');
  if (temPermissao('separacao')) rotasAutorizadas.push('/separacao');
  if (temPermissao('reabastecimento')) rotasAutorizadas.push('/reabastecimento');
  if (temPermissao('enderecamento') || temPermissao('enderecamento_visualizar')) rotasAutorizadas.push('/enderecamento');
  if (temPermissao('conferencia_entrada')) rotasAutorizadas.push('/recebimento');
  if (temPermissao('gestao_recebimento')) rotasAutorizadas.push('/recebimento/gestao');
  if (temPermissao('gerenciar_acessos')) rotasAutorizadas.push('/configuracoes/acessos');

  // Se tiver exatamente 1 módulo, redireciona direto para economizar cliques
  if (rotasAutorizadas.length === 1) {
    return <Navigate to={rotasAutorizadas[0]} replace />;
  }

  // Se tiver múltiplos módulos (como o Supervisor), exibe o Hub Inicial com cards
  return <HubPage />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RotaInicialRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Hub Inicial de Boas-Vindas */}
        <Route
          path="/hub"
          element={
            <PrivateRoute>
              <HubPage />
            </PrivateRoute>
          }
        />

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

        {/* Separação de Cargas (Vendas) */}
        <Route
          path="/separacao"
          element={
            <PrivateRoute modulo="separacao">
              <SeparacaoPage />
            </PrivateRoute>
          }
        />

        {/* Reabastecimento de Picking (Equipe de Empilhadeira) */}
        <Route
          path="/reabastecimento"
          element={
            <PrivateRoute modulo="reabastecimento">
              <ReabastecimentoPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/reabastecimento/*"
          element={
            <PrivateRoute modulo="reabastecimento">
              <ReabastecimentoPage />
            </PrivateRoute>
          }
        />

        {/* Endereçamento WMS (Produto x Endereço & Movimentações) */}
        <Route
          path="/enderecamento"
          element={
            <PrivateRoute modulo="enderecamento">
              <EnderecamentoPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/enderecamento/*"
          element={
            <PrivateRoute modulo="enderecamento">
              <EnderecamentoPage />
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
