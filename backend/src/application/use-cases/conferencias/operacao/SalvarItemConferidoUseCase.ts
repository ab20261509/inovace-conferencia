import { IGatewayPort } from '../../../../domain/ports/IGatewayPort.js';
import { IPermissoesRepository } from '../../../../domain/ports/IPermissoesRepository.js';
import { CONFERENCIA_CLIENT_EVENTS } from '../shared/clientEvents.js';

export interface SalvarItemConferidoInput {
  numConf: string;
  nuNota: number;
  codBarra: string;
  controle?: string;
  qtdConf: string;
  substituirProduto?: boolean;
  volume?: string;
  exigeIdentificadores?: string;
  codUMA?: string;
  usuario?: string;
}

export interface SalvarItemConferidoOutput {
  resultado: any;
}

/**
 * Use Case: Conferir um item (registrar quantidade conferida)
 */
export class SalvarItemConferidoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly permissoesRepo?: IPermissoesRepository,
  ) {}

  async execute(input: SalvarItemConferidoInput, correlationId?: string): Promise<SalvarItemConferidoOutput> {
    const codigoLimpo = (input.codBarra || '').trim().replace(/'/g, "''");

    // Validação da permissão 'bipar_por_codprod': se conferente não tem permissão,
    // bloquear apenas se o código for estritamente CODPROD e não coincidir com REFERENCIA ou CODBARRA
    if (input.usuario && this.permissoesRepo && codigoLimpo) {
      try {
        const perms = await this.permissoesRepo.obterPermissoes(0, input.usuario);
        const ehAdmin =
          Boolean(perms?.gerenciar_acessos) ||
          ['SUP', 'ANTONY', 'ANTONY.B'].includes(input.usuario.trim().toUpperCase());
        const podeBiparPorCodprod = ehAdmin
          ? perms?.bipar_por_codprod !== false
          : Boolean(perms?.bipar_por_codprod);

        if (!podeBiparPorCodprod) {
          const sql = `
SELECT 
  MAX(CASE WHEN TO_CHAR(PRO.CODPROD) = '${codigoLimpo}' THEN 1 ELSE 0 END) AS EH_CODPROD,
  MAX(CASE WHEN UPPER(TRIM(PRO.REFERENCIA)) = UPPER('${codigoLimpo}') THEN 1 ELSE 0 END) AS EH_REFERENCIA,
  MAX(CASE WHEN UPPER(TRIM(BAR.CODBARRA)) = UPPER('${codigoLimpo}') THEN 1 ELSE 0 END) AS EH_CODBARRA
FROM TGFITE ITE
INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
LEFT JOIN (
    SELECT CODPROD, CODBARRA FROM TGFVOA WHERE (ATIVO IS NULL OR ATIVO = 'S')
    UNION ALL
    SELECT CODPROD, CODBARRA FROM TGFBAR
) BAR ON BAR.CODPROD = ITE.CODPROD AND UPPER(TRIM(BAR.CODBARRA)) = UPPER('${codigoLimpo}')
WHERE ITE.NUNOTA = ${Number(input.nuNota)}
  AND (
       TO_CHAR(PRO.CODPROD) = '${codigoLimpo}'
    OR UPPER(TRIM(PRO.REFERENCIA)) = UPPER('${codigoLimpo}')
    OR UPPER(TRIM(BAR.CODBARRA)) = UPPER('${codigoLimpo}')
  )
          `.trim();

          const resp = await this.gateway.serviceCall<any>(
            'DbExplorerSP.executeQuery',
            { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
            correlationId,
          );

          const rows: any[] = resp?.responseBody?.rows || [];
          const fields: any[] = resp?.responseBody?.fieldsMetadata || [];

          if (rows.length > 0) {
            const fieldIndex: Record<string, number> = {};
            fields.forEach((f: any, idx: number) => {
              fieldIndex[f.name.toUpperCase()] = idx;
            });

            const row = rows[0];
            const ehCodProd = Number(row[fieldIndex['EH_CODPROD']] || 0) === 1;
            const ehReferencia = Number(row[fieldIndex['EH_REFERENCIA']] || 0) === 1;
            const ehCodBarra = Number(row[fieldIndex['EH_CODBARRA']] || 0) === 1;

            if (ehCodProd && !ehReferencia && !ehCodBarra) {
              throw new Error(
                'Permissão insuficiente: conferente não autorizado a conferir pelo código interno (CODPROD). Utilize o código de barras ou referência.',
              );
            }
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('não autorizado a conferir pelo código interno')) {
          throw err;
        }
        console.warn('⚠️ Falha ao validar permissão bipar_por_codprod na saída:', err);
      }
    }

    const response = await this.gateway.serviceCall<any>(
      'ConferenciaSP.salvarItemConferido',
      {
        serviceName: 'ConferenciaSP.salvarItemConferido',
        requestBody: {
          params: {
            numConf: input.numConf,
            nuNota: input.nuNota,
            codBarra: input.codBarra,
            controle: input.controle || '',
            qtdConf: input.qtdConf,
            substituirProduto: input.substituirProduto || false,
            volume: input.volume || '',
            exigeIdentificadores: input.exigeIdentificadores || 'N',
            codUMA: input.codUMA || '',
          },
          ...CONFERENCIA_CLIENT_EVENTS,
        },
      },
      correlationId,
      'mgecom',
    );

    return { resultado: response.responseBody };
  }
}
