// api/account/_auth.js — verify Supabase user JWT
const { createClient } = require('@supabase/supabase-js');

function getServiceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    const err = new Error('Missing bearer token');
    err.status = 401;
    throw err;
  }
  const token = h.slice(7);
  const sb = getServiceClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }
  return { user: data.user, sb, token };
}

function handleAuthError(res, e) {
  const status = e.status || 500;
  res.status(status).json({ error: e.message || 'Internal error' });
}

module.exports = { requireUser, handleAuthError, getServiceClient };
