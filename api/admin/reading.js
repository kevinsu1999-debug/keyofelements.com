// api/admin/reading.js — fetch a single reading's full JSON (admin only)
const { requireAdmin, handleAuthError, getSupabaseAdmin } = require('./_auth');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('readings').select('*').eq('id', id).single();
  if (error || !data) return res.status(404).json({ error: error?.message || 'Not found' });

  res.status(200).json(data);
};
