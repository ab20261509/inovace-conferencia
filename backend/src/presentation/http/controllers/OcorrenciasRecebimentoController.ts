import { Request, Response } from 'express';
import { RegistrarOcorrenciaEntradaUseCase } from '../../../application/use-cases/recebimento/RegistrarOcorrenciaEntradaUseCase.js';
import { ListarOcorrenciasEntradaUseCase } from '../../../application/use-cases/recebimento/ListarOcorrenciasEntradaUseCase.js';
import { AtualizarOcorrenciaEntradaUseCase } from '../../../application/use-cases/recebimento/AtualizarOcorrenciaEntradaUseCase.js';
import { RemoverOcorrenciaEntradaUseCase } from '../../../application/use-cases/recebimento/RemoverOcorrenciaEntradaUseCase.js';
import { BuscarProdutoTGFPROUseCase } from '../../../application/use-cases/recebimento/BuscarProdutoTGFPROUseCase.js';
import { BuscarProdutoInternetUseCase } from '../../../application/use-cases/recebimento/BuscarProdutoInternetUseCase.js';
import { ListarLocaisSankhyaUseCase } from '../../../application/use-cases/recebimento/ListarLocaisSankhyaUseCase.js';
import { DiscordWebhookAdapter } from '../../../infrastructure/discord/DiscordWebhookAdapter.js';

export class OcorrenciasRecebimentoController {
  constructor(
    private readonly registrarUseCase: RegistrarOcorrenciaEntradaUseCase,
    private readonly listarUseCase: ListarOcorrenciasEntradaUseCase,
    private readonly atualizarUseCase: AtualizarOcorrenciaEntradaUseCase,
    private readonly removerUseCase: RemoverOcorrenciaEntradaUseCase,
    private readonly buscarProdutoUseCase: BuscarProdutoTGFPROUseCase,
    private readonly buscarInternetUseCase: BuscarProdutoInternetUseCase,
    private readonly listarLocaisUseCase: ListarLocaisSankhyaUseCase,
    private readonly discordAdapter?: DiscordWebhookAdapter
  ) {}

  /** POST /api/recebimento/ocorrencias */
  async registrar(req: Request, res: Response): Promise<void> {
    try {
      const usuario = req.username || (req as any).user?.username || (req as any).username || '';
      const input = {
        ...req.body,
        criadoPor: req.body.criadoPor || usuario,
      };

      const resultado = await this.registrarUseCase.execute(input);
      res.status(201).json(resultado);
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.registrar] Erro:', error);
      res.status(400).json({ error: error.message || 'Erro ao registrar ocorrência.' });
    }
  }

  /** GET /api/recebimento/ocorrencias */
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const { conferenciaId, nunota, tipo, status } = req.query;
      const resultado = await this.listarUseCase.execute({
        conferenciaId: conferenciaId ? String(conferenciaId) : undefined,
        nunota: nunota ? Number(nunota) : undefined,
        tipo: tipo ? String(tipo) : undefined,
        status: status ? String(status) : undefined,
      });

      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.listar] Erro:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar ocorrências.' });
    }
  }

  /** PUT /api/recebimento/ocorrencias/:id */
  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.atualizarUseCase.execute({
        id,
        ...req.body,
      });

      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.atualizar] Erro:', error);
      res.status(400).json({ error: error.message || 'Erro ao atualizar ocorrência.' });
    }
  }

  /** DELETE /api/recebimento/ocorrencias/:id */
  async remover(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.removerUseCase.execute(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.remover] Erro:', error);
      res.status(400).json({ error: error.message || 'Erro ao remover ocorrência.' });
    }
  }

  /** GET /api/recebimento/produtos/catalogo?termo=XYZ */
  async buscarCatalogo(req: Request, res: Response): Promise<void> {
    try {
      const termo = String(req.query.termo || '');
      const resultado = await this.buscarProdutoUseCase.execute(termo, req.correlationId);
      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.buscarCatalogo] Erro:', error);
      res.status(500).json({ error: error.message || 'Erro ao consultar catálogo de produtos.' });
    }
  }

  /** GET /api/recebimento/produtos/buscar-internet?codbarra=XYZ */
  async buscarInternet(req: Request, res: Response): Promise<void> {
    try {
      const codbarra = String(req.query.codbarra || '');
      const resultado = await this.buscarInternetUseCase.execute(codbarra);
      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.buscarInternet] Erro:', error);
      res.status(500).json({ error: error.message || 'Erro ao consultar produto na internet.' });
    }
  }

  /** GET /api/recebimento/locais-estoque */
  async listarLocais(req: Request, res: Response): Promise<void> {
    try {
      const resultado = await this.listarLocaisUseCase.execute(req.correlationId);
      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.listarLocais] Erro:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar locais de estoque.' });
    }
  }

  /** POST /api/recebimento/ocorrencias/notificar-discord */
  async notificarDiscord(req: Request, res: Response): Promise<void> {
    try {
      if (!this.discordAdapter) {
        throw new Error('Serviço de notificação do Discord não configurado.');
      }

      const { nunota, numnota, razaosocial, ocorrencias, usuario } = req.body;
      if (!ocorrencias || !Array.isArray(ocorrencias) || ocorrencias.length === 0) {
        throw new Error('Nenhuma ocorrência informada para notificar.');
      }

      const usuarioEnvio = usuario || req.username || 'Sistema';
      const tituloNota = numnota ? `NF ${numnota} (#${nunota})` : `NF #${nunota}`;
      const fornecedor = razaosocial ? ` - ${razaosocial}` : '';

      const linhasOcorrencias = ocorrencias.map((oc: any, idx: number) => {
        const itemStr = oc.descrprod ? `**${oc.descrprod}** (Cód: ${oc.codprod || 'N/D'})` : `Item #${oc.codprod || 'N/D'}`;
        const loteStr = oc.lote ? ` • Lote: \`${oc.lote}\`` : '';
        const qtdStr = `Qtd: **${oc.quantidade}**`;
        const localDestino = oc.codlocalDestino ? ` • Local ERP: **${oc.codlocalDestino}**` : '';
        const fotosStr = oc.fotos && oc.fotos.length > 0 ? ` • 📷 ${oc.fotos.length} foto(s)` : '';
        const motivoStr = oc.motivo ? `\n> *Motivo:* ${oc.motivo}` : '';

        return `${idx + 1}. [**${oc.tipo}**] ${itemStr} - ${qtdStr}${loteStr}${localDestino}${fotosStr}${motivoStr}`;
      });

      const payload = {
        content: `🚨 **Relatório de Ocorrências no Recebimento de Mercadorias**\nNota Fiscal: **${tituloNota}**${fornecedor}\nResponsável: \`${usuarioEnvio}\``,
        embeds: [
          {
            title: `Resumo de Divergências e Avarias - ${tituloNota}`,
            description: linhasOcorrencias.join('\n\n').slice(0, 4000),
            color: 0xef4444, // Vermelho de atenção
            timestamp: new Date().toISOString(),
            footer: {
              text: `ConferCheck Recebimento • Total de ocorrências: ${ocorrencias.length}`,
            },
          },
        ],
      };

      await this.discordAdapter.send(payload);

      res.status(200).json({ sucesso: true, mensagem: 'Notificação enviada ao Discord com sucesso!' });
    } catch (error: any) {
      console.error('[OcorrenciasRecebimentoController.notificarDiscord] Erro:', error);
      res.status(400).json({ error: error.message || 'Erro ao disparar webhook do Discord.' });
    }
  }
}
