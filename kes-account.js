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
    host.className = '';
    host.innerHTML = d.readings.map(function(r){
      return '<div class="rd-item" onclick="replayReading(\''+r.id+'\')">' +
        '<div class="rd-gz">'+escapeHtml(r.year_gz||'—')+'</div>' +
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
    body.innerHTML = '<pre>'+escapeHtml(JSON.stringify(r.report || {}, null, 2))+'</pre>';
    document.getElementById('rptModalBg').classList.add('on');
  }catch(e){
    toast(e.message, 'err');
  }
}
function closeRptModal(){ document.getElementById('rptModalBg').classList.remove('on'); }

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
