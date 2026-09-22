import crypto from 'node:crypto';
import * as store from './store.js';

const COOKIE = 'fb_admin';
const MAX_AGE = 7 * 24 * 3600 * 1000;

const sign = (data) => crypto.createHmac('sha256', store.getPrivate().secret).update(data).digest('base64url');

// Changing the password changes this, which invalidates every existing session.
const passwordVersion = () =>
  crypto.createHash('sha256').update(store.getPrivate().passwordHash).digest('base64url').slice(0, 12);

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function startSession(res) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE, v: passwordVersion() })).toString('base64url');
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function endSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

export function isAuthed(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() && data.v === passwordVersion();
  } catch {
    return false;
  }
}

export function requireAuth(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Ikke innlogget' });
  // Extra CSRF guard on writes: a cross-site form cannot set custom headers.
  if (req.method !== 'GET' && req.get('X-Admin') !== '1') return res.status(403).json({ error: 'Ugyldig forespørsel' });
  next();
}

export function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    let entry = hits.get(req.ip);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(req.ip, entry);
    }
    if (++entry.count > max) return res.status(429).json({ error: 'For mange forsøk. Prøv igjen senere.' });
    next();
  };
}
