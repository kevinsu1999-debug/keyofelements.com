/*  kes-city.js  —  全球城市智能搜索
 *  直接调用 OpenStreetMap Nominatim（免费，无需API key）
 *  支持中文、英文、拼音模糊搜索
 *  覆盖全球所有城市
 */

var _cityTimer = null;

document.addEventListener('DOMContentLoaded', function(){
  var input = document.getElementById('cityInput');
  var drop = document.getElementById('cityDrop');
  if(!input || !drop) return;

  // 覆盖旧的 oninput
  input.removeAttribute('oninput');
  input.setAttribute('autocomplete', 'off');

  input.addEventListener('input', function(){
    var val = this.value.trim();
    if(val.length < 2){ drop.classList.remove('show'); return; }
    clearTimeout(_cityTimer);
    _cityTimer = setTimeout(function(){ searchCities(val, drop); }, 350);
  });

  input.addEventListener('focus', function(){
    var val = this.value.trim();
    if(val.length >= 2) searchCities(val, drop);
  });

  document.addEventListener('click', function(e){
    if(!e.target.closest('.f-field')) drop.classList.remove('show');
  });
});

async function searchCities(query, drop){
  // 同时搜索中文和英文结果
  var isZh = document.documentElement.lang === 'zh';
  var lang = isZh ? 'zh' : 'en';

  try {
    var url = 'https://nominatim.openstreetmap.org/search?' +
      'q=' + encodeURIComponent(query) +
      '&format=json&limit=8' +
      '&featuretype=city' +
      '&addressdetails=1' +
      '&accept-language=' + lang + ',en,zh';

    var res = await fetch(url);
    if(!res.ok) throw new Error('API error');
    var data = await res.json();

    if(!data || !data.length){
      // 尝试不限制 featuretype
      var url2 = 'https://nominatim.openstreetmap.org/search?' +
        'q=' + encodeURIComponent(query) +
        '&format=json&limit=8' +
        '&addressdetails=1' +
        '&accept-language=' + lang + ',en,zh';
      var res2 = await fetch(url2);
      data = await res2.json();
    }

    if(!data || !data.length){
      drop.classList.remove('show');
      return;
    }

    // 过滤并格式化结果
    var seen = {};
    var results = [];
    data.forEach(function(item){
      var addr = item.address || {};
      var city = addr.city || addr.town || addr.village || addr.county || addr.state || item.name || '';
      var country = addr.country || '';
      var state = addr.state || '';

      if(!city) return;

      // 去重
      var key = city.toLowerCase();
      if(seen[key]) return;
      seen[key] = true;

      // 组合显示名称
      var display = city;
      if(state && state !== city) display += ', ' + state;
      if(country) display += ' · ' + country;

      results.push({
        name: display,
        shortName: city,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      });
    });

    if(!results.length){
      drop.classList.remove('show');
      return;
    }

    // 渲染下拉
    drop.innerHTML = results.map(function(r){
      return '<div class="city-option" onclick="pickCity(\'' +
        r.name.replace(/'/g, "\\'") + '\',\'' +
        r.shortName.replace(/'/g, "\\'") + '\',' +
        r.lon + ',' + r.lat + ')">' +
        '<span style="font-weight:500;color:#1a1814">' + r.shortName + '</span>' +
        '<span style="color:#98958f;font-size:11px;margin-left:6px">' +
        r.name.replace(r.shortName + ', ', '').replace(r.shortName + ' · ', '') +
        '</span></div>';
    }).join('');
    drop.classList.add('show');

  } catch(e){
    console.warn('City search error:', e);
    // 回退到本地搜索
    fallbackSearch(query, drop);
  }
}

/* 本地回退搜索 */
function fallbackSearch(query, drop){
  if(typeof CITY_COORDS === 'undefined') return;
  var ql = query.toLowerCase();
  var results = [];
  for(var key in CITY_COORDS){
    if(key.toLowerCase().indexOf(ql) >= 0){
      results.push(key);
    }
  }
  if(!results.length){ drop.classList.remove('show'); return; }

  drop.innerHTML = results.slice(0, 6).map(function(name){
    var c = CITY_COORDS[name];
    return '<div class="city-option" onclick="pickCity(\'' +
      name.replace(/'/g, "\\'") + '\',\'' +
      name.replace(/'/g, "\\'") + '\',' +
      c[0] + ',' + c[1] + ')">' + name + '</div>';
  }).join('');
  drop.classList.add('show');
}

/* 选择城市 */
function pickCity(displayName, shortName, lon, lat){
  var input = document.getElementById('cityInput');
  input.value = shortName;
  input.dataset.lon = lon;
  input.dataset.lat = lat;
  document.getElementById('cityDrop').classList.remove('show');

  // 保存坐标供 kesSubmit 使用
  if(typeof CITY_COORDS !== 'undefined') CITY_COORDS[shortName] = [lon, lat];
  if(typeof CITY_TZ !== 'undefined') CITY_TZ[shortName] = Math.round(lon / 15);
}
