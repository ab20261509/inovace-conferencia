import { Request, Response } from 'express';
import { IConfiguracaoSistemaRepository } from '../../../domain/ports/IConfiguracaoSistemaRepository.js';

export class ConfiguracaoSistemaController {
  constructor(private readonly configSistemaRepo: IConfiguracaoSistemaRepository) {}

  /**
   * GET /api/configuracoes/sistema
   * Retorna os parâmetros globais do sistema
   */
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parametros = await this.configSistemaRepo.listarParametros();
      res.status(200).json(parametros);
    } catch (err: any) {
      console.error('❌ Erro em /api/configuracoes/sistema:', err);
      res.status(500).json({ error: err.message || 'Erro ao listar parâmetros do sistema' });
    }
  }

  /**
   * PUT /api/configuracoes/sistema/:chave
   * Atualiza o valor de um parâmetro do sistema
   */
  async salvar(req: Request, res: Response): Promise<void> {
    try {
      const chave = String(req.params.chave || '').trim();
      const { valor, descricao } = req.body;

      if (!chave || valor === undefined) {
        res.status(400).json({ error: 'Chave e valor são obrigatórios.' });
        return;
      }

      await this.configSistemaRepo.salvarParametro(chave, String(valor), descricao);
      res.status(200).json({ success: true, chave, valor: String(valor) });
    } catch (err: any) {
      console.error('❌ Erro em PUT /api/configuracoes/sistema/:chave:', err);
      res.status(500).json({ error: err.message || 'Erro ao salvar parâmetro do sistema' });
    }
  }
}
