// api/admin/site-text.js — admin CRUD for editable site text.
// GET    /api/admin/site-text          → list all rows
// PUT    /api/admin/site-text {key,zh,en} → upsert one row
// DELETE /api/admin/site-text?key=...  → delete a row (revert to HTML default)
const { requireAdmin, handleAuthError, getSupabaseAdmin } = require('./_auth');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }

  const sb = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await sb.from('site_texts').select('*').order('key');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ texts: data || [] });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const { key, zh, en } = req.body || {};
      if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required' });
      const row = {
        key: key.trim().slice(0, 120),
        zh: typeof zh === 'string' ? zh : null,
        en: typeof en === 'string' ? en : null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await sb.from('site_texts').upsert(row, { onConflict: 'key' }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, text: data });
    }

    if (req.method === 'DELETE') {
      const key = req.query?.key;
      if (!key) return res.status(400).json({ error: 'key required' });
      const { error } = await sb.from('site_texts').delete().eq('key', key);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('admin/site-text error:', e);
    res.status(500).json({ error: e.message });
  }
};
