/*  kes-auth.js  —  Supabase Auth + Stripe Payment
 *  Requires: kes-config.js loaded first, supabase-js CDN
 */

var kesUser = null;
var authMode = 'login';
var _supabaseClient = null;

function getSupabase(){
  if(!_supabaseClient && window.supabase){
    _supabaseClient = window.supabase.createClient(
      KES_CONFIG.SUPABASE_URL,
      KES_CONFIG.SUPABASE_ANON_KEY
    );
  }
  return _supabaseClient;
}

/* ── Init: check session on page load ── */
async function initAuth(){
  var sb = getSupabase();
  if(!sb) { updateUserUI(); return; }

  try {
    var { data } = await sb.auth.getSession();
    if(data && data.session){
      kesUser = {
        id: data.session.user.id,
        email: data.session.user.email,
        name: (data.session.user.user_metadata || {}).name || data.session.user.email.split('@')[0],
        paid: (data.session.user.user_metadata || {}).paid || false
      };
    }
  } catch(e){ console.error('Auth init error:', e); }

  // Check Stripe payment callback
  var params = new URLSearchParams(window.location.search);
  if(params.get('payment') === 'success' && kesUser){
    await markAsPaid();
    window.history.replaceState({}, '', window.location.pathname);
  }

  updateUserUI();
}

/* ── Login / Register Modal ── */
function openLogin(mode){
  authMode = mode || 'login';
  updateAuthUI();
  document.getElementById('loginOverlay').classList.add('open');
}
function closeLogin(){
  document.getElementById('loginOverlay').classList.remove('open');
  hideAuthError();
}
function toggleAuthMode(){
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuthUI();
  hideAuthError();
}

var isZh = (document.documentElement.lang === 'zh');

function updateAuthUI(){
  var isReg = authMode === 'register';
  document.getElementById('loginTitle').textContent = isReg ? (isZh?'注册':'Sign Up') : (isZh?'登录':'Sign In');
  document.getElementById('loginSub').textContent = isReg
    ? (isZh?'创建账户以解锁完整命理报告':'Create an account to unlock your complete reading')
    : (isZh?'登录以解锁完整命理报告':'Sign in to unlock your complete reading');
  document.getElementById('loginBtn').textContent = isReg ? (isZh?'注册':'Sign Up') : (isZh?'登录':'Sign In');
  document.getElementById('loginNameField').style.display = isReg ? 'block' : 'none';
  document.getElementById('loginToggle').textContent = isReg
    ? (isZh?'已有账户？立即登录':'Already have an account? Sign in')
    : (isZh?'还没有账户？立即注册':"Don't have an account? Sign up");
  document.getElementById('forgotLink').style.display = isReg ? 'none' : 'block';
  hideForgotPassword();
}

/* ── Auth Error Display ── */
function showAuthError(msg){
  var el = document.getElementById('authError');
  if(!el){
    el = document.createElement('div');
    el.id = 'authError';
    el.style.cssText = 'color:#a84848;font-size:12px;text-align:center;margin-top:10px;padding:8px 12px;background:rgba(168,72,72,.08);border-radius:8px;display:none';
    document.getElementById('loginBtn').parentElement.insertBefore(el, document.getElementById('loginBtn').nextSibling);
  }
  el.textContent = msg;
  el.style.display = 'block';
}
function hideAuthError(){
  var el = document.getElementById('authError');
  if(el) el.style.display = 'none';
}

/* ── Handle Auth Submit ── */
async function handleAuth(){
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPass').value;
  if(!email || !pass){
    showAuthError(isZh ? '请填写邮箱和密码' : 'Please enter email and password');
    return;
  }

  var btn = document.getElementById('loginBtn');
  var origText = btn.textContent;
  btn.textContent = '...';
  btn.disabled = true;
  hideAuthError();

  var sb = getSupabase();
  if(!sb){
    // Fallback: no Supabase configured, use localStorage mock
    kesUser = { email: email, name: document.getElementById('loginName').value || email.split('@')[0], paid: false };
    localStorage.setItem('kes_user', JSON.stringify(kesUser));
    btn.textContent = origText; btn.disabled = false;
    closeLogin(); updateUserUI(); promptPayment();
    return;
  }

  var result;
  try {
    if(authMode === 'register'){
      var name = document.getElementById('loginName').value || email.split('@')[0];
      result = await sb.auth.signUp({
        email: email,
        password: pass,
        options: { data: { name: name, paid: false } }
      });
    } else {
      result = await sb.auth.signInWithPassword({ email: email, password: pass });
    }
  } catch(e){
    showAuthError(isZh ? '网络错误，请稍后重试' : 'Network error, please try again');
    btn.textContent = origText; btn.disabled = false;
    return;
  }

  btn.textContent = origText;
  btn.disabled = false;

  if(result.error){
    var msg = result.error.message;
    if(msg.includes('Invalid login')) msg = isZh ? '邮箱或密码错误' : 'Invalid email or password';
    else if(msg.includes('already registered')) msg = isZh ? '该邮箱已注册，请直接登录' : 'Already registered, please sign in';
    else if(msg.includes('valid email')) msg = isZh ? '请输入有效邮箱' : 'Please enter a valid email';
    else if(msg.includes('at least')) msg = isZh ? '密码至少6位' : 'Password must be at least 6 characters';
    showAuthError(msg);
    return;
  }

  // Registration may require email confirmation
  if(authMode === 'register' && result.data && !result.data.session){
    closeLogin();
    alert(isZh
      ? '注册成功！请查收验证邮件，点击链接后即可登录。\n（请检查垃圾邮件文件夹）'
      : 'Registration successful! Please check your email to verify.\n(Check your spam folder)');
    return;
  }

  // Login success
  if(result.data && result.data.session){
    var u = result.data.session.user;
    kesUser = {
      id: u.id,
      email: u.email,
      name: (u.user_metadata || {}).name || u.email.split('@')[0],
      paid: (u.user_metadata || {}).paid || false
    };
    closeLogin();
    updateUserUI();
    if(!kesUser.paid) promptPayment();
  }
}

/* ── Forgot Password ── */
function showForgotPassword(){
  document.getElementById('forgotPanel').style.display = 'block';
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('forgotLink').style.display = 'none';
  document.getElementById('loginToggle').style.display = 'none';
  document.querySelector('.lb-divider').style.display = 'none';
  document.getElementById('loginTitle').textContent = isZh ? '重置密码' : 'Reset Password';
  document.getElementById('loginSub').textContent = isZh ? '输入邮箱以接收密码重置链接' : 'Enter your email to receive a reset link';
  document.getElementById('loginPass').parentElement.style.display = 'none';
  hideAuthError();
}
function hideForgotPassword(){
  document.getElementById('forgotPanel').style.display = 'none';
  document.getElementById('loginBtn').style.display = 'block';
  document.getElementById('forgotLink').style.display = 'block';
  document.getElementById('loginToggle').style.display = 'block';
  document.querySelector('.lb-divider').style.display = 'block';
  document.getElementById('loginPass').parentElement.style.display = 'block';
}

async function handleResetPassword(){
  var email = document.getElementById('resetEmail').value.trim();
  if(!email){
    alert(isZh ? '请输入邮箱地址' : 'Please enter your email');
    return;
  }

  var sb = getSupabase();
  if(sb){
    var { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if(error){
      alert(isZh ? '发送失败: ' + error.message : 'Failed: ' + error.message);
      return;
    }
  }

  alert(isZh
    ? '重置链接已发送至 ' + email + '\n请检查收件箱（含垃圾邮件文件夹）。'
    : 'Reset link sent to ' + email + '\nPlease check your inbox (and spam folder).');
  hideForgotPassword();
}

/* ── Logout ── */
async function handleLogout(){
  var sb = getSupabase();
  if(sb) await sb.auth.signOut();
  kesUser = null;
  localStorage.removeItem('kes_user');
  updateUserUI();
  lockReport();
}

/* ── Payment ── */
function promptPayment(){
  if(kesUser && !kesUser.paid){
    var msg = isZh
      ? '登录成功！\n\n解锁完整报告（' + KES_CONFIG.REPORT_PRICE + '）？\n包含：流年详解、逐月运势、重点预警与核心建议。'
      : 'Login successful!\n\nUnlock the full report (' + KES_CONFIG.REPORT_PRICE_EN + ')?\nIncludes: annual forecast, monthly outlook, alerts, and guidance.';
    if(confirm(msg)){
      handlePayment();
    }
  }
}

async function handlePayment(){
  // If Stripe is configured, redirect to Stripe Checkout
  if(KES_CONFIG.STRIPE_PUBLISHABLE_KEY && KES_CONFIG.STRIPE_PUBLISHABLE_KEY !== 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE'){
    try {
      var stripe = Stripe(KES_CONFIG.STRIPE_PUBLISHABLE_KEY);
      var { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: KES_CONFIG.STRIPE_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        successUrl: window.location.origin + window.location.pathname + '?payment=success',
        cancelUrl: window.location.origin + window.location.pathname + '?payment=cancel',
        customerEmail: kesUser ? kesUser.email : undefined
      });
      if(error) alert(error.message);
    } catch(e){
      console.error('Stripe error:', e);
      alert(isZh ? '支付系统暂不可用，请稍后重试' : 'Payment system unavailable, please try again later');
    }
    return;
  }

  // Fallback: no Stripe configured, simulate payment
  await markAsPaid();
  alert(isZh ? '支付成功！完整报告已解锁。' : 'Payment successful! Full report unlocked.');
}

async function markAsPaid(){
  if(!kesUser) return;
  kesUser.paid = true;

  // Update Supabase user metadata
  var sb = getSupabase();
  if(sb){
    try {
      await sb.auth.updateUser({ data: { paid: true } });
    } catch(e){ console.error('Update user error:', e); }
  }

  // Also save locally as backup
  localStorage.setItem('kes_user', JSON.stringify(kesUser));
  unlockReport();
}

/* ── Report Lock / Unlock ── */
function unlockReport(){
  // Legacy paywall (if exists)
  var gate = document.getElementById('paywallGate');
  var cta = document.getElementById('paywallCta');
  if(gate) gate.classList.remove('locked');
  if(cta) cta.style.display = 'none';
  // New tab system
  if(typeof doUnlockAdvanced === 'function') doUnlockAdvanced();
}

function lockReport(){
  // Legacy paywall
  var gate = document.getElementById('paywallGate');
  var cta = document.getElementById('paywallCta');
  if(gate) gate.classList.add('locked');
  if(cta) cta.style.display = '';
  // New tab system
  if(typeof _rptUnlocked !== 'undefined') _rptUnlocked = false;
  try { sessionStorage.removeItem('kes_unlocked'); } catch(e){}
  var unlock = document.getElementById('rpt-unlock');
  var adv = document.getElementById('rpt-advanced-content');
  var lock = document.getElementById('tab-lock-icon');
  if(unlock) unlock.style.display = '';
  if(adv) adv.style.display = 'none';
  if(lock) lock.textContent = '🔒';
}

/* ── Bypass Code ── */
function checkBypassCode(){
  var input = document.getElementById('bypassCode');
  var err = document.getElementById('codeError');
  var code = input.value.trim().toUpperCase();
  if(KES_CONFIG.VALID_CODES.indexOf(code) >= 0){
    unlockReport();
  } else {
    err.style.display = 'block';
    input.style.borderColor = 'var(--huo)';
    setTimeout(function(){ err.style.display='none'; input.style.borderColor='var(--line)'; }, 3000);
  }
}

/* ── Update Nav UI ── */
function updateUserUI(){
  var acctLink = document.getElementById('n-acct');
  if(kesUser && acctLink){
    var displayName = kesUser.name || (isZh ? '我的账户' : 'Account');
    acctLink.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> ' + displayName;
  }
  if(kesUser && kesUser.paid) unlockReport();
}

/* ── Disclaimer ── */
function dismissDisclaimer(){
  document.getElementById('disclaimerBanner').classList.add('hidden');
  sessionStorage.setItem('kes_disc','1');
}
if(sessionStorage.getItem('kes_disc')==='1'){
  var db = document.getElementById('disclaimerBanner');
  if(db) db.classList.add('hidden');
}

/* ── Init ── */
initAuth();
