import { Navigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { ModulosUsuario } from '../../domain/models/Auth';
import { Loading } from '../components/Loading/Loading';
import { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
  modulo?: keyof ModulosUsuario;
}

export function PrivateRoute({ children, modulo }: PrivateRouteProps) {
  const { isAuthenticated, temPermissao, loadingPermissoes, permissoes } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se as permissões estão sendo carregadas e ainda não temos dados em cache, aguarda
  if (loadingPermissoes && !permissoes) {
    return <Loading mensagem="Validando permissões de acesso..." />;
  }

  if (modulo && !temPermissao(modulo)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
