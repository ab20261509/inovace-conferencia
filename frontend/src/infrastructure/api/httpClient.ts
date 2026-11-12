import axios, { AxiosInstance } from 'axios';

const TOKEN_KEY = 'conferencia_token';
export const SERVER_URL_KEY = 'CONFERCHECK_SERVER_URL';

export function getServerBaseUrl(): string {
  const customUrl = localStorage.getItem(SERVER_URL_KEY);
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }
  return (import.meta.env.VITE_API_URL as string | undefined) || '';
}

export function setServerBaseUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned) {
    localStorage.setItem(SERVER_URL_KEY, cleaned);
    httpClient.defaults.baseURL = cleaned;
  } else {
    localStorage.removeItem(SERVER_URL_KEY);
    httpClient.defaults.baseURL = (import.meta.env.VITE_API_URL as string | undefined) || '';
  }
}

/**
 * Retorna a URL absoluta ou relativa correta para a imagem do produto.
 * No ambiente mobile (Capacitor), prefixa com a URL do backend configurada.
 */
export function getProdutoImagemUrl(codProd: number | string | undefined | null): string {
  if (!codProd) return '';
  const baseUrl = getServerBaseUrl();
  return `${baseUrl}/api/crud/produto/${codProd}/imagem`;
}

export const httpClient: AxiosInstance = axios.create({
  baseURL: getServerBaseUrl(),
  timeout: 30000,
});

// Interceptor: injeta token e base URL dinâmica em todas as requisições
httpClient.interceptors.request.use((config) => {
  const dynamicBaseUrl = getServerBaseUrl();
  if (dynamicBaseUrl) {
    config.baseURL = dynamicBaseUrl;
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[httpClient] [REQ] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url || ''}`);
  return config;
});

// Interceptor: trata erros de rede e autenticação
httpClient.interceptors.response.use(
  (response) => {
    console.log(`[httpClient] [RES ${response.status}] ${response.config.method?.toUpperCase()} ${response.config.baseURL || ''}${response.config.url || ''}`);
    return response;
  },
  (error) => {
    const fullUrl = `${error?.config?.baseURL || ''}${error?.config?.url || ''}`;
    console.error('[httpClient] [ERR]', {
      url: fullUrl,
      code: error?.code,
      message: error?.message,
      hasResponse: !!error?.response,
      status: error?.response?.status,
    });

    // Servidor offline / erro de rede
    if (!error.response) {
      const detalhe = error?.message || error?.code || 'Erro de rede';
      const networkError = new Error(`Servidor indisponível (${detalhe}). Destino: ${fullUrl || 'padrão'}`);
      (networkError as any).isNetworkError = true;
      (networkError as any).detalheTecnico = detalhe;
      (networkError as any).urlTentada = fullUrl;
      return Promise.reject(networkError);
    }

    // Proxy retornou 502 (backend offline mas Vite rodando)
    if (error.response.status === 502) {
      const networkError = new Error(`Servidor indisponível (HTTP 502 em ${fullUrl}). Verifique se o backend Node está rodando.`);
      (networkError as any).isNetworkError = true;
      (networkError as any).detalheTecnico = 'HTTP 502 Bad Gateway';
      (networkError as any).urlTentada = fullUrl;
      return Promise.reject(networkError);
    }

    // Token expirado ou inválido → volta para o login.
    //
    // A própria chamada de login é exceção: ali o 401 significa "senha
    // errada", e recarregar a página apagaria a mensagem de erro antes do
    // usuário conseguir ler.
    const url = error.config?.url ?? '';
    const ehTentativaDeLogin = url.includes('/auth/sankhya-login') || url.includes('/auth/login');

    if (error.response.status === 401 && !ehTentativaDeLogin) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);
