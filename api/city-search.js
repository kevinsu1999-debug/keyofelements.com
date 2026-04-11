// api/city-search.js — Google Places Autocomplete proxy
// API key stays server-side, more secure

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY;
  if (!GOOGLE_KEY) return res.status(500).json({ error: 'Google API key not configured' });

  const query = req.query.q;
  if (!query || query.length < 2) return res.status(400).json({ results: [] });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${GOOGLE_KEY}&language=zh-CN`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places error:', data.status, data.error_message);
      return res.status(502).json({ error: data.status });
    }

    // Get details for each prediction to get coordinates
    const results = [];
    const predictions = (data.predictions || []).slice(0, 6);

    for (const p of predictions) {
      try {
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=geometry,utc_offset&key=${GOOGLE_KEY}`;
        const detailResp = await fetch(detailUrl);
        const detail = await detailResp.json();

        if (detail.result && detail.result.geometry) {
          results.push({
            name: p.description,
            lat: detail.result.geometry.location.lat,
            lon: detail.result.geometry.location.lng,
            utc_offset: detail.result.utc_offset !== undefined ? detail.result.utc_offset / 60 : null
          });
        }
      } catch (e) {
        // Skip failed detail lookups
        results.push({ name: p.description, lat: null, lon: null });
      }
    }

    res.status(200).json({ results });
  } catch (err) {
    console.error('City search error:', err);
    res.status(500).json({ error: err.message });
  }
};
