import { Request, Response, NextFunction } from 'express';
import { IPermissoesRepository } from '../../../domain/ports/IPermissoesRepository.js';
import { ModulosUsuario } from '../../../domain/entities/PermissaoUsuario.js';

/**
 * Middleware para validar permissão por módulo (ou múltiplos módulos com OU)
 */
export function createPermissionMiddleware(
  permissoesRepo: IPermissoesRepository,
  modulo: keyof ModulosUsuario | Array<keyof ModulosUsuario>
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
      const modulosRequeridos = Array.isArray(modulo) ? modulo : [modulo];

      // Administradores nativos ou usuários com gerenciar_acessos têm acesso a todos os módulos
      const temAcesso =
        !!modulos.gerenciar_acessos ||
        modulosRequeridos.some((m) => !!modulos[m]);

      if (!temAcesso) {
        console.warn(
          `⛔ [permissionMiddleware] ACESSO NEGADO para '${modulosRequeridos.join(', ')}': codUsu=${codUsu}, nomeUsu='${nomeUsu}', modulos:`,
          JSON.stringify(modulos)
        );
        res.status(403).json({
          error: `Acesso negado: seu usuário não possui permissão para acessar os recursos de [${modulosRequeridos.join(', ')}].`,
          modulo: modulosRequeridos,
        });
        return;
      }

      next();
    } catch (err: any) {
      console.error(`❌ Erro no permissionMiddleware:`, err);
      res.status(500).json({ error: 'Falha ao validar permissões de acesso' });
    }
  };
}
