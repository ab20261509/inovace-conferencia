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
  login(usuario: string, senha: string): Promise<void>;
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

  const login = useCallback(async (usuario: string, senha: string) => {
    const response = await authService.loginSankhya(usuario, senha);
    setUser(response.user);
    try {
      const modulos = await acessosService.obterMeusAcessos();
      setPermissoes(modulos);
      localStorage.setItem(PERMISSOES_KEY, JSON.stringify(modulos));
    } catch (err) {
      console.warn('Erro ao carregar permissões pós-login:', err);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem(PERMISSOES_KEY);
    setUser(null);
    setPermissoes(null);
  }, []);

  const temPermissao = useCallback((modulo: keyof ModulosUsuario): boolean => {
    // Admins padrão têm acesso irrestrito por garantia
    if (user?.nomeUsu && ADMINS_PADRAO.includes(user.nomeUsu.toUpperCase())) {
      return true;
    }

    if (!permissoes) {
      // Se ainda não carregou, por padrão permite saída para não travar a tela principal inicial
      return modulo === 'conferencia_saida';
    }

    return !!permissoes[modulo];
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
