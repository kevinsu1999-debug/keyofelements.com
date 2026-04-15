// api/account/delete.js — hard-delete user (cascades readings + terms via FK)
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { confirm } = req.body || {};
  if (confirm !== 'DELETE') {
    return res.status(400).json({ error: 'Confirmation string required' });
  }

  const { user, sb } = ctx;

  // Best-effort: clean up avatar files under avatars/<user_id>/
  try {
    const { data: files } = await sb.storage.from('avatars').list(user.id);
    if (files && files.length) {
      const paths = files.map(f => `${user.id}/${f.name}`);
      await sb.storage.from('avatars').remove(paths);
    }
  } catch (e) {
    console.warn('avatar cleanup failed:', e.message);
  }

  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ ok: true });
};
