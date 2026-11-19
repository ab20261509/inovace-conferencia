import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, DecisaoFiscalItem } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';
import { ItemRecontagemAlvo } from './SolicitarRecontagemEntradaUseCase.js';
import { ListarDivergenciasEntradaUseCase } from './ListarDivergenciasEntradaUseCase.js';

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
    private readonly audit?: AuditService,
    private readonly listarDivergenciasUseCase?: ListarDivergenciasEntradaUseCase
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
      // CHECAGEM DE SEGURANÇA MANDATÓRIA: Não permite aprovação para 'Conferido'
      // se houver pendências ativas (múltiplos lotes sem desmembramento, sobras/faltas ou divergências cadastrais não decididas)
      if (this.listarDivergenciasUseCase) {
        try {
          const divergencias = await this.listarDivergenciasUseCase.execute(sessao.id);
          const nunotasAlvo = input.nunota ? [input.nunota] : sessao.nunotas;

          for (const nunota of nunotasAlvo) {
            const grupoNota = divergencias.find((g) => g.nunota === nunota || g.nunotas?.includes(nunota));
            if (!grupoNota) continue;

            const itensBase = (grupoNota.todosItens && grupoNota.todosItens.length > 0)
              ? grupoNota.todosItens
              : grupoNota.itensDivergentes || [];

            // Contagem de sequências faturadas por produto na nota
            const contagemSeqsPorCodprod: Record<number, number> = {};
            itensBase.forEach((it) => {
              contagemSeqsPorCodprod[it.codprod] = (contagemSeqsPorCodprod[it.codprod] || 0) + 1;
            });

            // Saldo consolidado por produto na nota
            const saldoConsolidadoPorProd: Record<number, number> = {};
            itensBase.forEach((it) => {
              const c = it.qtdN3 > 0 ? it.qtdN3 : it.qtdN2 > 0 ? it.qtdN2 : it.qtdN1 || 0;
              saldoConsolidadoPorProd[it.codprod] = (saldoConsolidadoPorProd[it.codprod] || 0) + (c - it.qtdEsperada);
            });

            for (const it of itensBase) {
              const k = `${it.nunota}-${it.codprod}-${it.sequencia}`;
              const d = input.decisoesFiscais?.[k] || sessao.decisoesFiscais?.[k];
              const adotouErp = d?.lote === 'ERP' || d?.quantidade === 'ERP';

              const lotesFisicos = (it.lotesConferidos || []).length;
              const ehMultiSeq = (contagemSeqsPorCodprod[it.codprod] || 0) > 1;
              const seqsFaturadas = contagemSeqsPorCodprod[it.codprod] || 1;

              // 1. Checagem de Múltiplos Lotes Pendentes de Desmembramento
              if (!adotouErp && lotesFisicos > 1 && seqsFaturadas < lotesFisicos) {
                throw new Error(
                  `Não é possível aprovar a conferência como 'Conferido': o produto ${it.codprod} (${it.descrprod || 'Produto'}) possui ${lotesFisicos} lotes físicos e requer desmembramento no Sankhya ERP antes da liberação.`
                );
              }

              const c = adotouErp ? it.qtdEsperada : it.qtdN3 > 0 ? it.qtdN3 : it.qtdN2 > 0 ? it.qtdN2 : it.qtdN1;
              const dif = c - it.qtdEsperada;
              const saldoProd = saldoConsolidadoPorProd[it.codprod] ?? dif;
              const temSobraReal = ehMultiSeq ? (saldoProd > 0 && dif > 0) : dif > 0;

              // 2. Checagem de Sobra Física Real Pendente
              if (temSobraReal) {
                throw new Error(
                  `Não é possível aprovar a conferência como 'Conferido': o produto ${it.codprod} (${it.descrprod || 'Produto'}) possui sobra física de +${dif} UN pendente de ocorrência.`
                );
              }

              // 3. Checagem de Falta Física Não Isolada
              const numnotaStr = String(grupoNota.numnota || it.nunota || '').trim();
              const nunotaStr = String(it.nunota || '').trim();
              const loteOrig = String(it.controleOriginal || '').trim();
              const isFaltaIsolada = Boolean(dif < 0 && loteOrig && (loteOrig === numnotaStr || loteOrig === nunotaStr));

              if (dif < 0 && !isFaltaIsolada && !adotouErp) {
                throw new Error(
                  `Não é possível aprovar a conferência como 'Conferido': o produto ${it.codprod} (${it.descrprod || 'Produto'}) possui falta física de ${dif} UN pendente de isolamento no ERP ou reconferência N3.`
                );
              }

              // 4. Checagem de Divergências Cadastrais Pendentes de Decisão
              const pL = Boolean(it.divergenciaLote && !d?.lote);
              const pV = Boolean(it.divergenciaValidade && !d?.validade);
              const pF = Boolean(it.divergenciaFabricacao && !d?.fabricacao);
              if (pL || pV || pF) {
                throw new Error(
                  `Não é possível aprovar a conferência como 'Conferido': o produto ${it.codprod} (${it.descrprod || 'Produto'}) possui divergência cadastral de ${pL ? 'Lote' : ''}${pV ? ' Validade' : ''}${pF ? ' Fabricação' : ''} pendente de decisão.`
                );
              }
            }
          }
        } catch (errValidation: any) {
          // Se for erro de validação lançado intencionalmente, propaga para bloquear a aprovação
          if (errValidation.message?.includes("Não é possível aprovar")) {
            throw errValidation;
          }
          console.warn('⚠️ Erro ao validar divergências antes de aprovar:', errValidation.message);
        }
      }

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
