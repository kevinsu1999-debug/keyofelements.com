/*  kes-content.js — applies admin-editable text + banner images to the page.
 *
 *  Text: any element with `data-text="<key>"` gets its innerHTML replaced
 *        with the stored text (in the site's current language).
 *        Newlines in the stored text are converted to <br>.
 *        If no value stored, the HTML default is preserved — so uploading
 *        a blank value via admin reverts to the hardcoded fallback
 *        (admin "Reset" button deletes the row entirely).
 *
 *  Banners: any <img data-banner="<key>"> gets its src set to the
 *           Supabase public URL for that banner. If the image 404s,
 *           the <img> hides itself so no broken-image icon appears.
 *           Cache-bust param ?v=<minute> so admin re-uploads propagate
 *           within ~60s even without CDN purge.
 */
(function(){
  var lang = document.documentElement.lang === 'en' ? 'en' : 'zh';
  var v = '?v=' + Math.floor(Date.now()/60000);

  function apply(data){
    // Text overrides
    (data.texts || []).forEach(function(t){
      var els = document.querySelectorAll('[data-text="'+t.key+'"]');
      if(!els.length) return;
      var raw = lang === 'en' ? t.en : t.zh;
      if(raw == null || raw === '') return; // empty = keep HTML default
      // Convert plain-text newlines to <br>. Consecutive newlines → paragraph break.
      var html = String(raw)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>');
      if(html.indexOf('</p><p>') >= 0) html = '<p>' + html + '</p>';
      els.forEach(function(el){ el.innerHTML = html; });
    });

    // Banner image overrides — set src only if image loads successfully
    Object.keys(data.banners || {}).forEach(function(key){
      var els = document.querySelectorAll('img[data-banner="'+key+'"]');
      if(!els.length) return;
      var probe = new Image();
      probe.onload = function(){
        els.forEach(function(img){
          img.src = data.banners[key] + v;
          // Signal parent wrapper so CSS can reveal it
          var wrap = img.closest('[data-banner-wrap]');
          if(wrap) wrap.setAttribute('data-banner-loaded','1');
        });
      };
      probe.onerror = function(){
        // Leave img without src; parent wrap stays hidden via CSS
      };
      probe.src = data.banners[key] + v;
    });
  }

  // Fetch and apply. Fails silently if API is down — page stays on defaults.
  fetch('/api/site-content')
    .then(function(r){ return r.json(); })
    .then(apply)
    .catch(function(err){ console.warn('site-content fetch failed:', err); });
})();
