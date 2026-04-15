// api/account/password.js — change password with current-password re-auth
const { createClient } = require('@supabase/supabase-js');
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { current, new: newPass } = req.body || {};
  if (!current || !newPass) return res.status(400).json({ error: 'Missing current or new password' });
  if (newPass.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const { user, sb } = ctx;

  // Re-authenticate with current password using the anon client
  // so we don't leak service-role power.
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await anon.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signInErr) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Update password via service key
  const { error: updErr } = await sb.auth.admin.updateUserById(user.id, { password: newPass });
  if (updErr) return res.status(500).json({ error: updErr.message });

  res.status(200).json({ ok: true });
};
