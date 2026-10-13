import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { SessaoConferenciaEntrada, StatusConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';
import { AuditService } from '../../../infrastructure/database/AuditService.js';

import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';

export interface ReiniciarConferenciaInput {
  conferenciaId: string;
  usuario: string;
  motivo?: string;
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

    // 1. Criar snapshot de segurança da contagem anterior se houver bipagens ou status avançado
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

    // 2. Anular todas as bipagens ativas da sessão
    for (const b of bipagensAtivas) {
      await this.conferenciaRepo.anularBipagem(b.id);
    }

    // Determinar nível inicial com base na configuração do sistema (se N1 estiver desativado, inicia em N2)
    let nivelInicial = 1;
    if (this.configSistemaRepo) {
      const n1Param = await this.configSistemaRepo.obterParametro('conferencia_entrada_nivel1_ativo');
      if (n1Param === 'false') {
        nivelInicial = 2;
      }
    }

    // 3. Retornar status da sessão para Em Aberto e nível para o nível configurado
    sessao.status = 'Em Aberto';
    sessao.nivelAtual = nivelInicial;
    sessao.atualizadoEm = agora;
    sessao.finalizadoEm = undefined;
    sessao.aprovadoPor = undefined;
    sessao.aprovadoEm = undefined;
    sessao.enviadoSankhyaEm = undefined;
    sessao.observacaoAprovacao = input.motivo ? `Reiniciada: ${input.motivo}` : 'Conferência reiniciada pelo gestor.';

    // Resetar status de todas as notas vinculadas para Em Aberto
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
