/*  kes-city.js  —  Google Places Autocomplete 城市搜索
 *  支持全球所有城市，中英文模糊匹配
 */

var _placesAutocomplete = null;

function initCitySearch(){
  var input = document.getElementById('cityInput');
  if(!input || !window.google || !google.maps || !google.maps.places) return;

  input.removeAttribute('oninput');

  _placesAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ['(cities)'],
    fields: ['geometry', 'name', 'formatted_address', 'utc_offset_minutes']
  });

  var drop = document.getElementById('cityDrop');
  if(drop) drop.style.display = 'none';

  _placesAutocomplete.addListener('place_changed', function(){
    var place = _placesAutocomplete.getPlace();
    if(!place || !place.geometry) return;

    var lat = place.geometry.location.lat();
    var lon = place.geometry.location.lng();
    var name = input.value;

    input.dataset.lon = lon;
    input.dataset.lat = lat;
    CITY_COORDS[name] = [lon, lat];

    if(place.utc_offset_minutes !== undefined){
      CITY_TZ[name] = place.utc_offset_minutes / 60;
    } else {
      CITY_TZ[name] = Math.round(lon / 15);
    }
  });

  var style = document.createElement('style');
  style.textContent = '.pac-container{font-family:"Inter",sans-serif;border:1px solid #dedad4;border-radius:10px;margin-top:4px;box-shadow:0 8px 24px rgba(0,0,0,.08)}.pac-item{padding:8px 14px;font-size:13px;color:#52504c;border-top:1px solid #edeae5;cursor:pointer}.pac-item:first-child{border-top:none}.pac-item:hover{background:#f4f2ee}.pac-item-query{font-weight:600;color:#1a1814}.pac-icon{display:none}';
  document.head.appendChild(style);
}

function onGoogleMapsReady(){
  initCitySearch();
}
