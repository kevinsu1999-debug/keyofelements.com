/* kes-admin.js — Admin console logic
 * Auth: custom JWT via /api/admin/login, stored in sessionStorage.
 */

var TOKEN_KEY = 'kes_admin_token';
var EXPIRY_KEY = 'kes_admin_expires';
var _tick = null;
var _currentTab = 'stats';
var _editingProduct = null; // null = create, object = edit
var _stagedImages = []; // [{publicUrl, path, file?}]
var _stagedSizes = [];  // [{size:'XS', qty:10}, ...]
var _userSearchTimer = null;

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function(){
  // Login form
  var lgBtn = document.getElementById('lgBtn');
  lgBtn.addEventListener('click', doLogin);
  document.getElementById('lgPass').addEventListener('keydown', function(e){
    if(e.key === 'Enter') doLogin();
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', function(){ switchTab(t.dataset.tab); });
  });

  // Boot
  if(hasValidToken()){
    enterDash();
  }
});

/* ── Auth ── */
function hasValidToken(){
  var t = sessionStorage.getItem(TOKEN_KEY);
  var e = parseInt(sessionStorage.getItem(EXPIRY_KEY) || '0');
  return t && e && Date.now() < e;
}

async function doLogin(){
  var u = document.getElementById('lgUser').value.trim();
  var p = document.getElementById('lgPass').value;
  var btn = document.getElementById('lgBtn');
  var err = document.getElementById('lgErr');
  err.textContent = '';
  if(!u || !p){ err.textContent = 'Username and password required'; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  try{
    var res = await fetch('/api/admin/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:u, password:p})
    });
    var data = await res.json();
    if(!res.ok){
      err.textContent = data.error || ('Error '+res.status);
      btn.disabled = false; btn.textContent = 'Sign In';
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(EXPIRY_KEY, String(data.expiresAt));
    enterDash();
  }catch(e){
    err.textContent = 'Network error';
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

function enterDash(){
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashView').classList.add('on');
  updateTokenDisplay();
  if(_tick) clearInterval(_tick);
  _tick = setInterval(updateTokenDisplay, 30*1000);
  loadPanel(_currentTab);
}

function updateTokenDisplay(){
  var exp = parseInt(sessionStorage.getItem(EXPIRY_KEY) || '0');
  if(!exp){ return; }
  var mins = Math.max(0, Math.round((exp - Date.now())/60000));
  if(mins <= 0){ adminLogout(true); return; }
  var el = document.getElementById('tokenExp');
  if(el){
    var h = Math.floor(mins/60), m = mins%60;
    el.textContent = 'session: '+(h?h+'h ':'')+m+'m';
  }
}

function adminLogout(expired){
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
  if(_tick){ clearInterval(_tick); _tick = null; }
  document.getElementById('dashView').classList.remove('on');
  document.getElementById('loginView').style.display = '';
  document.getElementById('lgPass').value = '';
  document.getElementById('lgBtn').disabled = false;
  document.getElementById('lgBtn').textContent = 'Sign In';
  if(expired) toast('Session expired. Please sign in again.', 'err');
}

async function api(path, opts){
  opts = opts || {};
  opts.headers = opts.headers || {};
  opts.headers['Authorization'] = 'Bearer '+sessionStorage.getItem(TOKEN_KEY);
  if(opts.body && typeof opts.body !== 'string'){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(path, opts);
  if(res.status === 401){
    adminLogout(true);
    throw new Error('Unauthorized');
  }
  var data;
  try{ data = await res.json(); }catch(e){ data = {}; }
  if(!res.ok){
    throw new Error(data.error || ('Error '+res.status));
  }
  return data;
}

/* ── Tabs ── */
function switchTab(tab){
  _currentTab = tab;
  document.querySelectorAll('.tab').forEach(function(t){
    t.classList.toggle('on', t.dataset.tab === tab);
  });
  document.querySelectorAll('.panel').forEach(function(p){
    p.classList.toggle('on', p.id === 'panel-'+tab);
  });
  loadPanel(tab);
}

function loadPanel(tab){
  if(tab === 'stats') loadStats();
  else if(tab === 'products') loadProducts();
  else if(tab === 'pages') loadPageImages();
  else if(tab === 'text') loadSiteText();
  else if(tab === 'users') loadUsers();
  else if(tab === 'orders') loadOrders();
}

/* ── Page Images: interactive page mockups ──
 * Each page is rendered as a small 1:1-proportioned wireframe. Image-backed
 * regions (banners + the editorial grid) are clickable "hotspots" — click
 * any region to upload/replace that image. The hotspot itself shows the
 * current image thumbnail as background, or a dashed "+ upload" state when
 * empty. Hover reveals a "Replace" overlay.
 */
function loadPageImages(){
  var host = document.getElementById('pageImgGrid');
  if(!host) return;
  var sbBase = (window.KES_CONFIG && KES_CONFIG.SUPABASE_URL) ? KES_CONFIG.SUPABASE_URL.replace(/\/$/,'') : '';
  var pubBase = sbBase + '/storage/v1/object/public/page-images/';
  var v = '?v=' + Math.floor(Date.now()/60000);

  // Reusable hotspot — click to open file picker, bg = current image.
  function hotspot(slot, filename, labelHtml, extraClass){
    var url = pubBase + filename + v;
    var slotAttr = typeof slot === 'number' ? slot : "'"+slot+"'";
    var safeId = String(slot).replace(/[^a-z0-9_]/gi,'_');
    var cls = 'pg-hot' + (extraClass ? ' ' + extraClass : '');
    return '<div class="'+cls+'" data-slot="'+safeId+'" onclick="document.getElementById(\'pgfile-'+safeId+'\').click()">' +
      '<img class="pg-hot-img" id="pgimg-'+safeId+'" src="'+url+'" alt="" ' +
        'onload="this.parentElement.setAttribute(\'data-loaded\',\'1\')" ' +
        'onerror="this.style.display=\'none\'">' +
      '<div class="pg-hot-label">'+labelHtml+'</div>' +
      '<div class="pg-hot-overlay"><span>Click to upload</span></div>' +
      '<input type="file" id="pgfile-'+safeId+'" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadPageImage('+slotAttr+', this)">' +
    '</div>';
  }

  var css = '<style>' +
    '.pg-mock-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:1100px}' +
    '@media(max-width:840px){.pg-mock-grid{grid-template-columns:1fr}}' +
    '.pg-mock{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;display:flex;flex-direction:column;gap:14px}' +
    '.pg-mock-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}' +
    '.pg-mock-head h3{font-family:"Cormorant Garamond",serif;font-size:20px;font-weight:400;color:var(--t1)}' +
    '.pg-mock-head .pg-mock-url{font-size:10px;color:var(--t4);font-family:monospace;letter-spacing:.02em}' +
    '.pg-frame{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px;font-family:inherit}' +
    '.pg-nav{display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:var(--card);border:1px solid var(--line);border-radius:4px;font-size:9px;color:var(--t3);letter-spacing:.2em;height:18px}' +
    '.pg-filler{background:repeating-linear-gradient(45deg,var(--bg2),var(--bg2) 5px,var(--bg3) 5px,var(--bg3) 10px);border:1px dashed var(--line2);border-radius:4px;font-size:9px;color:var(--t4);text-align:center;padding:8px 4px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}' +
    '.pg-hot{position:relative;background:var(--card);border:1px dashed var(--line2);border-radius:4px;cursor:pointer;overflow:hidden;transition:border-color .15s;display:flex;align-items:center;justify-content:center;min-height:40px}' +
    '.pg-hot:hover{border-color:var(--t1);border-style:solid}' +
    '.pg-hot[data-loaded] {border-style:solid;border-color:var(--line)}' +
    '.pg-hot-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .2s}' +
    '.pg-hot[data-loaded] .pg-hot-img{opacity:1}' +
    '.pg-hot[data-loaded] .pg-hot-label{color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.7)}' +
    '.pg-hot-label{position:relative;z-index:2;font-size:10px;letter-spacing:.1em;color:var(--t3);text-align:center;pointer-events:none;padding:4px;text-transform:uppercase}' +
    '.pg-hot-overlay{position:absolute;inset:0;background:rgba(26,24,20,.72);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;z-index:3}' +
    '.pg-hot-overlay span{color:#fff;font-size:11px;letter-spacing:.1em;padding:6px 14px;border:1px solid rgba(255,255,255,.4);border-radius:100px;text-transform:uppercase}' +
    '.pg-hot:hover .pg-hot-overlay{opacity:1}' +
    '.pg-banner-hot{aspect-ratio:16/5}' +
    '.pg-phi-split{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px;background:var(--card);border:1px solid var(--line);border-radius:4px}' +
    '.pg-phi-text{display:flex;flex-direction:column;gap:4px;padding:8px 4px;justify-content:center}' +
    '.pg-phi-kicker{height:4px;width:40%;background:var(--a);opacity:.5;border-radius:2px;margin-bottom:4px}' +
    '.pg-phi-title{height:10px;width:90%;background:var(--t2);border-radius:2px}' +
    '.pg-phi-body{height:4px;width:70%;background:var(--bg3);border-radius:2px;margin-top:4px}' +
    '.pg-phi-btn{font-size:8px;padding:4px 10px;background:var(--t1);color:#fff;border-radius:100px;width:fit-content;margin-top:4px;letter-spacing:.1em}' +
    '.pg-phi-img-hot{aspect-ratio:6/5}' +
    '.pg-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:8px;background:var(--card);border:1px solid var(--line);border-radius:4px}' +
    '.pg-edit-grid .pg-hot{aspect-ratio:4/5;min-height:0}' +
    '.pg-edit-split{display:grid;grid-template-columns:1fr 2fr;gap:8px}' +
    '.pg-edit-text{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:14px 10px;display:flex;flex-direction:column;justify-content:center;gap:4px}' +
    '.pg-edit-text-line{height:4px;border-radius:2px;background:var(--bg3)}' +
    '.pg-edit-text-line:nth-child(1){width:70%}' +
    '.pg-edit-text-line:nth-child(2){width:95%;height:10px;background:var(--t4);margin:6px 0}' +
    '.pg-edit-text-line:nth-child(3){width:85%;height:10px;background:var(--t4);margin-bottom:4px}' +
    '.pg-edit-text-line:nth-child(4){width:50%}' +
    '.pg-edit-text-line:nth-child(5){width:40%;margin-top:8px;background:var(--t2)}' +
    '.pg-small-mock .pg-banner-hot{aspect-ratio:16/6}' +
    '.pg-small-mock .pg-filler{min-height:60px;display:flex;align-items:center;justify-content:center}' +
    '.pg-help{font-size:11px;color:var(--t3);line-height:1.7;margin-bottom:16px;padding:14px 16px;background:var(--bg2);border-radius:8px;border-left:3px solid var(--a)}' +
  '</style>';

  var homepage = '<div class="pg-mock">' +
    '<div class="pg-mock-head"><h3>Homepage</h3><div class="pg-mock-url">keyofelements.com/</div></div>' +
    '<div class="pg-frame">' +
      '<div class="pg-nav">KES · · ·</div>' +
      // Homepage top banner (optional, visible only when uploaded)
      hotspot('banner_home','banner_home.jpg','Top banner · wide','pg-banner-hot') +
      // Philosophy hero split: left = text block, right = lifestyle image
      '<div class="pg-phi-split">' +
        '<div class="pg-phi-text">' +
          '<div class="pg-phi-kicker"></div>' +
          '<div class="pg-phi-title"></div>' +
          '<div class="pg-phi-title"></div>' +
          '<div class="pg-phi-body"></div>' +
          '<div class="pg-phi-btn">CTA</div>' +
        '</div>' +
        hotspot('home_hero','home_hero.jpg','Philosophy hero · 720×600','pg-phi-img-hot') +
      '</div>' +
      // Reading form area filler
      '<div class="pg-filler">Reading form (fixed)</div>' +
      // Editorial section: text block + 2x2 grid
      '<div class="pg-edit-split">' +
        '<div class="pg-edit-text"><div class="pg-edit-text-line"></div><div class="pg-edit-text-line"></div><div class="pg-edit-text-line"></div><div class="pg-edit-text-line"></div><div class="pg-edit-text-line"></div></div>' +
        '<div class="pg-edit-grid">' +
          hotspot(1,'home_1.jpg','1 · 水') +
          hotspot(2,'home_2.jpg','2 · 金') +
          hotspot(3,'home_3.jpg','3 · 木') +
          hotspot(4,'home_4.jpg','4 · 火') +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  function smallPageMock(title, slug, bannerSlot, bannerFile){
    return '<div class="pg-mock pg-small-mock">' +
      '<div class="pg-mock-head"><h3>'+title+'</h3><div class="pg-mock-url">keyofelements.com/'+slug+'</div></div>' +
      '<div class="pg-frame">' +
        '<div class="pg-nav">KES · · ·</div>' +
        hotspot(bannerSlot, bannerFile, 'Top banner · wide','pg-banner-hot') +
        '<div class="pg-filler">Content · fixed</div>' +
      '</div>' +
    '</div>';
  }

  host.innerHTML = css +
    '<div class="pg-help">Click any image region in the page mockups below to upload / replace that image. ' +
      'The image you upload appears live on the corresponding section within a minute. ' +
      'Aspect ratios are enforced: editorial = 4:5 portrait, banners = 16:5 wide.</div>' +
    '<div class="pg-mock-grid">' +
      homepage +
      '<div style="display:flex;flex-direction:column;gap:20px">' +
        smallPageMock('Shop',  'cn?page=shop',  'banner_shop',  'banner_shop.jpg') +
        smallPageMock('Learn', 'cn?page=learn', 'banner_learn', 'banner_learn.jpg') +
        smallPageMock('About', 'cn?page=about', 'banner_about', 'banner_about.jpg') +
      '</div>' +
    '</div>';
}

/* ── Editable site text registry ──
 * `defaultZh/defaultEn` is the hardcoded value shipped in index.html / en.html.
 * It pre-fills the editor so admin can tweak rather than retype from scratch.
 * Saving an empty value = no override (page falls back to HTML default).
 */
var SITE_TEXT_KEYS = [
  // Homepage editorial
  { key:'home.editorial.eyebrow', page:'home', area:'editorial', label:'Eyebrow',
    defaultZh:'本　季　系　列', defaultEn:'This Season', lines:1 },
  { key:'home.editorial.title', page:'home', area:'editorial', label:'Main title',
    defaultZh:'选择与你\n同频的\n生活方式',
    defaultEn:'Live with\nwhat\nresonates', lines:4 },
  { key:'home.editorial.sub', page:'home', area:'editorial', label:'Subtitle',
    defaultZh:'以色养命　以衣载元',
    defaultEn:'Spring · 2026 Edition', lines:1 },
  { key:'home.editorial.cta', page:'home', area:'editorial', label:'CTA button text',
    defaultZh:'查看全部商品',
    defaultEn:'Shop the collection', lines:1 },
  // Homepage philosophy rotation (5 element quotes)
  { key:'home.philosophy.q1', page:'home', area:'philosophy', label:'Quote · Water 水',
    defaultZh:'天下莫柔弱于水，而攻坚强者莫之能胜。',
    defaultEn:'Nothing is softer than water, yet nothing overcomes the hard and strong better.', lines:3 },
  { key:'home.philosophy.q2', page:'home', area:'philosophy', label:'Quote · Metal 金',
    defaultZh:'义者，宜也。当为则为，无所计较。',
    defaultEn:'Righteousness is to do what is right — without calculation.', lines:3 },
  { key:'home.philosophy.q3', page:'home', area:'philosophy', label:'Quote · Wood 木',
    defaultZh:'仁者，爱人。推己及人，兼济天下。',
    defaultEn:'Benevolence is to love others — extend yourself to serve the world.', lines:3 },
  { key:'home.philosophy.q4', page:'home', area:'philosophy', label:'Quote · Fire 火',
    defaultZh:'礼者，理也。进退有度，方圆有节。',
    defaultEn:'Propriety is order — measure in retreat and advance, rhythm in principle.', lines:3 },
  { key:'home.philosophy.q5', page:'home', area:'philosophy', label:'Quote · Earth 土',
    defaultZh:'信者，诚也。表里如一，言出必践。',
    defaultEn:'Faithfulness is sincerity — inside matches outside; words bind to deeds.', lines:3 },
  // Shop hero
  { key:'shop.title', page:'shop', area:'hero', label:'Shop title',
    defaultZh:'穿上与你\n命格同频的颜色。',
    defaultEn:'Live with\nWhat Resonates.', lines:2 },
  { key:'shop.sub', page:'shop', area:'hero', label:'Shop subtitle',
    defaultZh:'以色养命，以衣载元。每件 KES 单品都标注了五行属性，精准对应你的命格。',
    defaultEn:'Every piece carries an elemental signature. Once you know yours, the right one finds you.', lines:3 },
  // Learn page
  { key:'learn.title', page:'learn', area:'hero', label:'Learn title',
    defaultZh:'古老的东方哲学体系',
    defaultEn:'Ancient Eastern Philosophy', lines:2 },
  { key:'learn.body', page:'learn', area:'hero', label:'Learn intro',
    defaultZh:'两千余年来，东方哲学以阴阳五行描述万物运行的规律。读懂这套语言，是解读自己命盘的第一步。',
    defaultEn:'For over 2,000 years, Eastern philosophy has described the movement of all things through Yin-Yang and the Five Elements. Understanding this language is the first step to reading your own chart.', lines:5 },
  // About page
  { key:'about.title', page:'about', area:'hero', label:'About title',
    defaultZh:'关于 KES',
    defaultEn:'About KES', lines:2 },
  { key:'about.body', page:'about', area:'hero', label:'About body',
    defaultZh:'',
    defaultEn:'', lines:6 },
];

async function loadSiteText(){
  var host = document.getElementById('siteTextHost');
  if(!host) return;
  host.className = 'loader'; host.innerHTML = 'Loading…';
  try{
    var d = await api('/api/admin/site-text');
    var byKey = {};
    (d.texts || []).forEach(function(t){ byKey[t.key] = t; });

    // Merge stored values onto the defaults registry (for pre-fill + preview)
    var entries = SITE_TEXT_KEYS.map(function(k){
      var row = byKey[k.key] || {};
      return {
        key: k.key, page: k.page, area: k.area, label: k.label, lines: k.lines,
        defaultZh: k.defaultZh || '', defaultEn: k.defaultEn || '',
        customZh: row.zh != null && row.zh !== '' ? row.zh : null,
        customEn: row.en != null && row.en !== '' ? row.en : null,
        hasCustom: !!(row.zh || row.en),
      };
    });

    var byPage = { home: [], shop: [], learn: [], about: [] };
    entries.forEach(function(e){ (byPage[e.page] || []).push(e); });

    var css =
      '<style>' +
      '.st-help{font-size:11px;color:var(--t3);line-height:1.7;margin-bottom:20px;padding:14px 16px;background:var(--bg2);border-radius:8px;border-left:3px solid var(--a)}' +
      '.st-pages{display:flex;flex-direction:column;gap:22px;max-width:1200px}' +
      '.st-page{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}' +
      '.st-page-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:18px 24px;border-bottom:1px solid var(--line);background:var(--bg2)}' +
      '.st-page-head h3{font-family:"Cormorant Garamond",serif;font-size:20px;font-weight:400;color:var(--t1)}' +
      '.st-page-head .st-page-url{font-size:10px;color:var(--t4);font-family:monospace}' +
      '.st-page-body{display:grid;grid-template-columns:320px 1fr;gap:0}' +
      '@media(max-width:820px){.st-page-body{grid-template-columns:1fr}}' +
      '.st-mock{padding:20px;background:var(--bg);border-right:1px solid var(--line);position:sticky;top:0;align-self:start}' +
      '@media(max-width:820px){.st-mock{border-right:none;border-bottom:1px solid var(--line);position:relative}}' +
      '.st-mock-frame{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}' +
      '.st-mock-nav{font-size:9px;letter-spacing:.3em;color:var(--t4);text-align:center;padding:6px;border:1px dashed var(--line);border-radius:4px}' +
      '.st-t{padding:6px 8px;cursor:pointer;border-radius:4px;transition:background .15s;border:1px solid transparent}' +
      '.st-t:hover{background:var(--bg2);border-color:var(--line)}' +
      '.st-t.focus{background:rgba(134,150,167,.1);border-color:var(--a)}' +
      '.st-t-ey{font-size:9px;letter-spacing:.32em;color:var(--a);text-transform:uppercase}' +
      '.st-t-title{font-family:"Cormorant Garamond",serif;font-size:22px;line-height:1.15;color:var(--t1);font-weight:400;white-space:pre-line}' +
      '.st-t-sub{font-size:10px;letter-spacing:.2em;color:var(--t3);text-transform:uppercase}' +
      '.st-t-cta{font-size:10px;letter-spacing:.14em;color:var(--t1);text-transform:uppercase;border-bottom:1px solid var(--t1);width:fit-content;padding-bottom:2px}' +
      '.st-t-body{font-size:11px;line-height:1.65;color:var(--t2);white-space:pre-line}' +
      '.st-t-quote{font-style:italic;font-size:11px;color:var(--t2);line-height:1.55;padding:6px 10px;border-left:2px solid var(--line2)}' +
      '.st-t-empty{font-style:italic;color:var(--t4)}' +
      '.st-divider{height:1px;background:var(--bg3);margin:6px 0}' +
      '.st-editors{padding:20px 24px}' +
      '.st-entry{padding:14px 0;border-bottom:1px solid var(--bg3)}' +
      '.st-entry:last-child{border-bottom:none}' +
      '.st-entry.focus .st-entry-head{color:var(--a-d)}' +
      '.st-entry-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px;cursor:pointer}' +
      '.st-entry-label{font-size:12px;font-weight:500;color:var(--t1)}' +
      '.st-entry-key{font-size:10px;font-family:monospace;color:var(--t4)}' +
      '.st-entry-pills{display:flex;gap:6px;align-items:center}' +
      '.st-pill{font-size:9px;padding:2px 8px;border-radius:100px;letter-spacing:.08em;text-transform:uppercase}' +
      '.st-pill-custom{background:rgba(82,138,98,.12);color:var(--mu);border:1px solid rgba(82,138,98,.25)}' +
      '.st-pill-default{background:var(--bg3);color:var(--t3);border:1px solid var(--line)}' +
      '.st-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '@media(max-width:640px){.st-fields{grid-template-columns:1fr}}' +
      '.st-field label{font-size:10px;letter-spacing:.12em;color:var(--t3);display:block;margin-bottom:4px}' +
      '.st-field input,.st-field textarea{background:var(--bg2);border:1px solid var(--line);border-radius:6px;padding:9px 11px;font-size:13px;font-family:inherit;width:100%;resize:vertical;line-height:1.55;color:var(--t1);outline:none;transition:border-color .15s}' +
      '.st-field input:focus,.st-field textarea:focus{border-color:var(--a)}' +
      '.st-row-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px;align-items:center}' +
      '.st-msg{font-size:11px;color:var(--t3);flex:1}' +
      '.st-msg.ok{color:var(--mu)}' +
      '.st-msg.err{color:var(--huo)}' +
      '.st-reset{color:var(--huo) !important;border-color:rgba(168,72,72,.3) !important}' +
      '</style>';

    // Per-page mockup rendering ————————————————————————————————————————
    function mockText(e, type){
      // display the current live value (custom or default) in ZH for the preview
      // (admin typically speaks ZH; EN previews would double the real estate)
      var val = e.customZh != null ? e.customZh : e.defaultZh;
      var html = val ? escapeHtml(val) : '<span class="st-t-empty">(empty)</span>';
      return '<div class="st-t st-t-'+type+'" id="preview-'+escapeAttr(e.key)+'" onclick="focusSiteTextEntry(\''+escapeAttr(e.key)+'\')">' +
        html + '</div>';
    }

    function homeMock(){
      var get = function(k){ return entries.find(function(e){return e.key===k;}); };
      return '<div class="st-mock-frame">' +
        '<div class="st-mock-nav">KES · · ·</div>' +
        // Philosophy rotator preview (stacks a small quote sample)
        '<div style="padding:6px 8px;border:1px solid var(--line);border-radius:4px;background:var(--bg2)">' +
          '<div style="font-size:9px;color:var(--t4);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Rotating quotes →</div>' +
          ['home.philosophy.q1','home.philosophy.q2','home.philosophy.q3','home.philosophy.q4','home.philosophy.q5'].map(function(k){
            var e = get(k); if(!e) return '';
            var val = e.customZh != null ? e.customZh : e.defaultZh;
            var short = val ? (val.length > 26 ? val.slice(0,26)+'…' : val) : '(empty)';
            return '<div class="st-t st-t-quote" onclick="focusSiteTextEntry(\''+e.key+'\')" style="margin:4px 0">'+escapeHtml(short)+'</div>';
          }).join('') +
        '</div>' +
        '<div class="st-divider"></div>' +
        // Editorial block
        mockText(get('home.editorial.eyebrow'), 'ey') +
        mockText(get('home.editorial.title'),   'title') +
        mockText(get('home.editorial.sub'),     'sub') +
        mockText(get('home.editorial.cta'),     'cta') +
      '</div>';
    }

    function heroMock(e_title, e_sub, e_body){
      return '<div class="st-mock-frame">' +
        '<div class="st-mock-nav">KES · · ·</div>' +
        (e_title ? mockText(e_title, 'title') : '') +
        (e_sub   ? mockText(e_sub,   'sub')   : '') +
        (e_body  ? mockText(e_body,  'body')  : '') +
      '</div>';
    }

    function entryBlock(e){
      var zhVal = e.customZh != null ? e.customZh : e.defaultZh;
      var enVal = e.customEn != null ? e.customEn : e.defaultEn;
      var customBadge = e.hasCustom
        ? '<span class="st-pill st-pill-custom">custom</span>'
        : '<span class="st-pill st-pill-default">default</span>';
      var lines = e.lines || 1;
      var fieldZh = lines <= 1
        ? '<input id="st-'+escapeAttr(e.key)+'-zh" value="'+escapeAttr(zhVal)+'" oninput="syncSiteTextPreview(\''+escapeAttr(e.key)+'\')">'
        : '<textarea id="st-'+escapeAttr(e.key)+'-zh" rows="'+lines+'" oninput="syncSiteTextPreview(\''+escapeAttr(e.key)+'\')">'+escapeHtml(zhVal)+'</textarea>';
      var fieldEn = lines <= 1
        ? '<input id="st-'+escapeAttr(e.key)+'-en" value="'+escapeAttr(enVal)+'">'
        : '<textarea id="st-'+escapeAttr(e.key)+'-en" rows="'+lines+'">'+escapeHtml(enVal)+'</textarea>';
      return '<div class="st-entry" id="entry-'+escapeAttr(e.key)+'">' +
        '<div class="st-entry-head" onclick="focusSiteTextEntry(\''+escapeAttr(e.key)+'\')">' +
          '<div><div class="st-entry-label">'+escapeHtml(e.label)+'</div>' +
            '<div class="st-entry-key">'+e.key+'</div></div>' +
          '<div class="st-entry-pills">'+customBadge+'</div>' +
        '</div>' +
        '<div class="st-fields">' +
          '<div class="st-field"><label>中文 (ZH)</label>'+fieldZh+'</div>' +
          '<div class="st-field"><label>English (EN)</label>'+fieldEn+'</div>' +
        '</div>' +
        '<div class="st-row-actions">' +
          '<span id="stmsg-'+escapeAttr(e.key)+'" class="st-msg"></span>' +
          (e.hasCustom ? '<button class="btn-sec st-reset" onclick="resetSiteText(\''+escapeAttr(e.key)+'\')">Reset</button>' : '') +
          '<button class="btn-sec" onclick="saveSiteText(\''+escapeAttr(e.key)+'\')">Save</button>' +
        '</div>' +
      '</div>';
    }

    function pageCard(title, url, mockupHtml, pageKey){
      return '<div class="st-page">' +
        '<div class="st-page-head"><h3>'+title+'</h3><div class="st-page-url">'+url+'</div></div>' +
        '<div class="st-page-body">' +
          '<div class="st-mock">'+mockupHtml+'</div>' +
          '<div class="st-editors">' +
            byPage[pageKey].map(entryBlock).join('') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    var getE = function(k){ return entries.find(function(e){return e.key===k;}); };

    host.className = '';
    host.innerHTML = css +
      '<div class="st-help">Click any text in the mockup on the left to jump to its editor on the right. ' +
        'Each field is pre-filled with the current live value (custom or hardcoded default). ' +
        'Type to edit, then hit Save. Saving an empty value reverts to the default.</div>' +
      '<div class="st-pages">' +
        pageCard('Homepage',  'keyofelements.com/',        homeMock(), 'home') +
        pageCard('Shop page', 'keyofelements.com/?page=shop',
                 heroMock(getE('shop.title'), getE('shop.sub')), 'shop') +
        pageCard('Learn page','keyofelements.com/?page=learn',
                 heroMock(getE('learn.title'), null, getE('learn.body')), 'learn') +
        pageCard('About page','keyofelements.com/?page=about',
                 heroMock(getE('about.title'), null, getE('about.body')), 'about') +
      '</div>';

  }catch(e){
    host.innerHTML = '<div class="empty">Failed: '+escapeHtml(e.message)+'</div>';
  }
}

function focusSiteTextEntry(key){
  document.querySelectorAll('.st-entry.focus').forEach(function(el){ el.classList.remove('focus'); });
  document.querySelectorAll('.st-t.focus').forEach(function(el){ el.classList.remove('focus'); });
  var entry = document.getElementById('entry-'+key);
  var preview = document.getElementById('preview-'+key);
  if(entry){
    entry.classList.add('focus');
    entry.scrollIntoView({behavior:'smooth', block:'center'});
    var first = entry.querySelector('input, textarea');
    if(first) first.focus();
  }
  if(preview) preview.classList.add('focus');
}

function syncSiteTextPreview(key){
  // Update the left-side preview live as admin types (ZH only — matches preview)
  var preview = document.getElementById('preview-'+key);
  if(!preview) return;
  var field = document.getElementById('st-'+key+'-zh');
  if(!field) return;
  var val = field.value;
  preview.innerHTML = val ? escapeHtml(val) : '<span class="st-t-empty">(empty)</span>';
}

async function saveSiteText(key){
  var zh = document.getElementById('st-'+key+'-zh').value;
  var en = document.getElementById('st-'+key+'-en').value;
  var msg = document.getElementById('stmsg-'+key);
  try{
    await api('/api/admin/site-text', {method:'PUT', body:{key, zh, en}});
    if(msg){ msg.textContent = 'Saved · refresh any page to see it live'; msg.className = 'st-msg ok'; setTimeout(function(){ if(msg){ msg.textContent = ''; msg.className = 'st-msg'; } }, 3000); }
    // Reload after a beat so "default → custom" pill flips correctly
    setTimeout(loadSiteText, 1200);
  }catch(e){
    if(msg){ msg.textContent = 'Error: '+e.message; msg.className = 'st-msg err'; }
  }
}

async function resetSiteText(key){
  if(!confirm('Revert "'+key+'" to the hardcoded page default? (clears both ZH and EN)')) return;
  try{
    await api('/api/admin/site-text?key='+encodeURIComponent(key), {method:'DELETE'});
    toast('Reverted');
    loadSiteText();
  }catch(e){
    toast('Failed: '+e.message, 'err');
  }
}

async function uploadPageImage(slot, input){
  var f = input.files && input.files[0];
  if(!f) return;
  if(f.size > 5*1024*1024){ toast('Too large (max 5 MB)', 'err'); input.value=''; return; }
  var btn = input.nextElementSibling;
  if(btn){ btn.disabled = true; btn.textContent = 'Uploading…'; }
  try{
    var sig = await api('/api/admin/page-image', {method:'POST', body:{slot:slot, contentType:f.type}});
    var up = await fetch(sig.uploadUrl, {
      method: 'PUT',
      headers: {'Content-Type': f.type, 'x-upsert': 'true'},
      body: f
    });
    if(!up.ok) throw new Error('Upload HTTP '+up.status);
    toast('Slot '+slot+' updated');
    // Re-render after a beat so the bust query string includes the new write
    setTimeout(loadPageImages, 600);
  }catch(e){
    toast('Upload failed: '+e.message, 'err');
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = 'Upload / Replace'; }
    input.value = '';
  }
}

/* ── Stats ── */
async function loadStats(){
  var host = document.getElementById('statsHost');
  host.className = 'loader';
  host.innerHTML = 'Loading stats…';
  try{
    var d = await api('/api/admin/stats');
    var fmtMoney = function(amt, cur){
      var n = (amt||0)/100;
      var sym = {usd:'$', cny:'¥', eur:'€', gbp:'£', hkd:'HK$', sgd:'S$'}[cur] || (cur||'').toUpperCase()+' ';
      return sym + n.toFixed(2);
    };
    var cards = [
      {k:'Total Users', v:d.total_users, s:''},
      {k:'Paid Users', v:d.paid_users, s:d.paid_rate+'% conversion'},
      {k:'Marketing Opt-In', v:d.marketing_opt_in, s:''},
      {k:'Readings · Today', v:d.readings_today, s:''},
      {k:'Readings · 7d', v:d.readings_7d, s:'All-time: '+d.readings_all},
      {k:'Revenue · 30d', v:fmtMoney(d.revenue_30d, d.revenue_currency), s:''},
    ];
    host.className = '';
    host.innerHTML = '<div class="stats-grid">' +
      cards.map(function(c){
        return '<div class="stat-card">' +
          '<div class="stat-label">'+c.k+'</div>' +
          '<div class="stat-val">'+c.v+'</div>' +
          '<div class="stat-sub">'+c.s+'</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<div style="font-size:11px;color:var(--t3);text-align:right">updated '+new Date(d.generated_at).toLocaleTimeString()+'</div>';
  }catch(e){
    host.innerHTML = '<div class="empty">Failed to load stats: '+e.message+'</div>';
  }
}

/* ── Products ── */
// Element is multi-select (checkbox group) — a single product can carry
// multiple materials/colors. Stored as a comma-separated string in metadata.
var ELEMENTS = [['水','Water / 水'],['木','Wood / 木'],['火','Fire / 火'],['土','Earth / 土'],['金','Metal / 金'],['阴','Yin / 阴'],['阳','Yang / 阳']];
var CATEGORIES = [['','(none)'],['clothing','Clothing / 服饰'],['accessory','Accessory / 配饰'],['life','Life / 生活'],['service','Service / 服务'],['other','Other']];
var GENDERS = [['','Neutral'],['male','Male / 男'],['female','Female / 女'],['unisex','Unisex']];
// Map element display char → CSS class used on chips and PDP element badge.
var ELEM_CLASS_MAP = {'水':'shui','木':'mu','火':'huo','土':'tu','金':'jin','阴':'yin','阳':'yang'};

async function loadProducts(){
  var host = document.getElementById('prodHost');
  host.className = 'loader'; host.innerHTML = 'Loading…';
  try{
    var d = await api('/api/admin/products');
    if(!d.products.length){
      host.innerHTML = '<div class="empty">No products yet. Click + New Product.</div>';
      return;
    }
    var cols = '60px 1fr 80px 100px 80px 100px';
    var head = '<div class="t-head" style="grid-template-columns:'+cols+'">' +
      '<div></div><div>Name</div><div>Element</div><div>Price</div><div>Status</div><div>Actions</div></div>';
    var rows = d.products.map(function(p){
      var thumb = p.images[0] ? '<img class="thumb" src="'+p.images[0]+'">' : '<div class="thumb"></div>';
      var name = (p.metadata.name_zh ? p.metadata.name_zh + ' / ' : '') + p.name;
      var elem = p.metadata.element || '—';
      var price = (p.price_amount/100).toFixed(2) + ' ' + (p.price_currency||'').toUpperCase();
      var hiddenFlag = (p.metadata && p.metadata.hidden === 'true');
      var status = (p.active ? '<span class="pill pill-active">Active</span>' : '<span class="pill pill-archived">Archived</span>') +
                   (hiddenFlag ? ' <span class="pill" style="background:rgba(134,150,167,.12);color:var(--a-d);border:1px solid rgba(134,150,167,.3);margin-left:4px">Hidden</span>' : '');
      return '<div class="t-row" style="grid-template-columns:'+cols+'" onclick="openProductModal(\''+p.id+'\')">' +
        '<div class="t-cell">'+thumb+'</div>' +
        '<div class="t-cell" style="flex-direction:column;align-items:flex-start;gap:2px;overflow:hidden">' +
          '<div style="font-weight:500;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%">'+escapeHtml(name)+'</div>' +
          '<div style="font-size:11px;color:var(--t3);text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%">'+escapeHtml(p.description||'')+'</div>' +
        '</div>' +
        '<div class="t-cell">'+elem+'</div>' +
        '<div class="t-cell">'+price+'</div>' +
        '<div class="t-cell">'+status+'</div>' +
        '<div class="t-cell" onclick="event.stopPropagation()">' +
          '<button class="btn-sec" onclick="toggleProductActive(\''+p.id+'\','+(!p.active)+')">'+(p.active?'Archive':'Restore')+'</button>' +
        '</div>' +
      '</div>';
    }).join('');
    host.className = '';
    host.innerHTML = head + rows;
    window.__PRODUCTS_CACHE = d.products;
  }catch(e){
    host.innerHTML = '<div class="empty">Failed: '+e.message+'</div>';
  }
}

async function toggleProductActive(id, active){
  try{
    await api('/api/admin/products', {method:'PATCH', body:{id, active}});
    toast(active ? 'Restored' : 'Archived');
    loadProducts();
  }catch(e){
    toast(e.message, 'err');
  }
}

function openProductModal(id){
  _editingProduct = null;
  _stagedImages = [];
  _stagedSizes = [];
  if(id){
    var p = (window.__PRODUCTS_CACHE || []).find(function(x){ return x.id === id; });
    if(p){
      _editingProduct = p;
      _stagedImages = (p.images || []).map(function(u){ return {publicUrl:u, path:''}; });
      _stagedSizes = parseSizesFromMetadata(p.metadata || {});
    }
  }
  if(!_stagedSizes.length){
    // Default starter rows for new product
    _stagedSizes = [{size:'XS',qty:0},{size:'S',qty:0},{size:'M',qty:0},{size:'L',qty:0},{size:'XL',qty:0}];
  }
  document.getElementById('modalTitle').textContent = _editingProduct ? 'Edit Product' : 'New Product';
  renderProductForm();
  document.getElementById('modalBg').classList.add('on');
}

function parseSizesFromMetadata(meta){
  // Priority: sizes_json (new format) > sizes (legacy comma string)
  if(meta.sizes_json){
    try{
      var arr = JSON.parse(meta.sizes_json);
      if(Array.isArray(arr)){
        return arr.map(function(x){ return {size: String(x.size||'').trim(), qty: parseInt(x.qty)||0}; }).filter(function(x){ return x.size; });
      }
    }catch(e){ /* fallthrough */ }
  }
  if(meta.sizes){
    // Legacy: "XS,S,M,L,XL" — no stock info, default 0
    return meta.sizes.split(',').map(function(s){ return {size: s.trim(), qty: 0}; }).filter(function(x){ return x.size; });
  }
  return [];
}
function closeProductModal(){
  document.getElementById('modalBg').classList.remove('on');
}

function renderProductForm(){
  var p = _editingProduct || {};
  var m = p.metadata || {};
  var priceMajor = p.price_amount ? (p.price_amount/100).toFixed(2) : '';
  var body = document.getElementById('modalBody');
  body.innerHTML =
    '<div class="form-grid2">' +
      formField('name','Name (EN)', '<input id="pfName" value="'+escapeAttr(p.name||'')+'">') +
      formField('name_zh','Name (ZH)', '<input id="pfNameZh" value="'+escapeAttr(m.name_zh||'')+'">') +
    '</div>' +
    formField('description','Description (EN)', '<textarea id="pfDesc" rows="3" placeholder="English description shown on /en site">'+escapeHtml(p.description||'')+'</textarea>') +
    formField('description_zh','Description (ZH) / 中文描述', '<textarea id="pfDescZh" rows="3" placeholder="中文描述，展示在中文站">'+escapeHtml(m.description_zh||'')+'</textarea>') +
    '<div class="form-grid2">' +
      formField('price','Price (major unit, e.g. 29.90)', '<input id="pfPrice" type="number" step="0.01" value="'+escapeAttr(priceMajor)+'">') +
      formField('currency','Currency', '<select id="pfCur">'+
        ['usd','cny','hkd','sgd','eur','gbp'].map(function(c){
          return '<option value="'+c+'"'+((p.price_currency||'usd')===c?' selected':'')+'>'+c.toUpperCase()+'</option>';
        }).join('')+'</select>') +
    '</div>' +
    (function(){
      // Element multi-select: parse existing comma list so pre-checked boxes match saved state
      var currentElems = String(m.element||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
      var boxes = ELEMENTS.map(function(e){
        var checked = currentElems.indexOf(e[0]) !== -1;
        var cls = ELEM_CLASS_MAP[e[0]] || '';
        return '<label class="pf-elem-box" data-class="'+cls+'">'+
          '<input type="checkbox" class="pfElem" value="'+e[0]+'"'+(checked?' checked':'')+'>'+
          '<span class="pf-elem-char '+cls+'">'+e[0]+'</span>'+
          '<span class="pf-elem-lbl">'+e[1]+'</span>'+
        '</label>';
      }).join('');
      return '<div class="form-row">' +
        '<label>Element / 五行 <span style="color:var(--t3);font-weight:400;text-transform:none;letter-spacing:0">(多选 / multi-select)</span></label>' +
        '<div class="pf-elem-grid">'+boxes+'</div>' +
      '</div>';
    })() +
    formField('category','Category / 分类', '<select id="pfCat">'+CATEGORIES.map(function(e){return '<option value="'+e[0]+'"'+(m.category===e[0]?' selected':'')+'>'+e[1]+'</option>';}).join('')+'</select>') +
    formField('gender','Gender', '<select id="pfGender">'+GENDERS.map(function(e){return '<option value="'+e[0]+'"'+(m.gender===e[0]?' selected':'')+'>'+e[1]+'</option>';}).join('')+'</select>') +
    '<div class="form-row">' +
      '<label>Sizes &amp; Stock</label>' +
      '<div style="font-size:10px;color:var(--t3);margin-bottom:8px">每行一个尺码；数量 = 当前可售库存。手动调整（每成一单回来 -1）。</div>' +
      '<div id="sizeRows"></div>' +
      '<button type="button" class="btn-sec" style="margin-top:6px" onclick="addSizeRow()">+ Add size</button>' +
    '</div>' +
    formField('sort','Sort order (lower shows first)', '<input id="pfSort" type="number" value="'+escapeAttr(m.sort_order||'99')+'">') +
    '<div class="form-row">' +
      '<label>Shop Visibility / Shop \u663e\u793a</label>' +
      '<div style="display:flex;gap:14px;align-items:center;padding:8px 0">' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t1);cursor:pointer;text-transform:none;letter-spacing:0">' +
          '<input type="checkbox" id="pfHidden" '+(m.hidden==='true'?'checked':'')+' style="width:16px;height:16px;accent-color:var(--t1);cursor:pointer">' +
          '<span>Not available in shop / \u4ece Shop \u4e0b\u67b6</span>' +
        '</label>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--t3);margin-top:-4px">\u9ed8\u8ba4\u4e0d\u52fe\u9009\uff08\u4ea7\u54c1\u5728 Shop \u4e2d\u53ef\u89c1\uff09\u3002\u52fe\u9009\u540e\u4ea7\u54c1\u4ece\u516c\u5f00 Shop \u4e0b\u67b6\uff08Stripe \u4ecd\u4fdd\u7559\u4ea7\u54c1\u4e0e\u652f\u4ed8\u94fe\u63a5\uff09\u3002\u9002\u5408\u4e34\u65f6\u4e0b\u67b6\u3001\u62a5\u544a\u89e3\u9501\u7b49\u670d\u52a1\u578b\u4ea7\u54c1\u3002</div>' +
    '</div>' +
    '<div class="form-row">' +
      '<label>Product Images</label>' +
      '<div class="img-drop" id="imgDrop">Drag images here or click to browse<br><span style="font-size:10px">PNG / JPG / WebP · max 5 MB each</span></div>' +
      '<input type="file" id="imgInput" accept="image/*" multiple style="display:none">' +
      '<div class="img-list" id="imgList"></div>' +
    '</div>' +
    (p.id ? '<div style="font-size:11px;color:var(--t3);margin-top:12px">Editing price creates a new Stripe Price and archives the old one. Existing orders keep their original price reference.</div>' : '');

  renderImgList();
  renderSizeRows();
  var drop = document.getElementById('imgDrop'), inp = document.getElementById('imgInput');
  drop.addEventListener('click', function(){ inp.click(); });
  inp.addEventListener('change', function(e){ handleFiles(e.target.files); });
  ['dragenter','dragover'].forEach(function(ev){
    drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(function(ev){
    drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove('dragover'); });
  });
  drop.addEventListener('drop', function(e){ handleFiles(e.dataTransfer.files); });
}

function renderSizeRows(){
  var host = document.getElementById('sizeRows');
  if(!host) return;
  if(!_stagedSizes.length){
    host.innerHTML = '<div style="font-size:11px;color:var(--t3);padding:8px 0">No sizes. Click "+ Add size" to add one.</div>';
    return;
  }
  host.innerHTML = _stagedSizes.map(function(s, i){
    return '<div style="display:grid;grid-template-columns:1fr 120px 40px;gap:8px;margin-bottom:6px;align-items:center">' +
      '<input type="text" placeholder="Size (e.g. XS / M / 38)" value="'+escapeAttr(s.size)+'" oninput="_updSize('+i+',\'size\',this.value)" style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:9px 11px;font-size:13px;font-family:inherit;outline:none">' +
      '<input type="number" min="0" placeholder="Stock" value="'+s.qty+'" oninput="_updSize('+i+',\'qty\',this.value)" style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:9px 11px;font-size:13px;font-family:inherit;outline:none">' +
      '<button type="button" onclick="removeSizeRow('+i+')" style="background:var(--card);border:1px solid var(--line2);border-radius:6px;padding:6px;cursor:pointer;color:var(--t3);font-size:14px">×</button>' +
    '</div>';
  }).join('');
}

function addSizeRow(){
  _stagedSizes.push({size:'', qty:0});
  renderSizeRows();
}
function removeSizeRow(i){
  _stagedSizes.splice(i, 1);
  renderSizeRows();
}
function _updSize(i, field, val){
  if(!_stagedSizes[i]) return;
  if(field === 'qty') _stagedSizes[i].qty = Math.max(0, parseInt(val)||0);
  else _stagedSizes[i].size = String(val).trim();
}

function formField(id, label, input){
  return '<div class="form-row"><label for="pf'+id+'">'+label+'</label>'+input+'</div>';
}

function renderImgList(){
  var host = document.getElementById('imgList');
  if(!host) return;
  host.innerHTML = _stagedImages.map(function(im, i){
    return '<div class="img-item"><img src="'+im.publicUrl+'"><button onclick="removeImg('+i+')">×</button></div>';
  }).join('');
}
function removeImg(i){ _stagedImages.splice(i,1); renderImgList(); }

async function handleFiles(files){
  for(var i=0;i<files.length;i++){
    var f = files[i];
    if(!f.type.startsWith('image/')){ toast('Not an image: '+f.name, 'err'); continue; }
    if(f.size > 5*1024*1024){ toast('Too large (>5MB): '+f.name, 'err'); continue; }
    try{
      toast('Uploading '+f.name+'…');
      var sig = await api('/api/admin/product-image', {method:'POST', body:{filename:f.name, contentType:f.type}});
      // Direct upload to Supabase signed URL
      var up = await fetch(sig.uploadUrl, {
        method:'PUT',
        headers:{'Content-Type':f.type, 'x-upsert':'false'},
        body: f
      });
      if(!up.ok){ throw new Error('Upload HTTP '+up.status); }
      _stagedImages.push({publicUrl:sig.publicUrl, path:sig.path});
      renderImgList();
    }catch(e){
      toast('Upload failed: '+e.message, 'err');
    }
  }
}

async function saveProduct(){
  var name = document.getElementById('pfName').value.trim();
  var nameZh = document.getElementById('pfNameZh').value.trim();
  var desc = document.getElementById('pfDesc').value.trim();
  var descZh = document.getElementById('pfDescZh').value.trim();
  var priceMajor = parseFloat(document.getElementById('pfPrice').value);
  var cur = document.getElementById('pfCur').value;
  // Element is a multi-select checkbox group — collect all checked values
  var elemList = Array.prototype.slice.call(document.querySelectorAll('input.pfElem:checked'))
    .map(function(cb){ return cb.value; });
  var elem = elemList.join(',');
  var elemClasses = elemList.map(function(c){ return ELEM_CLASS_MAP[c] || ''; }).filter(Boolean).join(',');
  var cat = document.getElementById('pfCat').value;
  var gender = document.getElementById('pfGender').value;
  var sort = document.getElementById('pfSort').value;
  var hiddenFromShop = !!document.getElementById('pfHidden').checked;

  // Normalize staged sizes — drop blanks, dedupe by name
  var cleanSizes = [];
  var seen = {};
  _stagedSizes.forEach(function(s){
    var name = String(s.size||'').trim();
    if(!name || seen[name]) return;
    seen[name] = true;
    cleanSizes.push({size:name, qty:Math.max(0, parseInt(s.qty)||0)});
  });

  if(!name){ toast('Name is required', 'err'); return; }
  if(!priceMajor || priceMajor <= 0){ toast('Valid price required', 'err'); return; }

  var unit_amount = Math.round(priceMajor * 100);
  var metadata = {};
  if(nameZh) metadata.name_zh = nameZh;
  if(descZh) metadata.description_zh = descZh;
  // Element (comma-separated for multi-select support)
  metadata.element = elem;
  metadata.element_class = elemClasses;
  if(cat) metadata.category = cat;
  if(gender) metadata.gender = gender;
  // Clear legacy yinyang field — 阴/阳 now live in the element dimension itself
  metadata.yinyang = '';
  if(cleanSizes.length){
    metadata.sizes_json = JSON.stringify(cleanSizes);
    // Also write legacy `sizes` comma list for backward compat with existing shop code
    metadata.sizes = cleanSizes.map(function(s){ return s.size; }).join(',');
  }
  if(sort) metadata.sort_order = String(sort);
  // Visibility flag — when the "Not available in shop" box is checked, mark the
  // product hidden so /api/products excludes it from the public shop. Admin
  // endpoint always returns all products regardless of this flag.
  metadata.hidden = hiddenFromShop ? 'true' : 'false';
  // Preserve image paths list for bookkeeping
  var paths = _stagedImages.map(function(x){ return x.path || ''; }).filter(Boolean).join(',');
  if(paths) metadata.image_paths = paths;

  var images = _stagedImages.map(function(x){ return x.publicUrl; });

  var btn = document.getElementById('modalSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try{
    if(_editingProduct){
      var body = {id:_editingProduct.id, name, description:desc, metadata, images};
      var oldAmt = _editingProduct.price_amount;
      var oldCur = _editingProduct.price_currency;
      if(unit_amount !== oldAmt || cur !== oldCur){
        body.new_price = {unit_amount, currency:cur};
      }
      await api('/api/admin/products', {method:'PATCH', body});
      toast('Product updated');
    }else{
      await api('/api/admin/products', {method:'POST', body:{name, description:desc, metadata, images, unit_amount, currency:cur}});
      toast('Product created');
    }
    closeProductModal();
    loadProducts();
  }catch(e){
    toast('Save failed: '+e.message, 'err');
  }finally{
    btn.disabled = false; btn.textContent = 'Save';
  }
}

/* ── Users ── */
var _userPage = 1;
var _userSearchQ = '';
function debouncedUserSearch(){
  clearTimeout(_userSearchTimer);
  _userSearchTimer = setTimeout(function(){
    _userSearchQ = document.getElementById('userSearch').value.trim();
    _userPage = 1;
    loadUsers();
  }, 300);
}

async function loadUsers(){
  var host = document.getElementById('userHost');
  host.className = 'loader'; host.innerHTML = 'Loading…';
  try{
    var qs = 'page='+_userPage+'&perPage=100';
    if(_userSearchQ) qs += '&search='+encodeURIComponent(_userSearchQ);
    var d = await api('/api/admin/users?'+qs);
    if(!d.users.length){
      host.innerHTML = '<div class="empty">No users found.</div>';
      return;
    }
    var cols = '1.5fr 1fr 80px 80px 90px 60px 100px';
    var head = '<div class="t-head" style="grid-template-columns:'+cols+'">' +
      '<div>Email</div><div>Name</div><div>Paid</div><div>Opt-in</div><div>Terms</div><div>Rdgs</div><div>Joined</div></div>';
    var rows = d.users.map(function(u){
      return '<div class="t-row" style="grid-template-columns:'+cols+'" onclick="openUserDrawer(\''+u.id+'\')">' +
        '<div class="t-cell" title="'+escapeAttr(u.email||'')+'">'+escapeHtml(u.email||'')+'</div>' +
        '<div class="t-cell">'+escapeHtml(u.name||'—')+'</div>' +
        '<div class="t-cell">'+(u.paid?'<span class="pill pill-paid">Paid</span>':'<span class="pill pill-unpaid">Free</span>')+'</div>' +
        '<div class="t-cell">'+(u.marketing_opt_in?'<span class="pill pill-opt">Yes</span>':'<span class="pill pill-unpaid">No</span>')+'</div>' +
        '<div class="t-cell" title="'+u.terms_version+'">'+escapeHtml(u.terms_version||'—')+'</div>' +
        '<div class="t-cell">'+u.reading_count+'</div>' +
        '<div class="t-cell" style="font-size:11px;color:var(--t3)">'+fmtDate(u.created_at)+'</div>' +
      '</div>';
    }).join('');
    host.className = '';
    host.innerHTML = head + rows;
  }catch(e){
    host.innerHTML = '<div class="empty">Failed: '+e.message+'</div>';
  }
}

async function openUserDrawer(id){
  document.getElementById('drawerBody').innerHTML = '<div class="loader">Loading…</div>';
  document.getElementById('drawerBg').classList.add('on');
  document.getElementById('drawer').classList.add('on');
  try{
    var d = await api('/api/admin/users?id='+encodeURIComponent(id));
    var u = d.user; var m = u.user_metadata || {};
    document.getElementById('drawerTitle').textContent = u.email || 'User';
    var body = '';
    body += '<div class="drawer-sec"><h3>Profile</h3>';
    if(m.avatar_url) body += '<img src="'+m.avatar_url+'" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:1px solid var(--line);margin-bottom:12px">';
    body += '<div class="kv"><div class="kv-k">ID</div><div class="kv-v" style="font-family:monospace;font-size:11px">'+u.id+'</div></div>';
    body += '<div class="kv"><div class="kv-k">Email</div><div class="kv-v">'+escapeHtml(u.email||'')+'</div></div>';
    body += '<div class="kv"><div class="kv-k">Name</div><div class="kv-v">'+escapeHtml(m.name||'—')+'</div></div>';
    body += '<div class="kv"><div class="kv-k">Locale</div><div class="kv-v">'+(m.locale||'—')+'</div></div>';
    body += '<div class="kv"><div class="kv-k">Paid</div><div class="kv-v">'+(m.paid?'Yes':'No')+'</div></div>';
    body += '<div class="kv"><div class="kv-k">Marketing</div><div class="kv-v">'+(m.marketing_opt_in?'Opt-in':'Opt-out')+'</div></div>';
    body += '<div class="kv"><div class="kv-k">Registered</div><div class="kv-v">'+fmtDate(u.created_at)+'</div></div>';
    body += '<div class="kv"><div class="kv-k">Last sign-in</div><div class="kv-v">'+fmtDate(u.last_sign_in_at)+'</div></div>';
    body += '</div>';

    body += '<div class="drawer-sec"><h3>Readings ('+d.readings.length+')</h3>';
    if(d.readings.length){
      body += d.readings.map(function(r){
        return '<div data-rdg="'+r.id+'" style="padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;cursor:pointer" onclick="showReadingReport(\''+r.id+'\')">' +
          '<b>'+escapeHtml(r.year_gz||'')+'</b> · '+escapeHtml(r.day_master||'')+' '+escapeHtml(r.strength_verdict||'')+'<br>' +
          '<span style="font-size:11px;color:var(--t3)">'+(r.birth_year||'?')+'-'+(r.birth_month||'?')+'-'+(r.birth_day||'?')+' · '+(r.gender||'?')+' · '+fmtDate(r.created_at)+' — click to toggle full JSON</span>' +
        '</div>';
      }).join('');
    }else{
      body += '<div style="font-size:12px;color:var(--t3)">No readings yet.</div>';
    }
    body += '</div>';

    body += '<div class="drawer-sec"><h3>Orders ('+d.orders.length+')</h3>';
    if(d.orders.length){
      body += d.orders.map(function(o){
        return '<div style="padding:10px 0;border-bottom:1px solid var(--line);font-size:13px">' +
          fmtMoney(o.amount_total, o.currency)+' · <span class="pill '+(o.payment_status==='paid'?'pill-paid':'pill-unpaid')+'">'+o.payment_status+'</span><br>' +
          '<span style="font-size:11px;color:var(--t3);font-family:monospace">'+o.id+'</span> · '+fmtDate(o.created*1000) +
        '</div>';
      }).join('');
    }else{
      body += '<div style="font-size:12px;color:var(--t3)">No orders.</div>';
    }
    body += '</div>';

    body += '<div class="drawer-sec"><h3>Terms Acceptances ('+d.terms_acceptances.length+')</h3>';
    if(d.terms_acceptances.length){
      body += '<table style="width:100%;font-size:12px"><tr style="color:var(--t3)"><th style="text-align:left;padding:4px">Version</th><th style="text-align:left;padding:4px">When</th><th style="text-align:left;padding:4px">IP</th></tr>';
      body += d.terms_acceptances.map(function(t){
        return '<tr><td style="padding:6px 4px">'+escapeHtml(t.version)+'</td><td style="padding:6px 4px;color:var(--t3)">'+fmtDate(t.accepted_at)+'</td><td style="padding:6px 4px;color:var(--t3);font-family:monospace">'+escapeHtml(t.ip||'—')+'</td></tr>';
      }).join('');
      body += '</table>';
    }else{
      body += '<div style="font-size:12px;color:var(--t3)">No records.</div>';
    }
    body += '</div>';

    document.getElementById('drawerBody').innerHTML = body;
  }catch(e){
    document.getElementById('drawerBody').innerHTML = '<div class="empty">'+e.message+'</div>';
  }
}

async function showReadingReport(readingId){
  var sectionId = 'rpt-' + readingId;
  var existing = document.getElementById(sectionId);
  if(existing){ existing.remove(); return; }
  try{
    var d = await api('/api/admin/reading?id='+encodeURIComponent(readingId));
    var anchor = document.querySelector('[data-rdg="'+readingId+'"]');
    if(!anchor) return;
    var pre = document.createElement('pre');
    pre.id = sectionId;
    pre.className = 'report-preview';
    pre.textContent = JSON.stringify(d.report || d, null, 2);
    anchor.after(pre);
  }catch(e){
    toast(e.message, 'err');
  }
}

function closeDrawer(){
  document.getElementById('drawerBg').classList.remove('on');
  document.getElementById('drawer').classList.remove('on');
}

/* ── Orders ── */
async function loadOrders(){
  var host = document.getElementById('orderHost');
  host.className = 'loader'; host.innerHTML = 'Loading…';
  try{
    var d = await api('/api/admin/orders?limit=100');
    if(!d.sessions.length){
      host.innerHTML = '<div class="empty">No orders yet.</div>';
      return;
    }
    var cols = '100px 1.2fr 90px 90px 100px 1fr';
    var head = '<div class="t-head" style="grid-template-columns:'+cols+'">' +
      '<div>When</div><div>Email</div><div>Amount</div><div>Status</div><div>Mode</div><div>Items</div></div>';
    var rows = d.sessions.map(function(s){
      var items = (s.line_items||[]).map(function(li){ return escapeHtml(li.description||'')+' ×'+li.quantity; }).join(', ');
      return '<div class="t-row" style="grid-template-columns:'+cols+';cursor:default">' +
        '<div class="t-cell" style="font-size:11px;color:var(--t3)">'+fmtDate(s.created*1000)+'</div>' +
        '<div class="t-cell">'+escapeHtml(s.customer_email||'—')+'</div>' +
        '<div class="t-cell">'+fmtMoney(s.amount_total, s.currency)+'</div>' +
        '<div class="t-cell"><span class="pill '+(s.payment_status==='paid'?'pill-paid':'pill-unpaid')+'">'+s.payment_status+'</span></div>' +
        '<div class="t-cell" style="font-size:11px;color:var(--t3)">'+s.mode+'</div>' +
        '<div class="t-cell" style="font-size:11px;color:var(--t3)" title="'+escapeAttr(items)+'">'+items+'</div>' +
      '</div>';
    }).join('');
    host.className = '';
    host.innerHTML = head + rows;
  }catch(e){
    host.innerHTML = '<div class="empty">Failed: '+e.message+'</div>';
  }
}

/* ── Helpers ── */
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
function fmtDate(s){ if(!s) return '—'; var d = new Date(s); return d.toLocaleString(); }
function fmtMoney(amt, cur){
  var n = (amt||0)/100;
  var sym = {usd:'$', cny:'¥', eur:'€', gbp:'£', hkd:'HK$', sgd:'S$'}[cur] || (cur||'').toUpperCase()+' ';
  return sym + n.toFixed(2);
}
function toast(msg, type){
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast on' + (type==='err' ? ' err' : '');
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.className = 'toast' + (type==='err'?' err':''); }, 2800);
}
