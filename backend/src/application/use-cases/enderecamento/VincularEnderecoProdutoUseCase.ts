import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IEnderecamentoRepository } from '../../../domain/ports/IEnderecamentoRepository.js';
import { TipoEnderecoWMS } from '../../../domain/entities/Enderecamento.js';

export interface VincularEnderecoProdutoInput {
  codprod: number;
  codigoEndereco: string; // CODEND, Máscara ou Descrição
  controle?: string | null;
  tipoEndereco?: TipoEnderecoWMS;
  usuario: string;
  motivo?: string;
}

export interface VincularEnderecoProdutoOutput {
  sucesso: boolean;
  mensagem: string;
  codend: number;
  endereco: string;
  descrend?: string | null;
  tipo: TipoEnderecoWMS;
}

export class VincularEnderecoProdutoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly enderecamentoRepo: IEnderecamentoRepository,
  ) {}

  async execute(input: VincularEnderecoProdutoInput): Promise<VincularEnderecoProdutoOutput> {
    const { codprod, codigoEndereco, controle, tipoEndereco, usuario, motivo } = input;

    if (!codprod) {
      throw new Error('Código do produto é obrigatório.');
    }
    if (!codigoEndereco || !codigoEndereco.trim()) {
      throw new Error('Endereço é obrigatório.');
    }
    if (!usuario) {
      throw new Error('Usuário é obrigatório.');
    }

    // 1. Buscar produto no Sankhya
    const sqlProd = `
SELECT CODPROD, DESCRPROD, NVL(CODVOL, 'UN') AS CODVOL
FROM TGFPRO
WHERE CODPROD = ${codprod}
    `.trim();

    const respProd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlProd } },
      randomUUID(),
    );
    const rowProd = respProd?.responseBody?.rows?.[0];
    if (!rowProd) {
      throw new Error(`Produto ${codprod} não encontrado no Sankhya ERP.`);
    }
    const descrprod = String(rowProd[1] || '').trim();
    const codvol = String(rowProd[2] || 'UN').trim();

    // 2. Localizar e validar o endereço em TGWEND
    const termo = codigoEndereco.trim().toUpperCase();
    const termoSemZero = termo.replace(/^0+/, '');
    const termoLimpo = termo.replace(/[._]/g, '');

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
    TO_CHAR(CODEND) = '${termo}'
    OR TO_CHAR(CODEND) = '${termoSemZero}'
    OR UPPER(TRIM(ENDERECO)) = '${termo}'
    OR REPLACE(REPLACE(UPPER(TRIM(ENDERECO)), '.', ''), '_', '') = '${termoLimpo}'
    OR UPPER(TRIM(DESCREND)) = '${termo}'
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
    const ehPickingCadastro = String(rowEnd[3] || 'N').trim().toUpperCase() === 'S';
    
    // Se o usuário especificou 'PICKING' ou o cadastro do endereço já é PICKING
    const ehPicking = tipoEndereco ? tipoEndereco === 'PICKING' : ehPickingCadastro;
    const tipoFinal: TipoEnderecoWMS = ehPicking ? 'PICKING' : 'PULMAO';

    const ctrl = controle && controle.trim() ? controle.trim().toUpperCase() : ' ';
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    const dtFormatadaSankhya = `${dd}/${mm}/${yyyy}`;

    // 3. Regra de Picking Único: Se for picking, inativar qualquer picking ativo anterior do mesmo produto
    let pickingAnteriorCodend: number | null = null;
    let pickingAnteriorEnd: string | null = null;

    if (ehPicking) {
      try {
        const sqlBuscaPicking = `
SELECT EXP.CODEND, END.ENDERECO
FROM TGWEXP EXP
JOIN TGWEND END ON END.CODEND = EXP.CODEND
WHERE EXP.CODPROD = ${codprod}
  AND NVL(TRIM(EXP.CONTROLE), ' ') = '${ctrl}'
  AND EXP.ATIVO = 'S'
  AND NVL(END.PICKING, 'N') = 'S'
  AND EXP.CODEND != ${codend}
        `.trim();

        const respPick = await this.gateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlBuscaPicking } },
          randomUUID(),
        );

        const rowsPick: any[] = respPick?.responseBody?.rows || [];
        for (const rP of rowsPick) {
          pickingAnteriorCodend = Number(rP[0]);
          pickingAnteriorEnd = String(rP[1] || '').trim();

          const datasetInact = {
            serviceName: 'DatasetSP.save',
            requestBody: {
              entityName: 'ProdutoEndereco',
              standAlone: false,
              fields: ['CODEND', 'CODPROD', 'CONTROLE', 'ATIVO', 'DTFIM'],
              records: [
                {
                  pk: {
                    CODEND: String(pickingAnteriorCodend),
                    CODPROD: String(codprod),
                    CONTROLE: ctrl,
                  },
                  values: {
                    '0': String(pickingAnteriorCodend),
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
        }
      } catch (errInat: any) {
        console.warn('[VincularEndereco] Aviso ao inativar picking anterior:', errInat.message);
      }
    }

    // 4. Salvar / Ativar o novo endereço em TGWEXP
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

    // 5. Gravar no Histórico Local
    await this.enderecamentoRepo.salvarHistorico({
      id: randomUUID(),
      codprod,
      descrprod,
      controle: ctrl,
      tipoAcao: ehPicking && pickingAnteriorCodend ? 'DEFINIR_PICKING' : 'VINCULAR',
      codendOrigem: pickingAnteriorCodend,
      enderecoOrigem: pickingAnteriorEnd,
      tipoOrigem: pickingAnteriorCodend ? 'PICKING' : null,
      codendDestino: codend,
      enderecoDestino: endereco,
      tipoDestino: tipoFinal,
      motivo: motivo || (ehPicking && pickingAnteriorCodend ? 'Substituição de Picking' : 'Vinculação de Endereço'),
      usuario,
      criadoEm: new Date().toISOString(),
    });

    return {
      sucesso: true,
      mensagem: ehPicking
        ? `Produto ${codprod} vinculado com sucesso como PICKING em '${endereco}'!`
        : `Produto ${codprod} vinculado com sucesso ao pulmão '${endereco}'!`,
      codend,
      endereco,
      descrend,
      tipo: tipoFinal,
    };
  }
}
