import crypto from 'node:crypto';

export type UserRole = 'Admin' | 'Farmer' | 'Partner' | 'Technician';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  farmIds: string[];
  issuedAt: number;
  expiresAt: number;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'greenfield-smartfarm-dev-secret-key-32chars-min!';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function signSessionToken(user: { id: string; email: string; name: string; role: UserRole; farmIds?: string[] }): string {
  const now = Date.now();
  const session: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    farmIds: user.farmIds || [],
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS
  };

  const payloadStr = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

export function verifySessionToken(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadStr, signature] = parts;

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const session: UserSession = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// Device tokens: Bearer gfd_<random32hex>
export function generateDeviceToken(): { rawToken: string; tokenHash: string } {
  const randomHex = crypto.randomBytes(24).toString('hex');
  const rawToken = `gfd_${randomHex}`;
  const tokenHash = hashDeviceToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashDeviceToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}
