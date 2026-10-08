import { Request, Response, NextFunction } from 'express';
import { ITokenPort } from '../../../domain/ports/ITokenPort.js';

/**
 * Factory de middleware de autenticação
 * Recebe o tokenPort por injeção (não importa diretamente a implementação)
 */
export function createAuthMiddleware(tokenPort: ITokenPort) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Formato de token inválido' });
      return;
    }

    const payload = tokenPort.extractFromHeader(authHeader);

    if (!payload) {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }

    req.userId = payload.userId;
    // Necessário para as regras de permissão por login (campos sensíveis)
    req.username = payload.username;
    (req as any).user = {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
    };
    next();
  };
}
