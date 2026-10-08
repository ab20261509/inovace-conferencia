import { Request, Response } from 'express';
import { IDatabaseExplorerRepository } from '../../../domain/ports/IDatabaseExplorerRepository.js';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { AcessoNegadoError } from '../../../domain/errors/AppError.js';

export class DatabaseExplorerController {
  constructor(
    private readonly explorerRepo: IDatabaseExplorerRepository,
    private readonly permissoesRepo: IPermissoesRepository,
  ) {}

  /**
   * Valida se o usuário autenticado possui o privilégio administrativo gerenciar_acessos
   */
  private async validarPermissaoAdmin(req: Request): Promise<string> {
    const codUsu = Number(req.userId || (req as any).user?.userId || 0);
    const nomeUsu = String(req.username || (req as any).user?.username || '').trim();

    const permissoes = await this.permissoesRepo.obterPermissoes(codUsu, nomeUsu);
    if (!permissoes.gerenciar_acessos) {
      throw new AcessoNegadoError('Acesso restrito ao gerenciador de banco de dados. Privilégio de administrador necessário.');
    }

    return nomeUsu || 'Admin';
  }

  async obterStatus(req: Request, res: Response): Promise<void> {
    try {
      await this.validarPermissaoAdmin(req);
      const status = await this.explorerRepo.obterStatus();
      res.status(200).json(status);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao obter status do banco' });
    }
  }

  async sincronizar(req: Request, res: Response): Promise<void> {
    try {
      await this.validarPermissaoAdmin(req);
      const resultado = await this.explorerRepo.sincronizar();
      res.status(200).json(resultado);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao sincronizar' });
    }
  }

  async obterDocumentacao(req: Request, res: Response): Promise<void> {
    try {
      await this.validarPermissaoAdmin(req);
      const docs = await this.explorerRepo.obterDocumentacao();
      res.status(200).json(docs);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao obter documentação do esquema' });
    }
  }

  async listarTabelas(req: Request, res: Response): Promise<void> {
    try {
      await this.validarPermissaoAdmin(req);
      const tabelas = await this.explorerRepo.listarTabelas();
      res.status(200).json(tabelas);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao listar tabelas' });
    }
  }

  async obterSchema(req: Request, res: Response): Promise<void> {
    try {
      await this.validarPermissaoAdmin(req);
      const { nomeTabela } = req.params;
      const colunas = await this.explorerRepo.obterEstruturaTabela(nomeTabela);
      res.status(200).json(colunas);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao obter estrutura da tabela' });
    }
  }

  async consultarRegistros(req: Request, res: Response): Promise<void> {
    try {
      await this.validarPermissaoAdmin(req);
      const { nomeTabela } = req.params;
      const { page, limit, search, sortBy, sortDir } = req.query;

      const resultado = await this.explorerRepo.consultarRegistros(nomeTabela, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search ? String(search) : undefined,
        sortBy: sortBy ? String(sortBy) : undefined,
        sortDir: sortDir === 'DESC' ? 'DESC' : 'ASC',
      });

      res.status(200).json(resultado);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao consultar registros' });
    }
  }

  async atualizarRegistro(req: Request, res: Response): Promise<void> {
    try {
      const usuario = await this.validarPermissaoAdmin(req);
      const { nomeTabela } = req.params;
      const { pk, data } = req.body;

      await this.explorerRepo.atualizarRegistro(nomeTabela, pk, data, usuario);
      res.status(200).json({ success: true, message: 'Registro atualizado com sucesso.' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar registro' });
    }
  }

  async excluirRegistro(req: Request, res: Response): Promise<void> {
    try {
      const usuario = await this.validarPermissaoAdmin(req);
      const { nomeTabela } = req.params;
      const { pk } = req.body;

      await this.explorerRepo.excluirRegistro(nomeTabela, pk, usuario);
      res.status(200).json({ success: true, message: 'Registro excluído com sucesso.' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao excluir registro' });
    }
  }

  async inserirRegistro(req: Request, res: Response): Promise<void> {
    try {
      const usuario = await this.validarPermissaoAdmin(req);
      const { nomeTabela } = req.params;
      const { data } = req.body;

      await this.explorerRepo.inserirRegistro(nomeTabela, data, usuario);
      res.status(201).json({ success: true, message: 'Registro inserido com sucesso.' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao inserir registro' });
    }
  }

  async executarQuery(req: Request, res: Response): Promise<void> {
    try {
      const usuario = await this.validarPermissaoAdmin(req);
      const { sql } = req.body;

      const resultado = await this.explorerRepo.executarQuerySql(sql, usuario);
      res.status(200).json(resultado);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao executar query SQL' });
    }
  }
}
