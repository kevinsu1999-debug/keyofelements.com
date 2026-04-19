// api/calculate.js — Vercel Serverless Proxy to Railway FastAPI
//
// Why this exists: Railway's default *.up.railway.app domain is blocked
// in mainland China. Browsers in China can reach Vercel (keyofelements.com)
// but not Railway directly. This function runs on Vercel's server, which
// CAN reach Railway, and forwards the BaZi calculation request.
//
// Flow: Browser (CN) → keyofelements.com/api/calculate (Vercel) →
//       Railway FastAPI /api/calculate → back through Vercel → Browser.

const RAILWAY_URL = 'https://web-production-11af.up.railway.app/api/calculate';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Abort after 25s (Vercel hobby timeout is 10s, pro 60s — keep margin).
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);

    const upstream = await fetch(RAILWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: ctrl.signal
    });
    clearTimeout(timer);

    const text = await upstream.text();
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    return res.send(text);
  } catch (err) {
    console.error('calculate proxy error:', err);
    const msg = err.name === 'AbortError'
      ? '后端响应超时，请稍后重试'
      : ('后端连接失败: ' + err.message);
    return res.status(502).json({ error: msg });
  }
};
