import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import {
  AlteracaoErpItem,
  SeparacaoItem,
} from '../../../domain/entities/Separacao.js';

export interface SincronizarItensSeparacaoOutput {
  temAlteracoes: boolean;
  alteracoes: AlteracaoErpItem[];
  itensAtualizados: SeparacaoItem[];
}

export class SincronizarItensSeparacaoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly separacaoRepo: ISeparacaoRepository,
  ) {}

  async execute(separacaoId: string, correlationId?: string): Promise<SincronizarItensSeparacaoOutput> {
    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }

    const itensSnapshot = await this.separacaoRepo.listarItens(separacaoId);

    // 1. Consultar estado corrente dos itens na TGFITE do Sankhya com endereçamento WMS (TGWEXP / TGWEND)
    const sql = `
SELECT
    CAB.NUNOTA,
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
INNER JOIN TGFTOP TOP
        ON TOP.CODTIPOPER = CAB.CODTIPOPER
       AND TOP.DHALTER = CAB.DHTIPOPER
LEFT JOIN TGFCON2 CON
       ON CON.NUCONF = CAB.NUCONFATUAL
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
  AND CAB.ORDEMCARGA = ${Number(separacao.ordemCarga)}
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
        console.warn('[SincronizarSeparacao] Falha ao consultar códigos de barras múltiplos:', err.message);
      }
    }

    // Mapa de itens atuais no Sankhya por chave composta: nunota_sequencia_codprod
    const chaveItem = (nunota: number, sequencia: number, codprod: number) => `${nunota}_${sequencia}_${codprod}`;
    const itensSankhya = new Map<string, any>();

    for (const r of rows) {
      const nunota = Number(getVal(r, 'NUNOTA'));
      const sequencia = Number(getVal(r, 'SEQUENCIA'));
      const codprod = Number(getVal(r, 'CODPROD'));
      const chave = chaveItem(nunota, sequencia, codprod);

      const barrasSet = mapaBarras.get(codprod);
      const codbarra = barrasSet && barrasSet.size > 0
        ? Array.from(barrasSet).join(', ')
        : (getVal(r, 'CODBARRA') ? String(getVal(r, 'CODBARRA')).trim() : null);

      itensSankhya.set(chave, {
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
        qtdneg: Number(getVal(r, 'QTDNEG') || 0),
      });
    }

    const alteracoes: AlteracaoErpItem[] = [];
    const chavesProcessadas = new Set<string>();

    // 1.1 Identificar os pedidos (NUNOTA) que pertencem a esta sessão ativa de separação
    const pedidosSessao = new Set<number>();
    try {
      if (separacao.dadosCargaJson) {
        const dados = JSON.parse(separacao.dadosCargaJson);
        if (Array.isArray(dados.pedidos)) {
          dados.pedidos.forEach((p: any) => pedidosSessao.add(Number(p)));
        }
      }
    } catch (_) {}
    if (pedidosSessao.size === 0) {
      itensSnapshot.forEach((i) => pedidosSessao.add(i.nunota));
    }

    // 2. Verificar itens existentes no snapshot contra o Sankhya
    for (const item of itensSnapshot) {
      const chave = chaveItem(item.nunota, item.sequencia, item.codprod);
      chavesProcessadas.add(chave);

      const itemErp = itensSankhya.get(chave);

      if (!itemErp || itemErp.qtdneg <= 0) {
        // Item foi REMOVIDO ou cortado totalmente no Sankhya
        if (item.statusItem !== 'REMOVIDO_ERP') {
          const exigeAcao = item.qtdSeparada > 0;
          alteracoes.push({
            tipo: 'REMOVIDO',
            nunota: item.nunota,
            sequencia: item.sequencia,
            codprod: item.codprod,
            descrprod: item.descrprod || undefined,
            qtdSnapshot: item.qtdEsperada,
            qtdSeparada: item.qtdSeparada,
            qtdErpAtual: 0,
            mensagem: `Produto ${item.codprod} foi REMOVIDO do pedido ${item.nunota} no Sankhya.${exigeAcao ? ` Atenção: ${item.qtdSeparada} UN já haviam sido separadas e devem retornar ao estoque!` : ''}`,
            exigeAcaoFisica: exigeAcao,
          });

          await this.separacaoRepo.atualizarItem(item.id, {
            statusItem: 'REMOVIDO_ERP',
            qtdErpAtual: 0,
            observacaoAlteracao: `Item cortado no ERP (esperado anterior: ${item.qtdEsperada})`,
          });
        }
      } else if (itemErp.qtdneg !== item.qtdEsperada) {
        // Quantidade foi alterada no Sankhya
        const novaQtd = itemErp.qtdneg;
        const exigeAcao = item.qtdSeparada > novaQtd;

        alteracoes.push({
          tipo: 'QUANTIDADE_ALTERADA',
          nunota: item.nunota,
          sequencia: item.sequencia,
          codprod: item.codprod,
          descrprod: item.descrprod || undefined,
          qtdSnapshot: item.qtdEsperada,
          qtdSeparada: item.qtdSeparada,
          qtdErpAtual: novaQtd,
          mensagem: `Qtd do produto ${item.codprod} no pedido ${item.nunota} foi alterada de ${item.qtdEsperada} para ${novaQtd}.${exigeAcao ? ` Devolva ${item.qtdSeparada - novaQtd} UN ao estoque!` : ''}`,
          exigeAcaoFisica: exigeAcao,
        });

        // Atualizar status conforme nova quantidade
        let novoStatus = item.statusItem;
        if (item.qtdSeparada >= novaQtd) {
          novoStatus = 'SEPARADO';
        } else if (item.qtdSeparada > 0) {
          novoStatus = 'PARCIAL';
        } else {
          novoStatus = 'ALTERADO_ERP';
        }

        await this.separacaoRepo.atualizarItem(item.id, {
          qtdEsperada: novaQtd,
          qtdErpAtual: novaQtd,
          statusItem: novoStatus,
          observacaoAlteracao: `Qtd alterada no ERP: de ${item.qtdEsperada} para ${novaQtd}`,
        });
      }

      // Enriquecer códigos de barras com multiplicadores atualizados da TGFVOA/TGFBAR
      if (itemErp && itemErp.codbarra && itemErp.codbarra !== item.codbarra) {
        await this.separacaoRepo.atualizarItem(item.id, {
          codbarra: itemErp.codbarra,
        });
        item.codbarra = itemErp.codbarra;
      }

      // Enriquecer endereçamento WMS se alterado ou cadastrado
      if (
        itemErp &&
        (itemErp.codend !== item.codend ||
          itemErp.endereco !== item.endereco ||
          itemErp.descrend !== item.descrend ||
          itemErp.lado !== item.lado ||
          itemErp.codendPulmao !== item.codendPulmao ||
          itemErp.enderecoPulmao !== item.enderecoPulmao ||
          itemErp.descrendPulmao !== item.descrendPulmao ||
          itemErp.ladoPulmao !== item.ladoPulmao)
      ) {
        await this.separacaoRepo.atualizarItem(item.id, {
          codend: itemErp.codend,
          endereco: itemErp.endereco,
          descrend: itemErp.descrend,
          lado: itemErp.lado,
          codendPulmao: itemErp.codendPulmao,
          enderecoPulmao: itemErp.enderecoPulmao,
          descrendPulmao: itemErp.descrendPulmao,
          ladoPulmao: itemErp.ladoPulmao,
        });
        item.codend = itemErp.codend;
        item.endereco = itemErp.endereco;
        item.descrend = itemErp.descrend;
        item.lado = itemErp.lado;
        item.codendPulmao = itemErp.codendPulmao;
        item.enderecoPulmao = itemErp.enderecoPulmao;
        item.descrendPulmao = itemErp.descrendPulmao;
        item.ladoPulmao = itemErp.ladoPulmao;
      }
    }

    // 3. Verificar novos itens inseridos no ERP durante a separação
    const agora = new Date().toISOString();
    for (const [chave, itemErp] of itensSankhya.entries()) {
      if (!chavesProcessadas.has(chave)) {
        const isNovoPedido = !pedidosSessao.has(itemErp.nunota);
        if (isNovoPedido) {
          pedidosSessao.add(itemErp.nunota);
        }

        alteracoes.push({
          tipo: 'NOVO',
          nunota: itemErp.nunota,
          sequencia: itemErp.sequencia,
          codprod: itemErp.codprod,
          descrprod: itemErp.descrprod,
          qtdSnapshot: 0,
          qtdSeparada: 0,
          qtdErpAtual: itemErp.qtdneg,
          mensagem: isNovoPedido
            ? `Novo pedido #${itemErp.nunota} adicionado à carga: produto ${itemErp.codprod} - ${itemErp.descrprod} (Qtd: ${itemErp.qtdneg}).`
            : `Novo produto adicionado ao pedido #${itemErp.nunota}: ${itemErp.codprod} - ${itemErp.descrprod} (Qtd: ${itemErp.qtdneg}).`,
          exigeAcaoFisica: false,
        });

        const novoItem: SeparacaoItem = {
          id: randomUUID(),
          separacaoId,
          ordemCarga: separacao.ordemCarga,
          nunota: itemErp.nunota,
          sequencia: itemErp.sequencia,
          codprod: itemErp.codprod,
          descrprod: itemErp.descrprod,
          referencia: itemErp.referencia,
          codbarra: itemErp.codbarra,
          controle: itemErp.controle,
          codlocal: itemErp.codlocal,
          codvol: itemErp.codvol,
          codend: itemErp.codend,
          endereco: itemErp.endereco,
          descrend: itemErp.descrend,
          lado: itemErp.lado,
          codendPulmao: itemErp.codendPulmao,
          enderecoPulmao: itemErp.enderecoPulmao,
          descrendPulmao: itemErp.descrendPulmao,
          ladoPulmao: itemErp.ladoPulmao,
          qtdEsperada: itemErp.qtdneg,
          qtdSeparada: 0,
          qtdFalta: 0,
          motivoFalta: null,
          statusItem: 'NOVO_ERP',
          qtdErpAtual: itemErp.qtdneg,
          observacaoAlteracao: isNovoPedido
            ? 'Pedido adicionado à carga no ERP após início da separação'
            : 'Item adicionado ao pedido no ERP durante a separação',
          atualizadoEm: agora,
        };

        await this.separacaoRepo.inserirItem(novoItem);
      }
    }

    // Se houve alterações, atualizar totais e lista de pedidos da separação
    if (alteracoes.length > 0) {
      const itensAtualizados = await this.separacaoRepo.listarItens(separacaoId);
      const totalUnidades = itensAtualizados
        .filter((i) => i.statusItem !== 'REMOVIDO_ERP')
        .reduce((acc, curr) => acc + curr.qtdEsperada, 0);

      const distinctPedidos = new Set(
        itensAtualizados
          .filter((i) => i.statusItem !== 'REMOVIDO_ERP')
          .map((i) => i.nunota),
      );

      await this.separacaoRepo.atualizarSeparacao(separacaoId, {
        totalPedidos: distinctPedidos.size,
        totalItens: itensAtualizados.filter((i) => i.statusItem !== 'REMOVIDO_ERP').length,
        totalUnidades,
        dadosCargaJson: JSON.stringify({
          totalPedidos: distinctPedidos.size,
          pedidos: Array.from(distinctPedidos),
        }),
      });

      return {
        temAlteracoes: true,
        alteracoes,
        itensAtualizados,
      };
    }

    return {
      temAlteracoes: false,
      alteracoes: [],
      itensAtualizados: itensSnapshot,
    };
  }
}
