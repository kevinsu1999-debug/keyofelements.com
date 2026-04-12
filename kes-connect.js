/*  kes-connect.js  —  连接表单到 Railway API  */

var KES_API = 'https://web-production-7fb80.up.railway.app';

/* 城市 → 经纬度 */
var CITY_COORDS = {
  'Shanghai 上海':[121.47,31.23],'Beijing 北京':[116.40,39.90],'Guangzhou 广州':[113.26,23.13],
  'Shenzhen 深圳':[114.06,22.54],'Chengdu 成都':[104.07,30.57],'Hangzhou 杭州':[120.15,30.27],
  'Wuhan 武汉':[114.31,30.59],'Chongqing 重庆':[106.55,29.56],'Nanjing 南京':[118.80,32.06],
  'Tianjin 天津':[117.20,39.08],"Xi'an 西安":[108.94,34.26],'Suzhou 苏州':[120.62,31.30],
  'Hong Kong 香港':[114.17,22.32],'Taipei 台北':[121.56,25.03],'Macao 澳门':[113.54,22.20],
  'Singapore 新加坡':[103.82,1.35],'Tokyo':[139.69,35.69],'Osaka':[135.50,34.69],
  'Seoul':[126.98,37.57],'London':[-0.12,51.51],'Paris':[2.35,48.86],
  'New York':[-74.01,40.71],'Los Angeles':[-118.24,34.05],'Sydney':[151.21,-33.87],
  'Melbourne':[144.96,-37.81],'Toronto':[-79.38,43.65],'Vancouver':[-123.12,49.28],
  'Amsterdam':[4.90,52.37],'Berlin':[13.40,52.52],'Dubai':[55.30,25.20],
  'Bangkok':[100.50,13.76],'Kuala Lumpur':[101.69,3.14],'Jakarta':[106.85,-6.21],
  'Mumbai':[72.88,19.08],'Delhi':[77.21,28.61]
};

/* 城市 → 时区偏移 */
var CITY_TZ = {
  'Shanghai 上海':8,'Beijing 北京':8,'Guangzhou 广州':8,'Shenzhen 深圳':8,
  'Chengdu 成都':8,'Hangzhou 杭州':8,'Wuhan 武汉':8,'Chongqing 重庆':8,
  'Nanjing 南京':8,'Tianjin 天津':8,"Xi'an 西安":8,'Suzhou 苏州':8,
  'Hong Kong 香港':8,'Taipei 台北':8,'Macao 澳门':8,'Singapore 新加坡':8,
  'Tokyo':9,'Osaka':9,'Seoul':9,'London':0,'Paris':1,
  'New York':-5,'Los Angeles':-8,'Sydney':10,'Melbourne':10,
  'Toronto':-5,'Vancouver':-8,'Amsterdam':1,'Berlin':1,'Dubai':4,
  'Bangkok':7,'Kuala Lumpur':8,'Jakarta':7,'Mumbai':5.5,'Delhi':5.5
};

/* 时辰 → 小时 (取中间值) */
var SHICHEN_HOUR = {
  '亥':22,'子':0,'丑':2,'寅':4,'卯':6,'辰':8,'巳':10,'午':12,'未':14,'申':16,'酉':18,'戌':20
};

/* 五行 → CSS class */
var WX_CLASS = {'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};

/* 天干 → 五行 */
var GAN_WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};

/* 地支 → 五行 */
var ZHI_WX = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};

/* ── 表单提交 ─────────────────────────────── */

function kesSubmit(){
  var isZh = document.documentElement.lang === 'zh';
  var yearEl = document.getElementById('birthYear');
  var monthEl = document.getElementById('birthMonth');
  var dayEl = document.getElementById('birthDay');
  var timeSelect = document.querySelector('.form-wrap .f-select:not(#birthYear):not(#birthMonth):not(#birthDay)');
  var cityVal = document.getElementById('cityInput').value;
  var genderF = document.getElementById('gF').classList.contains('on');
  var gender = genderF ? 'F' : 'M';

  if(!yearEl || !yearEl.value || !monthEl || !monthEl.value || !dayEl || !dayEl.value){
    alert(isZh ? '请选择完整的出生日期' : 'Please select your complete birth date'); return;
  }
  if(!timeSelect || !timeSelect.value){ alert(isZh ? '请选择出生时辰' : 'Please select your birth hour'); return; }
  if(!cityVal || cityVal.trim().length < 2){ alert(isZh ? '请输入出生城市' : 'Please enter your birth city'); return; }

  var year = parseInt(yearEl.value);
  var month = parseInt(monthEl.value);
  var day = parseInt(dayEl.value);
  var dateVal = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');

  /* 解析时辰 */
  var shichen = timeSelect.value;
  var hour = SHICHEN_HOUR[shichen];
  if(hour === undefined) hour = 0;

  /* 查找城市坐标 */
  var cityInput = document.getElementById('cityInput');
  var coords = CITY_COORDS[cityVal];
  if(!coords){
    /* 模糊匹配 */
    for(var k in CITY_COORDS){
      if(k.includes(cityVal) || cityVal.includes(k.split(' ')[0])){
        coords = CITY_COORDS[k]; cityVal = k; break;
      }
    }
  }
  /* 从 data 属性获取（kes-city.js 设置） */
  if(!coords && cityInput.dataset.lon && cityInput.dataset.lat){
    coords = [parseFloat(cityInput.dataset.lon), parseFloat(cityInput.dataset.lat)];
  }
  if(!coords){
    alert(isZh ? '请从下拉列表中选择城市，以确保经纬度准确' : 'Please select a city from the dropdown to ensure accurate coordinates');
    return;
  }
  var lon = coords[0];
  var lat = coords[1];
  var tz = CITY_TZ[cityVal] || Math.round(lon / 15);

  console.log('城市坐标:', cityVal, 'lon:', lon, 'lat:', lat, 'tz:', tz);

  /* ── 显示全屏加载 ── */
  var loading = document.getElementById('kesLoading');
  var loadStep = document.getElementById('loadStep');
  if(loading) loading.classList.add('on');

  var btn = document.querySelector('.f-btn');
  var origText = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = '0.6';

  function setStep(msg){ if(loadStep) loadStep.textContent = msg; }
  setStep(isZh ? '正在排盘计算…' : 'Calculating chart...');

  var body = {
    birth_year: year, birth_month: month, birth_day: day,
    birth_hour: hour, birth_minute: 0,
    timezone_offset_hours: tz,
    longitude: lon, latitude: lat,
    gender: gender, name: '', lang: isZh ? 'zh-CN' : 'en'
  };

  fetch(KES_API + '/api/calculate', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  .then(function(res){
    if(!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  })
  .then(function(data){
    setStep(isZh ? '排盘完成，正在生成深度分析…' : 'Chart ready, generating deep analysis...');

    if(typeof lockReport==='function') lockReport();

    // 准备 Claude 润色请求
    var chart = data.chart;
    var pillars = chart.pillars;
    var wuxing = chart.wuxing_counts || {};
    var wxTotal = 0;
    ['木','火','土','金','水'].forEach(function(w){ wxTotal += (wuxing[w]||0); });
    var wxSummary = ['木','火','土','金','水'].map(function(w){
      return w + Math.round((wuxing[w]||0)/(wxTotal||1)*100) + '%';
    }).join(' ');

    var dayWxE = GAN_WX[pillars.day.stem];
    var dm = chart.day_master_strength || '';
    var wxGen={'木':'火','火':'土','土':'金','金':'水','水':'木'};
    var wxCtrl={'木':'土','火':'金','土':'水','金':'木','水':'火'};
    var wxGenBy={'火':'木','土':'火','金':'土','水':'金','木':'水'};
    var wxCtrlBy={'土':'木','金':'火','水':'土','木':'金','火':'水'};
    var uE=[],aE=[];
    if(dm.indexOf('旺')>=0||dm.indexOf('强')>=0){uE=[wxGen[dayWxE],wxCtrl[dayWxE],wxCtrlBy[dayWxE]];aE=[wxGenBy[dayWxE],dayWxE];}
    else if(dm.indexOf('弱')>=0){uE=[wxGenBy[dayWxE],dayWxE];aE=[wxGen[dayWxE],wxCtrl[dayWxE],wxCtrlBy[dayWxE]];}
    else{uE=[wxGenBy[dayWxE],dayWxE];aE=[wxGen[dayWxE],wxCtrl[dayWxE]];}

    var tenGods = chart.ten_gods || {};
    // 构建大运信息摘要
    var dayunInfo = '';
    if(data.dayun && data.dayun.periods){
      var curYear = new Date().getFullYear();
      var birthYear = parseInt(dateVal.split('-')[0]);
      data.dayun.periods.forEach(function(dp, i){
        var startAge = Math.round(dp.start_age);
        var endAge = i+1<data.dayun.periods.length ? Math.round(data.dayun.periods[i+1].start_age) : startAge+10;
        var dpStartYear = birthYear + startAge;
        var dpEndYear = birthYear + endAge;
        var isCur = (curYear >= dpStartYear && curYear < dpEndYear);
        var label = isCur ? '[当前]' : '';
        dayunInfo += label + dp.stem + dp.branch + '(' + startAge + '-' + endAge + '岁,' + dpStartYear + '-' + dpEndYear + ') 十神:' + (dp.ten_god_stem||'') + '/' + (dp.ten_god_branch||'') + '; ';
      });
    }

    // 构建藏干摘要
    var hiddenInfo = '';
    if(chart.hidden_stems){
      ['year','month','day','hour'].forEach(function(pos){
        var hs = chart.hidden_stems[pos] || [];
        if(hs.length) hiddenInfo += pos + ':' + hs.join(',') + ' ';
      });
    }

    // 构建神煞摘要
    var shenShaInfo = '';
    if(chart.shen_sha){
      var ss = chart.shen_sha;
      if(typeof ss === 'object'){
        for(var sk in ss){
          if(Array.isArray(ss[sk]) && ss[sk].length) shenShaInfo += sk + ':' + ss[sk].join(',') + ' ';
          else if(typeof ss[sk] === 'string' && ss[sk]) shenShaInfo += sk + ':' + ss[sk] + ' ';
        }
      }
    }

    var enrichBody = {
      chart: {
        day_master: pillars.day.stem,
        day_master_element: dayWxE,
        strength: dm,
        score: chart.day_master_score || '',
        year_pillar: pillars.year.stem + pillars.year.branch,
        month_pillar: pillars.month.stem + pillars.month.branch,
        day_pillar: pillars.day.stem + pillars.day.branch,
        hour_pillar: pillars.hour.stem + pillars.hour.branch,
        hidden_stems: hiddenInfo,
        year_god: tenGods.year_stem || '',
        month_god: tenGods.month_stem || '',
        hour_god: tenGods.hour_stem || '',
        wuxing_summary: wxSummary,
        use_gods: uE.join('、'),
        avoid_gods: aE.join('、'),
        kong_wang: chart.kong_wang ? (chart.kong_wang.day_kong||[]).join(',') : '',
        shen_sha: shenShaInfo,
        tiaohuo: chart.tiaohuo_gods ? chart.tiaohuo_gods.join(',') : '',
        gender: gender,
        dayun_info: dayunInfo
      },
      analysis: data.analysis || {},
      dayun: data.dayun || {},
      lang: isZh ? 'zh' : 'en',
      isPaid: false
    };

    return fetch('/api/enrich', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(enrichBody)
    })
    .then(function(res2){ return res2.ok ? res2.json() : null; })
    .then(function(enrichData){
      setStep(isZh ? '分析完成，正在渲染报告…' : 'Rendering report...');

      if(enrichData && enrichData.enriched){
        var e = enrichData.enriched;
        if(!data.analysis) data.analysis = {};
        if(e.personality) data.analysis.personality = e.personality;
        if(e.career) data.analysis.career = e.career;
        if(e.relationship) data.analysis.relationship = e.relationship;
        if(e.health) data.analysis.health = e.health;
        if(e.dayun_detail) data.analysis.dayun_detail = e.dayun_detail;
        data._enriched = e;
      }

      fillReport(data, dateVal, shichen, gender);
      goPage('report');

      setTimeout(function(){
        if(loading) loading.classList.remove('on');
      }, 300);
      btn.textContent = origText;
      btn.disabled = false;
      btn.style.opacity = '1';
    });
  })
  .catch(function(err){
    alert(isZh ? '计算出错：' + err.message : 'Error: ' + err.message);
    if(loading) loading.classList.remove('on');
    btn.textContent = origText;
    btn.disabled = false;
    btn.style.opacity = '1';
  });
}

/* ── 填充报告 ─────────────────────────────── */

function fillReport(data, dateStr, shichen, gender){
  var chart = data.chart;
  var pillars = chart.pillars;
  var analysis = data.analysis;
  var dayun = data.dayun;

  // Debug: 查看 API 返回的完整数据结构
  console.log('=== API Response ===');
  console.log('time:', JSON.stringify(data.time));

  var dayStem = pillars.day.stem;
  var dayWx = GAN_WX[dayStem];
  var dayWxClass = WX_CLASS[dayWx];

  /* 日期格式化 — 使用后端返回的真太阳时 */
  var dp = dateStr.split('-');
  var isZhPage = document.documentElement.lang === 'zh';
  var dateDisplay = dp[0]+'年'+parseInt(dp[1])+'月'+parseInt(dp[2])+'日 '+shichen+'时';
  var tstDisplay = '';
  var correctionNote = '';

  var timeData = data.time || {};
  if(timeData.true_solar_time){
    var tst = new Date(timeData.true_solar_time);
    console.log('TST parsed:', tst);
    if(!isNaN(tst.getTime())){
      var tstH = tst.getUTCHours();
      var tstM = tst.getUTCMinutes();
      // 真太阳时已经是当地太阳时，直接用 UTC 部分（因为它不带标准时区概念）
      // 但API返回的可能是UTC格式，需要取本地时间
      // 如果带时区标记，用getHours；如果是UTC格式，需要加时区
      var tstStr = timeData.true_solar_time;
      if(tstStr.indexOf('+00:00') >= 0 || tstStr.endsWith('Z')){
        // 这是UTC格式的真太阳时，实际就是当地太阳时（因为后端已经加了经度校正）
        tstH = tst.getUTCHours();
        tstM = tst.getUTCMinutes();
      } else {
        tstH = tst.getHours();
        tstM = tst.getMinutes();
      }

      // 找到真太阳时对应的时辰
      var shichenMap = [
        [23,'子'],[1,'丑'],[3,'寅'],[5,'卯'],[7,'辰'],[9,'巳'],
        [11,'午'],[13,'未'],[15,'申'],[17,'酉'],[19,'戌'],[21,'亥']
      ];
      var tstShichen = '子';
      for(var si=shichenMap.length-1;si>=0;si--){
        if(tstH >= shichenMap[si][0]){ tstShichen = shichenMap[si][1]; break; }
      }
      tstDisplay = String(tstH).padStart(2,'0') + ':' + String(tstM).padStart(2,'0') +
        (isZhPage ? '（' + tstShichen + '时）' : ' (' + tstShichen + ')');
    }
  }

  if(timeData.eot_minutes !== undefined && timeData.longitude_correction !== undefined){
    // longitude_correction 是从格林威治算的总校正（lon*4分钟）
    // 对用户有意义的是相对于当地标准时间的校正
    var rawLonCorr = timeData.longitude_correction; // lon * 4
    var eot = timeData.eot_minutes;
    // 本地经度校正 = (经度 - 时区标准经线) * 4 = rawLonCorr - timezone*60
    var tz = CITY_TZ[document.getElementById('cityInput').value] || 8;
    var localLonCorr = rawLonCorr - tz * 60;
    var totalCorr = (localLonCorr + eot).toFixed(1);
    correctionNote = isZhPage
      ? '经度校正 ' + localLonCorr.toFixed(1) + '分 + 均时差 ' + eot.toFixed(1) + '分 = 总校正 ' + totalCorr + '分'
      : 'Lon ' + localLonCorr.toFixed(1) + 'min + EoT ' + eot.toFixed(1) + 'min = ' + totalCorr + 'min';
  }

  /* ── 报告头部（紧凑版） ── */
  var hdr = document.querySelector('.rpt-info-card');
  if(hdr){
    var isZhHdr = document.documentElement.lang === 'zh';
    var genderText = isZhHdr ? (gender==='F' ? '女命' : '男命') : (gender==='F' ? 'Female' : 'Male');
    hdr.innerHTML =
      '<div class="rpt-f"><div class="rpt-f-l">'+(isZhHdr?'性别':'Gender')+'</div><div class="rpt-f-v"><b>'+genderText+'</b></div></div>'+
      '<div class="rpt-f"><div class="rpt-f-l">'+(isZhHdr?'出生':'Birth')+'</div><div class="rpt-f-v">'+dateDisplay+'</div></div>'+
      '<div class="rpt-f"><div class="rpt-f-l">'+(isZhHdr?'日主':'DM')+'</div><div class="rpt-f-v"><b class="e-'+dayWxClass+'">'+dayStem+dayWx+'</b></div></div>'+
      (tstDisplay ? '<div class="rpt-f"><div class="rpt-f-l">'+(isZhHdr?'真太阳时':'TST')+'</div><div class="rpt-f-v">'+tstDisplay+(correctionNote ? '<span class="rpt-f-note" style="font-size:9px;display:block;margin-top:2px;color:var(--t4)">'+correctionNote+'</span>' : '')+'</div></div>' : '');
  }

  /* ── 01 四柱 ── */
  var positions = ['year','month','day','hour'];
  var posNames = ['年　柱','月　柱','日　柱','时　柱'];
  var tenGods = chart.ten_gods || {};
  var kongList = [];
  if(chart.kong_wang){
    var kw = chart.kong_wang;
    if(kw.day_kong) kongList = kw.day_kong;
    else if(kw.kong_wang_branches) kongList = kw.kong_wang_branches;
  }

  var pillarHtml = '';
  for(var i=0;i<4;i++){
    var pos = positions[i];
    var p = pillars[pos];
    var stem = p.stem;
    var branch = p.branch;
    var stemWx = GAN_WX[stem] || '土';
    var branchWx = ZHI_WX[branch] || '土';
    var ssLabel = (pos==='day') ? '日主' : (tenGods[pos+'_stem'] || '');
    var ssClass = (pos==='day') ? 'r-ss-rizhu' : '';
    var dayClass = (pos==='day') ? ' r-day-'+dayWxClass : '';
    var isKong = kongList.indexOf(branch) >= 0;

    /* 藏干 */
    var hiddenStems = chart.hidden_stems[pos] || [];
    var hiddenHtml = '';
    for(var h=0;h<hiddenStems.length;h++){
      var hs = hiddenStems[h];
      var hsWx = GAN_WX[hs] || '土';
      hiddenHtml += '<span class="r-pillar-h e-'+WX_CLASS[hsWx]+'">'+hs+'</span>';
    }

    pillarHtml += '<div class="r-pillar'+dayClass+'">'+
      '<div class="r-pillar-pos">'+posNames[i]+'</div>'+
      '<div class="r-pillar-ss '+ssClass+'">'+ssLabel+'</div>'+
      '<div class="r-pillar-gz"><span class="e-'+WX_CLASS[stemWx]+'">'+stem+'</span><span class="e-'+WX_CLASS[branchWx]+'">'+branch+'</span></div>'+
      '<div class="r-pillar-hidden">'+hiddenHtml+'</div>'+
      (isKong ? '<span class="r-kong">空亡</span>' : '')+
    '</div>';
  }

  var pillarGrid = document.querySelector('.r-pillar-grid');
  if(pillarGrid) pillarGrid.innerHTML = pillarHtml;

  /* 空亡说明 */
  var sec01sub = document.querySelectorAll('.r-sub')[0];
  if(sec01sub && kongList.length){
    sec01sub.textContent = '以真太阳时校正后排盘，空亡：' + kongList.join('、');
  }

  /* ── 02 五行能量 ── */
  var wuxing = chart.wuxing_counts || {};
  var wxOrder = ['木','火','土','金','水'];
  var wxTotal = 0;
  for(var w=0;w<wxOrder.length;w++) wxTotal += (wuxing[wxOrder[w]] || 0);
  if(wxTotal === 0) wxTotal = 1;

  var wxGrid = document.querySelector('.r-wx-grid');
  if(wxGrid){
    var wxHtml = '';
    for(var w=0;w<wxOrder.length;w++){
      var wx = wxOrder[w];
      var val = wuxing[wx] || 0;
      var pct = Math.round(val/wxTotal*100);
      var barW = Math.max(2, Math.round(pct/Math.max.apply(null,wxOrder.map(function(e){return Math.round((wuxing[e]||0)/wxTotal*100)}))*100));
      wxHtml += '<div class="r-wx"><div class="r-wx-char e-'+WX_CLASS[wx]+'">'+wx+'</div>'+
        '<div class="r-wx-bar-wrap"><div class="r-wx-bar" style="width:'+barW+'%;background:var(--'+WX_CLASS[wx]+')"></div></div>'+
        '<div class="r-wx-pct e-'+WX_CLASS[wx]+'">'+pct+'%</div><div class="r-wx-status"></div></div>';
    }
    wxGrid.innerHTML = wxHtml;
  }

  /* ── 03 身强弱 ── */
  var strength = chart.day_master_strength || '中和';
  // 后端新标签: 身强, 偏强, 中和, 偏弱, 身弱
  var strengthMap = {'身弱':0,'偏弱':1,'中和':2,'偏强':3,'身强':4,
                     '极弱':0,'极旺':4,'中性':2,'偏旺':3};
  var sIdx = strengthMap[strength];
  if(sIdx === undefined) sIdx = 2;

  var meter = document.querySelector('.r-meter-track');
  if(meter){
    var segs = '';
    for(var s=0;s<5;s++){
      segs += '<div class="r-meter-seg'+(s<=sIdx?' filled':'')+(s===sIdx?' active':'')+'"></div>';
    }
    meter.innerHTML = segs;
  }
  var mLabels = document.querySelector('.r-meter-labels');
  if(mLabels){
    var lbls = ['身弱','偏弱','中和','偏强','身强'];
    mLabels.innerHTML = lbls.map(function(l,i){return '<span'+(i===sIdx?' class="on"':'')+'>'+l+'</span>'}).join('');
  }
  var verdict = document.querySelector('.r-str-verdict');
  if(verdict) verdict.textContent = strength;

  /* ── 04 喜用忌神 ── */
  var yjGrid = document.querySelector('.r-yj-grid');
  if(yjGrid){
    var wxNames = ['木','火','土','金','水'];
    var useElems = [], avoidElems = [];

    // 五行关系表
    var dayWxElem = dayWx; // 日主五行
    var wxGen = {'木':'火','火':'土','土':'金','金':'水','水':'木'};     // X生什么（食伤）
    var wxCtrl = {'木':'土','火':'金','土':'水','金':'木','水':'火'};    // X克什么（财星）
    var wxGenBy = {'火':'木','土':'火','金':'土','水':'金','木':'水'};   // 什么生X（印星）
    var wxCtrlBy = {'土':'木','金':'火','水':'土','木':'金','火':'水'}; // 什么克X（官杀）

    var dm = chart.day_master_strength || strength || '';
    var dmScore = chart.day_master_score || 0;
    console.log('=== 用神推导 ===');
    console.log('日主:', dayStem, dayWxElem, '身强弱:', dm, 'score:', dmScore);

    // ★ 核心方法：根据身强弱推导
    // 后端标签: 极旺, 偏旺, 中性, 偏弱, 极弱
    var isStrong = (dm.indexOf('旺') >= 0 || dm.indexOf('强') >= 0);
    var isWeak = (dm.indexOf('弱') >= 0);
    var isNeutral = (dm === '中性' || dm === '中和' || (!isStrong && !isWeak));

    if(isStrong){
      // 身旺：泄(食伤)+耗(财)+克(官杀)为喜
      useElems = [wxGen[dayWxElem], wxCtrl[dayWxElem], wxCtrlBy[dayWxElem]];
      avoidElems = [wxGenBy[dayWxElem], dayWxElem];
    } else if(isWeak){
      // 身弱：生(印星)+扶(比劫)为喜
      useElems = [wxGenBy[dayWxElem], dayWxElem];
      avoidElems = [wxGen[dayWxElem], wxCtrl[dayWxElem], wxCtrlBy[dayWxElem]];
    } else {
      // 中性：根据分数偏向判断
      if(dmScore >= 4.8){
        // 偏强方向
        useElems = [wxGen[dayWxElem], wxCtrl[dayWxElem]];
        avoidElems = [wxGenBy[dayWxElem], dayWxElem];
      } else {
        // 偏弱方向（中性默认偏向扶助）
        useElems = [wxGenBy[dayWxElem], dayWxElem];
        avoidElems = [wxGen[dayWxElem], wxCtrl[dayWxElem]];
      }
    }

    // 尝试从API覆盖（仅当API数据结构清晰且合理时）
    var apiUse = [], apiAvoid = [];
    if(analysis && analysis.raw && analysis.raw.pattern && analysis.raw.pattern.use_gods){
      var ug = analysis.raw.pattern.use_gods;
      var ugStr = String(ug['用神'] || ug['喜神'] || ug['喜'] || '');
      var avStr = String(ug['忌神'] || ug['忌'] || '');
      for(var w=0;w<wxNames.length;w++){
        if(ugStr.indexOf(wxNames[w]) >= 0) apiUse.push(wxNames[w]);
        if(avStr.indexOf(wxNames[w]) >= 0) apiAvoid.push(wxNames[w]);
      }
    }
    if(apiUse.length === 0 && analysis && analysis.use_god_summary){
      var sumText = String(analysis.use_god_summary);
      var useMatch = sumText.match(/用神[：:]\s*([^忌\n]{1,20})/);
      var avoidMatch = sumText.match(/忌神[：:]\s*([^\n]{1,20})/);
      if(useMatch) for(var w=0;w<wxNames.length;w++){ if(useMatch[1].indexOf(wxNames[w])>=0) apiUse.push(wxNames[w]); }
      if(avoidMatch) for(var w=0;w<wxNames.length;w++){ if(avoidMatch[1].indexOf(wxNames[w])>=0) apiAvoid.push(wxNames[w]); }
    }

    // 验证API结果是否合理：身弱喜印比，身强喜泄耗
    if(apiUse.length > 0){
      var apiValid = true;
      if(isWeak){
        // 身弱应该喜印星(生我的)或比劫(同类)
        var yinXing = wxGenBy[dayWxElem]; // 印星
        if(apiUse.indexOf(yinXing) < 0 && apiUse.indexOf(dayWxElem) < 0) apiValid = false;
      } else if(isStrong){
        // 身旺应该喜食伤(泄)或财星(耗)
        var shiShang = wxGen[dayWxElem]; // 食伤
        if(apiUse.indexOf(shiShang) < 0 && apiUse.indexOf(wxCtrl[dayWxElem]) < 0) apiValid = false;
      }
      if(apiValid){
        useElems = apiUse;
        if(apiAvoid.length > 0) avoidElems = apiAvoid;
        console.log('使用API用神数据（已验证）');
      } else {
        console.log('API用神数据不合理，使用推导结果');
      }
    }

    // 去重 + 过滤空值
    useElems = useElems.filter(function(v,i,a){return v && a.indexOf(v)===i});
    avoidElems = avoidElems.filter(function(v,i,a){return v && a.indexOf(v)===i});
    console.log('最终用神:', useElems, '忌神:', avoidElems);

    var yjHtml = '<div class="r-yj-card"><div class="r-yj-label">用　神</div><div class="r-yj-chars">';
    for(var u=0;u<useElems.length;u++){
      yjHtml += '<span class="r-yj-char '+WX_CLASS[useElems[u]]+'">'+useElems[u]+'</span>';
    }
    yjHtml += '</div></div>';

    yjHtml += '<div class="r-yj-card"><div class="r-yj-label">忌　神</div><div class="r-yj-chars">';
    for(var a=0;a<avoidElems.length;a++){
      yjHtml += '<span class="r-yj-char '+WX_CLASS[avoidElems[a]]+'">'+avoidElems[a]+'</span>';
    }
    yjHtml += '</div></div>';

    if(chart.tiaohuo_gods && chart.tiaohuo_gods.length){
      yjHtml += '<div class="r-yj-card"><div class="r-yj-label">调候用神</div><div class="r-yj-chars">';
      for(var t=0;t<chart.tiaohuo_gods.length;t++){
        var tg = chart.tiaohuo_gods[t];
        var tgWx = GAN_WX[tg] || '水';
        yjHtml += '<span class="r-yj-char '+WX_CLASS[tgWx]+'">'+tg+'</span>';
      }
      yjHtml += '</div></div>';
    }
    yjGrid.innerHTML = yjHtml;
  }

  /* ── 05 性格 ── */
  if(analysis && analysis.personality){
    var persBox = document.querySelector('#p-report .r-sec:nth-child(7)');
    /* Find the personality section by its heading */
    var allSecs = document.querySelectorAll('#p-report .r-sec');
    for(var si=0;si<allSecs.length;si++){
      var hText = allSecs[si].querySelector('.r-h');
      if(hText && hText.textContent.includes('性格')){
        var elemId = allSecs[si].querySelector('.r-elem-id');
        if(elemId){
          elemId.innerHTML = '<div class="r-elem-icon '+dayWxClass+'">'+dayStem+'</div>'+
            '<div><div class="r-elem-id-name">'+dayStem+dayWx+'日主</div>'+
            '<div class="r-elem-id-desc"></div></div>';
        }
        var persContent = allSecs[si].querySelector('.r-personality-body, .r-text');
        /* Replace all <p> tags in this section with analysis text */
        var pTags = allSecs[si].querySelectorAll('p');
        if(pTags.length > 0){
          var persLines = analysis.personality.split(/[。\n]+/).filter(function(x){return x.trim()});
          for(var pi=0;pi<pTags.length && pi<persLines.length;pi++){
            pTags[pi].innerHTML = persLines[pi] + '。';
          }
        }
        break;
      }
    }
  }

  /* ── 09 大运 ── */
  if(dayun && dayun.periods && dayun.periods.length){
    var dyScroll = document.querySelector('.r-dy-scroll');
    if(dyScroll){
      var dyHtml = '';
      var curYear = new Date().getFullYear();
      var curDyInfo = null;
      for(var d=0;d<Math.min(dayun.periods.length,8);d++){
        var dp = dayun.periods[d];
        var startAge = Math.round(dp.start_age);
        var endAge = d+1<dayun.periods.length ? Math.round(dayun.periods[d+1].start_age) : startAge+10;
        /* 判断是否是当前大运 */
        var dpStartYear = parseInt(dateStr.split('-')[0]) + startAge;
        var dpEndYear = parseInt(dateStr.split('-')[0]) + endAge;
        var isCur = (curYear >= dpStartYear && curYear < dpEndYear);

        // 计算大运十神
        var dpStemGod = getTenGod(dayStem, dp.stem) || dp.ten_god_stem || '';
        var dpBranchGod = getTenGodFromBranch(dayStem, dp.branch) || dp.ten_god_branch || '';

        dyHtml += '<div class="r-dy-item'+(isCur?' cur':'')+'">'+
          (isCur ? '<div class="r-dy-label">当前</div>' : '')+
          '<div class="r-dy-gz">'+dp.stem+dp.branch+'</div>'+
          '<div class="r-dy-age">'+startAge+'至'+endAge+'岁</div></div>';

        // 保存当前大运信息
        if(isCur) curDyInfo = {stem:dp.stem, branch:dp.branch, stemGod:dpStemGod, branchGod:dpBranchGod, startAge:startAge, endAge:endAge};
      }
      dyScroll.innerHTML = dyHtml;
    }

    // ── 当前大运十神描述（中文） ──
    if(curDyInfo && isZhPage){
      var dySummary = document.querySelector('.r-dy-summary-grid');
      if(!dySummary){
        // 创建大运摘要区域
        addContentToSection('大运', function(){
          var godDesc = DAYUN_DESC_ZH[curDyInfo.stemGod] || '';
          var brGodDesc = '';
          if(curDyInfo.branchGod && curDyInfo.branchGod !== curDyInfo.stemGod){
            brGodDesc = DAYUN_DESC_ZH[curDyInfo.branchGod] || '';
          }
          var html = '<div style="margin-top:16px;padding:18px 20px;background:var(--card);border:1px solid var(--line);border-radius:8px">';
          html += '<div style="font-size:15px;font-weight:700;margin-bottom:10px">当前大运：'+curDyInfo.stem+curDyInfo.branch+'（'+curDyInfo.startAge+'至'+curDyInfo.endAge+'岁）</div>';
          html += '<div style="font-size:12px;color:var(--t3);margin-bottom:8px">天干 '+curDyInfo.stem+' → <b>'+curDyInfo.stemGod+'</b>大运 | 地支 '+curDyInfo.branch+' → <b>'+curDyInfo.branchGod+'</b></div>';
          if(godDesc) html += '<p style="font-size:13px;line-height:1.85;color:var(--t2);margin:8px 0"><b>'+curDyInfo.stemGod+'运：</b>'+godDesc+'。</p>';
          if(brGodDesc) html += '<p style="font-size:13px;line-height:1.85;color:var(--t2);margin:8px 0"><b>'+curDyInfo.branchGod+'运（地支）：</b>'+brGodDesc+'。</p>';
          html += '</div>';
          return html;
        });
      }
    }
  }

  /* ── 06,07,08 用 analysis 文本填充 ── */
  fillAnalysisSection('事业', analysis ? analysis.career : '');
  fillAnalysisSection('财运', analysis ? analysis.wealth : '');
  fillAnalysisSection('健康', analysis ? analysis.health : '');
  fillAnalysisSection('感情', analysis ? analysis.relationship : '');

  // English
  fillAnalysisSection('Career', analysis ? analysis.career : '');
  fillAnalysisSection('Wealth', analysis ? analysis.wealth : '');
  fillAnalysisSection('Health', analysis ? analysis.health : '');
  fillAnalysisSection('Relationship', analysis ? analysis.relationship : '');
  fillAnalysisSection('Marriage', analysis ? analysis.relationship : '');

  // ── 大运详情(Claude 生成 覆盖上面的十神描述) ──
  if(analysis && analysis.dayun_detail){
    addContentToSection(isZhPage?'大运':'Luck', function(){
      return '<div style="margin-top:16px;line-height:1.9;font-size:13px;color:var(--t2)">'+formatParagraphs(analysis.dayun_detail)+'</div>';
    });
  }

  /* ── 扩充免费板块内容 ── */
  enrichFreeContent(data, useElems, avoidElems, gender);

  // Debug
  console.log('analysis keys:', analysis ? Object.keys(analysis) : 'none');

  /* ── 09+ 付费墙内容：动态流年表 ── */
  fillFlowYears(data, dateStr, gender);

  /* ── 11 预警：动态填充 ── */
  fillWarnings(data);

  /* ── Auto-translate for English page ── */
  if(document.documentElement.lang === 'en' && analysis){
    translateReport(analysis, chart);
  }
}

/* ══════════════════════════════════════════
   扩充免费板块内容
══════════════════════════════════════════ */

var WX_NAME_ZH = {'木':'木','火':'火','土':'土','金':'金','水':'水'};
var WX_NAME_EN = {'木':'Wood','火':'Fire','土':'Earth','金':'Metal','水':'Water'};
var WX_COLOR_ZH = {'木':'绿色系（鼠尾草绿、森林绿、橄榄绿）','火':'红色系（砖红、珊瑚红、铁锈红）','土':'棕色系（驼色、卡其、焦糖棕）','金':'白金色系（香槟、象牙白、珍珠白）','水':'蓝黑色系（藏蓝、墨黑、深灰）'};
var WX_COLOR_EN = {'木':'Greens (sage, forest, olive)','火':'Reds (brick, coral, rust)','土':'Browns (camel, khaki, caramel)','金':'Whites & Golds (champagne, ivory, pearl)','水':'Blues & Blacks (navy, ink black, slate)'};
var WX_DIR_ZH = {'木':'东方','火':'南方','土':'中央','金':'西方','水':'北方'};
var WX_DIR_EN = {'木':'East','火':'South','土':'Center','金':'West','水':'North'};
var WX_SEASON_ZH = {'木':'春季','火':'夏季','土':'四季之交','金':'秋季','水':'冬季'};
var WX_ORGAN_ZH = {'木':'肝胆','火':'心脏/小肠','土':'脾胃','金':'肺/大肠','水':'肾/膀胱'};
var WX_TRAIT_ZH = {'木':'仁爱、成长、创造','火':'礼仪、热情、明亮','土':'诚信、稳重、包容','金':'义气、果断、精确','水':'智慧、灵活、深沉'};

// 十神含义
var SHISHEN_ZH = {
  '比肩':'独立自主，意志坚定，有主见，重义气',
  '劫财':'社交能力强，善于竞争，财来财去，需注意理财',
  '食神':'乐观温和，享受生活，才华横溢，有口福',
  '伤官':'聪明伶俐，创造力强，个性张扬，口才出众',
  '偏财':'商业嗅觉敏锐，人缘好，擅长理财投资',
  '正财':'踏实稳健，理财有方，重视物质安全感',
  '七杀':'魄力十足，抗压能力强，敢于挑战权威',
  '正官':'责任心强，遵守规则，有领导才能，稳重可靠',
  '偏印':'思维独特，直觉敏锐，学习能力强，兴趣广泛',
  '正印':'善良仁慈，有文化修养，贵人缘好，适合学术'
};

function enrichFreeContent(data, useElems, avoidElems, gender){
  var chart = data.chart;
  var enriched = data._enriched || {};
  var isZh = document.documentElement.lang === 'zh';
  var wuxing = chart.wuxing_counts || {};

  // ── 02 五行：Claude 叙事 ──
  if(enriched.wuxing_narrative){
    addContentToSection(isZh?'五行':'Element', function(){
      return '<div style="line-height:1.9;font-size:13px;color:var(--t2);margin-top:10px;font-family:\'Noto Serif SC\',serif">'+formatParagraphs(enriched.wuxing_narrative)+'</div>';
    });
  } else {
    // 回退：基础五行分析
    addContentToSection(isZh?'五行':'Element', function(){
      var wxTotal=0,wxOrder=['木','火','土','金','水'];
      wxOrder.forEach(function(w){wxTotal+=(wuxing[w]||0);});
      if(wxTotal===0) return '';
      var strongest='',weakest='',sPct=0,wPct=100;
      wxOrder.forEach(function(w){var pct=Math.round((wuxing[w]||0)/wxTotal*100);if(pct>sPct){sPct=pct;strongest=w;}if(pct<wPct){wPct=pct;weakest=w;}});
      return '<p>'+strongest+'最旺（'+sPct+'%），'+weakest+'最弱（'+wPct+'%）。</p>';
    });
  }

  // ── 03 身强弱：Claude 详解 ──
  if(enriched.strength_detail){
    addContentToSection(isZh?'身强':'strength', function(){
      return '<div style="line-height:1.9;font-size:13px;color:var(--t2);margin-top:10px">'+formatParagraphs(enriched.strength_detail)+'</div>';
    });
  }

  // ── 04 喜用忌神：引导付费 ──
  addContentToSection(isZh?'喜用忌神':'Favorable', function(){
    if(!useElems || useElems.length === 0) return '';
    if(isZh){
      return '<div style="margin-top:14px;padding:14px 18px;background:var(--bg2);border-radius:8px;font-size:12px;line-height:1.8;color:var(--t3)">'+
        '喜用神是命理调和的核心——它决定了最适合你的颜色、方位、行业、养生方向和择偶标准。'+
        '<b style="color:var(--t2)">解锁完整报告</b>，获取个性化的幸运颜色、有利方位、事业方向和生活指南。</div>';
    } else {
      return '<div style="margin-top:14px;padding:14px 18px;background:var(--bg2);border-radius:8px;font-size:12px;line-height:1.8;color:var(--t3)">'+
        'Your favorable elements determine your ideal colors, directions, career paths, and wellness strategies. '+
        '<b style="color:var(--t2)">Unlock the full report</b> for personalized guidance.</div>';
    }
  });

  // ── 05 四柱宫位解读（如有） ──
  if(enriched.pillars_insight){
    addContentToSection(isZh?'四柱':'Four', function(){
      return '<div style="line-height:1.9;font-size:13px;color:var(--t2);margin-top:12px;padding:14px 18px;background:var(--bg2);border-radius:8px">'+formatParagraphs(enriched.pillars_insight)+'</div>';
    });
  }
}

function formatParagraphs(text){
  if(!text) return '';
  return text.split(/\n+/).filter(function(p){return p.trim()}).map(function(p){
    return '<p style="margin-bottom:8px">'+p.trim()+'</p>';
  }).join('');
}

/* 向指定板块追加内容 */
function addContentToSection(keyword, contentFn){
  var allSecs = document.querySelectorAll('#p-report .r-sec');
  for(var i=0;i<allSecs.length;i++){
    var h = allSecs[i].querySelector('.r-h');
    if(h && h.textContent.includes(keyword)){
      var content = contentFn();
      if(content){
        var hr = allSecs[i].querySelector('.r-hr');
        if(hr) hr.insertAdjacentHTML('beforebegin', content);
        else allSecs[i].insertAdjacentHTML('beforeend', content);
      }
      break;
    }
  }
}

/* ── 天干地支计算工具 ── */
var TIAN_GAN_LIST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var DI_ZHI_LIST = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var STEM_ELEM = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
var BRANCH_ELEM = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
// 地支主气藏干
var BRANCH_MAIN_HIDDEN = {'子':'癸','丑':'己','寅':'甲','卯':'乙','辰':'戊','巳':'丙','午':'丁','未':'己','申':'庚','酉':'辛','戌':'戊','亥':'壬'};

/* ── 十神计算 ── */
function getTenGod(dayStem, otherStem){
  if(!dayStem || !otherStem) return '';
  var di = TIAN_GAN_LIST.indexOf(dayStem);
  var oi = TIAN_GAN_LIST.indexOf(otherStem);
  if(di<0||oi<0) return '';
  var dElem = STEM_ELEM[dayStem];
  var oElem = STEM_ELEM[otherStem];
  var samePol = (di%2) === (oi%2);
  var wxOrder = ['木','火','土','金','水'];
  var dWi = wxOrder.indexOf(dElem);
  var oWi = wxOrder.indexOf(oElem);
  var rel = (oWi - dWi + 5) % 5;
  // rel: 0=同 1=我生 2=我克 3=克我 4=生我
  if(rel===0) return samePol ? '比肩' : '劫财';
  if(rel===1) return samePol ? '食神' : '伤官';
  if(rel===2) return samePol ? '偏财' : '正财';
  if(rel===3) return samePol ? '七杀' : '正官';
  if(rel===4) return samePol ? '偏印' : '正印';
  return '';
}
function getTenGodFromBranch(dayStem, branch){
  var mainH = BRANCH_MAIN_HIDDEN[branch];
  return mainH ? getTenGod(dayStem, mainH) : '';
}

/* ── 流年十神描述（中文） ── */
var LIUNIAN_DESC_ZH = {
  '比肩':'比劫帮身，社交活跃人脉拓展，但开支增大、竞争加剧，合作机会与利益纷争并存',
  '劫财':'劫财夺财，钱财进出频繁，投资需极度谨慎，防小人争利，感情有第三方干扰之象',
  '食神':'食神泄秀，才华展现期，创作灵感充沛，口福佳学业有利，心态轻松但防过于安逸',
  '伤官':'伤官透出，锋芒毕露之年，才华与叛逆并存，容易口舌是非，女命注意感情波动',
  '偏财':'偏财入命，商机与意外之财并现，投资有机遇但波动大，男命桃花旺异性缘增多',
  '正财':'正财稳健，正当收入增加，理财有方，感情稳定期，适合置业购产，脚踏实地得回报',
  '七杀':'七杀攻身，压力与挑战之年，外部环境变动大，有贵人提携也有小人暗算，需刚柔并济',
  '正官':'正官当头，事业正轨期，升迁考核有利，责任加重但名声提升，女命正缘出现之年',
  '偏印':'偏印主事，思想深沉转变期，适合学习进修、研究玄学，但易感孤独，精神层面变化大',
  '正印':'正印生身，贵人扶持之年，学业考试有利，购房置产吉，心态平和但需主动出击避免错过机会'
};
var LIUNIAN_DESC_EN = {
  '比肩':'Peer energy year - networking active, competition increases',
  '劫财':'Wealth rivalry - financial fluctuations, guard against disputes',
  '食神':'Creative expression - talents shine, good for learning and enjoyment',
  '伤官':'Bold expression - talent with friction, watch for conflicts',
  '偏财':'Windfall opportunities - investment chances but volatile',
  '正财':'Steady income - stable finances, good for property',
  '七杀':'Challenge year - pressure and transformation, stay resilient',
  '正官':'Career advancement - promotions likely, responsibility grows',
  '偏印':'Introspection - deep thinking, spiritual growth',
  '正印':'Mentor support - education favored, noble help arrives'
};

/* ── 大运十神描述（中文） ── */
var DAYUN_DESC_ZH = {
  '比肩':'比劫大运，自主意识增强，人脉拓展期。竞争压力加大但也带来合作机遇。财务方面需注意节制，防同辈竞争分财',
  '劫财':'劫财大运，社交圈活跃，赚钱欲望强但花销也大。投资需保守，防合伙纠纷。感情上有竞争者出现之象',
  '食神':'食神大运，才华展现的黄金期。学业、创作、艺术方面有突破。心态轻松，享受生活。但防过于安逸丧失进取心',
  '伤官':'伤官大运，个性张扬锋芒毕露。适合创新创业、艺术表达。但口舌是非增多，需注意人际关系和言辞。女命注意感情变动',
  '偏财':'偏财大运，财运活跃期。商业机会增多，投资有收获但波动大。人脉广阔，异性缘旺。适合把握商机但防贪心冒进',
  '正财':'正财大运，稳定发展期。正当收入稳步增长，适合置业储蓄。感情趋于稳定，家庭和睦。脚踏实地最有利',
  '七杀':'七杀大运，压力与突破并存。外部环境变化剧烈，挑战多但成长也快。有贵人暗中帮助，需要魄力与智慧并用',
  '正官':'正官大运，事业上升期。升职加薪机会增多，社会地位提升。责任加重但名望也随之而来。适合走正规路线发展',
  '偏印':'偏印大运，精神世界丰富期。适合学习新技能、研究深层知识。但容易感到孤独，需注意心理健康。有特殊才能被发掘',
  '正印':'正印大运，贵人运最旺的时期。学业考证有利，事业得上级提携。身体健康改善，心态平和。适合进修深造、买房置产'
};

function yearToGanZhi(year){
  var si = (year - 4) % 10;
  var bi = (year - 4) % 12;
  return { stem: TIAN_GAN_LIST[si], branch: DI_ZHI_LIST[bi] };
}

/* ── 流年评分（基于喜用忌神） ── */
function rateFlowYear(gz, dayWx, useElems, avoidElems){
  var score = 3;
  var stemE = STEM_ELEM[gz.stem] || '';
  var branchE = BRANCH_ELEM[gz.branch] || '';

  if(useElems.indexOf(stemE) >= 0) score += 0.8;
  if(useElems.indexOf(branchE) >= 0) score += 0.7;
  if(avoidElems.indexOf(stemE) >= 0) score -= 0.8;
  if(avoidElems.indexOf(branchE) >= 0) score -= 0.7;

  score = Math.max(1, Math.min(5, Math.round(score)));
  return score;
}

/* ── 动态填充流年表（2026-2033） ── */
function fillFlowYears(data, dateStr, gender){
  var chart = data.chart;
  var analysis = data.analysis;
  var dayun = data.dayun;
  var isZh = document.documentElement.lang === 'zh';
  var dayStem = chart.pillars.day.stem;
  var dayWx = GAN_WX[dayStem];

  // 提取喜用忌神 — 用身强弱推导（与section 04一致）
  var dayWxElem = dayWx;
  var wxGenFY = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
  var wxCtrlFY = {'木':'土','火':'金','土':'水','金':'木','水':'火'};
  var wxGenByFY = {'火':'木','土':'火','金':'土','水':'金','木':'水'};
  var wxCtrlByFY = {'土':'木','金':'火','水':'土','木':'金','火':'水'};
  var dm = chart.day_master_strength || '';

  var useElems = [], avoidElems = [];
  if(dm.indexOf('旺') >= 0 || dm.indexOf('强') >= 0){
    useElems = [wxGenFY[dayWxElem], wxCtrlFY[dayWxElem], wxCtrlByFY[dayWxElem]];
    avoidElems = [wxGenByFY[dayWxElem], dayWxElem];
  } else if(dm.indexOf('弱') >= 0){
    useElems = [wxGenByFY[dayWxElem], dayWxElem];
    avoidElems = [wxGenFY[dayWxElem], wxCtrlFY[dayWxElem], wxCtrlByFY[dayWxElem]];
  } else {
    // 中性默认偏向扶助
    useElems = [wxGenByFY[dayWxElem], dayWxElem];
    avoidElems = [wxGenFY[dayWxElem], wxCtrlFY[dayWxElem]];
  }

  // 如果API返回了流年数据，优先使用
  var liunianData = null;
  if(analysis && analysis.liunian) liunianData = analysis.liunian;
  if(analysis && analysis.flow_years) liunianData = analysis.flow_years;

  // 查找付费墙内的流年表
  var paywallTables = document.querySelectorAll('#paywallGate .r-tbl');
  if(paywallTables.length > 0){
    var yearTable = paywallTables[0];
    var headHtml = '<div class="r-tbl-head r-tbl-3"><div>' + (isZh?'年份':'Year') + '</div><div>' + (isZh?'干支':'Stems') + '</div><div>' + (isZh?'运势概要':'Summary') + '</div></div>';
    var rowsHtml = '';

    for(var y=2026;y<=2033;y++){
      var gz = yearToGanZhi(y);
      var score = rateFlowYear(gz, dayWx, useElems, avoidElems);
      var stars = '';
      for(var s=0;s<5;s++) stars += s<score ? '★' : '☆';
      var isCur = y === new Date().getFullYear();

      var stemWxClass = WX_CLASS[STEM_ELEM[gz.stem]] || 'tu';
      var branchWxClass = WX_CLASS[BRANCH_ELEM[gz.branch]] || 'tu';

      // 生成十神关系描述
      var stemE = STEM_ELEM[gz.stem];
      var branchE = BRANCH_ELEM[gz.branch];
      var stemGod = getTenGod(dayStem, gz.stem);
      var branchGod = getTenGodFromBranch(dayStem, gz.branch);

      var note = '';
      if(isZh){
        note = stemGod + '年，' + gz.stem + stemE + '透干';
        // 天干十神解读
        var stemDesc = LIUNIAN_DESC_ZH[stemGod] || '';
        if(stemDesc) note += '，' + stemDesc;
        // 地支十神
        if(branchGod && branchGod !== stemGod){
          var brDesc = LIUNIAN_DESC_ZH[branchGod] || '';
          if(brDesc) note += '。地支' + gz.branch + branchE + '（' + branchGod + '）' + brDesc;
        }
      } else {
        note = stemGod + ' year. ' + (LIUNIAN_DESC_EN[stemGod] || '');
      }

      // 如果API有详细流年数据，使用它
      if(liunianData && liunianData[y]){
        var ld = liunianData[y];
        if(ld.note) note = ld.note;
        if(ld.score) { score = ld.score; stars = ''; for(var s2=0;s2<5;s2++) stars += s2<score ? '★' : '☆'; }
      }

      rowsHtml += '<div class="r-tbl-row r-tbl-3' + (isCur?' now':'') + '"><div class="r-a-year">' + y + '</div><div class="r-a-gz"><span class="e-' + stemWxClass + '">' + gz.stem + '</span><span class="e-' + branchWxClass + '">' + gz.branch + '</span></div><div class="r-a-body"><div class="r-a-stars">' + stars + '</div><div class="r-a-note">' + note + '</div></div></div>';
    }

    yearTable.innerHTML = headHtml + rowsHtml;
  }

  // 也更新流月表（如果API有数据）
  var liuyueData = null;
  if(analysis && analysis.liuyue) liuyueData = analysis.liuyue;
  if(analysis && analysis.flow_months) liuyueData = analysis.flow_months;

  if(liuyueData && paywallTables.length > 1){
    var monthTable = paywallTables[1];
    var mHeadHtml = '<div class="r-tbl-head r-tbl-3"><div>' + (isZh?'月份':'Month') + '</div><div>' + (isZh?'干支':'Stems') + '</div><div>' + (isZh?'运势概要':'Summary') + '</div></div>';
    var mRowsHtml = '';
    for(var m=1;m<=12;m++){
      var md = liuyueData[m] || liuyueData[String(m)];
      if(md){
        var mStarStr = '';
        for(var ms=0;ms<5;ms++) mStarStr += ms<(md.score||3) ? '★' : '☆';
        var mStemWx = WX_CLASS[STEM_ELEM[md.stem]] || 'tu';
        var mBranchWx = WX_CLASS[BRANCH_ELEM[md.branch]] || 'tu';
        mRowsHtml += '<div class="r-tbl-row r-tbl-3"><div class="r-a-year">' + m + (isZh?'月':'') + '</div><div class="r-a-gz"><span class="e-' + mStemWx + '">' + md.stem + '</span><span class="e-' + mBranchWx + '">' + md.branch + '</span></div><div class="r-a-body"><div class="r-a-stars">' + mStarStr + '</div><div class="r-a-note">' + (md.note||'') + '</div></div></div>';
      }
    }
    if(mRowsHtml) monthTable.innerHTML = mHeadHtml + mRowsHtml;
  }
}

/* ── 动态填充预警 ── */
function fillWarnings(data){
  var analysis = data.analysis;
  if(!analysis) return;

  var warnings = analysis.warnings || analysis.special_warnings;
  if(!warnings) return;

  var isZh = document.documentElement.lang === 'zh';
  var warnContainer = null;
  var allSecs = document.querySelectorAll('#paywallGate .r-sec, #p-report .r-sec');
  for(var i=0;i<allSecs.length;i++){
    var h = allSecs[i].querySelector('.r-h');
    if(h && (h.textContent.includes('预警') || h.textContent.includes('Alert'))){
      warnContainer = allSecs[i];
      break;
    }
  }
  if(!warnContainer) return;

  var existingWarns = warnContainer.querySelectorAll('.r-warn');
  if(typeof warnings === 'object'){
    var warnHtml = '';
    for(var key in warnings){
      var wList = warnings[key];
      if(Array.isArray(wList)){
        wList.forEach(function(w){
          var level = (w.indexOf('极') >= 0 || w.indexOf('severe') >= 0) ? 'w-red' : 'w-gold';
          warnHtml += '<div class="r-warn ' + level + '"><div class="r-warn-title">' + key + '</div><div class="r-warn-body">' + w + '</div></div>';
        });
      } else if(typeof wList === 'string' && wList.trim()){
        warnHtml += '<div class="r-warn w-gold"><div class="r-warn-title">' + key + '</div><div class="r-warn-body">' + wList + '</div></div>';
      }
    }
    if(warnHtml){
      // 替换现有预警
      existingWarns.forEach(function(w){ w.remove(); });
      var hrEl = warnContainer.querySelector('.r-hr');
      if(hrEl) hrEl.insertAdjacentHTML('beforebegin', warnHtml);
    }
  }
}

/* ── Claude API Translation ── */
async function translateReport(analysis, chart){
  var sections = {};
  if(analysis.personality) sections.personality = analysis.personality;
  if(analysis.career) sections.career = analysis.career;
  if(analysis.wealth) sections.wealth = analysis.wealth;
  if(analysis.health) sections.health = analysis.health;
  if(analysis.relationship) sections.relationship = analysis.relationship;

  if(Object.keys(sections).length === 0) return;

  var dayStem = chart.pillars.day.stem;
  var dayWx = GAN_WX[dayStem] || '';

  // Show translating indicator
  var indicator = document.createElement('div');
  indicator.id = 'translateIndicator';
  indicator.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(26,24,20,.9);color:#fff;padding:10px 24px;border-radius:100px;font-size:12px;z-index:9999;letter-spacing:.04em';
  indicator.textContent = 'Translating report...';
  document.body.appendChild(indicator);

  try {
    var res = await fetch('/api/translate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        sections: sections,
        context: {
          day_master: dayStem + dayWx,
          strength: chart.day_master_strength || '',
          use_gods: (analysis.use_god_summary || '').substring(0, 100),
          avoid_gods: ''
        }
      })
    });

    if(!res.ok) throw new Error('Translation API error');
    var data = await res.json();
    var t = data.translated;

    // Fill translated text into report
    if(t.personality) fillAnalysisSection('Traits', t.personality);
    if(t.personality) fillAnalysisSection('性格', t.personality);
    if(t.career) fillAnalysisSection('Career', t.career);
    if(t.career) fillAnalysisSection('事业', t.career);
    if(t.wealth) fillAnalysisSection('Wealth', t.wealth);
    if(t.wealth) fillAnalysisSection('财运', t.wealth);
    if(t.health) fillAnalysisSection('Health', t.health);
    if(t.health) fillAnalysisSection('健康', t.health);
    if(t.relationship) fillAnalysisSection('Relationship', t.relationship);
    if(t.relationship) fillAnalysisSection('感情', t.relationship);
    if(t.relationship) fillAnalysisSection('Marriage', t.relationship);
  } catch(e){
    console.error('Translation failed:', e);
  }

  // Remove indicator
  var ind = document.getElementById('translateIndicator');
  if(ind) ind.remove();
}

function fillAnalysisSection(keyword, text){
  if(!text) return;
  var allSecs = document.querySelectorAll('#p-report .r-sec');
  for(var i=0;i<allSecs.length;i++){
    var h = allSecs[i].querySelector('.r-h');
    if(h && h.textContent.includes(keyword)){
      var pTags = allSecs[i].querySelectorAll('p');
      var lines = text.split(/[。\n]+/).filter(function(x){return x.trim()});
      for(var p=0;p<pTags.length && p<lines.length;p++){
        pTags[p].innerHTML = lines[p] + '。';
      }
      break;
    }
  }
}

/* ── 覆盖按钮 + 初始化日期选择 ── */
document.addEventListener('DOMContentLoaded', function(){
  var btn = document.querySelector('.f-btn');
  if(btn) btn.setAttribute('onclick','kesSubmit()');

  // 初始化年份下拉 (1940-2025)
  var yearEl = document.getElementById('birthYear');
  if(yearEl){
    for(var y=2025;y>=1940;y--){
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearEl.appendChild(opt);
    }
    yearEl.value = '1993';
  }

  // 初始化日期下拉 (1-31)
  var dayEl = document.getElementById('birthDay');
  if(dayEl){
    for(var d=1;d<=31;d++){
      var opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      dayEl.appendChild(opt);
    }
    dayEl.value = '30';
  }

  // 月份默认选6月
  var monthEl = document.getElementById('birthMonth');
  if(monthEl) monthEl.value = '6';
});
