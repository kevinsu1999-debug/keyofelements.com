/*  kes-shop-render.js — Dynamic shop + PDP rendering from Stripe
 *  Fetches /api/products, renders into #shop-grid, powers PDP.
 *  Keeps the existing filter chips working via data-e attribute on .sgc.
 *  Keeps the existing .pdp-* layout in the product detail panel.
 */

var _shopProducts = null;   // in-memory cache from /api/products
var _shopLoading = false;
var _currentPDP = null;     // product being shown in PDP

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', function(){
  loadShopProducts();
});

async function loadShopProducts(){
  if(_shopLoading) return;
  _shopLoading = true;
  var grid = document.getElementById('shop-grid');
  if(!grid) { _shopLoading = false; return; }
  grid.innerHTML = '<div class="shop-loading" style="grid-column:1/-1;padding:60px 20px;text-align:center;color:var(--t3);font-size:12px;letter-spacing:.1em">Loading products…</div>';
  try{
    var res = await fetch('/api/products');
    var data = await res.json();
    _shopProducts = (data && data.products) || [];
    renderShopGrid();
  }catch(e){
    console.warn('shop load failed:', e);
    grid.innerHTML = '<div style="grid-column:1/-1;padding:60px 20px;text-align:center;color:var(--t3);font-size:12px">Failed to load products. Please refresh.</div>';
  }finally{
    _shopLoading = false;
  }
}

function renderShopGrid(){
  var grid = document.getElementById('shop-grid');
  if(!grid) return;
  var isZh = document.documentElement.lang === 'zh';

  if(!_shopProducts || !_shopProducts.length){
    grid.innerHTML = '<div class="shop-empty" style="grid-column:1/-1;padding:80px 20px;text-align:center;color:var(--t3)"><div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;font-weight:300;margin-bottom:10px">'+(isZh?'商品即将上架':'Coming soon')+'</div><div style="font-size:12px;letter-spacing:.08em">'+(isZh?'精选商品正在准备中':'Curated pieces are being prepared')+'</div></div>';
    return;
  }

  // Sort by metadata.sort_order asc, then by created desc (already sorted server-side alphabetically).
  var sorted = _shopProducts.slice().sort(function(a, b){
    var sa = parseInt((a.metadata||{}).sort_order || a.sort_order || '99');
    var sb = parseInt((b.metadata||{}).sort_order || b.sort_order || '99');
    return sa - sb;
  });

  grid.innerHTML = sorted.map(function(p){
    var elemClass = p.element_class || {'水':'shui','木':'mu','火':'huo','土':'tu','金':'jin'}[p.element] || 'shui';
    var elemChar = p.element || '';
    var displayName = isZh ? (p.name_zh || p.name) : p.name;
    var cat = p.category || '';
    var catLabel = isZh ? {clothing:'', accessory:'　配饰', life:'　生活', service:'　服务', other:''}[cat] : '';
    var elemLabel = elemChar + (catLabel || '');
    var priceStr = p.price_display || '';
    var img = (p.images && p.images[0]) || '';
    var imgHtml = img
      ? '<img src="'+escAttr(img)+'" style="width:100%;height:100%;object-fit:cover" alt="">'
      : '<div class="sgc-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:\'Cormorant Garamond\',serif;font-size:56px;color:rgba(0,0,0,.15);background:var(--'+elemClass+'-bg,var(--bg3))">'+(elemChar||'·')+'</div>';

    // Stock badge: "Sold out" if no stock; "Low: N" if total <= 3 but > 0
    var stockBadge = '';
    if(p.sizes_array && p.sizes_array.length){
      if(!p.has_stock){
        stockBadge = '<div class="sgc-badge-out" style="position:absolute;top:10px;left:10px;background:rgba(168,72,72,.92);color:#fff;font-size:9px;letter-spacing:.08em;padding:3px 9px;border-radius:100px">'+(isZh?'已售罄':'SOLD OUT')+'</div>';
      } else if(p.total_stock <= 3){
        stockBadge = '<div class="sgc-badge-low" style="position:absolute;top:10px;left:10px;background:rgba(160,136,40,.92);color:#fff;font-size:9px;letter-spacing:.08em;padding:3px 9px;border-radius:100px">'+(isZh?'库存紧张':'LOW STOCK')+'</div>';
      }
    }

    var addLabel = isZh ? '加入购物袋' : 'Add to bag';
    var outLabel = isZh ? '已售罄' : 'Sold out';
    var outOfStock = p.sizes_array && p.sizes_array.length && !p.has_stock;

    return '<div class="sgc" data-e="'+elemClass+'" data-pid="'+escAttr(p.id)+'" style="cursor:pointer" onclick="openPDPFromProduct(\''+escAttr(p.id)+'\')">' +
      '<div class="sgc-img" style="position:relative;overflow:hidden">'+imgHtml+stockBadge+
        '<div class="sgc-dot" style="background:var(--'+elemClass+')"></div>' +
      '</div>' +
      '<div class="sgc-body">' +
        '<div class="sgc-el">'+elemLabel+'</div>' +
        '<div class="sgc-name">'+escHtml(displayName)+'</div>' +
        '<div class="sgc-foot">' +
          '<div class="sgc-price">'+priceStr+'</div>' +
          (outOfStock
            ? '<div class="sgc-add" style="opacity:.4;pointer-events:none">'+outLabel+'</div>'
            : '<div class="sgc-add">'+addLabel+'</div>'
          ) +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  // Re-apply the active filter chip (default is "shui" per existing markup)
  setTimeout(function(){
    var activeChip = document.querySelector('#shop-chips .sh-chip.on');
    if(activeChip){
      var m = (activeChip.getAttribute('onclick')||'').match(/shopFilter\(['"]([^'"]+)['"]/);
      if(m && typeof shopFilter === 'function') shopFilter(m[1], activeChip);
    }
  }, 0);
}

/* ── PDP (product detail panel) ── */
function openPDPFromProduct(id){
  var p = (_shopProducts||[]).find(function(x){ return x.id === id; });
  if(!p) return;
  _currentPDP = p;
  var isZh = document.documentElement.lang === 'zh';

  var elemClass = p.element_class || 'shui';
  var displayName = isZh ? (p.name_zh || p.name) : p.name;

  // Populate existing PDP elements (kept from original hardcoded design)
  var elE = document.getElementById('pdp-elem');
  var nmE = document.getElementById('pdp-name');
  var prE = document.getElementById('pdp-price');
  var dsE = document.getElementById('pdp-desc');
  if(elE) elE.innerHTML = '<span class="'+elemClass+'">'+(p.element||'')+'</span>';
  if(nmE) nmE.textContent = displayName;
  if(prE) prE.textContent = p.price_display || '';
  if(dsE) dsE.textContent = p.description || '';

  // Main image (if PDP has an image slot)
  var pdpImg = document.getElementById('pdp-img');
  if(pdpImg){
    if(p.images && p.images[0]){
      pdpImg.innerHTML = '<img src="'+escAttr(p.images[0])+'" style="width:100%;height:100%;object-fit:cover">';
    }else{
      pdpImg.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:\'Cormorant Garamond\',serif;font-size:96px;color:rgba(0,0,0,.12)">'+(p.element||'·')+'</div>';
    }
  }

  // Size buttons — render from sizes_array with stock info
  var sizeHost = document.getElementById('pdp-sizes');
  if(sizeHost){
    if(p.sizes_array && p.sizes_array.length){
      sizeHost.innerHTML = p.sizes_array.map(function(s){
        var outStock = (s.qty||0) === 0;
        var title = outStock ? (isZh?'已售罄':'Sold out') : (isZh?'库存 '+s.qty:'Stock: '+s.qty);
        return '<div class="pdp-size'+(outStock?' out':'')+'" data-size="'+escAttr(s.size)+'" data-qty="'+s.qty+'" onclick="'+(outStock?'':'pickSize(this)')+'" title="'+title+'" style="'+(outStock?'opacity:.35;pointer-events:none;text-decoration:line-through':'')+'">'+escHtml(s.size)+'</div>';
      }).join('');
    } else {
      sizeHost.innerHTML = '';
    }
  }

  // Update the "Add to bag" button
  var addBtn = document.querySelector('#pdp-panel .btn-dark, #pdp-panel .pdp-add, #pdp-add');
  if(addBtn){
    addBtn.onclick = function(){ addCurrentPDPToCart(); };
    if(p.sizes_array && p.sizes_array.length && !p.has_stock){
      addBtn.style.opacity = '.4';
      addBtn.style.pointerEvents = 'none';
      addBtn.textContent = isZh ? '已售罄' : 'Sold out';
    } else {
      addBtn.style.opacity = '';
      addBtn.style.pointerEvents = '';
      addBtn.textContent = isZh ? '加入购物袋' : 'Add to bag';
    }
  }

  document.getElementById('pdp-overlay').classList.add('open');
  document.getElementById('pdp-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function addCurrentPDPToCart(){
  var p = _currentPDP;
  if(!p) return;
  var isZh = document.documentElement.lang === 'zh';
  // If product has sizes, require a selection
  var size = '';
  if(p.sizes_array && p.sizes_array.length){
    var picked = document.querySelector('#pdp-sizes .pdp-size.on');
    if(!picked){
      alert(isZh ? '请选择一个尺码' : 'Please select a size');
      return;
    }
    size = picked.getAttribute('data-size');
  }
  if(!p.price_id){
    alert(isZh ? '该商品暂未上架' : 'This product is not yet available');
    return;
  }
  if(typeof addToCart === 'function'){
    addToCart(p.price_id, (isZh?(p.name_zh||p.name):p.name), p.price_display || '', size, p.element||'');
  }
}

/* ── Helpers ── */
function escHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function escAttr(s){ return escHtml(s).replace(/"/g,'&quot;'); }

// Expose for console debugging
window._keSShop = { get products(){ return _shopProducts; }, reload: loadShopProducts };
