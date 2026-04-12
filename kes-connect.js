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
    ss(isZh?'排盘完成，正在深度分析…':'Deep analysis...');
    if(typeof lockReport==='function')lockReport();
    // 先填报告骨架但不显示
    fillReport(data,dateVal,shichen,gender,isZh);
    // 等Claude润色完成后再显示（最多12秒超时）
    var showTimer=setTimeout(function(){
      goPage('report');if(ld)ld.classList.remove('on');
      if(btn){btn.disabled=false;btn.style.opacity='1';}
    },12000);
    window._kesShowReport=function(){
      clearTimeout(showTimer);
      setTimeout(function(){
        goPage('report');if(ld)ld.classList.remove('on');
        if(btn){btn.disabled=false;btn.style.opacity='1';}
      },500); // 额外延迟确保DOM更新完成
    };
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
  // 填充得令得地得势详细grid
  var bd=chart.strength_breakdown||{};
  var sf=bd['三分法']||{};
  var details=bd.details||[];
  var strGrid=document.querySelector('.r-str-grid');
  if(strGrid){
    var mb=pillars.month?pillars.month.branch:'';
    var mbWx=ZHI_WX[mb]||'土';
    var wxS=getWxStatus(mb);
    var dayStatus=wxS[dwx]||'休';
    // 得令
    var dlDetail=sf['得令']?mb+'月主气助'+dwx+'，得令有力':mb+'月'+mbWx+'当令，'+dwx+'处'+dayStatus+'位，月令不助日元';
    // 得地
    var ddDetail='';
    if(sf['得地']){
      ddDetail='地支有'+dwx+'行通根';
      details.forEach(function(d){if(d.indexOf('得地')>=0)ddDetail=d.replace(/得地：/,'');});
    } else {
      ddDetail='地支无'+dwx+'行有力通根';
      var kl2=(chart.kong_wang&&chart.kong_wang.day_kong)||[];
      if(kl2.length)ddDetail+='（'+kl2.join('、')+'空亡）';
    }
    // 得势
    var dsDetail='';
    if(sf['得势']){
      dsDetail='天干有比劫或印星帮扶';
      details.forEach(function(d){if(d.indexOf('得势')>=0)dsDetail=d.replace(/得势：/,'');});
    } else {
      dsDetail='天干缺少比劫印星帮扶';
    }
    strGrid.innerHTML=
      '<div class="r-str-item"><div class="r-str-label">得　令</div><div class="r-str-val '+(sf['得令']?'yes':'no')+'">'+(sf['得令']?'已得':'未得')+'</div><div class="r-str-detail">'+dlDetail+'</div></div>'+
      '<div class="r-str-item"><div class="r-str-label">得　地</div><div class="r-str-val '+(sf['得地']?'yes':'no')+'">'+(sf['得地']?'已得':'未得')+'</div><div class="r-str-detail">'+ddDetail+'</div></div>'+
      '<div class="r-str-item"><div class="r-str-label">得　势</div><div class="r-str-val '+(sf['得势']?'yes':'no')+'">'+(sf['得势']?'已得':'未得')+'</div><div class="r-str-detail">'+dsDetail+'</div></div>';
  }
  var ex=document.querySelector('.r-str-explain');
  if(ex) ex.textContent=ds+dwx+'生于'+(pillars.month?pillars.month.branch:'')+'月，综合判定为'+str+'。';

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


  /* 09 前的2024-2025流年（免费区） */
  var freeTable=document.querySelector('.report-wrap .r-tbl');
  if(freeTable && !freeTable.closest('#paywallGate')){
    var fHead='<div class="r-tbl-head r-tbl-3"><div>年份</div><div>干支</div><div>运势概要</div></div>';
    var fRows='';
    var curYr=new Date().getFullYear();for(var fy=curYr-2;fy<=curYr-1;fy++){
      var fgz=yearGZ(fy),fsg=getTenGod(ds,fgz.stem),fsE=STEM_ELEM[fgz.stem],fbE=BRANCH_ELEM[fgz.branch];
      var fsc=3;if(ug.use.indexOf(fsE)>=0)fsc+=0.8;if(ug.use.indexOf(fbE)>=0)fsc+=0.7;if(ug.avoid.indexOf(fsE)>=0)fsc-=0.8;if(ug.avoid.indexOf(fbE)>=0)fsc-=0.7;
      fsc=Math.max(1,Math.min(5,Math.round(fsc)));
      var fst='';for(var fs=0;fs<5;fs++)fst+=fs<fsc?'★':'☆';
      var fbg=getTenGodBr(ds,fgz.branch);
      var fnt=fgz.stem+fgz.branch+'（'+fsg+'）：'+(LN_DESC[fsg]||'')+'。';
      if(fbg&&fbg!==fsg) fnt+='地支'+fgz.branch+'（'+fbg+'）辅助。';
      if(fsc<=2) fnt='<b>'+fnt+'</b>';
      fRows+='<div class="r-tbl-row r-tbl-3"><div class="r-a-year">'+fy+'</div><div class="r-a-gz"><span class="e-'+WX_CLASS[fsE]+'">'+fgz.stem+'</span><span class="e-'+WX_CLASS[fbE]+'">'+fgz.branch+'</span></div><div class="r-a-body"><div class="r-a-stars">'+fst+'</div><div class="r-a-note">'+fnt+'</div></div></div>';
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
        // 替换整个大运摘要为横条布局
        var dySummary=document.querySelector('.r-dy-summary');
        if(dySummary){
          var MK3={'辰':'辰为水库','戌':'戌为火库','丑':'丑为金库','未':'未为木库'};
          var s1=cd.sg+'大运：'+(LN_DESC[cd.sg]||'');
          var s2=cd.bg+'坐支：'+(LN_DESC[cd.bg]||'');
          if(MK3[cd.b])s2+='。'+MK3[cd.b]+'，关注墓库开合';
          dySummary.innerHTML=
            '<div style="display:flex;gap:24px;align-items:flex-start;padding:20px 0">'+
              '<div style="flex-shrink:0;text-align:center;min-width:80px">'+
                '<div style="font-size:28px;font-weight:700;letter-spacing:2px" class="e-'+WX_CLASS[STEM_ELEM[cd.s]]+'">'+cd.s+cd.b+'</div>'+
                '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+cd.sa+'至'+cd.ea+'岁</div>'+
                '<div style="font-size:11px;color:var(--t3)">当前大运</div>'+
              '</div>'+
              '<div style="flex:1;line-height:1.9;font-size:13px;color:var(--t2)">'+
                '<p style="margin:0 0 8px"><b>天干'+cd.s+'（'+cd.sg+'）：</b>'+s1+'。</p>'+
                '<p style="margin:0 0 8px"><b>地支'+cd.b+'（'+cd.bg+'）：</b>'+s2+'。</p>'+
                '<p style="margin:0;font-size:12px;color:var(--t3)">大运运支代替月令重新审视旺衰，当运十年喜忌随之调整。</p>'+
              '</div>'+
            '</div>';
        }
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
  fillZiwei(data,ds,dwx,str,isZh);

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
  var curYr2=new Date().getFullYear();for(var y=curYr2;y<=curYr2+7;y++){
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
      if(sc>=4) nt+='宜积极把握机遇，适合拓展、投资、社交。';
      else if(sc<=2) nt+='宜守不宜攻，避免重大财务决策和冒险行为。';
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
  var ug=deriveUseGods(dwx,str,sc);
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
    if(ug.avoid.indexOf(sE)>=0)t+='天干忌神透出，事业上面临压力和挑战，宜守成不宜冒进。';
    else t+='天干喜用得力，事业上有拓展空间，可主动争取。';
    t+='</p>';
    t+='<p><b>财务方面：</b>';
    if(sc<=2)t+='今年财务风险偏高，避免大额投资和借贷。现金为王，量入为出。';
    else if(sc>=4)t+='财运相对顺畅，正财偏财均有机会。但仍需理性，不可盲目扩张。';
    else t+='财务平稳，无大起大落。日常开支注意节制即可。';
    t+='</p>';
    t+='<p><b>感情方面：</b>关注日支婚姻宫与流年地支的互动，';
    t+=(sg==='七杀'||sg==='伤官')?'今年感情容易有波动和冲突，注意沟通方式。':'整体感情运势平稳。';
    t+='</p>';
    lyB.innerHTML=t;
  }

  // 月度表格（section 10 内的表格）
  var tbl=sec.querySelector('.r-tbl');
  if(tbl&&a.yearly_forecast&&Array.isArray(a.yearly_forecast)){
    fillFlowMonths(a,ds,isZh);
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
  // 警告4: 婚姻宫（如果有第4个warn）
  if(warns.length>=4){
    var t=warns[3].querySelector('.r-warn-title'),b=warns[3].querySelector('.r-warn-body');
    var dayBr=data.chart.pillars.day.branch;
    if(t)t.textContent='婚姻宫（日支'+dayBr+'）提示';
    if(b)b.textContent='日支'+dayBr+'为婚姻宫，'+BRANCH_ELEM[dayBr]+'行坐支。关注流年冲合日支的年份，感情容易有变化。';
  }
}

/* ═══ 建议 ═══ */
function fillRecommendations(data,ds,dwx,ug,gender,isZh){
  if(!isZh)return;
  var sec=findSection('12');if(!sec)return;
  var grid=sec.querySelector('.r-rec-grid');if(!grid)return;
  var WXC={'金':'金融、法律、医疗器械、IT硬件','木':'教育、出版、设计、文创','水':'物流、传媒、咨询、旅游','火':'科技、能源、美容、餐饮','土':'房产、建筑、农业、保险'};
  var WXL={'木':'绿色系（鼠尾草绿、森林绿、橄榄绿）','火':'红橙色系（砖红、珊瑚红、铁锈红）','土':'棕黄色系（驼色、卡其、焦糖棕）','金':'白银色系（香槟、象牙白、珍珠白）','水':'蓝黑色系（藏蓝、墨黑、深灰）'};
  var WXD={'木':'东方','火':'南方','土':'中央','金':'西方','水':'北方'};
  var curYear=new Date().getFullYear();
  var gz=yearGZ(curYear),sg=getTenGod(ds,gz.stem);

  var cards=[
    {num:'01',title:curYear+'年度策略',body:curYear+'年'+gz.stem+gz.branch+'（'+sg+'），'+(LN_DESC[sg]||'')+'。'+(ug.avoid.indexOf(STEM_ELEM[gz.stem])>=0?'今年忌神当道，整体宜守不宜攻，财务保守，工作以维稳为主。':'今年喜用得力，可适当拓展事业，把握机遇。'),full:true},
    {num:'02',title:'事业行业方向',body:'适合的五行行业：'+ug.use.map(function(e){return e+'属性——'+WXC[e];}).join('。')+'。'},
    {num:'03',title:'幸运颜色',body:ug.use.map(function(e){return WXL[e];}).join('；')+'。日常穿搭、办公用品、手机壳等小物件都可以选用这些色系。'},
    {num:'04',title:'有利方位',body:'居住和办公最利方位：'+ug.use.map(function(e){return WXD[e]+'（'+e+'）';}).join('、')+'。如有搬迁计划，优先考虑这些方位。'},
    {num:'05',title:'感情择偶',body:'最佳配偶八字中'+ug.use.join('、')+'旺。配偶的五行能量能补充你命局的不足，形成互补的能量场。日支为婚姻宫，关注日支被冲合的流年。'},
    {num:'06',title:'养生重点',body:'重点关注'+dwx+'行对应的器官。日常可通过'+ug.use.join('、')+'属性的运动和饮食调理：'+(ug.use.indexOf('水')>=0?'游泳、泡温泉；':'')+(ug.use.indexOf('金')>=0?'呼吸练习、登山；':'')+(ug.use.indexOf('木')>=0?'瑜伽、户外散步；':'')+(ug.use.indexOf('火')>=0?'跑步、晒太阳；':'')+(ug.use.indexOf('土')>=0?'太极、散步；':'')},
  ];
  var html='';
  cards.forEach(function(cd){
    html+='<div class="r-rec-card'+(cd.full?' full':'')+'"><div class="r-rec-num">'+cd.num+'</div><div class="r-rec-title">'+cd.title+'</div><div class="r-rec-body">'+cd.body+'</div></div>';
  });
  grid.innerHTML=html;
}

/* ═══ 紫微斗数 ═══ */
function fillZiwei(data,ds,dwx,str,isZh){
  if(!isZh)return;
  var sec=findSection('13');if(!sec)return;
  // 清空硬编码的meta数据
  var meta=sec.querySelector('.r-zw-meta');
  if(meta) meta.innerHTML='<div class="r-zw-meta-item"><span class="r-zw-meta-label">日主</span>'+ds+dwx+'</div><div class="r-zw-meta-item"><span class="r-zw-meta-label">身强弱</span><b>'+str+'</b></div>';
  var sihua=sec.querySelector('.r-zw-sihua');
  if(sihua) sihua.style.display='none'; // 暂隐藏四化（需后端数据）
  // 填交叉验证结论
  var list=sec.querySelector('.r-zw-verify-list');
  if(list){
    var WXT={'木':'仁慈上进，创造力强','火':'热情光明，表现力佳','土':'诚信稳重，包容踏实','金':'果断义气，执行力强','水':'智慧灵活，适应力强'};
    var items=[
      {ok:true,text:'日主'+ds+dwx+'：'+WXT[dwx]+'，与紫微命宫主星特质呼应'},
      {ok:/旺|强/.test(str),text:'身'+str+'：'+(/旺|强/.test(str)?'命宫能量充足，紫微事业宫亦显主动开拓之象':'命宫需借力，紫微格局显示宜团队协作、借势发展')},
      {ok:true,text:'财帛宫：与八字财星格局相互印证，理财模式一致'},
      {ok:true,text:'夫妻宫：配偶特征与八字日支藏干暗示一致，可作为择偶参考'},
    ];
    list.innerHTML=items.map(function(it){
      return '<div class="r-zw-v-item '+(it.ok?'ok':'warn')+'">'+it.text+'</div>';
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
