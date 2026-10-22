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
import { ListarTodasConferenciasEntradaUseCase } from '../../../application/use-cases/recebimento/ListarTodasConferenciasEntradaUseCase.js';
import { SolicitarRecontagemEntradaUseCase } from '../../../application/use-cases/recebimento/SolicitarRecontagemEntradaUseCase.js';
import { RecuperarContagemReiniciadaUseCase } from '../../../application/use-cases/recebimento/RecuperarContagemReiniciadaUseCase.js';
import { SincronizarDesmembramentoNotaUseCase } from '../../../application/use-cases/recebimento/SincronizarDesmembramentoNotaUseCase.js';
import { ExecutarDesmembramentoItemUseCase } from '../../../application/use-cases/recebimento/ExecutarDesmembramentoItemUseCase.js';
import { AlterarLocalItemNotaUseCase } from '../../../application/use-cases/recebimento/AlterarLocalItemNotaUseCase.js';
import { RegistrarOcorrenciaSobraUseCase } from '../../../application/use-cases/recebimento/RegistrarOcorrenciaSobraUseCase.js';

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
    private readonly enviarSankhyaUseCase?: EnviarConferenciaSankhyaUseCase,
    private readonly listarTodasUseCase?: ListarTodasConferenciasEntradaUseCase,
    private readonly solicitarRecontagemUseCase?: SolicitarRecontagemEntradaUseCase,
    private readonly recuperarContagemUseCase?: RecuperarContagemReiniciadaUseCase,
    private readonly sincronizarDesmembramentoUseCase?: SincronizarDesmembramentoNotaUseCase,
    private readonly executarDesmembramentoUseCase?: ExecutarDesmembramentoItemUseCase,
    private readonly alterarLocalItemUseCase?: AlterarLocalItemNotaUseCase,
    private readonly registrarOcorrenciaSobraUseCase?: RegistrarOcorrenciaSobraUseCase
  ) {}

  /** GET /api/recebimento/notas */
  async listarNotas(req: Request, res: Response): Promise<void> {
    try {
      const { numeroNota, fornecedor, status } = req.query;
      const usuario = req.username || (req as any).user?.username || (req as any).username || '';
      const codUsu = Number(req.userId || (req as any).user?.userId || 0);
      const notas = await this.listarNotasUseCase.execute(
        {
          numeroNota: numeroNota ? String(numeroNota) : undefined,
          fornecedor: fornecedor ? String(fornecedor) : undefined,
          statusConferencia: status ? String(status) : undefined,
          usuario,
          codUsu,
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
      const usuario = req.username || (req as any).user?.username || (req as any).username || '';
      const origem = req.query.origem ? (String(req.query.origem) as 'coletor' | 'gestao') : undefined;

      const resultado = await this.obterItensUseCase.execute(
        {
          conferenciaId,
          nunotas,
          usuario,
          origem,
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
      const { codigo, quantidade, nivel, lote, validade, fabricacao, nunota } = req.body;
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
          nunota: nunota ? Number(nunota) : undefined,
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
      const { acao, observacao, nunota, decisoesFiscais } = req.body;

      const sessao = await this.resolverDivergenciaUseCase.execute({
        conferenciaId,
        nunota: nunota ? Number(nunota) : undefined,
        usuario,
        acao,
        observacao,
        decisoesFiscais,
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
      const { motivo, nunota } = req.body;

      const sessao = await this.reiniciarConferenciaUseCase.execute({
        conferenciaId,
        usuario,
        motivo,
        nunota: nunota ? Number(nunota) : undefined,
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
      const { observacao, itensCustomizados, nivelEscolhido, nunotas } = req.body;

      const resultado = await this.enviarSankhyaUseCase.execute(
        {
          conferenciaId,
          nunotas: Array.isArray(nunotas) ? nunotas.map(Number) : undefined,
          usuario,
          observacao,
          itensCustomizados,
          nivelEscolhido: nivelEscolhido ? Number(nivelEscolhido) : undefined,
        },
        req.correlationId
      );

      res.status(200).json({ success: true, ...resultado });
    } catch (error: any) {
      console.error('❌ Erro ao enviar conferência para o Sankhya:', error);
      res.status(400).json({ error: error.message || 'Erro ao integrar com o Sankhya.' });
    }
  }

  /** GET /api/recebimento/conferencias — Visão geral de todas as conferências */
  async listarTodas(req: Request, res: Response): Promise<void> {
    try {
      if (!this.listarTodasUseCase) {
        res.status(501).json({ error: 'Funcionalidade não configurada no servidor.' });
        return;
      }
      const conferencias = await this.listarTodasUseCase.execute(req.correlationId);
      res.status(200).json(conferencias);
    } catch (error: any) {
      console.error('❌ Erro ao listar todas as conferências:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar conferências.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/recontar — Solicitar recontagem N1/N2/N3 */
  async solicitarRecontagem(req: Request, res: Response): Promise<void> {
    try {
      if (!this.solicitarRecontagemUseCase) {
        res.status(501).json({ error: 'Funcionalidade não configurada no servidor.' });
        return;
      }
      const conferenciaId = req.params.id;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'Gestor';
      const { nivel, motivo, itens } = req.body;

      const sessao = await this.solicitarRecontagemUseCase.execute({
        conferenciaId,
        nivel: Number(nivel) || 2,
        usuario,
        motivo,
        itens,
      });

      res.status(200).json({ success: true, sessao });
    } catch (error: any) {
      console.error('❌ Erro ao solicitar recontagem:', error);
      res.status(400).json({ error: error.message || 'Erro ao solicitar recontagem.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/recuperar — Restaurar contagem reiniciada */
  async recuperarContagem(req: Request, res: Response): Promise<void> {
    try {
      if (!this.recuperarContagemUseCase) {
        res.status(501).json({ error: 'Funcionalidade não configurada no servidor.' });
        return;
      }
      const conferenciaId = req.params.id;
      const usuario = req.username || (req as any).user?.username || (req as any).username || 'Gestor';
      const { motivo, backupConferenciaId } = req.body;

      const sessao = await this.recuperarContagemUseCase.execute({
        conferenciaId,
        backupConferenciaId,
        usuario,
        motivo,
      });

      res.status(200).json({ success: true, sessao });
    } catch (error: any) {
      console.error('❌ Erro ao recuperar contagem reiniciada:', error);
      res.status(400).json({ error: error.message || 'Erro ao recuperar contagem reiniciada.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/sincronizar-desmembramento */
  async sincronizarDesmembramento(req: Request, res: Response): Promise<void> {
    try {
      if (!this.sincronizarDesmembramentoUseCase) {
        res.status(501).json({ error: 'Funcionalidade de sincronização de desmembramento não configurada.' });
        return;
      }
      const conferenciaId = req.params.id;
      const { nunota, codprod, sequencia } = req.body;

      if (!nunota) {
        res.status(400).json({ error: 'nunota é obrigatório para sincronizar desmembramento.' });
        return;
      }

      const resultado = await this.sincronizarDesmembramentoUseCase.execute(
        {
          conferenciaId,
          nunota: Number(nunota),
          codprod: codprod ? Number(codprod) : undefined,
          sequencia: sequencia ? Number(sequencia) : undefined,
        },
        req.correlationId
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('❌ Erro ao sincronizar desmembramento com o Sankhya:', error);
      res.status(400).json({ error: error.message || 'Erro ao sincronizar desmembramento com o Sankhya.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/desmembrar-item */
  async desmembrarItem(req: Request, res: Response): Promise<void> {
    try {
      if (!this.executarDesmembramentoUseCase) {
        res.status(501).json({ error: 'Funcionalidade de execução de desmembramento não configurada.' });
        return;
      }
      const conferenciaId = req.params.id;
      const { nunota, sequencia, lotes } = req.body;

      if (!nunota || !sequencia || !Array.isArray(lotes) || lotes.length === 0) {
        res.status(400).json({ error: 'nunota, sequencia e a lista de lotes são obrigatórios.' });
        return;
      }

      const resultado = await this.executarDesmembramentoUseCase.execute(
        {
          conferenciaId,
          nunota: Number(nunota),
          sequencia: Number(sequencia),
          lotes,
        },
        req.correlationId
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('❌ Erro ao desmembrar item no Sankhya:', error);
      res.status(400).json({ error: error.message || 'Erro ao desmembrar item no Sankhya.' });
    }
  }

  /** PUT /api/recebimento/conferencia/item/local */
  async alterarLocalItem(req: Request, res: Response): Promise<void> {
    try {
      if (!this.alterarLocalItemUseCase) {
        res.status(501).json({ error: 'Funcionalidade de alteração de local não configurada.' });
        return;
      }
      const { nunota, sequencia, codlocal, conferenciaId } = req.body;

      if (!nunota || !sequencia || codlocal === undefined || codlocal === null) {
        res.status(400).json({ error: 'nunota, sequencia e codlocal são obrigatórios.' });
        return;
      }

      const resultado = await this.alterarLocalItemUseCase.execute(
        {
          nunota: Number(nunota),
          sequencia: Number(sequencia),
          codlocal: Number(codlocal),
          conferenciaId,
        },
        req.correlationId
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('❌ Erro ao alterar local do item no Sankhya:', error);
      res.status(400).json({ error: error.message || 'Erro ao alterar local do item.' });
    }
  }

  /** POST /api/recebimento/conferencia/:id/ocorrencia-sobra */
  async registrarOcorrenciaSobra(req: Request, res: Response): Promise<void> {
    try {
      if (!this.registrarOcorrenciaSobraUseCase) {
        res.status(501).json({ error: 'Funcionalidade de registro de ocorrência de sobra não configurada.' });
        return;
      }

      const { id } = req.params;
      const {
        nunota,
        numnota,
        sequencia,
        codprod,
        descrprod,
        quantidadeSobra,
        lote,
        validade,
        fabricacao,
        motivo,
        codlocalDestino,
        fotos,
      } = req.body;

      if (!nunota || !codprod || !quantidadeSobra) {
        res.status(400).json({ error: 'nunota, codprod e quantidadeSobra são obrigatórios.' });
        return;
      }

      const usuario = req.username || (req as any).user?.username || (req as any).username || 'GESTOR';

      const resultado = await this.registrarOcorrenciaSobraUseCase.execute(
        {
          conferenciaId: id,
          nunota: Number(nunota),
          numnota: numnota ? Number(numnota) : undefined,
          sequencia: sequencia ? Number(sequencia) : undefined,
          codprod: Number(codprod),
          descrprod,
          quantidadeSobra: Number(quantidadeSobra),
          lote,
          validade,
          fabricacao,
          motivo,
          codlocalDestino: codlocalDestino ? Number(codlocalDestino) : undefined,
          fotos,
          usuario,
        },
        req.correlationId
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('❌ Erro ao registrar ocorrência de sobra e abater contagem:', error);
      res.status(400).json({ error: error.message || 'Erro ao registrar ocorrência de sobra.' });
    }
  }
}


