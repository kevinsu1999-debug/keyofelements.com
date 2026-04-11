// api/create-checkout.js — Vercel Serverless Function
// 创建 Stripe Checkout Session，支持单品和购物车

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, success_url, cancel_url, customer_email, locale } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // items 格式: [{ price_id: 'price_xxx', quantity: 1 }, ...]
    const line_items = items.map(item => ({
      price: item.price_id,
      quantity: item.quantity || 1
    }));

    const sessionParams = {
      mode: 'payment',
      line_items,
      success_url: success_url || 'https://keyofelements.com?payment=success',
      cancel_url: cancel_url || 'https://keyofelements.com?payment=cancel',
      locale: locale || 'auto',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'CN', 'HK', 'TW', 'SG', 'JP', 'KR', 'GB', 'FR', 'DE', 'AU', 'NZ']
      },
      // 自动计算税费（需要在 Stripe 开启 Tax）
      // automatic_tax: { enabled: true },
    };

    if (customer_email) {
      sessionParams.customer_email = customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
};
