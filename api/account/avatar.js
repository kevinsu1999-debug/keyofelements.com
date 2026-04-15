// api/account/avatar.js — signed upload URL for user's avatar
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user, sb } = ctx;
  const { filename, contentType } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'Missing filename' });

  const ct = String(contentType || '').toLowerCase();
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(ct)) {
    return res.status(400).json({ error: 'Unsupported image type' });
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  const ext = safe.includes('.') ? safe.split('.').pop() : 'jpg';
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { data, error } = await sb.storage
    .from('avatars')
    .createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: error.message });

  const pub = sb.storage.from('avatars').getPublicUrl(path);

  res.status(200).json({
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
};
