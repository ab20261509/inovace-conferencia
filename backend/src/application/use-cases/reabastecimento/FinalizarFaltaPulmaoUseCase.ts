import { TarefaReabastecimento } from '../../../domain/entities/Reabastecimento.js';
import { IReabastecimentoRepository } from '../../../domain/ports/IReabastecimentoRepository.js';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';

export interface FinalizarFaltaPulmaoInput {
  tarefaId: string;
  usuario: string;
  acao: 'CORTAR';
  observacao?: string;
}

export class FinalizarFaltaPulmaoUseCase {
  constructor(
    private readonly reabastecimentoRepo: IReabastecimentoRepository,
    private readonly separacaoRepo?: ISeparacaoRepository,
  ) {}

  async execute(input: FinalizarFaltaPulmaoInput): Promise<{
    sucesso: boolean;
    mensagem: string;
    tarefa: TarefaReabastecimento;
  }> {
    const { tarefaId, usuario, acao, observacao } = input;

    const tarefa = await this.reabastecimentoRepo.buscarPorId(tarefaId);
    if (!tarefa) {
      throw new Error(`Tarefa de reabastecimento '${tarefaId}' não encontrada.`);
    }

    if (tarefa.status !== 'FALTA_PULMAO' && tarefa.status !== 'VERIFICAR_ESTOQUE' && tarefa.status !== 'PENDENTE') {
      throw new Error(`Apenas tarefas com pendência ou falta no pulmão podem ser finalizadas (status atual: ${tarefa.status}).`);
    }

    const agora = new Date().toISOString();
    const obsCorte = `✂️ Falta no pulmão finalizada e corte definitivo confirmado por ${usuario} em ${new Date().toLocaleTimeString('pt-BR')}${
      observacao ? ` - ${observacao}` : ''
    }`;
    const novaObs = tarefa.observacao ? `${tarefa.observacao} | ${obsCorte}` : obsCorte;

    await this.reabastecimentoRepo.atualizar(tarefaId, {
      status: 'FALTA_CONFIRMADA',
      concluidoEm: agora,
      concluidoPor: usuario,
      observacao: novaObs,
    });

    // Se estiver vinculada a uma separação e o repositório estiver disponível:
    if (this.separacaoRepo && (tarefa.separacaoId || tarefa.ordemCarga)) {
      try {
        let separacao = tarefa.separacaoId ? await this.separacaoRepo.buscarPorId(tarefa.separacaoId) : null;
        if (!separacao && tarefa.ordemCarga) {
          separacao = await this.separacaoRepo.buscarPorOrdemCarga(tarefa.ordemCarga);
        }

        if (separacao && separacao.status !== 'FINALIZADA') {
          const itens = await this.separacaoRepo.listarItens(separacao.id);
          const itensProd = itens.filter(
            (i) => i.codprod === tarefa.codprod && i.statusItem !== 'SEPARADO' && i.statusItem !== 'REMOVIDO_ERP'
          );

          for (const item of itensProd) {
            const saldoFalta = Math.max(0, item.qtdEsperada - item.qtdSeparada);
            await this.separacaoRepo.atualizarItem(item.id, {
              statusItem: 'CORTADO_DEFINITIVO',
              qtdFalta: saldoFalta > 0 ? saldoFalta : (item.qtdFalta || 0),
              motivoFalta: `Corte definitivo de falta no pulmão autorizado por ${usuario}`,
              atualizadoEm: agora,
            });
          }

          // Checar se todas as tarefas da carga foram resolvidas
          const todasTarefas = await this.reabastecimentoRepo.listar({ ordemCarga: separacao.ordemCarga });
          const tarefasNaoResolvidas = todasTarefas.filter((t) =>
            ['PENDENTE', 'VERIFICAR_ESTOQUE', 'EM_ANDAMENTO', 'FALTA_PULMAO'].includes(t.status)
          );

          if (tarefasNaoResolvidas.length === 0) {
            // Se todas as tarefas de reabastecimento foram resolvidas, desbloqueia a separação
            await this.separacaoRepo.atualizarSeparacao(separacao.id, {
              status: 'EM_ANDAMENTO',
              observacoes: `Reabastecimento concluído/cortado pela equipe de estoque. Carga liberada para finalização.`,
            });
          }
        }
      } catch (err: any) {
        console.warn(`[FinalizarFaltaPulmao] Aviso ao sincronizar corte com a separação: ${err.message}`);
      }
    }

    const tarefaAtualizada = await this.reabastecimentoRepo.buscarPorId(tarefaId);

    return {
      sucesso: true,
      mensagem: `Falta de estoque confirmada com corte definitivo. Ocorrência finalizada com sucesso.`,
      tarefa: tarefaAtualizada!,
    };
  }
}
