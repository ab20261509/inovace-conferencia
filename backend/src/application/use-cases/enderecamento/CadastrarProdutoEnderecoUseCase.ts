import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IEnderecamentoRepository } from '../../../domain/ports/IEnderecamentoRepository.js';
import { TipoEnderecoWMS } from '../../../domain/entities/Enderecamento.js';

export interface CadastrarProdutoEnderecoInput {
  codigoEndereco: string; // CODEND, Máscara (01.01.01.01.01) ou Descrição
  termoProduto: string;   // CODPROD ou Código de Barras (TGFBAR.CODBARRA)
  controle?: string | null;
  confirmarSubstituicaoPicking?: boolean;
  usuario: string;
  motivo?: string;
}

export interface CadastrarProdutoEnderecoOutput {
  status: 'SUCESSO' | 'JA_CADASTRADO' | 'EXIGE_CONFIRMACAO_PICKING';
  mensagem: string;
  produto: {
    codprod: number;
    descrprod: string;
    codbarra?: string | null;
    codvol: string;
    controle: string;
  };
  endereco: {
    codend: number;
    endereco: string;
    descrend?: string | null;
    tipo: TipoEnderecoWMS;
  };
  pickingAnterior?: {
    codend: number;
    endereco: string;
  } | null;
}

export class CadastrarProdutoEnderecoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly enderecamentoRepo: IEnderecamentoRepository,
  ) {}

  async execute(input: CadastrarProdutoEnderecoInput): Promise<CadastrarProdutoEnderecoOutput> {
    const {
      codigoEndereco,
      termoProduto,
      controle,
      confirmarSubstituicaoPicking = false,
      usuario,
      motivo,
    } = input;

    if (!codigoEndereco || !codigoEndereco.trim()) {
      throw new Error('Endereço é obrigatório.');
    }
    if (!termoProduto || !termoProduto.trim()) {
      throw new Error('Código do produto ou código de barras é obrigatório.');
    }
    if (!usuario) {
      throw new Error('Usuário é obrigatório.');
    }

    // 1. Localizar e validar o endereço em TGWEND
    const endTermo = codigoEndereco.trim().toUpperCase();
    const endSemZero = endTermo.replace(/^0+/, '');
    const endLimpo = endTermo.replace(/[._]/g, '');

    const sqlEnd = `
SELECT 
    CODEND, 
    ENDERECO, 
    DESCREND, 
    NVL(PICKING, 'N') AS PICKING,
    NVL(ATIVO, 'S') AS ATIVO
FROM TGWEND
WHERE ATIVO = 'S'
  AND (
    TO_CHAR(CODEND) = '${endTermo}'
    OR TO_CHAR(CODEND) = '${endSemZero}'
    OR UPPER(TRIM(ENDERECO)) = '${endTermo}'
    OR REPLACE(REPLACE(UPPER(TRIM(ENDERECO)), '.', ''), '_', '') = '${endLimpo}'
    OR UPPER(TRIM(DESCREND)) = '${endTermo}'
  )
  AND ROWNUM = 1
    `.trim();

    const respEnd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlEnd } },
      randomUUID(),
    );
    const rowEnd = respEnd?.responseBody?.rows?.[0];
    if (!rowEnd) {
      throw new Error(`Endereço '${codigoEndereco}' não encontrado ou inativo no cadastro WMS (TGWEND).`);
    }

    const codend = Number(rowEnd[0]);
    const endereco = String(rowEnd[1] || '').trim();
    const descrend = rowEnd[2] ? String(rowEnd[2]).trim() : null;
    const ehPicking = String(rowEnd[3] || 'N').trim().toUpperCase() === 'S';
    const tipoFinal: TipoEnderecoWMS = ehPicking ? 'PICKING' : 'PULMAO';

    // 2. Localizar o produto em TGFPRO e TGFBAR
    const prodTermo = termoProduto.trim();
    const ehNumero = /^\d+$/.test(prodTermo);

    let whereProd = '';
    if (ehNumero) {
      whereProd = `(PRO.CODPROD = ${prodTermo} OR EXISTS (SELECT 1 FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD AND BAR.CODBARRA = '${prodTermo}'))`;
    } else {
      whereProd = `EXISTS (SELECT 1 FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD AND BAR.CODBARRA = '${prodTermo}')`;
    }

    const sqlProd = `
SELECT 
    PRO.CODPROD,
    PRO.DESCRPROD,
    (SELECT MAX(BAR.CODBARRA) FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD) AS CODBARRA,
    NVL(PRO.CODVOL, 'UN') AS CODVOL
FROM TGFPRO PRO
WHERE PRO.ATIVO = 'S'
  AND ${whereProd}
  AND ROWNUM = 1
    `.trim();

    const respProd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlProd } },
      randomUUID(),
    );
    const rowProd = respProd?.responseBody?.rows?.[0];
    if (!rowProd) {
      throw new Error(`Produto não localizado para o termo '${termoProduto}'. Verifique o código ou código de barras.`);
    }

    const codprod = Number(rowProd[0]);
    const descrprod = String(rowProd[1] || '').trim();
    const codbarra = rowProd[2] ? String(rowProd[2]).trim() : null;
    const codvol = String(rowProd[3] || 'UN').trim();
    const ctrl = controle && controle.trim() ? controle.trim().toUpperCase() : ' ';

    const produtoInfo = {
      codprod,
      descrprod,
      codbarra,
      codvol,
      controle: ctrl,
    };

    const enderecoInfo = {
      codend,
      endereco,
      descrend,
      tipo: tipoFinal,
    };

    // 3. Verificar se o produto já está cadastrado e ATIVO neste mesmo endereço
    const sqlDuplicidade = `
SELECT COUNT(*) 
FROM TGWEXP
WHERE CODEND = ${codend}
  AND CODPROD = ${codprod}
  AND NVL(TRIM(CONTROLE), ' ') = '${ctrl}'
  AND ATIVO = 'S'
    `.trim();

    const respDup = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlDuplicidade } },
      randomUUID(),
    );
    const qtdDup = Number(respDup?.responseBody?.rows?.[0]?.[0] || 0);

    if (qtdDup > 0) {
      return {
        status: 'JA_CADASTRADO',
        mensagem: `Produto ${codprod} (${descrprod}) já está cadastrado e ativo no endereço '${endereco}'.`,
        produto: produtoInfo,
        endereco: enderecoInfo,
      };
    }

    // 4. Se for PICKING, verificar se o produto já possui outro picking ativo em outro endereço
    let pickingAnterior: { codend: number; endereco: string } | null = null;

    if (ehPicking) {
      const sqlBuscaPicking = `
SELECT EXP.CODEND, END.ENDERECO
FROM TGWEXP EXP
JOIN TGWEND END ON END.CODEND = EXP.CODEND
WHERE EXP.CODPROD = ${codprod}
  AND NVL(TRIM(EXP.CONTROLE), ' ') = '${ctrl}'
  AND EXP.ATIVO = 'S'
  AND NVL(END.PICKING, 'N') = 'S'
  AND EXP.CODEND != ${codend}
  AND ROWNUM = 1
      `.trim();

      const respPick = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlBuscaPicking } },
        randomUUID(),
      );
      const rowPick = respPick?.responseBody?.rows?.[0];

      if (rowPick) {
        pickingAnterior = {
          codend: Number(rowPick[0]),
          endereco: String(rowPick[1] || '').trim(),
        };

        // Se o operador ainda não confirmou expressamente a substituição do picking
        if (!confirmarSubstituicaoPicking) {
          return {
            status: 'EXIGE_CONFIRMACAO_PICKING',
            mensagem: `O produto ${codprod} já possui picking ativo no endereço '${pickingAnterior.endereco}'. Deseja transferir o picking para '${endereco}'?`,
            produto: produtoInfo,
            endereco: enderecoInfo,
            pickingAnterior,
          };
        }
      }
    }

    // Datas formatadas para o Sankhya ERP (DD/MM/YYYY)
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    const dtFormatadaSankhya = `${dd}/${mm}/${yyyy}`;

    // 5. Se havia picking anterior e foi confirmado, inativá-lo no ERP
    if (ehPicking && pickingAnterior && confirmarSubstituicaoPicking) {
      try {
        const datasetInact = {
          serviceName: 'DatasetSP.save',
          requestBody: {
            entityName: 'ProdutoEndereco',
            standAlone: false,
            fields: ['CODEND', 'CODPROD', 'CONTROLE', 'ATIVO', 'DTFIM'],
            records: [
              {
                pk: {
                  CODEND: String(pickingAnterior.codend),
                  CODPROD: String(codprod),
                  CONTROLE: ctrl,
                },
                values: {
                  '0': String(pickingAnterior.codend),
                  '1': String(codprod),
                  '2': ctrl,
                  '3': 'N',
                  '4': dtFormatadaSankhya,
                },
              },
            ],
          },
        };

        await this.gateway.serviceCall<any>('DatasetSP.save', datasetInact, randomUUID());
      } catch (errInat: any) {
        console.warn('[CadastrarProdutoEndereco] Falha ao inativar picking anterior:', errInat.message);
      }
    }

    // 6. Ativar / Gravar o novo vínculo em TGWEXP
    const datasetSave = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'ProdutoEndereco',
        standAlone: false,
        fields: ['CODEND', 'CODPROD', 'CONTROLE', 'CODVOL', 'ATIVO', 'DTINICIO', 'DTFIM'],
        records: [
          {
            pk: {
              CODEND: String(codend),
              CODPROD: String(codprod),
              CONTROLE: ctrl,
            },
            values: {
              '0': String(codend),
              '1': String(codprod),
              '2': ctrl,
              '3': codvol,
              '4': 'S',
              '5': dtFormatadaSankhya,
              '6': '',
            },
          },
        ],
      },
    };

    await this.gateway.serviceCall<any>('DatasetSP.save', datasetSave, randomUUID());

    // 7. Gravar na Auditoria Local
    await this.enderecamentoRepo.salvarHistorico({
      id: randomUUID(),
      codprod,
      descrprod,
      controle: ctrl,
      tipoAcao: ehPicking && pickingAnterior ? 'DEFINIR_PICKING' : 'VINCULAR',
      codendOrigem: pickingAnterior ? pickingAnterior.codend : null,
      enderecoOrigem: pickingAnterior ? pickingAnterior.endereco : null,
      tipoOrigem: pickingAnterior ? 'PICKING' : null,
      codendDestino: codend,
      enderecoDestino: endereco,
      tipoDestino: tipoFinal,
      motivo: motivo || (ehPicking && pickingAnterior ? 'Substituição de Picking via Coletor' : 'Cadastro no Endereço via Coletor'),
      usuario,
      criadoEm: new Date().toISOString(),
    });

    return {
      status: 'SUCESSO',
      mensagem: ehPicking
        ? `Produto ${codprod} vinculado com sucesso como PICKING em '${endereco}'!`
        : `Produto ${codprod} vinculado com sucesso ao pulmão '${endereco}'!`,
      produto: produtoInfo,
      endereco: enderecoInfo,
      pickingAnterior,
    };
  }
}
