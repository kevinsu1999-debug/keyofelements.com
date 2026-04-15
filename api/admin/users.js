// api/admin/users.js — list users + single user detail
const { requireAdmin, handleAuthError, getSupabaseAdmin } = require('./_auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sb = getSupabaseAdmin();
  const { id, page = '1', perPage = '50', search = '' } = req.query || {};

  try {
    if (id) {
      // ── Single user detail (for drawer) ──
      const { data: u, error } = await sb.auth.admin.getUserById(id);
      if (error) return res.status(404).json({ error: error.message });

      const { data: readings } = await sb
        .from('readings')
        .select('id, year_gz, day_master, strength_verdict, birth_year, birth_month, birth_day, gender, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: terms } = await sb
        .from('terms_acceptances')
        .select('*')
        .eq('user_id', id)
        .order('accepted_at', { ascending: false });

      let orders = [];
      if (u?.user?.email) {
        try {
          const sessions = await stripe.checkout.sessions.list({
            limit: 50,
            customer_details: { email: u.user.email },
          }).catch(async () => {
            // customer_details filter not supported in .list — fall back to scan
            const all = await stripe.checkout.sessions.list({ limit: 100 });
            return { data: all.data.filter(s => (s.customer_email || s.customer_details?.email) === u.user.email) };
          });
          orders = sessions.data.map(s => ({
            id: s.id,
            amount_total: s.amount_total,
            currency: s.currency,
            status: s.status,
            payment_status: s.payment_status,
            created: s.created,
          }));
        } catch (e) {
          console.warn('stripe order fetch failed:', e.message);
        }
      }

      return res.status(200).json({
        user: u.user,
        readings: readings || [],
        terms_acceptances: terms || [],
        orders,
      });
    }

    // ── List users ──
    const pageNum = Math.max(1, parseInt(page));
    const perPageNum = Math.min(200, Math.max(1, parseInt(perPage)));
    const { data, error } = await sb.auth.admin.listUsers({ page: pageNum, perPage: perPageNum });
    if (error) return res.status(500).json({ error: error.message });

    let users = data.users || [];
    const q = String(search).trim().toLowerCase();
    if (q) users = users.filter(u => (u.email || '').toLowerCase().includes(q) || ((u.user_metadata?.name) || '').toLowerCase().includes(q));

    // Attach reading_count via batched query
    const ids = users.map(u => u.id);
    let counts = {};
    if (ids.length) {
      const { data: rc } = await sb
        .from('readings')
        .select('user_id')
        .in('user_id', ids);
      (rc || []).forEach(r => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
    }

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      name: (u.user_metadata || {}).name || '',
      paid: !!(u.user_metadata || {}).paid,
      marketing_opt_in: !!(u.user_metadata || {}).marketing_opt_in,
      terms_version: (u.user_metadata || {}).terms_version || '',
      locale: (u.user_metadata || {}).locale || '',
      avatar_url: (u.user_metadata || {}).avatar_url || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      reading_count: counts[u.id] || 0,
    }));

    res.status(200).json({ users: result, page: pageNum, perPage: perPageNum, total: data.total || result.length });
  } catch (e) {
    console.error('admin/users error:', e);
    res.status(500).json({ error: e.message });
  }
};
