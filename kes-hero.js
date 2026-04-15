/* kes-hero.js — loads the 4 homepage editorial photos from Supabase Storage.
 * Files live at: <SUPABASE_URL>/storage/v1/object/public/page-images/home_<n>.jpg
 * On admin upload, we use the same fixed key so the public URL stays stable.
 * Cache-bust query string `?v=<timestamp>` is appended on each page load so
 * a fresh upload appears immediately without needing CDN purge.
 *
 * Defensive: if KES_CONFIG isn't defined yet (e.g. kes-hero.js accidentally
 * parses before kes-config.js), we retry for ~3 seconds rather than silently
 * giving up.
 */
(function(){
  var attempts = 0;
  function run(){
    if(typeof window.KES_CONFIG === 'undefined' || !window.KES_CONFIG.SUPABASE_URL){
      if(++attempts > 30) return; // ~3s total
      setTimeout(run, 100);
      return;
    }
    var base = window.KES_CONFIG.SUPABASE_URL.replace(/\/$/,'') + '/storage/v1/object/public/page-images/';
    var v = '?v=' + Math.floor(Date.now()/60000);
    for(var i=1; i<=4; i++){
      (function(n){
        var img = document.getElementById('home-hero-'+n);
        if(!img) return;
        var url = base + 'home_' + n + '.jpg' + v;
        img.onload = function(){
          var cell = img.closest('.ed-cell');
          if(cell) cell.setAttribute('data-loaded','1');
        };
        img.onerror = function(){
          var pngUrl = base + 'home_' + n + '.png' + v;
          if(img.src.indexOf('.jpg') >= 0){
            img.src = pngUrl;
          }
        };
        img.src = url;
      })(i);
    }
  }
  run();
})();
