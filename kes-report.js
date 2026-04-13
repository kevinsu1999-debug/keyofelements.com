/**
 * KES 命元之钥 — Report Engine v3 (Bilingual EN/ZH)
 */
var KES_API='https://web-production-11af.up.railway.app';
var isEn=(document.documentElement.lang==='en');
var WX_C={'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};
var S_WX={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
var B_WX={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
var HR_MAP={'子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20,'亥':22};
var WX_EN={'木':'Wood','火':'Fire','土':'Earth','金':'Metal','水':'Water'};
var GOD_EN={'比肩':'Companion','劫财':'Rival','食神':'Output','伤官':'Creativity','偏财':'Windfall','正财':'Wealth','七杀':'7-Killings','正官':'Officer','偏印':'Ind.Resource','正印':'Resource','日主':'Day Master'};
var SHA_MEAN_ZH={'天乙贵人':'一生有贵人扶持之象','华盖':'独处倾向，对哲学、玄学有兴趣','桃花':'异性缘较旺','驿马':'一生走动多','禄神':'衣食无忧','羊刃':'性格刚强果断','文昌':'聪明好学，有文才','将星':'有领导能力','天德贵人':'逢凶化吉','月德贵人':'性情温和','太极贵人':'悟性极高','金舆':'出行多有贵人助','劫煞':'果断有魄力但冲动'};
var SHA_MEAN_EN={'天乙贵人':'Benefactors appear at critical moments','华盖':'Introspective, drawn to philosophy and arts','桃花':'Strong personal charm','驿马':'Life of movement and travel','禄神':'Innate material comfort','羊刃':'Strong-willed, bold','文昌':'Quick learner, literary talent','将星':'Natural leadership','天德贵人':'Turns danger into fortune','月德贵人':'Gentle and kind nature','太极贵人':'Exceptional intuition','金舆':'Travels with noble support','劫煞':'Decisive but impulsive'};
var SHA_MEAN=isEn?SHA_MEAN_EN:SHA_MEAN_ZH;
var STEM_IMG=isEn?{'甲':'Towering Tree','乙':'Tender Vine','丙':'Blazing Sun','丁':'Candle Flame','戊':'Mountain Earth','己':'Fertile Field','庚':'Forged Blade','辛':'Fine Jewelry','壬':'Mighty River','癸':'Gentle Rain'}:{'甲':'参天大树','乙':'小草藤蔓','丙':'太阳之火','丁':'灯烛之火','戊':'大地之土','己':'田园之土','庚':'刀剑之金','辛':'首饰之金','壬':'江河之水','癸':'雨露之水'};

function $(id){return document.getElementById(id)}
function H(id,v){var e=$(id);if(e)e.innerHTML=v}
function T(id,v){var e=$(id);if(e)e.textContent=v}
function ec(s){return '<span class="e-'+WX_C[S_WX[s]]+'">'+s+'</span>'}
function ecb(b){return '<span class="e-'+WX_C[B_WX[b]]+'">'+b+'</span>'}
function L(zh,en){return isEn?en:zh}

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
  T('rpt-birth',d.meta.birth+(isEn?'':' '+d.meta.birth_hour_branch+'时'));
  H('rpt-daymaster','<b class="e-'+c+'">'+ds+' '+wx+'</b>');
  T('rpt-birthplace',d.meta.birth_city||'—');
  T('rpt-residence',d.meta.residence_city||'—');if(isEn){var rc=$('rpt-residence');if(rc&&!d.meta.residence_city)rc.textContent='Not specified'}
  var corr=d.time.total_correction;
  T('rpt-solar',(corr>=0?'+':'')+corr+L('分钟',' min'));
  R01(p,d.hidden_stems,d.ten_gods,d.kong_wang);
  R03(d.wuxing);R04(d.kong_wang,p);R05(d.shen_sha);
  R06(d.strength,d.pattern,ds,wx);R07(d.yongshen);R08(d.personality,ds,wx,c);
  R09(d.relationship);R10(d.children);R11(d.career);R12(d.health);
  R13(d.dayun,d.ten_years);R14(d.liunian,d.liuyue);R15(d.warnings,d.recommendations,d.career,d.dayun,d.yongshen);
}

function R01(p,hid,gods,kw){
  var pos=['year','month','day','hour'],lbl=isEn?['Year','Month','Day Master','Hour']:['年　柱','月　柱','日　柱','时　柱'];
  var ks=new Set((kw.day_kong||[]).concat(kw.year_kong||[]));var h='';
  pos.forEach(function(k,i){
    var stem=p[k].stem,branch=p[k].branch,sc=WX_C[S_WX[stem]],bc=WX_C[B_WX[branch]];
    var isDay=k==='day';
    var stemGod=isDay?L('日主',''):(gods[k]||{}).stem_god||'';
    if(isEn&&!isDay)stemGod=(gods[k]||{}).stem_god_en||GOD_EN[stemGod]||stemGod;
    var branchGod=(gods[k]||{}).branch_god||'';
    if(isEn)branchGod=(gods[k]||{}).branch_god_en||GOD_EN[branchGod]||branchGod;
    var dayCls=isDay?' r-day-'+sc:'';
    var kongMk=ks.has(branch)?'<span class="r-kong">'+L('空亡','Void')+'</span>':'';
    var hiddenGods=(gods[k]||{})[isEn?'hidden_gods_en':'hidden_gods']||(gods[k]||{}).hidden_gods||[];
    var hh=hiddenGods.map(function(arr){var s=arr[0],god=arr[1];return '<span class="r-pillar-h e-'+WX_C[S_WX[s]]+'">'+s+'</span><span style="font-size:9px;color:var(--t4)">'+god+'</span>'}).join(' ');
    h+='<div class="r-pillar'+dayCls+'"><div class="r-pillar-pos">'+lbl[i]+'</div><div class="r-pillar-ss" style="background:var(--'+sc+'-bg,rgba(200,200,200,.08));color:var(--'+sc+');border:1px solid var(--'+sc+'-ln,rgba(200,200,200,.15))">'+stemGod+'</div><div class="r-pillar-gz"><span class="e-'+sc+'">'+stem+'</span><span class="e-'+bc+'">'+branch+'</span></div><div class="r-pillar-ss" style="background:var(--'+bc+'-bg,rgba(200,200,200,.08));color:var(--'+bc+');border:1px solid var(--'+bc+'-ln,rgba(200,200,200,.15));font-size:10px;margin-top:4px">'+branchGod+'</div><div class="r-pillar-hidden">'+hh+'</div><div style="font-size:9px;color:var(--t4);margin-top:6px;border-top:1px solid var(--line);padding-top:4px">'+(p[k].nayin||'')+'</div>'+kongMk+'</div>';
  });
  H('rpt-pillars',h);
}

function R03(wx){
  var order=['木','火','土','金','水'],total=0,max=0;
  order.forEach(function(e){total+=wx[e]||0;max=Math.max(max,wx[e]||0)});
  if(!total)total=1;if(!max)max=1;var h='';
  order.forEach(function(e){var v=wx[e]||0,pct=Math.round(v/total*100),w=Math.round(v/max*100),co=WX_C[e];h+='<div class="r-wx"><div class="r-wx-char e-'+co+'">'+(isEn?WX_EN[e]:e)+'</div><div class="r-wx-bar-wrap"><div class="r-wx-bar" style="width:'+w+'%;background:var(--'+co+')"></div></div><div class="r-wx-pct e-'+co+'">'+pct+'%</div><div class="r-wx-status">'+(pct>=35?L('旺','Thriving'):pct>=20?L('相','Active'):pct>=8?L('休','Resting'):pct>=3?L('囚','Trapped'):L('死','Dead'))+'</div></div>'});
  H('rpt-wuxing',h);
}

function R04(kw,p){var h='';
  if(kw.day_kong&&kw.day_kong.length){h+='<div class="r-warn"><div class="r-warn-title">'+L('日空亡：','Day Void: ')+kw.day_kong.join('、')+'</div><div class="r-warn-body">'+L('空亡地支虚而不实，力量减弱。','Void branches carry reduced power.')+'</div></div>'}
  if(kw.year_kong&&kw.year_kong.length)h+='<div class="r-warn"><div class="r-warn-title">'+L('年空亡：','Year Void: ')+kw.year_kong.join('、')+'</div><div class="r-warn-body">'+L('年空亡影响祖上和早年运势。','Affects ancestral and early fortune.')+'</div></div>';
  H('rpt-kongwang',h||'<div style="color:var(--t3);font-size:13px">'+L('无显著空亡影响','No significant void impact')+'</div>');
}

function R05(sha){
  var entries=Object.entries(sha||{}).filter(function(kv){return kv[1]&&kv[1].length});
  if(!entries.length){var sec=$('rpt-shensha-sec');if(sec)sec.style.display='none';return}
  var sec=$('rpt-shensha-sec');if(sec)sec.style.display='';var h='';
  entries.forEach(function(kv){var name=kv[0],pos=kv[1];var baseName=name.split(' (')[0];var meaning=SHA_MEAN[baseName]||'';h+='<div class="r-warn"><div class="r-warn-title">'+name+'</div><div class="r-warn-body"><b>'+L('位于 ','At ')+(Array.isArray(pos)?pos.join(', '):pos)+'</b>'+(meaning?'<br>'+meaning:'')+'</div></div>'});
  H('rpt-shensha',h);
}

function R06(s,pat,ds,wx){
  var levels=isEn?['Weak','Weak','Balanced','Strong','Strong']:['极弱','偏弱','中和','偏强','身强'];
  var idx=levels.indexOf(s.verdict);if(idx<0)idx=1;
  document.querySelectorAll('#rpt-meter .r-meter-seg').forEach(function(seg,i){seg.className='r-meter-seg';if(i<=idx)seg.classList.add('filled');if(i===idx)seg.classList.add('active')});
  document.querySelectorAll('#rpt-meter .r-meter-labels span').forEach(function(l,i){l.className='';if(i===idx)l.classList.add('on')});
  T('rpt-verdict',s.verdict);
  T('rpt-verdict-explain',L('得令','Seasonal')+'：'+(s.de_ling?'✓':'✗')+'　'+L('得地','Rooted')+'：'+(s.de_di?'✓':'✗')+'　'+L('得势','Support')+'：'+(s.de_shi?'✓':'✗'));if(isEn){var mls=document.querySelectorAll('#rpt-meter .r-meter-labels span');if(mls.length===5){mls[0].textContent='Weak';mls[1].textContent='';mls[2].textContent='Balanced';mls[3].textContent='';mls[4].textContent='Strong'}}
  var strH='';[{k:L('得　令','Seasonal'),v:s.de_ling,d:s.ling_detail},{k:L('得　地','Rooted'),v:s.de_di,d:s.di_detail},{k:L('得　势','Support'),v:s.de_shi,d:s.shi_detail}].forEach(function(x){strH+='<div class="r-str-item"><div class="r-str-label">'+x.k+'</div><div class="r-str-val '+(x.v?'yes':'no')+'">'+(x.v?L('已得','Yes'):L('未得','No'))+'</div><div class="r-str-detail">'+(x.d||'')+'</div></div>'});
  H('rpt-strength',strH);
  if(pat)H('rpt-pattern','<b>'+L('格局：','Pattern: ')+pat.name+'（'+pat.status+'）</b><br>'+(pat.description||''));
}

function R07(ys){
  function chars(arr){return(arr||[]).map(function(x){var wl=x.wuxing_en||WX_EN[x.wuxing]||x.wuxing;return '<span class="r-yj-char '+(WX_C[x.wuxing]||'tu')+'">'+(isEn?wl:x.wuxing)+'</span>'}).join('')}
  function wxAnnot(wx){if(!isEn)return'';var m={'木':'Wood','火':'Fire','土':'Earth','金':'Metal','水':'Water'};return m[wx]?'<div style="font-size:9px;color:var(--t4,#999);margin-top:1px">'+m[wx]+'</div>':''}
  function charWithAnnot(arr){return(arr||[]).map(function(x){var c=WX_C[x.wuxing]||'tu';return '<span class="r-yj-char '+c+'" style="display:inline-flex;flex-direction:column;align-items:center">'+(isEn?x.wuxing:x.wuxing)+wxAnnot(x.wuxing)+'</span>'}).join('')}
  function thCharAnnot(arr){return(arr||[]).map(function(t){var wx=S_WX[t];var c=WX_C[wx]||'tu';return '<span class="r-yj-char '+c+'" style="display:inline-flex;flex-direction:column;align-items:center">'+t+wxAnnot(wx)+'</span>'}).join('')}
  H('rpt-yongshen','<div class="r-yj-card"><div class="r-yj-label">'+L('喜用神','Favorable')+'</div><div class="r-yj-chars">'+charWithAnnot(ys.xi)+'</div></div><div class="r-yj-card"><div class="r-yj-label">'+L('忌　神','Unfavorable')+'</div><div class="r-yj-chars">'+charWithAnnot(ys.ji)+'</div></div><div class="r-yj-card"><div class="r-yj-label">'+L('调候用神','Seasonal')+'</div><div class="r-yj-chars">'+thCharAnnot(ys.tiaohuo||[])+'</div></div>');
  if(ys.tiaohuo_note){var note=ys.tiaohuo_note.replace(/调候用神：[^。]+[。]?/,'').trim();var explain=L('调候用神是根据出生月份的气候寒暖，额外取用的平衡之神——与喜忌用神互为补充。','Seasonal Balancing Gods compensate for the birth month climate — complementing the favorable/unfavorable system.');H('rpt-tiaohuo',(note?note+' ':'')+explain)}
}

function R08(per,ds,wx,c){if(!per)return;if(!c){var m={'Wood':'木','Fire':'火','Earth':'土','Metal':'金','Water':'水'};c=WX_C[m[wx]||wx]||'tu'}H('rpt-elemid','<div class="r-elem-icon '+c+'">'+ds+'</div><div><div class="r-elem-id-name">'+ds+' · '+wx+(isEn?' Element':'命')+'</div><div class="r-elem-id-desc">'+(STEM_IMG[ds]||'')+'</div></div>');if(per.quote)H('rpt-quote','<div class="r-pq-text">'+per.quote+'</div><div class="r-pq-src">'+per.quote_src+'</div>');var h='<p>'+per.intro.replace(/\n\n/g,'</p><p>')+'</p>';if(per.traits&&per.traits.length){h+='<table style="width:100%;border-collapse:collapse;margin-top:16px">';per.traits.forEach(function(t){h+='<tr><td style="padding:8px 0;border-bottom:1px solid var(--line);font-weight:600;white-space:nowrap;width:70px;vertical-align:top">'+t.layer+'</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid var(--line);color:var(--t2)">'+t.text+'</td></tr>'});h+='</table>'}H('rpt-personality',h)}

function R09(rel){if(!rel)return;var h='';if(rel.prose){h=rel.prose.replace(/\n\n/g,'</p><p>');h='<p>'+h+'</p>'}H('rpt-love',h||'<p>'+L('感情分析正在生成中。','Generating relationship analysis…')+'</p>')}
function R10(ch){H('rpt-children','<p>'+(ch||'')+'</p>')}
function R11(career){if(!career)return;var h='';if(career.prose){h=career.prose.replace(/\n\n/g,'</p><p>');h='<p>'+h+'</p>'}H('rpt-career',h)}
function R12(items){if(!items||!items.length)return;var h='';items.forEach(function(x){h+='<div class="r-hc"><div class="r-hc-title">'+x.part+'</div><div class="r-hc-body">'+x.reason+'</div></div>'});H('rpt-health',h);H('rpt-health-note',L('大运走喜用神五行运时身体好，走忌神运时需注意保养。','Health improves during favorable Luck Cycles; take extra care during unfavorable ones.'))}

function R13(dayun,tenYears){
  if(!dayun)return;
  T('rpt-dayun-sub',(dayun.is_forward?L('顺行','Forward'):L('逆行','Reverse'))+'　'+L('起运约','Onset ~')+dayun.onset_age+L('岁',' yrs'));
  var curYear=new Date().getFullYear(),curAge=dayun.current_age;H('rpt-dayun-scroll','');
  var sumH='<div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:60px 60px 80px 80px 1fr"><div>'+L('大运','Cycle')+'</div><div>'+L('年龄','Age')+'</div><div>'+L('年份(约)','Year(~)')+'</div><div>'+L('核心','Key')+'</div><div>'+L('概要','Summary')+'</div></div>';
  (dayun.periods||[]).forEach(function(d){var isCur=(d.start_age<=curAge&&curAge<=d.end_age);var sY=curYear-curAge+d.start_age;var eY=sY+9;var kw=isEn?(d.keyword_en||d.keyword||''):d.keyword||'';var sm=isEn?(d.summary_en||d.summary||''):d.summary||'';sumH+='<div class="r-tbl-row'+(isCur?' r-tbl-cur':'')+'" style="grid-template-columns:60px 60px 80px 80px 1fr"><div style="font-weight:600">'+ec(d.stem)+ecb(d.branch)+'</div><div>'+d.start_age+'-'+d.end_age+'</div><div>'+sY+'-'+eY+'</div><div style="font-weight:600;color:var(--t1)">'+kw+'</div><div class="r-a-note">'+sm+'</div></div>'});
  sumH+='</div>';
  if(tenYears&&tenYears.length){var bY=curYear-curAge;sumH+='<div style="margin-top:24px;font-size:14px;font-weight:700;color:var(--t1);margin-bottom:12px">'+L('逐年运势','Year by Year')+'</div><div class="r-tbl"><div class="r-tbl-head" style="grid-template-columns:60px 60px 80px 80px 1fr"><div>'+L('年份','Year')+'</div><div>'+L('干支','Stems')+'</div><div>'+L('年龄(约)','Age(~)')+'</div><div>'+L('核心','Key')+'</div><div>'+L('概要','Summary')+'</div></div>';tenYears.forEach(function(yr){var age=yr.year-bY;var kw=isEn?(yr.keyword_en||yr.keyword||''):yr.keyword||'';var txt=isEn?(yr.text_en||yr.text||''):yr.text||'';sumH+='<div class="r-tbl-row" style="grid-template-columns:60px 60px 80px 80px 1fr"><div>'+yr.year+'</div><div>'+ec(yr.stem)+ecb(yr.branch)+'</div><div>'+age+'</div><div style="font-weight:600;color:var(--t1)">'+kw+'</div><div class="r-a-note">'+txt+'</div></div>'});sumH+='</div>'}
  H('rpt-dayun-detail',sumH);
}

function R14(ln,months){
  if(!ln)return;
  T('rpt-ln-title',ln.year+(isEn?' '+ln.gz+' Annual Forecast':'年 '+ln.gz+'年运势'));
  T('rpt-ln-sub',ln.gz+L('年',' Year'));
  var allText='';if(isEn&&ln.summary_en){allText=ln.summary_en}else if(isEn&&ln.text_en){allText=ln.text_en}else{(ln.summary||[]).forEach(function(p){if(p)allText+=p});if(ln.text)allText+=ln.text}
  var sumH='<div class="r-ly-detail"><div class="r-ly-h">'+ln.year+L('年流年综述',' Annual Overview')+'</div><div class="r-ly-body"><p>'+allText+'</p></div></div>';
  H('rpt-ln-summary',sumH);
  if(months&&months.length){var h='<div style="background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden"><div class="r-tbl" style="border:none"><div class="r-tbl-head" style="grid-template-columns:60px 60px 80px 80px 1fr"><div>'+L('月份','Month')+'</div><div>'+L('干支','Stems')+'</div><div>'+L('十神','God')+'</div><div>'+L('核心','Key')+'</div><div>'+L('概要','Summary')+'</div></div>';months.forEach(function(m){var kw=isEn?(m.keyword_en||m.keyword||''):(m.keyword||(m.good?'顺':'守'));var god=isEn?(m.stem_god_en||GOD_EN[m.stem_god]||m.stem_god):(m.stem_god||'');var txt=isEn?(m.text_en||m.text||''):(m.text||'');h+='<div class="r-tbl-row" style="grid-template-columns:60px 60px 80px 80px 1fr"><div class="r-a-year">'+m.start_date+'</div><div class="r-a-gz">'+ec(m.stem)+ecb(m.branch)+'</div><div style="font-size:var(--fs-sm);color:var(--t2)">'+god+'</div><div style="font-weight:600;color:var(--t1)">'+kw+'</div><div class="r-a-note">'+txt+'</div></div>'});h+='</div></div>';H('rpt-ln-months',h)}
}

function R15(warnings,rec,career,dayun,yongshen){
  var wh='';if(warnings&&warnings.length){warnings.forEach(function(w){wh+='<div class="r-warn" style="background:var(--card);border-color:var(--line)"><div class="r-warn-title">'+w.title+'</div><div class="r-warn-body">'+w.body+'</div></div>'})}else{wh='<div class="r-warn" style="background:var(--card);border-color:var(--line)"><div class="r-warn-title">'+L('整体平稳','Overall Stable')+'</div><div class="r-warn-body">'+L('命局无特别严重的冲突标记。','No severe conflict markers.')+'</div></div>'}
  H('rpt-warnings',wh);
  if(!rec)return;
  var rh='<div class="r-rec-card full" style="grid-column:1/-1">';
  var sT=function(t){return '<div style="font-weight:700;color:var(--t1);font-size:14px;margin-bottom:8px">'+t+'</div>'};
  var sB=function(t){return '<p style="margin:0;line-height:1.9;color:var(--t2)">'+(t||'')+'</p>'};
  if(rec.current_dayun_advice)rh+='<div style="margin-bottom:20px">'+sT(L('当前大运综合建议','Current Luck Cycle Guidance'))+sB(rec.current_dayun_advice)+'</div>';
  if(rec.current_liunian_advice)rh+='<div style="margin-bottom:20px">'+sT(L('当前流年综合建议','Current Year Guidance'))+sB(rec.current_liunian_advice)+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('财运','Wealth'))+sB(rec.wealth_advice||(career&&career.wealth_note?career.wealth_note:''))+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('感情','Relationships'))+sB(rec.love_advice||'')+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('行业','Industry'))+sB(rec.industry_prose||L('参考喜用五行选择行业方向。','Refer to favorable elements.'))+'</div>';
  rh+='<div style="margin-bottom:20px">'+sT(L('健康','Health'))+sB(rec.health_advice||'')+'</div>';
  var dirH='';if(rec.directions&&rec.directions.length){rec.directions.forEach(function(d){dirH+=(isEn?d.direction:d.direction)+' ('+d.wuxing+')　'})}
  if(dirH)rh+='<div style="margin-bottom:20px">'+sT(L('宜居方位','Favorable Directions'))+sB(dirH)+'</div>';
  var cityH='';if(rec.cities&&rec.cities.length){rec.cities.forEach(function(c){cityH+='<div style="margin-bottom:4px"><span style="font-weight:500">'+c.wuxing+'</span>: '+c.cities.join(', ')+'</div>'})}
  if(cityH)rh+='<div style="margin-bottom:20px">'+sT(L('宜居城市','Favorable Cities'))+sB(cityH)+'</div>';
  var colH='';(rec.color_xi||[]).forEach(function(c){colH+=c.wuxing+': '+c.colors.join(', ')+'　'});
  if(colH)rh+='<div>'+sT(L('幸运颜色','Lucky Colors'))+sB(colH)+'</div>';
  rh+='</div>';H('rpt-recs',rh);
}
