/* kes-share.js — Shareable reading-result image
 * Runs after kes-report.js.
 * 1. Injects a hidden 1080×1080 "share card" DOM into the body on load.
 * 2. Injects a "下载分享图 / Share my chart" button into the report header.
 * 3. On click: populates the card from current report data, uses html2canvas
 *    to snapshot it to a PNG, and triggers a download.
 *
 * Users post the PNG to WeChat / 小红书 / Instagram / Twitter / etc.
 * Each share carries the keyofelements.com watermark — organic reach.
 */

(function(){
  // Day Master descriptor phrases (must match the 10 knowledge articles)
  var DM_PHRASE = {
    '甲':{zh:'参天之木 · 栋梁之材',en:'Towering Tree'},
    '乙':{zh:'花果藤秀 · 柔而有用',en:'Flowering Vine'},
    '丙':{zh:'太阳之光 · 普照万物',en:"The Sun's Light"},
    '丁':{zh:'灯烛之明 · 柔中有刚',en:'Lantern Flame'},
    '戊':{zh:'高山厚重 · 承载万物',en:'The Mountain'},
    '己':{zh:'田园沃壤 · 中正蓄藏',en:'Cultivated Earth'},
    '庚':{zh:'斧钺之刚 · 百炼成器',en:'Axe and Blade'},
    '辛':{zh:'珠玉之秀 · 温润而清',en:'Jewel and Pearl'},
    '壬':{zh:'江河奔涌 · 周流不滞',en:'Great River'},
    '癸':{zh:'雨露之润 · 至柔至通',en:'Morning Dew'}
  };

  var EL_COLOR = {mu:'#528a62',huo:'#a84848',tu:'#7a6248',jin:'#a08828',shui:'#8696a7'};
  var EL_BG    = {mu:'#e8f0ea',huo:'#f5e5e5',tu:'#efe8df',jin:'#f3ecd4',shui:'#e8ecef'};

  // Inject html2canvas from CDN (once).
  function loadHtml2Canvas(cb){
    if (window.html2canvas) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  // Inject the hidden share-card DOM. Positioned far off-screen so it's
  // rendered but invisible; html2canvas will snapshot it on demand.
  function injectCard(){
    if (document.getElementById('share-card')) return;
    var card = document.createElement('div');
    card.id = 'share-card';
    card.style.cssText = [
      'position:fixed','top:0','left:-9999px','width:1080px','height:1080px',
      'background:#f4f2ee','box-sizing:border-box','padding:56px 56px',
      'font-family:"Noto Serif SC","Songti SC",serif','color:#1a1814','overflow:hidden'
    ].join(';');
    document.body.appendChild(card);
  }

  // Populate card with report data; returns the card node ready for capture.
  function populateCard(d){
    var card = document.getElementById('share-card');
    var p = d.pillars;
    var ds = p.day.stem;
    var wx = d.meta.day_master_wx;
    var wxZh = ({'Wood':'木','Fire':'火','Earth':'土','Metal':'金','Water':'水'}[wx]||wx);
    var cKey = ({'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'})[wxZh] || 'tu';
    var col = EL_COLOR[cKey];
    var bg  = EL_BG[cKey];
    var phrase = DM_PHRASE[ds] || {zh:'',en:''};
    var isZh = document.documentElement.lang === 'zh';

    // Element distribution (木火土金水)
    var wuxing = d.wuxing || {};
    var order = ['木','火','土','金','水'];
    var total = order.reduce(function(s,k){return s+(wuxing[k]||0)},0) || 1;

    // Mini four-pillars block
    var pillarHtml = ['year','month','day','hour'].map(function(pos,i){
      var pL = ['年','月','日','时'][i];
      var pLe = ['YEAR','MONTH','DAY','HOUR'][i];
      var st = p[pos].stem, br = p[pos].branch;
      var stWx = ({'甲':'mu','乙':'mu','丙':'huo','丁':'huo','戊':'tu','己':'tu','庚':'jin','辛':'jin','壬':'shui','癸':'shui'})[st]||'tu';
      var brWx = ({'子':'shui','丑':'tu','寅':'mu','卯':'mu','辰':'tu','巳':'huo','午':'huo','未':'tu','申':'jin','酉':'jin','戌':'tu','亥':'shui'})[br]||'tu';
      var isDay = pos==='day';
      return '<div style="flex:1;text-align:center;padding:14px 6px;background:#fff;border-radius:12px;box-sizing:border-box;'+(isDay?'border:2px solid '+col+';':'border:1px solid #dedad4;')+'">'
        + '<div style="font-size:12px;letter-spacing:.2em;color:#98958f;line-height:16px;margin-bottom:10px">'+(isZh?pL:pLe)+'</div>'
        + '<div style="font-size:44px;font-weight:400;color:'+EL_COLOR[stWx]+';line-height:48px;margin-bottom:4px;font-family:\'Noto Serif SC\',\'Songti SC\',serif">'+st+'</div>'
        + '<div style="font-size:38px;font-weight:300;color:'+EL_COLOR[brWx]+';line-height:42px;font-family:\'Noto Serif SC\',\'Songti SC\',serif">'+br+'</div>'
        + '</div>';
    }).join('');

    // Five elements mini bars
    var wxBarHtml = order.map(function(k){
      var v = wuxing[k]||0, pct = Math.round(v/total*100);
      var wxC = ({'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'})[k];
      return '<div style="flex:1;text-align:center">'
        + '<div style="font-size:24px;font-weight:400;color:'+EL_COLOR[wxC]+';line-height:28px;margin-bottom:6px;font-family:\'Noto Serif SC\',\'Songti SC\',serif">'+k+'</div>'
        + '<div style="width:100%;height:5px;background:#dedad4;border-radius:3px;overflow:hidden;margin-bottom:6px"><div style="width:'+pct+'%;height:100%;background:'+EL_COLOR[wxC]+'"></div></div>'
        + '<div style="font-size:15px;color:'+EL_COLOR[wxC]+';line-height:18px;font-weight:500">'+pct+'%</div>'
        + '</div>';
    }).join('');

    // All sections use fixed heights / explicit spacing so total fits 1080 with
     // 56 top + 56 bottom padding → 968px content budget.
    // Budget: brand 48 + 28 + hero 380 + 28 + pillars 148 + 28 + wx 130 + 28 + foot 28 = 966.
    card.innerHTML = [
      // top accent bar
      '<div style="position:absolute;top:0;left:0;right:0;height:8px;background:'+col+'"></div>',

      // brand row (~48px)
      '<div style="display:flex;justify-content:space-between;align-items:center;height:48px;margin-bottom:28px">',
        '<div style="font-family:Inter,Helvetica,sans-serif;font-size:22px;letter-spacing:.45em;color:#1a1814;font-weight:500">K E S</div>',
        '<div style="font-size:16px;color:#98958f;letter-spacing:.15em">命 元 之 钥</div>',
      '</div>',

      // hero: day master (~380px block: 28 eyebrow + 280 circle + 20 gap + 28 title + 24 phrase)
      '<div style="text-align:center;margin-bottom:28px">',
        '<div style="font-size:16px;letter-spacing:.35em;color:#98958f;line-height:28px;margin-bottom:16px">'+(isZh?'你 的 日 主':'YOUR DAY MASTER')+'</div>',
        '<div style="background:'+bg+';border-radius:50%;width:280px;height:280px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;text-align:center">',
          '<div style="font-size:200px;font-weight:400;color:'+col+';line-height:280px;font-family:\'Noto Serif SC\',\'Songti SC\',serif">'+ds+'</div>',
        '</div>',
        '<div style="font-size:28px;font-weight:700;color:#1a1814;letter-spacing:.08em;line-height:32px;margin-bottom:10px">'+ds+wxZh+(isZh?'日主':' Day Master')+'</div>',
        '<div style="font-size:20px;color:'+col+';letter-spacing:.1em;line-height:24px;font-weight:400">'+(isZh?phrase.zh:phrase.en)+'</div>',
      '</div>',

      // four pillars (~148px: 16 label + 100 stem/branch + 32 padding)
      '<div style="display:flex;gap:12px;margin-bottom:28px;height:148px">'+pillarHtml+'</div>',

      // five elements (~130px: 28 padding + 36 label-area + 66 bars)
      '<div style="background:#fff;border:1px solid #dedad4;border-radius:14px;padding:20px 24px;margin-bottom:28px;height:130px;box-sizing:border-box">',
        '<div style="font-size:13px;letter-spacing:.2em;color:#98958f;margin-bottom:14px;text-align:center;line-height:16px">'+(isZh?'五 行 分 布':'FIVE ELEMENTS')+'</div>',
        '<div style="display:flex;gap:12px">'+wxBarHtml+'</div>',
      '</div>',

      // footer watermark (~28px)
      '<div style="display:flex;justify-content:space-between;align-items:center;height:28px;font-size:14px;color:#98958f;letter-spacing:.1em;line-height:28px">',
        '<span>'+(isZh?'免费八字排盘':'FREE BAZI READING')+'</span>',
        '<span style="font-weight:500;color:#1a1814">keyofelements.com</span>',
      '</div>'
    ].join('');

    return card;
  }

  // Main export: called when user clicks the share button
  function downloadShareImage(){
    if (!window._lastReportData) {
      alert(document.documentElement.lang==='zh' ? '请先排盘' : 'Please generate a reading first.');
      return;
    }
    var btn = document.getElementById('btn-share-img');
    if (btn) { btn.disabled = true; btn.textContent = document.documentElement.lang==='zh' ? '生成中…' : 'Generating…'; }

    loadHtml2Canvas(function(){
      var card = populateCard(window._lastReportData);
      // Wait for fonts to actually finish loading before snapshot —
      // html2canvas renders what's painted, so uncached Noto Serif SC
      // would otherwise fall back to browser default and the day-master
      // character would render at the wrong size/weight.
      var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      fontsReady.then(function(){
        // Extra delay for layout settle + sub-pixel reflow
        return new Promise(function(r){ setTimeout(r, 400); });
      }).then(function(){
        return html2canvas(card, {scale:1, width:1080, height:1080, backgroundColor:'#f4f2ee', useCORS:true, logging:false});
      }).then(function(canvas){
        canvas.toBlob(function(blob){
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          var ds = window._lastReportData.pillars.day.stem;
          a.download = 'kes-'+ds+'-daymaster-'+Date.now()+'.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function(){URL.revokeObjectURL(a.href)}, 500);
          if (btn) { btn.disabled = false; btn.textContent = document.documentElement.lang==='zh' ? '下载分享图' : 'Download Share Image'; }
        }, 'image/png');
      }).catch(function(err){
        console.error('share image error', err);
        alert('Error: ' + err.message);
        if (btn) { btn.disabled = false; btn.textContent = document.documentElement.lang==='zh' ? '下载分享图' : 'Download Share Image'; }
      });
    });
  }

  // Inject the "Share" button into the report header (appears after the first render).
  function injectShareButton(){
    if (document.getElementById('btn-share-img')) return;
    var hdr = document.querySelector('.rpt-hdr');
    if (!hdr) return;
    var isZh = document.documentElement.lang === 'zh';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:center;margin-top:24px';
    wrap.innerHTML =
      '<button id="btn-share-img" type="button" style="background:#1a1814;color:#fff;border:none;border-radius:100px;padding:12px 30px;font-size:12px;font-weight:500;letter-spacing:.15em;cursor:pointer;font-family:inherit">'
      + (isZh ? '下载分享图 →' : 'Download Share Image →')
      + '</button>'
      + '<div style="font-size:11px;color:#98958f;margin-top:10px;letter-spacing:.05em">'
      + (isZh ? '发朋友圈 · 小红书 · Instagram' : 'For WeChat · Xiaohongshu · Instagram')
      + '</div>';
    hdr.appendChild(wrap);
    document.getElementById('btn-share-img').addEventListener('click', downloadShareImage);
  }

  // Hook into renderReport: stash data on window for our button handler + inject button.
  function wrapRender(){
    if (typeof window.renderReport !== 'function') return false;
    var orig = window.renderReport;
    window.renderReport = function(d){
      window._lastReportData = d;
      var r = orig.apply(this, arguments);
      setTimeout(injectShareButton, 100);
      return r;
    };
    return true;
  }

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    injectCard();
    // renderReport may be defined after us; try a few times.
    var tries = 0;
    var t = setInterval(function(){
      if (wrapRender() || ++tries > 30) clearInterval(t);
    }, 200);
  });
})();
