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

    // 公开店铺：过滤掉 metadata.hidden === 'true' 的产品（如报告解锁这种服务型产品）。
    // 后台 /api/admin/products 仍然会返回全部，方便管理。
    const visible = products.data.filter(p => (p.metadata || {}).hidden !== 'true');

    // 格式化返回
    const items = visible.map(p => {
      const price = p.default_price;
      const meta = p.metadata || {};

      // Parse size-quantity array. Priority: sizes_json (new) > sizes (legacy, qty=0)
      let sizesArray = [];
      if (meta.sizes_json) {
        try {
          const parsed = JSON.parse(meta.sizes_json);
          if (Array.isArray(parsed)) {
            sizesArray = parsed
              .map(x => ({ size: String(x.size||'').trim(), qty: Math.max(0, parseInt(x.qty)||0) }))
              .filter(x => x.size);
          }
        } catch(e) { /* fallthrough */ }
      }
      if (!sizesArray.length && meta.sizes) {
        // Legacy: comma string with no per-size stock — treat as qty 0 (unknown)
        sizesArray = meta.sizes.split(',')
          .map(s => ({ size: s.trim(), qty: 0 }))
          .filter(x => x.size);
      }

      const totalStock = sizesArray.reduce((sum, s) => sum + (s.qty||0), 0);
      const hasStock = sizesArray.some(s => (s.qty||0) > 0);

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        description_zh: meta.description_zh || '',
        images: p.images || [],
        // 从 Stripe metadata 读取五行属性等自定义字段
        element: meta.element || '',              // 五行: 金/木/水/火/土
        element_class: meta.element_class || '',  // CSS: jin/mu/shui/huo/tu
        element_desc: meta.element_desc || '',
        category: meta.category || '',            // 分类: clothing/accessory/service
        name_zh: meta.name_zh || p.name,          // 中文名
        gender: meta.gender || '',
        sizes: meta.sizes || '',                  // legacy comma string (for back-compat)
        sizes_array: sizesArray,                  // [{size, qty}, ...]
        total_stock: totalStock,
        has_stock: hasStock,
        price_id: price ? price.id : null,
        price_amount: price ? price.unit_amount : 0,
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
