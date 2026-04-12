/* ═══════════════════════════════════════════════════════════
   KES · kes-connect.js v2.0 — 从零重建
   每个板块100%从API数据动态生成
═══════════════════════════════════════════════════════════ */
var KES_API = 'https://web-production-7fb80.up.railway.app';

/* ── 基础映射 ── */
var GAN_WX={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
var WX_CLASS={'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};
var ZHI_WX={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
var SHICHEN_HOUR={'亥':22,'子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20};
var TIAN_GAN=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var DI_ZHI=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var STEM_ELEM={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
var BRANCH_ELEM={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
var BRANCH_MAIN={'子':'癸','丑':'己','寅':'甲','卯':'乙','辰':'戊','巳':'丙','午':'丁','未':'己','申':'庚','酉':'辛','戌':'戊','亥':'壬'};
var CITY_COORDS={};
var CITY_TZ={};

/* ── 十神计算 ── */
function getTenGod(ds,os){
  var di=TIAN_GAN.indexOf(ds),oi=TIAN_GAN.indexOf(os);
  if(di<0||oi<0)return'';
  var wxO=['木','火','土','金','水'];
  var rel=(wxO.indexOf(STEM_ELEM[os])-wxO.indexOf(STEM_ELEM[ds])+5)%5;
  var same=(di%2)===(oi%2);
  return[same?'比肩':'劫财',same?'食神':'伤官',same?'偏财':'正财',same?'七杀':'正官',same?'偏印':'正印'][rel];
}
function getTenGodBr(ds,br){return BRANCH_MAIN[br]?getTenGod(ds,BRANCH_MAIN[br]):'';}
function yearGZ(y){return{stem:TIAN_GAN[(y-4)%10],branch:DI_ZHI[(y-4)%12]};}

/* ── 旺相休囚死 ── */
function getWxStatus(mb){
  var BS={'寅':'木','卯':'木','巳':'火','午':'火','申':'金','酉':'金','亥':'水','子':'水','辰':'土','未':'土','戌':'土','丑':'土'};
  var g={'木':'火','火':'土','土':'金','金':'水','水':'木'};
  var gb={'火':'木','土':'火','金':'土','水':'金','木':'水'};
  var c={'木':'土','火':'金','土':'水','金':'木','水':'火'};
  var cb={'土':'木','金':'火','水':'土','木':'金','火':'水'};
  var s=BS[mb]||'土',r={};
  r[s]='旺';r[g[s]]='相';r[gb[s]]='休';r[cb[s]]='囚';r[c[s]]='死';
  return r;
}

/* ── 用神推导 ── */
function deriveUseGods(wx,str,sc){
  var g={'木':'火','火':'土','土':'金','金':'水','水':'木'};
  var c={'木':'土','火':'金','土':'水','金':'木','水':'火'};
  var gb={'火':'木','土':'火','金':'土','水':'金','木':'水'};
  var cb={'土':'木','金':'火','水':'土','木':'金','火':'水'};
  if(/旺|强/.test(str))return{use:[g[wx],c[wx],cb[wx]],avoid:[gb[wx],wx]};
  if(/弱/.test(str))return{use:[gb[wx],wx],avoid:[g[wx],c[wx],cb[wx]]};
  if((sc||0)>=4.8)return{use:[g[wx],c[wx]],avoid:[gb[wx],wx]};
  return{use:[gb[wx],wx],avoid:[g[wx],c[wx]]};
}

/* ── 流年十神描述 ── */
var LN_DESC={
  '比肩':'比劫帮身，社交活跃人脉拓展，竞争加剧',
  '劫财':'劫财夺财，钱财进出频繁，投资需谨慎，防小人',
  '食神':'食神泄秀，才华展现期，创作灵感充沛',
  '伤官':'伤官透出，锋芒毕露，才华与叛逆并存',
  '偏财':'偏财入命，商机与意外之财并现，波动大',
  '正财':'正财稳健，正当收入增加，适合置业',
  '七杀':'七杀攻身，压力与挑战之年，需刚柔并济',
  '正官':'正官当头，事业正轨，升迁有利',
  '偏印':'偏印主事，思想转变期，适合学习进修',
  '正印':'正印生身，贵人扶持之年，学业有利'
};

/* ═══ 表单提交 ═══ */
function kesSubmit(){
  var isZh=document.documentElement.lang==='zh';
  var yEl=document.getElementById('birthYear'),mEl=document.getElementById('birthMonth'),dEl=document.getElementById('birthDay');
  var tSel=document.querySelector('.form-wrap .f-select:not(#birthYear):not(#birthMonth):not(#birthDay)');
  var cIn=document.getElementById('cityInput'),cVal=cIn?cIn.value:'';
  var gF=document.getElementById('gF')&&document.getElementById('gF').classList.contains('on');
  var gender=gF?'F':'M';
  if(!yEl||!yEl.value||!mEl||!mEl.value||!dEl||!dEl.value){alert(isZh?'请选择完整出生日期':'Select birth date');return;}
  if(!tSel||!tSel.value){alert(isZh?'请选择出生时辰':'Select birth hour');return;}
  if(!cVal||cVal.trim().length<2){alert(isZh?'请输入出生城市':'Enter city');return;}
  var year=parseInt(yEl.value),month=parseInt(mEl.value),day=parseInt(dEl.value);
  var shichen=tSel.value,hour=SHICHEN_HOUR[shichen];if(hour===undefined)hour=0;
  var dateVal=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  var coords=CITY_COORDS[cVal];
  if(!coords){for(var k in CITY_COORDS){if(k.includes(cVal)||cVal.includes(k.split(' ')[0])){coords=CITY_COORDS[k];break;}}}
  if(!coords&&cIn.dataset.lon&&cIn.dataset.lat)coords=[parseFloat(cIn.dataset.lon),parseFloat(cIn.dataset.lat)];
  if(!coords){alert(isZh?'请从下拉列表选择城市':'Select city from dropdown');return;}
  var lon=coords[0],lat=coords[1],tz=CITY_TZ[cVal]||Math.round(lon/15);

  var ld=document.getElementById('kesLoading'),ls=document.getElementById('loadStep');
  if(ld)ld.classList.add('on');
  function ss(m){if(ls)ls.textContent=m;}
  ss(isZh?'正在排盘计算…':'Calculating...');
  var btn=document.querySelector('.f-btn');
  if(btn){btn.disabled=true;btn.style.opacity='0.6';}

  fetch(KES_API+'/api/calculate',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({birth_year:year,birth_month:month,birth_day:day,birth_hour:hour,birth_minute:0,timezone_offset_hours:tz,longitude:lon,latitude:lat,gender:gender,name:'',lang:isZh?'zh-CN':'en'})
  })
  .then(function(r){if(!r.ok)throw new Error('API '+r.status);return r.json();})
  .then(function(data){
    ss(isZh?'排盘完成，渲染报告…':'Rendering...');
    if(typeof lockReport==='function')lockReport();
    fillReport(data,dateVal,shichen,gender,isZh);
    goPage('report');
    setTimeout(function(){if(ld)ld.classList.remove('on');},300);
    if(btn){btn.disabled=false;btn.style.opacity='1';}
  })
  .catch(function(e){
    alert((isZh?'出错：':'Error: ')+e.message);
    if(ld)ld.classList.remove('on');
    if(btn){btn.disabled=false;btn.style.opacity='1';}
  });
}

/* ═══ 报告填充 ═══ */
function fillReport(data,dateStr,shichen,gender,isZh){
  var chart=data.chart||{},pillars=chart.pillars||{},analysis=data.analysis||{},dayun=data.dayun||{},timeData=data.time||{};
  var ds=pillars.day?pillars.day.stem:'甲',dwx=GAN_WX[ds],dwxc=WX_CLASS[dwx];
  var str=chart.day_master_strength||'中和',sc=chart.day_master_score||0;
  var tg=chart.ten_gods||{},wx=chart.wuxing_counts||{};
  var kl=(chart.kong_wang&&chart.kong_wang.day_kong)||[];
  var ug=deriveUseGods(dwx,str,sc);

  console.log('=== REPORT ===','DM:',ds+dwx,'Str:',str,'Score:',sc,'Use:',ug.use,'Avoid:',ug.avoid);

  /* 头部 */
  var hdr=document.querySelector('.rpt-info-card');
  if(hdr){
    var dp=dateStr.split('-'),gt=isZh?(gender==='F'?'女命':'男命'):(gender==='F'?'Female':'Male');
    var dd=dp[0]+'年'+parseInt(dp[1])+'月'+parseInt(dp[2])+'日 '+shichen+'时';
    var ti='';
    if(timeData.true_solar_time){var t=new Date(timeData.true_solar_time);if(!isNaN(t.getTime()))ti=String(t.getUTCHours()).padStart(2,'0')+':'+String(t.getUTCMinutes()).padStart(2,'0');}
    hdr.innerHTML='<div class="rpt-f"><div class="rpt-f-l">性别</div><div class="rpt-f-v"><b>'+gt+'</b></div></div>'+
      '<div class="rpt-f"><div class="rpt-f-l">出生</div><div class="rpt-f-v">'+dd+'</div></div>'+
      '<div class="rpt-f"><div class="rpt-f-l">日主</div><div class="rpt-f-v"><b class="e-'+dwxc+'">'+ds+dwx+'</b></div></div>'+
      (ti?'<div class="rpt-f"><div class="rpt-f-l">真太阳时</div><div class="rpt-f-v">'+ti+'</div></div>':'');
  }

  /* 01 四柱 */
  var pos=['year','month','day','hour'],pn=['年　柱','月　柱','日　柱','时　柱'],ph='';
  for(var i=0;i<4;i++){
    var p=pillars[pos[i]]||{stem:'甲',branch:'子'};
    var sw=GAN_WX[p.stem]||'木',bw=ZHI_WX[p.branch]||'土';
    var ss=(pos[i]==='day')?'日主':(tg[pos[i]+'_stem']||'');
    var ik=kl.indexOf(p.branch)>=0;
    var hs=(chart.hidden_stems&&chart.hidden_stems[pos[i]])||[];
    var hh='';for(var h=0;h<hs.length;h++)hh+='<span class="r-pillar-h e-'+WX_CLASS[GAN_WX[hs[h]]||'木']+'">'+hs[h]+'</span>';
    ph+='<div class="r-pillar'+(pos[i]==='day'?' r-day-'+dwxc:'')+'"><div class="r-pillar-pos">'+pn[i]+'</div><div class="r-pillar-ss">'+ss+'</div><div class="r-pillar-gz"><span class="e-'+WX_CLASS[sw]+'">'+p.stem+'</span><span class="e-'+WX_CLASS[bw]+'">'+p.branch+'</span></div><div class="r-pillar-hidden">'+hh+'</div>'+(ik?'<span class="r-kong">空亡</span>':'')+'</div>';
  }
  var pg=document.querySelector('.r-pillar-grid');if(pg)pg.innerHTML=ph;
  var s01=document.querySelectorAll('.r-sub')[0];
  if(s01)s01.textContent=kl.length?'以真太阳时校正后排盘，空亡：'+kl.join('、'):'以真太阳时校正后排盘';

  /* 02 五行 */
  var wxO=['木','火','土','金','水'],wxT=0;wxO.forEach(function(w){wxT+=(wx[w]||0);});if(!wxT)wxT=1;
  var wxS=getWxStatus(pillars.month?pillars.month.branch:'子');
  var wxG=document.querySelector('.r-wx-grid');
  if(wxG){var mx=0;wxO.forEach(function(w){var p=Math.round((wx[w]||0)/wxT*100);if(p>mx)mx=p;});var wH='';
    wxO.forEach(function(w){var p=Math.round((wx[w]||0)/wxT*100);
      wH+='<div class="r-wx"><div class="r-wx-char e-'+WX_CLASS[w]+'">'+w+'</div><div class="r-wx-bar-wrap"><div class="r-wx-bar" style="width:'+Math.max(2,Math.round(p/(mx||1)*100))+'%;background:var(--'+WX_CLASS[w]+')"></div></div><div class="r-wx-status" style="font-size:11px;color:var(--t3)">'+(wxS[w]||'')+'</div></div>';
    });wxG.innerHTML=wH;}

  /* 03 身强弱 */
  var sm={'身弱':0,'偏弱':1,'中和':2,'偏强':3,'身强':4,'极弱':0,'极旺':4,'中性':2,'偏旺':3};
  var si=sm[str];if(si===undefined)si=2;
  var mt=document.querySelector('.r-meter-track');
  if(mt){var mH='';for(var s=0;s<5;s++)mH+='<div class="r-meter-seg'+(s<=si?' filled':'')+(s===si?' active':'')+'"></div>';mt.innerHTML=mH;}
  var ml=document.querySelector('.r-meter-labels');
  if(ml)ml.innerHTML=['身弱','偏弱','中和','偏强','身强'].map(function(l,i){return'<span'+(i===si?' class="on"':'')+'>'+l+'</span>';}).join('');
  var vd=document.querySelector('.r-str-verdict');if(vd)vd.textContent=str;
  var ex=document.querySelector('.r-str-explain');
  if(ex)ex.textContent='三分法评估：'+ds+dwx+'在'+(pillars.month?pillars.month.branch:'')+'月，判定为'+str+'（评分'+sc+'）。';

  /* 04 喜用忌神 */
  var yg=document.querySelector('.r-yj-grid');
  if(yg){var yH='<div class="r-yj-card"><div class="r-yj-label">用　神</div><div class="r-yj-chars">';
    ug.use.forEach(function(e){yH+='<span class="r-yj-char '+WX_CLASS[e]+'">'+e+'</span>';});
    yH+='</div></div><div class="r-yj-card"><div class="r-yj-label">忌　神</div><div class="r-yj-chars">';
    ug.avoid.forEach(function(e){yH+='<span class="r-yj-char '+WX_CLASS[e]+'">'+e+'</span>';});
    yH+='</div></div>';
    if(chart.tiaohuo_gods&&chart.tiaohuo_gods.length){yH+='<div class="r-yj-card"><div class="r-yj-label">调候用神</div><div class="r-yj-chars">';chart.tiaohuo_gods.forEach(function(t){yH+='<span class="r-yj-char '+WX_CLASS[GAN_WX[t]||'水']+'">'+t+'</span>';});yH+='</div></div>';}
    yg.innerHTML=yH;}

  /* 05 性格：日主图标 + 滴天髓 + 分析文本 */
  var DTL={'甲':'甲木参天，脱胎要火。春不容金，秋不容土。火炽乘龙，水宕骑虎。地润天和，植立千古。',
    '乙':'乙木虽柔，刲羊解牛。怀丁抱丙，跨凤乘猴。虚湿之地，骑马亦忧。藤萝系甲，可春可秋。',
    '丙':'丙火猛烈，欺霜侮雪。能煅庚金，逢辛反怯。土众成慈，水猖显节。虎马犬乡，甲来焚灭。',
    '丁':'丁火柔中，内性昭融。抱乙而孝，合壬而忠。旺而不烈，衰而不穷。如有嫡母，可秋可冬。',
    '戊':'戊土固重，既中且正。静翕动辟，万物司命。水润物生，火燥喜病。若在艮坤，怕冲宜静。',
    '己':'己土卑湿，中正蓄藏。不愁木盛，不畏水狂。火少火晦，金多金光。若要物旺，宜助宜帮。',
    '庚':'庚金带煞，刚健为最。得水而清，得火而锐。土润则生，土干则脆。能赢甲兄，输于乙妹。',
    '辛':'辛金软弱，温润而清。畏土之叠，乐水之盈。能扶社稷，能救生灵。热则喜母，寒则喜丁。',
    '壬':'壬水通河，能泄金气。刚中之德，周流不滞。通根透癸，冲天奔地。化则有情，从则相济。',
    '癸':'癸水至弱，达于天津。得龙而运，功化斯神。不愁火土，不论庚辛。合戊见火，化象斯真。'};
  var DM_DESC={'甲':'参天大树，正直向上，有栋梁之材的潜质','乙':'花草藤蔓，柔韧灵活，善于适应环境',
    '丙':'太阳光辉，光明磊落，热情大方','丁':'烛火星光，温暖细腻，心思缜密',
    '戊':'高山大地，稳重厚实，包容力强','己':'田园沃土，温和谦逊，善于滋养',
    '庚':'刀剑金属，果断刚毅，有原则有魄力','辛':'珠宝首饰，精致敏感，追求完美',
    '壬':'江河大海，奔放豁达，胸怀宽广','癸':'雨露溪流，温润细腻，直觉敏锐'};

  var eId=document.querySelector('.r-elem-id');
  if(eId) eId.innerHTML='<div class="r-elem-icon '+dwxc+'">'+ds+'</div><div><div class="r-elem-id-name">'+ds+dwx+'日主</div><div class="r-elem-id-desc">'+(DM_DESC[ds]||'')+'</div></div>';
  var pq=document.querySelector('.r-pq-text');
  if(pq) pq.textContent=DTL[ds]||'';

  fillText('性格',analysis.personality);fillText('Personality',analysis.personality);
  fillText('事业',analysis.career);fillText('Career',analysis.career);
  fillText('财运',analysis.wealth);fillText('Wealth',analysis.wealth);
  fillText('感情',analysis.relationship);fillText('Relationship',analysis.relationship);
  fillText('健康',analysis.health);fillText('Health',analysis.health);

  /* 09 前的2024-2025流年（免费区） */
  var freeTable=document.querySelector('.report-wrap .r-tbl');
  if(freeTable && !freeTable.closest('#paywallGate')){
    var fHead='<div class="r-tbl-head r-tbl-3"><div>年份</div><div>干支</div><div>运势概要</div></div>';
    var fRows='';
    for(var fy=2024;fy<=2025;fy++){
      var fgz=yearGZ(fy),fsg=getTenGod(ds,fgz.stem),fsE=STEM_ELEM[fgz.stem],fbE=BRANCH_ELEM[fgz.branch];
      var fsc=3;if(ug.use.indexOf(fsE)>=0)fsc+=0.8;if(ug.use.indexOf(fbE)>=0)fsc+=0.7;if(ug.avoid.indexOf(fsE)>=0)fsc-=0.8;if(ug.avoid.indexOf(fbE)>=0)fsc-=0.7;
      fsc=Math.max(1,Math.min(5,Math.round(fsc)));
      var frw=['凶','不利','平','吉','大吉'][fsc-1]||'平';
      fRows+='<div class="r-tbl-row r-tbl-3"><div class="r-a-year">'+fy+'</div><div class="r-a-gz"><span class="e-'+WX_CLASS[fsE]+'">'+fgz.stem+'</span><span class="e-'+WX_CLASS[fbE]+'">'+fgz.branch+'</span></div><div class="r-a-body"><div class="r-a-stars">'+fst+'</div><div class="r-a-note">'+fgz.stem+fgz.branch+'（'+fsg+'）：'+(LN_DESC[fsg]||'')+'</div></div></div>';
    }
    freeTable.innerHTML=fHead+fRows;
  }

  /* 09 大运 */
  if(dayun.periods&&dayun.periods.length){
    var dsc=document.querySelector('.r-dy-scroll');
    if(dsc){var dH='',cy=new Date().getFullYear(),by=parseInt(dateStr.split('-')[0]),cd=null;
      for(var d=0;d<Math.min(dayun.periods.length,8);d++){
        var dp=dayun.periods[d],sa=Math.round(dp.start_age);
        var ea=d+1<dayun.periods.length?Math.round(dayun.periods[d+1].start_age):sa+10;
        var sy=by+sa,ey=by+ea,ic=cy>=sy&&cy<ey;
        if(ic)cd={s:dp.stem,b:dp.branch,sg:getTenGod(ds,dp.stem),bg:getTenGodBr(ds,dp.branch),sa:sa,ea:ea};
        dH+='<div class="r-dy-item'+(ic?' cur':'')+'">'+
          (ic?'<div class="r-dy-label">当前</div>':'')+
          '<div class="r-dy-gz">'+dp.stem+dp.branch+'</div>'+
          '<div class="r-dy-age">'+sa+'至'+ea+'岁</div></div>';
      }
      dsc.innerHTML=dH;
      if(cd&&isZh){
        var dsh=document.querySelector('.r-dy-summary-head');
        if(dsh)dsh.textContent='当前大运：'+cd.s+cd.b+'（'+cd.sa+'至'+cd.ea+'岁）';
        var dsb=document.querySelector('.r-dy-summary-sub');
        if(dsb)dsb.textContent=cd.sg+'大运，'+cd.s+STEM_ELEM[cd.s]+'透干';
        var di=document.querySelectorAll('.r-dy-s-item .r-dy-s-body');
        if(di.length>=4){
          di[0].innerHTML='<b>'+cd.sg+'</b>：'+(LN_DESC[cd.sg]||'');
          di[1].textContent='地支'+cd.b+'（'+cd.bg+'），'+BRANCH_ELEM[cd.b]+'行入运。事业运势随大运十神变化。';
          di[2].textContent='感情运势关注夫妻宫与配偶星在此运期间的互动。';
          di[3].textContent='健康重点关注'+dwx+'行对应器官，结合当运五行调养。';
        }
      }
    }
  }

  /* 09+ 流年(付费墙内) */
  fillFlowYears(data,ds,dwx,ug.use,ug.avoid,isZh);
  /* 10 流月 */
  fillFlowMonths(analysis,ds,isZh);

  /* Claude API 润色（仅中文，异步） */
  if(isZh) enrichWithClaude(data, ds, dwx, str, sc, ug, gender);
}

/* ═══ Claude API 润色 ═══ */
function enrichWithClaude(data, ds, dwx, str, sc, ug, gender){
  var chart=data.chart||{}, analysis=data.analysis||{}, pillars=chart.pillars||{};
  var tg=chart.ten_gods||{};
  var body={
    chart:{
      day_master:ds, day_master_element:dwx, strength:str, score:sc,
      year_pillar:(pillars.year?pillars.year.stem+pillars.year.branch:''),
      month_pillar:(pillars.month?pillars.month.stem+pillars.month.branch:''),
      day_pillar:(pillars.day?pillars.day.stem+pillars.day.branch:''),
      hour_pillar:(pillars.hour?pillars.hour.stem+pillars.hour.branch:''),
      year_god:tg.year_stem||'', month_god:tg.month_stem||'', hour_god:tg.hour_stem||'',
      use_gods:ug.use.join('、'), avoid_gods:ug.avoid.join('、'),
      kong_wang:(chart.kong_wang&&chart.kong_wang.day_kong)?chart.kong_wang.day_kong.join(','):'',
      gender:gender
    },
    analysis:analysis, lang:'zh', isPaid:false
  };
  fetch('/api/enrich',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  .then(function(r){return r.ok?r.json():null;})
  .then(function(d){
    if(!d||!d.enriched)return;
    var e=d.enriched;
    if(e.personality) fillText('性格',e.personality);
    if(e.career) fillText('事业',e.career);
    if(e.relationship) fillText('感情',e.relationship);
    if(e.health) fillText('健康',e.health);
    if(e.dayun_detail){
      var di=document.querySelectorAll('.r-dy-s-item .r-dy-s-body');
      if(di.length>=1) di[0].innerHTML=e.dayun_detail.replace(/\n/g,'<br>');
    }
  })
  .catch(function(err){console.warn('Enrich skipped:',err);});
}

/* ═══ 工具函数 ═══ */
function fillText(kw,txt){
  if(!txt)return;var secs=document.querySelectorAll('#p-report .r-sec');
  for(var i=0;i<secs.length;i++){var h=secs[i].querySelector('.r-h');
    if(h&&h.textContent.indexOf(kw)>=0){var ps=secs[i].querySelectorAll('p');
      if(ps.length>0){ps[0].innerHTML=txt.replace(/\n/g,'<br>');for(var j=1;j<ps.length;j++)ps[j].textContent='';}break;}}
}

function fillFlowYears(data,ds,dwx,use,avoid,isZh){
  var tbl=document.querySelectorAll('#paywallGate .r-tbl');if(!tbl.length)return;
  var hd='<div class="r-tbl-head r-tbl-3"><div>'+(isZh?'年份':'Year')+'</div><div>'+(isZh?'干支':'Stems')+'</div><div>'+(isZh?'运势概要':'Summary')+'</div></div>';
  var rw='';
  for(var y=2026;y<=2033;y++){
    var gz=yearGZ(y),sg=getTenGod(ds,gz.stem),sE=STEM_ELEM[gz.stem],bE=BRANCH_ELEM[gz.branch];
    var sc=3;if(use.indexOf(sE)>=0)sc+=0.8;if(use.indexOf(bE)>=0)sc+=0.7;if(avoid.indexOf(sE)>=0)sc-=0.8;if(avoid.indexOf(bE)>=0)sc-=0.7;
    sc=Math.max(1,Math.min(5,Math.round(sc)));
    var rateWord=['凶','不利','平','吉','大吉'][sc-1]||'平';
    var nt=isZh?gz.stem+gz.branch+'（'+sg+'）：'+(LN_DESC[sg]||''):sg+' year';
    rw+='<div class="r-tbl-row r-tbl-3'+(y===new Date().getFullYear()?' now':'')+'"><div class="r-a-year">'+y+'</div><div class="r-a-gz"><span class="e-'+WX_CLASS[sE]+'">'+gz.stem+'</span><span class="e-'+WX_CLASS[bE]+'">'+gz.branch+'</span></div><div class="r-a-body"><div class="r-a-stars">'+st+'</div><div class="r-a-note">'+nt+'</div></div></div>';
  }
  tbl[0].innerHTML=hd+rw;
}

function fillFlowMonths(a,ds,isZh){
  if(!a.yearly_forecast||!Array.isArray(a.yearly_forecast))return;
  var tbl=document.querySelectorAll('#paywallGate .r-tbl');if(tbl.length<2)return;
  var hd='<div class="r-tbl-head r-tbl-3"><div>'+(isZh?'月份':'Month')+'</div><div>'+(isZh?'干支':'Stems')+'</div><div>'+(isZh?'运势概要':'Summary')+'</div></div>';
  var rw='';
  a.yearly_forecast.forEach(function(f){
    if(!f.stem||!f.branch)return;
    var sE=STEM_ELEM[f.stem]||'土',bE=BRANCH_ELEM[f.branch]||'土';
    var nt=(f.points&&f.points.length)?f.points[0].substring(0,80):(getTenGod(ds,f.stem)+'月');
    rw+='<div class="r-tbl-row r-tbl-3"><div class="r-a-year">'+(f.name||'')+'</div><div class="r-a-gz"><span class="e-'+WX_CLASS[sE]+'">'+f.stem+'</span><span class="e-'+WX_CLASS[bE]+'">'+f.branch+'</span></div><div class="r-a-body"><div class="r-a-note">'+nt+'</div></div></div>';
  });
  if(rw)tbl[1].innerHTML=hd+rw;
}

/* ═══ 初始化 ═══ */
document.addEventListener('DOMContentLoaded',function(){
  var btn=document.querySelector('.f-btn');if(btn)btn.setAttribute('onclick','kesSubmit()');
  var yEl=document.getElementById('birthYear');
  if(yEl){for(var y=2025;y>=1940;y--){var o=document.createElement('option');o.value=y;o.textContent=y;yEl.appendChild(o);}yEl.value='1993';}
  var dEl=document.getElementById('birthDay');
  if(dEl){for(var d=1;d<=31;d++){var o=document.createElement('option');o.value=d;o.textContent=d;dEl.appendChild(o);}dEl.value='30';}
  var mEl=document.getElementById('birthMonth');if(mEl)mEl.value='6';
});
