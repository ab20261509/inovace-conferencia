import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import {
  Separacao,
  SeparacaoItem,
} from '../../../domain/entities/Separacao.js';

export interface IniciarSeparacaoInput {
  ordemCarga: number;
  usuario: string;
}

export interface IniciarSeparacaoOutput {
  separacao: Separacao;
  itens: SeparacaoItem[];
  recuperada: boolean;
}

export class IniciarSeparacaoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly separacaoRepo: ISeparacaoRepository,
  ) {}

  async execute(input: IniciarSeparacaoInput, correlationId?: string): Promise<IniciarSeparacaoOutput> {
    const { ordemCarga, usuario } = input;

    // 1. Verificar se já existe uma sessão em andamento para esta carga
    const existente = await this.separacaoRepo.buscarPorOrdemCarga(ordemCarga, 'EM_ANDAMENTO');
    if (existente) {
      const itensExistentes = await this.separacaoRepo.listarItens(existente.id);
      return {
        separacao: existente,
        itens: itensExistentes,
        recuperada: true,
      };
    }

    // 2. Buscar itens dos pedidos de venda pendentes no Sankhya com endereçamento WMS (Picking e Pulmão via TGWEXP / TGWEND)
    const sql = `
SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODEMP,
    NVL(EMP.NOMEFANTASIA, EMP.RAZAOSOCIAL) AS NOME_EMPRESA,
    CAB.CODPARC,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'CLIENTE')) AS NOMEPARC,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    PRO.DESCRPROD,
    NVL(PRO.REFERENCIA, '') AS REFERENCIA,
    NVL(BAR.CODBARRA, '') AS CODBARRA,
    ITE.CONTROLE,
    ITE.CODLOCALORIG AS CODLOCAL,
    ITE.CODVOL,
    NVL(ITE.QTDNEG, 0) AS QTDNEG,
    PICK.CODEND,
    PICK.ENDERECO,
    PICK.DESCREND,
    PICK.LADO,
    PULM.CODEND AS CODEND_PULMAO,
    PULM.ENDERECO AS ENDERECO_PULMAO,
    PULM.DESCREND AS DESCREND_PULMAO,
    PULM.LADO AS LADO_PULMAO
FROM TGFCAB CAB
JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
LEFT JOIN TSIEMP EMP ON EMP.CODEMP = CAB.CODEMP
INNER JOIN TGFTOP TOP
        ON TOP.CODTIPOPER = CAB.CODTIPOPER
       AND TOP.DHALTER = CAB.DHTIPOPER
LEFT JOIN TGFCON2 CON
       ON CON.NUCONF = CAB.NUCONFATUAL
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN (
    SELECT CODPROD, MIN(CODBARRA) AS CODBARRA
    FROM TGFBAR
    GROUP BY CODPROD
) BAR ON BAR.CODPROD = ITE.CODPROD
LEFT JOIN (
    SELECT 
        EXP.CODPROD,
        NVL(TRIM(EXP.CONTROLE), ' ') AS CONTROLE,
        EXP.CODEND,
        END.ENDERECO,
        END.DESCREND,
        END.PAR AS LADO,
        ROW_NUMBER() OVER (PARTITION BY EXP.CODPROD, NVL(TRIM(EXP.CONTROLE), ' ') ORDER BY EXP.DTINICIO DESC, EXP.CODEND DESC) AS RN
    FROM TGWEXP EXP
    JOIN TGWEND END ON END.CODEND = EXP.CODEND
    WHERE EXP.ATIVO = 'S'
      AND END.PICKING = 'S'
) PICK ON PICK.CODPROD = ITE.CODPROD
      AND (PICK.CONTROLE = NVL(TRIM(ITE.CONTROLE), ' ') OR PICK.CONTROLE = ' ')
      AND PICK.RN = 1
LEFT JOIN (
    SELECT 
        EXP.CODPROD,
        NVL(TRIM(EXP.CONTROLE), ' ') AS CONTROLE,
        EXP.CODEND,
        END.ENDERECO,
        END.DESCREND,
        END.PAR AS LADO,
        ROW_NUMBER() OVER (PARTITION BY EXP.CODPROD, NVL(TRIM(EXP.CONTROLE), ' ') ORDER BY EXP.DTINICIO DESC, EXP.CODEND DESC) AS RN
    FROM TGWEXP EXP
    JOIN TGWEND END ON END.CODEND = EXP.CODEND
    WHERE EXP.ATIVO = 'S'
      AND (END.PICKING IS NULL OR END.PICKING = 'N')
) PULM ON PULM.CODPROD = ITE.CODPROD
      AND (PULM.CONTROLE = NVL(TRIM(ITE.CONTROLE), ' ') OR PULM.CONTROLE = ' ')
      AND PULM.RN = 1
WHERE CAB.TIPMOV = 'P'
  AND CAB.STATUSNOTA = 'L'
  AND CAB.PENDENTE = 'S'
  AND CAB.ORDEMCARGA = ${Number(ordemCarga)}
  AND NOT EXISTS (
      SELECT 1 FROM TGFVAR WHERE NUNOTAORIG = CAB.NUNOTA
  )
  AND NVL(TOP.NUCCO, 0) > 0
  AND CAB.CODVEND NOT IN (43)
  AND NVL(CON.STATUS, 'S') IN ('A', 'R', 'S')
ORDER BY 
    CASE WHEN PICK.ENDERECO IS NOT NULL THEN 0 ELSE 1 END,
    PICK.ENDERECO ASC,
    CAB.NUNOTA ASC, 
    ITE.SEQUENCIA ASC
    `.trim();

    const response = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
      },
      correlationId,
    );

    const rows: any[] = response?.responseBody?.rows || [];
    const fields: any[] = response?.responseBody?.fieldsMetadata || [];

    if (rows.length === 0) {
      throw new Error(`Nenhum pedido de venda pendente encontrado no Sankhya para a Carga ${ordemCarga}.`);
    }

    const fieldIndexMap: Record<string, number> = {};
    fields.forEach((f: any, idx: number) => {
      fieldIndexMap[f.name.toUpperCase()] = idx;
    });

    const getVal = (row: any[], fieldName: string) => {
      const idx = fieldIndexMap[fieldName.toUpperCase()];
      return idx !== undefined ? row[idx] : null;
    };

    // Buscar TODOS os códigos de barras disponíveis para os produtos da carga (TGFBAR + TGFVOA com conversão de volume)
    const codprods = Array.from(new Set(rows.map((r) => Number(getVal(r, 'CODPROD'))).filter(Boolean)));
    const mapaBarras = new Map<number, Set<string>>();

    if (codprods.length > 0) {
      try {
        const sqlBarras = `
SELECT 
    BAR.CODPROD,
    TRIM(BAR.CODBARRA) AS CODBARRA,
    NVL(BAR.CODVOL, NVL(VOA.CODVOL, 'UN')) AS CODVOL,
    NVL(VOA.QUANTIDADE, 1) AS QUANTIDADE,
    NVL(VOA.DIVIDEMULTIPLICA, 'M') AS DIVIDEMULTIPLICA
FROM TGFBAR BAR
LEFT JOIN TGFVOA VOA ON VOA.CODPROD = BAR.CODPROD 
                    AND VOA.CODVOL = BAR.CODVOL
WHERE BAR.CODPROD IN (${codprods.join(',')})
  AND BAR.CODBARRA IS NOT NULL
UNION
SELECT 
    VOA.CODPROD,
    TRIM(VOA.CODBARRA) AS CODBARRA,
    VOA.CODVOL,
    NVL(VOA.QUANTIDADE, 1) AS QUANTIDADE,
    NVL(VOA.DIVIDEMULTIPLICA, 'M') AS DIVIDEMULTIPLICA
FROM TGFVOA VOA
WHERE VOA.CODPROD IN (${codprods.join(',')})
  AND VOA.CODBARRA IS NOT NULL
        `.trim();

        const respBarras = await this.gateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          {
            serviceName: 'DbExplorerSP.executeQuery',
            requestBody: { sql: sqlBarras },
          },
          correlationId,
        );

        const rBarras: any[] = respBarras?.responseBody?.rows || [];
        for (const rb of rBarras) {
          const cp = Number(rb[0]);
          const cb = String(rb[1] || '').trim();
          const codvol = String(rb[2] || '').trim();
          const qtdVoa = Number(rb[3] || 1);
          const divMul = String(rb[4] || 'M').trim().toUpperCase();

          if (cp && cb) {
            if (!mapaBarras.has(cp)) mapaBarras.set(cp, new Set());
            const op = divMul === 'D' ? '/' : 'x';
            const descrBarra = `${cb} (${codvol ? codvol + ' ' : ''}${op}${qtdVoa})`;
            mapaBarras.get(cp)!.add(descrBarra);
          }
        }
      } catch (err: any) {
        console.warn('[IniciarSeparacao] Falha ao consultar códigos de barras múltiplos:', err.message);
      }
    }

    const separacaoId = randomUUID();
    const agora = new Date().toISOString();

    const distinctPedidos = new Set<number>();
    let totalUnidades = 0;

    const itens: SeparacaoItem[] = rows.map((r) => {
      const nunota = Number(getVal(r, 'NUNOTA'));
      const sequencia = Number(getVal(r, 'SEQUENCIA'));
      const codprod = Number(getVal(r, 'CODPROD'));
      const qtdEsperada = Number(getVal(r, 'QTDNEG') || 0);

      distinctPedidos.add(nunota);
      totalUnidades += qtdEsperada;

      const barrasSet = mapaBarras.get(codprod);
      const codbarra = barrasSet && barrasSet.size > 0
        ? Array.from(barrasSet).join(', ')
        : (getVal(r, 'CODBARRA') ? String(getVal(r, 'CODBARRA')).trim() : null);

      return {
        id: randomUUID(),
        separacaoId,
        ordemCarga,
        nunota,
        sequencia,
        codprod,
        descrprod: String(getVal(r, 'DESCRPROD') || ''),
        referencia: getVal(r, 'REFERENCIA') ? String(getVal(r, 'REFERENCIA')) : null,
        codbarra,
        controle: getVal(r, 'CONTROLE') ? String(getVal(r, 'CONTROLE')) : null,
        codlocal: getVal(r, 'CODLOCAL') != null ? Number(getVal(r, 'CODLOCAL')) : null,
        codvol: getVal(r, 'CODVOL') ? String(getVal(r, 'CODVOL')) : null,
        codend: getVal(r, 'CODEND') != null ? Number(getVal(r, 'CODEND')) : null,
        endereco: getVal(r, 'ENDERECO') ? String(getVal(r, 'ENDERECO')).trim() : null,
        descrend: getVal(r, 'DESCREND') ? String(getVal(r, 'DESCREND')).trim() : null,
        lado: getVal(r, 'LADO') ? String(getVal(r, 'LADO')).trim() : null,
        codendPulmao: getVal(r, 'CODEND_PULMAO') != null ? Number(getVal(r, 'CODEND_PULMAO')) : null,
        enderecoPulmao: getVal(r, 'ENDERECO_PULMAO') ? String(getVal(r, 'ENDERECO_PULMAO')).trim() : null,
        descrendPulmao: getVal(r, 'DESCREND_PULMAO') ? String(getVal(r, 'DESCREND_PULMAO')).trim() : null,
        ladoPulmao: getVal(r, 'LADO_PULMAO') ? String(getVal(r, 'LADO_PULMAO')).trim() : null,
        qtdEsperada,
        qtdSeparada: 0,
        qtdFalta: 0,
        motivoFalta: null,
        statusItem: 'PENDENTE',
        qtdErpAtual: qtdEsperada,
        observacaoAlteracao: null,
        atualizadoEm: agora,
      };
    });

    const codemp = Number(getVal(rows[0], 'CODEMP') || 0) || undefined;
    const nomeEmpresa = String(getVal(rows[0], 'NOME_EMPRESA') || '').trim() || null;

    const novaSeparacao: Separacao = {
      id: separacaoId,
      ordemCarga,
      codemp,
      nomeEmpresa,
      status: 'EM_ANDAMENTO',
      usuario,
      criadoEm: agora,
      atualizadoEm: agora,
      finalizadoEm: null,
      totalPedidos: distinctPedidos.size,
      totalItens: itens.length,
      totalUnidades,
      observacoes: null,
      dadosCargaJson: JSON.stringify({
        totalPedidos: distinctPedidos.size,
        pedidos: Array.from(distinctPedidos),
      }),
    };

    await this.separacaoRepo.criarSeparacao(novaSeparacao, itens);

    // 3. Atualizar status da Ordem de Carga no Sankhya ERP para 'E' (Em Separação)
    await this.atualizarStatusCargaSankhya(ordemCarga, 'E', correlationId);

    return {
      separacao: novaSeparacao,
      itens,
      recuperada: false,
    };
  }

  private async atualizarStatusCargaSankhya(
    ordemCarga: number,
    status: 'P' | 'E' | 'F',
    correlationId?: string,
  ): Promise<void> {
    try {
      const resCarga = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        {
          serviceName: 'DbExplorerSP.executeQuery',
          requestBody: { sql: `SELECT DISTINCT CODEMP FROM TGFORD WHERE ORDEMCARGA = ${Number(ordemCarga)}` },
        },
        correlationId,
      );

      const rows: any[] = resCarga?.responseBody?.rows || [];
      for (const row of rows) {
        const codemp = row[0];
        if (codemp != null) {
          await this.gateway.serviceCall(
            'CRUDServiceProvider.saveRecord',
            {
              serviceName: 'CRUDServiceProvider.saveRecord',
              requestBody: {
                dataSet: {
                  rootEntity: 'OrdemCarga',
                  includePresentationFields: 'N',
                  dataRow: {
                    localFields: {
                      CODEMP: { $: String(codemp) },
                      ORDEMCARGA: { $: String(ordemCarga) },
                      AD_STATUSSEP: { $: status },
                    },
                    key: {
                      CODEMP: { $: String(codemp) },
                      ORDEMCARGA: { $: String(ordemCarga) },
                    },
                  },
                  entity: {
                    fieldset: {
                      list: 'CODEMP,ORDEMCARGA,AD_STATUSSEP',
                    },
                  },
                },
              },
            },
            correlationId,
          );
        }
      }
      console.log(`[Separação] Status da Ordem de Carga ${ordemCarga} atualizado para AD_STATUSSEP = '${status}' no Sankhya.`);
    } catch (err: any) {
      console.warn(`[Separação] Aviso ao atualizar AD_STATUSSEP na TGFORD da carga ${ordemCarga}: ${err.message}`);
    }
  }
}
