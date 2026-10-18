import type { Request, Response, NextFunction } from 'express';
import { verifySessionToken, type UserSession, type UserRole, hashDeviceToken } from './security';
import { getDb, type DbDevice } from '../db/database';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
  device?: DbDevice;
}

export function requireUserAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <session_token>'
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  const session = verifySessionToken(token);

  if (!session) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session token. Please sign in again.'
    });
    return;
  }

  req.user = session;
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required role(s): ${allowedRoles.join(', ')}. Current role: ${req.user.role}`
      });
      return;
    }

    next();
  };
}

export function requireDeviceAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Device tokens can be sent via X-Device-Token header or Authorization: Bearer gfd_...
  const rawToken = (req.headers['x-device-token'] as string) ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : '');

  if (!rawToken || !rawToken.startsWith('gfd_')) {
    res.status(401).json({
      error: 'Device Authentication Failed',
      message: 'Missing or malformed device token. Header X-Device-Token or Bearer gfd_<secret> required.'
    });
    return;
  }

  const tokenHash = hashDeviceToken(rawToken);
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE token_hash = ?').get(tokenHash) as DbDevice | undefined;

  if (!device) {
    res.status(401).json({
      error: 'Device Authentication Failed',
      message: 'Unrecognized or revoked device token.'
    });
    return;
  }

  req.device = device;
  next();
}
