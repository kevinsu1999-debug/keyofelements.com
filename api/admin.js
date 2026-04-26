// api/admin.js — consolidated router for all /api/admin/* endpoints.
// Vercel routes these via vercel.json rewrites:
//   /api/admin/:path*  ->  /api/admin?path=:path*
// Original per-endpoint files in api/admin/ have been deleted; the
// `_auth.js` helper at api/admin/_auth.js is preserved.

const { requireAdmin, handleAuthError, getSupabaseAdmin } = require('./admin/_auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // CORS / OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = (req.query.path || req.url.replace(/^\/api\/admin\/?/, '').split('?')[0] || '').split('/')[0];

  // Note: login is the ONLY admin endpoint that doesn't require auth.
  // Every other action requires requireAdmin() — call it inside each handler.

  try {
    switch (action) {
      case 'login':          return await handleLogin(req, res);
      case 'products':       return await handleProducts(req, res);
      case 'product-image':  return await handleProductImage(req, res);
      case 'page-image':     return await handlePageImage(req, res);
      case 'users':          return await handleUsers(req, res);
      case 'orders':         return await handleOrders(req, res);
      case 'stats':          return await handleStats(req, res);
      case 'reading':        return await handleReading(req, res);
      case 'site-text':      return await handleSiteText(req, res);
      default:               return res.status(404).json({ error: `Unknown admin action: ${action}` });
    }
  } catch (e) {
    return handleAuthError(res, e);
  }
};

// === Login ===
// Per-lambda rate limit (10 attempts / 5 min per IP).
const _attempts = new Map(); // ip -> [{t}, ...]
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

function checkRate(ip) {
  const now = Date.now();
  const arr = (_attempts.get(ip) || []).filter(r => now - r.t < WINDOW_MS);
  if (arr.length >= MAX_ATTEMPTS) return false;
  arr.push({ t: now });
  _attempts.set(ip, arr);
  return true;
}

function ctEq(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRate(ip)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const ok = ctEq(username, process.env.ADMIN_USERNAME || '') && ctEq(password, process.env.ADMIN_PASSWORD || '');
  if (!ok) {
    // Uniform delay to dampen timing leaks
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24; // 24 hours
  const token = jwt.sign({ sub: 'admin', iat, exp }, process.env.ADMIN_JWT_SECRET);

  res.status(200).json({ token, expiresAt: exp * 1000 });
}

// === Products ===
async function handleProducts(req, res) {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }

  try {
    if (req.method === 'GET') return await handleProductsList(req, res);
    if (req.method === 'POST') return await handleProductsCreate(req, res);
    if (req.method === 'PATCH') return await handleProductsUpdate(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin/products error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}

async function handleProductsList(req, res) {
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

async function handleProductsCreate(req, res) {
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

async function handleProductsUpdate(req, res) {
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

// === Product Image ===
async function handleProductImage(req, res) {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { filename, contentType } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'Missing filename' });

  // Basic content-type gate
  const ct = String(contentType || '').toLowerCase();
  if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(ct)) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }

  // Sanitize filename and prefix with timestamp + random
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const ext = safe.includes('.') ? safe.split('.').pop() : 'jpg';
  const base = safe.replace(/\.[^.]+$/, '') || 'img';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage
    .from('product-images')
    .createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: error.message });

  const pub = sb.storage.from('product-images').getPublicUrl(path);

  res.status(200).json({
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
}

// === Page Image ===
async function handlePageImage(req, res) {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Two kinds of slots:
  //   numeric 1..4           → editorial grid (home_<n>.jpg)
  //   'banner_home' | 'banner_shop' | 'banner_learn' | 'banner_about' → page banners
  const { slot, contentType } = req.body || {};

  const ct = String(contentType || '').toLowerCase();
  if (!/^image\/(png|jpe?g|webp)$/.test(ct)) {
    return res.status(400).json({ error: 'Only PNG, JPG, or WebP allowed' });
  }

  let path;
  const n = parseInt(slot);
  if (!isNaN(n) && n >= 1 && n <= 4) {
    path = `home_${n}.jpg`;
  } else if (typeof slot === 'string' && /^(banner_(shop|learn)|home_hero|about_[1-3])$/.test(slot)) {
    // banner_home and banner_about removed — no DOM to render them.
    // about_1 / about_2 / about_3 = the three About-page image slots.
    path = `${slot}.jpg`;
  } else {
    return res.status(400).json({ error: 'slot must be 1..4, banner_shop, banner_learn, home_hero, or about_1..3' });
  }

  const sb = getSupabaseAdmin();
  // Use createSignedUploadUrl with upsert so re-upload replaces the file
  const { data, error } = await sb.storage
    .from('page-images')
    .createSignedUploadUrl(path, { upsert: true });
  if (error) return res.status(500).json({ error: error.message });

  const pub = sb.storage.from('page-images').getPublicUrl(path);

  res.status(200).json({
    slot,
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
}

// === Users ===
async function handleUsers(req, res) {
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
}

// === Orders ===
async function handleOrders(req, res) {
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
}

// === Stats ===
let _statsCache = { at: 0, data: null };
const STATS_TTL = 60 * 1000;

async function handleStats(req, res) {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const now = Date.now();
  if (_statsCache.data && now - _statsCache.at < STATS_TTL) return res.status(200).json(_statsCache.data);

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

    _statsCache = { at: now, data: payload };
    res.status(200).json(payload);
  } catch (e) {
    console.error('admin/stats error:', e);
    res.status(500).json({ error: e.message });
  }
}

// === Reading ===
async function handleReading(req, res) {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('readings').select('*').eq('id', id).single();
  if (error || !data) return res.status(404).json({ error: error?.message || 'Not found' });

  res.status(200).json(data);
}

// === Site Text ===
async function handleSiteText(req, res) {
  try {
    requireAdmin(req);
  } catch (e) {
    return handleAuthError(res, e);
  }

  const sb = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await sb.from('site_texts').select('*').order('key');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ texts: data || [] });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const { key, zh, en } = req.body || {};
      if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required' });
      const row = {
        key: key.trim().slice(0, 120),
        zh: typeof zh === 'string' ? zh : null,
        en: typeof en === 'string' ? en : null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await sb.from('site_texts').upsert(row, { onConflict: 'key' }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, text: data });
    }

    if (req.method === 'DELETE') {
      const key = req.query?.key;
      if (!key) return res.status(400).json({ error: 'key required' });
      const { error } = await sb.from('site_texts').delete().eq('key', key);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('admin/site-text error:', e);
    res.status(500).json({ error: e.message });
  }
}
