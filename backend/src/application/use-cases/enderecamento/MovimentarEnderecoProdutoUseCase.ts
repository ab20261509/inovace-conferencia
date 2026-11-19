import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IEnderecamentoRepository } from '../../../domain/ports/IEnderecamentoRepository.js';
import { TipoEnderecoWMS } from '../../../domain/entities/Enderecamento.js';

export interface MovimentarEnderecoProdutoInput {
  codprod: number;
  codendOrigem: number;
  codigoEnderecoDestino: string;
  controle?: string | null;
  usuario: string;
  motivo?: string;
}

export interface MovimentarEnderecoProdutoOutput {
  sucesso: boolean;
  mensagem: string;
  enderecoOrigem: string;
  enderecoDestino: string;
  codendDestino: number;
  tipoDestino: TipoEnderecoWMS;
}

export class MovimentarEnderecoProdutoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly enderecamentoRepo: IEnderecamentoRepository,
  ) {}

  async execute(input: MovimentarEnderecoProdutoInput): Promise<MovimentarEnderecoProdutoOutput> {
    const { codprod, codendOrigem, codigoEnderecoDestino, controle, usuario, motivo } = input;

    if (!codprod) throw new Error('Código do produto é obrigatório.');
    if (!codendOrigem) throw new Error('Endereço de origem é obrigatório.');
    if (!codigoEnderecoDestino || !codigoEnderecoDestino.trim()) {
      throw new Error('Endereço de destino é obrigatório.');
    }
    if (!usuario) throw new Error('Usuário é obrigatório.');

    // 1. Obter dados do produto
    const sqlProd = `SELECT CODPROD, DESCRPROD, NVL(CODVOL, 'UN') AS CODVOL FROM TGFPRO WHERE CODPROD = ${codprod}`;
    const respProd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlProd } },
      randomUUID(),
    );
    const rowProd = respProd?.responseBody?.rows?.[0];
    if (!rowProd) throw new Error(`Produto ${codprod} não encontrado.`);
    const descrprod = String(rowProd[1] || '').trim();
    const codvol = String(rowProd[2] || 'UN').trim();

    // 2. Obter dados da Origem
    const sqlOrigem = `
SELECT CODEND, ENDERECO, DESCREND, NVL(PICKING, 'N') AS PICKING
FROM TGWEND
WHERE CODEND = ${codendOrigem}
    `.trim();
    const respOrigem = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlOrigem } },
      randomUUID(),
    );
    const rowOrigem = respOrigem?.responseBody?.rows?.[0];
    const enderecoOrigem = rowOrigem ? String(rowOrigem[1] || codendOrigem).trim() : String(codendOrigem);
    const ehPickingOrigem = rowOrigem ? String(rowOrigem[3] || 'N').toUpperCase() === 'S' : false;
    const tipoOrigem: TipoEnderecoWMS = ehPickingOrigem ? 'PICKING' : 'PULMAO';

    // 3. Obter dados do Destino
    const termoDestino = codigoEnderecoDestino.trim().toUpperCase();
    const termoSemZero = termoDestino.replace(/^0+/, '');
    const termoLimpo = termoDestino.replace(/[._]/g, '');

    const sqlDestino = `
SELECT 
    CODEND, 
    ENDERECO, 
    DESCREND, 
    NVL(PICKING, 'N') AS PICKING,
    NVL(ATIVO, 'S') AS ATIVO
FROM TGWEND
WHERE ATIVO = 'S'
  AND (
    TO_CHAR(CODEND) = '${termoDestino}'
    OR TO_CHAR(CODEND) = '${termoSemZero}'
    OR UPPER(TRIM(ENDERECO)) = '${termoDestino}'
    OR REPLACE(REPLACE(UPPER(TRIM(ENDERECO)), '.', ''), '_', '') = '${termoLimpo}'
    OR UPPER(TRIM(DESCREND)) = '${termoDestino}'
  )
  AND ROWNUM = 1
    `.trim();

    const respDestino = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlDestino } },
      randomUUID(),
    );
    const rowDestino = respDestino?.responseBody?.rows?.[0];
    if (!rowDestino) {
      throw new Error(`Endereço de destino '${codigoEnderecoDestino}' não encontrado ou inativo.`);
    }

    const codendDestino = Number(rowDestino[0]);
    const enderecoDestino = String(rowDestino[1] || '').trim();
    const ehPickingDestino = String(rowDestino[3] || 'N').toUpperCase() === 'S';
    const tipoDestino: TipoEnderecoWMS = ehPickingDestino ? 'PICKING' : 'PULMAO';

    if (codendOrigem === codendDestino) {
      throw new Error('O endereço de destino não pode ser idêntico ao endereço de origem.');
    }

    const ctrl = controle && controle.trim() ? controle.trim().toUpperCase() : ' ';
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    const dtFormatadaSankhya = `${dd}/${mm}/${yyyy}`;

    // 4. Inativar Origem no Sankhya (TGWEXP)
    const datasetInactOrigem = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'ProdutoEndereco',
        standAlone: false,
        fields: ['CODEND', 'CODPROD', 'CONTROLE', 'ATIVO', 'DTFIM'],
        records: [
          {
            pk: {
              CODEND: String(codendOrigem),
              CODPROD: String(codprod),
              CONTROLE: ctrl,
            },
            values: {
              '0': String(codendOrigem),
              '1': String(codprod),
              '2': ctrl,
              '3': 'N',
              '4': dtFormatadaSankhya,
            },
          },
        ],
      },
    };
    await this.gateway.serviceCall<any>('DatasetSP.save', datasetInactOrigem, randomUUID());

    // 5. Se o destino for picking, inativar qualquer outro picking ativo
    if (ehPickingDestino) {
      try {
        const sqlBuscaOutroPick = `
SELECT EXP.CODEND
FROM TGWEXP EXP
JOIN TGWEND END ON END.CODEND = EXP.CODEND
WHERE EXP.CODPROD = ${codprod}
  AND NVL(TRIM(EXP.CONTROLE), ' ') = '${ctrl}'
  AND EXP.ATIVO = 'S'
  AND NVL(END.PICKING, 'N') = 'S'
  AND EXP.CODEND != ${codendDestino}
        `.trim();

        const respOutroPick = await this.gateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlBuscaOutroPick } },
          randomUUID(),
        );

        const rowsOutroPick: any[] = respOutroPick?.responseBody?.rows || [];
        for (const rP of rowsOutroPick) {
          const codOutro = String(rP[0]);
          await this.gateway.serviceCall<any>(
            'DatasetSP.save',
            {
              serviceName: 'DatasetSP.save',
              requestBody: {
                entityName: 'ProdutoEndereco',
                standAlone: false,
                fields: ['CODEND', 'CODPROD', 'CONTROLE', 'ATIVO', 'DTFIM'],
                records: [
                  {
                    pk: { CODEND: codOutro, CODPROD: String(codprod), CONTROLE: ctrl },
                    values: { '0': codOutro, '1': String(codprod), '2': ctrl, '3': 'N', '4': dtFormatadaSankhya },
                  },
                ],
              },
            },
            randomUUID(),
          );
        }
      } catch (errPick: any) {
        console.warn('[MovimentarEndereco] Aviso ao inativar picking concorrente:', errPick.message);
      }
    }

    // 6. Ativar Destino no Sankhya (TGWEXP)
    const datasetSaveDestino = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'ProdutoEndereco',
        standAlone: false,
        fields: ['CODEND', 'CODPROD', 'CONTROLE', 'CODVOL', 'ATIVO', 'DTINICIO', 'DTFIM'],
        records: [
          {
            pk: {
              CODEND: String(codendDestino),
              CODPROD: String(codprod),
              CONTROLE: ctrl,
            },
            values: {
              '0': String(codendDestino),
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
    await this.gateway.serviceCall<any>('DatasetSP.save', datasetSaveDestino, randomUUID());

    // 7. Gravar no Histórico Local
    await this.enderecamentoRepo.salvarHistorico({
      id: randomUUID(),
      codprod,
      descrprod,
      controle: ctrl,
      tipoAcao: 'MOVER',
      codendOrigem,
      enderecoOrigem,
      tipoOrigem,
      codendDestino,
      enderecoDestino,
      tipoDestino,
      motivo: motivo || 'Movimentação entre endereços',
      usuario,
      criadoEm: new Date().toISOString(),
    });

    return {
      sucesso: true,
      mensagem: `Produto ${codprod} movido com sucesso de '${enderecoOrigem}' para '${enderecoDestino}'!`,
      enderecoOrigem,
      enderecoDestino,
      codendDestino,
      tipoDestino,
    };
  }
}
