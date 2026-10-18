import { randomUUID } from 'crypto';
import { IOcorrenciaConferenciaEntradaRepository } from '../../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';
import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';
import {
  OcorrenciaConferenciaEntrada,
  TipoOcorrenciaEntrada,
  OrigemOcorrenciaEntrada,
} from '../../../domain/entities/OcorrenciaConferenciaEntrada.js';

export interface RegistrarOcorrenciaEntradaInput {
  conferenciaId?: string;
  nunota?: number;
  sequencia?: number;
  codprod?: number;
  descrprod?: string;
  tipo: TipoOcorrenciaEntrada;
  quantidade: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  motivo?: string;
  codlocalDestino?: number;
  fotos?: string[];
  origem?: OrigemOcorrenciaEntrada;
  criadoPor?: string;
}

export class RegistrarOcorrenciaEntradaUseCase {
  constructor(
    private readonly ocorrenciaRepo: IOcorrenciaConferenciaEntradaRepository,
    private readonly configRepo?: IConfiguracaoSistemaRepository
  ) {}

  async execute(
    input: RegistrarOcorrenciaEntradaInput
  ): Promise<OcorrenciaConferenciaEntrada> {
    if (!input.tipo) {
      throw new Error('Tipo da ocorrência é obrigatório.');
    }
    if (!input.quantidade || input.quantidade <= 0) {
      throw new Error('Quantidade informada deve ser maior que zero.');
    }

    // Regra: se o produto não possui cadastro (codprod ausente), é obrigatório anexar ao menos 1 imagem/foto
    if (!input.codprod && (!input.fotos || input.fotos.length === 0)) {
      throw new Error(
        'Para produtos sem código de cadastro no Sankhya, é obrigatório anexar ao menos uma foto comprobatória.'
      );
    }

    let codlocalFinal = input.codlocalDestino;

    // Se o local de destino não foi fornecido e NÃO for coletor, busca o parâmetro padrão no sistema
    if (!codlocalFinal && input.origem !== 'COLETOR' && this.configRepo) {
      try {
        let chaveParam = 'recebimento_local_ocorrencia_padrao';
        if (input.tipo === 'AVARIA') {
          chaveParam = 'recebimento_local_avaria';
        } else if (input.tipo === 'VENCIDO') {
          chaveParam = 'recebimento_local_vencido';
        } else if (input.tipo === 'VALIDADE_PROXIMA') {
          chaveParam = 'recebimento_local_validade_proxima';
        }

        const valorParam = await this.configRepo.obterParametro(chaveParam);
        if (valorParam && !isNaN(Number(valorParam))) {
          codlocalFinal = Number(valorParam);
        }
      } catch (err) {
        // Fallback silencioso para manter integridade
      }
    }

    // Default caso não haja parâmetro configurado (apenas se não for do coletor)
    if (!codlocalFinal && input.origem !== 'COLETOR') {
      codlocalFinal = input.tipo === 'VALIDADE_PROXIMA' ? 95 : 99;
    }

    const agora = new Date().toISOString();
    const novaOcorrencia: OcorrenciaConferenciaEntrada = {
      id: randomUUID(),
      conferenciaId: input.conferenciaId,
      nunota: input.nunota,
      sequencia: input.sequencia,
      codprod: input.codprod,
      descrprod: input.descrprod,
      tipo: input.tipo,
      quantidade: input.quantidade,
      lote: input.lote?.trim() || undefined,
      validade: input.validade?.trim() || undefined,
      fabricacao: input.fabricacao?.trim() || undefined,
      motivo: input.motivo?.trim() || undefined,
      codlocalDestino: codlocalFinal,
      fotos: input.fotos || [],
      status: 'PENDENTE',
      origem: input.origem || 'COLETOR',
      criadoPor: input.criadoPor || 'SISTEMA',
      criadoEm: agora,
      atualizadoEm: agora,
    };

    return this.ocorrenciaRepo.criar(novaOcorrencia);
  }
}
