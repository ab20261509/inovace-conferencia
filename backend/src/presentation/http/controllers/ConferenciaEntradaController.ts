import { Request, Response } from 'express';
import { ListarNotasEntradaUseCase } from '../../../application/use-cases/recebimento/ListarNotasEntradaUseCase.js';
import { ObterItensConferenciaEntradaUseCase } from '../../../application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.js';
import { IniciarConferenciaEntradaUseCase } from '../../../application/use-cases/recebimento/IniciarConferenciaEntradaUseCase.js';
import { RegistrarBipagemEntradaUseCase } from '../../../application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.js';
import { AnularBipagemEntradaUseCase } from '../../../application/use-cases/recebimento/AnularBipagemEntradaUseCase.js';
import { FinalizarNivelEntradaUseCase } from '../../../application/use-cases/recebimento/FinalizarNivelEntradaUseCase.js';
import { ListarDivergenciasEntradaUseCase } from '../../../application/use-cases/recebimento/ListarDivergenciasEntradaUseCase.js';
import { ResolverDivergenciaUseCase } from '../../../application/use-cases/recebimento/ResolverDivergenciaUseCase.js';
import { ReiniciarConferenciaEntradaUseCase } from '../../../application/use-cases/recebimento/ReiniciarConferenciaEntradaUseCase.js';
import { EnviarConferenciaSankhyaUseCase } from '../../../application/use-cases/recebimento/EnviarConferenciaSankhyaUseCase.js';

export class ConferenciaEntradaController {
  constructor(
    private readonly listarNotasUseCase: ListarNotasEntradaUseCase,
    private readonly obterItensUseCase: ObterItensConferenciaEntradaUseCase,
    private readonly iniciarConferenciaUseCase: IniciarConferenciaEntradaUseCase,
    private readonly registrarBipagemUseCase: RegistrarBipagemEntradaUseCase,
    private readonly anularBipagemUseCase: AnularBipagemEntradaUseCase,
    private readonly finalizarNivelUseCase: FinalizarNivelEntradaUseCase,
    private readonly listarDivergenciasUseCase?: ListarDivergenciasEntradaUseCase,
    private readonly resolverDivergenciaUseCase?: ResolverDivergenciaUseCase,
    private readonly reiniciarConferenciaUseCase?: ReiniciarConferenciaEntradaUseCase,
    private readonly enviarSankhyaUseCase?: EnviarConferenciaSankhyaUseCase
  ) {}

  /** GET /api/recebimento/notas */
  async listarNotas(req: Request, res: Response): Promise<void> {
    try {
      const { numeroNota, fornecedor, status } = req.query;
      const notas = await this.listarNotasUseCase.execute(
        {
          numeroNota: numeroNota ? String(numeroNota) : undefined,
          fornecedor: fornecedor ? String(fornecedor) : undefined,
          statusConferencia: status ? String(status) : undefined,
        },
        req.correlationId
      );
      res.status(200).json(notas);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao listar notas de entrada.' });
    }
  }

  /** GET /api/recebimento/conferencia/:id/itens ou ?nunotas=1,2,3 */
  async obterItens(req: Request, res: Response): Promise<void> {
    try {
      const conferenciaId = req.params.id !== 'novo' ? req.params.id : undefined;
      const nunotasQuery = req.query.nunotas ? String(req.query.nunotas) : undefined;
      const nunotas = nunotasQuery ? nunotasQuery.split(',').map((n) => Number(n.trim())).filter(Boolean) : undefined;
      const usuario = (req as any).user?.username || (req as any).username || '';

      const resultado = await this.obterItensUseCase.execute(
        {
          conferenciaId,
          nunotas,
          usuario,
        },
        req.correlationId
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar itens da conferência.' });
    }
  }

  /** POST /api/recebimento/conferencia/iniciar */
  async iniciar(req: Request, res: Response): Promise<void> {
    try {
      const { nunotas, nivel } = req.body;
      const conferente = (req as any).user?.username || (req as any).username || 'Operador';

      const sessao = await this.iniciarConferenciaUseCase.execute({
        nunotas: Array.isArray(nunotas) ? nunotas.map(Number) : [],
        nivel: nivel !== undefined && nivel !== null ? Number(nivel) : undefined,
        conferente,
      });

      res.status(200).json(sessao);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao iniciar conferência.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/bipar */
  async bipar(req: Request, res: Response): Promise<void> {
    try {
      const conferenciaId = req.params.id;
      const { codigo, quantidade, nivel, lote, validade, fabricacao } = req.body;
      const conferente = (req as any).user?.username || (req as any).username || 'Operador';

      const resultado = await this.registrarBipagemUseCase.execute(
        {
          conferenciaId,
          codigo,
          quantidade: quantidade ? Number(quantidade) : 1,
          nivel: nivel ? Number(nivel) : undefined,
          conferente,
          lote,
          validade,
          fabricacao,
        },
        req.correlationId
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao registrar bipagem.' });
    }
  }

  /** PUT /api/recebimento/conferencia/bipagens/:bipagemId/anular */
  async anularBipagem(req: Request, res: Response): Promise<void> {
    try {
      const { bipagemId } = req.params;
      await this.anularBipagemUseCase.execute(bipagemId);
      res.status(200).json({ success: true, message: 'Bipagem anulada com sucesso.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao anular bipagem.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/finalizar */
  async finalizarNivel(req: Request, res: Response): Promise<void> {
    try {
      const conferenciaId = req.params.id;
      const { nivel } = req.body;

      const resultado = await this.finalizarNivelUseCase.execute(
        {
          conferenciaId,
          nivel: Number(nivel) || 1,
        },
        req.correlationId
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao finalizar conferência.' });
    }
  }

  /** GET /api/recebimento/gestao/divergencias */
  async listarDivergencias(req: Request, res: Response): Promise<void> {
    try {
      if (!this.listarDivergenciasUseCase) {
        res.status(501).json({ error: 'Funcionalidade não configurada no servidor.' });
        return;
      }
      const divergencias = await this.listarDivergenciasUseCase.execute(req.correlationId);
      res.status(200).json(divergencias);
    } catch (error: any) {
      console.error('❌ Erro em GET /api/recebimento/gestao/divergencias:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar divergências.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/resolver-divergencia */
  async resolverDivergencia(req: Request, res: Response): Promise<void> {
    try {
      if (!this.resolverDivergenciaUseCase) {
        res.status(501).json({ error: 'Funcionalidade não configurada no servidor.' });
        return;
      }
      const conferenciaId = req.params.id;
      const usuario = (req as any).user?.username || (req as any).username || 'Gestor';
      const { observacao } = req.body;

      const sessao = await this.resolverDivergenciaUseCase.execute({
        conferenciaId,
        usuario,
        observacao,
      });

      res.status(200).json({ success: true, sessao });
    } catch (error: any) {
      console.error('❌ Erro ao resolver divergência:', error);
      res.status(400).json({ error: error.message || 'Erro ao resolver divergência.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/reiniciar */
  async reiniciarConferencia(req: Request, res: Response): Promise<void> {
    try {
      if (!this.reiniciarConferenciaUseCase) {
        res.status(501).json({ error: 'Funcionalidade não configurada no servidor.' });
        return;
      }
      const conferenciaId = req.params.id;
      const usuario = (req as any).user?.username || (req as any).username || 'Gestor';
      const { motivo } = req.body;

      const sessao = await this.reiniciarConferenciaUseCase.execute({
        conferenciaId,
        usuario,
        motivo,
      });

      res.status(200).json({ success: true, sessao });
    } catch (error: any) {
      console.error('❌ Erro ao reiniciar conferência:', error);
      res.status(400).json({ error: error.message || 'Erro ao reiniciar conferência.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/enviar-sankhya */
  async enviarSankhya(req: Request, res: Response): Promise<void> {
    try {
      if (!this.enviarSankhyaUseCase) {
        res.status(501).json({ error: 'Funcionalidade não configurada no servidor.' });
        return;
      }
      const conferenciaId = req.params.id;
      const usuario = (req as any).user?.username || (req as any).username || 'Gestor';
      const { observacao, itensCustomizados } = req.body;

      const resultado = await this.enviarSankhyaUseCase.execute(
        {
          conferenciaId,
          usuario,
          observacao,
          itensCustomizados,
        },
        req.correlationId
      );

      res.status(200).json({ success: true, ...resultado });
    } catch (error: any) {
      console.error('❌ Erro ao enviar conferência para o Sankhya:', error);
      res.status(400).json({ error: error.message || 'Erro ao integrar com o Sankhya.' });
    }
  }
}
