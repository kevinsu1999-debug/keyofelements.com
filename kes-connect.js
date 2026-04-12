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
/* ── 用神推导（基于三分法结果）── */
function deriveUseGods(wx,str,sc,breakdown){
  var g={'木':'火','火':'土','土':'金','金':'水','水':'木'};
  var c={'木':'土','火':'金','土':'水','金':'木','水':'火'};
  var gb={'火':'木','土':'火','金':'土','水':'金','木':'水'};
  var cb={'土':'木','金':'火','水':'土','木':'金','火':'水'};
  // 身强 → 泄耗克（含官杀）
  if(/身强|极旺/.test(str))return{use:[g[wx],c[wx],cb[wx]],avoid:[gb[wx],wx]};
  // 偏强 → 泄耗（不含官杀）
  if(/偏强|偏旺/.test(str))return{use:[g[wx],c[wx]],avoid:[gb[wx],wx]};
  // 身弱 → 生扶
  if(/弱/.test(str))return{use:[gb[wx],wx],avoid:[g[wx],c[wx],cb[wx]]};
  // 中和 → 用三分法+得众判断偏向
  var sf=(breakdown&&breakdown['三分法'])||{};
  var deLing=sf['得令'], deDi=sf['得地'], deShi=sf['得势'], deZhong=sf['得众'];
  // 有根有势 OR 得令 OR 得众 → 偏强，宜泄耗
  if((deDi&&deShi)||deLing||deZhong)return{use:[g[wx],c[wx]],avoid:[gb[wx],wx]};
  // 其他中和 → 偏弱，宜生扶
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
    ss(isZh?'排盘完成，正在深度分析…':'Deep analysis...');
    if(typeof lockReport==='function')lockReport();
    // 先填报告骨架但不显示
    fillReport(data,dateVal,shichen,gender,isZh);
    // Loading：设置回调，等Claude完成才显示
    var _reportReady=false;
    window._kesShowReport=function(){
      if(_reportReady)return;_reportReady=true;
      ss(isZh?'报告生成完毕':'Report ready');
      setTimeout(function(){
        goPage('report');
        if(ld)ld.classList.remove('on');
        if(btn){btn.disabled=false;btn.style.opacity='1';}
      },800);
    };
    // 超时兜底：25秒后强制展示
    setTimeout(function(){window._kesShowReport();},25000);
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
  // 前端自算四维度用于用神推导
  var shengWo={'木':'水','火':'木','土':'火','金':'土','水':'金'};
  var HS_MAP={'子':['癸'],'丑':['己','辛','癸'],'寅':['甲','丙','戊'],'卯':['乙'],'辰':['戊','乙','癸'],'巳':['丙','庚','戊'],'午':['丁','己'],'未':['己','丁','乙'],'申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲']};
  var klArr=(chart.kong_wang&&chart.kong_wang.day_kong)||[];
  var _mb=pillars.month?pillars.month.branch:'';
  var _mbHS=HS_MAP[_mb]||[];
  var _deLing=_mbHS.length&&(GAN_WX[_mbHS[0]]===dwx||GAN_WX[_mbHS[0]]===shengWo[dwx]);
  var _deDi=false;
  ['year','month','day','hour'].forEach(function(p){var br=pillars[p]?pillars[p].branch:'';var bHS=HS_MAP[br]||[];if(bHS.length&&GAN_WX[bHS[0]]===dwx&&klArr.indexOf(br)<0)_deDi=true;});
  var _deShi=false;
  ['year','month','hour'].forEach(function(p){var st=pillars[p]?pillars[p].stem:'';if(GAN_WX[st]===dwx)_deShi=true;});
  var _allWx={'木':0,'火':0,'土':0,'金':0,'水':0};
  ['year','month','day','hour'].forEach(function(p){var st=pillars[p]?pillars[p].stem:'';_allWx[GAN_WX[st]]=(_allWx[GAN_WX[st]]||0)+1;var br=pillars[p]?pillars[p].branch:'';(HS_MAP[br]||[]).forEach(function(h,hi){_allWx[GAN_WX[h]]=(_allWx[GAN_WX[h]]||0)+[0.7,0.3,0.1][Math.min(hi,2)];});});
  var _wxT=0;for(var wk in _allWx)_wxT+=_allWx[wk];
  var _dayPct=(_allWx[dwx]||0)/(_wxT||1);
  var _helpPct=((_allWx[dwx]||0)+(_allWx[shengWo[dwx]]||0))/(_wxT||1);
  var _deZhong=(_dayPct>=0.28||_helpPct>=0.45);
  var _frontBD={'三分法':{'得令':_deLing,'得地':_deDi,'得势':_deShi,'得众':_deZhong}};
  var ug=deriveUseGods(dwx,str,sc,_frontBD);

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
  // 前端自算四维度（不依赖后端breakdown）
  var strGrid=document.querySelector('.r-str-grid');
  if(strGrid&&isZh){
    var mb=pillars.month?pillars.month.branch:'';
    var mbWx=BRANCH_ELEM[mb]||'土';
    var shengWo={'木':'水','火':'木','土':'火','金':'土','水':'金'};
    var klArr=(chart.kong_wang&&chart.kong_wang.day_kong)||[];
    var HS_MAP={'子':['癸'],'丑':['己','辛','癸'],'寅':['甲','丙','戊'],'卯':['乙'],'辰':['戊','乙','癸'],'巳':['丙','庚','戊'],'午':['丁','己'],'未':['己','丁','乙'],'申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲']};

    var PZH={'year':'年','month':'月','day':'日','hour':'时'};
    // 1.得令：月支主气
    var mbHS=HS_MAP[mb]||[];
    var mbMainWx=mbHS.length?GAN_WX[mbHS[0]]:'';
    var deLing=(mbMainWx===dwx||mbMainWx===shengWo[dwx]);
    var dlDetail=deLing?mb+'月主气'+mbHS[0]+'（'+mbMainWx+'）助'+dwx+'，得令有力':mb+'月'+mbWx+'当令，'+dwx+'处休囚位，月令不助日元';

    // 2.得地：地支主气通根（非空亡）
    var deDi=false,ddParts=[];
    ['year','month','day','hour'].forEach(function(p){
      var br=pillars[p]?pillars[p].branch:'';
      var bHS=HS_MAP[br]||[];
      if(bHS.length&&GAN_WX[bHS[0]]===dwx){
        if(klArr.indexOf(br)>=0){ddParts.push('（空亡减力）');}
        else{deDi=true;ddParts.push(({'year':'年','month':'月','day':'日','hour':'时'}[p])+'支'+br+'本气'+bHS[0]+'通根');}
      }
    });
    var ddDetail=deDi?ddParts.join('，'):'地支无'+dwx+'行有力通根'+(klArr.length?'（'+klArr.join('、')+'空亡）':'');

    // 3.得势：其他天干比劫印星
    var deShi=false,dsParts=[];
    ['year','month','hour'].forEach(function(p){
      var st=pillars[p]?pillars[p].stem:'';
      var stWx=GAN_WX[st];
      if(stWx===dwx){deShi=true;dsParts.push(PZH[p]+'干'+st+'（比劫）帮身');}
      else if(stWx===shengWo[dwx]){dsParts.push(PZH[p]+'干'+st+'（印星）生身');if(dsParts.length>=2)deShi=true;}
    });
    var dsDetail=deShi?dsParts.join('，'):'天干缺少比劫印星帮扶';

    // 4.得众：五行总量
    var allWx2={'木':0,'火':0,'土':0,'金':0,'水':0};
    ['year','month','day','hour'].forEach(function(p){
      var st=pillars[p]?pillars[p].stem:'';
      allWx2[GAN_WX[st]]=(allWx2[GAN_WX[st]]||0)+1.0;
      var br=pillars[p]?pillars[p].branch:'';
      (HS_MAP[br]||[]).forEach(function(h,hi){allWx2[GAN_WX[h]]=(allWx2[GAN_WX[h]]||0)+[0.7,0.3,0.1][Math.min(hi,2)];});
    });
    var wxTotal2=0;for(var wk in allWx2)wxTotal2+=allWx2[wk];
    var dayPct=Math.round((allWx2[dwx]||0)/(wxTotal2||1)*100);
    var helpPct=Math.round(((allWx2[dwx]||0)+(allWx2[shengWo[dwx]]||0))/(wxTotal2||1)*100);
    var deZhong=(dayPct>=28||helpPct>=45);
    var dzDetail=deZhong?'得众：'+dwx+'占'+dayPct+'%，'+dwx+'+'+shengWo[dwx]+'占'+helpPct+'%':'不得众：'+dwx+'占'+dayPct+'%，'+dwx+'+'+shengWo[dwx]+'占'+helpPct+'%';

    strGrid.innerHTML=
      '<div class="r-str-item"><div class="r-str-label">得　令</div><div class="r-str-val '+(deLing?'yes':'no')+'">'+(deLing?'已得':'未得')+'</div><div class="r-str-detail">'+dlDetail+'</div></div>'+
      '<div class="r-str-item"><div class="r-str-label">得　地</div><div class="r-str-val '+(deDi?'yes':'no')+'">'+(deDi?'已得':'未得')+'</div><div class="r-str-detail">'+ddDetail+'</div></div>'+
      '<div class="r-str-item"><div class="r-str-label">得　势</div><div class="r-str-val '+(deShi?'yes':'no')+'">'+(deShi?'已得':'未得')+'</div><div class="r-str-detail">'+dsDetail+'</div></div>'+
      '<div class="r-str-item"><div class="r-str-label">得　众</div><div class="r-str-val '+(deZhong?'yes':'no')+'">'+(deZhong?'已得':'未得')+'</div><div class="r-str-detail">'+dzDetail+'</div></div>';
  }
  var ex=document.querySelector('.r-str-explain');
  if(ex){
    var reasons=[];
    if(_deLing)reasons.push('得令');if(_deDi)reasons.push('得地');if(_deShi)reasons.push('得势');if(_deZhong)reasons.push('得众');
    if(reasons.length) ex.textContent='综合'+reasons.join('、')+'，判定日主'+ds+dwx+'为'+str+'。';
    else ex.textContent='四维度均不得，判定日主'+ds+dwx+'为'+str+'。';
  }

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
  // 健康详情grid
  var hGrid=document.querySelector('.r-health-grid');
  if(hGrid&&isZh){
    var wxOrgan={'木':'肝胆','火':'心脑血管','土':'脾胃消化','金':'肺部呼吸','水':'肾脏泌尿'};
    var hCards=[];
    var wxArr=['木','火','土','金','水'];
    wxArr.forEach(function(w){
      var pct=Math.round((wx[w]||0)/(Object.values(wx).reduce(function(a,b){return a+b;},0)||1)*100);
      if(pct>30) hCards.push({wx:w,label:w+'偏旺（'+pct+'%），'+wxOrgan[w],body:wxOrgan[w]+'系统承压，需定期检查。',color:'var(--'+WX_CLASS[w]+')'});
      if(pct<10) hCards.push({wx:w,label:w+'偏弱（'+pct+'%），'+wxOrgan[w],body:wxOrgan[w]+'功能偏弱，日常注意养护。',color:'var(--'+WX_CLASS[w]+')'});
    });
    if(hCards.length){
      hGrid.innerHTML=hCards.map(function(h){
        return '<div class="r-hc"><div class="r-hc-title"><span class="r-hc-dot" style="background:'+h.color+'"></span>'+h.label+'</div><div class="r-hc-body">'+h.body+'</div></div>';
      }).join('');
    }
  }


  /* 09 大运 — 每步都显示内容和吉凶 */
  if(dayun.periods&&dayun.periods.length){
    var sec09=findSection('09');
    if(sec09){
      var cy=new Date().getFullYear(),by=parseInt(dateStr.split('-')[0]);
      var MKD={'辰':'水库','戌':'火库','丑':'金库','未':'木库'};
      // 起运偏移
      var dyOffset=Math.round((dayun.start_age_days||0)/365.25);

      function rateDY(stem,branch){
        var sE=STEM_ELEM[stem],bE=BRANCH_ELEM[branch],sc=3;
        if(ug.use.indexOf(sE)>=0)sc+=1;if(ug.use.indexOf(bE)>=0)sc+=0.8;
        if(ug.avoid.indexOf(sE)>=0)sc-=1;if(ug.avoid.indexOf(bE)>=0)sc-=0.8;
        return Math.max(1,Math.min(5,Math.round(sc)));
      }

      var allHtml='', curIdx=-1;
      for(var d=0;d<Math.min(dayun.periods.length,8);d++){
        var dp=dayun.periods[d];
        var sa=Math.round(dp.start_age)+dyOffset;
        var ea=d+1<dayun.periods.length?Math.round(dayun.periods[d+1].start_age)+dyOffset:sa+10;
        var sy=by+sa,ey=by+ea,ic=cy>=sy&&cy<ey;
        if(ic) curIdx=d;
        var dsg=getTenGod(ds,dp.stem),dbg=getTenGodBr(ds,dp.branch);
        var dsc2=rateDY(dp.stem,dp.branch);
        var dst='';for(var s=0;s<5;s++)dst+=s<dsc2?'\u2605':'\u2606';
        var stColor=dsc2>=4?'--mu':dsc2>=3?'--tu':'--huo';
        var desc=(isZh?'\u5929\u5E72':'Stem ')+dp.stem+'\uff08'+dsg+'\uff09\uff1a'+(isZh?(LN_DESC[dsg]||''):(dsg+' energy'))+'\n';
        desc+=(isZh?'\u5730\u652F':'Branch ')+dp.branch+'\uff08'+dbg+'\uff09\uff1a'+(isZh?(LN_DESC[dbg]||''):(dbg+' energy'));
        if(MKD[dp.branch]) desc+='\u3002'+dp.branch+(isZh?'\u4E3A'+MKD[dp.branch]+'\uff0c\u5173\u6CE8\u58A8\u5E93\u5F00\u5408':' is a storage branch');
        var sWxC=WX_CLASS[STEM_ELEM[dp.stem]],bWxC=WX_CLASS[BRANCH_ELEM[dp.branch]];

        var wrapStart='';var wrapEnd='';

        allHtml+=wrapStart+
          '<div style="display:flex;gap:20px;align-items:flex-start;padding:18px 0;border-bottom:1px solid var(--line)'+(ic?';background:var(--bg2);margin:0 -16px;padding:18px 16px;border-radius:var(--r)':'')+'">' +
            '<div style="flex-shrink:0;text-align:center;min-width:72px">' +
              (ic?'<div style="font-size:9px;color:var(--mu);font-weight:700;letter-spacing:1.5px;margin-bottom:3px">'+(isZh?'\u5F53\u524D':'CURRENT')+'</div>':'')+
              '<div style="font-size:24px;font-weight:700;letter-spacing:3px"><span class="e-'+sWxC+'">'+dp.stem+'</span><span class="e-'+bWxC+'">'+dp.branch+'</span></div>'+
              '<div style="font-size:11px;color:var(--t3);margin-top:3px">'+sa+(isZh?'\u81F3':'—')+ea+(isZh?'\u5C81':'')+'</div>'+
              '<div style="font-size:11px;color:var(--t4)">'+sy+'—'+ey+'</div>'+
            '</div>'+
            '<div style="flex:1;min-width:0">'+
              '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
                '<span style="font-size:12px;letter-spacing:1px;color:var('+stColor+')">'+dst+'</span>'+
                '<span style="font-size:12px;color:var(--t3);font-weight:500">'+dsg+' / '+dbg+'</span>'+
              '</div>'+
              '<div style="font-size:13px;line-height:1.85;color:var(--t2)">'+desc.replace(/\n/g,'<br>')+'</div>'+
            '</div>'+
          '</div>'+wrapEnd;
      }

      // 隐藏旧的scroll和summary，直接写入section
      var dyScroll=sec09.querySelector('.r-dy-scroll');
      var dySummary=sec09.querySelector('.r-dy-summary');
      // 也隐藏旧的2024-2025表格
      var dyOldTbl=sec09.querySelector('.r-tbl');
      if(dyOldTbl) dyOldTbl.style.display='none';
      if(dyScroll) dyScroll.style.display='none';
      if(dySummary) dySummary.innerHTML=allHtml;
      else{
        var newDiv=document.createElement('div');
        newDiv.className='r-dy-summary';
        newDiv.innerHTML=allHtml;
        if(dyScroll) dyScroll.parentNode.insertBefore(newDiv,dyScroll.nextSibling);
      }
    }
  }

    /* 09+ 流年(付费墙内) */
  fillFlowYears(data,ds,dwx,ug.use,ug.avoid,isZh);
  /* 10 流月 */
  analysis._str=str; analysis._sc=sc;
  fillFlowMonths(analysis,ds,isZh);

  /* 10 年度详解 */
  fillAnnualDetail(analysis,ds,dwx,ug,isZh);
  /* 11 预警 */
  fillWarnings(data,ds,dwx,ug,isZh);
  /* 12 建议 */
  fillRecommendations(data,ds,dwx,ug,gender,isZh);
  /* 13 紫微 */
  // 紫微已移除
  var sec13=findSection('13');if(sec13)sec13.style.display='none';

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
      var dyGrid=document.querySelector('.r-dy-summary-grid');
      if(dyGrid) dyGrid.innerHTML='<div style="line-height:1.9;font-size:13px;color:var(--t2);padding:16px 0">'+cleanText(e.dayun_detail).replace(/\n/g,'<br>')+'</div>';
    }
  })
  .catch(function(err){console.warn('Enrich skipped:',err);})
  .finally(function(){if(window._kesShowReport)window._kesShowReport();});
}


/* ═══ 文本清理 ═══ */
function cleanText(txt){
  if(!txt)return'';
  // 去掉特殊符号
  txt=txt.replace(/[✦✧💎🔥💧🌳⚡🏔️→←↑↓●○■□▪▫☆★⭐🌟✨💫⚠️✅❌🔴🔵⚪🟢🟡📖🎯💡🔑🏆🎭🎨🎪]/g,'');
  // 去掉十神过旺缺失段落
  txt=txt.replace(/(?:命局缺|十神过旺|有[正偏][财官印]无[正偏][财官印]|缺失[木火土金水])[^。]*。/g,'');
  txt=txt.replace(/💎[^\n]*/g,'');
  // 清理多余空行
  txt=txt.replace(/\n{3,}/g,'\n\n');
  return txt.trim();
}


/* ═══ 按编号查找报告板块 ═══ */
function findSection(num){
  var secs=document.querySelectorAll('#p-report .r-sec, #paywallGate .r-sec');
  for(var i=0;i<secs.length;i++){
    var n=secs[i].querySelector('.r-num');
    if(n&&n.textContent.trim()===String(num))return secs[i];
  }
  return null;
}

/* ═══ 工具函数 ═══ */
function fillText(kw,txt){
  txt=cleanText(txt);if(!txt)return;var secs=document.querySelectorAll('#p-report .r-sec');
  for(var i=0;i<secs.length;i++){var h=secs[i].querySelector('.r-h');
    if(h&&h.textContent.indexOf(kw)>=0){var ps=secs[i].querySelectorAll('p');
      if(ps.length>0){ps[0].innerHTML=txt.replace(/\n/g,'<br>');for(var j=1;j<ps.length;j++)ps[j].textContent='';}break;}}
}

function fillFlowYears(data,ds,dwx,use,avoid,isZh){
  var tbl=document.querySelectorAll('#paywallGate .r-tbl');if(!tbl.length)return;
  var hd='<div class="r-tbl-head r-tbl-3"><div>'+(isZh?'年份':'Year')+'</div><div>'+(isZh?'干支':'Stems')+'</div><div>'+(isZh?'运势概要':'Summary')+'</div></div>';
  var rw='';
  var curYr2=new Date().getFullYear();for(var y=curYr2-2;y<=curYr2+7;y++){
    var gz=yearGZ(y),sg=getTenGod(ds,gz.stem),sE=STEM_ELEM[gz.stem],bE=BRANCH_ELEM[gz.branch];
    var sc=3;if(use.indexOf(sE)>=0)sc+=0.8;if(use.indexOf(bE)>=0)sc+=0.7;if(avoid.indexOf(sE)>=0)sc-=0.8;if(avoid.indexOf(bE)>=0)sc-=0.7;
    sc=Math.max(1,Math.min(5,Math.round(sc)));
    var st='';for(var s=0;s<5;s++)st+=s<sc?'★':'☆';
    var nt='';
    if(isZh){
      var bg=getTenGodBr(ds,gz.branch);
      nt=gz.stem+gz.branch+'（'+sg+'）：'+(LN_DESC[sg]||'')+'。';
      if(bg&&bg!==sg) nt+='地支'+gz.branch+'（'+bg+'）辅助。';
      var MKY={'辰':'辰为水库，有收藏之象','戌':'戌为火库，有肃杀之气','丑':'丑为金库，有收敛之力','未':'未为木库，有滋养之功'};
      if(MKY[gz.branch]) nt+=MKY[gz.branch]+'。';
      // 刑冲克合
      var CHONG={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
      var HE={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'};
      var posNames={'year':'年支','month':'月支','day':'日支','hour':'时支'};
      ['year','month','day','hour'].forEach(function(pos){
        var pBr=data.chart.pillars[pos]?data.chart.pillars[pos].branch:'';
        if(CHONG[gz.branch]===pBr) nt+='流年'+gz.branch+'冲'+posNames[pos]+pBr+'，'+(pos==='day'?'婚姻宫受冲，感情有变。':'该宫位有动荡。');
        if(HE[gz.branch]===pBr) nt+='流年'+gz.branch+'合'+posNames[pos]+pBr+'，'+(pos==='day'?'感情有合意之象。':'有牵绊。');
      });
      if(sc>=4) nt+='宜积极把握机遇，适合拓展、投资、社交。';
      else if(sc<=2) nt+='注意控制风险，财务以稳健为主。';
      else nt+='整体平稳，稳中求进。';
      if(sc<=2) nt='<b>'+nt+'</b>';
    } else { nt=sg+' year'; }
    rw+='<div class="r-tbl-row r-tbl-3'+(y===new Date().getFullYear()?' now':'')+'"><div class="r-a-year">'+y+'</div><div class="r-a-gz"><span class="e-'+WX_CLASS[sE]+'">'+gz.stem+'</span><span class="e-'+WX_CLASS[bE]+'">'+gz.branch+'</span></div><div class="r-a-body"><div class="r-a-stars">'+st+'</div><div class="r-a-note">'+nt+'</div></div></div>';
  }
  tbl[0].innerHTML=hd+rw;
}

function fillFlowMonths(a,ds,isZh){
  if(!a.yearly_forecast||!Array.isArray(a.yearly_forecast))return;
  var tbl=document.querySelectorAll('#paywallGate .r-tbl');if(tbl.length<2)return;
  var dwx=GAN_WX[ds],str=a._str||'',sc=a._sc||0;
  var ug=deriveUseGods(dwx,str,sc,null);
  var MK={'辰':'辰为水库，有收藏之象','戌':'戌为火库，有肃杀之气','丑':'丑为金库，有收敛之力','未':'未为木库，有滋养之功'};
  var hd='<div class="r-tbl-head r-tbl-3"><div>'+(isZh?'月份':'Month')+'</div><div>'+(isZh?'干支':'Stems')+'</div><div>'+(isZh?'运势概要':'Summary')+'</div></div>';
  var rw='';
  a.yearly_forecast.forEach(function(f,idx){
    if(!f.stem||!f.branch)return;
    var sE=STEM_ELEM[f.stem]||'土',bE=BRANCH_ELEM[f.branch]||'土';
    var sg=f.stem_god||getTenGod(ds,f.stem);
    var bg=f.branch_god||getTenGodBr(ds,f.branch);
    var msc=3;
    if(ug.use.indexOf(sE)>=0)msc+=0.8;if(ug.use.indexOf(bE)>=0)msc+=0.7;
    if(ug.avoid.indexOf(sE)>=0)msc-=0.8;if(ug.avoid.indexOf(bE)>=0)msc-=0.7;
    msc=Math.max(1,Math.min(5,Math.round(msc)));
    var mst='';for(var s=0;s<5;s++)mst+=s<msc?'\u2605':'\u2606';
    // 生成丰富的月度描述
    var note=f.stem+f.branch+'（'+sg+'）：'+(LN_DESC[sg]||'')+'。';
    if(bg&&bg!==sg) note+='地支'+f.branch+'（'+bg+'）辅助。';
    if(MK[f.branch]) note+=MK[f.branch]+'。';
    if(msc>=4) note+='本月宜积极行动，把握机遇。';
    else if(msc<=2) note+='本月宜保守谨慎，避免重大决策。';
    if(msc<=2) note='<b>'+note+'</b>';
    var mLabel=(idx+1)+'月';
    rw+='<div class="r-tbl-row r-tbl-3"><div class="r-a-year">'+mLabel+'</div><div class="r-a-gz"><span class="e-'+WX_CLASS[sE]+'">'+f.stem+'</span><span class="e-'+WX_CLASS[bE]+'">'+f.branch+'</span></div><div class="r-a-body"><div class="r-a-stars">'+mst+'</div><div class="r-a-note">'+note+'</div></div></div>';
  });
  if(rw)tbl[1].innerHTML=hd+rw;
}

/* ═══ 年度详解 ═══ */
function fillAnnualDetail(a,ds,dwx,ug,isZh){
  if(!isZh)return;
  var sec=findSection('10');if(!sec)return;
  var curYear=new Date().getFullYear();
  var gz=yearGZ(curYear),sg=getTenGod(ds,gz.stem),bg=getTenGodBr(ds,gz.branch);
  var sE=STEM_ELEM[gz.stem],bE=BRANCH_ELEM[gz.branch];
  var MK={'辰':'辰为水库','戌':'戌为火库','丑':'丑为金库','未':'未为木库'};

  // 标题
  var h=sec.querySelector('.r-h');if(h)h.textContent=curYear+'年运势详解';
  var sub=sec.querySelector('.r-sub');if(sub)sub.textContent=gz.stem+gz.branch+'年 · '+sg;

  // 综述
  var lyH=sec.querySelector('.r-ly-h');if(lyH)lyH.textContent=curYear+'年'+gz.stem+gz.branch+'综述';
  var lyS=sec.querySelector('.r-ly-sub');if(lyS)lyS.textContent=sg+'年，'+gz.stem+sE+'透干，'+gz.branch+bE+'坐支';

  // 评分
  var sc=3;
  if(ug.use.indexOf(sE)>=0)sc+=0.8;if(ug.use.indexOf(bE)>=0)sc+=0.7;
  if(ug.avoid.indexOf(sE)>=0)sc-=0.8;if(ug.avoid.indexOf(bE)>=0)sc-=0.7;
  sc=Math.max(1,Math.min(5,Math.round(sc)));
  var stars='';for(var s=0;s<5;s++)stars+=s<sc?'★':'☆';

  var lyB=sec.querySelector('.r-ly-body');
  if(lyB){
    var t='<p><b>总体评价：'+stars+'</b></p>';
    t+='<p>'+curYear+'年'+gz.stem+gz.branch+'，天干'+gz.stem+'为'+sg+'，'+(LN_DESC[sg]||'')+'。';
    t+='地支'+gz.branch+'为'+bg+'，'+(LN_DESC[bg]||'')+'。';
    if(MK[gz.branch])t+=MK[gz.branch]+'，注意墓库开合对运势的影响。';
    t+='</p>';
    t+='<p><b>事业方面：</b>';
    if(ug.avoid.indexOf(sE)>=0)t+=sg+'透干为忌，工作中可能遇到阻力或竞争。重心放在巩固现有成果和人脉维护上。';
    else t+=sg+'透干为喜，事业有拓展窗口，适合主动争取新项目或晋升机会。';
    t+='</p>';
    t+='<p><b>财务方面：</b>';
    if(sc<=2)t+='流年干支均不利财运，控制支出为主，延后大额投资计划。';
    else if(sc>=4)t+='财星得力，正财偏财均有进账机会，适合稳健理财和资产配置。';
    else t+='财务整体平稳，维持现有收支节奏即可。';
    t+='</p>';
    t+='<p><b>感情方面：</b>关注日支婚姻宫与流年地支的互动，';
    t+=(sg==='七杀'||sg==='伤官')?'今年感情容易有波动和冲突，注意沟通方式。':'整体感情运势平稳。';
    t+='</p>';
    lyB.innerHTML=t;
    lyB.style.lineHeight='1.9';
    lyB.style.fontSize='13px';
  }
}

/* ═══ 预警 ═══ */
function fillWarnings(data,ds,dwx,ug,isZh){
  if(!isZh)return;
  var sec=findSection('11');if(!sec)return;
  var warns=sec.querySelectorAll('.r-warn');
  var chart=data.chart||{},kl=(chart.kong_wang&&chart.kong_wang.day_kong)||[];
  var wx=chart.wuxing_counts||{},wxT=0;
  ['木','火','土','金','水'].forEach(function(w){wxT+=(wx[w]||0);});
  var curYear=new Date().getFullYear();
  var gz=yearGZ(curYear),sE=STEM_ELEM[gz.stem],bE=BRANCH_ELEM[gz.branch];
  var sg=getTenGod(ds,gz.stem),bg=getTenGodBr(ds,gz.branch);

  // 警告1: 流年
  if(warns.length>=1){
    var t=warns[0].querySelector('.r-warn-title'),b=warns[0].querySelector('.r-warn-body');
    if(t)t.textContent=curYear+'年'+gz.stem+gz.branch+'流年提醒';
    var txt=sg+'年，天干'+gz.stem+'（'+STEM_ELEM[gz.stem]+'）';
    txt+=ug.avoid.indexOf(sE)>=0?'为忌神，注意压力':'为喜用，整体有利';
    txt+='。地支'+gz.branch+'（'+BRANCH_ELEM[gz.branch]+'）';
    txt+=ug.avoid.indexOf(bE)>=0?'亦为忌神方向，需保守应对。':'相对平稳。';
    if(b)b.innerHTML=txt;
  }
  // 警告2: 五行
  if(warns.length>=2){
    var t=warns[1].querySelector('.r-warn-title'),b=warns[1].querySelector('.r-warn-body');
    var weak=[],strong=[];
    ['木','火','土','金','水'].forEach(function(w){
      var p=Math.round((wx[w]||0)/(wxT||1)*100);
      if(p<8)weak.push(w+'（'+p+'%）');
      if(p>35)strong.push(w+'（'+p+'%）');
    });
    if(t)t.textContent='五行能量分布提醒';
    var txt2='';
    if(strong.length)txt2+=strong.join('、')+'偏旺。';
    if(weak.length)txt2+=weak.join('、')+'偏弱，对应器官和事象需注意后天调补。';
    if(!txt2)txt2='五行分布相对均衡，无明显偏枯。';
    if(b)b.innerHTML=txt2;
  }
  // 警告3: 空亡
  if(warns.length>=3){
    var t=warns[2].querySelector('.r-warn-title'),b=warns[2].querySelector('.r-warn-body');
    if(kl.length){
      if(t)t.textContent='空亡：'+kl.join('、');
      if(b)b.textContent=kl.join('、')+'为日柱空亡，对应的六亲和事象虚而不实，遇到有利流年大运引动方可激活。空亡也意味着不执着，反而可能在对应领域有超脱的智慧。';
    } else {
      if(t)t.textContent='命局无空亡';
      if(b)b.textContent='四柱地支均不落空亡，根基稳固。';
    }
  }
  // 警告3+: 具体年份预警
  var CHONGW={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
  var dayBr=data.chart.pillars.day.branch;
  if(warns.length>=3){
    var t=warns[2].querySelector('.r-warn-title'),b=warns[2].querySelector('.r-warn-body');
    if(t)t.textContent='婚姻宫（日支'+dayBr+'）预警';
    // 找出冲日支的具体年份
    var chongYears=[];
    for(var cy2=curYear;cy2<=curYear+8;cy2++){
      var cGz=yearGZ(cy2);
      if(CHONGW[cGz.branch]===dayBr) chongYears.push(cy2+'年'+cGz.stem+cGz.branch);
    }
    var bTxt='日支'+dayBr+'为婚姻宫。';
    if(chongYears.length) bTxt+='冲日支年份：'+chongYears.join('、')+'，这些年份感情或家庭容易出现变化，注意沟通。';
    else bTxt+='近十年无流年冲日支，婚姻宫相对稳定。';
    if(b)b.innerHTML=bTxt;
  }
  if(warns.length>=4){
    var t=warns[3].querySelector('.r-warn-title'),b=warns[3].querySelector('.r-warn-body');
    if(kl.length){
      if(t)t.textContent='空亡：'+kl.join('、');
      if(b)b.textContent=kl.join('、')+'为日柱空亡。空亡代表对应六亲和事象虚而不实，需要流年大运引动才能激活。空亡也意味着不执着，反而可能在对应领域有超脱的智慧。';
    } else {
      if(t)t.textContent='命局无空亡';
      if(b)b.textContent='四柱地支均不落空亡，根基稳固。';
    }
  }
}

/* ═══ 建议 ═══ */
function fillRecommendations(data,ds,dwx,ug,gender,isZh){
  if(!isZh)return;
  var sec=findSection('12');if(!sec)return;
  var grid=sec.querySelector('.r-rec-grid');if(!grid)return;
  var WXC={'金':'金融、银行、法律、医疗器械、IT硬件、珠宝首饰、机械制造','木':'教育、出版、设计、文创、园艺、家具、纺织服装','水':'物流、传媒、咨询、旅游、航运、贸易、酒水饮料','火':'科技、能源、餐饮、美容、演艺、广告、电子商务','土':'房地产、建筑、农业、保险、陶瓷、矿业、仓储'};
  var WXL={'木':'绿色系——鼠尾草绿、森林绿、橄榄绿、薄荷绿','火':'红橙色系——砖红、珊瑚红、铁锈红、橘色','土':'棕黄色系——驼色、卡其、焦糖棕、大地色','金':'白银色系——香槟、象牙白、珍珠白、银灰','水':'蓝黑色系——藏蓝、墨黑、深灰、靛蓝'};
  var WXD={'木':'东方','火':'南方','土':'中央','金':'西方','水':'北方'};
  var WXS={'木':'春季（2-4月）','火':'夏季（5-7月）','土':'四季交替月','金':'秋季（8-10月）','水':'冬季（11-1月）'};
  var wxOrgan={'木':'肝胆、眼睛、筋骨','火':'心脏、小肠、血液循环','土':'脾胃、消化系统、肌肉','金':'肺部、大肠、呼吸系统','水':'肾脏、膀胱、泌尿生殖'};
  var curYear=new Date().getFullYear();
  var gz=yearGZ(curYear),sg=getTenGod(ds,gz.stem);

  var cards=[
    {title:curYear+'年度策略',body:function(){
      var t=curYear+'年'+gz.stem+gz.branch+'（'+sg+'）。'+(LN_DESC[sg]||'')+'。';
      t+=ug.avoid.indexOf(STEM_ELEM[gz.stem])>=0?'今年天干为忌神方向，重心放在积累和沉淀上。减少不必要的开支和冒进。':'今年天干为喜用方向，可主动争取机会。';
      // 找最佳和最差年份
      var bestY='',worstY='',bestSc=0,worstSc=6;
      for(var fy=curYear;fy<=curYear+7;fy++){
        var fGz=yearGZ(fy),fSe=STEM_ELEM[fGz.stem],fBe=BRANCH_ELEM[fGz.branch];
        var fSc=3;if(ug.use.indexOf(fSe)>=0)fSc+=1;if(ug.use.indexOf(fBe)>=0)fSc+=0.8;if(ug.avoid.indexOf(fSe)>=0)fSc-=1;if(ug.avoid.indexOf(fBe)>=0)fSc-=0.8;
        if(fSc>bestSc){bestSc=fSc;bestY=fy+'年'+fGz.stem+fGz.branch;}
        if(fSc<worstSc){worstSc=fSc;worstY=fy+'年'+fGz.stem+fGz.branch;}
      }
      if(bestY) t+=' 近8年最利年份：'+bestY+'。';
      if(worstY) t+=' 最需谨慎年份：'+worstY+'。';
      return t;
    }()},
    {title:'事业行业方向',body:'最适合的五行行业方向：'+ug.use.map(function(e){return e+'属性——'+WXC[e];}).join('。')+'。核心原则是选择与喜用神五行属性匹配的行业，能借行业之势助力自身发展。'},
    {title:'幸运颜色与穿搭',body:'日常宜多用的颜色：'+ug.use.map(function(e){return WXL[e];}).join('。')+'。应用场景包括：日常穿搭、办公用品、手机壳、家居装饰、车内饰等。尽量减少使用'+ug.avoid.map(function(e){return WXL[e];}).join('、')+'。'},
    {title:'有利方位与季节',body:'居住和办公最利方位：'+ug.use.map(function(e){return WXD[e]+'（'+e+'）';}).join('、')+'。有利季节：'+ug.use.map(function(e){return WXS[e]||'';}).join('、')+'。如有搬迁、出差、旅行计划，优先考虑有利方位。'},
    {title:'感情择偶方向',body:'最佳配偶特征：八字中'+ug.use.join('、')+'旺的人与你能量互补。配偶的五行能量能补充你命局的不足。日支为婚姻宫，关注流年冲合日支的年份，感情容易出现重要转折。'+(gender==='M'?'男命以财星为妻星，关注财星在命局中的位置。':'女命以官杀为夫星，关注官杀在命局中的位置。')},
    {title:'养生与健康管理',body:'需要重点关注的器官：'+ug.avoid.map(function(e){return e+'行——'+wxOrgan[e];}).join('；')+'。日常调理建议：'+ug.use.map(function(e){var sp={'水':'游泳、泡温泉、多喝水','金':'深呼吸练习、登山、瑜伽','木':'户外散步、园艺、伸展运动','火':'跑步、晒太阳、温热饮食','土':'太极、冥想、规律作息'};return sp[e]||'';}).join('；')+'。'}
  ];

  grid.style.gridTemplateColumns='1fr';
  var html='';
  cards.forEach(function(cd,i){
    html+='<div class="r-rec-card full" style="grid-column:1/-1"><div class="r-rec-num">'+String(i+1).padStart(2,'0')+'</div><div class="r-rec-title">'+cd.title+'</div><div class="r-rec-body">'+cd.body+'</div></div>';
  });
  grid.innerHTML=html;
}

/* ═══ 紫微斗数 ═══ */
function fillZiwei(data,ds,dwx,str,isZh){
  if(!isZh)return;
  var sec=findSection('13');if(!sec)return;

  // 清空硬编码
  var meta=sec.querySelector('.r-zw-meta');
  if(meta) meta.innerHTML='<div class="r-zw-meta-item"><span class="r-zw-meta-label">日主</span>'+ds+dwx+'</div><div class="r-zw-meta-item"><span class="r-zw-meta-label">身强弱</span><b>'+str+'</b></div><div class="r-zw-meta-item"><span class="r-zw-meta-label">喜用</span>'+deriveUseGods(dwx,str,0,null).use.join('、')+'</div>';

  var sihua=sec.querySelector('.r-zw-sihua');
  if(sihua) sihua.style.display='none';

  // 12宫验证
  var WXT={'木':'仁慈上进、有创造力','火':'热情光明、表现力佳','土':'诚信稳重、包容踏实','金':'果断义气、执行力强','水':'智慧灵活、适应力强'};
  var pillars=data.chart.pillars||{};
  var dayBr=pillars.day?pillars.day.branch:'';

  var palaces=[
    {name:'命宫',desc:'日主'+ds+dwx+'，'+WXT[dwx]+'。性格底色由日主决定。'},
    {name:'事业宫',desc:/旺|强/.test(str)?'身强有力，事业宫能量充足，适合主动开拓、独立发展。':'身弱需借力，事业宫显示宜团队协作、借势发展。'},
    {name:'财帛宫',desc:'与八字财星格局呼应。'+(dwx==='土'||dwx==='金'?'理财偏稳健保守型。':'理财灵活，善于把握机会。')},
    {name:'夫妻宫',desc:'日支'+dayBr+'为婚姻宫，'+BRANCH_ELEM[dayBr]+'行坐支。配偶特征与日支藏干暗示一致。'},
    {name:'子女宫',desc:'时柱代表子女宫，关注时柱十神与日主的关系。'},
    {name:'兄弟宫',desc:'月柱代表兄弟宫，比劫星的强弱反映手足缘分。'},
    {name:'迁移宫',desc:'出行、搬迁运势与喜用方位有关。有利方向为喜用神五行对应方位。'},
    {name:'疾厄宫',desc:'健康重点关注'+dwx+'行对应器官，以及忌神五行所主器官。'},
    {name:'田宅宫',desc:'房产运势与正财、印星的力量有关。关注流年财印旺衰。'},
    {name:'福德宫',desc:'精神生活与食伤星有关。'+(/旺|强/.test(str)?'身强者福德充实，精力旺盛。':'身弱者需注意精神调养。')},
    {name:'父母宫',desc:'年柱代表父母宫，印星强弱反映与父母的缘分。'},
    {name:'交友宫',desc:'社交人脉与比劫星有关。喜用五行行业的朋友对你最有助力。'}
  ];

  var list=sec.querySelector('.r-zw-verify-list');
  if(list){
    list.innerHTML=palaces.map(function(p){
      return '<div class="r-zw-v-item ok" style="padding:8px 0;border-bottom:1px solid var(--line)"><b>'+p.name+'：</b>'+p.desc+'</div>';
    }).join('');
  }
}

/* ═══ 初始化 ═══ */
document.addEventListener('DOMContentLoaded',function(){
  var btn=document.querySelector('.f-btn');if(btn)btn.setAttribute('onclick','kesSubmit()');
  var yEl=document.getElementById('birthYear');
  if(yEl){for(var y=2025;y>=1940;y--){var o=document.createElement('option');o.value=y;o.textContent=y;yEl.appendChild(o);};}
  var dEl=document.getElementById('birthDay');
  if(dEl){for(var d=1;d<=31;d++){var o=document.createElement('option');o.value=d;o.textContent=d;dEl.appendChild(o);};}
  var mEl=document.getElementById('birthMonth');if(mEl);
});
