import { TarefaReabastecimento, EstoqueDisponivelDetalhe } from '../../../domain/entities/Reabastecimento.js';
import { IReabastecimentoRepository, FiltrosReabastecimento } from '../../../domain/ports/IReabastecimentoRepository.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';

export class ListarTarefasReabastecimentoUseCase {
  constructor(
    private readonly reabastecimentoRepo: IReabastecimentoRepository,
    private readonly gateway?: IGatewayPort,
  ) {}

  async execute(filtros?: FiltrosReabastecimento, correlationId?: string): Promise<{
    tarefas: TarefaReabastecimento[];
    resumo: {
      total: number;
      pendentes: number;
      semPulmao: number;
      concluidasHoje: number;
    };
  }> {
    const tarefas = await this.reabastecimentoRepo.listar(filtros);

    // Se temos o gateway configurado e existem tarefas, enriquece com dados da empresa e saldo disponível em tempo real
    if (this.gateway && tarefas.length > 0) {
      try {
        // 1. Identificar tarefas sem codemp para buscar de TGFORD / TSIEMP
        const tarefasSemEmpresa = tarefas.filter((t) => !t.codemp && t.ordemCarga);
        if (tarefasSemEmpresa.length > 0) {
          const ordensCargaUnicas = [...new Set(tarefasSemEmpresa.map((t) => t.ordemCarga))];
          const sqlEmp = `
SELECT 
    ORD.ORDEMCARGA,
    ORD.CODEMP,
    NVL(EMP.NOMEFANTASIA, EMP.RAZAOSOCIAL) AS NOME_EMPRESA
FROM TGFORD ORD
LEFT JOIN TSIEMP EMP ON EMP.CODEMP = ORD.CODEMP
WHERE ORD.ORDEMCARGA IN (${ordensCargaUnicas.join(',')})
          `.trim();

          const respEmp = await this.gateway.serviceCall<any>(
            'DbExplorerSP.executeQuery',
            { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlEmp } },
            correlationId,
          );

          const rEmp = respEmp?.responseBody?.rows || [];
          const mapEmp = new Map<number, { codemp: number; nomeEmpresa: string }>();
          for (const row of rEmp) {
            const oc = Number(row[0]);
            const ce = Number(row[1]);
            const ne = String(row[2] || '').trim();
            if (oc && ce) {
              mapEmp.set(oc, { codemp: ce, nomeEmpresa: ne });
            }
          }

          for (const t of tarefasSemEmpresa) {
            const empInfo = mapEmp.get(t.ordemCarga);
            if (empInfo) {
              t.codemp = empInfo.codemp;
              t.nomeEmpresa = empInfo.nomeEmpresa;
            }
          }
        }

        // 2. Buscar saldos de estoque disponíveis em tempo real na TGFEST (Estoque - Reservado)
        const codprods = [...new Set(tarefas.map((t) => t.codprod).filter(Boolean))];
        const codemps = [...new Set(tarefas.map((t) => t.codemp).filter((e): e is number => e != null && e > 0))];

        if (codprods.length > 0) {
          let sqlEst = `
SELECT
    EST.CODEMP,
    EST.CODPROD,
    EST.CODLOCAL,
    LOC.DESCRLOCAL AS LOCAL,
    EST.CONTROLE,
    EST.ESTOQUE,
    NVL(EST.RESERVADO, 0) AS RESERVADO,
    (EST.ESTOQUE - NVL(EST.RESERVADO, 0)) AS DISPONIVEL
FROM TGFEST EST
LEFT JOIN TGFLOC LOC ON LOC.CODLOCAL = EST.CODLOCAL
WHERE EST.CODPROD IN (${codprods.join(',')})
          `.trim();

          if (codemps.length > 0) {
            sqlEst += ` AND EST.CODEMP IN (${codemps.join(',')})`;
          }

          sqlEst += ` AND (EST.ESTOQUE <> 0 OR NVL(EST.RESERVADO, 0) <> 0)
ORDER BY EST.CODPROD, (EST.ESTOQUE - NVL(EST.RESERVADO, 0)) DESC
          `.trim();

          const respEst = await this.gateway.serviceCall<any>(
            'DbExplorerSP.executeQuery',
            { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlEst } },
            correlationId,
          );

          const rEst = respEst?.responseBody?.rows || [];
          const mapaEstoque = new Map<string, EstoqueDisponivelDetalhe[]>();

          for (const row of rEst) {
            const ce = Number(row[0]);
            const cp = Number(row[1]);
            const cl = Number(row[2]);
            const locNome = String(row[3] || '').trim();
            const ctrl = row[4] ? String(row[4]).trim() : null;
            const est = Number(row[5] || 0);
            const res = Number(row[6] || 0);
            const disp = Number(row[7] || 0);

            const itemDetalhe: EstoqueDisponivelDetalhe = {
              codLocal: cl,
              local: locNome || `Local ${cl}`,
              controle: ctrl,
              estoque: est,
              reservado: res,
              disponivel: disp,
            };

            const chaveEmp = `${ce}_${cp}`;
            if (!mapaEstoque.has(chaveEmp)) mapaEstoque.set(chaveEmp, []);
            mapaEstoque.get(chaveEmp)!.push(itemDetalhe);

            const chaveProd = `0_${cp}`;
            if (!mapaEstoque.has(chaveProd)) mapaEstoque.set(chaveProd, []);
            mapaEstoque.get(chaveProd)!.push(itemDetalhe);
          }

          for (const t of tarefas) {
            const chave = t.codemp ? `${t.codemp}_${t.codprod}` : `0_${t.codprod}`;
            const detalhes = mapaEstoque.get(chave) || [];
            t.detalhesEstoque = detalhes;
            t.saldoDisponivel = Number(
              detalhes.reduce((acc, d) => acc + Math.max(0, d.disponivel), 0).toFixed(4),
            );
          }
        }
      } catch (err: any) {
        console.warn('[Reabastecimento] Aviso ao consultar estoque em tempo real na TGFEST:', err.message);
      }
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const pendentes = tarefas.filter((t) => t.status === 'PENDENTE').length;
    const semPulmao = tarefas.filter((t) => t.status === 'VERIFICAR_ESTOQUE').length;
    const concluidasHoje = tarefas.filter(
      (t) => t.status === 'CONCLUIDO' && t.concluidoEm && t.concluidoEm.startsWith(hoje),
    ).length;

    return {
      tarefas,
      resumo: {
        total: tarefas.length,
        pendentes,
        semPulmao,
        concluidasHoje,
      },
    };
  }
}
