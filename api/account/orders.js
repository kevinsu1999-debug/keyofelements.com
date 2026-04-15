// api/account/orders.js — user's own Stripe checkout sessions (by email)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { user } = ctx;
  if (!user.email) return res.status(200).json({ sessions: [] });

  try {
    // Scan recent sessions and filter by email. Stripe .list doesn't have
    // native email filter for sessions.
    const results = [];
    let starting_after;
    let scanned = 0;
    while (scanned < 500 && results.length < 50) {
      const params = { limit: 100, expand: ['data.line_items'] };
      if (starting_after) params.starting_after = starting_after;
      const page = await stripe.checkout.sessions.list(params);
      scanned += page.data.length;
      page.data.forEach(s => {
        const em = s.customer_email || (s.customer_details && s.customer_details.email) || '';
        if (em.toLowerCase() === user.email.toLowerCase()) {
          results.push({
            id: s.id,
            amount_total: s.amount_total,
            currency: s.currency,
            status: s.status,
            payment_status: s.payment_status,
            created: s.created,
            line_items: (s.line_items?.data || []).map(li => ({
              description: li.description,
              quantity: li.quantity,
              amount_total: li.amount_total,
            })),
          });
        }
      });
      if (!page.has_more) break;
      starting_after = page.data[page.data.length - 1].id;
    }
    res.status(200).json({ sessions: results });
  } catch (e) {
    console.error('account/orders error:', e);
    res.status(500).json({ error: e.message });
  }
};
