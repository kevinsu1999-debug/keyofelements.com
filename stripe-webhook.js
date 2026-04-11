// api/stripe-webhook.js — Stripe Webhook Handler
// 处理支付成功等事件

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Vercel 需要 raw body 来验证 webhook 签名
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // Vercel 已经解析了 body，需要用 raw body
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook Error: ' + err.message });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('✅ Payment successful:', {
        email: session.customer_email || session.customer_details?.email,
        amount: session.amount_total,
        currency: session.currency,
        id: session.id
      });
      // TODO: 
      // 1. 在 Supabase 中标记用户为已付费
      // 2. 发送确认邮件
      // 3. 记录订单
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      console.log('❌ Payment failed:', intent.id);
      break;
    }
    default:
      console.log('Unhandled event:', event.type);
  }

  res.status(200).json({ received: true });
};

// Helper: get raw body for webhook verification
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
