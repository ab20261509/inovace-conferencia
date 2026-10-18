import { IOcorrenciaConferenciaEntradaRepository } from '../../../domain/ports/IOcorrenciaConferenciaEntradaRepository.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { ListarDivergenciasEntradaUseCase } from './ListarDivergenciasEntradaUseCase.js';
import {
  OcorrenciaConferenciaEntrada,
  TipoOcorrenciaEntrada,
  StatusOcorrenciaEntrada,
} from '../../../domain/entities/OcorrenciaConferenciaEntrada.js';

export interface AtualizarOcorrenciaEntradaInput {
  id: string;
  tipo?: TipoOcorrenciaEntrada;
  quantidade?: number;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  motivo?: string;
  codlocalDestino?: number;
  fotos?: string[];
  status?: StatusOcorrenciaEntrada;
}

export class AtualizarOcorrenciaEntradaUseCase {
  constructor(
    private readonly ocorrenciaRepo: IOcorrenciaConferenciaEntradaRepository,
    private readonly conferenciaRepo?: IConferenciaEntradaRepository,
    private readonly listarDivergenciasUseCase?: ListarDivergenciasEntradaUseCase
  ) {}

  async execute(
    input: AtualizarOcorrenciaEntradaInput,
    correlationId?: string
  ): Promise<OcorrenciaConferenciaEntrada> {
    const { id, ...dados } = input;
    if (!id) {
      throw new Error('ID da ocorrência é obrigatório.');
    }

    const ocorrenciaAtualizada = await this.ocorrenciaRepo.atualizar(id, dados);

    // Se a ocorrência foi marcada como RESOLVIDO ou INTEGRADO_ERP, checar se a nota pode ser liberada para Envio Sankhya
    const novoStatus = dados.status || ocorrenciaAtualizada.status;
    if ((novoStatus === 'RESOLVIDO' || novoStatus === 'INTEGRADO_ERP') && ocorrenciaAtualizada.nunota && this.conferenciaRepo) {
      try {
        const nunota = Number(ocorrenciaAtualizada.nunota);
        const todasOcorrencias = await this.ocorrenciaRepo.listarPorNuNota(nunota);
        const temPendenciasRestantes = todasOcorrencias.some((oc) => oc.status === 'PENDENTE');

        if (!temPendenciasRestantes) {
          // Checar se não há divergências pendentes para essa nota
          let temDivergencia = false;
          if (this.listarDivergenciasUseCase) {
            const divergencias = await this.listarDivergenciasUseCase.execute(correlationId);
            const grupoNota = divergencias.find((g: any) => Number(g.nunota) === nunota);
            if (grupoNota && grupoNota.itensDivergentes && grupoNota.itensDivergentes.length > 0) {
              temDivergencia = true;
            }
          }

          if (!temDivergencia) {
            // Localiza a sessão da conferência vinculada
            let sessao = ocorrenciaAtualizada.conferenciaId
              ? await this.conferenciaRepo.obterSessaoPorId(ocorrenciaAtualizada.conferenciaId)
              : null;

            if (!sessao) {
              sessao = await this.conferenciaRepo.obterSessaoPorNunota(nunota);
            }

            if (sessao) {
              sessao.statusPorNota = sessao.statusPorNota || {};
              sessao.statusPorNota[nunota] = 'Conferido';
              sessao.statusPorNotaJson = JSON.stringify(sessao.statusPorNota);

              const todasConferidas = sessao.nunotas.every(
                (n) => sessao!.statusPorNota?.[n] === 'Conferido' || sessao!.statusPorNota?.[n] === 'Enviado ao Sankhya'
              );

              if (todasConferidas) {
                sessao.status = 'Conferido';
                sessao.finalizadoEm = new Date().toISOString();
              }
              sessao.atualizadoEm = new Date().toISOString();
              await this.conferenciaRepo.salvarSessao(sessao);
              console.log(
                `[AtualizarOcorrenciaEntradaUseCase] Nota #${nunota} liberada para envio ao Sankhya após resolução das ocorrências.`
              );
            }
          }
        }
      } catch (errLiberar: any) {
        console.warn(
          `[AtualizarOcorrenciaEntradaUseCase] Aviso ao tentar liberar nota #${ocorrenciaAtualizada.nunota}:`,
          errLiberar?.message
        );
      }
    }

    return ocorrenciaAtualizada;
  }
}

