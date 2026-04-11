/*  kes-city.js  —  智能城市搜索 + 地理编码
 *  使用 Nominatim (OpenStreetMap) 免费 API
 *  支持中英文模糊搜索，覆盖全球所有城市
 */

var _citySearchTimer = null;
var _cityCache = {};

/* 初始化城市搜索 */
function initCitySearch(){
  var input = document.getElementById('cityInput');
  var drop = document.getElementById('cityDrop');
  if(!input || !drop) return;

  // 移除旧的 oninput
  input.removeAttribute('oninput');

  input.addEventListener('input', function(){
    var val = this.value.trim();
    if(val.length < 2){ drop.classList.remove('show'); return; }

    // 先从本地缓存和内置列表匹配
    var localResults = searchLocal(val);
    if(localResults.length > 0){
      showDropdown(localResults, drop);
    }

    // 延迟搜索远程 API
    clearTimeout(_citySearchTimer);
    _citySearchTimer = setTimeout(function(){ searchRemote(val, drop, localResults); }, 400);
  });

  // 点击外部关闭
  document.addEventListener('click', function(e){
    if(!e.target.closest('.f-field')) drop.classList.remove('show');
  });
}

/* 本地搜索（内置城市列表） */
function searchLocal(query){
  var q = query.toLowerCase();
  var results = [];
  for(var key in CITY_COORDS){
    if(key.toLowerCase().indexOf(q) >= 0){
      results.push({ name: key, lon: CITY_COORDS[key][0], lat: CITY_COORDS[key][1] });
    }
  }
  return results.slice(0, 4);
}

/* 远程搜索（Nominatim API） */
async function searchRemote(query, drop, existingResults){
  if(_cityCache[query]){
    showDropdown(mergeResults(existingResults, _cityCache[query]), drop);
    return;
  }

  try {
    var url = 'https://nominatim.openstreetmap.org/search?q=' + 
      encodeURIComponent(query) + 
      '&format=json&limit=6&featuretype=city&accept-language=zh,en';
    
    var res = await fetch(url, {
      headers: { 'User-Agent': 'KES-KeyOfElements/1.0' }
    });
    var data = await res.json();

    var remoteResults = data.map(function(item){
      // 提取城市名和国家
      var parts = item.display_name.split(',').map(function(s){return s.trim()});
      var cityName = parts[0];
      var country = parts[parts.length - 1] || '';
      var display = cityName + (country ? ' · ' + country : '');
      return {
        name: display,
        lon: parseFloat(item.lon),
        lat: parseFloat(item.lat),
        raw: item.display_name
      };
    });

    _cityCache[query] = remoteResults;
    showDropdown(mergeResults(existingResults, remoteResults), drop);
  } catch(e){
    console.error('City search error:', e);
    // 失败时只显示本地结果
    if(existingResults.length > 0) showDropdown(existingResults, drop);
  }
}

/* 合并结果，去重 */
function mergeResults(local, remote){
  var seen = {};
  var merged = [];
  local.forEach(function(r){ 
    var key = r.name.toLowerCase();
    if(!seen[key]){ seen[key] = true; merged.push(r); }
  });
  remote.forEach(function(r){
    var key = r.name.toLowerCase().split('·')[0].trim();
    if(!seen[key]){ seen[key] = true; merged.push(r); }
  });
  return merged.slice(0, 8);
}

/* 显示下拉 */
function showDropdown(results, drop){
  if(!results.length){ drop.classList.remove('show'); return; }
  drop.innerHTML = results.map(function(r){
    return '<div class="city-option" onclick="selectCity(\'' + 
      r.name.replace(/'/g, "\\'") + '\',' + r.lon + ',' + r.lat + ')">' + 
      r.name + '</div>';
  }).join('');
  drop.classList.add('show');
}

/* 选择城市 — 保存坐标 */
function selectCity(name, lon, lat){
  var input = document.getElementById('cityInput');
  input.value = name;
  input.dataset.lon = lon;
  input.dataset.lat = lat;
  document.getElementById('cityDrop').classList.remove('show');

  // 同时更新 CITY_COORDS 供 kesSubmit 使用
  CITY_COORDS[name] = [lon, lat];

  // 推算时区（简易：经度/15）
  var tz = Math.round(lon / 15);
  CITY_TZ[name] = tz;
}

/* 页面加载后初始化 */
document.addEventListener('DOMContentLoaded', initCitySearch);
