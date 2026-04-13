/**
 * KES 命元之钥 — 报告渲染引擎 v2.1
 */
var KES_API='https://web-production-11af.up.railway.app';
var WX_C={'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};
var S_WX={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
var B_WX={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
var SS_C={'比肩':'bijian','劫财':'jiecai','食神':'shishen','伤官':'shangguan','偏财':'piancai','正财':'zhengcai','七杀':'qisha','正官':'zhengguan','偏印':'pianyin','正印':'zhengyin','日主':'rizhu'};
var HR_MAP={'子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20,'亥':22};
var SHA_MEAN={'天乙贵人':'一生有贵人扶持之象，遇困难易逢贵人相助','华盖':'命主有独处倾向，对哲学、玄学、文化艺术有天然兴趣','桃花':'异性缘较旺，注重外在形象和人际交往','驿马':'一生走动多，适合与外地或旅行相关的发展','禄神':'自带禄位，衣食无忧的先天条件','羊刃':'性格刚强果断，有魄力但也需控制脾气','文昌':'聪明好学，有文才学识，利于考试和学术','将星':'有领导能力和权威感，适合管理岗位','天德贵人':'逢凶化吉之星，一生少遇大灾大难','月德贵人':'性情温和，为人慈善，一生平安少灾','太极贵人':'悟性极高，适合研究深奥学问','金舆':'出行多有贵人接送，一生多得人助','劫煞':'做事果断有魄力，但也有冲动冒险倾向'};
var STEM_IMG={'甲':'参天大树','乙':'小草藤蔓','丙':'太阳之火','丁':'灯烛之火','戊':'大地之土','己':'田园之土','庚':'刀剑之金','辛':'首饰之金','壬':'江河之水','癸':'雨露之水'};

function $(id){return document.getElementById(id)}
function H(id,v){var e=$(id);if(e)e.innerHTML=v}
function T(id,v){var e=$(id);if(e)e.textContent=v}
function ec(s){return '<span class="e-'+WX_C[S_WX[s]]+'">'+s+'</span>'}
function ecb(b){return '<span class="e-'+WX_C[B_WX[b]]+'">'+b+'</span>'}

async function submitReading(){
  var y=+$('birthYear').value,m=+$('birthMonth').value,d=+$('birthDay').value;
  var hBr=($('birthHour')||{}).value;
  var gender=$('gM').classList.contains('on')?'M':'F';
  var ci=$('cityInput')||{};
  var resCity=($('residenceCity')||{}).value||'';
  if(!y||!m||!d||!hBr){alert('请填写完整的出生信息');return}
  var hour=HR_MAP[hBr];if(hour===undefined)hour=12;
  var lon=parseFloat((ci.dataset||{}).lon||'121.47');
  var lat=parseFloat((ci.dataset||{}).lat||'31.23');
  var btn=document.querySelector('.f-btn'),orig=btn.textContent;
  btn.textContent='排盘计算中…';btn.disabled=true;
  try{
    var res=await fetch(KES_API+'/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({birth_year:y,birth_month:m,birth_day:d,birth_hour:hour,birth_minute:0,timezone_offset_hours:Math.round(lon/15),longitude:lon,latitude:lat,gender:gender,birth_city:ci.value||'',residence_city:resCity,country:'CN'})});
    if(!res.ok)throw new Error(await res.text());
    var data=await res.json();
    renderReport(data);goPage('report');
  }catch(e){console.error(e);alert('排盘出错：'+e.message)}
  finally{btn.textContent=orig;btn.disabled=false}
}

function renderReport(d){
  var p=d.pillars,ds=p.day.stem,wx=d.meta.day_master_wx,c=WX_C[wx];
  H('rpt-gender','<b>'+d.meta.gender_label+'</b>');
  T('rpt-birth',d.meta.birth+' '+d.meta.birth_hour_branch+'时');
  H('rpt-daymaster','<b class="e-'+c+'">'+ds+wx+'</b>');
  T('rpt-birthplace',d.meta.birth_city||'—');
  T('rpt-residence',d.meta.residence_city||'—');
  var corr=d.time.total_correction;
  T('rpt-solar',(corr>=0?'+':'')+corr+'分钟');
  R01(p,d.hidden_stems,d.ten_gods,d.kong_wang);
  R03(d.wuxing);R04(d.kong_wang,p);R05(d.shen_sha);
  R06(d.strength,d.pattern,ds,wx);R07(d.yongshen);R08(d.personality,ds,wx);
  R09(d.relationship);R10(d.children);R11(d.career);R12(d.health);
  R13(d.dayun,d.ten_years);R14(d.liunian,d.liuyue);R15(d.warnings,d.recommendations,d.career,d.dayun,d.yongshen);
}

function R01(p,hid,gods,kw){
  var pos=['year','month','day','hour'],lbl=['年　柱','月　柱','日　柱','时　柱'];
  var ks=new Set((kw.day_kong||[]).concat(kw.year_kong||[]));
  var h='';
  pos.forEach(function(k,i){
    var stem=p[k].stem,branch=p[k].branch,sc=WX_C[S_WX[stem]],bc=WX_C[B_WX[branch]];
    var isDay=k==='day';
    var stemGod=isDay?'日主':(gods[k]||{}).stem_god||'';
    var branchGod=(gods[k]||{}).branch_god||'';
    var dayCls=isDay?' r-day-'+sc:'';
    var kongMk=ks.has(branch)?'<span class="r-kong">空亡</span>':'';
    var hiddenGods=(gods[k]||{}).hidden_gods||[];
    var hh=hiddenGods.map(function(arr){var s=arr[0],god=arr[1];return '<span class="r-pillar-h e-'+WX_C[S_WX[s]]+'">'+s+'</span><span style="font-size:9px;color:var(--t4)">'+god+'</span>'}).join(' ');
    var nayinStr=p[k].nayin||'';
    h+='<div class="r-pillar'+dayCls+'">'+
      '<div class="r-pillar-pos">'+lbl[i]+'</div>'+
      '<div class="r-pillar-ss" style="background:var(--'+sc+'-bg,rgba(200,200,200,.08));color:var(--'+sc+');border:1px solid var(--'+sc+'-ln,rgba(200,200,200,.15))">'+stemGod+'</div>'+
      '<div class="r-pillar-gz"><span class="e-'+sc+'">'+stem+'</span><span class="e-'+bc+'">'+branch+'</span></div>'+
      '<div class="r-pillar-ss" style="background:var(--'+bc+'-bg,rgba(200,200,200,.08));color:var(--'+bc+');border:1px solid var(--'+bc+'-ln,rgba(200,200,200,.15));font-size:10px;margin-top:4px">'+branchGod+'</div>'+
      '<div class="r-pillar-hidden">'+hh+'</div>'+
      '<div style="font-size:9px;color:var(--t4);margin-top:6px;border-top:1px solid var(--line);padding-top:4px">'+nayinStr+'</div>'+
      kongMk+'</div>';
  });
  H('rpt-pillars',h);
}

function R02(rel){
  var h1='';
  (rel.pillar_combos||[]).forEach(function(c){h1+='<div class="r-tbl-row" style="grid-template-columns:36px 48px 1fr 1fr"><div>'+c.pos+'</div><div style="font-weight:600">'+c.gz+'</div><div>'+c.type+'</div><div style="color:var(--t3)">'+c.note+'</div></div>'});
  H('rpt-gz-inner',h1);
  var h2='',all=(rel.tiangan_rels||[]).concat(rel.dizhi_rels||[]);
  if(all.length){all.forEach(function(r){h2+='<div class="r-tbl-row" style="grid-template-columns:1fr 1fr 1fr"><div style="font-size:12px">'+r.involved+'</div><div style="font-weight:600">'+r.type+'</div><div style="color:var(--t2)">'+(r.note||'')+'</div></div>'})}
  H('rpt-gz-inter',h2||'<div class="r-tbl-row" style="grid-template-columns:1fr"><div style="color:var(--t3)">命局无特殊柱间关系</div></div>');
  if(rel.no_relations_note)T('rpt-gz-note',rel.no_relations_note);
}

function R03(wx){
  var order=['木','火','土','金','水'],total=0,max=0;
  order.forEach(function(e){total+=wx[e]||0;max=Math.max(max,wx[e]||0)});
  if(!total)total=1;if(!max)max=1;var h='';
  order.forEach(function(e){var v=wx[e]||0,pct=Math.round(v/total*100),w=Math.round(v/max*100),c=WX_C[e];var st=pct>=35?'旺':pct>=20?'相':pct>=8?'中':pct>=3?'弱':'死';h+='<div class="r-wx"><div class="r-wx-char e-'+c+'">'+e+'</div><div class="r-wx-bar-wrap"><div class="r-wx-bar" style="width:'+w+'%;background:var(--'+c+')"></div></div><div class="r-wx-pct e-'+c+'">'+pct+'%</div><div class="r-wx-status">'+st+'</div></div>'});
  H('rpt-wuxing',h);
}

function R04(kw,p){
  var h='';
  if(kw.day_kong&&kw.day_kong.length){var af=[];['year','month','day','hour'].forEach(function(k,i){if(kw.day_kong.indexOf(p[k].branch)>=0)af.push(['年','月','日','时'][i]+'支'+p[k].branch)});var note='空亡地支虚而不实，所对应的十神和宫位力量减弱。';if(af.length)note+='命局中'+af.join('、')+'在空亡范围内。';h+='<div class="r-warn"><div class="r-warn-title">日空亡：'+kw.day_kong.join('、')+'</div><div class="r-warn-body">'+note+'</div></div>'}
  if(kw.year_kong&&kw.year_kong.length)h+='<div class="r-warn"><div class="r-warn-title">年空亡：'+kw.year_kong.join('、')+'</div><div class="r-warn-body">年空亡影响祖上和早年运势。</div></div>';
  H('rpt-kongwang',h||'<div style="color:var(--t3);font-size:13px">无显著空亡影响</div>');
}

function R05(sha){
  var entries=Object.entries(sha||{}).filter(function(kv){return kv[1]&&kv[1].length});
  if(!entries.length){var sec=$('rpt-shensha-sec');if(sec)sec.style.display='none';return}
  var sec=$('rpt-shensha-sec');if(sec)sec.style.display='';var h='';
  entries.forEach(function(kv){var name=kv[0],pos=kv[1];h+='<div class="r-warn"><div class="r-warn-title">'+name+'</div><div class="r-warn-body"><b>位于 '+(Array.isArray(pos)?pos.join('、'):pos)+'</b>'+(SHA_MEAN[name]?'<br>'+SHA_MEAN[name]:'')+'</div></div>'});
  H('rpt-shensha',h);
}

function R06(s,pat,ds,wx){
  var levels=['极弱','偏弱','中和','偏强','身强'],idx=levels.indexOf(s.verdict);if(idx<0)idx=1;
  document.querySelectorAll('#rpt-meter .r-meter-seg').forEach(function(seg,i){seg.className='r-meter-seg';if(i<=idx)seg.classList.add('filled');if(i===idx)seg.classList.add('active')});
  document.querySelectorAll('#rpt-meter .r-meter-labels span').forEach(function(l,i){l.className='';if(i===idx)l.classList.add('on')});
  T('rpt-verdict',s.verdict);T('rpt-verdict-explain','得令：'+(s.de_ling?'✓':'✗')+'　得地：'+(s.de_di?'✓':'✗')+'　得势：'+(s.de_shi?'✓':'✗'));
  var strH='';[{k:'得　令',v:s.de_ling,d:s.ling_detail},{k:'得　地',v:s.de_di,d:s.di_detail},{k:'得　势',v:s.de_shi,d:s.shi_detail}].forEach(function(x){strH+='<div class="r-str-item"><div class="r-str-label">'+x.k+'</div><div class="r-str-val '+(x.v?'yes':'no')+'">'+(x.v?'已得':'未得')+'</div><div class="r-str-detail">'+(x.d||'')+'</div></div>'});
  H('rpt-strength',strH);
  if(pat)H('rpt-pattern','<b>格局：'+pat.name+'（'+pat.status+'）</b><br>'+(pat.description||''));
}

function R07(ys){
  function chars(arr){return(arr||[]).map(function(x){return '<span class="r-yj-char '+(WX_C[x.wuxing]||'tu')+'">'+x.wuxing+'</span>'}).join('')}
  H('rpt-yongshen',
    '<div class="r-yj-card"><div class="r-yj-label">喜用神</div><div class="r-yj-chars">'+chars(ys.xi)+'</div></div>'+
    '<div class="r-yj-card"><div class="r-yj-label">忌　神</div><div class="r-yj-chars">'+chars(ys.ji)+'</div></div>'+
    '<div class="r-yj-card"><div class="r-yj-label">调候用神</div><div class="r-yj-chars">'+(ys.tiaohuo||[]).map(function(t){return '<span class="r-yj-char '+(WX_C[S_WX[t]]||'tu')+'">'+t+'</span>'}).join('')+'</div></div>');
  if(ys.tiaohuo_note){var note=ys.tiaohuo_note.replace(/调候用神：[^。]+[。]?/,'').trim();if(note)H('rpt-tiaohuo',note)}
}

function R08(per,ds,wx){if(!per)return;var c=WX_C[wx];H('rpt-elemid','<div class="r-elem-icon '+c+'">'+ds+'</div><div><div class="r-elem-id-name">'+ds+' · '+wx+'命</div><div class="r-elem-id-desc">'+(STEM_IMG[ds]||'')+'</div></div>');if(per.quote)H('rpt-quote','<div class="r-pq-text">'+per.quote+'</div><div class="r-pq-src">'+per.quote_src+'</div>');var h='<p>'+per.intro.replace(/\n\n/g,'</p><p>')+'</p>';if(per.traits&&per.traits.length){h+='<table style="width:100%;border-collapse:collapse;margin-top:16px">';per.traits.forEach(function(t){h+='<tr><td style="padding:8px 0;border-bottom:1px solid var(--line);font-weight:600;white-space:nowrap;width:60px;vertical-align:top">'+t.layer+'</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid var(--line);color:var(--t2)">'+t.text+'</td></tr>'});h+='</table>'}H('rpt-personality',h)}

function R09(rel){if(!rel)return;var h='';if(rel.prose){h='<div class="r-prose">'+rel.prose.replace(/\n\n/g,'</p><p>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');h='<p>'+h+'</p>'}else{if(rel.spouse_star)h+='<p>'+rel.spouse_star+'</p>';if(rel.kong_note)h+='<p>'+rel.kong_note+'</p>';if(rel.palace)h+='<p>'+rel.palace+'</p>';if(rel.marriage)h+='<p>'+rel.marriage+'</p>'}H('rpt-love',h||'<p>感情分析正在生成中。</p>')}

function R10(ch){H('rpt-children','<p>'+(ch||'')+'</p>')}

function R11(career){if(!career)return;var h='';if(career.prose){h=career.prose.replace(/\n\n/g,'</p><p>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');h='<p>'+h+'</p>'}else{h='<p>'+career.career+'</p>';if(career.wealth_note)h+='<p>'+career.wealth_note+'</p>'}H('rpt-career',h)}

function R12(items){if(!items||!items.length)return;var h='';items.forEach(function(x){h+='<div class="r-hc"><div class="r-hc-title">'+x.part+'</div><div class="r-hc-body">'+x.reason+'</div></div>'});H('rpt-health',h);H('rpt-health-note','大运走喜用神五行运时身体好，走忌神运时需注意保养。')}

function R13(dayun,tenYears){
  if(!dayun)return;
  T('rpt-dayun-sub',(dayun.is_forward?'顺行':'逆行')+'　起运约'+dayun.onset_age+'岁');
  var curYear=new Date().getFullYear(),curAge=dayun.current_age;
  H('rpt-dayun-scroll','');
  var sumH='';
  sumH+='<div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:60px 60px 80px 80px 1fr"><div>大运</div><div>年龄</div><div>年份(约)</div><div>核心</div><div>概要</div></div>';
  (dayun.periods||[]).forEach(function(d){
    var isCur=(d.start_age<=curAge&&curAge<=d.end_age);
    var sY=curYear-curAge+d.start_age;
    var eY=sY+9;
    sumH+='<div class="r-tbl-row'+(isCur?' r-tbl-cur':'')+'" style="grid-template-columns:60px 60px 80px 80px 1fr">'+
      '<div style="font-weight:600">'+ec(d.stem)+ecb(d.branch)+'</div>'+
      '<div>'+d.start_age+'-'+d.end_age+'</div>'+
      '<div>'+sY+'-'+eY+'</div>'+
      '<div style="font-weight:600;color:var(--t1)">'+(d.keyword||'')+'</div>'+
      '<div class="r-a-note">'+(d.summary||'')+'</div></div>';
  });
  sumH+='</div>';
  if(tenYears&&tenYears.length){
    sumH+='<div style="margin-top:24px;font-size:14px;font-weight:700;color:var(--t1);margin-bottom:12px">逐年运势</div><div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:52px 60px 80px 1fr"><div>年份</div><div>干支</div><div>核心</div><div>概要</div></div>';
    tenYears.forEach(function(yr){sumH+='<div class="r-tbl-row" style="grid-template-columns:52px 60px 80px 1fr"><div>'+yr.year+'</div><div>'+ec(yr.stem)+ecb(yr.branch)+'</div><div style="font-weight:600;color:var(--t1)">'+(yr.keyword||'')+'</div><div class="r-a-note">'+yr.text+'</div></div>'});
    sumH+='</div>';
  }
  H('rpt-dayun-detail',sumH);
}

function R14(ln,months){
  if(!ln)return;
  T('rpt-ln-title',ln.year+'年 '+ln.gz+'年运势');
  T('rpt-ln-sub',ln.gz+'年');
  var sumH='<div class="r-ly-body">';(ln.summary||[]).forEach(function(p){if(p)sumH+='<p>'+p+'</p>'});if(ln.text)sumH+='<p>'+ln.text+'</p>';sumH+='</div>';
  H('rpt-ln-summary',sumH);
  if(months&&months.length){var h='<div class="r-tbl-head" style="grid-template-columns:70px 60px 80px 1fr"><div>月份</div><div>干支</div><div>核心</div><div>概要</div></div>';months.forEach(function(m){var kw=m.keyword||(m.good?'顺':'守');h+='<div class="r-tbl-row" style="grid-template-columns:70px 60px 80px 1fr"><div class="r-a-year">'+m.start_date+'</div><div class="r-a-gz">'+ec(m.stem)+ecb(m.branch)+'</div><div style="font-weight:600;color:var(--t1)">'+kw+'</div><div class="r-a-note">'+m.text+'</div></div>'});H('rpt-ln-months',h)}
}

function R15(warnings,rec,career,dayun,yongshen){
  var wh='';if(warnings&&warnings.length){warnings.forEach(function(w){wh+='<div class="r-warn"><div class="r-warn-title">'+w.title+'</div><div class="r-warn-body">'+w.body+'</div></div>'})}else{wh='<div class="r-warn"><div class="r-warn-title">整体平稳</div><div class="r-warn-body">命局无特别严重的冲突标记。</div></div>'}
  H('rpt-warnings',wh);
  if(!rec)return;
  if(rec.current_dayun_advice)H('rpt-rec-wealth','<div style="margin-bottom:16px"><div style="font-weight:600;color:var(--t1);margin-bottom:6px">当前大运综合建议</div><div>'+rec.current_dayun_advice+'</div></div>'+(rec.current_liunian_advice?'<div style="margin-bottom:16px"><div style="font-weight:600;color:var(--t1);margin-bottom:6px">当前流年综合建议</div><div>'+rec.current_liunian_advice+'</div></div>':'')+'<div style="font-weight:600;color:var(--t1);margin-bottom:6px">财运方向</div><div>'+(rec.wealth_advice||'')+'</div>');
  else H('rpt-rec-wealth',rec.wealth_advice||(career&&career.wealth_note?career.wealth_note:''));
  H('rpt-rec-love',rec.love_advice||'');
  H('rpt-rec-industry',rec.industry_prose||'参考喜用五行选择行业方向。');
  var cityH='';if(rec.cities&&rec.cities.length){rec.cities.forEach(function(c){cityH+='<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--t4)">'+c.direction+'</span><br>'+c.cities.join('、')+'</div>'})}H('rpt-rec-location',cityH||'');
  var colH='<div class="r-rec-swatches">';(rec.color_xi||[]).forEach(function(c){colH+='<div class="r-rec-swatch" style="background:var(--'+(WX_C[c.wuxing]||'tu')+'-bg,rgba(200,200,200,.1))"><div class="r-rec-sw-label" style="color:var(--'+(WX_C[c.wuxing]||'tu')+')">'+c.wuxing+'·喜</div><div class="r-rec-sw-names">'+c.colors.join('、')+'</div></div>'});colH+='</div>';H('rpt-rec-color',colH);
  H('rpt-rec-health',rec.health_advice||'');
}
