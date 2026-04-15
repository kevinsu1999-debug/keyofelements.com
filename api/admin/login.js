// api/admin/login.js — admin password login → issues 24h JWT
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Per-lambda rate limit (10 attempts / 5 min per IP).
const _attempts = new Map(); // ip -> [{t}, ...]
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

function checkRate(ip) {
  const now = Date.now();
  const arr = (_attempts.get(ip) || []).filter(r => now - r.t < WINDOW_MS);
  if (arr.length >= MAX_ATTEMPTS) return false;
  arr.push({ t: now });
  _attempts.set(ip, arr);
  return true;
}

function ctEq(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRate(ip)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const ok = ctEq(username, process.env.ADMIN_USERNAME || '') && ctEq(password, process.env.ADMIN_PASSWORD || '');
  if (!ok) {
    // Uniform delay to dampen timing leaks
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24; // 24 hours
  const token = jwt.sign({ sub: 'admin', iat, exp }, process.env.ADMIN_JWT_SECRET);

  res.status(200).json({ token, expiresAt: exp * 1000 });
};
