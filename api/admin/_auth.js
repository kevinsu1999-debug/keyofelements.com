// api/admin/_auth.js — shared admin JWT verification
const jwt = require('jsonwebtoken');

function requireAdmin(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    const err = new Error('Missing bearer token');
    err.status = 401;
    throw err;
  }
  const token = h.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    if (decoded.sub !== 'admin') {
      const err = new Error('Not an admin token');
      err.status = 403;
      throw err;
    }
    return decoded;
  } catch (e) {
    if (e.status) throw e;
    const err = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }
}

function handleAuthError(res, e) {
  const status = e.status || 500;
  res.status(status).json({ error: e.message || 'Internal error' });
}

function getSupabaseAdmin() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = { requireAdmin, handleAuthError, getSupabaseAdmin };
