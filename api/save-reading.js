// api/save-reading.js — persist a completed reading for the logged-in user.
// Fire-and-forget from the frontend. Silent no-op if no/invalid token.
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { access_token, report } = req.body || {};
  if (!access_token || !report) return res.status(200).json({ ok: false, reason: 'no_token_or_report' });

  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify user via JWT
    const { data: userRes, error: uerr } = await sb.auth.getUser(access_token);
    if (uerr || !userRes?.user) return res.status(200).json({ ok: false, reason: 'invalid_token' });
    const user = userRes.user;

    const m = report.meta || {};
    const p = report.pillars || {};
    const s = report.strength || {};

    // Extract birth_year/month/day from "YYYY年M月D日"
    let by, bm, bd;
    const match = /([0-9]{4})年([0-9]{1,2})月([0-9]{1,2})日/.exec(m.birth || '');
    if (match) { by = +match[1]; bm = +match[2]; bd = +match[3]; }
    const BRANCH_HR = { '子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20,'亥':22 };
    const bh = BRANCH_HR[m.birth_hour_branch];

    const year_gz = (p.year?.stem || '') + (p.year?.branch || '');
    const day_master = m.day_master || p.day?.stem || '';
    const strength_verdict = s.verdict || '';

    const { error } = await sb.from('readings').insert({
      user_id: user.id,
      email: user.email,
      birth_year: by,
      birth_month: bm,
      birth_day: bd,
      birth_hour: bh,
      gender: m.gender || null,
      birth_city: m.birth_city || null,
      residence_city: m.residence_city || null,
      year_gz,
      day_master,
      strength_verdict,
      report,
    });
    if (error) {
      console.warn('save-reading insert error:', error.message);
      return res.status(200).json({ ok: false, reason: 'db_error' });
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('save-reading error:', e);
    res.status(200).json({ ok: false, reason: 'exception' });
  }
};
