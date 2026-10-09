import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import { IConfiguracaoTelasRepository } from '../../../domain/ports/IConfiguracaoTelasRepository.js';
import { NotaEntrada, StatusConferenciaEntrada } from '../../../domain/entities/ConferenciaEntrada.js';

export interface ListarNotasEntradaFiltros {
  numeroNota?: string;
  fornecedor?: string;
  statusConferencia?: string;
  usuario?: string;
}

export class ListarNotasEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository,
    private readonly configTelasRepo?: IConfiguracaoTelasRepository
  ) {}

  async execute(filtros?: ListarNotasEntradaFiltros, correlationId?: string): Promise<NotaEntrada[]> {
    const sql = `
SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    NVL(CAB.SERIENOTA, ' ') AS SERIENOTA,
    CAB.DTNEG,
    CAB.DTENTSAI,
    CAB.CODPARC,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'FORNECEDOR NÃO INFORMADO')) AS NOMEPARC,
    CAB.CODTIPOPER,
    CAB.TIPMOV,
    NVL(CAB.VLRNOTA, 0) AS VLRNOTA,
    CAB.STATUSNOTA,
    CAB.CODEMP,
    NVL(ITE.QTD_ITENS, 0) AS QTD_ITENS
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR
       ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN (
    SELECT I.NUNOTA, COUNT(DISTINCT I.CODPROD) AS QTD_ITENS
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
      const statusInfo = mapaStatus[nunota];
      const statusConf: StatusConferenciaEntrada = statusInfo?.status || 'Em Aberto';

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
        codemp: Number(getVal(r, 'CODEMP')) || 0,
        statusConferencia: statusConf,
        conferenciaId: statusInfo?.id,
        nivelAtual: statusInfo?.nivel,
      };
    });

    // Filtros adicionais em memória
    return notas.filter((n) => {
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
          !['N1 em Andamento', 'N2 em Andamento', 'N3 em Andamento', 'Em Reconferência'].includes(
            n.statusConferencia
          )
        ) {
          return false;
        }
        if (filtros.statusConferencia === 'concluidos' && n.statusConferencia !== 'Conferido') {
          return false;
        }
      }
      return true;
    });
  }
}
