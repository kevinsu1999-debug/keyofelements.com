/**
 * KES · kes-report.js v3
 * 表单 → Railway API → 报告16个section渲染
 */
var KES_API='https://web-production-11af.up.railway.app';
var WC={'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};
var SW={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
var BW={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
var SC={'比肩':'bijian','劫财':'jiecai','食神':'shishen','伤官':'shangguan','偏财':'piancai','正财':'zhengcai','七杀':'qisha','正官':'zhengguan','偏印':'pianyin','正印':'zhengyin','日主':'rizhu'};
var HM={'子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20,'亥':22};
var SHENSHA_MEAN={'天乙贵人':'一生有贵人扶持之象，逢凶化吉。遇到困难时容易获得他人帮助','华盖':'命主有独处倾向，对哲学、玄学、文化艺术有天然兴趣，喜欢深度思考','桃花':'异性缘较旺，注重外在形象和人际交往，感情方面较为活跃','驿马':'一生走动较多，适合从事需要出差或异地发展的事业','禄神':'先天衣食无忧之象，该地支所在宫位有稳定的福禄','羊刃':'性格刚烈果断，做事有魄力但也容易冲动。注意健康和人际'};
var STEM_DESC={'甲':'参天大树','乙':'小草藤蔓','丙':'太阳之火','丁':'灯烛之火','戊':'大地之土','己':'田园之土','庚':'刀剑之金','辛':'首饰之金','壬':'江河之水','癸':'雨露之水'};

function $(id){return document.getElementById(id)}
function H(id,v){var e=$(id);if(e)e.innerHTML=v}
function T(id,v){var e=$(id);if(e)e.textContent=v}

// ═══ 表单提交 ═══
async function submitReading(){
  var y=+$('birthYear').value,m=+$('birthMonth').value,d=+$('birthDay').value;
  var hBr=($('birthHour')||{}).value;
  var gender=$('gM').classList.contains('on')?'M':'F';
  var ci=$('cityInput')||{};
  var resCity=($('residenceCity')||{}).value||'';
  if(!y||!m||!d||!hBr){alert('请填写完整的出生信息');return}
  var hour=HM[hBr];if(hour===undefined)hour=12;
  var lon=parseFloat(ci.dataset&&ci.dataset.lon||'121.47');
  var lat=parseFloat(ci.dataset&&ci.dataset.lat||'31.23');
  var tz=Math.round(lon/15);
  var btn=document.querySelector('.f-btn'),orig=btn.textContent;
  btn.textContent='排盘计算中…';btn.disabled=true;
  try{
    var res=await fetch(KES_API+'/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({birth_year:y,birth_month:m,birth_day:d,birth_hour:hour,birth_minute:0,
        timezone_offset_hours:tz,longitude:lon,latitude:lat,gender:gender,
        birth_city:ci.value||'',residence_city:resCity,country:'CN'})});
    if(!res.ok)throw new Error(await res.text());
    var data=await res.json();
    render(data);goPage('report');
  }catch(e){console.error(e);alert('排盘出错：'+e.message)}
  finally{btn.textContent=orig;btn.disabled=false}
}

// ═══ 主渲染 ═══
function render(d){
  var p=d.pillars,ds=p.day.stem,wx=d.meta.day_master_wx,c=WC[wx];
  var corr=d.time.total_correction;
  // 基本信息
  H('rpt-gender','<b>'+d.meta.gender_label+'</b>');
  T('rpt-birth',d.meta.birth+' '+d.meta.birth_hour_branch+'时');
  H('rpt-daymaster','<b class="e-'+c+'">'+ds+wx+'</b>');
  T('rpt-birthplace',d.meta.birth_city||'—');
  T('rpt-residence',d.meta.residence_city||'—');
  T('rpt-solar',(corr>=0?'+':'')+corr+'分钟');
  // 各section
  s01(p,d.hidden_stems,d.ten_gods,d.kong_wang);
  s02(d.relations);
  s03(d.wuxing);
  s04(d.kong_wang);
  s05(d.shen_sha);
  s06(d.strength,d.pattern,ds,wx);
  s07(d.yongshen);
  s08(d.personality,ds,wx);
  s09(d.relationship);
  s10(d.children);
  s11(d.career);
  s12(d.health);
  s13(d.dayun,d.ten_years,d.meta.gender_label);
  s14(d.liunian,d.liuyue);
  s15(d.warnings);
  s16(d.recommendations,d.career);
}

// ═══ 01 四柱 ═══
function s01(p,hid,gods,kw){
  var pos=['year','month','day','hour'],lbl=['年　柱','月　柱','日　柱','时　柱'];
  var ks=new Set((kw.day_kong||[]).concat(kw.year_kong||[]));
  var h='';
  pos.forEach(function(k,i){
    var stem=p[k].stem,br=p[k].branch,sc=WC[SW[stem]],bc=WC[BW[br]];
    var isD=k==='day';
    var sGod=isD?'日主':(gods[k]||{}).stem_god||'';
    var bGod=(gods[k]||{}).branch_god||'';
    var cls=SC[sGod]||'rizhu';
    var dCls=isD?' r-day-'+sc:'';
    var kong=ks.has(br)?'<span class="r-kong">空亡</span>':'';
    // 藏干 with 十神
    var hh=(hid[k]||[]).map(function(s){
      var hGod='';
      var hgs=(gods[k]||{}).hidden_gods||[];
      hgs.forEach(function(hg){if(hg[0]===s)hGod=hg[1]});
      return '<span class="r-pillar-h e-'+WC[SW[s]]+'">'+s+'<span style="font-size:9px;color:var(--t4);margin-left:2px">'+hGod+'</span></span>';
    }).join('');
    // 地支十神
    var bGodTag=bGod?'<div style="font-size:9px;color:var(--t3);margin-top:4px">'+bGod+'</div>':'';
    h+='<div class="r-pillar'+dCls+'"><div class="r-pillar-pos">'+lbl[i]+'</div>'
      +'<div class="r-pillar-ss r-ss-'+cls+'">'+sGod+'</div>'
      +'<div class="r-pillar-gz"><span class="e-'+sc+'">'+stem+'</span><span class="e-'+bc+'">'+br+'</span></div>'
      +bGodTag
      +'<div class="r-pillar-hidden">'+hh+'</div>'
      +'<div style="font-size:9px;color:var(--t4);margin-top:6px">'+p[k].nayin+'</div>'
      +kong+'</div>';
  });
  H('rpt-pillars',h);
}

// ═══ 02 干支关系 ═══
function s02(rel){
  var h='';
  // 柱内
  h+='<div style="font-size:10px;letter-spacing:.1em;color:var(--t4);margin-bottom:8px">柱内关系</div>';
  h+='<div class="r-tbl" style="margin-bottom:16px"><div class="r-tbl-head" style="grid-template-columns:36px 48px 1fr 1fr"><div>柱</div><div>组合</div><div>类型</div><div>含义</div></div>';
  (rel.pillar_combos||[]).forEach(function(c){
    h+='<div class="r-tbl-row" style="grid-template-columns:36px 48px 1fr 1fr"><div>'+c.pos+'</div><div style="font-weight:600">'+c.gz+'</div><div>'+c.type+'</div><div style="color:var(--t3)">'+c.note+'</div></div>';
  });
  h+='</div>';
  // 柱间
  var all=(rel.tiangan_rels||[]).concat(rel.dizhi_rels||[]);
  if(all.length){
    h+='<div style="font-size:10px;letter-spacing:.1em;color:var(--t4);margin-bottom:8px">柱间关系</div>';
    h+='<div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:1fr 1fr 1fr"><div>涉及</div><div>类型</div><div>含义</div></div>';
    all.forEach(function(r){
      var note=r.note||_relMeaning(r.type)||'';
      h+='<div class="r-tbl-row" style="grid-template-columns:1fr 1fr 1fr"><div>'+r.involved+'</div><div style="font-weight:600">'+r.type+'</div><div style="color:var(--t3)">'+note+'</div></div>';
    });
    h+='</div>';
  }
  if(rel.no_relations_note) h+='<div style="font-size:13px;color:var(--t3);margin-top:10px;line-height:1.7">'+rel.no_relations_note+'</div>';
  H('rpt-relations',h);
}

function _relMeaning(type){
  if(type.indexOf('五合')>=0) return '天干相合，双方力量被牵制';
  if(type.indexOf('比和')>=0) return '同支力量加倍';
  if(type.indexOf('六冲')>=0) return '正面冲突，变动';
  if(type.indexOf('六合')>=0) return '关系紧密，合化';
  if(type.indexOf('半合')>=0) return '暗中引动该五行力量';
  if(type.indexOf('三合')>=0) return '三方会局，力量极强';
  if(type.indexOf('自刑')>=0) return '自我纠结，内耗';
  if(type.indexOf('六害')>=0) return '暗害，不利';
  if(type.indexOf('天干相冲')>=0) return '天干对冲，矛盾';
  return '';
}

// ═══ 03 五行 ═══
function s03(wx){
  var o=['木','火','土','金','水'],total=0,max=0;
  o.forEach(function(e){total+=wx[e]||0;max=Math.max(max,wx[e]||0)});
  if(!total)total=1;if(!max)max=1;
  var h='';
  o.forEach(function(e){
    var v=wx[e]||0,pct=Math.round(v/total*100),w=Math.round(v/max*100),c=WC[e];
    var st=pct>=35?'旺':pct>=20?'相':pct>=8?'中':pct>=3?'弱':'死';
    h+='<div class="r-wx"><div class="r-wx-char e-'+c+'">'+e+'</div><div class="r-wx-bar-wrap"><div class="r-wx-bar" style="width:'+w+'%;background:var(--'+c+')"></div></div><div class="r-wx-pct e-'+c+'">'+pct+'%</div><div class="r-wx-status">'+st+'</div></div>';
  });
  H('rpt-wuxing',h);
}

// ═══ 04 空亡 ═══
function s04(kw){
  var h='';
  if(kw.day_kong&&kw.day_kong.length) h+='<div class="r-warn w-blue"><div class="r-warn-title">日空亡：'+kw.day_kong.join('、')+'</div><div class="r-warn-body">空亡地支虚而不实，所对应的十神和宫位力量减弱。</div></div>';
  if(kw.year_kong&&kw.year_kong.length) h+='<div class="r-warn w-blue"><div class="r-warn-title">年空亡：'+kw.year_kong.join('、')+'</div><div class="r-warn-body">年空亡影响祖上和早年运势。</div></div>';
  H('rpt-kongwang',h||'<div style="color:var(--t3);font-size:13px">无显著空亡影响</div>');
}

// ═══ 05 神煞（含义）═══
function s05(sha){
  var entries=Object.entries(sha||{}).filter(function(kv){return kv[1]&&kv[1].length});
  if(!entries.length){var sec=$('rpt-shensha-sec');if(sec)sec.style.display='none';return}
  var sec=$('rpt-shensha-sec');if(sec)sec.style.display='';
  var h='';
  entries.forEach(function(kv){
    var name=kv[0],pos=kv[1];
    var meaning=SHENSHA_MEAN[name]||'';
    h+='<div class="r-warn w-gold"><div class="r-warn-title">'+name+'</div><div class="r-warn-body"><b>位于</b> '+(Array.isArray(pos)?pos.join('、'):pos)+(meaning?'<br>'+meaning:'')+'</div></div>';
  });
  H('rpt-shensha',h);
}

// ═══ 06 身强弱 ═══
function s06(s,pat,ds,wx){
  var lv=['极弱','偏弱','中和','偏强','身强'],idx=lv.indexOf(s.verdict);if(idx<0)idx=1;
  var segs=document.querySelectorAll('#rpt-meter .r-meter-seg');
  var labs=document.querySelectorAll('#rpt-meter .r-meter-labels span');
  segs.forEach(function(seg,i){seg.className='r-meter-seg';if(i<=idx)seg.classList.add('filled');if(i===idx)seg.classList.add('active')});
  labs.forEach(function(l,i){l.className='';if(i===idx)l.classList.add('on')});
  T('rpt-verdict',s.verdict);
  T('rpt-verdict-explain','得令：'+(s.de_ling?'✓':'✗')+'　得地：'+(s.de_di?'✓':'✗')+'　得势：'+(s.de_shi?'✓':'✗'));
  var sh='';
  [{k:'得　令',v:s.de_ling,d:s.ling_detail},{k:'得　地',v:s.de_di,d:s.di_detail},{k:'得　势',v:s.de_shi,d:s.shi_detail}].forEach(function(x){
    sh+='<div class="r-str-item"><div class="r-str-label">'+x.k+'</div><div class="r-str-val '+(x.v?'yes':'no')+'">'+(x.v?'已得':'未得')+'</div><div class="r-str-detail">'+x.d+'</div></div>';
  });
  H('rpt-strength',sh);
  if(pat) H('rpt-pattern','<b>格局：'+pat.name+'（'+pat.status+'）</b><br>'+pat.description);
}

// ═══ 07 喜忌 ═══
function s07(ys){
  function chars(arr){return(arr||[]).map(function(x){var c=WC[x.wuxing]||'tu';return '<span class="r-yj-char '+c+'">'+x.wuxing+'</span>'}).join('')}
  H('rpt-yongshen',
    '<div class="r-yj-card"><div class="r-yj-label">喜用神</div><div class="r-yj-chars">'+chars(ys.xi)+'</div></div>'+
    '<div class="r-yj-card"><div class="r-yj-label">忌　神</div><div class="r-yj-chars">'+chars(ys.ji)+'</div></div>'+
    '<div class="r-yj-card"><div class="r-yj-label">调候用神</div><div class="r-yj-chars">'+(ys.tiaohuo||[]).map(function(t){return '<span class="r-yj-char '+(WC[SW[t]]||'tu')+'">'+t+'</span>'}).join('')+'</div></div>'
  );
  if(ys.tiaohuo_note) H('rpt-tiaohuo',ys.tiaohuo_note+'<br><span style="color:var(--t4)">调候用神是根据日主出生季节寒暖燥湿而定的平衡用神。</span>');
}

// ═══ 08 性格 ═══
function s08(per,ds,wx){
  if(!per)return;var c=WC[wx];
  H('rpt-elemid','<div class="r-elem-icon '+c+'">'+ds+'</div><div><div class="r-elem-id-name">'+ds+' · '+(STEM_DESC[ds]||wx+'命')+'</div><div class="r-elem-id-desc">'+wx+'命</div></div>');
  if(per.quote) H('rpt-quote','<div class="r-pq-text">'+per.quote+'</div><div class="r-pq-src">'+per.quote_src+'</div>');
  var h='<p>'+per.intro.replace(/\n\n/g,'</p><p>')+'</p>';
  if(per.traits&&per.traits.length){
    h+='<table style="width:100%;border-collapse:collapse;margin-top:16px">';
    per.traits.forEach(function(t){h+='<tr><td style="padding:8px 0;border-bottom:1px solid var(--line);font-weight:600;width:56px;vertical-align:top">'+t.layer+'</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid var(--line);color:var(--t2)">'+t.text+'</td></tr>'});
    h+='</table>';
  }
  H('rpt-personality',h);
}

// ═══ 09 感情 ═══
function s09(r){
  if(!r)return;var h='';
  if(r.spouse_star)h+='<p><b>配偶星</b>——'+r.spouse_star+'</p>';
  if(r.kong_note)h+='<p>'+r.kong_note+'</p>';
  if(r.palace)h+='<p><b>配偶宫</b>——'+r.palace+'</p>';
  if(r.marriage)h+='<p><b>婚姻</b>——'+r.marriage+'</p>';
  H('rpt-love',h);
}

// ═══ 10 子女 ═══
function s10(c){H('rpt-children','<p>'+(c||'')+'</p>')}

// ═══ 11 事业 ═══
function s11(c){
  if(!c)return;
  H('rpt-career','<p>'+c.career+'</p>'+(c.wealth_note?'<p>'+c.wealth_note+'</p>':''));
}

// ═══ 12 健康 ═══
function s12(items){
  if(!items||!items.length)return;
  var h='';
  items.forEach(function(x){h+='<div class="r-hc"><div class="r-hc-title">'+x.part+'</div><div class="r-hc-body">'+x.reason+'</div></div>'});
  H('rpt-health',h);
}

// ═══ 13 大运（含逐年表）═══
function s13(dayun,tenYears,genderLabel){
  if(!dayun)return;
  T('rpt-dayun-sub',(dayun.is_forward?'顺行':'逆行')+'　起运约'+dayun.onset_age+'岁'+(genderLabel?' · '+genderLabel:''));
  // 横向滚动卡片
  var h='';
  (dayun.periods||[]).forEach(function(d){
    var age=d.start_age+'-'+d.end_age;
    var isCur=dayun.current&&d.start_age===dayun.current.start_age;
    h+='<div class="r-dy-item'+(isCur?' cur':'')+'">'+(isCur?'<div class="r-dy-label">当前</div>':'')
      +'<div class="r-dy-gz"><span class="e-'+WC[SW[d.stem]]+'">'+d.stem+'</span><span class="e-'+WC[BW[d.branch]]+'">'+d.branch+'</span></div>'
      +'<div style="font-size:10px;color:var(--t2);margin-top:4px">'+d.ten_god_stem+'</div>'
      +'<div class="r-dy-age">'+age+'岁</div>'
      +'<div style="font-size:9px;color:var(--t4)">'+d.nayin+'</div>'
      +'</div>';
  });
  H('rpt-dayun-scroll',h);
  // 当前大运详情
  var cur=dayun.current;
  if(cur){
    H('rpt-dayun-detail',
      '<div class="r-dy-summary-h">当前大运：'+cur.stem+cur.branch+'（'+cur.ten_god_stem+'）</div>'
      +'<div class="r-dy-summary-sub">'+cur.start_age+'-'+cur.end_age+'岁'+(cur.keyword?' · '+cur.keyword:'')+'</div>'
      +'<div style="font-size:var(--fs-sm);color:var(--t2);line-height:1.8">'+(cur.summary||'')+'</div>'
    );
  }
  // 逐年表
  if(tenYears&&tenYears.length){
    var th='<div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:52px 52px 60px 1fr"><div>年份</div><div>干支</div><div>十神</div><div>要点</div></div>';
    tenYears.forEach(function(yr){
      var bold=yr.flags&&yr.flags.length;
      th+='<div class="r-tbl-row'+(bold?' now':'')+'" style="grid-template-columns:52px 52px 60px 1fr">'
        +'<div>'+yr.year+'</div>'
        +'<div><span class="e-'+WC[SW[yr.stem]]+'">'+yr.stem+'</span><span class="e-'+WC[BW[yr.branch]]+'">'+yr.branch+'</span></div>'
        +'<div>'+yr.stem_god+'</div>'
        +'<div class="r-a-note">'+yr.text+(yr.flags&&yr.flags.length?' <b>'+yr.flags.join(' · ')+'</b>':'')+'</div></div>';
    });
    th+='</div>';
    H('rpt-dayun-table',th);
  }
}

// ═══ 14 流年流月 ═══
function s14(ln,months){
  if(!ln)return;
  T('rpt-ln-title',ln.year+'年 '+ln.gz+'年运势');
  T('rpt-ln-sub',ln.gz+'年');
  var sh='';
  (ln.summary||[]).forEach(function(p){if(p)sh+='<p>'+p+'</p>'});
  H('rpt-ln-summary',sh);
  if(months&&months.length){
    var h='<div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:80px 52px 1fr"><div>月份</div><div>干支</div><div>运势概要</div></div>';
    months.forEach(function(m){
      h+='<div class="r-tbl-row" style="grid-template-columns:80px 52px 1fr">'
        +'<div class="r-a-year">'+m.start_date+'</div>'
        +'<div class="r-a-gz"><span class="e-'+WC[SW[m.stem]]+'">'+m.stem+'</span><span class="e-'+WC[BW[m.branch]]+'">'+m.branch+'</span></div>'
        +'<div class="r-a-note">'+m.stem_god+(m.text?' — '+m.text:'')+'</div></div>';
    });
    h+='</div>';
    H('rpt-ln-months',h);
  }
}

// ═══ 15 预警 ═══
function s15(w){
  if(!w||!w.length)return;
  var h='';
  w.forEach(function(x){
    var cls=x.level==='red'?'w-red':x.level==='blue'?'w-blue':'w-gold';
    h+='<div class="r-warn '+cls+'"><div class="r-warn-title">'+x.title+'</div><div class="r-warn-body">'+x.body+'</div></div>';
  });
  H('rpt-warnings',h);
}

// ═══ 16 综合建议 ═══
function s16(rec,career){
  if(!rec)return;
  var h='';
  // 生财
  h+='<div class="r-rec-card full"><div class="r-rec-num">01</div><div class="r-rec-title">生财方式</div><div class="r-rec-body">'+(career&&career.wealth_note?career.wealth_note:'根据喜用五行调整理财方向。')+'</div></div>';
  // 行业
  var ind='';
  (rec.industries_xi||[]).forEach(function(x){ind+='<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--t4)">喜 · '+x.wuxing+'</span><br>'+x.items.join('、')+'</div>'});
  h+='<div class="r-rec-card"><div class="r-rec-num">02</div><div class="r-rec-title">行业方向</div><div class="r-rec-body">'+ind+'</div></div>';
  // 城市
  var city='';
  (rec.cities||[]).forEach(function(c){city+='<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--t4)">'+c.direction+'</span><br>'+c.cities.join('、')+'</div>'});
  h+='<div class="r-rec-card"><div class="r-rec-num">03</div><div class="r-rec-title">方位与城市</div><div class="r-rec-body">'+(city||'根据喜用五行方位推荐')+'</div></div>';
  // 颜色
  var col='';
  (rec.color_xi||[]).forEach(function(x){col+='<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--t4)">喜 · '+x.wuxing+'</span><br>'+x.colors.join('、')+'</div>'});
  h+='<div class="r-rec-card"><div class="r-rec-num">04</div><div class="r-rec-title">幸运颜色</div><div class="r-rec-body">'+col+'</div></div>';
  // 健康
  h+='<div class="r-rec-card"><div class="r-rec-num">05</div><div class="r-rec-title">健康管理</div><div class="r-rec-body">关注五行偏枯对应的脏腑，走忌神运时加强保养。</div></div>';
  H('rpt-recs',h);
}
