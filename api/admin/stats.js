// api/admin/stats.js — aggregate KPIs, 60s cache
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireAdmin, handleAuthError, getSupabaseAdmin } = require('./_auth');

let _cache = { at: 0, data: null };
const TTL = 60 * 1000;

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const now = Date.now();
  if (_cache.data && now - _cache.at < TTL) return res.status(200).json(_cache.data);

  try {
    const sb = getSupabaseAdmin();

    // Users — paginate through all to count totals and paid
    let total = 0;
    let paid = 0;
    let optIn = 0;
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const arr = data.users || [];
      total += arr.length;
      arr.forEach(u => {
        if ((u.user_metadata || {}).paid) paid++;
        if ((u.user_metadata || {}).marketing_opt_in) optIn++;
      });
      if (arr.length < perPage) break;
      page++;
      if (page > 50) break; // safety cap = 10k users
    }

    // Readings buckets
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { count: readingsToday } = await sb
      .from('readings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString());
    const { count: readings7d } = await sb
      .from('readings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
    const { count: readingsAll } = await sb
      .from('readings')
      .select('id', { count: 'exact', head: true });

    // Revenue 30d
    let revenue30d = 0;
    let currency = 'usd';
    try {
      const thirty = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const charges = await stripe.charges.list({ created: { gte: thirty }, limit: 100 });
      charges.data.forEach(c => {
        if (c.paid && !c.refunded) {
          revenue30d += c.amount || 0;
          currency = c.currency || currency;
        }
      });
    } catch (e) {
      console.warn('stats stripe charges fail:', e.message);
    }

    const payload = {
      total_users: total,
      paid_users: paid,
      paid_rate: total ? Math.round((paid / total) * 1000) / 10 : 0,
      marketing_opt_in: optIn,
      readings_today: readingsToday || 0,
      readings_7d: readings7d || 0,
      readings_all: readingsAll || 0,
      revenue_30d: revenue30d,
      revenue_currency: currency,
      generated_at: new Date().toISOString(),
    };

    _cache = { at: now, data: payload };
    res.status(200).json(payload);
  } catch (e) {
    console.error('admin/stats error:', e);
    res.status(500).json({ error: e.message });
  }
};
