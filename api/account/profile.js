// api/account/profile.js — GET self + PATCH metadata
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  const { user, sb } = ctx;

  if (req.method === 'GET') {
    return res.status(200).json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      metadata: user.user_metadata || {},
    });
  }

  if (req.method === 'PATCH') {
    const { name, locale, marketing_opt_in, avatar_url } = req.body || {};
    const meta = { ...(user.user_metadata || {}) };
    if (typeof name === 'string') meta.name = name.slice(0, 80);
    if (locale === 'zh' || locale === 'en') meta.locale = locale;
    if (typeof marketing_opt_in === 'boolean') meta.marketing_opt_in = marketing_opt_in;
    if (typeof avatar_url === 'string') meta.avatar_url = avatar_url.slice(0, 500);

    const { data, error } = await sb.auth.admin.updateUserById(user.id, { user_metadata: meta });
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata || {},
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
