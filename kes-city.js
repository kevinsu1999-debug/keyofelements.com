/*  kes-city.js  —  Global City Autocomplete (v2)
 *  Uses OpenStreetMap Nominatim (free, no API key)
 *  Supports: cityInput (birth) + residenceCity (current)
 *  Detects country from residence city → passed to API
 */

var _cityTimer = null;
var _resTimer = null;
var _resCountry = 'CN';  // default country, updated when residence city selected

document.addEventListener('DOMContentLoaded', function(){
  var isEn = document.documentElement.lang === 'en';
  
  // ── Birth city autocomplete ──
  _setupCityInput('cityInput', 'cityDrop', function(r){
    var input = document.getElementById('cityInput');
    input.value = r.shortName;
    input.dataset.lon = r.lon;
    input.dataset.lat = r.lat;
    document.getElementById('cityDrop').classList.remove('show');
  });

  // ── Residence city autocomplete ──
  var resInput = document.getElementById('residenceCity');
  if(resInput){
    // Create dropdown if it doesn't exist
    var resDrop = document.getElementById('resDrop');
    if(!resDrop){
      resDrop = document.createElement('div');
      resDrop.className = 'city-dropdown';
      resDrop.id = 'resDrop';
      resInput.parentNode.style.position = 'relative';
      resInput.parentNode.appendChild(resDrop);
    }
    
    _setupCityInput('residenceCity', 'resDrop', function(r){
      var input = document.getElementById('residenceCity');
      input.value = r.shortName;
      input.dataset.country = r.country || 'CN';
      _resCountry = r.country || 'CN';
      document.getElementById('resDrop').classList.remove('show');
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', function(e){
    if(!e.target.closest('.f-field')){
      var d1 = document.getElementById('cityDrop');
      var d2 = document.getElementById('resDrop');
      if(d1) d1.classList.remove('show');
      if(d2) d2.classList.remove('show');
    }
  });
});

function _setupCityInput(inputId, dropId, onPick){
  var input = document.getElementById(inputId);
  var drop = document.getElementById(dropId);
  if(!input || !drop) return;

  input.removeAttribute('oninput');
  input.setAttribute('autocomplete', 'off');

  var timer = null;
  input.addEventListener('input', function(){
    var val = this.value.trim();
    if(val.length < 2){ drop.classList.remove('show'); return; }
    clearTimeout(timer);
    timer = setTimeout(function(){ _searchCities(val, drop, onPick); }, 350);
  });

  input.addEventListener('focus', function(){
    var val = this.value.trim();
    if(val.length >= 2) _searchCities(val, drop, onPick);
  });
}

async function _searchCities(query, drop, onPick){
  var isEn = document.documentElement.lang === 'en';
  var lang = isEn ? 'en' : 'zh';

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

    var seen = {};
    var results = [];
    data.forEach(function(item){
      var addr = item.address || {};
      var city = addr.city || addr.town || addr.village || addr.county || addr.state || item.name || '';
      var country = addr.country || '';
      var countryCode = (addr.country_code || '').toUpperCase();
      var state = addr.state || '';

      if(!city) return;
      var key = city.toLowerCase();
      if(seen[key]) return;
      seen[key] = true;

      var display = city;
      if(state && state !== city) display += ', ' + state;
      if(country) display += ' · ' + country;

      results.push({
        name: display,
        shortName: city,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        country: countryCode === 'US' ? 'US' : countryCode === 'CN' ? 'CN' : countryCode || 'CN'
      });
    });

    if(!results.length){
      drop.classList.remove('show');
      return;
    }

    drop.innerHTML = results.map(function(r, i){
      return '<div class="city-option" data-idx="' + i + '">' +
        '<span style="font-weight:500">' + r.shortName + '</span>' +
        '<span style="color:var(--t4,#98958f);font-size:11px;margin-left:6px">' +
        r.name.replace(r.shortName + ', ', '').replace(r.shortName + ' · ', '') +
        '</span></div>';
    }).join('');

    // Bind click handlers
    drop.querySelectorAll('.city-option').forEach(function(el){
      el.addEventListener('click', function(){
        var idx = parseInt(this.dataset.idx);
        onPick(results[idx]);
      });
    });

    drop.classList.add('show');

  } catch(e){
    console.warn('City search error:', e);
  }
}

// Expose _resCountry for kes-report.js
function getResCountry(){ return _resCountry; }
