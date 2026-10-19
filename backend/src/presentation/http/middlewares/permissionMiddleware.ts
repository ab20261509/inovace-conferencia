import { Request, Response, NextFunction } from 'express';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { ModulosUsuario } from '../../../domain/entities/PermissaoUsuario.js';

/**
 * Middleware para validar permissão por módulo
 */
export function createPermissionMiddleware(
  permissoesRepo: IPermissoesRepository,
  modulo: keyof ModulosUsuario
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const codUsu = Number(req.userId || (req as any).user?.userId || 0);
      const nomeUsu = String(req.username || (req as any).user?.username || '').trim();

      if (!codUsu && !nomeUsu) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const modulos = await permissoesRepo.obterPermissoes(codUsu, nomeUsu);

      if (!modulos[modulo]) {
        console.warn(`⛔ [permissionMiddleware] ACESSO NEGADO para '${modulo}': codUsu=${codUsu}, nomeUsu='${nomeUsu}', modulos:`, JSON.stringify(modulos));
        res.status(403).json({
          error: `Acesso negado: seu usuário não possui permissão para acessar o módulo '${modulo}'.`,
          modulo,
        });
        return;
      }

      next();
    } catch (err: any) {
      console.error(`❌ Erro no permissionMiddleware para ${modulo}:`, err);
      res.status(500).json({ error: 'Falha ao validar permissões de acesso' });
    }
  };
}
