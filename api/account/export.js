// api/account/export.js — GDPR-style export of all local user data
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { user, sb } = ctx;

  try {
    const { data: readings } = await sb
      .from('readings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const { data: terms } = await sb
      .from('terms_acceptances')
      .select('*')
      .eq('user_id', user.id)
      .order('accepted_at', { ascending: false });

    const bundle = {
      _readme: [
        'This is a full export of data KES (keyofelements.com) holds about your account.',
        'For your Stripe payment records, please use https://dashboard.stripe.com (via the email receipts you received) — we link out rather than replicate, to keep their system of record authoritative.',
        'Exported at: ' + new Date().toISOString(),
      ].join('\n'),
      profile: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        metadata: user.user_metadata || {},
      },
      readings: readings || [],
      terms_acceptances: terms || [],
    };

    const filename = `kes-data-${user.email || user.id}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(bundle, null, 2));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
