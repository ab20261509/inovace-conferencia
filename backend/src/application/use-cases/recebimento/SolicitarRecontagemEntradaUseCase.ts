import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, StatusConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

export interface ItemRecontagemAlvo {
  nunota: number;
  sequencia: number;
  codprod: number;
}

export interface SolicitarRecontagemInput {
  conferenciaId: string;
  nivel: number; // 1, 2 ou 3
  usuario: string;
  motivo?: string;
  itens?: ItemRecontagemAlvo[];
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
    let novoStatus: StatusConferenciaEntrada = 'Aguardando Recontagem N2';

    if (nivelAlvo === 1) {
      novoStatus = 'Aguardando Recontagem N1';
    } else if (nivelAlvo === 2) {
      novoStatus = 'Aguardando Recontagem N2';
    } else if (nivelAlvo === 3) {
      novoStatus = 'Aguardando Recontagem N3';
    }

    sessao.status = novoStatus;
    sessao.nivelAtual = nivelAlvo;
    sessao.atualizadoEm = agora;
    sessao.finalizadoEm = undefined;
    sessao.conferente = '';
    sessao.aprovadoPor = undefined;
    sessao.aprovadoEm = undefined;
    sessao.enviadoSankhyaEm = undefined;

    // Se foram especificados itens para recontagem parcial
    if (input.itens && input.itens.length > 0) {
      sessao.itensRecontagem = input.itens;
      sessao.itensRecontagemJson = JSON.stringify(input.itens);
      // Anula apenas as bipagens do nível alvo para os itens selecionados
      await this.conferenciaRepo.anularBipagensPorItens(sessao.id, nivelAlvo, input.itens);
      sessao.observacaoAprovacao = input.motivo
        ? `Recontagem N${nivelAlvo} parcial (${input.itens.length} itens): ${input.motivo}`
        : `Recontagem N${nivelAlvo} parcial (${input.itens.length} itens) solicitada pelo gestor.`;
    } else {
      sessao.itensRecontagem = undefined;
      sessao.itensRecontagemJson = undefined;
      sessao.observacaoAprovacao = input.motivo
        ? `Recontagem N${nivelAlvo} solicitada: ${input.motivo}`
        : `Recontagem N${nivelAlvo} solicitada pelo gestor.`;
    }

    if (sessao.statusPorNota) {
      for (const nu of sessao.nunotas) {
        sessao.statusPorNota[nu] = novoStatus;
      }
      sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);
    }

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
