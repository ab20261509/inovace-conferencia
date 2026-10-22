import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IConfiguracaoTelasRepository } from '../../../domain/ports/IConfiguracaoTelasRepository.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { NotaEntrada, StatusConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';

export interface ListarNotasEntradaFiltros {
  numeroNota?: string;
  fornecedor?: string;
  statusConferencia?: string;
  usuario?: string;
  codUsu?: number;
}

export class ListarNotasEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly configTelasRepo?: IConfiguracaoTelasRepository,
    private readonly permissoesRepo?: IPermissoesRepository
  ) {}

  async execute(filtros?: ListarNotasEntradaFiltros, correlationId?: string): Promise<NotaEntrada[]> {
    const sql = `
SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    NVL(CAB.SERIENOTA, ' ') AS SERIENOTA,
    CAB.DTNEG,
    CAB.DTENTSAI,
    TO_CHAR(CAB.AD_PREVENTREGA, 'YYYY-MM-DD') AS AD_PREVENTREGA,
    CAB.CODPARC,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'FORNECEDOR NÃO INFORMADO')) AS NOMEPARC,
    CAB.CODTIPOPER,
    CAB.TIPMOV,
    NVL(CAB.VLRNOTA, 0) AS VLRNOTA,
    CAB.STATUSNOTA,
    CAB.CODEMP,
    CAB.CHAVENFE,
    NVL(CAB.AD_CONFERENCIA, '') AS AD_CONFERENCIA,
    NVL(ITE.QTD_ITENS, 0) AS QTD_ITENS,
    NVL(ITE.QTD_UNIDADES, 0) AS QTD_UNIDADES
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR
       ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN (
    SELECT I.NUNOTA, COUNT(DISTINCT I.CODPROD) AS QTD_ITENS, SUM(NVL(I.QTDNEG, 0)) AS QTD_UNIDADES
    FROM TGFITE I
    GROUP BY I.NUNOTA
) ITE ON ITE.NUNOTA = CAB.NUNOTA
WHERE CAB.TIPMOV = 'C'
  AND CAB.STATUSNOTA <> 'L'
ORDER BY CAB.DTNEG DESC, CAB.NUNOTA DESC
    `.trim();

    const response = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
      },
      correlationId
    );

    const rows: any[] = response?.responseBody?.rows || [];
    const fields: any[] = response?.responseBody?.fieldsMetadata || [];

    // Mapear campos por nome de coluna
    const fieldIndexMap: Record<string, number> = {};
    fields.forEach((f: any, idx: number) => {
      fieldIndexMap[f.name.toUpperCase()] = idx;
    });

    const getVal = (row: any[], fieldName: string) => {
      const idx = fieldIndexMap[fieldName.toUpperCase()];
      return idx !== undefined ? row[idx] : null;
    };

    const nunotas = rows.map((r) => Number(getVal(r, 'NUNOTA'))).filter(Boolean);
    const mapaStatus = await this.conferenciaRepo.obterMapaStatusNotas(nunotas);

    let ocultarFornecedor = false;
    let ocultarVlrNota = false;
    if (this.configTelasRepo && filtros?.usuario) {
      ocultarFornecedor = await this.configTelasRepo.deveOcultarCampo(
        'conferencia_entrada',
        'fornecedor',
        filtros.usuario
      );
      ocultarVlrNota = await this.configTelasRepo.deveOcultarCampo(
        'conferencia_entrada',
        'vlrUnit',
        filtros.usuario
      );
    }

    const notas: NotaEntrada[] = rows.map((r) => {
      const nunota = Number(getVal(r, 'NUNOTA'));
      const adConferencia = String(getVal(r, 'AD_CONFERENCIA') || '').trim().toUpperCase();
      const statusInfo = mapaStatus[nunota];
      let statusConf: StatusConferenciaEntrada = statusInfo?.status || 'Em Aberto';

      // Apenas se a conferência já havia sido INTEGRADA no Sankhya ('Enviado ao Sankhya')
      // e no ERP o campo AD_CONFERENCIA foi limpo/removido (ou diferente de 'CONFERIDO'),
      // significa que a conferência foi cancelada/desfeita no ERP e deve voltar a 'Em Aberto'.
      // Notas que estão como 'Conferido' ou 'Aguardando Aprovação' ainda NÃO foram integradas ao Sankhya
      // e estão aguardando envio na aba Envio Sankhya, portanto NÃO devem ser resetadas!
      if (
        statusConf === 'Enviado ao Sankhya' &&
        adConferencia !== 'CONFERIDO'
      ) {
        statusConf = 'Em Aberto';
        if (statusInfo?.id) {
          this.conferenciaRepo.obterSessaoPorId(statusInfo.id).then(async (sess) => {
            if (sess && sess.status === 'Enviado ao Sankhya' && sess.enviadoSankhyaEm) {
              sess.status = 'Em Aberto';
              sess.conferente = '';
              sess.nivelAtual = 1;
              sess.finalizadoEm = undefined;
              sess.aprovadoPor = undefined;
              sess.aprovadoEm = undefined;
              sess.enviadoSankhyaEm = undefined;
              sess.statusPorNota = sess.statusPorNota || {};
              sess.statusPorNota[nunota] = 'Em Aberto';
              await this.conferenciaRepo.salvarSessao(sess);
            }
          }).catch(() => {});
        }
      }

      const ehEmAberto = statusConf === 'Em Aberto';

      return {
        nunota,
        numnota: Number(getVal(r, 'NUMNOTA')) || 0,
        serie: String(getVal(r, 'SERIENOTA') || '').trim(),
        dtneg: getVal(r, 'DTNEG') ? String(getVal(r, 'DTNEG')) : '',
        dtentsai: getVal(r, 'DTENTSAI') ? String(getVal(r, 'DTENTSAI')) : '',
        codparc: Number(getVal(r, 'CODPARC')) || 0,
        nomeparc: ocultarFornecedor ? '— (Oculto)' : String(getVal(r, 'NOMEPARC') || ''),
        codtipoper: Number(getVal(r, 'CODTIPOPER')) || 0,
        tipmov: String(getVal(r, 'TIPMOV') || 'C'),
        vlrnota: ocultarVlrNota ? 0 : Number(getVal(r, 'VLRNOTA')) || 0,
        statusnota: String(getVal(r, 'STATUSNOTA') || ''),
        qtdItens: Number(getVal(r, 'QTD_ITENS')) || 0,
        qtdUnidades: Number(getVal(r, 'QTD_UNIDADES')) || 0,
        codemp: Number(getVal(r, 'CODEMP')) || 0,
        statusConferencia: statusConf,
        conferenciaId: statusInfo?.id,
        nivelAtual: ehEmAberto ? undefined : statusInfo?.nivel,
        adPreventrega: getVal(r, 'AD_PREVENTREGA') ? String(getVal(r, 'AD_PREVENTREGA')).trim() : null,
        conferente: ehEmAberto ? null : (statusInfo?.conferente || null),
        chavenfe: getVal(r, 'CHAVENFE') ? String(getVal(r, 'CHAVENFE')).trim() : null,
      };
    });

    // Permissões do usuário solicitante (se fornecido)
    let verDivergente = true;
    let verConferido = true;
    let verN1 = true;
    let verN2 = true;
    let verN3 = true;

    if (this.permissoesRepo && (filtros?.usuario || filtros?.codUsu)) {
      const perms = await this.permissoesRepo.obterPermissoes(filtros.codUsu || 0, filtros.usuario || '');
      const loginNorm = (filtros.usuario || '').trim().toUpperCase();
      const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(loginNorm);
      const ehAdmin = ehAdminPadrao || !!perms.gerenciar_acessos;

      verN1 = perms.conferencia_entrada_n1 !== false;
      verN2 = perms.conferencia_entrada_n2 !== false;
      verN3 = perms.conferencia_entrada_n3 !== false;

      if (ehAdmin) {
        verDivergente = perms.conferencia_entrada_divergente !== false;
        verConferido = perms.conferencia_entrada_conferido !== false;
      } else {
        verDivergente = perms.conferencia_entrada_divergente === true;
        verConferido = perms.conferencia_entrada_conferido === true;
      }
    }

    // Filtros adicionais em memória
    return notas.filter((n) => {
      // 1. Filtro de Conferido
      const isConcluido = n.statusConferencia === 'Conferido' || n.statusConferencia === 'Enviado ao Sankhya';
      if (isConcluido) {
        if (!verConferido) return false;
        if (!verN1 && !verN2 && !verN3) return false;
      }

      // 2. Filtro de Divergente
      const isDivergente = n.statusConferencia === 'Divergente' || n.statusConferencia === 'Em Reconferência';
      if (isDivergente && !verDivergente) {
        // Se a nota divergente estiver no Nível 3 (recontagem N3) e o usuário tiver permissão N3, libera visualização
        const ehN3Recontagem = (n.nivelAtual === 3 || ['Aguardando N3', 'N3 em Andamento', 'Aguardando Recontagem N3', 'Recontagem N3 em Andamento'].includes(n.statusConferencia)) && verN3;
        if (!ehN3Recontagem) {
          return false;
        }
      }

      // 3. Filtro de Nível
      let nivel = n.nivelAtual || 1;
      if (['Aguardando N2', 'N2 em Andamento', 'Aguardando Recontagem N2', 'Recontagem N2 em Andamento'].includes(n.statusConferencia)) {
        nivel = 2;
      } else if (['Aguardando N3', 'N3 em Andamento', 'Aguardando Recontagem N3', 'Recontagem N3 em Andamento'].includes(n.statusConferencia)) {
        nivel = 3;
      } else if (['Em Aberto', 'N1 em Andamento', 'Aguardando Recontagem N1', 'Recontagem N1 em Andamento'].includes(n.statusConferencia)) {
        nivel = 1;
      }

      if (nivel === 1 && !verN1) return false;
      if (nivel === 2 && !verN2) return false;
      if (nivel === 3 && !verN3) return false;

      if (filtros?.numeroNota && !String(n.numnota).includes(filtros.numeroNota)) {
        return false;
      }
      if (
        filtros?.fornecedor &&
        !n.nomeparc.toLowerCase().includes(filtros.fornecedor.toLowerCase())
      ) {
        return false;
      }
      if (filtros?.statusConferencia && filtros.statusConferencia !== 'todos') {
        if (filtros.statusConferencia === 'pendentes' && n.statusConferencia !== 'Em Aberto') {
          return false;
        }
        if (
          filtros.statusConferencia === 'conferindo' &&
          !['N1 em Andamento', 'N2 em Andamento', 'N3 em Andamento', 'Em Reconferência', 'Divergente', 'Aguardando Recontagem N1', 'Recontagem N1 em Andamento', 'Aguardando Recontagem N2', 'Recontagem N2 em Andamento', 'Aguardando Recontagem N3', 'Recontagem N3 em Andamento'].includes(
            n.statusConferencia
          )
        ) {
          return false;
        }
        if (filtros.statusConferencia === 'concluidos' && n.statusConferencia !== 'Conferido' && n.statusConferencia !== 'Enviado ao Sankhya') {
          return false;
        }
      }
      return true;
    });
  }
}
