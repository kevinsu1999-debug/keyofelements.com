// api/site-content.js — public read of editable site text + banner image URLs.
// No auth needed; cached at the edge to keep DB load near zero.
// Returns { texts: [{key, zh, en}], banners: {home, shop, learn, about} }.
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // CORS — shop/site may be served from different origin in dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let texts = [];
  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await sb.from('site_texts').select('key, zh, en');
    texts = data || [];
  } catch (e) {
    // If table doesn't exist yet, return empty — frontend falls back to HTML defaults.
    console.warn('site_texts query failed:', e.message);
  }

  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '') + '/storage/v1/object/public/page-images/';
  const banners = {
    home:       base + 'banner_home.jpg',
    shop:       base + 'banner_shop.jpg',
    learn:      base + 'banner_learn.jpg',
    about:      base + 'banner_about.jpg',
    home_hero:  base + 'home_hero.jpg',  // Philosophy block 720x600 lifestyle image
  };

  // Cache 60s at edge; stale-while-revalidate up to 10 min so admin edits
  // propagate quickly while still shielding the DB.
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  res.status(200).json({ texts, banners });
};
