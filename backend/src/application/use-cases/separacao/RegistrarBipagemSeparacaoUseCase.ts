import { randomUUID } from 'node:crypto';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import {
  SeparacaoBipagem,
  SeparacaoItem,
} from '../../../domain/entities/Separacao.js';

export interface RegistrarBipagemSeparacaoInput {
  separacaoId: string;
  codigoBarras: string;
  quantidade: number;
  lote?: string;
  usuario: string;
  nunotaFiltro?: number;
}

export interface RegistrarBipagemSeparacaoOutput {
  sucesso: boolean;
  mensagem: string;
  itemAtualizado: SeparacaoItem;
  bipagem: SeparacaoBipagem;
  concluidoProduto: boolean;
}

export class RegistrarBipagemSeparacaoUseCase {
  constructor(
    private readonly separacaoRepo: ISeparacaoRepository,
    private readonly configSistemaRepo?: IConfiguracaoSistemaRepository,
    private readonly gateway?: IGatewayPort,
  ) {}

  async execute(input: RegistrarBipagemSeparacaoInput): Promise<RegistrarBipagemSeparacaoOutput> {
    const { separacaoId, codigoBarras, quantidade, lote, usuario, nunotaFiltro } = input;

    if (!codigoBarras || codigoBarras.trim() === '') {
      throw new Error('Código de barras é obrigatório para bipagem.');
    }
    if (!quantidade || quantidade <= 0) {
      throw new Error('Quantidade bipada deve ser maior que zero.');
    }

    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }
    if (separacao.status !== 'EM_ANDAMENTO') {
      throw new Error(`Separação não está em andamento (status atual: ${separacao.status}).`);
    }

    const itens = await this.separacaoRepo.listarItens(separacaoId);
    const termo = codigoBarras.trim().toUpperCase();
    const termoSemZero = termo.replace(/^0+/, '');

    // 1. Localizar itens compatíveis com o código informado
    // Pode corresponder por codbarra (isolando o código do fator textual se houver), referencia ou codprod
    const extrairCodigosBarra = (str?: string | null): string[] => {
      if (!str) return [];
      return str
        .split(',')
        .map((b) => b.trim().split(' ')[0].toUpperCase())
        .filter(Boolean);
    };

    const itensCandidatos = itens.filter((i) => {
      if (i.statusItem === 'REMOVIDO_ERP') return false;
      const barrasLista = extrairCodigosBarra(i.codbarra);
      const matchBarra =
        barrasLista.includes(termo) ||
        barrasLista.some((cb) => cb.replace(/^0+/, '') === termoSemZero);
      const matchRef = i.referencia && i.referencia.toUpperCase() === termo;
      const matchCod = String(i.codprod) === termo;
      return matchBarra || matchRef || matchCod;
    });

    if (itensCandidatos.length === 0) {
      throw new Error(`Produto com código/código de barras '${termo}' não pertence a esta Ordem de Carga.`);
    }

    // 2. Verificar se a configuração do sistema exige lote
    let exigirLote = false;
    if (this.configSistemaRepo) {
      const param = await this.configSistemaRepo.obterParametro('separacao_exigir_lote');
      exigirLote = param === 'true';
    }

    // Se estiver filtrando por um pedido específico (modo "Por Pedido")
    let itemAlvo: SeparacaoItem | undefined;

    if (nunotaFiltro) {
      itemAlvo = itensCandidatos.find(
        (i) => i.nunota === nunotaFiltro && i.qtdSeparada < i.qtdEsperada
      );
      if (!itemAlvo) {
        itemAlvo = itensCandidatos.find((i) => i.nunota === nunotaFiltro);
      }
    }

    // Se não encontrou no pedido filtrado ou está no modo "Consolidado"
    if (!itemAlvo) {
      // Priorizar o item que ainda possui saldo pendente
      itemAlvo = itensCandidatos.find((i) => i.qtdSeparada < i.qtdEsperada);
    }

    const qtdEsperadaTotal = Number(
      itensCandidatos.reduce((acc, i) => acc + i.qtdEsperada, 0).toFixed(4)
    );
    const qtdSeparadaTotalAtual = Number(
      itensCandidatos.reduce((acc, i) => acc + i.qtdSeparada, 0).toFixed(4)
    );
    const saldoPendenteTotal = Number(
      Math.max(0, qtdEsperadaTotal - qtdSeparadaTotalAtual).toFixed(4)
    );

    // Se todos os pedidos da carga já atingiram a quantidade esperada deste produto
    if (saldoPendenteTotal <= 0 || !itemAlvo) {
      const primeiro = itensCandidatos[0];
      throw new Error(
        `O produto '${primeiro.codprod} - ${primeiro.descrprod}' já atingiu a quantidade total esperada na carga (${qtdEsperadaTotal} UN). Bipagem excedente bloqueada.`
      );
    }

    // 3. Validação de Lote se exigido
    if (exigirLote && itemAlvo.controle && itemAlvo.controle.trim() !== '') {
      if (!lote || lote.trim() === '') {
        throw new Error(
          `Este produto exige controle de lote reservado no pedido (${itemAlvo.controle}). Informe o lote correspondente.`
        );
      }
      if (lote.trim().toUpperCase() !== itemAlvo.controle.trim().toUpperCase()) {
        throw new Error(
          `Lote informado '${lote}' diverge do lote reservado no pedido Sankhya ('${itemAlvo.controle}').`
        );
      }
    }

    // 4. Regra de Multiplicação/Divisão de Unidade Alternativa (TGFVOA)
    let fator = 1;
    let embalagemTexto = '';

    // A) Primeiro, tentar extrair a regra diretamente da descrição de barras gravada no item
    // Formato gerado pelo sistema: "7891234567890 (CX x12)" ou "(FD /2)"
    if (itemAlvo.codbarra) {
      const pedacos = itemAlvo.codbarra.split(',').map((p) => p.trim());
      for (const pedaco of pedacos) {
        const codigoPuro = pedaco.split(' ')[0].toUpperCase();
        if (codigoPuro === termo || codigoPuro.replace(/^0+/, '') === termoSemZero) {
          const matchMultiplica = pedaco.match(/\((.*?)\s*x\s*([0-9.,]+)\)/i);
          const matchDivide = pedaco.match(/\((.*?)\s*\/\s*([0-9.,]+)\)/i);
          if (matchMultiplica) {
            const vol = matchMultiplica[1].trim();
            const q = parseFloat(matchMultiplica[2].replace(',', '.'));
            if (q > 0) {
              fator = q;
              embalagemTexto = `${vol ? vol + ' ' : ''}x${q}`;
            }
          } else if (matchDivide) {
            const vol = matchDivide[1].trim();
            const q = parseFloat(matchDivide[2].replace(',', '.'));
            if (q > 0) {
              fator = 1 / q;
              embalagemTexto = `${vol ? vol + ' ' : ''}/${q}`;
            }
          }
          break;
        }
      }
    }

    // B) Se não encontrou fator > 1 no texto e tiver acesso ao Gateway Sankhya,
    // consultar TGFVOA / TGFBAR em tempo real para obter a regra oficial mais atualizada
    if (this.gateway && termo !== String(itemAlvo.codprod)) {
      try {
        const sqlVoa = `
SELECT 
    NVL(DIVIDEMULTIPLICA, 'M') AS DIVIDEMULTIPLICA, 
    NVL(QUANTIDADE, 1) AS QUANTIDADE, 
    NVL(CODVOL, 'VOL') AS CODVOL
FROM (
    SELECT VOA.DIVIDEMULTIPLICA, VOA.QUANTIDADE, VOA.CODVOL, VOA.CODBARRA
    FROM TGFVOA VOA
    WHERE VOA.CODPROD = ${itemAlvo.codprod}
      AND VOA.CODBARRA IS NOT NULL
    UNION ALL
    SELECT VOA.DIVIDEMULTIPLICA, VOA.QUANTIDADE, BAR.CODVOL, BAR.CODBARRA
    FROM TGFBAR BAR
    JOIN TGFVOA VOA ON VOA.CODPROD = BAR.CODPROD AND VOA.CODVOL = BAR.CODVOL
    WHERE BAR.CODPROD = ${itemAlvo.codprod}
      AND BAR.CODBARRA IS NOT NULL
)
WHERE (
    UPPER(TRIM(CODBARRA)) = '${termo}'
    OR LTRIM(CODBARRA, '0') = '${termoSemZero}'
)
        `.trim();

        const respVoa = await this.gateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          {
            serviceName: 'DbExplorerSP.executeQuery',
            requestBody: { sql: sqlVoa },
          },
          randomUUID(),
        );

        const rowsVoa: any[] = respVoa?.responseBody?.rows || [];
        if (rowsVoa.length > 0) {
          const divMul = String(rowsVoa[0][0] || 'M').trim().toUpperCase();
          const qtdVoa = Number(rowsVoa[0][1] || 1);
          const volVoa = String(rowsVoa[0][2] || 'VOL').trim();
          if (qtdVoa > 0) {
            fator = divMul === 'D' ? 1 / qtdVoa : qtdVoa;
            embalagemTexto = `${volVoa} ${divMul === 'D' ? '/' : 'x'}${qtdVoa}`;
          }
        }
      } catch (err: any) {
        console.warn('[RegistrarBipagemSeparacao] Falha ao consultar TGFVOA no ERP, mantendo fator padrão:', err.message);
      }
    }

    // Quantidade efetiva a somar nas unidades base do produto
    const qtdBase = quantidade > 0 ? quantidade : 1;
    const qtdEfetiva = Number((qtdBase * fator).toFixed(4));

    // 5. Validar se a quantidade bipada não ultrapassa o saldo pendente total do produto na carga
    if (qtdEfetiva > saldoPendenteTotal) {
      const infoFator = embalagemTexto && fator !== 1 ? ` (${qtdEfetiva} UN via ${embalagemTexto})` : '';
      throw new Error(
        `Quantidade bipada${infoFator} excede o saldo pendente do produto na carga (${saldoPendenteTotal} UN). Bipagem excedente bloqueada.`
      );
    }

    // 6. Distribuir a quantidade bipada entre os pedidos que possuem saldo pendente
    // Se nunotaFiltro foi especificado, prioriza esse pedido
    const filaItens = nunotaFiltro
      ? [
          ...itensCandidatos.filter((i) => i.nunota === nunotaFiltro && i.qtdSeparada < i.qtdEsperada),
          ...itensCandidatos.filter((i) => i.nunota !== nunotaFiltro && i.qtdSeparada < i.qtdEsperada),
        ]
      : itensCandidatos.filter((i) => i.qtdSeparada < i.qtdEsperada);

    let qtdRestanteParaDistribuir = qtdEfetiva;
    const agora = new Date().toISOString();
    let ultimoItemAtualizado: SeparacaoItem = filaItens[0] || itemAlvo;
    let ultimaBipagemRegistrada: SeparacaoBipagem | null = null;

    for (const item of filaItens) {
      if (qtdRestanteParaDistribuir <= 0) break;
      const saldoItem = Number(Math.max(0, item.qtdEsperada - item.qtdSeparada).toFixed(4));
      if (saldoItem <= 0) continue;

      const qtdParaItem = Number(Math.min(saldoItem, qtdRestanteParaDistribuir).toFixed(4));
      const novaQtdSeparada = Number((item.qtdSeparada + qtdParaItem).toFixed(4));
      const novoStatus = novaQtdSeparada >= item.qtdEsperada ? 'SEPARADO' : 'PARCIAL';

      await this.separacaoRepo.atualizarItem(item.id, {
        qtdSeparada: novaQtdSeparada,
        statusItem: novoStatus,
        controle: lote || item.controle,
      });

      const bipagem: SeparacaoBipagem = {
        id: randomUUID(),
        separacaoId,
        itemId: item.id,
        nunota: item.nunota,
        codprod: item.codprod,
        codbarra: termo,
        quantidade: qtdParaItem,
        lote: lote || null,
        usuario,
        timestamp: agora,
        anulado: 0,
      };

      await this.separacaoRepo.registrarBipagem(bipagem);
      ultimaBipagemRegistrada = bipagem;

      ultimoItemAtualizado = {
        ...item,
        qtdSeparada: novaQtdSeparada,
        statusItem: novoStatus,
        controle: lote || item.controle,
        atualizadoEm: agora,
      };

      qtdRestanteParaDistribuir = Number((qtdRestanteParaDistribuir - qtdParaItem).toFixed(4));
    }

    const novoSaldoPendenteTotal = Number(
      Math.max(0, saldoPendenteTotal - qtdEfetiva).toFixed(4)
    );
    const concluidoProduto = novoSaldoPendenteTotal <= 0;
    const detalheConversao = embalagemTexto && fator !== 1
      ? ` (+${qtdEfetiva} UN via ${qtdBase} ${embalagemTexto})`
      : ` (+${qtdEfetiva} UN)`;

    const novaQtdSeparadaConsolidada = Number(
      (qtdSeparadaTotalAtual + qtdEfetiva).toFixed(4)
    );

    const mensagem = concluidoProduto
      ? `Produto ${itemAlvo.codprod} concluído com sucesso${detalheConversao}!`
      : `Bipagem registrada${detalheConversao}. Saldo: ${novaQtdSeparadaConsolidada}/${qtdEsperadaTotal} UN.`;

    return {
      sucesso: true,
      mensagem,
      itemAtualizado: ultimoItemAtualizado,
      bipagem: ultimaBipagemRegistrada || {
        id: randomUUID(),
        separacaoId,
        itemId: itemAlvo.id,
        nunota: itemAlvo.nunota,
        codprod: itemAlvo.codprod,
        codbarra: termo,
        quantidade: qtdEfetiva,
        lote: lote || null,
        usuario,
        timestamp: agora,
        anulado: 0,
      },
      concluidoProduto,
    };
  }
}
