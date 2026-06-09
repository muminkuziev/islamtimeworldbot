/* ═══════════════════════════════════════════════════
   Nearby Mosques Screen — Overpass API (free)
   ═══════════════════════════════════════════════════ */

const MosquesScreen = (function () {

  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const RADIUS_M     = 5000; // 5 km

  let _lat  = null;
  let _lon  = null;
  let _lang = 'uz';

  function render() {
    const el = document.getElementById('screen-mosques');
    if (!el) return;
    _lang = window.App?.state?.lang || 'uz';
    el.innerHTML = _buildHTML(_lang, 'loading');
    _bindBack(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-mosques');
    if (!el) return;
    el.innerHTML = _buildHTML(lang, 'loading');
    _bindBack(el);
    _startLocation(el);
  }

  function _buildHTML(lang, state, mosques) {
    let contentHTML = '';
    if (state === 'loading') {
      contentHTML = `<div class="mosq-loading"><span class="mosq-spinner"></span> ${t('loading', lang)}</div>`;
    } else if (state === 'empty') {
      contentHTML = `<div class="mosq-empty">🕌 ${t('mosques_none', lang)}</div>`;
    } else if (state === 'list' && mosques) {
      contentHTML = mosques.map(m => _buildMosqueCard(m, lang)).join('');
    } else if (state === 'error') {
      contentHTML = `<div class="mosq-error">❌ ${t('error', lang)}</div>`;
    }

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="mosq-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">📍 ${t('modules_list.mosques', lang)}</h1>
        </div>

        <div class="mosq-body" id="mosq-body">
          ${contentHTML}
        </div>
      </div>
    `;
  }

  function _buildMosqueCard(m, lang) {
    const dist = m.distance < 1000
      ? `${Math.round(m.distance)} m`
      : `${(m.distance / 1000).toFixed(1)} ${t('mosques_km', lang)}`;

    const name = m.name || '🕌 Mosque';
    const addr = m.addr || '';

    return `
      <div class="mosq-card">
        <div class="mosq-icon">🕌</div>
        <div class="mosq-info">
          <div class="mosq-name">${_esc(name)}</div>
          ${addr ? `<div class="mosq-addr">${_esc(addr)}</div>` : ''}
          <div class="mosq-dist">${dist}</div>
        </div>
        <a class="mosq-map-btn"
           href="https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}&zoom=17"
           target="_blank" rel="noopener">
          🗺️
        </a>
      </div>
    `;
  }

  function _bindBack(el) {
    el.querySelector('#mosq-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });
  }

  function _startLocation(el) {
    if (_lat && _lon) { _fetchMosques(el); return; }

    const lm = window.Telegram?.WebApp?.LocationManager;
    if (lm) {
      lm.init(() => {
        if (lm.isAccessGranted) {
          lm.getLocation(loc => {
            if (loc) { _lat = loc.latitude; _lon = loc.longitude; _fetchMosques(el); }
            else { _browserGeo(el); }
          });
        } else { _browserGeo(el); }
      });
    } else {
      _browserGeo(el);
    }
  }

  function _browserGeo(el) {
    if (!navigator.geolocation) { _setBody(el, 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { _lat = pos.coords.latitude; _lon = pos.coords.longitude; _fetchMosques(el); },
      () => _setBody(el, 'error')
    );
  }

  async function _fetchMosques(el) {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](around:${RADIUS_M},${_lat},${_lon});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:${RADIUS_M},${_lat},${_lon});
        relation["amenity"="place_of_worship"]["religion"="muslim"](around:${RADIUS_M},${_lat},${_lon});
      );
      out center;
    `.trim();

    try {
      const resp = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const data = await resp.json();
      const elements = data.elements || [];

      const mosques = elements.map(el2 => {
        const lat = el2.lat || el2.center?.lat;
        const lon = el2.lon || el2.center?.lon;
        if (!lat || !lon) return null;
        return {
          lat, lon,
          name: el2.tags?.name || el2.tags?.['name:en'] || '',
          addr: [el2.tags?.['addr:street'], el2.tags?.['addr:housenumber']].filter(Boolean).join(' '),
          distance: _haversine(_lat, _lon, lat, lon)
        };
      }).filter(Boolean);

      mosques.sort((a, b) => a.distance - b.distance);

      if (mosques.length === 0) {
        _setBody(el, 'empty');
      } else {
        const body = el.querySelector('#mosq-body');
        if (body) body.innerHTML = mosques.map(m => _buildMosqueCard(m, _lang)).join('');
      }
    } catch (_e) {
      _setBody(el, 'error');
    }
  }

  function _setBody(el, state) {
    const body = el.querySelector('#mosq-body');
    if (!body) return;
    if (state === 'empty') body.innerHTML = `<div class="mosq-empty">🕌 ${t('mosques_none', _lang)}</div>`;
    if (state === 'error') body.innerHTML = `<div class="mosq-error">❌ ${t('error', _lang)}</div>`;
  }

  function _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dPhi = (lat2 - lat1) * Math.PI / 180;
    const dLam = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dPhi/2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render, load };
})();
