// api/enrich.js — Claude API 生成深度命理分析（免费板块）
// 只生成描述性分析，不给实操建议（建议留在付费板块）

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { chart, lang } = req.body;
    if (!chart) return res.status(400).json({ error: 'No chart data' });

    const isZh = lang !== 'en';

    const prompt = isZh ? `你是一位资深八字命理师，文笔优美、分析深入。请根据以下八字命盘数据，为用户生成深度分析。

命盘数据：
- 日主：${chart.day_master}（${chart.day_master_element}）
- 身强弱：${chart.strength}
- 四柱：年柱${chart.year_pillar}，月柱${chart.month_pillar}，日柱${chart.day_pillar}，时柱${chart.hour_pillar}
- 十神：年干${chart.year_god}，月干${chart.month_god}，时干${chart.hour_god}
- 五行分布：${chart.wuxing_summary}
- 空亡：${chart.kong_wang || '无'}

请生成以下内容（JSON格式）：

{
  "personality": "性格深度分析（200-300字）：从日主特质、十神组合、四柱宫位关系出发，分析此人的性格底色、思维方式、人际风格。要有洞察力和共鸣感，像是在描述一个真实的人。不要给建议。",
  "pillars_insight": "四柱解读（150-200字）：解读年月日时四柱的组合含义。年柱代表祖辈与早年环境，月柱代表事业与社会，日柱代表自我与配偶，时柱代表子女与晚年。分析各柱之间的五行生克关系。",
  "wuxing_narrative": "五行叙事（100-150字）：用文学性的语言描述此人五行能量的分布特征，像是在描述一幅画或一种气质。不要给建议。",
  "strength_explanation": "身强弱详解（100-150字）：解释为什么此人是${chart.strength}，得令得地得势的具体情况，这种强弱状态意味着什么样的生命特质。不要给建议。"
}

⚠️ 重要：
1. 只做分析和描述，绝不给任何实操建议（颜色、方位、行业、养生等留给付费内容）
2. 语气温和专业，有文化底蕴
3. 每段都要基于具体的命盘数据，不要泛泛而谈
4. 返回纯JSON，不要markdown` :

`You are an expert BaZi (Four Pillars of Destiny) analyst with elegant writing. Generate a deep analysis based on this chart data.

Chart data:
- Day Master: ${chart.day_master} (${chart.day_master_element})
- Strength: ${chart.strength}
- Four Pillars: Year ${chart.year_pillar}, Month ${chart.month_pillar}, Day ${chart.day_pillar}, Hour ${chart.hour_pillar}
- Ten Gods: Year ${chart.year_god}, Month ${chart.month_god}, Hour ${chart.hour_god}
- Five Elements: ${chart.wuxing_summary}
- Void: ${chart.kong_wang || 'None'}

Generate the following in JSON format:

{
  "personality": "Deep personality analysis (200-300 words): Analyze character, thinking patterns, and interpersonal style based on Day Master, Ten Gods, and pillar relationships. Be insightful and relatable. Do NOT give advice.",
  "pillars_insight": "Four Pillars interpretation (150-200 words): Year = ancestors & early life, Month = career & society, Day = self & spouse, Hour = children & later life. Analyze the elemental interactions between pillars.",
  "wuxing_narrative": "Five Elements narrative (100-150 words): Describe the elemental distribution poetically, like painting a portrait of their energy. No advice.",
  "strength_explanation": "Strength analysis (100-150 words): Explain why they are ${chart.strength}, what this means as a life quality. No advice."
}

⚠️ IMPORTANT:
1. ONLY analyze and describe. NO actionable advice (colors, directions, careers, health - those are paid content)
2. Professional yet warm tone
3. Base everything on the specific chart data
4. Return pure JSON only, no markdown`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'AI analysis error' });
    }

    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json\s?|```/g, '').trim();
    const enriched = JSON.parse(clean);

    res.status(200).json({ enriched });
  } catch (err) {
    console.error('Enrich error:', err);
    res.status(500).json({ error: err.message });
  }
};
