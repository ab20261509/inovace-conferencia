import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, StatusConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface SolicitarRecontagemInput {
  conferenciaId: string;
  nivel: number; // 1, 2 ou 3
  usuario: string;
  motivo?: string;
}

export class SolicitarRecontagemEntradaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService
  ) {}

  async execute(input: SolicitarRecontagemInput): Promise<SessaoConferenciaEntrada> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const nivelAlvo = Number(input.nivel);
    if (![1, 2, 3].includes(nivelAlvo)) {
      throw new Error('Nível de recontagem inválido. Escolha Nível 1, 2 ou 3.');
    }

    const agora = new Date().toISOString();
    let novoStatus: StatusConferenciaEntrada = 'Aguardando N2';

    if (nivelAlvo === 1) {
      novoStatus = 'N1 em Andamento';
    } else if (nivelAlvo === 2) {
      novoStatus = 'Aguardando N2';
    } else if (nivelAlvo === 3) {
      novoStatus = 'Aguardando N3';
    }

    sessao.status = novoStatus;
    sessao.nivelAtual = nivelAlvo;
    sessao.atualizadoEm = agora;
    sessao.finalizadoEm = undefined;
    sessao.aprovadoPor = undefined;
    sessao.aprovadoEm = undefined;
    sessao.enviadoSankhyaEm = undefined;
    sessao.observacaoAprovacao = input.motivo
      ? `Recontagem N${nivelAlvo} solicitada: ${input.motivo}`
      : `Recontagem N${nivelAlvo} solicitada pelo gestor.`;

    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario || 'Gestor',
        acao: 'SOLICITAR_RECONTAGEM',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunotas: sessao.nunotas,
          nivelAlvo,
          novoStatus,
          motivo: input.motivo,
        },
      });
    }

    return sessao;
  }
}
