/**
 * KES 命元之钥 — 报告渲染引擎 v2
 * 表单 → API → 报告页18个section渲染
 */

const KES_API = 'https://web-production-11af.up.railway.app';

// ─── 五行映射 ───
const WX_CLS = {'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};
const S_WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
const B_WX = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
const SS_CLS = {'比肩':'bijian','劫财':'jiecai','食神':'shishen','伤官':'shangguan','偏财':'piancai','正财':'zhengcai','七杀':'qisha','正官':'zhengguan','偏印':'pianyin','正印':'zhengyin','日主':'rizhu'};
const HOUR_MAP = {'子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20,'亥':22};

// ─── 工具函数 ───
function $(id){ return document.getElementById(id); }
function html(id, v){ var e=$(id); if(e) e.innerHTML=v; }
function txt(id, v){ var e=$(id); if(e) e.textContent=v; }

// ═══════════════════════════════════════════════
//  表单提交
// ═══════════════════════════════════════════════

async function submitReading(){
  var y = +$('birthYear').value;
  var m = +$('birthMonth').value;
  var d = +$('birthDay').value;
  var hBr = ($('birthHour')||{}).value;
  var gender = $('gM').classList.contains('on') ? 'M' : 'F';
  var city = ($('cityInput')||{}).value || '';
  var resCity = ($('residenceCity')||{}).value || '';

  if(!y||!m||!d||!hBr){ alert('请填写完整的出生信息'); return; }

  var hour = HOUR_MAP[hBr]; if(hour===undefined) hour=12;
  var ci = document.getElementById("cityInput"); var cityData = {lon: parseFloat(ci.dataset.lon||"121.47"), lat: parseFloat(ci.dataset.lat||"31.23"), tz: Math.round(parseFloat(ci.dataset.lon||"121.47")/15), name: ci.value||city};

  var btn = document.querySelector('.f-btn');
  var orig = btn.textContent;
  btn.textContent = '排盘计算中…'; btn.disabled = true;

  try {
    var res = await fetch(KES_API + '/api/calculate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        birth_year:y, birth_month:m, birth_day:d,
        birth_hour:hour, birth_minute:0,
        timezone_offset_hours: cityData.tz||8,
        longitude: cityData.lon||121.47,
        latitude: cityData.lat||31.23,
        gender: gender,
        birth_city: cityData.name||city,
        residence_city: resCity,
        country: 'CN',
      }),
    });
    if(!res.ok) throw new Error(await res.text());
    var data = await res.json();
    renderReport(data, {y,m,d,hBr,gender,city:cityData.name||city,resCity});
    goPage('report');
  } catch(e) {
    console.error(e);
    alert('排盘出错：' + e.message);
  } finally {
    btn.textContent = orig; btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════
//  主渲染
// ═══════════════════════════════════════════════

function renderReport(d, meta){
  var p = d.pillars, ds = p.day.stem, wx = d.meta.day_master_wx;
  var c = WX_CLS[wx];

  // 基本信息
  html('rpt-gender', '<b>'+d.meta.gender_label+'</b>');
  txt('rpt-birth', d.meta.birth+' '+d.meta.birth_hour_branch+'时');
  html('rpt-daymaster', '<b class="e-'+c+'">'+ds+wx+'</b>');
  txt('rpt-birthplace', d.meta.birth_city||'—');
  txt('rpt-residence', d.meta.residence_city||'—');
  var corr = d.time.total_correction;
  txt('rpt-solar', (corr>=0?'+':'')+corr+'分钟');

  // 01 四柱
  r01_pillars(p, d.hidden_stems, d.ten_gods, d.kong_wang);
  // 02 干支关系
  r02_relations(d.relations);
  // 03 五行
  r03_wuxing(d.wuxing);
  // 04 空亡
  r04_kongwang(d.kong_wang);
  // 05 神煞
  r05_shensha(d.shen_sha);
  // 06 身强弱
  r06_strength(d.strength, d.pattern, ds, wx);
  // 07 喜忌用神
  r07_yongshen(d.yongshen);
  // 08 性格
  r08_personality(d.personality, ds, wx);
  // 09 核心作用
  r09_interactions(d.relations);
  // 10 感情
  r10_love(d.relationship);
  // 11 子女
  txt('rpt-children', d.children || '');
  // 12 事业财运
  r12_career(d.career, d.fortune_stages);
  // 13 健康
  r13_health(d.health);
  // 14 大运
  r14_dayun(d.dayun, meta.gender);
  // 15 流年流月
  r15_liunian(d.liunian, d.liuyue);
  // 16 预警
  r16_warnings(d.warnings);
  // 17 逐年
  r17_tenyears(d.ten_years, d.dayun);
  // 18 建议
  r18_recommendations(d.career, d.recommendations);
}

// ═══════════════════════════════════════════════
//  各Section渲染
// ═══════════════════════════════════════════════

// 01 四柱
function r01_pillars(p, hidden, gods, kw){
  var pos = ['year','month','day','hour'];
  var labels = ['年　柱','月　柱','日　柱','时　柱'];
  var kongSet = new Set((kw.day_kong||[]).concat(kw.year_kong||[]));
  var h = '';
  pos.forEach(function(k,i){
    var stem=p[k].stem, branch=p[k].branch;
    var sc=WX_CLS[S_WX[stem]], bc=WX_CLS[B_WX[branch]];
    var isDay = k==='day';
    var god = isDay ? '日主' : (gods[k]||{}).stem_god||'';
    var ssCls = SS_CLS[god]||'rizhu';
    var dayCls = isDay ? ' r-day-'+sc : '';
    var kongMark = kongSet.has(branch) ? '<span class="r-kong">空亡</span>' : '';
    var hh = (hidden[k]||[]).map(function(s){
      return '<span class="r-pillar-h e-'+WX_CLS[S_WX[s]]+'">'+s+'</span>';
    }).join('');
    h += '<div class="r-pillar'+dayCls+'"><div class="r-pillar-pos">'+labels[i]+'</div><div class="r-pillar-ss r-ss-'+ssCls+'">'+god+'</div><div class="r-pillar-gz"><span class="e-'+sc+'">'+stem+'</span><span class="e-'+bc+'">'+branch+'</span></div><div class="r-pillar-hidden">'+hh+'</div>'+kongMark+'</div>';
  });
  html('rpt-pillars', h);
}

// 02 干支关系
function r02_relations(rel){
  var h1='';
  (rel.pillar_combos||[]).forEach(function(c){
    h1 += '<div class="r-tbl-row" style="grid-template-columns:36px 48px 1fr 1fr"><div>'+c.pos+'</div><div>'+c.gz+'</div><div>'+c.type+'</div><div style="color:var(--t3)">'+c.note+'</div></div>';
  });
  html('rpt-gz-inner', h1);

  var h2='';
  var all = (rel.tiangan_rels||[]).concat(rel.dizhi_rels||[]);
  all.forEach(function(r){
    h2 += '<div class="r-tbl-row" style="grid-template-columns:1fr 1fr 1fr"><div>'+r.involved+'</div><div>'+r.type+'</div><div style="color:var(--t3)">'+(r.note||'')+'</div></div>';
  });
  html('rpt-gz-inter', h2 || '<div class="r-tbl-row" style="grid-template-columns:1fr"><div style="color:var(--t3)">无特殊柱间关系</div></div>');
  if(rel.no_relations_note) txt('rpt-gz-note', rel.no_relations_note);
}

// 03 五行
function r03_wuxing(wx){
  var order=['木','火','土','金','水'];
  var total=0, max=0;
  order.forEach(function(e){total+=wx[e]||0; max=Math.max(max,wx[e]||0)});
  if(!total)total=1; if(!max)max=1;
  var h='';
  order.forEach(function(e){
    var v=wx[e]||0, pct=Math.round(v/total*100), w=Math.round(v/max*100);
    var c=WX_CLS[e];
    var st = pct>=35?'旺':pct>=20?'相':pct>=8?'中':pct>=3?'弱':'死';
    h += '<div class="r-wx"><div class="r-wx-char e-'+c+'">'+e+'</div><div class="r-wx-bar-wrap"><div class="r-wx-bar" style="width:'+w+'%;background:var(--'+c+')"></div></div><div class="r-wx-pct e-'+c+'">'+pct+'%</div><div class="r-wx-status">'+st+'</div></div>';
  });
  html('rpt-wuxing', h);
}

// 04 空亡
function r04_kongwang(kw){
  var h='';
  if(kw.day_kong&&kw.day_kong.length)
    h += '<div class="r-warn w-blue"><div class="r-warn-title">日空亡：'+kw.day_kong.join('、')+'</div><div class="r-warn-body">空亡地支虚而不实，所对应的十神和宫位力量减弱。</div></div>';
  if(kw.year_kong&&kw.year_kong.length)
    h += '<div class="r-warn w-blue"><div class="r-warn-title">年空亡：'+kw.year_kong.join('、')+'</div><div class="r-warn-body">年空亡影响祖上和早年运势。</div></div>';
  html('rpt-kongwang', h||'<div style="color:var(--t3);font-size:13px">无显著空亡影响</div>');
}

// 05 神煞
function r05_shensha(sha){
  var entries = Object.entries(sha||{}).filter(function(kv){return kv[1]&&kv[1].length});
  if(!entries.length){ var sec=$('rpt-shensha-sec'); if(sec) sec.style.display='none'; return; }
  var sec=$('rpt-shensha-sec'); if(sec) sec.style.display='';
  var h='';
  entries.forEach(function(kv){
    var name=kv[0], pos=kv[1];
    h += '<div class="r-warn w-gold"><div class="r-warn-title">'+name+'</div><div class="r-warn-body">位于 '+(Array.isArray(pos)?pos.join('、'):pos)+'</div></div>';
  });
  html('rpt-shensha', h);
}

// 06 身强弱
function r06_strength(s, pat, ds, wx){
  var levels=['极弱','偏弱','中和','偏强','身强'];
  var idx = levels.indexOf(s.verdict); if(idx<0) idx=1;
  var segs = document.querySelectorAll('#rpt-meter .r-meter-seg');
  var labs = document.querySelectorAll('#rpt-meter .r-meter-labels span');
  segs.forEach(function(seg,i){seg.className='r-meter-seg';if(i<=idx)seg.classList.add('filled');if(i===idx)seg.classList.add('active')});
  labs.forEach(function(l,i){l.className='';if(i===idx)l.classList.add('on')});
  txt('rpt-verdict', s.verdict);
  txt('rpt-verdict-explain', '得令：'+(s.de_ling?'✓':'✗')+'　得地：'+(s.de_di?'✓':'✗')+'　得势：'+(s.de_shi?'✓':'✗'));

  var strH='';
  [{k:'得　令',v:s.de_ling,d:s.ling_detail},{k:'得　地',v:s.de_di,d:s.di_detail},{k:'得　势',v:s.de_shi,d:s.shi_detail}].forEach(function(x){
    strH += '<div class="r-str-item"><div class="r-str-label">'+x.k+'</div><div class="r-str-val '+(x.v?'yes':'no')+'">'+(x.v?'已得':'未得')+'</div><div class="r-str-detail">'+x.d+'</div></div>';
  });
  html('rpt-strength', strH);

  if(pat) html('rpt-pattern', '<b>格局：'+pat.name+'（'+pat.status+'）</b><br>'+pat.description);
}

// 07 喜忌用神
function r07_yongshen(ys){
  function chars(arr){
    return (arr||[]).map(function(x){
      var w=x.wuxing, c=WX_CLS[w]||'tu';
      return '<span class="r-yj-char '+c+'">'+w+'</span>';
    }).join('');
  }
  html('rpt-yongshen',
    '<div class="r-yj-card"><div class="r-yj-label">喜用神</div><div class="r-yj-chars">'+chars(ys.xi)+'</div></div>'+
    '<div class="r-yj-card"><div class="r-yj-label">忌　神</div><div class="r-yj-chars">'+chars(ys.ji)+'</div></div>'+
    '<div class="r-yj-card"><div class="r-yj-label">调候用神</div><div class="r-yj-chars">'+(ys.tiaohuo||[]).map(function(t){return '<span class="r-yj-char '+WX_CLS[S_WX[t]]+'">'+t+'</span>';}).join('')+'</div></div>'
  );
  if(ys.tiaohuo_note) html('rpt-tiaohuo', ys.tiaohuo_note+'<br><br><span style="color:var(--t4)">调候用神是根据日主出生季节寒暖燥湿而定的平衡用神。出生于酷热之月需水润之，严寒之月需火暖之。</span>');
}

// 08 性格
function r08_personality(per, ds, wx){
  if(!per) return;
  var c = WX_CLS[wx];
  html('rpt-elemid', '<div class="r-elem-icon '+c+'">'+ds+'</div><div><div class="r-elem-id-name">'+ds+' · '+wx+'命</div><div class="r-elem-id-desc">'+STEM_PERSONALITY[ds]+'</div></div>');
  if(per.quote) html('rpt-quote', '<div class="r-pq-text">'+per.quote+'</div><div class="r-pq-src">'+per.quote_src+'</div>');

  var h = '<p>'+per.intro.replace(/\n\n/g,'</p><p>')+'</p>';
  if(per.traits&&per.traits.length){
    h += '<table style="width:100%;border-collapse:collapse;margin-top:16px">';
    per.traits.forEach(function(t){
      h += '<tr><td style="padding:8px 0;border-bottom:1px solid var(--line);font-weight:600;white-space:nowrap;width:60px;vertical-align:top">'+t.layer+'</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid var(--line);color:var(--t2)">'+t.text+'</td></tr>';
    });
    h += '</table>';
  }
  html('rpt-personality', h);
}

var STEM_PERSONALITY = {'甲':'参天大树','乙':'小草藤蔓','丙':'太阳之火','丁':'灯烛之火','戊':'大地之土','己':'田园之土','庚':'刀剑之金','辛':'首饰之金','壬':'江河之水','癸':'雨露之水'};

// 09 核心作用
function r09_interactions(rel){
  var h = '';
  var all = (rel.tiangan_rels||[]).concat(rel.dizhi_rels||[]);
  if(!all.length){ html('rpt-interactions','<p>命局干支关系简单，无特殊合冲刑害。</p>'); return; }
  all.forEach(function(r){
    h += '<p><b>'+r.type+'（'+r.involved+'）</b>'+(r.note?'——'+r.note:'')+'</p>';
  });
  html('rpt-interactions', h);
}

// 10 感情
function r10_love(rel){
  if(!rel) return;
  var h = '';
  if(rel.spouse_star) h += '<p><b>配偶星</b>——'+rel.spouse_star+'</p>';
  if(rel.kong_note) h += '<p>'+rel.kong_note+'</p>';
  if(rel.palace) h += '<p><b>配偶宫</b>——'+rel.palace+'</p>';
  if(rel.marriage) h += '<p><b>婚姻</b>——'+rel.marriage+'</p>';
  html('rpt-love', h);
}

// 12 事业财运
function r12_career(career, stages){
  if(!career) return;
  html('rpt-career', '<p>'+career.career+'</p>'+(career.wealth_note?'<p>'+career.wealth_note+'</p>':''));
  if(stages&&stages.length){
    var h='';
    stages.forEach(function(s){
      h += '<div class="r-tbl-row" style="grid-template-columns:80px 60px 1fr"><div>'+s.age+'</div><div style="font-weight:700">'+s.gz+'</div><div>'+s.note+'</div></div>';
    });
    html('rpt-fortune-tbl', '<div class="r-tbl-head" style="grid-template-columns:80px 60px 1fr"><div>阶段</div><div>大运</div><div>财运</div></div>'+h);
  }
}

// 13 健康
function r13_health(items){
  if(!items||!items.length) return;
  var h='';
  items.forEach(function(x){
    h += '<div class="r-hc"><div class="r-hc-title">'+x.part+'</div><div class="r-hc-body">'+x.reason+'</div></div>';
  });
  html('rpt-health', h);
  html('rpt-health-note', '大运走喜用神五行运时身体好，走忌神运时容易生病。');
}

// 14 大运
function r14_dayun(dayun, gender){
  txt('rpt-dayun-sub', (dayun.is_forward?'顺行':'逆行')+'　起运约'+dayun.onset_age+'岁');
  var h='';
  (dayun.periods||[]).forEach(function(d){
    var isCur = (d.start_age<=dayun.current_age && dayun.current_age<=d.end_age);
    h += '<div class="r-dy-item'+(isCur?' cur':'')+'">'+(isCur?'<div class="r-dy-label">当前</div>':'')+'<div class="r-dy-gz"><span class="e-'+WX_CLS[S_WX[d.stem]]+'">'+d.stem+'</span><span class="e-'+WX_CLS[B_WX[d.branch]]+'">'+d.branch+'</span></div><div class="r-dy-age">'+d.start_age+'-'+d.end_age+'岁</div></div>';
  });
  html('rpt-dayun-scroll', h);

  // 当前大运详情
  var cur = dayun.current;
  if(cur){
    html('rpt-dayun-summary',
      '<div class="r-dy-summary-h">'+cur.stem+cur.branch+'大运（'+cur.ten_god_stem+'）</div>'+
      '<div class="r-dy-summary-sub">'+cur.start_age+'-'+cur.end_age+'岁 · '+(cur.keyword||'')+'</div>'+
      '<div style="font-size:var(--fs-sm);color:var(--t2);line-height:1.8">'+(cur.summary||'')+'</div>'
    );
  }
}

// 15 流年流月
function r15_liunian(ln, months){
  if(!ln) return;
  txt('rpt-liunian-title', ln.year+'年 '+ln.gz+'年运势');
  txt('rpt-liunian-sub', ln.gz+'年');

  var sumH = '';
  (ln.summary||[]).forEach(function(p){ if(p) sumH += '<p>'+p+'</p>'; });
  html('rpt-liunian-detail', '<div class="r-ly-body">'+sumH+'</div>');

  if(months&&months.length){
    var h = '<div class="r-tbl-head r-tbl-3"><div>月份</div><div>干支</div><div>运势概要</div></div>';
    months.forEach(function(m){
      h += '<div class="r-tbl-row r-tbl-3"><div class="r-a-year">'+m.start_date+'</div><div class="r-a-gz"><span class="e-'+WX_CLS[S_WX[m.stem]]+'">'+m.stem+'</span><span class="e-'+WX_CLS[B_WX[m.branch]]+'">'+m.branch+'</span></div><div class="r-a-body"><div class="r-a-note">'+m.stem_god+(m.text?' · '+m.text:'')+'</div></div></div>';
    });
    html('rpt-liuyue-tbl', h);
  }
}

// 16 预警
function r16_warnings(warnings){
  if(!warnings||!warnings.length) return;
  var h='';
  warnings.forEach(function(w){
    var cls = w.level==='red'?'w-red':w.level==='blue'?'w-blue':'w-gold';
    h += '<div class="r-warn '+cls+'"><div class="r-warn-title">'+w.title+'</div><div class="r-warn-body">'+w.body+'</div></div>';
  });
  html('rpt-warnings', h);
}

// 17 逐年
function r17_tenyears(years, dayun){
  if(!years||!years.length) return;
  var cur = dayun.current;
  if(cur) txt('rpt-10yr-title', cur.stem+cur.branch+'大运逐年提示');
  var h = '<div class="r-tbl-head" style="grid-template-columns:52px 52px 60px 1fr"><div>年份</div><div>干支</div><div>十神</div><div>要点</div></div>';
  years.forEach(function(yr){
    var bold = yr.flags&&yr.flags.length ? ' style="font-weight:600"':'';
    h += '<div class="r-tbl-row"'+bold+' style="grid-template-columns:52px 52px 60px 1fr"><div>'+yr.year+'</div><div><span class="e-'+WX_CLS[S_WX[yr.stem]]+'">'+yr.stem+'</span><span class="e-'+WX_CLS[B_WX[yr.branch]]+'">'+yr.branch+'</span></div><div>'+yr.stem_god+'</div><div class="r-a-note">'+yr.text+(yr.flags.length?' <b>'+yr.flags.join('、')+'</b>':'')+'</div></div>';
  });
  html('rpt-10yr-tbl', h);
}

// 18 建议
function r18_recommendations(career, rec){
  if(!rec) return;
  // 生财
  html('rpt-rec-wealth', career&&career.wealth_note ? career.wealth_note : '根据喜用五行调整理财方向。');
  // 感情
  html('rpt-rec-love', '根据配偶星和配偶宫综合判断。接受伴侣特质，善用互补优势。');
  // 行业
  var indH='';
  (rec.industries_xi||[]).forEach(function(x){
    indH += '<div style="margin-bottom:8px"><span style="font-size:10px;color:var(--t4)">喜·'+x.wuxing+'</span><br>'+x.items.join('、')+'</div>';
  });
  html('rpt-rec-industry', indH||'参考喜用五行选择行业方向。');
  // 城市
  var cityH='';
  (rec.cities||[]).forEach(function(c){
    cityH += '<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--t4)">'+c.direction+'</span><br>'+c.cities.join('、')+'</div>';
  });
  html('rpt-rec-location', cityH||'优先选择喜用五行方位的城市。');
  // 颜色
  var colH='<div class="r-rec-swatches">';
  (rec.color_xi||[]).forEach(function(c){
    colH += '<div class="r-rec-swatch" style="background:var(--'+WX_CLS[c.wuxing]+'-bg)"><div class="r-rec-sw-label" style="color:var(--'+WX_CLS[c.wuxing]+')">'+c.wuxing+'·喜</div><div class="r-rec-sw-names">'+c.colors.join('、')+'</div></div>';
  });
  colH += '</div>';
  html('rpt-rec-color', colH);
  // 健康
  html('rpt-rec-health', '关注五行偏枯对应的脏腑，走忌神运时加强保养。');
}
