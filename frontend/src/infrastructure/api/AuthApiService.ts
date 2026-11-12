import { IAuthService } from '../../domain/ports/IAuthService';
import { LoginResponse } from '../../domain/models/Auth';
import { httpClient } from './httpClient';

const TOKEN_KEY = 'conferencia_token';
const USER_KEY = 'conferencia_user';

export class AuthApiService implements IAuthService {
  async loginSankhya(usuario: string, senha: string): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>('/auth/sankhya-login', {
      usuario,
      senha,
    });

    const { token, user } = response.data;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return response.data;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): { codUsu: number; nomeUsu: string } | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('conferencia_filtros');
    localStorage.removeItem('conferencia_status_selecionado');
  }
}
