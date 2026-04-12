// api/enrich.js — Claude API 深度命理分析
// 注入完整十神知识库 + 四柱时空 + 合冲刑害 + 过旺缺失

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { chart, analysis, dayun, lang, isPaid } = req.body;
    if (!chart) return res.status(400).json({ error: 'No chart data' });

    const isZh = lang !== 'en';
    const prompt = isZh ? buildZhPrompt(chart, analysis || {}, dayun, isPaid) : buildEnPrompt(chart, analysis || {}, dayun, isPaid);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
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

function buildZhPrompt(chart, a, dayun, isPaid) {
  return `你是一位拥有30年经验的八字命理大师,文笔兼具古典韵味与现代洞察力。请根据以下命盘数据和分析引擎的原始结果,生成专业深度的命理报告。

最重要的规则(必须严格遵守):
1. 后端计算的四柱、五行、身强弱、喜用忌神都是已确定事实,不可修改
2. 基于这些事实+十神知识体系,生成有深度、有洞察、有共鸣的分析
3. 每段分析必须引用具体命盘数据(天干地支、十神、五行比例),不可泛泛而谈
4. 结合四柱宫位时空含义(年柱=祖辈早年,月柱=事业社会,日柱=自我配偶,时柱=子女晚年)
5. 免费板块(personality/career/relationship/health/dayun_detail)只做分析和描述,绝对不给任何建议、策略、推荐、指导。所有建议类内容只放在付费板块(use_god_guide/career_detail/relationship_detail/health_detail)

=== 命盘确定事实 ===
日主:${chart.day_master}(${chart.day_master_element})
身强弱:${chart.strength}(评分${chart.score||''})
四柱:年${chart.year_pillar} 月${chart.month_pillar} 日${chart.day_pillar} 时${chart.hour_pillar}
藏干:${chart.hidden_stems||''}
十神:年干${chart.year_god} 月干${chart.month_god} 时干${chart.hour_god}
五行:${chart.wuxing_summary}
喜用神:${chart.use_gods}
忌神:${chart.avoid_gods}
空亡:${chart.kong_wang||'无'}
神煞:${chart.shen_sha||''}
性别:${chart.gender==='F'?'女':'男'}
调候用神:${chart.tiaohuo||''}

=== 后端分析引擎原始结果(需要深度扩展) ===
性格:${a.personality||''}
事业:${a.career||''}
财运:${a.wealth||''}
感情:${a.relationship||''}
健康:${a.health||''}
格局:${a.pattern_analysis||''}
用神详解:${a.use_god_summary||''}

=== 大运信息 ===
${chart.dayun_info||''}

=== 十神四柱解读核心知识 ===
年柱=1-16岁/祖辈/早年环境; 月柱=17-32岁/父母/事业; 日柱=33-48岁/自我/配偶/婚姻宫; 时柱=49岁后/子女/晚年

正印:学业保护贵人;年柱=家境好受母影响;月柱=人际好有书卷气;日柱=配偶按父母意愿;时柱=子女聪明晚年好
偏印:玄学天赋孤独创意;年柱=思想不被理解;月柱=悲观但有深度;日柱=择偶极端;时柱=子女有特殊才能
食神:才华口福享乐;年柱=聪明学东西快;月柱=乐天随和好脾气;日柱=重精神享受纯爱;时柱=晚年安逸子女乖
伤官:才华锋芒叛逆;年柱=父母差异大;月柱=与父母冲突多有艺术天赋;日柱=感情起伏;时柱=子女难管教
正官:工作压力责任;年柱=教育严格;月柱=按预期走事业体面;日柱=家庭稳定;时柱=子女孝顺
七杀:挑战魄力小人;年柱=独立自强;月柱=掌控欲强领导力;日柱=相爱相杀;时柱=子女叛逆但有成
比肩:独立竞争朋友;年柱=靠自己力量;月柱=女命事业型;日柱=配偶独立进取;时柱=晚年体力透支
劫财:破财赌博社交;年柱=祖业一般;月柱=占有欲强好面子;日柱=缺安全感;时柱=子女关系浅
正财:合法收入稳定;年柱=有家产;月柱=看重积累理财强;日柱=所爱之人;时柱=晚年富足
偏财:意外之财人脉;年柱=祖辈经商;月柱=学生创业;日柱=为异性花钱;时柱=大器晚成

缺财星:不为钱活/父亲缘浅/男命异性缘一般
缺官杀:追求自由/不守规则/女命难遇适合另一半
缺印星:学非所用/缺稳定性/母亲贵人交集少
缺比劫:自主意识差/喜独来独往
缺食伤:不善表达/低调安静/行事专一

分析要点:合化(天干五合、地支六合三合)、冲克、刑害、墓库(辰戌丑未)、空亡影响

=== 请生成(JSON格式) ===
{
  "personality": "性格特质深度分析(400-500字):从日主${chart.day_master}${chart.day_master_element}本质出发。逐一分析年干${chart.year_god}在年柱含义、月干${chart.month_god}在月柱含义、时干${chart.hour_god}在时柱含义。分析十神过旺或缺失。分析四柱合冲关系对性格的影响。分析早年(年柱)、青年(月柱)、中年(日柱)、晚年(时柱)的人生轨迹。要让人觉得被看透。",

  "career": "事业与财运命局分析(400-500字):从月柱(事业宫)十神组合分析天生的事业类型和发展模式。分析命局中财星(正财偏财)的有无多寡,判断先天赚钱模式和财运特征。分析食伤生财或官印相生的格局是否存在及其含义。身${chart.strength}对事业的影响。分析正官七杀与事业野心的关系。注意:只做命局分析,不给具体行业推荐和策略建议。",

  "relationship": "感情与婚姻深度分析(400-500字):从日柱(夫妻宫)十神分析感情模式。${chart.gender==='F'?'女命以官杀为夫星,分析官杀在四柱位置和状态,正官=正缘/七杀=情人':'男命以财星为妻星,分析财星在四柱位置和状态'}。分析配偶宫(日支)五行和藏干暗示的配偶特征。分析空亡对婚姻的影响。分析桃花星和感情相关神煞。分析感情模式和婚姻特征。注意:只分析命局中的感情特征,不给择偶建议和感情策略。",

  "health": "健康体质命局分析(300-400字):基于五行${chart.wuxing_summary}分析先天体质类型。木=肝胆/火=心脑/土=脾胃/金=肺肠/水=肾膀胱。分析过旺和偏弱五行对应的健康风险区域。七杀在哪个五行那里容易得病。注意:只分析体质特征和风险,不给养生运动饮食建议。",

  "dayun_detail": "当前大运命局分析(300-400字):${chart.dayun_info||'分析当前大运'}。核心原理:大运运支代替月令重新看运盘,旺衰和喜用随大运变化。分析当前大运十神含义、与原局合冲关系、对事业财运感情健康各方面的影响和变化趋势。注意:只做趋势分析,不给策略建议。"${isPaid ? `,

  "use_god_guide": "喜用神实操指南(300-400字):基于喜用${chart.use_gods}:1)幸运颜色(每个喜用对应3-4个具体色名+穿搭建议)2)有利方位(居住办公)3)有利季节4)日常调理5)择偶五行匹配",

  "career_detail": "事业深度策略(200-300字):具体行业推荐(按五行)、创业vs打工、合伙注意、投资方向、房地产时机",

  "relationship_detail": "感情深度建议(200-300字):最佳配偶特征、感情经营、桃花提升、婚姻时机",

  "health_detail": "养生深度指南(200-300字):运动建议、饮食方向、重点检查器官、精神健康"` : ''}
}

返回纯JSON,不要markdown。`;
}

function buildEnPrompt(chart, a, dayun, isPaid) {
  return `You are a master BaZi analyst with 30 years of experience. Generate comprehensive analysis.

RULES: All calculations are CONFIRMED FACTS. Reference specific chart data in every paragraph.
Four Pillar positions: Year=ancestors/childhood, Month=career, Day=self/spouse, Hour=children/late life

CHART: Day Master ${chart.day_master}(${chart.day_master_element}), Strength ${chart.strength}
Pillars: Y${chart.year_pillar} M${chart.month_pillar} D${chart.day_pillar} H${chart.hour_pillar}
Ten Gods: Y-${chart.year_god} M-${chart.month_god} H-${chart.hour_god}
Elements: ${chart.wuxing_summary} | Favorable: ${chart.use_gods} | Avoid: ${chart.avoid_gods}
Gender: ${chart.gender==='F'?'Female':'Male'} | Void: ${chart.kong_wang||'None'}

Analysis to expand: personality:${a.personality||''} career:${a.career||''} relationship:${a.relationship||''} health:${a.health||''}
Dayun: ${chart.dayun_info||''}

GENERATE (JSON):
{
  "personality": "Deep personality (400-500 words): Day Master + Ten Gods in each pillar + combinations/clashes + life trajectory by pillar.",
  "career": "Career & wealth (400-500 words): Industries by favorable elements, wealth star analysis, business vs employment.",
  "relationship": "Relationship (400-500 words): Spouse palace, marriage stars, compatibility, timing.",
  "health": "Health (300-400 words): Five element organs, constitution, wellness.",
  "dayun_detail": "Current luck period (300-400 words): How it transforms the chart."${isPaid ? `,
  "use_god_guide": "Practical guide (300-400 words): Colors, directions, seasons.",
  "career_detail": "Career strategy (200-300 words)",
  "relationship_detail": "Relationship advice (200-300 words)",
  "health_detail": "Wellness guide (200-300 words)"` : ''}
}
Return pure JSON only.`;
}
