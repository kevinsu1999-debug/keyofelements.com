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
  else if(tab === 'users') loadUsers();
  else if(tab === 'orders') loadOrders();
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
var ELEMENTS = [['','(none)'],['水','Water'],['木','Wood'],['火','Fire'],['土','Earth'],['金','Metal']];
var CATEGORIES = [['','(none)'],['clothing','Clothing / 服饰'],['accessory','Accessory / 配饰'],['life','Life / 生活'],['service','Service / 服务'],['other','Other']];
var GENDERS = [['','Neutral'],['male','Male / 男'],['female','Female / 女'],['unisex','Unisex']];

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
    '<div class="form-grid2">' +
      formField('element','Element / 五行', '<select id="pfElem">'+ELEMENTS.map(function(e){return '<option value="'+e[0]+'"'+(m.element===e[0]?' selected':'')+'>'+e[1]+'</option>';}).join('')+'</select>') +
      formField('category','Category / 分类', '<select id="pfCat">'+CATEGORIES.map(function(e){return '<option value="'+e[0]+'"'+(m.category===e[0]?' selected':'')+'>'+e[1]+'</option>';}).join('')+'</select>') +
    '</div>' +
    formField('gender','Gender', '<select id="pfGender">'+GENDERS.map(function(e){return '<option value="'+e[0]+'"'+(m.gender===e[0]?' selected':'')+'>'+e[1]+'</option>';}).join('')+'</select>') +
    '<div class="form-row">' +
      '<label>Sizes &amp; Stock</label>' +
      '<div style="font-size:10px;color:var(--t3);margin-bottom:8px">每行一个尺码；数量 = 当前可售库存。手动调整（每成一单回来 -1）。</div>' +
      '<div id="sizeRows"></div>' +
      '<button type="button" class="btn-sec" style="margin-top:6px" onclick="addSizeRow()">+ Add size</button>' +
    '</div>' +
    formField('sort','Sort order (lower shows first)', '<input id="pfSort" type="number" value="'+escapeAttr(m.sort_order||'99')+'">') +
    '<div class="form-row">' +
      '<label>Visibility / \u5c55\u793a\u4f4d\u7f6e</label>' +
      '<div style="display:flex;gap:14px;align-items:center;padding:8px 0">' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t1);cursor:pointer;text-transform:none;letter-spacing:0">' +
          '<input type="checkbox" id="pfShopVisible" '+(m.hidden==='true'?'':'checked')+' style="width:16px;height:16px;accent-color:var(--t1);cursor:pointer">' +
          '<span>Show in public shop / \u5728\u5e97\u94fa\u4e2d\u5c55\u793a</span>' +
        '</label>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--t3);margin-top:-4px">\u53d6\u6d88\u52fe\u9009\u540e\u4ea7\u54c1\u5728 Stripe \u4ecd\u7136\u5b58\u5728\u3001\u53ef\u88ab\u652f\u4ed8\u94fe\u63a5\u4f7f\u7528\uff0c\u4f46\u4e0d\u51fa\u73b0\u5728\u516c\u5f00 shop \u9875\u3002\u9002\u5408\u62a5\u544a\u89e3\u9501\u4e4b\u7c7b\u670d\u52a1\u578b\u4ea7\u54c1\u3002</div>' +
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
  var elem = document.getElementById('pfElem').value;
  var cat = document.getElementById('pfCat').value;
  var gender = document.getElementById('pfGender').value;
  var sort = document.getElementById('pfSort').value;
  var shopVisible = !!document.getElementById('pfShopVisible').checked;

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
  if(elem) { metadata.element = elem; metadata.element_class = {'水':'shui','木':'mu','火':'huo','土':'tu','金':'jin'}[elem]||''; }
  if(cat) metadata.category = cat;
  if(gender) metadata.gender = gender;
  if(cleanSizes.length){
    metadata.sizes_json = JSON.stringify(cleanSizes);
    // Also write legacy `sizes` comma list for backward compat with existing shop code
    metadata.sizes = cleanSizes.map(function(s){ return s.size; }).join(',');
  }
  if(sort) metadata.sort_order = String(sort);
  // Visibility flag — when unchecked, mark hidden so /api/products excludes it from public shop.
  // Admin endpoint always returns all products regardless of this flag.
  metadata.hidden = shopVisible ? 'false' : 'true';
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
