import { randomUUID } from 'node:crypto';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { SeparacaoItem } from '../../../domain/entities/Separacao.js';

export interface AtualizarEnderecoProdutoInput {
  separacaoId: string;
  codprod: number;
  codigoEndereco: string; // Pode ser código reduzido (ex: "5"), máscara ("01.01.01.01.01") ou descrição
  controle?: string | null;
  usuario: string;
}

export interface AtualizarEnderecoProdutoOutput {
  sucesso: boolean;
  mensagem: string;
  codend: number;
  endereco: string;
  descrend: string;
  tipoEndereco: 'PICKING' | 'PULMAO';
  itensAtualizados: SeparacaoItem[];
}

export class AtualizarEnderecoProdutoUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly separacaoRepo: ISeparacaoRepository,
  ) {}

  async execute(input: AtualizarEnderecoProdutoInput): Promise<AtualizarEnderecoProdutoOutput> {
    const { separacaoId, codprod, codigoEndereco, controle, usuario } = input;

    if (!codigoEndereco || codigoEndereco.trim() === '') {
      throw new Error('Código do endereço é obrigatório para localização.');
    }

    const separacao = await this.separacaoRepo.buscarPorId(separacaoId);
    if (!separacao) {
      throw new Error(`Sessão de separação '${separacaoId}' não encontrada.`);
    }

    const termo = codigoEndereco.trim().toUpperCase();
    const termoSemZero = termo.replace(/^0+/, '');

    // 1. Validar e localizar o endereço na tabela TGWEND do Sankhya
    const sqlBuscaEnd = `
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
    OR REPLACE(REPLACE(UPPER(TRIM(ENDERECO)), '.', ''), '_', '') = '${termo.replace(/[._]/g, '')}'
    OR UPPER(TRIM(DESCREND)) = '${termo}'
  )
  AND ROWNUM = 1
    `.trim();

    const respEnd = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql: sqlBuscaEnd },
      },
      randomUUID(),
    );

    const rowsEnd: any[] = respEnd?.responseBody?.rows || [];
    if (rowsEnd.length === 0) {
      throw new Error(`Endereço '${codigoEndereco}' não encontrado ou inativo no cadastro WMS (TGWEND).`);
    }

    const rowEnd = rowsEnd[0];
    const codend = Number(rowEnd[0]);
    const endereco = String(rowEnd[1] || '').trim();
    const descrend = String(rowEnd[2] || '').trim();
    const ehPicking = String(rowEnd[3] || 'N').trim().toUpperCase() === 'S';
    const tipoEndereco: 'PICKING' | 'PULMAO' = ehPicking ? 'PICKING' : 'PULMAO';

    // 2. Buscar itens da sessão para obter codvol e controle
    const itensSessao = await this.separacaoRepo.listarItens(separacaoId);
    const itensDoProduto = itensSessao.filter((i) => i.codprod === codprod);

    if (itensDoProduto.length === 0) {
      throw new Error(`Produto ${codprod} não encontrado nesta separação.`);
    }

    const primeiroItem = itensDoProduto[0];
    let codvol = primeiroItem.codvol;
    if (!codvol || codvol.trim() === '') {
      try {
        const respVol = await this.gateway.serviceCall<any>(
          'DbExplorerSP.executeQuery',
          {
            serviceName: 'DbExplorerSP.executeQuery',
            requestBody: { sql: `SELECT CODVOL FROM TGFPRO WHERE CODPROD = ${codprod}` },
          },
          randomUUID(),
        );
        codvol = String(respVol?.responseBody?.rows?.[0]?.[0] || 'UN').trim();
      } catch {
        codvol = 'UN';
      }
    }

    const ctrl = controle && controle.trim()
      ? controle.trim().toUpperCase()
      : (primeiroItem.controle && primeiroItem.controle.trim()
          ? primeiroItem.controle.trim().toUpperCase()
          : ' ');

    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    const dtFormatadaSankhya = `${dd}/${mm}/${yyyy}`;

    // 3. Ao alterar/substituir o endereço físico, inativar o endereço anterior do mesmo tipo no Sankhya ERP
    try {
      const sqlBuscaAtivos = `
SELECT EXP.CODEND
FROM TGWEXP EXP
JOIN TGWEND END ON END.CODEND = EXP.CODEND
WHERE EXP.CODPROD = ${codprod}
  AND NVL(TRIM(EXP.CONTROLE), ' ') = '${ctrl}'
  AND EXP.ATIVO = 'S'
  AND NVL(END.PICKING, 'N') = '${ehPicking ? 'S' : 'N'}'
  AND EXP.CODEND != ${codend}
      `.trim();

      const respAtivos = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        {
          serviceName: 'DbExplorerSP.executeQuery',
          requestBody: { sql: sqlBuscaAtivos },
        },
        randomUUID(),
      );

      const rowsAtivos: any[] = respAtivos?.responseBody?.rows || [];
      for (const rowA of rowsAtivos) {
        const codendAntigo = String(rowA[0]);
        const datasetInactivate = {
          serviceName: 'DatasetSP.save',
          requestBody: {
            entityName: 'ProdutoEndereco',
            standAlone: false,
            fields: ['CODEND', 'CODPROD', 'CONTROLE', 'ATIVO', 'DTFIM'],
            records: [
              {
                pk: {
                  CODEND: codendAntigo,
                  CODPROD: String(codprod),
                  CONTROLE: ctrl,
                },
                values: {
                  '0': codendAntigo,
                  '1': String(codprod),
                  '2': ctrl,
                  '3': 'N',
                  '4': dtFormatadaSankhya,
                },
              },
            ],
          },
        };

        await this.gateway.serviceCall<any>('DatasetSP.save', datasetInactivate, randomUUID());
      }
    } catch (errInat: any) {
      console.warn('[AtualizarEnderecoProduto] Aviso ao inativar endereço anterior em TGWEXP:', errInat.message);
    }

    // 4. Persistir/ativar o novo endereço na tabela nativa TGWEXP no Sankhya ERP via DatasetSP.save
    try {
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
                '3': String(codvol),
                '4': 'S',
                '5': dtFormatadaSankhya,
                '6': '',
              },
            },
          ],
        },
      };

      await this.gateway.serviceCall<any>(
        'DatasetSP.save',
        datasetSave,
        randomUUID(),
      );
    } catch (err: any) {
      console.error('[AtualizarEnderecoProduto] Erro ao gravar TGWEXP no ERP:', err.message);
      throw new Error(`Falha ao persistir endereço no Sankhya (TGWEXP): ${err.message}`);
    }

    // 4. Atualizar os itens correspondentes no snapshot local LibSQL
    const itensAtualizados: SeparacaoItem[] = [];

    for (const it of itensDoProduto) {
      const dadosUpdate: Partial<SeparacaoItem> = {};

      if (ehPicking) {
        dadosUpdate.codend = codend;
        dadosUpdate.endereco = endereco;
        dadosUpdate.descrend = descrend;
      } else {
        dadosUpdate.codendPulmao = codend;
        dadosUpdate.enderecoPulmao = endereco;
        dadosUpdate.descrendPulmao = descrend;
      }

      await this.separacaoRepo.atualizarItem(it.id, dadosUpdate);

      itensAtualizados.push({
        ...it,
        ...dadosUpdate,
        atualizadoEm: new Date().toISOString(),
      });
    }

    const mensagem = ehPicking
      ? `Endereço de Picking atualizado com sucesso: ${descrend} (${endereco}).`
      : `Endereço de Pulmão (Reserva) atualizado com sucesso: ${descrend} (${endereco}).`;

    return {
      sucesso: true,
      mensagem,
      codend,
      endereco,
      descrend,
      tipoEndereco,
      itensAtualizados,
    };
  }
}
