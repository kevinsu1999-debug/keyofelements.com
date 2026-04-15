// api/admin/products.js — admin product CRUD
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireAdmin, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }

  try {
    if (req.method === 'GET') return await handleList(req, res);
    if (req.method === 'POST') return await handleCreate(req, res);
    if (req.method === 'PATCH') return await handleUpdate(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin/products error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
};

async function handleList(req, res) {
  const products = await stripe.products.list({
    limit: 100,
    expand: ['data.default_price'],
  });
  const items = products.data.map(p => {
    const price = p.default_price;
    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      images: p.images || [],
      active: p.active,
      metadata: p.metadata || {},
      price_id: price ? price.id : null,
      price_amount: price ? price.unit_amount : 0,
      price_currency: price ? price.currency : 'usd',
      created: p.created,
      updated: p.updated,
    };
  });
  items.sort((a, b) => (b.created || 0) - (a.created || 0));
  res.status(200).json({ products: items });
}

async function handleCreate(req, res) {
  const { name, description, metadata, images, unit_amount, currency } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });
  if (!unit_amount || unit_amount < 1) return res.status(400).json({ error: 'Invalid unit_amount (cents)' });

  const product = await stripe.products.create({
    name,
    description: description || undefined,
    metadata: metadata || {},
    images: Array.isArray(images) ? images.slice(0, 8) : [],
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount,
    currency: currency || 'usd',
  });
  const updated = await stripe.products.update(product.id, { default_price: price.id });

  res.status(200).json({ product: updated, price });
}

async function handleUpdate(req, res) {
  const { id, name, description, metadata, images, active, new_price } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const patch = {};
  if (typeof name === 'string') patch.name = name;
  if (typeof description === 'string') patch.description = description;
  if (metadata) patch.metadata = metadata;
  if (Array.isArray(images)) patch.images = images.slice(0, 8);
  if (typeof active === 'boolean') patch.active = active;

  let newPriceObj = null;
  if (new_price && new_price.unit_amount) {
    // Archive old price
    try {
      const current = await stripe.products.retrieve(id);
      if (current.default_price) {
        await stripe.prices.update(current.default_price, { active: false });
      }
    } catch (e) {
      console.warn('archive old price failed:', e.message);
    }
    newPriceObj = await stripe.prices.create({
      product: id,
      unit_amount: new_price.unit_amount,
      currency: new_price.currency || 'usd',
    });
    patch.default_price = newPriceObj.id;
  }

  const product = await stripe.products.update(id, patch);
  res.status(200).json({ product, new_price: newPriceObj });
}
