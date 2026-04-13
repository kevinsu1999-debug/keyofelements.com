// api/products.js — 从 Stripe 拉取产品列表
// 前端调用此 API 动态渲染商品

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 获取所有 active 产品
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price']
    });

    // 格式化返回
    const items = products.data.map(p => {
      const price = p.default_price;
      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        images: p.images || [],
        // 从 Stripe metadata 读取五行属性等自定义字段
        element: (p.metadata || {}).element || '',       // 五行: 金/木/水/火/土
        element_class: (p.metadata || {}).element_class || '', // CSS: jin/mu/shui/huo/tu
        element_desc: (p.metadata || {}).element_desc || '',
        category: (p.metadata || {}).category || '',     // 分类: clothing/accessory/service
        name_zh: (p.metadata || {}).name_zh || p.name,   // 中文名
        sizes: (p.metadata || {}).sizes || 'XS,S,M,L,XL',
        price_id: price ? price.id : null,
        price_amount: price ? price.unit_amount : 0,     // 分为单位
        price_currency: price ? price.currency : 'usd',
        price_display: price ? formatPrice(price.unit_amount, price.currency) : ''
      };
    });

    // 按 metadata.sort_order 排序（如果有的话）
    items.sort((a, b) => {
      const sa = parseInt((products.data.find(p=>p.id===a.id).metadata||{}).sort_order || '99');
      const sb = parseInt((products.data.find(p=>p.id===b.id).metadata||{}).sort_order || '99');
      return sa - sb;
    });

    res.status(200).json({ products: items });
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: err.message });
  }
};

function formatPrice(amount, currency) {
  const num = amount / 100;
  const symbols = { usd: '$', cny: '¥', hkd: 'HK$', sgd: 'S$', jpy: '¥', gbp: '£', eur: '€' };
  const sym = symbols[currency] || currency.toUpperCase() + ' ';
  return sym + num.toFixed(currency === 'jpy' ? 0 : 2);
}
