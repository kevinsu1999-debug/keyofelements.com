/* kes-account.js — User account page logic
 * Auth: Supabase session (reused from kes-auth.js conventions).
 * Direct Supabase for password/metadata; serverless for cross-system ops.
 */

var _sb = null;
var _user = null;
var _accessToken = null;

document.addEventListener('DOMContentLoaded', init);

async function init(){
  _sb = window.supabase.createClient(KES_CONFIG.SUPABASE_URL, KES_CONFIG.SUPABASE_ANON_KEY);
  try{
    var { data } = await _sb.auth.getSession();
    if(!data || !data.session){ showGate(); return; }
    _user = data.session.user;
    _accessToken = data.session.access_token;
  }catch(e){ showGate(); return; }

  document.getElementById('shell').style.display = '';
  document.getElementById('navLogout').style.display = '';

  // Wire side nav
  document.querySelectorAll('.side-item').forEach(function(el){
    el.addEventListener('click', function(){ switchSection(el.dataset.sec); });
  });

  // Avatar uploader
  document.getElementById('avatarInput').addEventListener('change', handleAvatarChange);

  // Export button: attach a blob URL when visited
  document.querySelectorAll('.side-item').forEach(function(el){
    if(el.dataset.sec === 'privacy'){
      el.addEventListener('click', prepareExport, { once: false });
    }
  });

  renderProfile();
  loadTermsStatus();
}

function showGate(){
  document.getElementById('gateView').style.display = '';
  document.getElementById('shell').style.display = 'none';
}

function switchSection(sec){
  document.querySelectorAll('.side-item').forEach(function(el){
    el.classList.toggle('on', el.dataset.sec === sec);
  });
  document.querySelectorAll('.sec').forEach(function(s){
    s.classList.toggle('on', s.id === 'sec-'+sec);
  });
  if(sec === 'readings') loadReadings();
  if(sec === 'orders') loadOrders();
  if(sec === 'privacy') { loadTermsStatus(); prepareExport(); }
}

async function doLogout(){
  try{ await _sb.auth.signOut(); }catch(e){}
  location.href = '/';
}

/* ── Profile ── */
function renderProfile(){
  var m = _user.user_metadata || {};
  document.getElementById('fName').value = m.name || '';
  document.getElementById('fLocale').value = m.locale || 'zh';
  document.getElementById('fEmail').value = _user.email || '';
  document.getElementById('fMarketing').checked = !!m.marketing_opt_in;
  document.getElementById('kvCreated').textContent = fmtDate(_user.created_at);
  document.getElementById('kvLastSignIn').textContent = fmtDate(_user.last_sign_in_at);

  var ap = document.getElementById('avatarPreview');
  if(m.avatar_url){
    ap.outerHTML = '<img id="avatarPreview" class="avatar" src="'+m.avatar_url+'">';
  }else{
    var initial = ((_user.email||'?').charAt(0)||'?').toUpperCase();
    ap.outerHTML = '<div id="avatarPreview" class="avatar-ph">'+initial+'</div>';
  }
}

function toggleMarketing(e){
  if(e.target.tagName !== 'INPUT'){
    document.getElementById('fMarketing').checked = !document.getElementById('fMarketing').checked;
  }
  // Persist immediately
  persistProfile({marketing_opt_in: document.getElementById('fMarketing').checked});
}

async function saveProfile(){
  var name = document.getElementById('fName').value.trim();
  var locale = document.getElementById('fLocale').value;
  var marketing = document.getElementById('fMarketing').checked;
  await persistProfile({name, locale, marketing_opt_in:marketing});
}

async function persistProfile(patch){
  try{
    var res = await api('/api/account/profile', {method:'PATCH', body:patch});
    // Refresh local user object from Supabase so metadata stays in sync
    var { data } = await _sb.auth.getUser();
    if(data && data.user) _user = data.user;
    toast('Saved');
    renderProfile();
  }catch(e){
    toast(e.message, 'err');
  }
}

async function handleAvatarChange(e){
  var f = e.target.files && e.target.files[0];
  if(!f) return;
  if(!f.type.startsWith('image/')){ toast('Not an image', 'err'); return; }
  if(f.size > 2*1024*1024){ toast('Too large (max 2 MB)', 'err'); return; }
  try{
    toast('Uploading…');
    var sig = await api('/api/account/avatar', {method:'POST', body:{filename:f.name, contentType:f.type}});
    var up = await fetch(sig.uploadUrl, {method:'PUT', headers:{'Content-Type':f.type, 'x-upsert':'true'}, body:f});
    if(!up.ok) throw new Error('Upload HTTP '+up.status);
    await persistProfile({avatar_url: sig.publicUrl});
  }catch(err){
    toast('Avatar upload failed: '+err.message, 'err');
  }
}

/* ── Email change ── */
function openEmailModal(){
  document.getElementById('newEmailInp').value = '';
  document.getElementById('emailModalBg').classList.add('on');
}
function closeEmailModal(){
  document.getElementById('emailModalBg').classList.remove('on');
}
async function submitEmailChange(){
  var ne = document.getElementById('newEmailInp').value.trim();
  if(!ne){ toast('Enter a new email', 'err'); return; }
  try{
    var r = await api('/api/account/email', {method:'POST', body:{new_email:ne}});
    closeEmailModal();
    toast(r.message || 'Verification sent');
  }catch(e){
    toast(e.message, 'err');
  }
}

/* ── Password ── */
async function changePassword(){
  var cur = document.getElementById('fCurPass').value;
  var nw = document.getElementById('fNewPass').value;
  var cf = document.getElementById('fConfPass').value;
  var msg = document.getElementById('passMsg');
  msg.style.color = 'var(--huo)';
  if(!cur || !nw){ msg.textContent = 'Fill in all fields'; return; }
  if(nw.length < 6){ msg.textContent = 'New password must be at least 6 characters'; return; }
  if(nw !== cf){ msg.textContent = 'Passwords do not match'; return; }
  try{
    await api('/api/account/password', {method:'POST', body:{current:cur, new:nw}});
    msg.style.color = 'var(--mu)';
    msg.textContent = 'Password updated.';
    document.getElementById('fCurPass').value = '';
    document.getElementById('fNewPass').value = '';
    document.getElementById('fConfPass').value = '';
  }catch(e){
    msg.textContent = e.message;
  }
}

/* ── Readings ── */
async function loadReadings(){
  var host = document.getElementById('rdHost');
  host.className = 'loader'; host.innerHTML = 'Loading…';
  try{
    var d = await api('/api/account/readings');
    if(!d.readings.length){
      host.innerHTML = '<div class="empty">No readings yet. Head to the <a href="/" style="color:var(--t1)">home page</a> to generate one.</div>';
      return;
    }
    var isPaid = _user && (_user.user_metadata||{}).paid;
    host.className = '';
    host.innerHTML = d.readings.map(function(r){
      var paidBadge = isPaid ? ' <span class="pill pill-paid" style="font-size:9px;vertical-align:middle;margin-left:6px">PAID</span>' : '';
      return '<div class="rd-item" onclick="replayReading(\''+r.id+'\')">' +
        '<div class="rd-gz">'+escapeHtml(r.year_gz||'—')+paidBadge+'</div>' +
        '<div class="rd-meta">' +
          escapeHtml(r.day_master||'?')+' · '+escapeHtml(r.strength_verdict||'')+' · ' +
          (r.birth_year||'?')+'-'+(r.birth_month||'?')+'-'+(r.birth_day||'?')+' ' +
          (r.gender==='M'?'male':r.gender==='F'?'female':'')+' · '+fmtDate(r.created_at) +
        '</div>' +
      '</div>';
    }).join('');
  }catch(e){
    host.innerHTML = '<div class="empty">'+e.message+'</div>';
  }
}

async function replayReading(id){
  try{
    var r = await api('/api/account/readings?id='+encodeURIComponent(id));
    document.getElementById('rptModalTitle').textContent = (r.year_gz||'') + ' · ' + (r.day_master||'') + ' · ' + fmtDate(r.created_at);
    var body = document.getElementById('rptModalBody');
    body.innerHTML = renderReadingHtml(r.report || {});
    document.getElementById('rptModalBg').classList.add('on');
  }catch(e){
    toast(e.message, 'err');
  }
}
function closeRptModal(){ document.getElementById('rptModalBg').classList.remove('on'); }

/* ── Render saved report as formatted HTML (used inside the replay modal) ── */
function renderReadingHtml(d){
  if(!d || !d.meta) return '<div class="empty">No report data available.</div>';
  var m = d.meta || {};
  var p = d.pillars || {};
  var s = d.strength || {};
  var y = d.yongshen || {};
  var WX_C = {'木':'mu','火':'huo','土':'tu','金':'jin','水':'shui'};
  var S_WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
  var B_WX = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
  function ec(ch){ var w = S_WX[ch]||''; return '<span class="e-'+(WX_C[w]||'tu')+'">'+escapeHtml(ch)+'</span>'; }
  function ecb(ch){ var w = B_WX[ch]||''; return '<span class="e-'+(WX_C[w]||'tu')+'">'+escapeHtml(ch)+'</span>'; }

  var html = '';

  // ── Info header ──
  html += '<div class="rr-info">';
  html += '<div class="rr-row"><span class="rr-label">Birth</span><span>'+escapeHtml(m.birth||'')+(m.birth_hour_branch?' '+m.birth_hour_branch+'时':'')+'</span></div>';
  html += '<div class="rr-row"><span class="rr-label">Gender</span><span>'+escapeHtml(m.gender_label||'')+'</span></div>';
  if(m.birth_city) html += '<div class="rr-row"><span class="rr-label">Birth city</span><span>'+escapeHtml(m.birth_city)+'</span></div>';
  html += '<div class="rr-row"><span class="rr-label">Day Master</span><span class="e-'+(WX_C[m.day_master_wx]||'tu')+'" style="font-weight:600">'+escapeHtml(p.day?p.day.stem:'')+' '+escapeHtml(m.day_master_wx||'')+'</span></div>';
  html += '</div>';

  // ── Four Pillars ──
  if(p.year && p.month && p.day && p.hour){
    var labels = ['年柱 Year','月柱 Month','日柱 Day','时柱 Hour'];
    var cols = [p.year, p.month, p.day, p.hour];
    html += '<div class="rr-pillars">';
    for(var i=0;i<4;i++){
      var col = cols[i];
      html += '<div class="rr-pillar'+(i===2?' rr-day':'')+'">'+
        '<div class="rr-pillar-label">'+labels[i]+'</div>'+
        '<div class="rr-pillar-gz">'+ec(col.stem)+'</div>'+
        '<div class="rr-pillar-gz">'+ecb(col.branch)+'</div>'+
      '</div>';
    }
    html += '</div>';
  }

  // ── Strength ──
  if(s.verdict){
    html += '<div class="rr-section">';
    html += '<div class="rr-h">身强弱 Strength</div>';
    html += '<div class="rr-strength">'+escapeHtml(s.verdict)+'</div>';
    if(s.detail) html += '<div class="rr-text">'+escapeHtml(s.detail)+'</div>';
    html += '</div>';
  }

  // ── Yongshen ──
  if(y.xi || y.ji){
    html += '<div class="rr-section">';
    html += '<div class="rr-h">喜忌用神 Favorable / Unfavorable</div>';
    html += '<div class="rr-yj">';
    if(y.xi) html += '<div><span class="rr-label">喜 Favorable</span> '+y.xi.map(function(w){return '<span class="rr-wx e-'+(WX_C[w]||'tu')+'">'+w+'</span>';}).join(' ')+'</div>';
    if(y.ji) html += '<div><span class="rr-label">忌 Unfavorable</span> '+y.ji.map(function(w){return '<span class="rr-wx e-'+(WX_C[w]||'tu')+'">'+w+'</span>';}).join(' ')+'</div>';
    html += '</div></div>';
  }

  // ── Report text sections ──
  var sections = d.sections || [];
  if(sections.length){
    html += '<div class="rr-section">';
    html += '<div class="rr-h">详细分析 Detailed Analysis</div>';
    sections.forEach(function(sec){
      html += '<details class="rr-detail"><summary>'+escapeHtml(sec.label||sec.title||'Section')+'</summary>';
      html += '<div class="rr-detail-body">';
      if(typeof sec.content === 'string'){
        html += '<div class="rr-text">'+escapeHtml(sec.content).replace(/\n/g,'<br>')+'</div>';
      } else if(Array.isArray(sec.content)){
        sec.content.forEach(function(item){
          if(typeof item === 'string') html += '<div class="rr-text">'+escapeHtml(item).replace(/\n/g,'<br>')+'</div>';
          else if(item && item.label) html += '<div class="rr-text"><b>'+escapeHtml(item.label)+'</b><br>'+escapeHtml(item.text||'').replace(/\n/g,'<br>')+'</div>';
        });
      }
      html += '</div></details>';
    });
    html += '</div>';
  }

  return html;
}

/* ── Orders ── */
async function loadOrders(){
  var host = document.getElementById('orderHost');
  host.className = 'loader'; host.innerHTML = 'Loading…';
  try{
    var d = await api('/api/account/orders');
    if(!d.sessions.length){
      host.innerHTML = '<div class="empty">No orders yet.</div>';
      return;
    }
    host.className = '';
    host.innerHTML = d.sessions.map(function(s){
      var items = (s.line_items||[]).map(function(li){ return escapeHtml(li.description||'')+' ×'+li.quantity; }).join(', ');
      return '<div class="order-item">' +
        '<div><div style="font-weight:500">'+(items||'Payment')+'</div>' +
          '<div style="font-size:11px;color:var(--t3);margin-top:3px">'+fmtDate(s.created*1000)+' · <span style="font-family:monospace">'+s.id.slice(0,20)+'…</span></div>' +
        '</div>' +
        '<div>'+fmtMoney(s.amount_total, s.currency)+'</div>' +
        '<div><span class="pill '+(s.payment_status==='paid'?'pill-paid':'pill-unpaid')+'">'+s.payment_status+'</span></div>' +
      '</div>';
    }).join('');
  }catch(e){
    host.innerHTML = '<div class="empty">'+e.message+'</div>';
  }
}

/* ── Terms & Privacy ── */
async function loadTermsStatus(){
  var host = document.getElementById('termsHost');
  if(!host) return;
  host.className = 'loader'; host.innerHTML = 'Loading…';
  try{
    var m = _user.user_metadata || {};
    var current = (window.KES_CONFIG && KES_CONFIG.CURRENT_TERMS_VERSION) || 'tos-2026-04';
    var accepted = m.terms_version || '—';
    var isCurrent = accepted === current;
    host.className = '';
    host.innerHTML =
      '<div class="kv"><div class="kv-k">Current version</div><div>'+escapeHtml(current)+'</div></div>' +
      '<div class="kv"><div class="kv-k">You accepted</div><div>'+escapeHtml(accepted)+' '+(isCurrent?'<span class="pill pill-paid">up to date</span>':'<span class="pill pill-unpaid">needs update</span>')+'</div></div>' +
      (!isCurrent ? '<div style="margin-top:14px"><button class="btn" onclick="acceptTerms()">Accept current terms</button></div>' : '');
  }catch(e){
    host.innerHTML = '<div class="empty">'+e.message+'</div>';
  }
}

async function acceptTerms(){
  var v = (window.KES_CONFIG && KES_CONFIG.CURRENT_TERMS_VERSION) || 'tos-2026-04';
  try{
    await api('/api/account/terms-accept', {method:'POST', body:{version:v}});
    // Refresh user metadata
    var { data } = await _sb.auth.getUser();
    if(data && data.user) _user = data.user;
    toast('Terms accepted');
    loadTermsStatus();
  }catch(e){
    toast(e.message, 'err');
  }
}

/* ── Export ── */
function prepareExport(){
  var btn = document.getElementById('exportBtn');
  if(!btn) return;
  // Proper authorized download — fetch as blob then offer it
  btn.onclick = async function(e){
    e.preventDefault();
    try{
      var res = await fetch('/api/account/export', {headers:{'Authorization':'Bearer '+_accessToken}});
      if(!res.ok){ var d = await res.json().catch(function(){return{};}); throw new Error(d.error||('Error '+res.status)); }
      var blob = await res.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'kes-data-'+(_user.email||_user.id)+'-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    }catch(err){
      toast('Export failed: '+err.message, 'err');
    }
  };
}

/* ── Delete ── */
function openDeleteModal(){
  document.getElementById('delConfirmInp').value = '';
  document.getElementById('deleteModalBg').classList.add('on');
}
function closeDeleteModal(){
  document.getElementById('deleteModalBg').classList.remove('on');
}
async function submitDelete(){
  var c = document.getElementById('delConfirmInp').value;
  if(c !== 'DELETE'){ toast('Please type DELETE to confirm', 'err'); return; }
  try{
    await api('/api/account/delete', {method:'POST', body:{confirm:'DELETE'}});
    try{ await _sb.auth.signOut(); }catch(e){}
    alert('Your account has been permanently deleted.');
    location.href = '/';
  }catch(e){
    toast(e.message, 'err');
  }
}

/* ── Fetch wrapper ── */
async function api(path, opts){
  opts = opts || {};
  opts.headers = opts.headers || {};
  opts.headers['Authorization'] = 'Bearer '+_accessToken;
  if(opts.body && typeof opts.body !== 'string'){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(path, opts);
  if(res.status === 401){ showGate(); throw new Error('Session expired'); }
  var data;
  try{ data = await res.json(); }catch(e){ data = {}; }
  if(!res.ok) throw new Error(data.error || ('Error '+res.status));
  return data;
}

/* ── Helpers ── */
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function fmtDate(s){ if(!s) return '—'; return new Date(s).toLocaleString(); }
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
