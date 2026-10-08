/**
 * Taxonomia de erros da aplicação.
 *
 * Existe para o frontend poder distinguir "sua senha está errada" de "o
 * Sankhya está fora do ar". Antes tudo virava 401, o que fazia o usuário
 * reconferir a senha quando o problema era de infraestrutura.
 *
 * Cada erro carrega:
 *  - statusCode: como o controller deve responder no HTTP
 *  - codigo: identificador estável para o frontend decidir a mensagem,
 *            sem depender do texto (que pode mudar)
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly codigo: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Campos obrigatórios não enviados */
export class DadosInvalidosError extends AppError {
  readonly statusCode = 400;
  readonly codigo = 'DADOS_INVALIDOS';
}

/** Usuário ou senha incorretos no Sankhya */
export class CredenciaisInvalidasError extends AppError {
  readonly statusCode = 401;
  readonly codigo = 'CREDENCIAIS_INVALIDAS';

  constructor(message = 'Usuário ou senha incorretos') {
    super(message);
  }
}

/**
 * Não foi possível alcançar o Sankhya: DNS, conexão recusada, timeout.
 * Problema de rede ou de disponibilidade, não de credencial do usuário.
 */
export class SankhyaIndisponivelError extends AppError {
  readonly statusCode = 503;
  readonly codigo = 'SANKHYA_INDISPONIVEL';

  constructor(message = 'Não foi possível conectar ao Sankhya') {
    super(message);
  }
}

/**
 * O Sankhya respondeu, mas com erro (status "0" no serviço, 5xx do Gateway,
 * payload inesperado). A requisição chegou lá e falhou do outro lado.
 */
export class SankhyaErroError extends AppError {
  readonly statusCode = 502;
  readonly codigo = 'SANKHYA_ERRO';

  constructor(message = 'O Sankhya retornou um erro') {
    super(message);
  }
}

/**
 * O Gateway recusou as credenciais da APLICAÇÃO (client_id / client_secret /
 * x-token). É erro de configuração do backend, não do usuário final.
 */
export class GatewayNaoAutorizadoError extends AppError {
  readonly statusCode = 502;
  readonly codigo = 'GATEWAY_NAO_AUTORIZADO';

  constructor(message = 'Credenciais de integração do Gateway Sankhya recusadas') {
    super(message);
  }
}

/**
 * Usuário autenticado não possui permissão para executar a ação ou acessar o módulo.
 */
export class AcessoNegadoError extends AppError {
  readonly statusCode = 403;
  readonly codigo = 'ACESSO_NEGADO';

  constructor(message = 'Acesso não autorizado para esta funcionalidade') {
    super(message);
  }
}
