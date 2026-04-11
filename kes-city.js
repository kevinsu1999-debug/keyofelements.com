/*  kes-city.js  —  全球城市搜索
 *  调用 /api/city-search（服务端 Google Places）
 *  API key 不暴露在前端
 */

var _cityTimer = null;

document.addEventListener('DOMContentLoaded', function(){
  var input = document.getElementById('cityInput');
  var drop = document.getElementById('cityDrop');
  if(!input || !drop) return;

  // 移除旧的 oninput
  input.removeAttribute('oninput');

  input.addEventListener('input', function(){
    var val = this.value.trim();
    if(val.length < 2){ drop.classList.remove('show'); return; }

    clearTimeout(_cityTimer);
    _cityTimer = setTimeout(function(){ searchCity(val, drop); }, 400);
  });

  document.addEventListener('click', function(e){
    if(!e.target.closest('.f-field')) drop.classList.remove('show');
  });
});

async function searchCity(query, drop){
  try {
    var res = await fetch('/api/city-search?q=' + encodeURIComponent(query));
    var data = await res.json();

    if(!data.results || !data.results.length){
      drop.classList.remove('show');
      return;
    }

    drop.innerHTML = data.results.map(function(r){
      if(!r.lat) return '';
      return '<div class="city-option" onclick="pickCity(\'' +
        r.name.replace(/'/g, "\\'") + '\',' + r.lon + ',' + r.lat + ',' + (r.utc_offset||'null') + ')">' +
        r.name + '</div>';
    }).join('');

    drop.classList.add('show');
  } catch(e){
    console.error('City search failed:', e);
  }
}

function pickCity(name, lon, lat, tz){
  var input = document.getElementById('cityInput');
  input.value = name;
  input.dataset.lon = lon;
  input.dataset.lat = lat;
  document.getElementById('cityDrop').classList.remove('show');

  // 保存供 kesSubmit 使用
  CITY_COORDS[name] = [lon, lat];
  CITY_TZ[name] = tz !== null ? tz : Math.round(lon / 15);
}
