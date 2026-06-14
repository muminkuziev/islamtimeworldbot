/* ═══════════════════════════════════════════════════════════════
   Masjidlar Screen — Navy+Gold UI
   Flow: cache → coords(instant) → geo(3s timeout) → fallback(3s)
   API runs in background; UI never stays blank/spinning > 3s
   ═══════════════════════════════════════════════════════════════ */

const MosquesScreen = (function () {

  const OVERPASS_URL  = 'https://overpass-api.de/api/interpreter';
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
  const RADIUS        = 5000;
  const CACHE_KEY     = 'islamtime_mosques_v1';
  const LOAD_TIMEOUT  = 3000;

  /* ── Warsaw fallback data (shown when location unavailable) ── */
  const FALLBACK_LAT = 52.2297;
  const FALLBACK_LON = 21.0122;
  const FALLBACK_MOSQUES = [
    { lat:52.1870, lon:21.0450, name:'Warsaw Central Mosque',     ar:'مسجد وارسو المركزي',       addr:'ul. Wiertnicza 103',  opening_hours:'09:00-22:00', phone:'+48 22 648 0123', juma:'13:00', distance:800  },
    { lat:52.2300, lon:20.9800, name:'Al-Noor Islamic Center',    ar:'مركز النور الإسلامي',       addr:'ul. Żytnia 35',       opening_hours:'08:00-21:00', phone:'+48 22 632 4567', juma:'13:30', distance:1200 },
    { lat:52.2200, lon:20.9900, name:'Muslim Association Warsaw', ar:'الجمعية الإسلامية في وارسو', addr:'ul. Prosta 51',       opening_hours:'09:00-20:00', phone:'+48 22 620 8901', juma:'14:00', distance:2100 },
    { lat:52.2100, lon:21.0200, name:'Al-Salam Mosque',           ar:'مسجد السلام',               addr:'ul. Krakowska 12',    opening_hours:'24/7',        phone:'+48 22 611 2345', juma:'13:00', distance:3400 },
  ];

  let _lang       = 'uz';
  let _tab        = 'royxat';

  function _T(lat, cyr, ru, en) { if (_lang === 'uz_cyr') return cyr; if (_lang === 'ru' && ru !== undefined) return ru; if (_lang === 'en' && en !== undefined) return en; return lat; }
  let _lat        = null;
  let _lon        = null;
  let _city       = '';
  let _mosques    = [];
  let _loading    = false;
  let _isFallback = false;
  let _selIdx     = null;
  let _el         = null;
  let _loadTimer  = null;

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _reset();
    _el = document.getElementById('screen-mosques');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
    _start();
  }

  function load(lang) {
    _lang = lang;
    _reset();
    _el = document.getElementById('screen-mosques');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
    _start();
  }

  function _reset() {
    clearTimeout(_loadTimer);
    _loadTimer  = null;
    _tab        = 'royxat';
    _selIdx     = null;
    _isFallback = false;
  }

  /* ══════════════════════════════════════════════
     Boot sequence
  ══════════════════════════════════════════════ */
  function _start() {
    /* 1. Show cached mosques instantly if available */
    if (_loadFromCache()) {
      _refreshBody();
      _updateHeader();
      _bgRefresh();   /* silently update in background */
      return;
    }

    /* 2. Show spinner; start 3-second safety timer */
    _loading = true;
    _refreshBody();
    _loadTimer = setTimeout(_applyFallback, LOAD_TIMEOUT);

    /* 3. Try stored coords (instant — no permission needed) */
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    if (sLat && sLon) {
      _lat = sLat; _lon = sLon;
      clearTimeout(_loadTimer);
      _fetchMosques(false);
      return;
    }

    /* 4. Try browser geolocation — 3 s timeout; permission dialog may show */
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(_loadTimer);
          _lat = pos.coords.latitude;
          _lon = pos.coords.longitude;
          localStorage.setItem('islamtime_last_lat', _lat);
          localStorage.setItem('islamtime_last_lon', _lon);
          _fetchMosques(false);
        },
        () => {
          clearTimeout(_loadTimer);
          _applyFallback();
        },
        { timeout: LOAD_TIMEOUT, maximumAge: 300000, enableHighAccuracy: false }
      );
    }
    /* if no geolocation API, _loadTimer will fire _applyFallback at 3 s */
  }

  /* Show Warsaw fallback data */
  function _applyFallback() {
    if (_mosques.length) return;   /* real data already arrived */
    _loading    = false;
    _isFallback = true;
    _mosques    = FALLBACK_MOSQUES;
    _lat        = FALLBACK_LAT;
    _lon        = FALLBACK_LON;
    _city       = 'Warsaw';
    _refreshBody();
    _updateHeader();
  }

  /* Background refresh when we already have data to show */
  async function _bgRefresh() {
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '') || _lat;
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '') || _lon;
    if (!sLat || !sLon) return;
    _lat = sLat; _lon = sLon;
    await _fetchMosques(true);
  }

  /* ══════════════════════════════════════════════
     Overpass API fetch
  ══════════════════════════════════════════════ */
  async function _fetchMosques(background) {
    const query = `[out:json][timeout:20];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${RADIUS},${_lat},${_lon});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${RADIUS},${_lat},${_lon});
  relation["amenity"="place_of_worship"]["religion"="muslim"](around:${RADIUS},${_lat},${_lon});
);
out center tags;`.trim();

    try {
      const resp = await fetch(OVERPASS_URL, {
        method : 'POST',
        body   : 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal : AbortSignal.timeout(20000),
      });
      if (!resp.ok) throw new Error('http');
      const data = await resp.json();

      const fresh = (data.elements || []).map(e => {
        const lat = e.lat ?? e.center?.lat;
        const lon = e.lon ?? e.center?.lon;
        if (!lat || !lon) return null;
        const t = e.tags || {};
        return {
          lat, lon,
          name : t.name || t['name:en'] || t['name:ar'] || '',
          ar   : t['name:ar'] || '',
          addr : [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '),
          opening_hours: t.opening_hours || '',
          phone: t.phone || t['contact:phone'] || '',
          juma : t['prayer:friday'] || '',
          distance: _haversine(_lat, _lon, lat, lon),
        };
      }).filter(Boolean).sort((a, b) => a.distance - b.distance);

      if (fresh.length) {
        _mosques    = fresh;
        _isFallback = false;
        _saveCache();
        if (!_city) _fetchCity();
      }

    } catch (_e) { /* keep whatever is showing */ }

    if (!background || _loading) {
      _loading = false;
      _refreshBody();
      _updateHeader();
    }
  }

  /* Reverse geocode for city name */
  async function _fetchCity() {
    try {
      const r = await fetch(
        `${NOMINATIM_URL}?lat=${_lat}&lon=${_lon}&format=json&zoom=10`,
        { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(5000) }
      );
      const d = await r.json();
      const a = d.address || {};
      _city = a.city || a.town || a.suburb || a.county || '';
      _saveCache();
      _updateHeader();
    } catch (_e) {}
  }

  /* ══════════════════════════════════════════════
     HTML builders
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    return `
<div class="ms-hdr">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov" style="background:rgba(9,18,31,0.65)"></div>
  <div class="ms-hdr-inner">
    <div class="ms-nav-row">
      <button class="ms-back" id="ms-back">← ${_T('Menyu','Меню','Меню','Menu')}</button>
      <div id="ms-status"></div>
    </div>
    <div class="ms-title">${_T('Yaqin masjidlar','Яқин масжидлар','Ближайшие мечети','Nearby Mosques')}</div>
    <div class="ms-loc" id="ms-loc">${_locLine()}</div>
    <div class="ms-divider"></div>
    <div class="ms-tabs">
      <button class="ms-tab${_tab === 'royxat' ? ' active' : ''}" data-tab="royxat">☰ ${_T("Ro'yxat","Рўйхат","Список","List")}</button>
      <button class="ms-tab${_tab === 'xarita' ? ' active' : ''}" data-tab="xarita">🗺 ${_T('Xarita','Харита','Карта','Map')}</button>
      <button class="ms-tab${_tab === 'jadval' ? ' active' : ''}" data-tab="jadval">📅 ${_T('Jadval','Жадвал','Расписание','Schedule')}</button>
    </div>
  </div>
</div>
<div class="ms-body" id="ms-body"></div>`;
  }

  function _buildContent() {
    if (_loading && !_mosques.length) {
      return `<div class="ms-loading"><span class="ms-spinner"></span><div class="ms-load-txt">${_T('Joylashuv aniqlanmoqda...','Жойлашув аниқланмоқда...','Определение местоположения...','Detecting location...')}</div></div>`;
    }
    if (!_mosques.length) {
      return `<div class="ms-empty">🕌 ${_T('Yaqin atrofda masjid topilmadi','Яқин атрофда масжид топилмади','Мечети не найдены','No mosques found nearby')}</div>`;
    }
    const notice = _isFallback
      ? `<div class="ms-fallback-notice">📍 ${_T("Lokatsiya aniqlanmadi — Warsaw namunasi ko'rsatildi","Локация аниқланмади — Варшава намунаси кўрсатилди","Местоположение не определено — показан пример Варшавы","Location not found — showing Warsaw example")}</div>`
      : '';
    if (_tab === 'royxat') return notice + (_selIdx !== null ? _buildDetail() : _buildList());
    if (_tab === 'xarita') return notice + _buildMap();
    if (_tab === 'jadval') return notice + _buildJadval();
    return '';
  }

  /* ── List ── */
  function _buildList() {
    return `<div class="ms-list">${_mosques.slice(0, 20).map((m, i) => {
      const dist   = _fmtDist(m.distance);
      const walk   = Math.max(1, Math.round(m.distance / 80));
      const isOpen = _isOpen(m.opening_hours);
      const dot    = isOpen === true ? '#4fcfa0' : isOpen === false ? '#e05555' : 'rgba(232,223,200,.28)';
      const txt    = isOpen === true ? `${_T('Ochiq','Очиқ','Открыто','Open')} · ${m.closes || ''}`.trimEnd().replace(/·\s*$/, '') : isOpen === false ? _T('Yopiq','Ёпиқ','Закрыто','Closed') : '';
      return `<div class="ms-card" data-idx="${i}">
  <div class="ms-card-top">
    <div class="ms-card-left">
      <div class="ms-card-name">${_esc(m.name || 'Masjid')}</div>
      ${m.ar ? `<div class="ms-card-ar">${_esc(m.ar)}</div>` : ''}
      ${m.addr ? `<div class="ms-card-addr">📍 ${_esc(m.addr)}</div>` : ''}
    </div>
    <div class="ms-card-right">
      <div class="ms-card-dist">${dist}</div>
      <div class="ms-card-walk">${walk} ${_T('daqiqa yurish','дақиқа юриш','мин. ходьбы','min walk')}</div>
    </div>
  </div>
  <div class="ms-card-foot">
    <div class="ms-open-dot" style="background:${dot}"></div>
    ${txt ? `<span class="ms-open-txt" style="color:${dot}">${_esc(txt)}</span>` : ''}
    ${m.opening_hours && !txt ? `<span class="ms-card-hours">${_esc(m.opening_hours.substring(0, 16))}</span>` : ''}
  </div>
</div>`;
    }).join('')}</div>`;
  }

  /* ── Detail ── */
  function _buildDetail() {
    const m = _mosques[_selIdx];
    if (!m) return '';
    const dist     = _fmtDist(m.distance);
    const walk     = Math.max(1, Math.round(m.distance / 80));
    const bus      = Math.max(1, Math.round(m.distance / 300));
    const drive    = Math.max(1, Math.round(m.distance / 500));
    const isOpen   = _isOpen(m.opening_hours);
    const openC    = isOpen === true ? '#4fcfa0' : isOpen === false ? '#e05555' : '#e8dfc8';
    const openTxt  = isOpen === true ? _T('Ochiq','Очиқ','Открыто','Open') : isOpen === false ? _T('Yopiq','Ёпиқ','Закрыто','Closed') : '—';
    const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`;
    const rows = [
      { l:_T('Manzil','Манзил','Адрес','Address'),    v: m.addr || '—' },
      { l:_T('Masofa','Масофа','Расстояние','Distance'),    v: `${dist} · ${walk} ${_T('daqiqa yurish','дақиқа юриш','мин. ходьбы','min walk')}` },
      { l:_T('Holat','Ҳолат','Статус','Status'),      v: openTxt, c: openC },
      m.opening_hours ? { l:_T('Ish vaqti','Иш вақти','Часы работы','Opening hours'), v: m.opening_hours } : null,
      m.phone ? { l:_T('Telefon','Телефон','Телефон','Phone'), v: m.phone } : null,
    ].filter(Boolean);

    return `
<button class="ms-detail-back" id="ms-detail-back">← ${_T("Ro'yxatga qaytish","Рўйхатга қайтиш","Назад к списку","Back to list")}</button>
<div class="ms-detail-card">
  <div class="ms-detail-topline"></div>
  <div class="ms-detail-name">${_esc(m.name || 'Masjid')}</div>
  ${m.ar ? `<div class="ms-detail-ar">${_esc(m.ar)}</div>` : ''}
  ${rows.map((x, i) => `
  <div class="ms-detail-row${i === rows.length - 1 ? ' last' : ''}">
    <span class="ms-detail-lbl">${x.l}</span>
    <span class="ms-detail-val"${x.c ? ` style="color:${x.c}"` : ''}>${_esc(x.v)}</span>
  </div>`).join('')}
</div>
<div class="ms-sec-lbl">${_T("YO'NALISH","ЙЎНАЛИШ","МАРШРУТ","DIRECTIONS")}</div>
${[
  { ic:'🚶', l:_T('Piyoda','Пиёда','Пешком','Walking'),   t:`${walk} ${_T('daqiqa','дақиқа','мин.','min')}`,  c:'#4fcfa0' },
  { ic:'🚌', l:_T('Avtobus','Автобус','Автобус','Bus'),    t:`${bus} ${_T('daqiqa','дақиқа','мин.','min')}`,  c:'#5b9bd5' },
  { ic:'🚗', l:_T('Mashina','Машина','Машина','Car'),      t:`${drive} ${_T('daqiqa','дақиқа','мин.','min')}`, c:'#E8C15A' },
].map(r => `
<a class="ms-route-row" href="${routeUrl}" target="_blank" rel="noopener">
  <span class="ms-route-ic">${r.ic}</span>
  <div class="ms-route-info">
    <div class="ms-route-name">${r.l}</div>
    <div class="ms-route-dist">${dist}</div>
  </div>
  <div class="ms-route-time" style="color:${r.c}">${r.t}</div>
</a>`).join('')}`;
  }

  /* ── SVG map ── */
  function _buildMap() {
    const shown      = _mosques.slice(0, 10);
    const mPerDegLat = 111320;
    const mPerDegLon = mPerDegLat * Math.cos(_lat * Math.PI / 180);
    const pts = shown.map((m, i) => {
      const dx   = (m.lon - _lon) * mPerDegLon;
      const dy   = (m.lat - _lat) * mPerDegLat;
      const svgX = Math.max(8, Math.min(292, 150 + (dx / RADIUS) * 128));
      const svgY = Math.max(8, Math.min(122, 65  - (dy / RADIUS) * 54));
      return { ...m, i, svgX, svgY };
    });
    return `
<div class="ms-map-wrap">
  <svg class="ms-map-svg" viewBox="0 0 300 130" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="msgrid" width="18" height="18" patternUnits="userSpaceOnUse">
        <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(232,193,90,.05)" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="300" height="130" fill="#0a1628"/>
    <rect width="300" height="130" fill="url(#msgrid)"/>
    <line x1="0"   y1="65"  x2="300" y2="65"  stroke="rgba(255,255,255,.06)" stroke-width="1.5"/>
    <line x1="150" y1="0"   x2="150" y2="130" stroke="rgba(255,255,255,.06)" stroke-width="1.5"/>
    ${pts.map(p => `
    <line x1="150" y1="65" x2="${p.svgX}" y2="${p.svgY}"
      stroke="rgba(232,193,90,.12)" stroke-width="1" stroke-dasharray="3 3"/>
    <circle cx="${p.svgX}" cy="${p.svgY}" r="${_selIdx === p.i ? 8 : 5}"
      fill="${_selIdx === p.i ? '#4fcfa0' : 'rgba(79,207,160,.5)'}"
      stroke="${_selIdx === p.i ? '#4fcfa0' : 'transparent'}" stroke-width="2"/>
    <text x="${p.svgX}" y="${p.svgY - 7}" text-anchor="middle"
      font-size="8" fill="rgba(232,223,200,.55)"
      font-family="Inter,system-ui,sans-serif" font-weight="600">${p.i + 1}</text>
    `).join('')}
    <circle cx="150" cy="65" r="6" fill="#E8C15A" opacity=".9"/>
    <circle cx="150" cy="65" r="12" fill="none" stroke="#E8C15A" stroke-width="1" opacity=".3"/>
  </svg>
  <div class="ms-map-you">${_T('Siz','Сиз','Вы','You')}</div>
</div>
<div class="ms-map-list">
  ${pts.map(p => `
  <div class="ms-map-row${_selIdx === p.i ? ' sel' : ''}" data-idx="${p.i}">
    <div class="ms-map-num">${p.i + 1}</div>
    <div class="ms-map-name">${_esc(p.name || 'Masjid')}</div>
    <div class="ms-map-dist">${_fmtDist(p.distance)}</div>
  </div>`).join('')}
</div>`;
  }

  /* ── Schedule ── */
  function _buildJadval() {
    return `<div class="ms-sec-lbl">${_T('NAMOZ VAQTLARI (JUMA)','НАМОЗ ВАҚТЛАРИ (ЖУМА)','РАСПИСАНИЕ НАМАЗОВ (ДЖУМА)','PRAYER SCHEDULE (FRIDAY)')}</div>
${_mosques.slice(0, 8).map(m => {
  const isOpen = _isOpen(m.opening_hours);
  const dot    = isOpen === true ? '#4fcfa0' : isOpen === false ? '#e05555' : 'rgba(232,223,200,.28)';
  const txt    = isOpen === true ? _T('Ochiq','Очиқ','Открыто','Open') : isOpen === false ? _T('Yopiq','Ёпиқ','Закрыто','Closed') : '—';
  const walk   = Math.max(1, Math.round(m.distance / 80));
  return `<div class="ms-jadval-card">
  <div class="ms-jadval-top">
    <div>
      <div class="ms-jadval-name">${_esc(m.name || 'Masjid')}</div>
      <div class="ms-jadval-dist">${_fmtDist(m.distance)}</div>
    </div>
    <div class="ms-open-badge" style="color:${dot}">
      <div class="ms-open-dot" style="background:${dot}"></div>${txt}
    </div>
  </div>
  <div class="ms-jadval-grid">
    <div class="ms-jadval-cell"><div class="ms-jadval-lbl">${_T('Juma','Жума','Джума','Jumu\'ah')}</div><div class="ms-jadval-val">${_esc(m.juma || '13:00')}</div></div>
    <div class="ms-jadval-cell"><div class="ms-jadval-lbl">${_T('Ish vaqti','Иш вақти','Часы работы','Opening hours')}</div><div class="ms-jadval-val">${m.opening_hours ? _esc(m.opening_hours.substring(0,10)) : '—'}</div></div>
    <div class="ms-jadval-cell"><div class="ms-jadval-lbl">${_T('Yurish','Юриш','Ходьба','Walk')}</div><div class="ms-jadval-val">${walk} min</div></div>
  </div>
</div>`;
}).join('')}`;
  }

  /* ══════════════════════════════════════════════
     Events
  ══════════════════════════════════════════════ */
  function _bind() {
    _el.querySelector('#ms-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });
    _el.querySelectorAll('.ms-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        _el.querySelectorAll('.ms-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _refreshBody();
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
    _el.querySelector('#ms-body')?.addEventListener('click', e => {
      if (e.target.closest('#ms-detail-back')) { _selIdx = null; _refreshBody(); return; }
      const mapRow = e.target.closest('.ms-map-row');
      if (mapRow) { _selIdx = parseInt(mapRow.dataset.idx); _refreshBody(); return; }
      const card = e.target.closest('.ms-card');
      if (card) {
        _selIdx = parseInt(card.dataset.idx);
        _refreshBody();
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      }
    });
  }

  /* ══════════════════════════════════════════════
     DOM helpers
  ══════════════════════════════════════════════ */
  function _refreshBody() {
    const body = _el?.querySelector('#ms-body');
    if (body) body.innerHTML = _buildContent();
  }

  function _updateHeader() {
    const loc = _el?.querySelector('#ms-loc');
    if (loc) loc.textContent = _locLine();
    const st = _el?.querySelector('#ms-status');
    if (st) {
      st.innerHTML = _mosques.length
        ? `<div class="ms-status-badge">${_mosques.length} ${_T('ta topildi','та топилди','найдено','found')}</div>`
        : '';
    }
  }

  function _locLine() {
    const r = `${RADIUS / 1000} km radius`;
    return _city ? `📍 ${_city} · ${r}` : `📍 ${r}`;
  }

  /* ══════════════════════════════════════════════
     Cache
  ══════════════════════════════════════════════ */
  function _loadFromCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Array.isArray(c.mosques) && c.mosques.length > 0) {
        _lat = c.lat; _lon = c.lon; _mosques = c.mosques; _city = c.city || '';
        return true;
      }
    } catch (_e) {}
    return false;
  }

  function _saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        lat: _lat, lon: _lon, mosques: _mosques, city: _city,
      }));
    } catch (_e) {}
  }

  /* ══════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════ */
  function _fmtDist(d) {
    return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
  }

  function _isOpen(hours) {
    if (!hours) return null;
    if (hours === '24/7') return true;
    return null;
  }

  function _haversine(lat1, lon1, lat2, lon2) {
    const R  = 6371000;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a  = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render, load };
})();
