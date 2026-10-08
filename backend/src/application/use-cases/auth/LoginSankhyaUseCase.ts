import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ITokenPort } from '../../../domain/ports/ITokenPort.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import {
  CredenciaisInvalidasError,
  DadosInvalidosError,
  SankhyaErroError,
} from '../../../domain/errors/AppError.js';
import { classificarErroGateway } from '../../../infrastructure/gateway/classificarErroGateway.js';

export interface LoginSankhyaInput {
  usuario: string;
  senha: string;
}

export interface LoginSankhyaOutput {
  token: string;
  user: {
    codUsu: number;
    nomeUsu: string;
    jsessionid: string;
  };
}

/**
 * Use Case: Login de usuário Sankhya via MobileLoginSP
 * Autentica no ERP e retorna CODUSU + JWT para uso no frontend
 */
export class LoginSankhyaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly tokenPort: ITokenPort,
    private readonly permissoesRepo?: IPermissoesRepository,
  ) {}

  async execute(input: LoginSankhyaInput, correlationId?: string): Promise<LoginSankhyaOutput> {
    if (!input.usuario || !input.senha) {
      throw new DadosInvalidosError('Informe usuário e senha');
    }

    // 1. Autenticar no Sankhya via MobileLoginSP
    let response;
    try {
      response = await this.gateway.serviceCall<any>(
        'MobileLoginSP.login',
        {
          serviceName: 'MobileLoginSP.login',
          requestBody: {
            NOMUSU: { $: input.usuario },
            INTERNO: { $: input.senha },
          },
        },
        correlationId,
      );
    } catch (erro) {
      const classificado = classificarErroGateway(erro);

      // O MobileLoginSP sinaliza senha errada como erro de negócio. Sem esta
      // tradução, credencial inválida chegaria ao usuário como falha do
      // Sankhya, escondendo a causa real.
      if (
        classificado instanceof SankhyaErroError &&
        /senha|usu[áa]rio|login|inv[áa]lid|incorret|n[ãa]o autorizado|autentica/i.test(
          classificado.message,
        )
      ) {
        throw new CredenciaisInvalidasError();
      }

      throw classificado;
    }

    const body = response.responseBody;

    if (!body?.idusu?.$) {
      throw new CredenciaisInvalidasError();
    }

    // 2. Decodar CODUSU (vem em Base64)
    const codUsuBase64 = body.idusu.$.trim();
    const codUsu = parseInt(Buffer.from(codUsuBase64, 'base64').toString('utf-8'), 10);

    if (isNaN(codUsu)) {
      throw new SankhyaErroError('O Sankhya devolveu um ID de usuário inválido');
    }

    const jsessionid = body.jsessionid?.$ || '';

    // 3. Registrar primeiro ou último acesso do usuário
    if (this.permissoesRepo) {
      try {
        await this.permissoesRepo.registrarAcesso(codUsu, input.usuario);
      } catch (err) {
        console.warn('⚠️ Falha ao registrar acesso no login:', err);
      }
    }

    // 4. Gerar JWT com dados do usuário Sankhya
    const token = this.tokenPort.generate({
      userId: String(codUsu),
      username: input.usuario,
      email: `${input.usuario}@sankhya.local`,
    });

    return {
      token,
      user: {
        codUsu,
        nomeUsu: input.usuario,
        jsessionid,
      },
    };
  }
}
