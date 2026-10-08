import { Navigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { ModulosUsuario } from '../../domain/models/Auth';
import { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
  modulo?: keyof ModulosUsuario;
}

export function PrivateRoute({ children, modulo }: PrivateRouteProps) {
  const { isAuthenticated, temPermissao } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (modulo && !temPermissao(modulo)) {
    if (temPermissao('conferencia_saida')) return <Navigate to="/conferencias" replace />;
    if (temPermissao('conferencia_entrada')) return <Navigate to="/recebimento" replace />;
    if (temPermissao('gerenciar_acessos')) return <Navigate to="/configuracoes/acessos" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
