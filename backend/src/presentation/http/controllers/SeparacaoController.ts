import { Request, Response } from 'express';
import { ListarCargasPendentesUseCase } from '../../../application/use-cases/separacao/ListarCargasPendentesUseCase.js';
import { IniciarSeparacaoUseCase } from '../../../application/use-cases/separacao/IniciarSeparacaoUseCase.js';
import { ObterSeparacaoUseCase } from '../../../application/use-cases/separacao/ObterSeparacaoUseCase.js';
import { SincronizarItensSeparacaoUseCase } from '../../../application/use-cases/separacao/SincronizarItensSeparacaoUseCase.js';
import { RegistrarBipagemSeparacaoUseCase } from '../../../application/use-cases/separacao/RegistrarBipagemSeparacaoUseCase.js';
import { AnularBipagemSeparacaoUseCase } from '../../../application/use-cases/separacao/AnularBipagemSeparacaoUseCase.js';
import { FinalizarSeparacaoUseCase } from '../../../application/use-cases/separacao/FinalizarSeparacaoUseCase.js';
import { AtualizarEnderecoProdutoUseCase } from '../../../application/use-cases/separacao/AtualizarEnderecoProdutoUseCase.js';
import { RegistrarFaltaItemUseCase } from '../../../application/use-cases/separacao/RegistrarFaltaItemUseCase.js';
import { ResolverFaltaSeparacaoUseCase } from '../../../application/use-cases/separacao/ResolverFaltaSeparacaoUseCase.js';
import { SolicitarReabastecimentoSeparacaoUseCase } from '../../../application/use-cases/separacao/SolicitarReabastecimentoSeparacaoUseCase.js';
import { ISeparacaoRepository } from '../../../domain/ports/ISeparacaoRepository.js';
import { limparErroSankhya } from '../utils/formatarErro.js';

export class SeparacaoController {
  constructor(
    private readonly listarCargasUseCase: ListarCargasPendentesUseCase,
    private readonly iniciarSeparacaoUseCase: IniciarSeparacaoUseCase,
    private readonly obterSeparacaoUseCase: ObterSeparacaoUseCase,
    private readonly sincronizarUseCase: SincronizarItensSeparacaoUseCase,
    private readonly registrarBipagemUseCase: RegistrarBipagemSeparacaoUseCase,
    private readonly anularBipagemUseCase: AnularBipagemSeparacaoUseCase,
    private readonly finalizarSeparacaoUseCase: FinalizarSeparacaoUseCase,
    private readonly separacaoRepo: ISeparacaoRepository,
    private readonly atualizarEnderecoUseCase?: AtualizarEnderecoProdutoUseCase,
    private readonly registrarFaltaUseCase?: RegistrarFaltaItemUseCase,
    private readonly resolverFaltaUseCase?: ResolverFaltaSeparacaoUseCase,
    private readonly solicitarReabastecimentoUseCase?: SolicitarReabastecimentoSeparacaoUseCase,
  ) {}

  /** GET /api/separacao/cargas */
  async listarCargas(req: Request, res: Response): Promise<void> {
    try {
      const filtroOrdem = req.query.ordemCarga ? Number(req.query.ordemCarga) : undefined;
      const cargas = await this.listarCargasUseCase.execute(filtroOrdem, req.correlationId);
      res.status(200).json(cargas);
    } catch (error: any) {
      res.status(500).json({ error: limparErroSankhya(error.message || 'Erro ao listar cargas pendentes.') });
    }
  }

  /** POST /api/separacao/iniciar */
  async iniciar(req: Request, res: Response): Promise<void> {
    try {
      const { ordemCarga } = req.body;
      if (!ordemCarga) {
        res.status(400).json({ error: 'Número da Ordem de Carga (ordemCarga) é obrigatório.' });
        return;
      }
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';
      const resultado = await this.iniciarSeparacaoUseCase.execute(
        {
          ordemCarga: Number(ordemCarga),
          usuario,
        },
        req.correlationId,
      );
      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: limparErroSankhya(error.message || 'Erro ao iniciar separação.') });
    }
  }

  /** GET /api/separacao/:id */
  async obter(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dados = await this.obterSeparacaoUseCase.execute(id);
      res.status(200).json(dados);
    } catch (error: any) {
      res.status(500).json({ error: limparErroSankhya(error.message || 'Erro ao buscar separação.') });
    }
  }

  /** POST /api/separacao/:id/sincronizar */
  async sincronizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.sincronizarUseCase.execute(id, req.correlationId);
      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: limparErroSankhya(error.message || 'Erro ao sincronizar com Sankhya.') });
    }
  }

  /** POST /api/separacao/:id/bipar */
  async bipar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { codigoBarras, quantidade, lote, nunotaFiltro } = req.body;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';

      const resultado = await this.registrarBipagemUseCase.execute({
        separacaoId: id,
        codigoBarras: String(codigoBarras || ''),
        quantidade: Number(quantidade || 1),
        lote: lote ? String(lote) : undefined,
        usuario,
        nunotaFiltro: nunotaFiltro ? Number(nunotaFiltro) : undefined,
      });

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao registrar bipagem na separação.' });
    }
  }

  /** POST /api/separacao/bipagem/:bipId/anular */
  async anularBipagem(req: Request, res: Response): Promise<void> {
    try {
      const { bipId } = req.params;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';
      const resultado = await this.anularBipagemUseCase.execute({ bipId, usuario });
      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao anular bipagem.' });
    }
  }

  /** POST /api/separacao/:id/finalizar */
  async finalizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permitirParcial, justificativa } = req.body;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';

      const resultado = await this.finalizarSeparacaoUseCase.execute(
        {
          separacaoId: id,
          usuario,
          permitirParcial: Boolean(permitirParcial),
          justificativa: justificativa ? String(justificativa) : undefined,
        },
        req.correlationId,
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao finalizar separação.' });
    }
  }

  /** GET /api/separacao/:id/bipagens */
  async listarBipagens(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bipagens = await this.separacaoRepo.listarBipagens(id);
      res.status(200).json(bipagens);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao listar bipagens da separação.' });
    }
  }

  /** POST /api/separacao/:id/endereco */
  async atualizarEndereco(req: Request, res: Response): Promise<void> {
    try {
      if (!this.atualizarEnderecoUseCase) {
        res.status(501).json({ error: 'Funcionalidade de atualização de endereço não configurada.' });
        return;
      }
      const { id } = req.params;
      const { codprod, codigoEndereco, controle } = req.body;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';

      const resultado = await this.atualizarEnderecoUseCase.execute({
        separacaoId: id,
        codprod: Number(codprod),
        codigoEndereco: String(codigoEndereco || ''),
        controle: controle ? String(controle) : undefined,
        usuario,
      });

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: limparErroSankhya(error.message || 'Erro ao atualizar endereço do produto.') });
    }
  }

  /** POST /api/separacao/:id/falta */
  async registrarFalta(req: Request, res: Response): Promise<void> {
    try {
      if (!this.registrarFaltaUseCase) {
        res.status(501).json({ error: 'Funcionalidade de registro de falta não configurada.' });
        return;
      }
      const { id } = req.params;
      const { codprod, motivoFalta, nunotaFiltro } = req.body;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';

      const resultado = await this.registrarFaltaUseCase.execute({
        separacaoId: id,
        codprod: Number(codprod),
        motivoFalta: String(motivoFalta || ''),
        usuario,
        nunotaFiltro: nunotaFiltro ? Number(nunotaFiltro) : undefined,
      });

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao registrar falta do produto.' });
    }
  }

  /** POST /api/separacao/:id/resolver-falta */
  async resolverFalta(req: Request, res: Response): Promise<void> {
    try {
      if (!this.resolverFaltaUseCase) {
        res.status(501).json({ error: 'Funcionalidade de resolução de falta não configurada.' });
        return;
      }
      const { id } = req.params;
      const { itemId, codprod, nunota, acao, quantidade, lote, observacao } = req.body;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';

      const resultado = await this.resolverFaltaUseCase.execute({
        separacaoId: id,
        itemId: itemId ? String(itemId) : undefined,
        codprod: codprod ? Number(codprod) : undefined,
        nunota: nunota ? Number(nunota) : undefined,
        acao,
        quantidade: quantidade !== undefined ? Number(quantidade) : undefined,
        lote: lote ? String(lote) : undefined,
        usuario,
        observacao: observacao ? String(observacao) : undefined,
      });

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao resolver falta do item.' });
    }
  }

  /** POST /api/separacao/:id/solicitar-reabastecimento */
  async solicitarReabastecimento(req: Request, res: Response): Promise<void> {
    try {
      if (!this.solicitarReabastecimentoUseCase) {
        res.status(501).json({ error: 'Funcionalidade de solicitação de reabastecimento não configurada.' });
        return;
      }
      const { id } = req.params;
      const { codprod, observacao } = req.body;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'OPERADOR';

      const resultado = await this.solicitarReabastecimentoUseCase.execute({
        separacaoId: id,
        usuario,
        codprod: codprod ? Number(codprod) : undefined,
        observacao: observacao ? String(observacao) : undefined,
      });

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao solicitar reabastecimento para empilhadeira.' });
    }
  }
}
