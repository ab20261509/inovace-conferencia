import { randomUUID } from 'node:crypto';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, StatusConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';
import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';

export interface ReiniciarConferenciaInput {
  conferenciaId: string;
  usuario: string;
  motivo?: string;
  nunota?: number;
}

export class ReiniciarConferenciaEntradaUseCase {
  constructor(
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly audit?: AuditService,
    private readonly configSistemaRepo?: IConfiguracaoSistemaRepository
  ) {}

  async execute(input: ReiniciarConferenciaInput): Promise<SessaoConferenciaEntrada> {
    const sessao = await this.conferenciaRepo.obterSessaoPorId(input.conferenciaId);
    if (!sessao) {
      throw new Error('Sessão de conferência não encontrada.');
    }

    const agora = new Date().toISOString();

    // Determinar nível inicial com base na configuração do sistema (se N1 estiver desativado, inicia em N2)
    let nivelInicial = 1;
    if (this.configSistemaRepo) {
      const n1Param = await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel1_ativo');
      if (n1Param === 'false') {
        nivelInicial = 2;
      }
    }

    // CENÁRIO A: Desmembrar uma nota específica de uma conferência conjunta
    if (input.nunota && sessao.nunotas.length > 1 && sessao.nunotas.includes(input.nunota)) {
      const nunotaAlvo = input.nunota;
      const novaSessaoId = randomUUID();

      const novaSessao: SessaoConferenciaEntrada = {
        id: novaSessaoId,
        nunotas: [nunotaAlvo],
        status: 'Em Aberto',
        nivelAtual: nivelInicial,
        criadoEm: agora,
        atualizadoEm: agora,
        conferente: input.usuario || 'Gestor',
        observacaoAprovacao: input.motivo
          ? `Desmembrada da sessão ${sessao.id} e reiniciada: ${input.motivo}`
          : `Nota desmembrada da sessão conjunta e reiniciada pelo gestor.`,
        statusPorNota: { [nunotaAlvo]: 'Em Aberto' },
        statusPorNotaJson: JSON.stringify({ [nunotaAlvo]: 'Em Aberto' }),
      };

      // 1. Salva a nova sessão para satisfazer a chave estrangeira (FK)
      await this.conferenciaRepo.salvarSessao(novaSessao);

      // 2. Migra as bipagens desta nota para a nova sessão
      await this.conferenciaRepo.migrarBipagens(sessao.id, novaSessao.id, [nunotaAlvo]);

      // 2. Anula as bipagens da nota desmembrada e cria backup de segurança
      const bipagensNota = await this.conferenciaRepo.listarBipagens(novaSessao.id);
      const bipagensAtivasNota = bipagensNota.filter((b) => !b.anulado);

      if (bipagensAtivasNota.length > 0) {
        const backup = {
          statusAnterior: sessao.status,
          nivelAnterior: sessao.nivelAtual,
          reiniciadoEm: agora,
          reiniciadoPor: input.usuario || 'Gestor',
          motivo: input.motivo,
          totalBipagensAnuladas: bipagensAtivasNota.length,
        };
        novaSessao.backupContagemJson = JSON.stringify(backup);
        novaSessao.backupContagem = backup;

        for (const b of bipagensAtivasNota) {
          await this.conferenciaRepo.anularBipagem(b.id);
        }
      }

      // 3. Remove a nota desmembrada da sessão original
      sessao.nunotas = sessao.nunotas.filter((n) => n !== nunotaAlvo);
      if (sessao.statusPorNota) {
        delete sessao.statusPorNota[nunotaAlvo];
        sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);
      }
      sessao.atualizadoEm = agora;

      await this.conferenciaRepo.salvarSessao(novaSessao);
      await this.conferenciaRepo.salvarSessao(sessao);

      if (this.audit) {
        await this.audit.registrar({
          usuario: input.usuario,
          acao: 'REINICIAR_E_DESMEMBRAR_NOTA',
          recurso: 'conferencias_entrada',
          detalhes: {
            sessaoOriginalId: sessao.id,
            novaSessaoId: novaSessao.id,
            nunotaDesmembrada: nunotaAlvo,
            motivo: input.motivo,
          },
        });
      }

      return novaSessao;
    }

    // CENÁRIO B: Reiniciar toda a sessão (única ou todas as notas da conjunta)
    const bipagens = await this.conferenciaRepo.listarBipagens(sessao.id);
    const bipagensAtivas = bipagens.filter((b) => !b.anulado);

    if (bipagensAtivas.length > 0 || sessao.nivelAtual > 1 || sessao.status !== 'Em Aberto') {
      const backup = {
        statusAnterior: sessao.status,
        nivelAnterior: sessao.nivelAtual,
        reiniciadoEm: agora,
        reiniciadoPor: input.usuario || 'Gestor',
        motivo: input.motivo,
        totalBipagensAnuladas: bipagensAtivas.length,
      };
      sessao.backupContagemJson = JSON.stringify(backup);
      sessao.backupContagem = backup;
    }

    for (const b of bipagensAtivas) {
      await this.conferenciaRepo.anularBipagem(b.id);
    }

    sessao.status = 'Em Aberto';
    sessao.nivelAtual = nivelInicial;
    sessao.atualizadoEm = agora;
    sessao.finalizadoEm = undefined;
    sessao.aprovadoPor = undefined;
    sessao.aprovadoEm = undefined;
    sessao.enviadoSankhyaEm = undefined;
    sessao.observacaoAprovacao = input.motivo ? `Reiniciada: ${input.motivo}` : 'Conferência reiniciada pelo gestor.';

    const statusResetado: Record<number, StatusConferenciaEntrada> = {};
    for (const n of sessao.nunotas) {
      statusResetado[n] = 'Em Aberto';
    }
    sessao.statusPorNota = statusResetado;
    sessao.statusPorNotaJson = JSON.stringify(statusResetado);

    await this.conferenciaRepo.salvarSessao(sessao);

    if (this.audit) {
      await this.audit.registrar({
        usuario: input.usuario,
        acao: 'REINICIAR_CONFERENCIA',
        recurso: 'conferencias_entrada',
        detalhes: {
          conferenciaId: sessao.id,
          nunotas: sessao.nunotas,
          totalBipagensAnuladas: bipagens.length,
          motivo: input.motivo,
        },
      });
    }

    return sessao;
  }
}
