import { IGatewayPort } from '../../../../domain/ports/IGatewayPort.js';
import { CONFERENCIA_CLIENT_EVENTS } from '../shared/clientEvents.js';
import { podeVerCamposSensiveis } from '../../../../domain/permissions.js';

export interface ItemPedido {
  codProd: string;
  sequencia: string;
  descrProd: string | null;
  codBarra: string | null;
  referencia: string | null;
  qtdPed: string;
  qtdConf: string;
  controle: string | null;
  peso: number;
  usoProd: string | null;
}

/**
 * Situação do item, calculada no servidor.
 *
 * Existe para o frontend separar listas, marcar "Parcial" e contar sem
 * precisar da quantidade pedida — que é justamente o dado escondido do
 * conferente na conferência cega.
 */
export type StatusItem = 'pendente' | 'parcial' | 'completo';

/**
 * Item como sai na resposta HTTP.
 * `qtdPed`, `codBarra` e `referencia` vêm `null` para usuários não
 * privilegiados: são omitidos na origem, não apenas escondidos na tela.
 */
export interface ItemPedidoResponse extends Omit<ItemPedido, 'qtdPed'> {
  qtdPed: string | null;
  status: StatusItem;
}

export interface ListarItensPedidoInput {
  nuNota: number;
  /**
   * Login do usuário que está pedindo a lista. Define se os campos sensíveis
   * (código de barras, referência, quantidade pedida) vão na resposta.
   * Ausente = tratado como não privilegiado.
   */
  usuario?: string;
}

export interface ListarItensPedidoOutput {
  conferenciaIniciada: boolean;
  itens: ItemPedidoResponse[];
  paginacao: boolean;
  /** Informa ao frontend se ele recebeu os campos sensíveis */
  camposSensiveis: boolean;
}

/**
 * Use Case: Listar itens do pedido com quantidades pedidas e conferidas
 * 
 * Estratégia: busca TODOS os itens da nota via SQL (nunca perde itens),
 * e cruza com as qtdConf do ConferenciaSP.listarItensPedido
 */
export class ListarItensPedidoUseCase {
  constructor(private readonly gateway: IGatewayPort) {}

  async execute(input: ListarItensPedidoInput, correlationId?: string): Promise<ListarItensPedidoOutput> {
    // 1. Buscar TODOS os itens da nota via SQL e qtdConf via ConferenciaSP em paralelo
    const [todosItens, divergenciasResult] = await Promise.all([
      this.buscarTodosItensDaNota(input.nuNota, correlationId),
      this.buscarDivergencias(input.nuNota, correlationId),
    ]);

    let conferenciaIniciada = false;
    const qtdConfMap = new Map<string, string>();

    if (divergenciasResult) {
      conferenciaIniciada = divergenciasResult.conferenciaIniciada;
      divergenciasResult.qtdConfMap.forEach((v, k) => qtdConfMap.set(k, v));
    }

    // 2. Cruzar: distribuir qtdConf por sequência (fill-first por codProd)
    // O Sankhya agrupa por CODPROD, mas temos múltiplas sequências do mesmo produto.
    // Antes era proporcional (Math.round(totalConf * proporcao)), o que fazia
    // bipar 1 unidade atribuir qtdConf=1 a TODAS sequências do mesmo CODPROD
    // quando qtdPed era igual (Math.round(0.5)=1). Agora preenche em ordem
    // crescente de SEQUENCIA: 1ª sequência até qtdPed, sobra vai para a próxima.
    const itensOrdenados = [...todosItens].sort(
      (a, b) => Number(a.sequencia) - Number(b.sequencia),
    );

    const gruposPorCodProd = new Map<string, typeof todosItens>();
    for (const it of itensOrdenados) {
      const arr = gruposPorCodProd.get(it.codProd);
      if (arr) arr.push(it);
      else gruposPorCodProd.set(it.codProd, [it]);
    }

    const qtdConfPorSeq = new Map<string, string>();

    for (const [codProd, grupo] of gruposPorCodProd) {
      const qtdConfFromSankhya = qtdConfMap.get(codProd);

      if (qtdConfFromSankhya !== undefined) {
        // Item está na lista de divergências — distribuir fill-first
        let resto = parseFloat(qtdConfFromSankhya);
        for (const it of grupo) {
          const cap = parseFloat(it.qtdPed);
          const conf = Math.min(cap, Math.max(0, resto));
          qtdConfPorSeq.set(it.sequencia, String(conf));
          resto -= conf;
        }
      } else if (conferenciaIniciada) {
        // Conferência iniciada mas item não está na lista de divergências = totalmente conferido
        for (const it of grupo) {
          qtdConfPorSeq.set(it.sequencia, it.qtdPed);
        }
      } else {
        for (const it of grupo) {
          qtdConfPorSeq.set(it.sequencia, '0');
        }
      }
    }

    const itens: ItemPedido[] = itensOrdenados.map((item) => ({
      ...item,
      qtdConf: qtdConfPorSeq.get(item.sequencia) ?? '0',
    }));

    // 4. Calcular o status no servidor e, se o usuário não for privilegiado,
    //    remover os campos sensíveis da resposta.
    const verCamposSensiveis = podeVerCamposSensiveis(input.usuario);

    const itensResposta: ItemPedidoResponse[] = itens.map((item) => {
      const pedido = parseFloat(item.qtdPed);
      const conferido = parseFloat(item.qtdConf);

      let status: StatusItem;
      if (conferido >= pedido) status = 'completo';
      else if (conferido > 0) status = 'parcial';
      else status = 'pendente';

      if (verCamposSensiveis) {
        return { ...item, status };
      }

      // Regra de exibição para usuários não privilegiados:
      // 1) Se peso >= 7.5 e quantidade pedida > 10, OU
      // 2) Se o produto tiver USOPROD = 'V'
      const isUsoProdV = String(item.usoProd || '').trim().toUpperCase() === 'V';
      const isPesadoQtdAlta = item.peso >= 7.5 && pedido > 10;
      const exibirQtdPed = isPesadoQtdAlta || isUsoProdV;

      return {
        ...item,
        status,
        qtdPed: exibirQtdPed ? item.qtdPed : null,
        codBarra: null,
        referencia: null,
      };
    });

    return {
      conferenciaIniciada,
      itens: itensResposta,
      paginacao: false,
      camposSensiveis: verCamposSensiveis,
    };
  }

  /**
   * Busca todos os itens da nota via SQL com descrição e código de barras
   */
  private async buscarTodosItensDaNota(
    nuNota: number,
    correlationId?: string,
  ): Promise<ItemPedido[]> {
    const sql = `
      SELECT ITE.CODPROD, ITE.SEQUENCIA, ITE.QTDNEG, ITE.CONTROLE,
             PRO.DESCRPROD, PRO.REFERENCIA, BAR.CODBARRA,
             NVL(PRO.PESOBRUTO, NVL(PRO.PESOLIQ, 0)) AS PESO,
             PRO.USOPROD
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
      LEFT JOIN (
        SELECT CODPROD, MIN(CODBARRA) AS CODBARRA
        FROM TGFBAR
        GROUP BY CODPROD
      ) BAR ON BAR.CODPROD = ITE.CODPROD
      WHERE ITE.NUNOTA = ${nuNota}
      ORDER BY ITE.SEQUENCIA
    `;

    try {
      const response = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        {
          serviceName: 'DbExplorerSP.executeQuery',
          requestBody: { sql },
        },
        correlationId,
      );

      const rows: any[] = response.responseBody?.rows || [];

      return rows.map((row) => ({
        codProd: String(row[0]),
        sequencia: String(row[1]),
        qtdPed: String(row[2] || '0'),
        controle: row[3] || null,
        descrProd: row[4] || null,
        referencia: row[5] || null,
        codBarra: row[6] || null,
        peso: Number(row[7] || 0),
        usoProd: row[8] ? String(row[8]).trim() : null,
        qtdConf: '0',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Busca as divergências (qtdConf por CODPROD) via ConferenciaSP.
   * Retorna null se a chamada falhar — o caller trata como "sem qtdConf".
   */
  private async buscarDivergencias(
    nuNota: number,
    correlationId?: string,
  ): Promise<{ conferenciaIniciada: boolean; qtdConfMap: Map<string, string> } | null> {
    try {
      const response = await this.gateway.serviceCall<any>(
        'ConferenciaSP.listarItensPedido',
        {
          serviceName: 'ConferenciaSP.listarItensPedido',
          requestBody: {
            params: { nuNota },
            ...CONFERENCIA_CLIENT_EVENTS,
          },
        },
        correlationId,
        'mgecom',
      );

      const body = response.responseBody;
      const conferenciaIniciada = body?.DIVERGENCIAS?.CONFERENCIA_INICIADA === 'true';
      const produtos = body?.DIVERGENCIAS?.PRODUTO || [];
      const lista = Array.isArray(produtos) ? produtos : [produtos];

      const qtdConfMap = new Map<string, string>();
      for (const p of lista) {
        const codProd = p.CODPROD?.$ || '';
        const qtdConf = p.QTDCONF?.$ || '0';
        if (codProd) qtdConfMap.set(codProd, qtdConf);
      }

      return { conferenciaIniciada, qtdConfMap };
    } catch {
      return null;
    }
  }
}
