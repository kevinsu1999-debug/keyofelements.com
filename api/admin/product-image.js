// api/admin/product-image.js — issues a signed upload URL for product-images bucket
const { requireAdmin, handleAuthError, getSupabaseAdmin } = require('./_auth');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { filename, contentType } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'Missing filename' });

  // Basic content-type gate
  const ct = String(contentType || '').toLowerCase();
  if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(ct)) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }

  // Sanitize filename and prefix with timestamp + random
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const ext = safe.includes('.') ? safe.split('.').pop() : 'jpg';
  const base = safe.replace(/\.[^.]+$/, '') || 'img';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage
    .from('product-images')
    .createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: error.message });

  const pub = sb.storage.from('product-images').getPublicUrl(path);

  res.status(200).json({
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
};
