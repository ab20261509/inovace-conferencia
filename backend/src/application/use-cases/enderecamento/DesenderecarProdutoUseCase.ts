import { randomUUID } from 'node:crypto';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IEnderecamentoRepository } from '../../../domain/ports/IEnderecamentoRepository.js';
import { TipoEnderecoWMS } from '../../../domain/entities/Enderecamento.js';

export interface DesenderecarProdutoInput {
  codprod: number;
  codend: number;
  controle?: string | null;
  usuario: string;
  motivo?: string;
}

export interface DesenderecarProdutoOutput {
  sucesso: boolean;
  mensagem: string;
  endereco: string;
}

export class DesenderecarProdutoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly enderecamentoRepo: IEnderecamentoRepository,
  ) {}

  async execute(input: DesenderecarProdutoInput): Promise<DesenderecarProdutoOutput> {
    const { codprod, codend, controle, usuario, motivo } = input;

    if (!codprod) throw new Error('Código do produto é obrigatório.');
    if (!codend) throw new Error('Endereço é obrigatório.');
    if (!usuario) throw new Error('Usuário é obrigatório.');

    // 1. Obter dados do produto
    const sqlProd = `SELECT CODPROD, DESCRPROD FROM TGFPRO WHERE CODPROD = ${codprod}`;
    const respProd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlProd } },
      randomUUID(),
    );
    const rowProd = respProd?.responseBody?.rows?.[0];
    const descrprod = rowProd ? String(rowProd[1] || '').trim() : null;

    // 2. Obter dados do Endereço
    const sqlEnd = `SELECT CODEND, ENDERECO, NVL(PICKING, 'N') AS PICKING FROM TGWEND WHERE CODEND = ${codend}`;
    const respEnd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlEnd } },
      randomUUID(),
    );
    const rowEnd = respEnd?.responseBody?.rows?.[0];
    const endereco = rowEnd ? String(rowEnd[1] || codend).trim() : String(codend);
    const ehPicking = rowEnd ? String(rowEnd[2] || 'N').toUpperCase() === 'S' : false;
    const tipoEnd: TipoEnderecoWMS = ehPicking ? 'PICKING' : 'PULMAO';

    const ctrl = controle && controle.trim() ? controle.trim().toUpperCase() : ' ';
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    const dtFormatadaSankhya = `${dd}/${mm}/${yyyy}`;

    // 3. Inativar em TGWEXP no Sankhya ERP
    const datasetInact = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'ProdutoEndereco',
        standAlone: false,
        fields: ['CODEND', 'CODPROD', 'CONTROLE', 'ATIVO', 'DTFIM'],
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
              '3': 'N',
              '4': dtFormatadaSankhya,
            },
          },
        ],
      },
    };
    await this.gateway.serviceCall<any>('DatasetSP.save', datasetInact, randomUUID());

    // 4. Gravar no Histórico Local
    await this.enderecamentoRepo.salvarHistorico({
      id: randomUUID(),
      codprod,
      descrprod,
      controle: ctrl,
      tipoAcao: 'RETIRAR',
      codendOrigem: codend,
      enderecoOrigem: endereco,
      tipoOrigem: tipoEnd,
      codendDestino: null,
      enderecoDestino: null,
      tipoDestino: null,
      motivo: motivo || 'Retirada / Desendereçamento físico',
      usuario,
      criadoEm: new Date().toISOString(),
    });

    return {
      sucesso: true,
      mensagem: `Produto ${codprod} retirado com sucesso do endereço '${endereco}'!`,
      endereco,
    };
  }
}
