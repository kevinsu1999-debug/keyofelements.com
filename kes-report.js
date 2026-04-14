/**
 * KES 命元之钥 — Report Engine v4 (Bilingual EN/ZH)
 * Changes: no ten-god in EN pillars, 5-dot rating, no god column EN, no shensha EN
 */
var KES_API='https://web-production-11af.up.railway.app';
var isEn=(document.documentElement.lang==='en');
var WX_C={'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};
var S_WX={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
var B_WX={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
var HR_MAP={'子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20,'亥':22};
var WX_EN={'木':'Wood','火':'Fire','土':'Earth','金':'Metal','水':'Water'};
var GOD_EN={'比肩':'Companion','劫财':'Rival','食神':'Output','伤官':'Creativity','偏财':'Windfall','正财':'Wealth','七杀':'7-Killings','正官':'Officer','偏印':'Ind.Resource','正印':'Resource','日主':'Day Master'};
var SHA_MEAN={'天乙贵人':L('一生有贵人扶持之象','Benefactors at critical moments'),'华盖':L('独处倾向，对哲学、玄学有兴趣','Introspective, drawn to philosophy'),'桃花':L('异性缘较旺','Strong personal charm'),'驿马':L('一生走动多','Life of movement'),'禄神':L('衣食无忧','Innate comfort'),'羊刃':L('性格刚强果断','Strong-willed'),'文昌':L('聪明好学，有文才','Quick learner'),'将星':L('有领导能力','Natural leadership'),'天德贵人':L('逢凶化吉','Turns danger into fortune'),'月德贵人':L('性情温和','Gentle nature'),'太极贵人':L('悟性极高','Exceptional intuition'),'金舆':L('出行多有贵人助','Travels with support'),'劫煞':L('果断有魄力但冲动','Decisive but impulsive')};
var STEM_IMG=isEn?{'甲':'Towering Tree','乙':'Tender Vine','丙':'Blazing Sun','丁':'Candle Flame','戊':'Mountain Earth','己':'Fertile Field','庚':'Forged Blade','辛':'Fine Jewelry','壬':'Mighty River','癸':'Gentle Rain'}:{'甲':'参天大树','乙':'小草藤蔓','丙':'太阳之火','丁':'灯烛之火','戊':'大地之土','己':'田园之土','庚':'刀剑之金','辛':'首饰之金','壬':'江河之水','癸':'雨露之水'};

function $(id){return document.getElementById(id)}
function H(id,v){var e=$(id);if(e)e.innerHTML=v}
function T(id,v){var e=$(id);if(e)e.textContent=v}
function ec(s){return '<span class="e-'+WX_C[S_WX[s]]+'">'+s+'</span>'}
function ecb(b){return '<span class="e-'+WX_C[B_WX[b]]+'">'+b+'</span>'}
function L(zh,en){return isEn?en:zh}

function dots(score){
  if(score===undefined||score===null)return '<span style="font-size:8px;letter-spacing:1px;color:var(--t3)">●●●○○</span>';
  var n=score>=3?5:score>=1.5?4:score>=-0.5?3:score>=-2?2:1;
  var s='';for(var i=0;i<5;i++)s+=(i<n?'<span style="color:var(--t1)">●</span>':'<span style="color:var(--line,#ddd)">○</span>');
  return '<span style="font-size:8px;letter-spacing:1px">'+s+'</span>';
}
function fmtDate(d){
  if(!isEn||!d)return d;
  var m=d.match(/(\d{2})月(\d{2})日/);
  if(!m)return d;
  var months=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m[1])]+ ' '+m[2];
}

function fmtBirth(d){
  var m=d.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if(!m)return d;
  var months=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m[2])]+' '+m[3]+', '+m[1];
}


async function submitReading(){
  var y=+$('birthYear').value,m=+$('birthMonth').value,d=+$('birthDay').value;
  var hBr=($('birthHour')||{}).value;
  var gender=$('gM').classList.contains('on')?'M':'F';
  var ci=$('cityInput')||{};
  var resCity=($('residenceCity')||{}).value||'';
  if(!y||!m||!d||!hBr){alert(L('请填写完整的出生信息','Please fill in all birth details'));return}
  var hour=HR_MAP[hBr];if(hour===undefined)hour=12;
  var lon=parseFloat((ci.dataset||{}).lon||'121.47');
  var lat=parseFloat((ci.dataset||{}).lat||'31.23');
  var btn=document.querySelector('.f-btn'),orig=btn.textContent;
  btn.textContent=L('排盘计算中…','Calculating…');btn.disabled=true;
  try{
    var res=await fetch(KES_API+'/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({birth_year:y,birth_month:m,birth_day:d,birth_hour:hour,birth_minute:0,timezone_offset_hours:Math.round(lon/15),longitude:lon,latitude:lat,gender:gender,birth_city:ci.value||'',residence_city:resCity,country:(typeof getResCountry==='function'?getResCountry():'CN'),lang:isEn?'en':'zh'})});
    if(!res.ok)throw new Error(await res.text());
    var data=await res.json();
    renderReport(data);goPage('report');
  }catch(e){console.error(e);alert(L('排盘出错：','Error: ')+e.message)}
  finally{btn.textContent=orig;btn.disabled=false}
}

function renderReport(d){
  var p=d.pillars,ds=p.day.stem,wx=d.meta.day_master_wx;
  var wxZh=isEn?({'Wood':'木','Fire':'火','Earth':'土','Metal':'金','Water':'水'}[wx]||wx):wx;
  var c=WX_C[wxZh]||'tu';
  H('rpt-gender','<b>'+d.meta.gender_label+'</b>');
  T('rpt-birth',(isEn?fmtBirth(d.meta.birth):d.meta.birth+' '+d.meta.birth_hour_branch+'时'));
  H('rpt-daymaster','<b class="e-'+c+'">'+ds+' '+wx+'</b>');
  T('rpt-birthplace',d.meta.birth_city||'—');
  T('rpt-residence',d.meta.residence_city||(isEn?'Not specified':'—'));
  var corr=d.time.total_correction;
  T('rpt-solar',(corr>=0?'+':'')+corr+L('分钟',' min'));
  R01(p,d.hidden_stems,d.ten_gods,d.kong_wang);
  R03(d.wuxing);R04(d.kong_wang,p);R05(d.shen_sha);
  R06(d.strength,d.pattern,ds,wx);R07(d.yongshen);R08(d.personality,ds,wx,c);
  R09(d.relationship);R10(d.children);R11(d.career);R12(d.health);
  R13(d.dayun,d.ten_years);R14(d.liunian,d.liuyue);R15(d.warnings,d.recommendations,d.career,d.dayun,d.yongshen);
  /* Show tabs */
  var tabs=document.getElementById('rpt-tabs');if(tabs)tabs.style.display='';
  /* If already unlocked, show advanced content */
  if(_rptUnlocked) doUnlockAdvanced();
  /* Render Stripe pricing in unlock area */
  if(typeof checkPaidAndUnlock==='function') setTimeout(checkPaidAndUnlock, 300);
}

/* 01 Four Pillars — EN: no ten-god labels, only Chinese chars + position labels */
function R01(p,hid,gods,kw){
  var pos=['year','month','day','hour'],lbl=isEn?['Year','Month','Day Master','Hour']:['年　柱','月　柱','日　柱','时　柱'];
  var ks=new Set((kw.day_kong||[]).concat(kw.year_kong||[]));var h='';
  pos.forEach(function(k,i){
    var stem=p[k].stem,branch=p[k].branch,sc=WX_C[S_WX[stem]],bc=WX_C[B_WX[branch]];
    var isDay=k==='day';
    var dayCls=isDay?' r-day-'+sc:'';
    var kongMk=ks.has(branch)?'<span class="r-kong">'+L('空亡','Void')+'</span>':'';
    if(isEn){
      /* EN: pure Chinese chars, no ten-god labels, only hidden stems as chars */
      var hh='';var hidArr=hid[k]||[];
      hh=hidArr.map(function(s){return '<span class="r-pillar-h e-'+WX_C[S_WX[s]]+'">'+s+'</span>'}).join(' ');
      h+='<div class="r-pillar'+dayCls+'"><div class="r-pillar-pos">'+lbl[i]+'</div><div class="r-pillar-gz"><span class="e-'+sc+'">'+stem+'</span><span class="e-'+bc+'">'+branch+'</span></div><div class="r-pillar-hidden">'+hh+'</div><div style="font-size:9px;color:var(--t4);margin-top:6px;border-top:1px solid var(--line);padding-top:4px">'+(p[k].nayin||'')+'</div>'+kongMk+'</div>';
    } else {
      /* ZH: full ten-god labels */
      var stemGod=isDay?'日主':(gods[k]||{}).stem_god||'';
      var branchGod=(gods[k]||{}).branch_god||'';
      var hiddenGods=(gods[k]||{}).hidden_gods||[];
      var hh=hiddenGods.map(function(arr){var s=arr[0],god=arr[1];return '<span class="r-pillar-h e-'+WX_C[S_WX[s]]+'">'+s+'</span><span style="font-size:9px;color:var(--t4)">'+god+'</span>'}).join(' ');
      h+='<div class="r-pillar'+dayCls+'"><div class="r-pillar-pos">'+lbl[i]+'</div><div class="r-pillar-ss" style="background:var(--'+sc+'-bg,rgba(200,200,200,.08));color:var(--'+sc+');border:1px solid var(--'+sc+'-ln,rgba(200,200,200,.15))">'+stemGod+'</div><div class="r-pillar-gz"><span class="e-'+sc+'">'+stem+'</span><span class="e-'+bc+'">'+branch+'</span></div><div class="r-pillar-ss" style="background:var(--'+bc+'-bg,rgba(200,200,200,.08));color:var(--'+bc+');border:1px solid var(--'+bc+'-ln,rgba(200,200,200,.15));font-size:10px;margin-top:4px">'+branchGod+'</div><div class="r-pillar-hidden">'+hh+'</div><div style="font-size:9px;color:var(--t4);margin-top:6px;border-top:1px solid var(--line);padding-top:4px">'+(p[k].nayin||'')+'</div>'+kongMk+'</div>';
    }
  });
  H('rpt-pillars',h);
}

function R03(wx){
  var order=['木','火','土','金','水'],total=0,max=0;
  order.forEach(function(e){total+=wx[e]||0;max=Math.max(max,wx[e]||0)});
  if(!total)total=1;if(!max)max=1;var h='';
  order.forEach(function(e){var v=wx[e]||0,pct=Math.round(v/total*100),w=Math.round(v/max*100),co=WX_C[e];h+='<div class="r-wx"><div class="r-wx-char e-'+co+'">'+(isEn?'<div>'+e+'</div><div style="font-size:9px;color:var(--t4)">'+WX_EN[e]+'</div>':e)+'</div><div class="r-wx-bar-wrap"><div class="r-wx-bar" style="width:'+w+'%;background:var(--'+co+')"></div></div><div class="r-wx-pct e-'+co+'">'+pct+'%</div><div class="r-wx-status">'+(pct>=35?L('旺','Thriving'):pct>=20?L('相','Active'):pct>=8?L('休','Resting'):pct>=3?L('囚','Trapped'):L('死','Dead'))+'</div></div>'});
  H('rpt-wuxing',h);
}

function R04(kw,p){var h='';
  if(kw.day_kong&&kw.day_kong.length){h+='<div class="r-warn"><div class="r-warn-title">'+L('日空亡：','Day void: ')+kw.day_kong.join('、')+'</div><div class="r-warn-body">'+L('空亡地支虚而不实，力量减弱。','Void branches carry reduced power.')+'</div></div>'}
  if(kw.year_kong&&kw.year_kong.length)h+='<div class="r-warn"><div class="r-warn-title">'+L('年空亡：','Year void: ')+kw.year_kong.join('、')+'</div><div class="r-warn-body">'+L('年空亡影响祖上和早年运势。','Affects ancestral and early fortune.')+'</div></div>';
  H('rpt-kongwang',h||'<div style="color:var(--t3);font-size:13px">'+L('无显著空亡影响','No significant void impact')+'</div>');
}

/* 05 Shen Sha — hidden in EN mode */
function R05(sha){
  var sec=$('rpt-shensha-sec');
  if(isEn){if(sec)sec.style.display='none';return}
  var entries=Object.entries(sha||{}).filter(function(kv){return kv[1]&&kv[1].length});
  if(!entries.length){if(sec)sec.style.display='none';return}
  if(sec)sec.style.display='';var h='';
  entries.forEach(function(kv){var name=kv[0],pos=kv[1];var meaning=SHA_MEAN[name.split(' (')[0]]||SHA_MEAN[name]||'';h+='<div class="r-warn"><div class="r-warn-title">'+name+'</div><div class="r-warn-body"><b>位于 '+(Array.isArray(pos)?pos.join('、'):pos)+'</b>'+(meaning?'<br>'+meaning:'')+'</div></div>'});
  H('rpt-shensha',h);
}

/* 06 Strength — add disclaimer */
function R06(s,pat,ds,wx){
  var levels=isEn?['Weak','Weak','Balanced','Strong','Strong']:['极弱','偏弱','中和','偏强','身强'];
  var idx=levels.indexOf(s.verdict);if(idx<0)idx=1;
  document.querySelectorAll('#rpt-meter .r-meter-seg').forEach(function(seg,i){seg.className='r-meter-seg';if(i<=idx)seg.classList.add('filled');if(i===idx)seg.classList.add('active')});
  document.querySelectorAll('#rpt-meter .r-meter-labels span').forEach(function(l,i){l.className='';if(i===idx)l.classList.add('on')});
  if(isEn){var mls=document.querySelectorAll('#rpt-meter .r-meter-labels span');if(mls.length===5){mls[0].textContent='Weak';mls[1].textContent='';mls[2].textContent='Balanced';mls[3].textContent='';mls[4].textContent='Strong'}}
  T('rpt-verdict',s.verdict);
  T('rpt-verdict-explain',L('得令','Seasonal')+'：'+(s.de_ling?'✓':'✗')+'　'+L('得地','Rooted')+'：'+(s.de_di?'✓':'✗')+'　'+L('得势','Support')+'：'+(s.de_shi?'✓':'✗'));
  var strH='';[{k:L('得　令','Seasonal'),v:s.de_ling,d:s.ling_detail},{k:L('得　地','Rooted'),v:s.de_di,d:s.di_detail},{k:L('得　势','Support'),v:s.de_shi,d:s.shi_detail}].forEach(function(x){strH+='<div class="r-str-item"><div class="r-str-label">'+x.k+'</div><div class="r-str-val '+(x.v?'yes':'no')+'">'+(x.v?L('已得','Yes'):L('未得','No'))+'</div><div class="r-str-detail">'+(x.d||'')+'</div></div>'});
  H('rpt-strength',strH);
  if(pat)H('rpt-pattern','<b>'+L('格局：','Pattern: ')+pat.name+'</b>'+(isEn?'':'<br>'+(pat.description||'')));
  /* Disclaimer below card */
  var discEl=$('rpt-strength-disc');
  if(!discEl){discEl=document.createElement('div');discEl.id='rpt-strength-disc';var parent=$('rpt-strength');if(parent&&parent.parentNode)parent.parentNode.appendChild(discEl)}
  if(discEl)discEl.innerHTML='<div style="margin-top:16px;padding:12px 16px;background:var(--bg3,rgba(0,0,0,.02));border:1px solid var(--line,#eee);border-radius:8px;font-size:11px;color:var(--t3);line-height:1.7">'+L('注：身强身弱仅作为命理分析的判断依据，用于推导喜忌用神和大运流年吉凶，并非对命主本身强弱好坏的评判。','Note: Day master strength is used solely as an analytical framework for determining favorable elements and assessing luck cycles. It is not a judgment of the individual.')+'</div>';
}

/* 07 Yongshen — clean format, no pinyin */
function R07(ys){
  function wxChar(arr){return(arr||[]).map(function(x){var c=WX_C[x.wuxing]||'tu';return '<div style="display:inline-flex;flex-direction:column;align-items:center;margin:0 6px"><div class="r-yj-char '+c+'" style="font-size:28px">'+x.wuxing+'</div>'+(isEn?'<div style="font-size:9px;color:var(--t4);margin-top:2px">'+WX_EN[x.wuxing]+'</div>':'')+'</div>'}).join('')}
  function thChar(arr){return(arr||[]).map(function(t){var wx=S_WX[t];var c=WX_C[wx]||'tu';return '<div style="display:inline-flex;flex-direction:column;align-items:center;margin:0 6px"><div class="r-yj-char '+c+'" style="font-size:28px">'+t+'</div>'+(isEn?'<div style="font-size:9px;color:var(--t4);margin-top:2px">'+WX_EN[wx]+'</div>':'')+'</div>'}).join('')}
  H('rpt-yongshen','<div class="r-yj-card"><div class="r-yj-label">'+L('喜用神','Favorable')+'</div><div class="r-yj-chars">'+wxChar(ys.xi)+'</div></div><div class="r-yj-card"><div class="r-yj-label">'+L('忌　神','Unfavorable')+'</div><div class="r-yj-chars">'+wxChar(ys.ji)+'</div></div><div class="r-yj-card"><div class="r-yj-label">'+L('调候用神','Seasonal')+'</div><div class="r-yj-chars">'+thChar(ys.tiaohuo||[])+'</div></div>');
  if(ys.tiaohuo_note){var explain=L('调候用神是根据出生月份的气候寒暖，额外取用的平衡之神——与喜忌用神互为补充。','Seasonal balancing elements compensate for the birth month climate — complementing the favorable/unfavorable system.');H('rpt-tiaohuo',explain)}
}

function R08(per,ds,wx,c){if(!per)return;if(!c){var m={'Wood':'木','Fire':'火','Earth':'土','Metal':'金','Water':'水'};c=WX_C[m[wx]||wx]||'tu'}H('rpt-elemid','<div class="r-elem-icon '+c+'">'+ds+'</div><div><div class="r-elem-id-name">'+ds+' · '+wx+(isEn?' element':'命')+'</div><div class="r-elem-id-desc">'+(STEM_IMG[ds]||'')+'</div></div>');if(per.quote)H('rpt-quote','<div class="r-pq-text">'+per.quote+'</div><div class="r-pq-src">'+per.quote_src+'</div>');var h='<p>'+per.intro.replace(/\n\n/g,'</p><p>')+'</p>';if(per.traits&&per.traits.length){h+='<table style="width:100%;border-collapse:collapse;margin-top:16px">';per.traits.forEach(function(t){h+='<tr><td style="padding:8px 0;border-bottom:1px solid var(--line);font-weight:600;white-space:nowrap;width:70px;vertical-align:top">'+t.layer+'</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid var(--line);color:var(--t2)">'+t.text+'</td></tr>'});h+='</table>'}H('rpt-personality',h)}

function R09(rel){if(!rel)return;var h='';if(rel.prose){h=rel.prose.replace(/\n\n/g,'</p><p>');h='<p>'+h+'</p>'}H('rpt-love',h||'<p>'+L('感情分析正在生成中。','Generating relationship analysis…')+'</p>')}
function R10(ch){H('rpt-children','<p>'+(ch||'')+'</p>')}
function R11(career){if(!career)return;var h='';if(career.prose){h=career.prose.replace(/\n\n/g,'</p><p>');h='<p>'+h+'</p>'}H('rpt-career',h)}
function R12(items){if(!items||!items.length)return;var h='';items.forEach(function(x){h+='<div class="r-hc"><div class="r-hc-title">'+x.part+'</div><div class="r-hc-body">'+x.reason+'</div></div>'});H('rpt-health',h);H('rpt-health-note',L('大运走喜用神五行运时身体好，走忌神运时需注意保养。','Health improves during favorable luck cycles; take extra care during unfavorable ones.'))}

/* 13 Dayun + Ten Years — 5-dot rating instead of keyword text */
function R13(dayun,tenYears){
  if(!dayun)return;
  T('rpt-dayun-sub',(dayun.is_forward?L('顺行','Forward'):L('逆行','Reverse'))+'　'+L('起运约','Onset ~')+dayun.onset_age+L('岁',' yrs'));
  var curYear=new Date().getFullYear(),curAge=dayun.current_age;H('rpt-dayun-scroll','');
  var sumH='<div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:60px 60px 80px 60px 1fr"><div>'+L('大运','Cycle')+'</div><div>'+L('年龄','Age')+'</div><div>'+L('年份','Year')+'</div><div>'+L('评分','Rating')+'</div><div>'+L('概要','Summary')+'</div></div>';
  (dayun.periods||[]).forEach(function(d){var isCur=(d.start_age<=curAge&&curAge<=d.end_age);var sY=curYear-curAge+d.start_age;var eY=sY+9;var sm=isEn?(d.summary_en||d.summary||''):d.summary||'';var rating=d.stem_good&&d.branch_good?4:d.stem_good?1.8:d.branch_good?0:-3;sumH+='<div class="r-tbl-row'+(isCur?' r-tbl-cur':'')+'" style="grid-template-columns:60px 60px 80px 60px 1fr"><div style="font-weight:600">'+ec(d.stem)+ecb(d.branch)+'</div><div>'+d.start_age+'-'+d.end_age+'</div><div>'+sY+'-'+eY+'</div><div>'+dots(rating)+'</div><div class="r-a-note">'+sm+'</div></div>'});
  sumH+='</div>';
  if(tenYears&&tenYears.length){var bY=curYear-curAge;sumH+='<div style="margin-top:24px;font-size:14px;font-weight:700;color:var(--t1);margin-bottom:12px">'+L('逐年运势','Year by year')+'</div><div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:50px 50px 50px 60px 1fr"><div>'+L('年份','Year')+'</div><div>'+L('干支','Pillars')+'</div><div>'+L('年龄','Age')+'</div><div>'+L('评分','Rating')+'</div><div>'+L('概要','Summary')+'</div></div>';tenYears.forEach(function(yr){var age=yr.year-bY;var txt=isEn?(yr.text_en||yr.text||''):yr.text||'';var sc=(yr.score!==undefined&&yr.score!==null)?yr.score:(yr.judged?yr.judged.score:0);sumH+='<div class="r-tbl-row" style="grid-template-columns:50px 50px 50px 60px 1fr"><div>'+yr.year+'</div><div>'+ec(yr.stem)+ecb(yr.branch)+'</div><div>'+age+'</div><div>'+dots(sc)+'</div><div class="r-a-note">'+txt+'</div></div>'});sumH+='</div>'}
  H('rpt-dayun-detail',sumH);
}

/* 14 Liunian + Liuyue — 5-dot rating, no god column in EN, fix dates */
function R14(ln,months){
  if(!ln)return;
  T('rpt-ln-title',ln.year+(isEn?' '+ln.gz+' annual forecast':'年 '+ln.gz+'年运势'));
  T('rpt-ln-sub',ln.gz+L('年',' year'));
  var allText='';if(isEn&&ln.summary_en){allText=ln.summary_en}else if(isEn&&ln.text_en){allText=ln.text_en}else{(ln.summary||[]).forEach(function(p){if(p)allText+=p});if(ln.text)allText+=ln.text}
  var sc=ln.judged?ln.judged.score:0;
  var sumH='<div class="r-ly-detail"><div class="r-ly-h">'+ln.year+L('年流年综述',' annual overview')+'</div><div class="r-ly-body"><p>'+allText+'</p></div></div>';
  H('rpt-ln-summary',sumH);
  if(months&&months.length){
    var cols=isEn?'70px 50px 60px 1fr':'70px 50px 60px 60px 1fr';
    var hdr=isEn?'<div>'+L('月份','Month')+'</div><div>'+L('干支','Pillars')+'</div><div>'+L('评分','Rating')+'</div><div>'+L('概要','Summary')+'</div>':'<div>月份</div><div>干支</div><div>十神</div><div>评分</div><div>概要</div>';
    var h='<div style="background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden"><div class="r-tbl" style="border:none"><div class="r-tbl-head" style="grid-template-columns:'+cols+'">'+hdr+'</div>';
    months.forEach(function(m){
      var msc=m.good?1.8:-1;
      var dt=fmtDate(m.start_date||'');
      var txt=isEn?(m.text_en||m.text||''):(m.text||'');
      if(isEn){
        h+='<div class="r-tbl-row" style="grid-template-columns:'+cols+'"><div>'+dt+'</div><div>'+ec(m.stem)+ecb(m.branch)+'</div><div>'+dots(msc)+'</div><div class="r-a-note">'+txt+'</div></div>';
      } else {
        var god=m.stem_god||'';
        h+='<div class="r-tbl-row" style="grid-template-columns:'+cols+'"><div>'+dt+'</div><div>'+ec(m.stem)+ecb(m.branch)+'</div><div style="font-size:var(--fs-sm);color:var(--t2)">'+god+'</div><div>'+dots(msc)+'</div><div class="r-a-note">'+txt+'</div></div>';
      }
    });
    h+='</div></div>';H('rpt-ln-months',h);
  }
}

/* 15 Warnings + Recommendations — ensure EN content renders */
function R15(warnings,rec,career,dayun,yongshen){
  var wh='';if(warnings&&warnings.length){warnings.forEach(function(w){wh+='<div class="r-warn" style="background:var(--card);border-color:var(--line)"><div class="r-warn-title">'+w.title+'</div><div class="r-warn-body">'+w.body+'</div></div>'})}else{wh='<div class="r-warn" style="background:var(--card);border-color:var(--line)"><div class="r-warn-title">'+L('整体平稳','Overall stable')+'</div><div class="r-warn-body">'+L('命局无特别严重的冲突标记。','No severe conflict markers in the chart.')+'</div></div>'}
  H('rpt-warnings',wh);
  if(!rec)return;
  var rh='<div class="r-rec-card full" style="grid-column:1/-1">';
  var sT=function(t){return '<div style="font-weight:700;color:var(--t1);font-size:14px;margin-bottom:8px">'+t+'</div>'};
  var sB=function(t){return '<p style="margin:0;line-height:1.9;color:var(--t2)">'+(t||'')+'</p>'};
  if(rec.current_dayun_advice)rh+='<div style="margin-bottom:20px">'+sT(L('当前大运综合建议','Current luck cycle'))+sB(rec.current_dayun_advice)+'</div>';
  if(rec.current_liunian_advice)rh+='<div style="margin-bottom:20px">'+sT(L('当前流年综合建议','Current year'))+sB(rec.current_liunian_advice)+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('财运','Wealth'))+sB(rec.wealth_advice||(career&&career.wealth_note?career.wealth_note:''))+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('感情','Relationships'))+sB(rec.love_advice||'')+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('行业','Industry'))+sB(rec.industry_prose||L('参考喜用五行选择行业方向。','Refer to favorable elements for industry guidance.'))+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('健康','Health'))+sB(rec.health_advice||'')+'</div>';
  var dirH='';if(rec.directions&&rec.directions.length){rec.directions.forEach(function(d){dirH+=d.direction+'('+d.wuxing+') '})}
  if(dirH)rh+='<div style="margin-bottom:20px">'+sT(L('宜居方位','Favorable directions'))+sB(dirH)+'</div>';
  var cityH='';if(rec.cities&&rec.cities.length){rec.cities.forEach(function(c){cityH+='<div style="margin-bottom:4px"><span style="font-weight:500">'+c.wuxing+'</span>: '+c.cities.join(isEn?', ':'、')+'</div>'})}
  if(cityH)rh+='<div style="margin-bottom:20px">'+sT(L('宜居城市','Favorable cities'))+sB(cityH)+'</div>';
  var colH='';(rec.color_xi||[]).forEach(function(c){colH+=c.wuxing+': '+c.colors.join(isEn?', ':'、')+'　'});
  if(colH)rh+='<div>'+sT(L('幸运颜色','Lucky colors'))+sB(colH)+'</div>';
  rh+='</div>';H('rpt-recs',rh);
}

/* ═══ Report Tabs ═══ */
var _rptUnlocked = false;

function switchRptTab(tab, btn){
  document.querySelectorAll('.rpt-tab').forEach(function(t){t.classList.remove('on')});
  btn.classList.add('on');
  document.querySelectorAll('.rpt-tab-content').forEach(function(c){c.classList.remove('on')});
  var el = document.getElementById('rpt-tab-'+tab);
  if(el) el.classList.add('on');
  
  // If advanced tab and not unlocked, show unlock overlay
  if(tab === 'advanced' && !_rptUnlocked){
    var unlock = document.getElementById('rpt-unlock');
    var content = document.getElementById('rpt-advanced-content');
    if(unlock) unlock.style.display = '';
    if(content) content.style.display = 'none';
  }
}

function tryUnlockCode(){
  var input = document.getElementById('unlockCode');
  var err = document.getElementById('unlockErr');
  var code = (input.value||'').trim().toUpperCase();
  
  var validCodes = (typeof KES_CONFIG !== 'undefined' && KES_CONFIG.VALID_CODES) ? KES_CONFIG.VALID_CODES : ['KESVIP'];
  
  if(validCodes.indexOf(code) >= 0){
    doUnlockAdvanced();
  } else {
    if(err) err.style.display = 'block';
    input.style.borderColor = 'var(--huo,#a84848)';
    setTimeout(function(){
      if(err) err.style.display = 'none';
      input.style.borderColor = 'var(--line,#eee)';
    }, 3000);
  }
}

function doUnlockAdvanced(){
  _rptUnlocked = true;
  var unlock = document.getElementById('rpt-unlock');
  var content = document.getElementById('rpt-advanced-content');
  var lockIcon = document.getElementById('tab-lock-icon');
  if(unlock) unlock.style.display = 'none';
  if(content) content.style.display = '';
  if(lockIcon) lockIcon.innerHTML = '';
  try { sessionStorage.setItem('kes_code_unlocked','1'); } catch(e){}
}

function toggleNav(){
  var btn=document.getElementById('navBurger');
  var links=document.getElementById('nav-main');
  if(btn)btn.classList.toggle('open');
  if(links)links.classList.toggle('open');
}

// Check if already unlocked (session) — only for code unlocks, NOT payment
// Payment unlock is checked via kesUser.paid in kes-auth.js
try {
  if(sessionStorage.getItem('kes_code_unlocked')==='1') _rptUnlocked = true;
} catch(e){}
