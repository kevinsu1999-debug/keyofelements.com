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

  // Two kinds of slots:
  //   numeric 1..4           → editorial grid (home_<n>.jpg)
  //   'banner_home' | 'banner_shop' | 'banner_learn' | 'banner_about' → page banners
  const { slot, contentType } = req.body || {};

  const ct = String(contentType || '').toLowerCase();
  if (!/^image\/(png|jpe?g|webp)$/.test(ct)) {
    return res.status(400).json({ error: 'Only PNG, JPG, or WebP allowed' });
  }

  let path;
  const n = parseInt(slot);
  if (!isNaN(n) && n >= 1 && n <= 4) {
    path = `home_${n}.jpg`;
  } else if (typeof slot === 'string' && /^(banner_(shop|learn)|home_hero|about_[1-3])$/.test(slot)) {
    // banner_home and banner_about removed — no DOM to render them.
    // about_1 / about_2 / about_3 = the three About-page image slots.
    path = `${slot}.jpg`;
  } else {
    return res.status(400).json({ error: 'slot must be 1..4, banner_shop, banner_learn, home_hero, or about_1..3' });
  }

  const sb = getSupabaseAdmin();
  // Use createSignedUploadUrl with upsert so re-upload replaces the file
  const { data, error } = await sb.storage
    .from('page-images')
    .createSignedUploadUrl(path, { upsert: true });
  if (error) return res.status(500).json({ error: error.message });

  const pub = sb.storage.from('page-images').getPublicUrl(path);

  res.status(200).json({
    slot,
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
};
