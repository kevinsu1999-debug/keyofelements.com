// api/admin/page-image.js — accept image bytes for a fixed homepage hero slot
// (slot 1..4) and upload directly to Supabase Storage at page-images/home_<n>.jpg.
// Returns the public URL. Uses upsert so admin re-uploads keep the URL stable.
const { requireAdmin, handleAuthError, getSupabaseAdmin } = require('./_auth');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slot, contentType } = req.body || {};
  const n = parseInt(slot);
  if (!n || n < 1 || n > 4) return res.status(400).json({ error: 'slot must be 1..4' });

  const ct = String(contentType || '').toLowerCase();
  if (!/^image\/(png|jpe?g|webp)$/.test(ct)) {
    return res.status(400).json({ error: 'Only PNG, JPG, or WebP allowed' });
  }
  // Always store as .jpg path so the public URL is stable regardless of source format
  const path = `home_${n}.jpg`;

  const sb = getSupabaseAdmin();
  // Use createSignedUploadUrl with upsert so re-upload replaces the file
  const { data, error } = await sb.storage
    .from('page-images')
    .createSignedUploadUrl(path, { upsert: true });
  if (error) return res.status(500).json({ error: error.message });

  const pub = sb.storage.from('page-images').getPublicUrl(path);

  res.status(200).json({
    slot: n,
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
};
