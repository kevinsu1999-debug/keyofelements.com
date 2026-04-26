// api/account.js — consolidated router for all /api/account/* endpoints.
// Vercel routes these via vercel.json rewrites:
//   /api/account/:path*  ->  /api/account?path=:path*
// Original per-endpoint files in api/account/ have been deleted; the
// `_auth.js` helper at api/account/_auth.js is preserved.

const { requireUser, handleAuthError, getServiceClient } = require('./account/_auth');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS / OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extract action from rewrite ?path= or fallback URL parsing
  const action = (req.query.path || req.url.replace(/^\/api\/account\/?/, '').split('?')[0] || '').split('/')[0];

  try {
    switch (action) {
      case 'profile':       return await handleProfile(req, res);
      case 'avatar':        return await handleAvatar(req, res);
      case 'password':      return await handlePassword(req, res);
      case 'email':         return await handleEmail(req, res);
      case 'terms-accept':  return await handleTermsAccept(req, res);
      case 'readings':      return await handleReadings(req, res);
      case 'orders':        return await handleOrders(req, res);
      case 'export':        return await handleExport(req, res);
      case 'delete':        return await handleDelete(req, res);
      default:              return res.status(404).json({ error: `Unknown account action: ${action}` });
    }
  } catch (e) {
    return handleAuthError(res, e);
  }
};

// === Per-endpoint handlers ===

// api/account/profile.js — GET self + PATCH metadata
async function handleProfile(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  const { user, sb } = ctx;

  if (req.method === 'GET') {
    return res.status(200).json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      metadata: user.user_metadata || {},
    });
  }

  if (req.method === 'PATCH') {
    const { name, locale, marketing_opt_in, avatar_url } = req.body || {};
    const meta = { ...(user.user_metadata || {}) };
    if (typeof name === 'string') meta.name = name.slice(0, 80);
    if (locale === 'zh' || locale === 'en') meta.locale = locale;
    if (typeof marketing_opt_in === 'boolean') meta.marketing_opt_in = marketing_opt_in;
    if (typeof avatar_url === 'string') meta.avatar_url = avatar_url.slice(0, 500);

    const { data, error } = await sb.auth.admin.updateUserById(user.id, { user_metadata: meta });
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata || {},
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// api/account/avatar.js — signed upload URL for user's avatar
async function handleAvatar(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user, sb } = ctx;
  const { filename, contentType } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'Missing filename' });

  const ct = String(contentType || '').toLowerCase();
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(ct)) {
    return res.status(400).json({ error: 'Unsupported image type' });
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  const ext = safe.includes('.') ? safe.split('.').pop() : 'jpg';
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { data, error } = await sb.storage
    .from('avatars')
    .createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: error.message });

  const pub = sb.storage.from('avatars').getPublicUrl(path);

  res.status(200).json({
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
}

// api/account/password.js — change password with current-password re-auth
async function handlePassword(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { current, new: newPass } = req.body || {};
  if (!current || !newPass) return res.status(400).json({ error: 'Missing current or new password' });
  if (newPass.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const { user, sb } = ctx;

  // Re-authenticate with current password using the anon client
  // so we don't leak service-role power.
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await anon.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signInErr) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Update password via service key
  const { error: updErr } = await sb.auth.admin.updateUserById(user.id, { password: newPass });
  if (updErr) return res.status(500).json({ error: updErr.message });

  res.status(200).json({ ok: true });
}

// api/account/email.js — initiate email change (Supabase sends verification)
async function handleEmail(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { new_email } = req.body || {};
  if (!new_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(new_email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const { user, sb } = ctx;
  if (new_email.toLowerCase() === (user.email || '').toLowerCase()) {
    return res.status(400).json({ error: 'New email is the same as current' });
  }

  // Setting email without email_confirm=true triggers a verification email.
  const { error } = await sb.auth.admin.updateUserById(user.id, { email: new_email });
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({
    ok: true,
    message: 'A verification link was sent to the new email. The change takes effect after you confirm.',
  });
}

// api/account/terms-accept.js — log a ToS acceptance
async function handleTermsAccept(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { version } = req.body || {};
  if (!version || typeof version !== 'string') return res.status(400).json({ error: 'Missing version' });

  const { user, sb } = ctx;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '';
  const ua = (req.headers['user-agent'] || '').slice(0, 500);

  const { error } = await sb.from('terms_acceptances').insert({
    user_id: user.id,
    version,
    ip,
    user_agent: ua,
  });
  if (error) return res.status(500).json({ error: error.message });

  // Mirror the latest accepted version into user_metadata for fast gate checks
  const meta = { ...(user.user_metadata || {}), terms_version: version };
  await sb.auth.admin.updateUserById(user.id, { user_metadata: meta });

  res.status(200).json({ ok: true });
}

// api/account/readings.js — GET own readings (list, or single by id)
async function handleReadings(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { user, sb } = ctx;
  const { id } = req.query || {};

  try {
    if (id) {
      const { data, error } = await sb
        .from('readings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (error) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(data);
    }

    const { data, error } = await sb
      .from('readings')
      .select('id, year_gz, day_master, strength_verdict, birth_year, birth_month, birth_day, birth_hour, gender, birth_city, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ readings: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// api/account/orders.js — user's own Stripe checkout sessions (by email)
async function handleOrders(req, res) {
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
}

// api/account/export.js — GDPR-style export of all local user data
async function handleExport(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { user, sb } = ctx;

  try {
    const { data: readings } = await sb
      .from('readings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const { data: terms } = await sb
      .from('terms_acceptances')
      .select('*')
      .eq('user_id', user.id)
      .order('accepted_at', { ascending: false });

    const bundle = {
      _readme: [
        'This is a full export of data KES (keyofelements.com) holds about your account.',
        'For your Stripe payment records, please use https://dashboard.stripe.com (via the email receipts you received) — we link out rather than replicate, to keep their system of record authoritative.',
        'Exported at: ' + new Date().toISOString(),
      ].join('\n'),
      profile: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        metadata: user.user_metadata || {},
      },
      readings: readings || [],
      terms_acceptances: terms || [],
    };

    const filename = `kes-data-${user.email || user.id}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(bundle, null, 2));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// api/account/delete.js — hard-delete user (cascades readings + terms via FK)
async function handleDelete(req, res) {
  let ctx;
  try {
    ctx = await requireUser(req);
  } catch (e) {
    return handleAuthError(res, e);
  }
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { confirm } = req.body || {};
  if (confirm !== 'DELETE') {
    return res.status(400).json({ error: 'Confirmation string required' });
  }

  const { user, sb } = ctx;

  // Best-effort: clean up avatar files under avatars/<user_id>/
  try {
    const { data: files } = await sb.storage.from('avatars').list(user.id);
    if (files && files.length) {
      const paths = files.map(f => `${user.id}/${f.name}`);
      await sb.storage.from('avatars').remove(paths);
    }
  } catch (e) {
    console.warn('avatar cleanup failed:', e.message);
  }

  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ ok: true });
}
