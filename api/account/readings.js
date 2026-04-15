// api/account/readings.js — GET own readings (list, or single by id)
const { requireUser, handleAuthError } = require('./_auth');

module.exports = async (req, res) => {
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
};
