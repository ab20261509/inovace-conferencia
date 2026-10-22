import { randomUUID } from 'crypto';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IOcorrenciaConferenciaEntradaRepository } from '../../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';
import { ListarDivergenciasEntradaUseCase } from './ListarDivergenciasEntradaUseCase.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';
import { OcorrenciaConferenciaEntrada } from '../../../domain/entities/OcorrenciaConferenciaEntrada.js';

export interface RegistrarOcorrenciaSobraInput {
  conferenciaId: string;
  nunota: number;
  numnota?: number;
  sequencia?: number;
  codprod: number;
  descrprod?: string;
  quantidadeSobra: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  motivo?: string;
  codlocalDestino?: number;
  fotos?: string[];
  usuario: string;
}

export interface RegistrarOcorrenciaSobraOutput {
  sucesso: boolean;
  mensagem: string;
  ocorrenciaId: string;
  quantidadeAbatida: number;
  divergencias?: any[];
}

export class RegistrarOcorrenciaSobraUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly ocorrenciaRepo: IOcorrenciaConferenciaEntradaRepository,
    private readonly listarDivergenciasUseCase: ListarDivergenciasEntradaUseCase,
    private readonly audit?: AuditService
  ) {}

  async execute(
    input: RegistrarOcorrenciaSobraInput,
    correlationId?: string
  ): Promise<RegistrarOcorrenciaSobraOutput> {
    const rawId = input.conferenciaId.includes('_')
      ? input.conferenciaId.split('_')[0]
      : input.conferenciaId;

    const sessao = await this.conferenciaRepo.obterSessaoPorId(rawId);
    if (!sessao) {
      throw new Error(`Conferência de entrada ${rawId} não encontrada.`);
    }

    const nunota = Number(input.nunota);
    if (!nunota) {
      throw new Error('Número único da nota (nunota) é obrigatório.');
    }

    const codprod = Number(input.codprod);
    if (!codprod) {
      throw new Error('Código do produto é obrigatório.');
    }

    const qtdSobra = Number(input.quantidadeSobra);
    if (isNaN(qtdSobra) || qtdSobra <= 0) {
      throw new Error('A quantidade de sobra informada deve ser maior que zero.');
    }

    const agora = new Date().toISOString();

    // 1. Criar e registrar ocorrência de SOBRA formalmente
    const novaOcorrencia: OcorrenciaConferenciaEntrada = {
      id: randomUUID(),
      conferenciaId: rawId,
      nunota,
      numnota: input.numnota,
      sequencia: input.sequencia,
      codprod,
      descrprod: input.descrprod,
      tipo: 'SOBRA',
      quantidade: qtdSobra,
      lote: input.lote ? input.lote.trim() : undefined,
      validade: input.validade ? input.validade.trim() : undefined,
      fabricacao: input.fabricacao ? input.fabricacao.trim() : undefined,
      motivo: input.motivo?.trim() || `Sobra física de ${qtdSobra} un identificada na conferência de recebimento. Quantidade deduzida da contagem física para igualar à nota fiscal faturada.`,
      codlocalDestino: input.codlocalDestino,
      fotos: input.fotos || [],
      status: 'PENDENTE',
      origem: 'GESTAO',
      criadoPor: input.usuario || 'GESTAO',
      criadoEm: agora,
      atualizadoEm: agora,
    };

    const ocorrenciaCriada = await this.ocorrenciaRepo.criar(novaOcorrencia);

    // 2. Abater a quantidade excedente das bipagens ativas da conferência
    const { abatido } = await this.conferenciaRepo.abaterSobraBipagens(
      rawId,
      nunota,
      codprod,
      input.sequencia,
      qtdSobra
    );

    // 3. Registrar auditoria da ação
    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario || 'GESTOR',
        acao: 'REGISTRAR_OCORRENCIA_SOBRA',
        recurso: `conferencia:${rawId}`,
        detalhes: {
          conferenciaId: rawId,
          nunota,
          codprod,
          sequencia: input.sequencia,
          quantidadeSobra: qtdSobra,
          quantidadeAbatida: abatido,
          ocorrenciaId: ocorrenciaCriada.id,
        },
      });
    }

    // 4. Reavaliar divergências de entrada no sistema
    const divergenciasAtualizadas = await this.listarDivergenciasUseCase.execute(correlationId);

    // 5. Se a nota não possuir mais divergências pendentes no grupo, atualiza seu status para 'Conferido'
    const grupoNota = divergenciasAtualizadas.find((g: any) => Number(g.nunota) === nunota);
    const temDivergenciaRestante = Boolean(
      grupoNota && grupoNota.itensDivergentes && grupoNota.itensDivergentes.length > 0
    );

    if (!temDivergenciaRestante) {
      sessao.statusPorNota = sessao.statusPorNota || {};
      sessao.statusPorNota[nunota] = 'Conferido';
      sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);

      const todasConferidas = sessao.nunotas.every(
        (n) => sessao.statusPorNota?.[n] === 'Conferido' || sessao.statusPorNota?.[n] === 'Enviado ao Sankhya'
      );

      if (todasConferidas) {
        sessao.status = 'Conferido';
        sessao.finalizadoEm = agora;
      }
      sessao.atualizadoEm = agora;
      sessao.observacaoAprovacao = `Sobra do item #${codprod} (${qtdSobra} un) convertida em ocorrência e contagem ajustada pelo gestor.`;
      await this.conferenciaRepo.salvarSessao(sessao);
    }

    return {
      sucesso: true,
      mensagem: `Ocorrência de sobra registrada com sucesso (${abatido} un abatidas da contagem). Divergência sanada!`,
      ocorrenciaId: ocorrenciaCriada.id,
      quantidadeAbatida: abatido,
      divergencias: divergenciasAtualizadas,
    };
  }
}
