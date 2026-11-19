import { Request, Response } from 'express';
import { BuscarEnderecosProdutoUseCase } from '../../../application/use-cases/enderecamento/BuscarEnderecosProdutoUseCase.js';
import { BuscarProdutosPorEnderecoUseCase } from '../../../application/use-cases/enderecamento/BuscarProdutosPorEnderecoUseCase.js';
import { VincularEnderecoProdutoUseCase } from '../../../application/use-cases/enderecamento/VincularEnderecoProdutoUseCase.js';
import { MovimentarEnderecoProdutoUseCase } from '../../../application/use-cases/enderecamento/MovimentarEnderecoProdutoUseCase.js';
import { DesenderecarProdutoUseCase } from '../../../application/use-cases/enderecamento/DesenderecarProdutoUseCase.js';
import { ListarHistoricoEnderecamentoUseCase } from '../../../application/use-cases/enderecamento/ListarHistoricoEnderecamentoUseCase.js';
import { ListarEnderecosAnaliticoUseCase } from '../../../application/use-cases/enderecamento/ListarEnderecosAnaliticoUseCase.js';
import { CadastrarProdutoEnderecoUseCase } from '../../../application/use-cases/enderecamento/CadastrarProdutoEnderecoUseCase.js';

export class EnderecamentoController {
  constructor(
    private readonly buscarEnderecosProdutoUseCase: BuscarEnderecosProdutoUseCase,
    private readonly buscarProdutosPorEnderecoUseCase: BuscarProdutosPorEnderecoUseCase,
    private readonly vincularEnderecoProdutoUseCase: VincularEnderecoProdutoUseCase,
    private readonly movimentarEnderecoProdutoUseCase: MovimentarEnderecoProdutoUseCase,
    private readonly desenderecarProdutoUseCase: DesenderecarProdutoUseCase,
    private readonly listarHistoricoEnderecamentoUseCase: ListarHistoricoEnderecamentoUseCase,
    private readonly listarEnderecosAnaliticoUseCase: ListarEnderecosAnaliticoUseCase,
    private readonly cadastrarProdutoEnderecoUseCase: CadastrarProdutoEnderecoUseCase,
  ) {}

  async listarAnalitico(req: Request, res: Response): Promise<void> {
    try {
      const termo = req.query.termo ? String(req.query.termo) : undefined;
      const deposito = req.query.deposito ? String(req.query.deposito) : undefined;
      const rua = req.query.rua ? String(req.query.rua) : undefined;
      const torre = req.query.torre ? String(req.query.torre) : undefined;
      const nivel = req.query.nivel ? String(req.query.nivel) : undefined;
      const pos = req.query.pos ? String(req.query.pos) : undefined;
      const tipo = (req.query.tipo as any) || 'TODOS';
      const ocupacao = (req.query.ocupacao as any) || 'TODOS';
      const limite = req.query.limite ? Number(req.query.limite) : 100;

      const enderecos = await this.listarEnderecosAnaliticoUseCase.execute({
        termo,
        deposito,
        rua,
        torre,
        nivel,
        pos,
        tipo,
        ocupacao,
        limite,
      });

      res.json({ enderecos });
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao listar analítico de endereços:', err);
      res.status(500).json({ error: err.message || 'Erro ao listar analítico de endereços.' });
    }
  }

  async buscarPorProduto(req: Request, res: Response): Promise<void> {
    try {
      const termo = req.query.termo ? String(req.query.termo) : undefined;
      const codprodsRaw = req.query.codprods ? String(req.query.codprods) : undefined;
      const codprods = codprodsRaw
        ? codprodsRaw
            .split(',')
            .map((c) => Number(c.trim()))
            .filter((c) => !isNaN(c))
        : undefined;
      const limite = req.query.limite ? Number(req.query.limite) : 20;

      const produtos = await this.buscarEnderecosProdutoUseCase.execute({ termo, codprods, limite });
      res.json({ produtos });
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao buscar por produto:', err);
      res.status(500).json({ error: err.message || 'Erro ao buscar endereços do produto.' });
    }
  }

  async buscarPorEndereco(req: Request, res: Response): Promise<void> {
    try {
      const termo = String(req.query.termo || '');
      const endereco = await this.buscarProdutosPorEnderecoUseCase.execute({ termo });

      if (!endereco) {
        res.status(404).json({ error: `Endereço '${termo}' não localizado ou inativo.` });
        return;
      }

      res.json({ endereco });
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao buscar por endereço:', err);
      res.status(500).json({ error: err.message || 'Erro ao buscar produtos do endereço.' });
    }
  }

  async vincular(req: Request, res: Response): Promise<void> {
    try {
      const { codprod, codigoEndereco, controle, tipoEndereco, motivo } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.login || req.body.usuario || 'OPERADOR';

      const resultado = await this.vincularEnderecoProdutoUseCase.execute({
        codprod: Number(codprod),
        codigoEndereco: String(codigoEndereco),
        controle,
        tipoEndereco,
        motivo,
        usuario,
      });

      res.json(resultado);
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao vincular endereço:', err);
      res.status(400).json({ error: err.message || 'Erro ao vincular endereço.' });
    }
  }

  async cadastrar(req: Request, res: Response): Promise<void> {
    try {
      const { codigoEndereco, termoProduto, controle, confirmarSubstituicaoPicking, motivo } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.login || req.body.usuario || 'OPERADOR';

      const resultado = await this.cadastrarProdutoEnderecoUseCase.execute({
        codigoEndereco: String(codigoEndereco || ''),
        termoProduto: String(termoProduto || ''),
        controle,
        confirmarSubstituicaoPicking: Boolean(confirmarSubstituicaoPicking),
        motivo,
        usuario,
      });

      res.json(resultado);
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao cadastrar produto no endereço:', err);
      res.status(400).json({ error: err.message || 'Erro ao cadastrar produto no endereço.' });
    }
  }

  async movimentar(req: Request, res: Response): Promise<void> {
    try {
      const { codprod, codendOrigem, codigoEnderecoDestino, controle, motivo } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.login || req.body.usuario || 'OPERADOR';

      const resultado = await this.movimentarEnderecoProdutoUseCase.execute({
        codprod: Number(codprod),
        codendOrigem: Number(codendOrigem),
        codigoEnderecoDestino: String(codigoEnderecoDestino),
        controle,
        motivo,
        usuario,
      });

      res.json(resultado);
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao movimentar endereço:', err);
      res.status(400).json({ error: err.message || 'Erro ao movimentar endereço.' });
    }
  }

  async desenderecar(req: Request, res: Response): Promise<void> {
    try {
      const { codprod, codend, controle, motivo } = req.body;
      const usuario = (req as any).user?.nome || (req as any).user?.login || req.body.usuario || 'OPERADOR';

      const resultado = await this.desenderecarProdutoUseCase.execute({
        codprod: Number(codprod),
        codend: Number(codend),
        controle,
        motivo,
        usuario,
      });

      res.json(resultado);
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao desendereçar produto:', err);
      res.status(400).json({ error: err.message || 'Erro ao desendereçar produto.' });
    }
  }

  async historico(req: Request, res: Response): Promise<void> {
    try {
      const codprod = req.query.codprod ? Number(req.query.codprod) : undefined;
      const codend = req.query.codend ? Number(req.query.codend) : undefined;
      const tipoAcao = req.query.tipoAcao ? String(req.query.tipoAcao) : undefined;
      const usuario = req.query.usuario ? String(req.query.usuario) : undefined;
      const dataInicio = req.query.dataInicio ? String(req.query.dataInicio) : undefined;
      const dataFim = req.query.dataFim ? String(req.query.dataFim) : undefined;
      const limite = req.query.limite ? Number(req.query.limite) : 100;

      const registros = await this.listarHistoricoEnderecamentoUseCase.execute({
        codprod,
        codend,
        tipoAcao,
        usuario,
        dataInicio,
        dataFim,
        limite,
      });

      res.json({ historico: registros });
    } catch (err: any) {
      console.error('[EnderecamentoController] Erro ao listar histórico:', err);
      res.status(500).json({ error: err.message || 'Erro ao listar histórico de endereçamento.' });
    }
  }
}
