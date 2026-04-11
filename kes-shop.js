/*  kes-shop.js  —  购物车 + Stripe Checkout
 *  
 *  购物车存在 sessionStorage，刷新不丢失，关闭浏览器清空
 *  结账时调用 /api/create-checkout 创建 Stripe session
 */

var kesCart = JSON.parse(sessionStorage.getItem('kes_cart') || '[]');

/* ── 更新购物袋数字 ── */
function updateCartBadge(){
  var total = kesCart.reduce(function(sum, item){ return sum + item.quantity; }, 0);
  var badges = document.querySelectorAll('.nav-bag');
  var isZh = document.documentElement.lang === 'zh';
  badges.forEach(function(b){
    b.textContent = (isZh ? '购物袋' : 'Bag') + ' (' + total + ')';
    b.style.cursor = total > 0 ? 'pointer' : 'default';
  });
}

/* ── 加入购物车 ── */
function addToCart(priceId, name, price, size, element){
  if(!priceId){
    alert(document.documentElement.lang === 'zh' ? '该商品暂未上架' : 'This product is not yet available');
    return;
  }

  // 检查是否已有同款同尺码
  var existing = kesCart.find(function(item){
    return item.price_id === priceId && item.size === size;
  });

  if(existing){
    existing.quantity++;
  } else {
    kesCart.push({
      price_id: priceId,
      name: name,
      price: price,
      size: size || '',
      element: element || '',
      quantity: 1
    });
  }

  sessionStorage.setItem('kes_cart', JSON.stringify(kesCart));
  updateCartBadge();

  // 显示添加成功提示
  showCartToast(name);
}

/* ── 添加成功提示 ── */
function showCartToast(name){
  var isZh = document.documentElement.lang === 'zh';
  var toast = document.getElementById('cartToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(26,24,20,.92);color:#fff;padding:12px 24px;border-radius:100px;font-size:12px;letter-spacing:.04em;z-index:10001;opacity:0;transition:all .3s ease;pointer-events:none;backdrop-filter:blur(8px)';
    document.body.appendChild(toast);
  }
  toast.textContent = (isZh ? '已加入购物袋：' : 'Added to bag: ') + name;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(function(){
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2000);
}

/* ── 从购物车移除 ── */
function removeFromCart(index){
  kesCart.splice(index, 1);
  sessionStorage.setItem('kes_cart', JSON.stringify(kesCart));
  updateCartBadge();
  if(document.getElementById('cartDrawer')) showCartDrawer();
}

/* ── 修改数量 ── */
function updateCartQty(index, delta){
  kesCart[index].quantity += delta;
  if(kesCart[index].quantity <= 0) kesCart.splice(index, 1);
  sessionStorage.setItem('kes_cart', JSON.stringify(kesCart));
  updateCartBadge();
  if(document.getElementById('cartDrawer')) showCartDrawer();
}

/* ── 购物车抽屉 ── */
function showCartDrawer(){
  var isZh = document.documentElement.lang === 'zh';
  var drawer = document.getElementById('cartDrawer');
  if(!drawer){
    drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:min(400px,90vw);background:#fff;z-index:10001;box-shadow:-8px 0 40px rgba(0,0,0,.12);transform:translateX(100%);transition:transform .3s ease;display:flex;flex-direction:column';
    document.body.appendChild(drawer);

    var overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:10000;opacity:0;transition:opacity .3s';
    overlay.onclick = closeCartDrawer;
    document.body.appendChild(overlay);
  }

  var total = 0;
  var itemsHtml = '';
  if(kesCart.length === 0){
    itemsHtml = '<div style="text-align:center;padding:60px 20px;color:#98958f">' +
      '<div style="font-size:28px;margin-bottom:12px">🛍</div>' +
      '<div style="font-size:13px">' + (isZh ? '购物袋是空的' : 'Your bag is empty') + '</div></div>';
  } else {
    kesCart.forEach(function(item, i){
      total += parseFloat(item.price.replace(/[^0-9.]/g, '')) * item.quantity;
      itemsHtml += '<div style="display:flex;gap:14px;padding:16px 24px;border-bottom:1px solid #edeae5;align-items:center">' +
        '<div style="flex:1">' +
          '<div style="font-size:13px;font-weight:600;color:#1a1814">' + item.name + '</div>' +
          (item.size ? '<div style="font-size:11px;color:#98958f;margin-top:2px">' + (isZh?'尺码: ':'Size: ') + item.size + '</div>' : '') +
          '<div style="font-size:13px;color:#52504c;margin-top:4px">' + item.price + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<button onclick="updateCartQty('+i+',-1)" style="width:28px;height:28px;border:1px solid #dedad4;border-radius:6px;background:none;cursor:pointer;font-size:14px;color:#52504c">−</button>' +
          '<span style="font-size:13px;min-width:20px;text-align:center">' + item.quantity + '</span>' +
          '<button onclick="updateCartQty('+i+',1)" style="width:28px;height:28px;border:1px solid #dedad4;border-radius:6px;background:none;cursor:pointer;font-size:14px;color:#52504c">+</button>' +
        '</div>' +
        '<button onclick="removeFromCart('+i+')" style="background:none;border:none;cursor:pointer;font-size:16px;color:#c8c5be;padding:4px">✕</button>' +
      '</div>';
    });
  }

  drawer.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #edeae5">' +
      '<div style="font-size:14px;font-weight:600;letter-spacing:.06em">' + (isZh?'购物袋':'Shopping Bag') + ' (' + kesCart.length + ')</div>' +
      '<button onclick="closeCartDrawer()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#98958f">✕</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto">' + itemsHtml + '</div>' +
    (kesCart.length > 0 ?
      '<div style="padding:20px 24px;border-top:1px solid #edeae5">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:14px"><span style="color:#98958f">' + (isZh?'合计':'Total') + '</span><span style="font-weight:700">' + (kesCart[0].price.match(/[^0-9.]/)?.[0]||'¥') + total.toFixed(2) + '</span></div>' +
        '<button onclick="checkout()" style="width:100%;padding:14px;background:#1a1814;color:#fff;border:none;border-radius:100px;font-size:12px;font-weight:600;letter-spacing:.1em;cursor:pointer;font-family:inherit">' + (isZh?'结算':'Checkout') + ' →</button>' +
      '</div>' : '');

  setTimeout(function(){
    drawer.style.transform = 'translateX(0)';
    document.getElementById('cartOverlay').style.opacity = '1';
  }, 10);
}

function closeCartDrawer(){
  var drawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if(drawer) drawer.style.transform = 'translateX(100%)';
  if(overlay) overlay.style.opacity = '0';
  setTimeout(function(){
    if(overlay) overlay.remove();
    if(drawer) drawer.remove();
  }, 300);
}

/* ── 结算：调用 Stripe Checkout ── */
async function checkout(){
  if(kesCart.length === 0) return;

  var isZh = document.documentElement.lang === 'zh';

  // 检查是否所有商品都有 price_id
  var missingPrice = kesCart.find(function(item){ return !item.price_id; });
  if(missingPrice){
    alert(isZh ? '部分商品暂未上架，请移除后重试' : 'Some items are not yet available. Please remove them and try again.');
    return;
  }

  var items = kesCart.map(function(item){
    return { price_id: item.price_id, quantity: item.quantity };
  });

  try {
    var res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items,
        success_url: window.location.origin + (isZh ? '/cn' : '/en') + '?payment=success',
        cancel_url: window.location.origin + (isZh ? '/cn' : '/en') + '?payment=cancel',
        customer_email: kesUser ? kesUser.email : undefined,
        locale: isZh ? 'zh' : 'en'
      })
    });

    var data = await res.json();
    if(data.url){
      // 清空购物车
      kesCart = [];
      sessionStorage.setItem('kes_cart', JSON.stringify(kesCart));
      // 跳转到 Stripe Checkout
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Checkout failed');
    }
  } catch(err){
    console.error('Checkout error:', err);
    alert(isZh ? '结算出错，请稍后重试：' + err.message : 'Checkout error: ' + err.message);
  }
}

/* ── 绑定购物袋点击 ── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.nav-bag').forEach(function(b){
    b.onclick = function(){ showCartDrawer(); };
  });
  updateCartBadge();
});
