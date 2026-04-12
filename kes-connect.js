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
    var _startTime=Date.now();
    function _doShow(){
      if(_reportReady)return;_reportReady=true;
      ss(isZh?'报告生成完毕':'Report ready');
      // 至少等3秒让DOM渲染完毕
      var elapsed=Date.now()-_startTime;
      var wait=Math.max(800,3000-elapsed);
      setTimeout(function(){
        goPage('report');
        if(ld)ld.classList.remove('on');
        if(btn){btn.disabled=false;btn.style.opacity='1';}
      },wait);
    }
    window._kesShowReport=_doShow;
    // 非中文不调Claude，直接等3秒后展示
    if(!isZh)setTimeout(_doShow,3000);
    // 超时兜底：20秒
    setTimeout(_doShow,20000);
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
    var wxOrgan2={'木':'肝胆、眼睛','火':'心脏、血压、血液循环','土':'脾胃、消化系统','金':'肺部、呼吸道、皮肤','水':'肾脏、泌尿系统、腰部'};
    var wxAdvice={'木':'少熬夜、护眼、多吃绿色蔬菜','火':'控制情绪、规律作息、监测血压','土':'规律饮食、少食生冷油腻、健脾养胃','金':'秋冬保暖、注意呼吸道、多做有氧运动','水':'避免受寒、充足睡眠、保养腰肾'};
    var hCards=[];
    // 忌神五行对应的器官最需关注
    ug.avoid.forEach(function(w){
      hCards.push({wx:w,label:w+'行（忌神）——'+wxOrgan2[w],body:'忌神五行对应器官最易出问题。建议：'+wxAdvice[w]+'。',color:'var(--'+WX_CLASS[w]+')'});
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
        var dSE=STEM_ELEM[dp.stem],dBE=BRANCH_ELEM[dp.branch];
        var dSU=ug.use.indexOf(dSE)>=0,dBU=ug.use.indexOf(dBE)>=0;
        var desc='';
        if(isZh){
          desc='天干'+dp.stem+'（'+dsg+'·'+dSE+'）'+(dSU?'为喜用，有利发展':'为忌神，需应对压力')+'。\n';
          desc+='地支'+dp.branch+'（'+dbg+'·'+dBE+'）'+(dBU?'为喜用，根基稳固':'为忌方向，内部调整')+'。';
          if(dSU&&dBU) desc+='\n干支均喜用，十年整体向好。';
          else if(!dSU&&!dBU) desc+='\n干支均忌，十年需谨慎经营。';
          if(MKD[dp.branch]) desc+='\n'+dp.branch+'为'+MKD[dp.branch]+'，关注墓库开合。';
        } else {
          desc='Stem '+dp.stem+' ('+dsg+') '+(dSU?'favorable':'challenging')+'. ';
          desc+='Branch '+dp.branch+' ('+dbg+') '+(dBU?'supportive':'restrictive')+'.';
        }
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
    // dayun_detail不再覆盖，前端自己生成
  })
  .catch(function(err){console.warn('Enrich skipped:',err);})
  .then(function(){if(window._kesShowReport)window._kesShowReport();})
  .catch(function(){if(window._kesShowReport)window._kesShowReport();});
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
      // 具体分析：天干忌喜 + 地支刑冲克合
      var sUse=ug.use.indexOf(sE)>=0,bUse=ug.use.indexOf(bE)>=0;
      var sAvd=ug.avoid.indexOf(sE)>=0,bAvd=ug.avoid.indexOf(bE)>=0;
      if(sUse&&bUse) nt+='干支均为喜用，整体有利，可主动把握机会。';
      else if(sAvd&&bAvd) nt+='干支均为忌神，压力较大，重心放在积累沉淀。';
      else if(sUse) nt+='天干'+sE+'为喜用有利，地支'+bE+'为忌有阻，外顺内紧。';
      else if(bUse) nt+='地支'+bE+'为喜用有根基，天干'+sE+'为忌有表面压力。';
      else nt+='整体中性，按节奏推进即可。';
      // 地支刑冲合
      var CHONG={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
      var HE={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'};
      var posN2={'year':'年支','month':'月支','day':'日支（婚姻宫）','hour':'时支'};
      var pils=data.chart.pillars||{};
      ['year','month','day','hour'].forEach(function(pos){
        var pBr=pils[pos]?pils[pos].branch:'';
        if(CHONG[gz.branch]===pBr) nt+=' '+gz.branch+'冲'+posN2[pos]+pBr+(pos==='day'?'，感情或居住有变动':'，注意该方面波动')+'。';
        if(HE[gz.branch]===pBr) nt+=' '+gz.branch+'合'+posN2[pos]+pBr+(pos==='day'?'，感情有合意机遇':'')+'。';
      });
      // 墓库
      var MKY={'辰':'水库','戌':'火库','丑':'金库','未':'木库'};
      if(MKY[gz.branch]) nt+=' '+gz.branch+'为'+MKY[gz.branch]+'。';
      if(sc>=4) nt+='宜积极把握机遇，适合拓展、投资、社交。';
      else if(sc<=2) nt+='注意控制风险，财务以稳健为主。';
      else nt+='中性运势，维持现有节奏。';
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
    // 月度具体分析
    var mSUse=ug.use.indexOf(sE)>=0,mBUse=ug.use.indexOf(bE)>=0;
    var mSAvd=ug.avoid.indexOf(sE)>=0,mBAvd=ug.avoid.indexOf(bE)>=0;
    var note='';
    if(mSUse&&mBUse) note='干支均喜用，本月运势较佳，适合推进重要事项。';
    else if(mSAvd&&mBAvd) note='干支均忌，本月低调行事，减少不必要的社交和支出。';
    else if(mSUse) note='天干有利但地支有阻，表面顺利暗中注意细节。';
    else if(mBUse) note='地支得力天干不利，有根基但推进需耐心。';
    else note='本月中性，维持节奏。';
    if(MK[f.branch]) note+=' '+f.branch+'为'+MK[f.branch].replace(/，.*$/,'')+'。';
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
    var dtSUse=ug.use.indexOf(sE)>=0,dtBUse=ug.use.indexOf(bE)>=0;
    t+='<p>'+curYear+'年'+gz.stem+gz.branch+'。天干'+gz.stem+'（'+sE+'）'+(dtSUse?'为喜用方向，外部环境有利。':'为忌神方向，外部环境有压力。');
    t+='地支'+gz.branch+'（'+bE+'）'+(dtBUse?'为喜用，根基稳固。':'为忌方向，内部需调整。');
    var MK0={'辰':'水库','戌':'火库','丑':'金库','未':'木库'};if(MK0[gz.branch])t+=gz.branch+'为'+MK0[gz.branch]+'。';
    t+='</p>';
    t+='<p><b>事业方面：</b>';
    if(ug.avoid.indexOf(sE)>=0)t+=sg+'透干为忌，工作中可能遇到阻力或竞争。重心放在巩固现有成果和人脉维护上。';
    else t+=sg+'透干为喜，事业有拓展窗口，适合主动争取新项目或晋升机会。';
    t+='</p>';
    t+='<p><b>财务方面：</b>';
    if(sc<=2)t+='流年干支均不利财运，控制支出为主，延后大额投资计划。';
    else if(sc>=4)t+='财星得力，正财偏财均有进账机会，适合稳健理财和资产配置。';
    else t+='财务收支平稳，按计划执行即可。';
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
  var pils=data.chart.pillars||{};
  var klArr=(data.chart.kong_wang&&data.chart.kong_wang.day_kong)||[];
  var wx=data.chart.wuxing_counts||{};
  var curYear=new Date().getFullYear();
  var dayBr=pils.day?pils.day.branch:'';
  var CHONG={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
  var wxOrgan={'木':'肝胆、眼睛','火':'心脏、血压','土':'脾胃、消化','金':'肺部、呼吸','水':'肾脏、泌尿'};
  var wxEmo={'木':'情绪急躁、易怒','火':'焦虑、失眠','土':'思虑过重、多愁','金':'悲观、呼吸不畅','水':'恐惧、精力不足'};

  // 警告1：流年具体预警（逐年列出忌神年）
  if(warns.length>=1){
    var t=warns[0].querySelector('.r-warn-title'),b=warns[0].querySelector('.r-warn-body');
    if(t)t.textContent='近年忌神流年提醒';
    var badYears=[];
    for(var cy=curYear;cy<=curYear+5;cy++){
      var cGz=yearGZ(cy),cSE=STEM_ELEM[cGz.stem],cBE=BRANCH_ELEM[cGz.branch];
      if(ug.avoid.indexOf(cSE)>=0&&ug.avoid.indexOf(cBE)>=0)
        badYears.push({y:cy,gz:cGz.stem+cGz.branch,reason:'干支均忌，压力较大'});
      else if(ug.avoid.indexOf(cSE)>=0)
        badYears.push({y:cy,gz:cGz.stem+cGz.branch,reason:'天干'+cSE+'为忌'});
    }
    var bTxt='';
    if(badYears.length){
      bTxt=badYears.map(function(by){return '<b>'+by.y+'年'+by.gz+'</b>：'+by.reason+'。建议该年减少大额支出，不宜跳槽或重大投资。';}).join(' ');
    } else bTxt='近6年无严重忌神流年，整体运势平稳。';
    if(b)b.innerHTML=bTxt;
  }

  // 警告2：健康（用人话说）
  if(warns.length>=2){
    var t=warns[1].querySelector('.r-warn-title'),b=warns[1].querySelector('.r-warn-body');
    if(t)t.textContent='健康关注重点';
    var hTxt='';
    ug.avoid.forEach(function(w){
      hTxt+=w+'行偏忌，'+wxOrgan[w]+'需要关注。日常可能出现'+wxEmo[w]+'的倾向。建议：';
      if(w==='火')hTxt+='控制情绪，保证睡眠，定期测血压。';
      else if(w==='木')hTxt+='少熬夜，护眼，适度运动释放压力。';
      else if(w==='土')hTxt+='规律饮食，少食生冷，避免过度思虑。';
      else if(w==='金')hTxt+='注意呼吸系统，秋冬保暖，练习深呼吸。';
      else if(w==='水')hTxt+='保暖避寒，注意腰肾保养，保持充足睡眠。';
      hTxt+=' ';
    });
    if(b)b.innerHTML=hTxt;
  }

  // 警告3：婚姻宫+具体冲年
  if(warns.length>=3){
    var t=warns[2].querySelector('.r-warn-title'),b=warns[2].querySelector('.r-warn-body');
    if(t)t.textContent='婚姻宫预警（日支'+dayBr+'）';
    var chongYears=[];
    for(var cy2=curYear;cy2<=curYear+8;cy2++){
      var cGz2=yearGZ(cy2);
      if(CHONG[cGz2.branch]===dayBr) chongYears.push(cy2+'年（'+cGz2.stem+cGz2.branch+'）');
    }
    var bTxt2='日支'+dayBr+'为婚姻宫，代表配偶和婚姻关系。';
    if(chongYears.length) bTxt2+='<b>冲婚姻宫年份：'+chongYears.join('、')+'</b>。这些年份感情容易出现波动或变化，可能是搬家、分居、争吵加剧。建议：提前沟通，预留缓冲空间，避免在冲年做离婚等重大决定。';
    else bTxt2+='近10年无流年冲日支，婚姻宫相对稳定。保持沟通即可。';
    if(b)b.innerHTML=bTxt2;
  }

  // 警告4：空亡+具体影响
  if(warns.length>=4){
    var t=warns[3].querySelector('.r-warn-title'),b=warns[3].querySelector('.r-warn-body');
    if(klArr.length){
      if(t)t.textContent='空亡影响：'+klArr.join('、');
      var klPosMap={'year':'父母宫','month':'兄弟/事业宫','day':'婚姻宫','hour':'子女宫'};
      var klEffects=[];
      ['year','month','day','hour'].forEach(function(pos){
        var pBr=pils[pos]?pils[pos].branch:'';
        if(klArr.indexOf(pBr)>=0) klEffects.push(klPosMap[pos]+'（'+pBr+'）落空亡');
      });
      // 空亡被填实的年份
      var klFillYears=[];
      for(var cy3=curYear;cy3<=curYear+8;cy3++){
        var cGz3=yearGZ(cy3);
        if(klArr.indexOf(cGz3.branch)>=0) klFillYears.push(cy3+'年（'+cGz3.stem+cGz3.branch+'）');
      }
      var bTxt3='';
      if(klEffects.length) bTxt3+=klEffects.join('，')+'。这些宫位对应的六亲关系有"虚"的特征——不是没有，而是缘分偏淡或来得较晚。';
      else bTxt3+='空亡未落在四柱主位，影响较小。';
      if(klFillYears.length) bTxt3+=' <b>空亡被填实年份：'+klFillYears.join('、')+'</b>，这些年份空亡被引动，对应事项会有实质性变化。';
      if(b)b.innerHTML=bTxt3;
    } else {
      if(t)t.textContent='命局无空亡';
      if(b)b.textContent='四柱地支均不落空亡，各宫位根基稳固。';
    }
  }
}

/* ═══ 建议 ═══ */
function fillRecommendations(data,ds,dwx,ug,gender,isZh){
  if(!isZh)return;
  var sec=findSection('12');if(!sec)return;
  var grid=sec.querySelector('.r-rec-grid');if(!grid)return;
  var curYear=new Date().getFullYear();
  var pils=data.chart.pillars||{};

  // 找最佳和最差年份
  var bestY='',worstY='',bestSc=0,worstSc=6;
  for(var fy=curYear;fy<=curYear+7;fy++){
    var fGz=yearGZ(fy),fSe=STEM_ELEM[fGz.stem],fBe=BRANCH_ELEM[fGz.branch];
    var fSc=3;if(ug.use.indexOf(fSe)>=0)fSc+=1;if(ug.use.indexOf(fBe)>=0)fSc+=0.8;if(ug.avoid.indexOf(fSe)>=0)fSc-=1;if(ug.avoid.indexOf(fBe)>=0)fSc-=0.8;
    if(fSc>bestSc){bestSc=fSc;bestY=fy+'年'+fGz.stem+fGz.branch;}
    if(fSc<worstSc){worstSc=fSc;worstY=fy+'年'+fGz.stem+fGz.branch;}
  }

  var WXC={'金':'金融、银行、法律、IT硬件、珠宝','木':'教育、出版、设计、文创、园艺','水':'物流、传媒、咨询、旅游、贸易','火':'科技、能源、餐饮、美容、电商','土':'房产、建筑、农业、保险、矿业'};
  var WXD={'木':'东方','火':'南方','土':'中央','金':'西方','水':'北方'};
  var wxSport={'水':'游泳、泡温泉','金':'深呼吸、登山、瑜伽','木':'户外散步、园艺、伸展','火':'跑步、晒太阳、温热饮食','土':'太极、冥想、规律作息'};
  var wxColor={'木':'绿色系','火':'红橙色系','土':'棕黄色系','金':'白银色系','水':'蓝黑色系'};

  var cards=[
    {title:'综合行动建议',body:function(){
      var t='';
      if(worstY) t+='<b>'+worstY+'</b>：这一年干支对你最不利，建议该年不做重大投资、不跳槽、不借贷担保，以守为主。';
      if(bestY) t+=' <b>'+bestY+'</b>：这一年干支最有利，适合投资、创业、求职、买房等重大决策。';
      t+=' 大运转换期前后一年也需谨慎，新旧能量交替容易出现波动。';
      return t;
    }()},
    {title:'事业与行业',body:'最适合的行业：'+ug.use.map(function(e){return '<b>'+e+'</b>属性——'+WXC[e];}).join('。')+'。选择与喜用神匹配的行业，能事半功倍。忌神行业（'+ug.avoid.join('、')+'属性）则容易遇阻。'},
    {title:'颜色与方位',body:'日常多用<b>'+ug.use.map(function(e){return wxColor[e];}).join('、')+'</b>，包括穿搭、手机壳、办公用品、家居装饰。居住办公最利方位：<b>'+ug.use.map(function(e){return WXD[e]+'（'+e+'）';}).join('、')+'</b>。搬迁、出差优先选择有利方位。'},
    {title:'感情方向',body:'最佳伴侣特征：八字中<b>'+ug.use.join('、')+'旺</b>的人，能量互补。'+(gender==='M'?'男命看财星，财星为喜用时容易遇到合适对象。':'女命看官杀，官杀为喜用时感情运较好。')+' 日支'+pils.day.branch+'为婚姻宫，关注冲合日支的年份。'},
    {title:'健康养生',body:'推荐运动：'+ug.use.map(function(e){return wxSport[e]||'';}).filter(Boolean).join('、')+'。这些运动能补充你命局需要的五行能量。饮食上多摄入'+ug.use.join('、')+'属性食物，减少'+ug.avoid.join('、')+'属性食物的过量摄入。'},
  ];

  grid.style.gridTemplateColumns='1fr';
  var html='';
  cards.forEach(function(cd,i){
    html+='<div class="r-rec-card full" style="grid-column:1/-1"><div class="r-rec-num">'+String(i+1).padStart(2,'0')+'</div><div class="r-rec-title">'+cd.title+'</div><div class="r-rec-body" style="line-height:1.9">'+cd.body+'</div></div>';
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
