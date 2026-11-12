/**
 * Traduz erros de requisição em mensagens para o usuário final.
 *
 * O backend envia um `codigo` estável junto do erro (CREDENCIAIS_INVALIDAS,
 * SANKHYA_INDISPONIVEL, etc.). Preferimos o código ao texto porque a mensagem
 * técnica pode mudar sem aviso, e porque o texto do Sankhya nem sempre é
 * apresentável.
 */

/** Códigos devolvidos pelo backend em `{ error, codigo }` */
export type CodigoErro =
  | 'DADOS_INVALIDOS'
  | 'CREDENCIAIS_INVALIDAS'
  | 'SANKHYA_INDISPONIVEL'
  | 'SANKHYA_ERRO'
  | 'GATEWAY_NAO_AUTORIZADO'
  | 'ERRO_INTERNO';

const MENSAGENS: Record<CodigoErro, string> = {
  DADOS_INVALIDOS: 'Preencha o usuário e a senha para continuar.',
  CREDENCIAIS_INVALIDAS: 'Usuário ou senha incorretos. Verifique e tente novamente.',
  SANKHYA_INDISPONIVEL:
    'Não foi possível conectar ao Sankhya. O ERP pode estar fora do ar ou sem rede. Tente novamente em instantes.',
  SANKHYA_ERRO:
    'O Sankhya recusou a autenticação. Se persistir, acione o supervisor para verificar seu usuário no ERP.',
  GATEWAY_NAO_AUTORIZADO:
    'A integração com o Sankhya está com credenciais inválidas. Acione o suporte técnico.',
  ERRO_INTERNO: 'Ocorreu um erro inesperado. Tente novamente ou acione o suporte.',
};

/** Forma mínima de um erro do axios, sem importar o tipo do axios aqui */
interface ErroRequisicao {
  message?: string;
  isNetworkError?: boolean;
  detalheTecnico?: string;
  urlTentada?: string;
  code?: string;
  response?: {
    status?: number;
    data?: { error?: string; codigo?: string };
  };
}

/**
 * Devolve a mensagem que deve aparecer na tela para um erro de login.
 *
 * Ordem de precedência:
 *  1. Backend inalcançável (o interceptor marca `isNetworkError`)
 *  2. `codigo` enviado pelo backend
 *  3. Status HTTP, para backends antigos que não mandam `codigo`
 *  4. Mensagem genérica
 */
export function mensagemErroLogin(erro: unknown): string {
  const e = erro as ErroRequisicao;

  // 1. Nem chegamos ao backend: servidor parado, rede caída, proxy sem destino
  if (e?.isNetworkError) {
    if (e.detalheTecnico || e.urlTentada) {
      return `Servidor indisponível (${e.detalheTecnico || 'Erro de conexão'}${e.urlTentada ? ` em ${e.urlTentada}` : ''}). Verifique a URL na engrenagem.`;
    }
    return 'Servidor indisponível. Verifique sua conexão ou avise o suporte técnico.';
  }

  // 2. Código explícito do backend
  const codigo = e?.response?.data?.codigo as CodigoErro | undefined;
  if (codigo && codigo in MENSAGENS) {
    return MENSAGENS[codigo];
  }

  // 3. Sem código: decide pelo status
  const status = e?.response?.status;
  if (status === 400) return MENSAGENS.DADOS_INVALIDOS;
  if (status === 401) return MENSAGENS.CREDENCIAIS_INVALIDAS;
  if (status === 502) return MENSAGENS.SANKHYA_ERRO;
  if (status === 503 || status === 504) return MENSAGENS.SANKHYA_INDISPONIVEL;
  if (status && status >= 500) return MENSAGENS.ERRO_INTERNO;

  // 4. Último recurso
  return e?.response?.data?.error || e?.message || MENSAGENS.ERRO_INTERNO;
}
