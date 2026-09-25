import { Request, Response } from 'express';
import { GetConferenciaSaidaUseCase } from '../../../application/use-cases/conferencias/consulta/GetConferenciaSaidaUseCase.js';
import { ListarItensPedidoUseCase } from '../../../application/use-cases/conferencias/consulta/ListarItensPedidoUseCase.js';
import { ListarItensConferidosUseCase } from '../../../application/use-cases/conferencias/consulta/ListarItensConferidosUseCase.js';
import { GetProdutoUseCase } from '../../../application/use-cases/conferencias/consulta/GetProdutoUseCase.js';
import { GetProdutosDivergentesUseCase } from '../../../application/use-cases/conferencias/consulta/GetProdutosDivergentesUseCase.js';
import { VerificarExcluidosUseCase } from '../../../application/use-cases/conferencias/consulta/VerificarExcluidosUseCase.js';
import { SalvarItemConferidoUseCase } from '../../../application/use-cases/conferencias/operacao/SalvarItemConferidoUseCase.js';
import { SalvarVolumeUseCase } from '../../../application/use-cases/conferencias/operacao/SalvarVolumeUseCase.js';
import { IniciarConferenciaUseCase } from '../../../application/use-cases/conferencias/ciclo-vida/IniciarConferenciaUseCase.js';
import { ExcluirConferenciaUseCase } from '../../../application/use-cases/conferencias/ciclo-vida/ExcluirConferenciaUseCase.js';
import { FinalizarConferenciaUseCase } from '../../../application/use-cases/conferencias/ciclo-vida/FinalizarConferenciaUseCase.js';
import { CortarNotaUseCase } from '../../../application/use-cases/conferencias/ciclo-vida/CortarNotaUseCase.js';
import { ExcluirItemConferidoUseCase } from '../../../application/use-cases/conferencias/operacao/ExcluirItemConferidoUseCase.js';

/**
 * Controller de Conferências
 * Agrupa todos os endpoints do fluxo de conferência de saída
 */
export class ConferenciasController {
  constructor(
    private readonly getConferenciaSaidaUseCase: GetConferenciaSaidaUseCase,
    private readonly iniciarConferenciaUseCase: IniciarConferenciaUseCase,
    private readonly excluirConferenciaUseCase: ExcluirConferenciaUseCase,
    private readonly listarItensPedidoUseCase: ListarItensPedidoUseCase,
    private readonly listarItensConferidosUseCase: ListarItensConferidosUseCase,
    private readonly getProdutoUseCase: GetProdutoUseCase,
    private readonly salvarItemConferidoUseCase: SalvarItemConferidoUseCase,
    private readonly getProdutosDivergentesUseCase: GetProdutosDivergentesUseCase,
    private readonly salvarVolumeUseCase: SalvarVolumeUseCase,
    private readonly finalizarConferenciaUseCase: FinalizarConferenciaUseCase,
    private readonly cortarNotaUseCase: CortarNotaUseCase,
    private readonly verificarExcluidosUseCase: VerificarExcluidosUseCase,
    private readonly excluirItemConferidoUseCase: ExcluirItemConferidoUseCase,
  ) {}

  /** GET /conferencias — Lista pedidos pendentes de conferência */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getConferenciaSaidaUseCase.execute(req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/verificar-excluidos — Verifica se nota tem apenas excluídos */
  async verificarExcluidos(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota } = req.body;
      if (!nuNota) { res.status(400).json({ error: 'nuNota é obrigatório' }); return; }

      const result = await this.verificarExcluidosUseCase.execute({ nuNota }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/iniciar — Inicia conferência */
  async iniciar(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota, iniciarRecontagem, codUsu, nomeUsu, mgeSession } = req.body;
      if (!nuNota) { res.status(400).json({ error: 'nuNota é obrigatório' }); return; }

      const result = await this.iniciarConferenciaUseCase.execute(
        { nuNota, iniciarRecontagem, codUsu, nomeUsu, mgeSession },
        req.correlationId,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/excluir — Exclui/cancela conferência */
  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota } = req.body;
      if (!nuNota) { res.status(400).json({ error: 'nuNota é obrigatório' }); return; }

      const result = await this.excluirConferenciaUseCase.execute({ nuNota }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/itens-pedido — Lista itens do pedido */
  async itensPedido(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota } = req.body;
      if (!nuNota) { res.status(400).json({ error: 'nuNota é obrigatório' }); return; }

      // req.username vem do JWT (authMiddleware) e decide se os campos
      // sensíveis vão na resposta. Não usar valor do body: seria burlável.
      const result = await this.listarItensPedidoUseCase.execute(
        { nuNota, usuario: req.username },
        req.correlationId,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/itens-conferidos — Lista itens já conferidos */
  async itensConferidos(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota, nuConf } = req.body;
      if (!nuConf) { res.status(400).json({ error: 'nuConf é obrigatório' }); return; }

      const result = await this.listarItensConferidosUseCase.execute({ nuNota, nuConf }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/produto — Busca produto por código de barras */
  async getProduto(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota, codBarra, controle } = req.body;
      if (!nuNota || !codBarra) { res.status(400).json({ error: 'nuNota e codBarra são obrigatórios' }); return; }

      const result = await this.getProdutoUseCase.execute({ nuNota, codBarra, controle }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/conferir-item — Confere um item e retorna os itens atualizados */
  async conferirItem(req: Request, res: Response): Promise<void> {
    try {
      const { numConf, nuNota, codBarra, controle, qtdConf, substituirProduto, volume, exigeIdentificadores, codUMA } = req.body;
      if (!numConf || !nuNota || !codBarra || !qtdConf) {
        res.status(400).json({ error: 'numConf, nuNota, codBarra e qtdConf são obrigatórios' });
        return;
      }

      const result = await this.salvarItemConferidoUseCase.execute(
        { numConf, nuNota, codBarra, controle, qtdConf, substituirProduto, volume, exigeIdentificadores, codUMA },
        req.correlationId,
      );

      const itensResult = await this.listarItensPedidoUseCase.execute(
        { nuNota, usuario: req.username },
        req.correlationId,
      );

      const itensConfResult = await this.listarItensConferidosUseCase.execute(
        { nuNota, nuConf: numConf },
        req.correlationId,
      );

      res.status(200).json({
        resultado: result.resultado,
        itens: itensResult.itens,
        itensConferidos: itensConfResult.itens,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/excluir-item-conferido — Exclui um item conferido e atualiza saldos */
  async excluirItemConferido(req: Request, res: Response): Promise<void> {
    try {
      const { nuConf, seqConf, nuNota } = req.body;
      if (!nuConf || !seqConf || !nuNota) {
        res.status(400).json({ error: 'nuConf, seqConf e nuNota são obrigatórios' });
        return;
      }

      await this.excluirItemConferidoUseCase.execute({ nuConf, seqConf }, req.correlationId);

      const itensResult = await this.listarItensPedidoUseCase.execute(
        { nuNota, usuario: req.username },
        req.correlationId,
      );

      const itensConfResult = await this.listarItensConferidosUseCase.execute(
        { nuNota, nuConf },
        req.correlationId,
      );

      res.status(200).json({
        sucesso: true,
        itens: itensResult.itens,
        itensConferidos: itensConfResult.itens,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/divergentes — Lista produtos divergentes */
  async divergentes(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota } = req.body;
      if (!nuNota) { res.status(400).json({ error: 'nuNota é obrigatório' }); return; }

      const result = await this.getProdutosDivergentesUseCase.execute({ nuNota }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/volume — Registra volume */
  async salvarVolume(req: Request, res: Response): Promise<void> {
    try {
      const { numConf, nuNota, volume } = req.body;
      if (!numConf || !nuNota || volume === undefined) {
        res.status(400).json({ error: 'numConf, nuNota e volume são obrigatórios' });
        return;
      }

      const result = await this.salvarVolumeUseCase.execute({ numConf, nuNota, volume }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/finalizar — Finaliza conferência */
  async finalizar(req: Request, res: Response): Promise<void> {
    try {
      const { nuConf, peso, qtdVol } = req.body;
      if (!nuConf) { res.status(400).json({ error: 'nuConf é obrigatório' }); return; }

      const result = await this.finalizarConferenciaUseCase.execute({ nuConf, peso, qtdVol }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** POST /conferencias/cortar — Corta nota por divergência */
  async cortar(req: Request, res: Response): Promise<void> {
    try {
      const { nuNota, peso, qtdVol } = req.body;
      if (!nuNota) { res.status(400).json({ error: 'nuNota é obrigatório' }); return; }

      const result = await this.cortarNotaUseCase.execute({ nuNota, peso, qtdVol }, req.correlationId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
