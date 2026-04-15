// api/account/email.js — initiate email change (Supabase sends verification)
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { new_email } = req.body || {};
  if (!new_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(new_email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const { user, sb } = ctx;
  if (new_email.toLowerCase() === (user.email || '').toLowerCase()) {
    return res.status(400).json({ error: 'New email is the same as current' });
  }

  // Setting email without email_confirm=true triggers a verification email.
  const { error } = await sb.auth.admin.updateUserById(user.id, { email: new_email });
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({
    ok: true,
    message: 'A verification link was sent to the new email. The change takes effect after you confirm.',
  });
};
