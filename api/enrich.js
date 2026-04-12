// api/enrich.js — Claude API 全报告深度润色
// 后端数据为事实基础，Claude只负责润色文字，不改变计算结果

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { chart, analysis, lang, isPaid } = req.body;
    if (!chart) return res.status(400).json({ error: 'No chart data' });

    const isZh = lang !== 'en';
    const existingAnalysis = analysis || {};

    const prompt = isZh ? buildZhPrompt(chart, existingAnalysis, isPaid) : buildEnPrompt(chart, existingAnalysis, isPaid);

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
      return res.status(502).json({ error: 'AI enrichment error' });
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

function buildZhPrompt(chart, analysis, isPaid) {
  return `你是一位资深八字命理师，文笔兼具古典韵味与现代洞察力。请根据以下八字命盘的【确定事实】，为每个板块生成深入、有温度的分析文字。

⚠️ 最重要的规则：
1. 所有计算结果（四柱、五行比例、身强弱、喜用忌神）都是已确定的事实，你不能修改或质疑
2. 你的任务是：基于这些事实，写出有深度、有共鸣、有文化底蕴的分析
3. 每段分析必须引用具体的命盘数据（天干地支、十神、五行），不要泛泛而谈
4. 语气温和专业，像是一位智慧长者在为你娓娓道来

═══ 命盘事实 ═══
日主：${chart.day_master}（${chart.day_master_element}）
身强弱：${chart.strength}
四柱：年${chart.year_pillar} 月${chart.month_pillar} 日${chart.day_pillar} 时${chart.hour_pillar}
十神：年干${chart.year_god} 月干${chart.month_god} 时干${chart.hour_god}
五行：${chart.wuxing_summary}
喜用神：${chart.use_gods}
忌神：${chart.avoid_gods}
空亡：${chart.kong_wang || '无'}
性别：${chart.gender === 'F' ? '女' : '男'}

已有分析（需要润色扩充）：
性格：${analysis.personality || '无'}
事业：${analysis.career || '无'}
感情：${analysis.relationship || '无'}
健康：${analysis.health || '无'}
财运：${analysis.wealth || '无'}

═══ 请生成（JSON格式）═══
{
  "wuxing_narrative": "五行能量叙事（80-120字）：用优美的语言描述此人五行分布特征，像在描绘一幅命运画卷。",
  "strength_detail": "身强弱详解（100-150字）：解释为什么是${chart.strength}，三个维度（得令、得地、得势）的具体情况，以及这种状态的生命特质。",
  "personality": "性格深度分析（250-350字）：从日主${chart.day_master}${chart.day_master_element}的本质特征出发，结合月干${chart.month_god}、年干${chart.year_god}、时干${chart.hour_god}的十神影响，分析性格底色、思维方式、为人处世。要有洞察力，让人觉得'被看透了'。",
  "career": "事业财运分析（200-300字）：基于喜用神${chart.use_gods}分析适合的事业方向和赚钱模式。注意身${chart.strength}的人有什么样的事业特点。",
  "relationship": "感情婚姻分析（200-300字）：基于命盘中的夫妻宫（日支）、婚姻星等分析感情模式和婚姻特点。${chart.gender === 'F' ? '女命以官杀为夫星' : '男命以财星为妻星'}。",
  "health": "健康养生分析（150-200字）：基于五行分布${chart.wuxing_summary}分析体质特点和需要关注的健康领域。五行对应器官（木-肝胆，火-心脑，土-脾胃，金-肺肠，水-肾膀胱）。"${isPaid ? `,
  "use_god_guide": "喜用神实操指南（200-250字）：基于喜用${chart.use_gods}和忌神${chart.avoid_gods}，给出具体的幸运颜色（每个喜用对应3-4个具体颜色名）、有利方位、有利季节、日常调理建议。",
  "career_detail": "事业深度建议（150-200字）：具体行业推荐、事业策略、合作模式建议。",
  "relationship_detail": "感情深度建议（150-200字）：择偶方向、感情经营策略、桃花运提升方法。",
  "health_detail": "健康深度建议（150-200字）：具体养生方法、运动建议、饮食方向。"` : ''}
}

返回纯JSON，不要markdown。`;
}

function buildEnPrompt(chart, analysis, isPaid) {
  return `You are a senior BaZi (Four Pillars of Destiny) analyst with elegant, insightful writing. Generate deep analysis based on the CONFIRMED FACTS below.

⚠️ CRITICAL RULES:
1. All calculations (pillars, elements, strength, favorable elements) are CONFIRMED FACTS — do not modify or question them
2. Your job: write deep, resonant, culturally rich analysis based on these facts
3. Each section must reference specific chart data (stems, branches, ten gods, elements)
4. Tone: professional yet warm, like a wise mentor sharing insights

═══ CHART FACTS ═══
Day Master: ${chart.day_master} (${chart.day_master_element})
Strength: ${chart.strength}
Pillars: Year ${chart.year_pillar}, Month ${chart.month_pillar}, Day ${chart.day_pillar}, Hour ${chart.hour_pillar}
Ten Gods: Year ${chart.year_god}, Month ${chart.month_god}, Hour ${chart.hour_god}
Five Elements: ${chart.wuxing_summary}
Favorable: ${chart.use_gods}
Unfavorable: ${chart.avoid_gods}
Void: ${chart.kong_wang || 'None'}
Gender: ${chart.gender === 'F' ? 'Female' : 'Male'}

Existing analysis to expand:
Personality: ${analysis.personality || 'N/A'}
Career: ${analysis.career || 'N/A'}
Relationship: ${analysis.relationship || 'N/A'}
Health: ${analysis.health || 'N/A'}

═══ GENERATE (JSON) ═══
{
  "wuxing_narrative": "Five Elements narrative (80-120 words): Describe the elemental distribution poetically.",
  "strength_detail": "Strength analysis (100-150 words): Why they are ${chart.strength}, what this means.",
  "personality": "Deep personality (250-350 words): From Day Master traits + Ten Gods influence. Be insightful.",
  "career": "Career & wealth (200-300 words): Based on favorable elements ${chart.use_gods}.",
  "relationship": "Relationship (200-300 words): Based on spouse palace and marriage stars.",
  "health": "Health (150-200 words): Based on Five Elements distribution."${isPaid ? `,
  "use_god_guide": "Practical guide (200-250 words): Lucky colors (3-4 specific colors per element), directions, seasons.",
  "career_detail": "Career deep advice (150-200 words): Specific industries, strategies.",
  "relationship_detail": "Relationship advice (150-200 words): Partner selection, relationship tips.",
  "health_detail": "Health advice (150-200 words): Exercise, diet, wellness strategies."` : ''}
}

Return pure JSON only.`;
}
