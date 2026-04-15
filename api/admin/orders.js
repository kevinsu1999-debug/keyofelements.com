// api/admin/orders.js — list Stripe checkout sessions
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireAdmin, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { limit = '50', starting_after } = req.query || {};
  const params = {
    limit: Math.min(100, Math.max(1, parseInt(limit))),
    expand: ['data.line_items'],
  };
  if (starting_after) params.starting_after = starting_after;

  try {
    const sessions = await stripe.checkout.sessions.list(params);
    const items = sessions.data.map(s => ({
      id: s.id,
      amount_total: s.amount_total,
      currency: s.currency,
      status: s.status,
      payment_status: s.payment_status,
      customer_email: s.customer_email || (s.customer_details && s.customer_details.email) || '',
      created: s.created,
      mode: s.mode,
      line_items: (s.line_items && s.line_items.data || []).map(li => ({
        description: li.description,
        quantity: li.quantity,
        amount_total: li.amount_total,
      })),
    }));
    res.status(200).json({ sessions: items, has_more: sessions.has_more });
  } catch (e) {
    console.error('admin/orders error:', e);
    res.status(500).json({ error: e.message });
  }
};
