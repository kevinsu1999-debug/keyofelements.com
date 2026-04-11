// api/translate.js — 调用 Claude API 翻译八字报告
// Vercel Serverless Function

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Anthropic API key not configured' });

  try {
    const { sections, context } = req.body;
    // sections: { personality: "壬水日主...", career: "...", wealth: "...", ... }
    // context: { day_master: "壬水", strength: "偏弱", use_gods: "金水", avoid_gods: "火土木" }

    if (!sections || Object.keys(sections).length === 0) {
      return res.status(400).json({ error: 'No sections to translate' });
    }

    const prompt = `You are a professional translator specializing in Chinese metaphysics (BaZi/Four Pillars of Destiny). Translate the following BaZi analysis sections from Chinese to English.

CONTEXT:
- Day Master: ${context.day_master || 'Unknown'}
- Strength: ${context.strength || 'Unknown'}
- Favorable elements: ${context.use_gods || 'Unknown'}
- Unfavorable elements: ${context.avoid_gods || 'Unknown'}

TRANSLATION RULES:
1. Keep BaZi technical terms in their standard English translations:
   - 日主 = Day Master, 天干 = Heavenly Stems, 地支 = Earthly Branches
   - 比肩 = Companion, 劫财 = Rob Wealth, 食神 = Eating God, 伤官 = Hurting Officer
   - 偏财 = Indirect Wealth, 正财 = Direct Wealth, 七杀 = Seven Killings, 正官 = Direct Officer
   - 偏印 = Indirect Seal, 正印 = Direct Seal
   - 五行: 金=Metal, 木=Wood, 水=Water, 火=Fire, 土=Earth
   - 身强=Strong Day Master, 身弱=Weak Day Master
   - 大运=Major Life Period, 流年=Annual Fortune, 流月=Monthly Fortune
2. Maintain a professional yet accessible tone — like a luxury lifestyle advisor
3. Keep the same paragraph structure
4. Do NOT add explanations not in the original
5. Preserve emphasis markers like bold indicators

SECTIONS TO TRANSLATE (JSON):
${JSON.stringify(sections, null, 2)}

Return ONLY a JSON object with the same keys, translated values. No markdown, no explanation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'Translation API error' });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse JSON response (strip markdown fences if present)
    const clean = text.replace(/```json\s?|```/g, '').trim();
    const translated = JSON.parse(clean);

    res.status(200).json({ translated });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({ error: err.message });
  }
};
