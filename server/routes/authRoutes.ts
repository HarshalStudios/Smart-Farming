import { Router, type Response } from 'express';
import { getDb, type DbUser } from '../db/database';
import { verifyPassword, signSessionToken } from '../auth/security';
import { requireUserAuth, type AuthenticatedRequest } from '../auth/middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res: Response) => {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Validation Error', message: 'Email and password are required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email.trim().toLowerCase()) as DbUser | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    return;
  }

  const farmIds: string[] = JSON.parse(user.farm_ids || '[]');
  const token = signSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    farmIds
  });

  res.json({
    message: 'Authentication successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      description: user.description,
      farmIds
    }
  });
});

// GET /api/auth/me
router.get('/me', requireUserAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, role, description, farm_ids, created_at FROM users WHERE id = ?').get(req.user!.userId) as DbUser | undefined;

  if (!user) {
    res.status(404).json({ error: 'Not Found', message: 'User record not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      description: user.description,
      farmIds: JSON.parse(user.farm_ids || '[]')
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Session terminated successfully' });
});

// GET /api/auth/demo-accounts (for demo UI switching)
router.get('/demo-accounts', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, email, name, role, description, farm_ids FROM users WHERE active = 1').all() as unknown as DbUser[];
  res.json({
    demoAccounts: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      description: u.description,
      farmIds: JSON.parse(u.farm_ids || '[]'),
      defaultDemoPassword: 'SmartFarmPassword2026!'
    }))
  });
});

export default router;
