import { randomUUID } from 'node:crypto';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import { IReabastecimentoRepository } from '../../../domain/ports/IReabastecimentoRepository.js';
import { TarefaReabastecimento } from '../../../domain/entities/Reabastecimento.js';

export interface SolicitarReabastecimentoInput {
  separacaoId: string;
  usuario: string;
  codprod?: number;
  observacao?: string;
}

export interface SolicitarReabastecimentoOutput {
  sucesso: boolean;
  mensagem: string;
  tarefasCriadas: number;
}

export class SolicitarReabastecimentoSeparacaoUseCase {
  constructor(
    private readonly separacaoRepo: ISeparacaoRepository,
    private readonly reabastecimentoRepo: IReabastecimentoRepository,
  ) {}

  async execute(input: SolicitarReabastecimentoInput): Promise<SolicitarReabastecimentoOutput> {
    const { separacaoId, usuario, codprod, observacao } = input;

    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }

    if (separacao.status === 'FINALIZADA') {
      throw new Error(`Separação da Carga ${separacao.ordemCarga} já está finalizada.`);
    }

    const todosItens = await this.separacaoRepo.listarItens(separacaoId);
    const itensCandidatos = todosItens.filter((i) => {
      if (codprod && i.codprod !== codprod) return false;
      if (i.statusItem === 'REMOVIDO_ERP' || i.statusItem === 'CORTADO_DEFINITIVO' || i.statusItem === 'SEPARADO') {
        return false;
      }
      const saldo = Math.max(0, i.qtdEsperada - i.qtdSeparada);
      return saldo > 0 || (i.qtdFalta && i.qtdFalta > 0);
    });

    if (itensCandidatos.length === 0) {
      throw new Error(
        codprod
          ? `O produto ${codprod} não possui saldo pendente para reabastecimento nesta carga.`
          : 'Não há itens pendentes de separação com necessidade de reabastecimento.'
      );
    }

    // Buscar tarefas existentes para não duplicar tarefas ativas
    const tarefasExistentes = await this.reabastecimentoRepo.listar({ ordemCarga: separacao.ordemCarga });
    const tarefasAtivasPorProd = new Set(
      tarefasExistentes
        .filter((t) => ['PENDENTE', 'VERIFICAR_ESTOQUE', 'EM_ANDAMENTO', 'FALTA_PULMAO'].includes(t.status))
        .map((t) => t.codprod)
    );

    const mapaAgrupado = new Map<number, { item: typeof itensCandidatos[0]; qtdTotal: number }>();
    for (const it of itensCandidatos) {
      if (tarefasAtivasPorProd.has(it.codprod)) {
        continue; // Já tem tarefa ativa para este produto nesta carga
      }
      const saldo = it.qtdFalta && it.qtdFalta > 0 ? it.qtdFalta : Math.max(0, it.qtdEsperada - it.qtdSeparada);
      const existente = mapaAgrupado.get(it.codprod);
      if (existente) {
        existente.qtdTotal += saldo;
      } else {
        mapaAgrupado.set(it.codprod, { item: it, qtdTotal: saldo });
      }
    }

    const agora = new Date().toISOString();
    const novasTarefas: TarefaReabastecimento[] = [];

    for (const [prodId, dados] of mapaAgrupado.entries()) {
      const it = dados.item;
      const temPulmao = Boolean(it.codendPulmao || it.enderecoPulmao);
      novasTarefas.push({
        id: randomUUID(),
        separacaoId: separacao.id,
        ordemCarga: separacao.ordemCarga,
        codemp: separacao.codemp || null,
        nomeEmpresa: separacao.nomeEmpresa || null,
        codprod: prodId,
        descrprod: it.descrprod || null,
        referencia: it.referencia || null,
        codbarra: it.codbarra?.split(',')[0]?.trim() || null,
        codendPulmao: it.codendPulmao || null,
        enderecoPulmao: it.enderecoPulmao || null,
        descrendPulmao: it.descrendPulmao || null,
        codendPicking: it.codend || null,
        enderecoPicking: it.endereco || null,
        descrendPicking: it.descrend || null,
        quantidadeSolicitada: dados.qtdTotal,
        quantidadeAtendida: 0,
        status: temPulmao ? 'PENDENTE' : 'VERIFICAR_ESTOQUE',
        observacao: observacao || (temPulmao
          ? `Solicitado pela separação: transferir do pulmão ${it.enderecoPulmao} para o picking ${it.endereco || 'Padrão'}`
          : 'Solicitado pela separação: produto sem endereço de pulmão cadastrado. Verificar no estoque geral.'),
        solicitadoEm: agora,
        solicitadoPor: usuario,
      });
    }

    if (novasTarefas.length > 0) {
      await this.reabastecimentoRepo.criarTarefasEmLote(novasTarefas);
    }

    // Colocar status da separação como AGUARDANDO_REABASTECIMENTO
    await this.separacaoRepo.atualizarSeparacao(separacao.id, {
      status: 'AGUARDANDO_REABASTECIMENTO',
      observacoes: `Aguardando reabastecimento de ${novasTarefas.length} produto(s) solicitado por ${usuario}.`,
    });

    return {
      sucesso: true,
      mensagem: novasTarefas.length > 0
        ? `${novasTarefas.length} tarefa(s) de reabastecimento enviada(s) para a equipe de empilhadeira. Carga colocada em espera.`
        : 'A carga já possui tarefas ativas em andamento na empilhadeira para os itens pendentes.',
      tarefasCriadas: novasTarefas.length,
    };
  }
}
