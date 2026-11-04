import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, DecisaoFiscalItem } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';
import { ItemRecontagemAlvo } from './SolicitarRecontagemEntradaUseCase.js';

export interface ResolverDivergenciaInput {
  conferenciaId: string;
  nunota?: number;
  usuario: string;
  acao?: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3';
  observacao?: string;
  decisoesFiscais?: Record<string, DecisaoFiscalItem>;
  itens?: ItemRecontagemAlvo[];
}

export class ResolverDivergenciaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService
  ) {}

  async execute(input: ResolverDivergenciaInput): Promise<SessaoConferenciaEntrada> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const agora = new Date().toISOString();
    sessao.statusPorNota = sessao.statusPorNota || {};

    if (input.decisoesFiscais) {
      sessao.decisoesFiscais = { ...(sessao.decisoesFiscais || {}), ...input.decisoesFiscais };
      sessao.decisoesFiscaisJson = JSON.stringify(sessao.decisoesFiscais);
    }

    if (input.acao === 'RECONFERIR_N3') {
      const statusNota = input.nunota ? sessao.statusPorNota?.[input.nunota] : undefined;
      const statusAlvo = (statusNota || sessao.status || '').toLowerCase();
      const emAndamento =
        statusAlvo.includes('andamento') ||
        statusAlvo === 'iniciado' ||
        statusAlvo.includes('em reconferência') ||
        statusAlvo.includes('em reconferencia');

      if (emAndamento) {
        const conferenteAtivo = sessao.conferente ? `pelo conferente ${sessao.conferente}` : 'no coletor';
        throw new Error(
          `Ação bloqueada: a conferência da nota já está em andamento ${conferenteAtivo}. Só é permitido enviar para reconferência quando a conferência estiver finalizada ou aguardando.`
        );
      }

      if (input.nunota) {
        sessao.statusPorNota[input.nunota] = 'Aguardando N3';
      } else {
        sessao.nunotas.forEach((n) => {
          sessao.statusPorNota![n] = 'Aguardando N3';
        });
      }
      sessao.status = 'Aguardando N3';
      sessao.nivelAtual = 3;
      sessao.finalizadoEm = undefined;
      sessao.conferente = '';
      sessao.atualizadoEm = agora;

      if (input.itens && input.itens.length > 0) {
        const itensExistentes = sessao.itensRecontagem || [];
        const setChavesExistentes = new Set(
          itensExistentes.map((i) => `${i.nunota}-${i.sequencia}-${i.codprod}`)
        );
        const novosItens = input.itens.filter(
          (i) => !setChavesExistentes.has(`${i.nunota}-${i.sequencia}-${i.codprod}`)
        );
        const itensCombinados = [...itensExistentes, ...novosItens];

        sessao.itensRecontagem = itensCombinados;
        sessao.itensRecontagemJson = JSON.stringify(itensCombinados);

        // Anula apenas as bipagens N3 dos novos itens adicionados
        const itensParaAnular = novosItens.length > 0 ? novosItens : input.itens;
        await this.conferenciaRepo.anularBipagensPorItens(sessao.id, 3, itensParaAnular);

        sessao.observacaoAprovacao = input.observacao
          ? `Reconferência N3 parcial (${itensCombinados.length} itens)${input.nunota ? ` (Nota #${input.nunota})` : ''}: ${input.observacao}`
          : `Reconferência Nível 3 solicitada pelo gestor para ${itensCombinados.length} produto(s)${input.nunota ? ` (Nota #${input.nunota})` : ''}.`;
      } else {
        sessao.itensRecontagem = undefined;
        sessao.itensRecontagemJson = undefined;
        sessao.observacaoAprovacao = input.observacao
          ? `Reconferência N3${input.nunota ? ` (Nota #${input.nunota})` : ''}: ${input.observacao}`
          : `Reconferência Nível 3 solicitada pelo gestor${input.nunota ? ` para a nota #${input.nunota}` : ''}.`;
      }

      sessao.aprovadoPor = undefined;
      sessao.aprovadoEm = undefined;
    } else {
      // APROVAR_DIVERGENCIA (padrão)
      if (input.nunota) {
        sessao.statusPorNota[input.nunota] = 'Conferido';
      } else {
        sessao.nunotas.forEach((n) => {
          sessao.statusPorNota![n] = 'Conferido';
        });
      }

      // Se todas as notas estiverem como 'Conferido' ou 'Enviado ao Sankhya', a sessão inteira é finalizada como 'Conferido'
      const todasConferidas = sessao.nunotas.every(
        (n) => sessao.statusPorNota?.[n] === 'Conferido' || sessao.statusPorNota?.[n] === 'Enviado ao Sankhya'
      );

      if (todasConferidas) {
        sessao.status = 'Conferido';
        sessao.finalizadoEm = agora;
      }

      sessao.atualizadoEm = agora;
      sessao.aprovadoPor = input.usuario;
      sessao.aprovadoEm = agora;
      sessao.observacaoAprovacao = input.observacao || `Divergência${input.nunota ? ` da nota #${input.nunota}` : ''} resolvida e aprovada pelo gestor.`;
    }

    sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);
    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario,
        acao: 'RESOLVER_DIVERGENCIA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunota: input.nunota,
          nunotas: sessao.nunotas,
          observacao: sessao.observacaoAprovacao,
        },
      });
    }

    return sessao;
  }
}
