import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware de autenticación mínima por API Key para el servidor.
 * Protege endpoints mutantes (POST, PUT, DELETE, PATCH) si DASHBOARD_API_KEY está configurada.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.DASHBOARD_API_KEY;

  // Si no está configurada en entorno, permitir en modo dev local
  if (!configuredKey || !configuredKey.trim()) {
    next();
    return;
  }

  // Health check siempre accesible; todo lo demás requiere API key si está configurada
  if (req.path === '/api/health' || req.method === 'OPTIONS') {
    next();
    return;
  }

  const headerKey = req.headers['x-api-key'] || req.headers['x-dashboard-key'];
  const authHeader = req.headers.authorization;
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const providedKey = headerKey || bearerKey;

  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({
      error: 'No autorizado: Se requiere una API Key válida (header x-api-key o Authorization: Bearer <key>) para operaciones de modificación.',
    });
    return;
  }

  next();
}
