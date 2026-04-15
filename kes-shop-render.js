/*  kes-shop-render.js — Dynamic shop + PDP rendering from Stripe
 *  Fetches /api/products, renders into #shop-grid, powers PDP.
 *  Keeps the existing filter chips working via data-e attribute on .sgc.
 *  Keeps the existing .pdp-* layout in the product detail panel.
 */

var _shopProducts = null;   // in-memory cache from /api/products
var _shopLoading = false;
var _currentPDP = null;     // product being shown in PDP
var _filterElement = 'all'; // 'all' | 'shui' | 'jin' | 'mu' | 'huo' | 'tu'
var _filterCategory = 'all';// 'all' | 'clothing' | 'accessory' | 'life' | 'service' | 'other'
var _filterYinYang = 'all'; // 'all' | 'yin' | 'yang'
var _shuffleOrder = null;   // cached random ordering for current session

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', function(){
  injectCategoryChips();
  appendYinYangToElementRow();
  resetFilterChipState();
  // Override the global shopFilter (originally defined in index.html for hardcoded products).
  // Element + Yin/Yang live in the same row but are independent filter dimensions
  // — scoped by data-dim so clicking one doesn't deselect the other.
  window.shopFilter = function(e, btn){
    _filterElement = e;
    document.querySelectorAll('#shop-chips .sh-chip[data-dim="elem"]').forEach(function(b){ b.classList.remove('on'); });
    if(btn) btn.classList.add('on');
    renderShopGrid();
  };
  window.shopFilterCat = function(c, btn){
    _filterCategory = c;
    document.querySelectorAll('#shop-chips-cat .sh-chip').forEach(function(b){ b.classList.remove('on'); });
    if(btn) btn.classList.add('on');
    renderShopGrid();
  };
  // Click-to-toggle behavior for Yin/Yang: clicking an already-active chip clears
  // the filter. Clicking the other switches. There is no explicit "All" chip.
  window.shopFilterYY = function(y, btn){
    if(_filterYinYang === y){
      _filterYinYang = 'all';
      if(btn) btn.classList.remove('on');
    } else {
      _filterYinYang = y;
      document.querySelectorAll('#shop-chips .sh-chip[data-dim="yy"]').forEach(function(b){ b.classList.remove('on'); });
      if(btn) btn.classList.add('on');
    }
    renderShopGrid();
  };
  loadShopProducts();
});

/* Inject a second chip row for category filter, right under the element chips. */
function injectCategoryChips(){
  var elemChips = document.getElementById('shop-chips');
  if(!elemChips) return;
  // Avoid double injection
  if(document.getElementById('shop-chips-cat')) return;
  var isZh = document.documentElement.lang === 'zh';
  var CATS = isZh
    ? [['all','全部'],['clothing','服饰'],['accessory','配饰'],['life','生活'],['service','服务'],['other','其他']]
    : [['all','All'],['clothing','Clothing'],['accessory','Accessory'],['life','Life'],['service','Service'],['other','Other']];
  var row = document.createElement('div');
  row.className = 'sh-chips';
  row.id = 'shop-chips-cat';
  row.innerHTML = CATS.map(function(c, i){
    return '<button class="sh-chip'+(i===0?' on':'')+'" onclick="shopFilterCat(\''+c[0]+'\',this)">'+c[1]+'</button>';
  }).join('');
  // Insert as a sibling after #shop-chips. Parent (.sh-chip-rows) is a column
  // flex so the new row stacks below the element row with proper gap.
  elemChips.parentNode.insertBefore(row, elemChips.nextSibling);
}

/* Append 阴/阳 Yin/Yang chips to the end of the element row.
   They share the row with element chips visually, but are tracked as a separate
   filter dimension via data-dim="yy". Existing element chips get data-dim="elem"
   tagged on the fly so the click handlers can scope their "remove on" selector. */
function appendYinYangToElementRow(){
  var elemChips = document.getElementById('shop-chips');
  if(!elemChips) return;
  // Tag existing element chips so filter handlers can scope by dimension.
  elemChips.querySelectorAll('.sh-chip').forEach(function(b){
    if(!b.dataset.dim) b.dataset.dim = 'elem';
  });
  // Avoid double append
  if(elemChips.querySelector('.yy-yin')) return;
  var isZh = document.documentElement.lang === 'zh';
  var yinLabel = isZh ? '阴' : 'Yin';
  var yangLabel = isZh ? '阳' : 'Yang';
  var yin = document.createElement('button');
  yin.className = 'sh-chip yy-yin';
  yin.dataset.dim = 'yy';
  yin.setAttribute('onclick', "shopFilterYY('yin',this)");
  yin.innerHTML = '<span>'+yinLabel+'</span>';
  var yang = document.createElement('button');
  yang.className = 'sh-chip yy-yang';
  yang.dataset.dim = 'yy';
  yang.setAttribute('onclick', "shopFilterYY('yang',this)");
  yang.innerHTML = '<span>'+yangLabel+'</span>';
  elemChips.appendChild(yin);
  elemChips.appendChild(yang);
}

/* Force the "All" element chip to be active by default (was hardcoded as 水/water). */
function resetFilterChipState(){
  var chips = document.querySelectorAll('#shop-chips .sh-chip');
  chips.forEach(function(b){ b.classList.remove('on'); });
  // First chip in the row is the "All / 全部" button per existing HTML
  var allChip = chips[0];
  if(allChip) allChip.classList.add('on');
}

/* Fisher-Yates shuffle (in place) */
function shuffleArr(a){
  for(var i=a.length-1;i>0;i--){
    var j = Math.floor(Math.random()*(i+1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

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

  // ── Filter: by element AND category AND yin/yang ──
  var filtered = _shopProducts.filter(function(p){
    var elemClass = p.element_class || {'水':'shui','木':'mu','火':'huo','土':'tu','金':'jin'}[p.element] || '';
    var elemOk = (_filterElement === 'all') || (elemClass === _filterElement);
    var catOk  = (_filterCategory === 'all') || ((p.category || '') === _filterCategory);
    var yyOk   = (_filterYinYang === 'all') || ((p.yinyang || '') === _filterYinYang);
    return elemOk && catOk && yyOk;
  });

  // ── Sort ──
  // Default (all filters 'all'): random order, cached for the session so
  // re-renders don't reshuffle while the user is browsing.
  // Any specific filter applied: alphabetical by display name.
  var sorted;
  if(_filterElement === 'all' && _filterCategory === 'all' && _filterYinYang === 'all'){
    if(!_shuffleOrder || _shuffleOrder.length !== _shopProducts.length){
      _shuffleOrder = _shopProducts.map(function(p){ return p.id; });
      shuffleArr(_shuffleOrder);
    }
    var idxOf = {};
    _shuffleOrder.forEach(function(id, i){ idxOf[id] = i; });
    sorted = filtered.slice().sort(function(a,b){ return (idxOf[a.id]||0) - (idxOf[b.id]||0); });
  } else {
    sorted = filtered.slice().sort(function(a,b){
      var na = String(isZh ? (a.name_zh || a.name) : a.name).toLowerCase();
      var nb = String(isZh ? (b.name_zh || b.name) : b.name).toLowerCase();
      return na.localeCompare(nb);
    });
  }

  if(!sorted.length){
    grid.innerHTML = '<div class="shop-empty" style="grid-column:1/-1;padding:60px 20px;text-align:center;color:var(--t3)"><div style="font-size:13px">'+(isZh?'当前筛选下没有商品':'No products match the current filter')+'</div></div>';
    return;
  }

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
  // Pick description by language: ZH site → description_zh (fallback EN), EN site → description (fallback ZH)
  var displayDesc = isZh ? (p.description_zh || p.description || '') : (p.description || p.description_zh || '');
  if(dsE) dsE.textContent = displayDesc;

  // Image carousel — render all images with dots + nav + swipe
  renderPDPCarousel(p.images || [], p.element || '·');

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

/* ═══════════════════════════════════════════════════════════
   PDP Image Carousel + Lightbox
   ═══════════════════════════════════════════════════════════ */
var _pdpImages = [];
var _pdpIdx = 0;
var _lbIdx = 0;

function renderPDPCarousel(images, fallbackChar){
  _pdpImages = (images || []).filter(Boolean);
  _pdpIdx = 0;
  var track = document.getElementById('pdp-img-track');
  var dots = document.getElementById('pdp-img-dots');
  if(!track) return;

  if(!_pdpImages.length){
    track.innerHTML = '<div class="pdp-img-slide"><div style="font-family:\'Cormorant Garamond\',serif;font-size:96px;color:rgba(0,0,0,.12)">'+escHtml(fallbackChar||'·')+'</div></div>';
    if(dots) dots.innerHTML = '';
    updatePDPNav();
    track.style.transform = 'translateX(0)';
    return;
  }

  track.innerHTML = _pdpImages.map(function(src, i){
    return '<div class="pdp-img-slide"><img src="'+escAttr(src)+'" alt="" loading="'+(i===0?'eager':'lazy')+'" onclick="openLightbox('+i+')"></div>';
  }).join('');

  if(dots){
    dots.innerHTML = _pdpImages.length > 1
      ? _pdpImages.map(function(_, i){
          return '<div class="pdp-img-dot'+(i===0?' on':'')+'" onclick="goToPDPImage('+i+')"></div>';
        }).join('')
      : '';
  }
  track.style.transform = 'translateX(0)';
  updatePDPNav();
}

function goToPDPImage(i){
  if(!_pdpImages.length) return;
  i = Math.max(0, Math.min(_pdpImages.length - 1, i));
  _pdpIdx = i;
  var track = document.getElementById('pdp-img-track');
  if(track) track.style.transform = 'translateX(' + (-i * 100) + '%)';
  document.querySelectorAll('.pdp-img-dot').forEach(function(d, j){
    d.classList.toggle('on', j === i);
  });
  updatePDPNav();
}
function nextPDPImage(){ goToPDPImage(_pdpIdx + 1); }
function prevPDPImage(){ goToPDPImage(_pdpIdx - 1); }
function updatePDPNav(){
  var prev = document.getElementById('pdp-img-prev');
  var next = document.getElementById('pdp-img-next');
  var n = _pdpImages.length;
  if(!prev || !next) return;
  if(n <= 1){
    prev.style.display = 'none';
    next.style.display = 'none';
  } else {
    prev.style.display = '';
    next.style.display = '';
    prev.disabled = _pdpIdx === 0;
    next.disabled = _pdpIdx === n - 1;
  }
}
window.goToPDPImage = goToPDPImage;
window.nextPDPImage = nextPDPImage;
window.prevPDPImage = prevPDPImage;

/* ── Lightbox (full-screen image viewer) ── */
function openLightbox(startIdx){
  if(!_pdpImages.length) return;
  _lbIdx = Math.max(0, Math.min(_pdpImages.length - 1, startIdx || 0));
  var track = document.getElementById('pdp-lb-track');
  var dots = document.getElementById('pdp-lb-dots');
  var counter = document.getElementById('pdp-lb-counter');
  var lb = document.getElementById('pdp-lightbox');
  if(!track || !lb) return;

  track.innerHTML = _pdpImages.map(function(src){
    return '<div class="pdp-lb-slide"><img src="'+escAttr(src)+'" alt="" data-zoom="1"></div>';
  }).join('');

  if(dots){
    dots.innerHTML = _pdpImages.length > 1
      ? _pdpImages.map(function(_, i){
          return '<div class="pdp-lb-dot'+(i===_lbIdx?' on':'')+'"></div>';
        }).join('')
      : '';
  }
  if(counter && _pdpImages.length > 1){
    counter.textContent = (_lbIdx+1) + ' / ' + _pdpImages.length;
  } else if(counter){
    counter.textContent = '';
  }

  lb.classList.add('open');
  // Position track immediately (no animation on open)
  track.style.transition = 'none';
  track.style.transform = 'translateX(' + (-_lbIdx * 100) + '%)';
  // Restore transition next frame
  requestAnimationFrame(function(){
    track.style.transition = '';
  });
  document.body.style.overflow = 'hidden';
}

function closeLightbox(){
  var lb = document.getElementById('pdp-lightbox');
  if(!lb) return;
  lb.classList.remove('open');
  // Reset any zoom state
  document.querySelectorAll('.pdp-lb-slide img').forEach(function(img){
    img.style.transform = '';
    img.dataset.zoom = '1';
  });
  // Only restore body scroll if PDP panel is also closed
  var panel = document.getElementById('pdp-panel');
  if(!panel || !panel.classList.contains('open')){
    document.body.style.overflow = '';
  }
}

function goToLightboxImage(i){
  if(!_pdpImages.length) return;
  i = Math.max(0, Math.min(_pdpImages.length - 1, i));
  _lbIdx = i;
  var track = document.getElementById('pdp-lb-track');
  if(track) track.style.transform = 'translateX(' + (-i * 100) + '%)';
  document.querySelectorAll('.pdp-lb-dot').forEach(function(d, j){
    d.classList.toggle('on', j === i);
  });
  var counter = document.getElementById('pdp-lb-counter');
  if(counter && _pdpImages.length > 1){
    counter.textContent = (_lbIdx+1) + ' / ' + _pdpImages.length;
  }
  // Reset zoom on previous slide when navigating
  document.querySelectorAll('.pdp-lb-slide img').forEach(function(img){
    img.style.transform = '';
    img.dataset.zoom = '1';
  });
}
function nextLightboxImage(){ goToLightboxImage(_lbIdx + 1); }
function prevLightboxImage(){ goToLightboxImage(_lbIdx - 1); }

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

/* ── Touch swipe + double-tap zoom ── */
(function initInteractions(){
  function attachSwipe(el, onNext, onPrev, options){
    options = options || {};
    var startX = 0, startY = 0, dx = 0, dy = 0, tracking = false, t0 = 0;
    el.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1){ tracking = false; return; }
      // Skip swipe if on zoomed image
      if(options.skipIfZoomed){
        var img = e.target.closest('.pdp-lb-slide img');
        if(img && img.dataset.zoom !== '1'){ tracking = false; return; }
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0; dy = 0;
      t0 = Date.now();
      tracking = true;
    }, {passive: true});
    el.addEventListener('touchmove', function(e){
      if(!tracking) return;
      dx = e.touches[0].clientX - startX;
      dy = e.touches[0].clientY - startY;
      // Vertical scroll dominant → cancel
      if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12){ tracking = false; }
    }, {passive: true});
    el.addEventListener('touchend', function(){
      if(!tracking) return;
      tracking = false;
      var dt = Date.now() - t0;
      // Treat as swipe if moved >40px or fast flick
      if(Math.abs(dx) > 40 || (Math.abs(dx) > 20 && dt < 250)){
        if(dx < 0) onNext();
        else onPrev();
      }
    });
  }

  function init(){
    var pdpImg = document.getElementById('pdp-img');
    if(pdpImg && !pdpImg.dataset.swipeBound){
      attachSwipe(pdpImg, nextPDPImage, prevPDPImage);
      pdpImg.dataset.swipeBound = '1';
    }
    var lb = document.getElementById('pdp-lightbox');
    if(lb && !lb.dataset.swipeBound){
      attachSwipe(lb, nextLightboxImage, prevLightboxImage, {skipIfZoomed:true});
      lb.dataset.swipeBound = '1';

      // Double-tap to toggle zoom
      var lastTap = 0;
      lb.addEventListener('click', function(e){
        var img = e.target.closest('.pdp-lb-slide img');
        if(!img) return;
        var now = Date.now();
        if(now - lastTap < 320){
          // Double-tap: toggle zoom
          if(img.dataset.zoom === '1'){
            img.style.transform = 'scale(2.2)';
            img.dataset.zoom = '2.2';
            img.style.cursor = 'zoom-out';
          } else {
            img.style.transform = '';
            img.dataset.zoom = '1';
            img.style.cursor = 'zoom-in';
          }
          lastTap = 0;
        } else {
          lastTap = now;
        }
      });
    }
    // Keyboard nav
    if(!window._pdpKeyBound){
      window._pdpKeyBound = true;
      document.addEventListener('keydown', function(e){
        var lbOpen = document.getElementById('pdp-lightbox');
        var pnl = document.getElementById('pdp-panel');
        if(lbOpen && lbOpen.classList.contains('open')){
          if(e.key === 'Escape') closeLightbox();
          else if(e.key === 'ArrowRight') nextLightboxImage();
          else if(e.key === 'ArrowLeft') prevLightboxImage();
        } else if(pnl && pnl.classList.contains('open')){
          if(e.key === 'Escape' && typeof closePDP === 'function') closePDP();
          else if(e.key === 'ArrowRight') nextPDPImage();
          else if(e.key === 'ArrowLeft') prevPDPImage();
        }
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
