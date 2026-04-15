// api/account/terms-accept.js — log a ToS acceptance
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { version } = req.body || {};
  if (!version || typeof version !== 'string') return res.status(400).json({ error: 'Missing version' });

  const { user, sb } = ctx;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '';
  const ua = (req.headers['user-agent'] || '').slice(0, 500);

  const { error } = await sb.from('terms_acceptances').insert({
    user_id: user.id,
    version,
    ip,
    user_agent: ua,
  });
  if (error) return res.status(500).json({ error: error.message });

  // Mirror the latest accepted version into user_metadata for fast gate checks
  const meta = { ...(user.user_metadata || {}), terms_version: version };
  await sb.auth.admin.updateUserById(user.id, { user_metadata: meta });

  res.status(200).json({ ok: true });
};
