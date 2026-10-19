import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { UserSession, ModulosUsuario } from '../../domain/models/Auth';
import { AuthApiService } from '../../infrastructure/api/AuthApiService';
import { AcessosApiService } from '../../infrastructure/api/AcessosApiService';

const PERMISSOES_KEY = 'conferencia_permissoes';

const ADMINS_PADRAO = ['SUP', 'ANTONY', 'ANTONY.B'];

interface AuthContextData {
  user: UserSession | null;
  permissoes: ModulosUsuario | null;
  isAuthenticated: boolean;
  loadingPermissoes: boolean;
  login(usuario: string, senha: string): Promise<ModulosUsuario | null>;
  logout(): void;
  temPermissao(modulo: keyof ModulosUsuario): boolean;
  carregarPermissoes(): Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const authService = new AuthApiService();
const acessosService = new AcessosApiService();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    const stored = authService.getUser();
    if (!stored) return null;
    return { codUsu: stored.codUsu, nomeUsu: stored.nomeUsu, jsessionid: '' };
  });

  const [permissoes, setPermissoes] = useState<ModulosUsuario | null>(() => {
    const stored = localStorage.getItem(PERMISSOES_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const [loadingPermissoes, setLoadingPermissoes] = useState<boolean>(false);

  const isAuthenticated = !!user && !!authService.getToken();

  const carregarPermissoes = useCallback(async () => {
    if (!authService.getToken()) return;
    setLoadingPermissoes(true);
    try {
      const modulos = await acessosService.obterMeusAcessos();
      setPermissoes(modulos);
      localStorage.setItem(PERMISSOES_KEY, JSON.stringify(modulos));
    } catch (err) {
      console.warn('Erro ao carregar permissões do usuário:', err);
    } finally {
      setLoadingPermissoes(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      carregarPermissoes();
    }
  }, [isAuthenticated, carregarPermissoes]);

  const login = useCallback(async (usuario: string, senha: string): Promise<ModulosUsuario | null> => {
    const response = await authService.loginSankhya(usuario, senha);
    setUser(response.user);
    try {
      const modulos = await acessosService.obterMeusAcessos();
      setPermissoes(modulos);
      localStorage.setItem(PERMISSOES_KEY, JSON.stringify(modulos));
      return modulos;
    } catch (err) {
      console.warn('Erro ao carregar permissões pós-login:', err);
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem(PERMISSOES_KEY);
    setUser(null);
    setPermissoes(null);
  }, []);

  const temPermissao = useCallback((modulo: keyof ModulosUsuario): boolean => {
    const ehAdminPadrao = !!(user?.nomeUsu && ADMINS_PADRAO.includes(user.nomeUsu.toUpperCase()));

    // Se as permissões já foram carregadas do backend, respeitamos o que está configurado
    if (permissoes) {
      if (ehAdminPadrao && modulo === 'gerenciar_acessos') {
        return true; // Administradores padrão nunca perdem acesso ao painel de gestão
      }
      if (
        modulo === 'conferencia_entrada_n1' ||
        modulo === 'conferencia_entrada_n2' ||
        modulo === 'conferencia_entrada_n3'
      ) {
        return permissoes[modulo] !== false;
      }
      if (modulo === 'conferencia_entrada_divergente' || modulo === 'conferencia_entrada_conferido') {
        // Administradores/supervisores: true por padrão
        if (ehAdminPadrao || permissoes.gerenciar_acessos) {
          return permissoes[modulo] !== false;
        }
        // Operadores padrão: inativo (false) por padrão
        return permissoes[modulo] === true;
      }
      return !!permissoes[modulo];
    }

    // Se ainda não carregou do backend, administradores nativos têm acesso total por padrão
    if (ehAdminPadrao) {
      return true;
    }

    // Padrão seguro e estrito: sem permissões carregadas, bloqueia até que o backend responda
    return false;
  }, [user, permissoes]);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissoes,
        isAuthenticated,
        loadingPermissoes,
        login,
        logout,
        temPermissao,
        carregarPermissoes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
