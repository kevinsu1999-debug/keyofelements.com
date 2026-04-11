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
  var dateVal = document.querySelector('.form-wrap input[type="date"]').value;
  var timeSelect = document.querySelector('.form-wrap select');
  var cityVal = document.getElementById('cityInput').value;
  var genderF = document.getElementById('gF').classList.contains('on');
  var gender = genderF ? 'F' : 'M';

  if(!dateVal){ alert(isZh ? '请选择出生日期' : 'Please select your birth date'); return; }
  if(!timeSelect || !timeSelect.value){ alert(isZh ? '请选择出生时辰' : 'Please select your birth hour'); return; }
  if(!cityVal || cityVal.trim().length < 2){ alert(isZh ? '请输入出生城市' : 'Please enter your birth city'); return; }

  var parts = dateVal.split('-');
  var year = parseInt(parts[0]);
  var month = parseInt(parts[1]);
  var day = parseInt(parts[2]);

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
  var lon = coords ? coords[0] : 116.4;
  var lat = coords ? coords[1] : 39.9;
  var tz = CITY_TZ[cityVal] || Math.round(lon / 15);

  /* 显示加载状态 */
  var btn = document.querySelector('.f-btn');
  var origText = btn.textContent;
  btn.textContent = isZh ? '正在排盘计算中…' : 'Calculating...';
  btn.disabled = true;
  btn.style.opacity = '0.6';

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
    if(typeof lockReport==='function') lockReport();
    fillReport(data, dateVal, shichen, gender);
    goPage('report');
    btn.textContent = origText;
    btn.disabled = false;
    btn.style.opacity = '1';
  })
  .catch(function(err){
    alert('计算出错：' + err.message + '\n请稍后重试');
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

  var dayStem = pillars.day.stem;
  var dayWx = GAN_WX[dayStem];
  var dayWxClass = WX_CLASS[dayWx];

  /* 日期格式化 */
  var dp = dateStr.split('-');
  var dateDisplay = dp[0]+'年'+parseInt(dp[1])+'月'+parseInt(dp[2])+'日 '+shichen+'时';

  /* ── 报告头部 ── */
  var hdr = document.querySelector('.rpt-info-card');
  if(hdr){
    var genderText = gender==='F' ? '女命' : '男命';
    hdr.innerHTML =
      '<div class="rpt-f"><div class="rpt-f-l">性　别</div><div class="rpt-f-v"><b>'+genderText+'</b></div></div>'+
      '<div class="rpt-f"><div class="rpt-f-l">出生日期</div><div class="rpt-f-v">'+dateDisplay+'<span class="rpt-f-note">真太阳时校正</span></div></div>'+
      '<div class="rpt-f"><div class="rpt-f-l">日　主</div><div class="rpt-f-v"><b class="e-'+dayWxClass+'">'+dayStem+dayWx+'</b></div></div>';
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
  var strengthMap = {'极弱':0,'身弱':0,'偏弱':1,'中和':2,'偏强':3,'身强':4};
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
    var lbls = ['极弱','偏弱','中和','偏强','身强'];
    mLabels.innerHTML = lbls.map(function(l,i){return '<span'+(i===sIdx?' class="on"':'')+'>'+l+'</span>'}).join('');
  }
  var verdict = document.querySelector('.r-str-verdict');
  if(verdict) verdict.textContent = strength;

  /* ── 04 喜用忌神 ── */
  var yjGrid = document.querySelector('.r-yj-grid');
  if(yjGrid){
    var wxNames = ['木','火','土','金','水'];
    var useElems = [], avoidElems = [];

    /* 方法1: 从 raw.pattern.use_gods 提取 */
    if(analysis && analysis.raw && analysis.raw.pattern && analysis.raw.pattern.use_gods){
      var ug = analysis.raw.pattern.use_gods;
      var ugStr = ug['用神'] || ug['喜神'] || ug['use_god'] || '';
      var avStr = ug['忌神'] || ug['avoid_god'] || '';
      for(var w=0;w<wxNames.length;w++){
        if(ugStr.indexOf(wxNames[w]) >= 0) useElems.push(wxNames[w]);
        if(avStr.indexOf(wxNames[w]) >= 0) avoidElems.push(wxNames[w]);
      }
    }

    /* 方法2: 从 use_god_summary 文本提取 */
    if(useElems.length === 0 && analysis && analysis.use_god_summary){
      var sumText = analysis.use_god_summary;
      var useMatch = sumText.match(/用神[：:]\s*([^\n忌]+)/);
      var avoidMatch = sumText.match(/忌神[：:]\s*([^\n]*)/);
      if(useMatch){
        for(var w=0;w<wxNames.length;w++){
          if(useMatch[1].indexOf(wxNames[w]) >= 0) useElems.push(wxNames[w]);
        }
      }
      if(avoidMatch){
        for(var w=0;w<wxNames.length;w++){
          if(avoidMatch[1].indexOf(wxNames[w]) >= 0) avoidElems.push(wxNames[w]);
        }
      }
    }

    /* 方法3: 从 chart.use_god 提取 */
    if(useElems.length === 0 && chart.use_god){
      var ugObj = chart.use_god;
      var ugList = ugObj['喜'] || ugObj['use'] || ugObj['favorable'] || [];
      var avList = ugObj['忌'] || ugObj['avoid'] || ugObj['unfavorable'] || [];
      if(typeof ugList === 'string') ugList = ugList.split(/[,，、\s]+/);
      if(typeof avList === 'string') avList = avList.split(/[,，、\s]+/);
      for(var w=0;w<wxNames.length;w++){
        for(var u=0;u<ugList.length;u++){
          if(ugList[u].indexOf(wxNames[w]) >= 0) useElems.push(wxNames[w]);
        }
        for(var a=0;a<avList.length;a++){
          if(avList[a].indexOf(wxNames[w]) >= 0) avoidElems.push(wxNames[w]);
        }
      }
    }

    /* 方法4: 根据身强弱自动推导 */
    if(useElems.length === 0){
      var dm = chart.day_master_strength || '';
      var dayWxElem = dayWx;
      var wxCycle = {木:'火',火:'土',土:'金',金:'水',水:'木'};
      var wxCtrl = {木:'土',火:'金',土:'水',金:'木',水:'火'};
      var genBy = {};
      for(var k in wxCycle) genBy[wxCycle[k]] = k; // 什么生我

      if(dm.indexOf('强') >= 0 || dm === '身强'){
        // 身强：泄耗克为喜
        useElems = [wxCycle[dayWxElem], wxCtrl[dayWxElem]];
        avoidElems = [genBy[dayWxElem], dayWxElem];
      } else if(dm.indexOf('弱') >= 0 || dm === '身弱'){
        // 身弱：生扶为喜
        useElems = [genBy[dayWxElem], dayWxElem];
        avoidElems = [wxCycle[dayWxElem], wxCtrl[dayWxElem]];
      }
    }

    // 去重
    useElems = useElems.filter(function(v,i,a){return a.indexOf(v)===i});
    avoidElems = avoidElems.filter(function(v,i,a){return a.indexOf(v)===i});

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
      for(var d=0;d<Math.min(dayun.periods.length,8);d++){
        var dp = dayun.periods[d];
        var startAge = Math.round(dp.start_age);
        var endAge = d+1<dayun.periods.length ? Math.round(dayun.periods[d+1].start_age) : startAge+10;
        /* 判断是否是当前大运 */
        var dpStartYear = parseInt(dateStr.split('-')[0]) + startAge;
        var dpEndYear = parseInt(dateStr.split('-')[0]) + endAge;
        var isCur = (curYear >= dpStartYear && curYear < dpEndYear);

        dyHtml += '<div class="r-dy-item'+(isCur?' cur':'')+'">'+
          (isCur ? '<div class="r-dy-label">当前</div>' : '')+
          '<div class="r-dy-gz">'+dp.stem+dp.branch+'</div>'+
          '<div class="r-dy-age">'+startAge+'至'+endAge+'岁</div></div>';
      }
      dyScroll.innerHTML = dyHtml;
    }
  }

  /* ── 06,07,08 用 analysis 文本填充 ── */
  fillAnalysisSection('事业', analysis ? analysis.career : '');
  fillAnalysisSection('财运', analysis ? analysis.wealth : '');
  fillAnalysisSection('健康', analysis ? analysis.health : '');
  fillAnalysisSection('感情', analysis ? analysis.relationship : '');

  // English page: also fill with English keywords, then translate
  fillAnalysisSection('Career', analysis ? analysis.career : '');
  fillAnalysisSection('Wealth', analysis ? analysis.wealth : '');
  fillAnalysisSection('Health', analysis ? analysis.health : '');
  fillAnalysisSection('Relationship', analysis ? analysis.relationship : '');

  /* ── Auto-translate for English page ── */
  if(document.documentElement.lang === 'en' && analysis){
    translateReport(analysis, chart);
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

/* ── 覆盖按钮 ── */
document.addEventListener('DOMContentLoaded', function(){
  var btn = document.querySelector('.f-btn');
  if(btn) btn.setAttribute('onclick','kesSubmit()');
});
