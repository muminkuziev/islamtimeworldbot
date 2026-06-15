/* ═══════════════════════════════════════════════════════════════
   Masjidlar Screen — Navy+Gold UI
   Flow: cache → coords(instant) → geo(3s timeout) → fallback(3s)
   API runs in background; UI never stays blank/spinning > 3s
   ═══════════════════════════════════════════════════════════════ */

const MosquesScreen = (function () {

  const OVERPASS_URL   = 'https://overpass-api.de/api/interpreter';
  const NOMINATIM_URL  = 'https://nominatim.openstreetmap.org/reverse';
  const RADIUS_DEFAULT = 10000;
  const RADIUS_EXPAND  = 20000;
  const RADIUS_MAX     = 50000;
  const GEO_TIMEOUT    = 10000;   /* ms to wait for browser geolocation */

  /* Cache key is per-language so city names are always in the right script */
  function _cacheKey() { return 'islamtime_mosques_' + _lang + '_v2'; }

  let _lang       = 'uz';
  let _tab        = 'royxat';

  function _T(lat, cyr, ru, en) { if (_lang === 'uz_cyr') return cyr; if (_lang === 'ru' && ru !== undefined) return ru; if (_lang === 'en' && en !== undefined) return en; return lat; }
  let _lat        = null;
  let _lon        = null;
  let _city       = '';
  let _userId     = null;   /* Telegram user ID — for server-side location storage */
  let _mosques    = [];
  let _radius     = RADIUS_DEFAULT;
  let _loading    = false;
  let _noLocation = false;  /* true when no coords could be obtained */
  let _notFound   = false;  /* true when 50km search returns 0 results */
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
    _noLocation = false;
    _notFound   = false;
    _radius     = RADIUS_DEFAULT;
    _userId     = window.App?.state?.user?.id || null;
  }

  /* ══════════════════════════════════════════════
     Boot sequence
  ══════════════════════════════════════════════ */
  async function _start() {
    /* 1. Cached mosque list for this user's location */
    if (_loadFromCache()) {
      _refreshBody();
      _updateHeader();
      _bgRefresh();
      return;
    }

    _loading = true;
    _refreshBody();

    /* 2. localStorage coords (set by Location screen or previous geolocation) */
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    if (sLat && sLon) {
      _lat = sLat; _lon = sLon;
      await _fetchMosques(false);
      return;
    }

    /* 3. Server-stored location for this Telegram user */
    if (_userId) {
      const srv = await _loadLocationFromServer();
      if (srv) {
        _lat = srv.lat; _lon = srv.lon;
        if (srv.city) _city = srv.city;
        localStorage.setItem('islamtime_last_lat', _lat);
        localStorage.setItem('islamtime_last_lon', _lon);
        await _fetchMosques(false);
        return;
      }
    }

    /* 4. Browser geolocation — wait up to GEO_TIMEOUT then show request UI */
    if (navigator.geolocation) {
      _loadTimer = setTimeout(_showNoLocation, GEO_TIMEOUT);
      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(_loadTimer);
          if (_mosques.length) return;  /* already resolved by another path */
          _lat = pos.coords.latitude;
          _lon = pos.coords.longitude;
          localStorage.setItem('islamtime_last_lat', _lat);
          localStorage.setItem('islamtime_last_lon', _lon);
          _saveLocationToServer(_lat, _lon, '');
          _fetchMosques(false);
        },
        () => { clearTimeout(_loadTimer); _showNoLocation(); },
        { timeout: GEO_TIMEOUT, maximumAge: 300000, enableHighAccuracy: false }
      );
    } else {
      _showNoLocation();
    }
  }

  /* No coords available — ask user to share location */
  function _showNoLocation() {
    if (_mosques.length) return;   /* real data already arrived */
    _loading    = false;
    _noLocation = true;
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
     Server-side location helpers
  ══════════════════════════════════════════════ */
  async function _loadLocationFromServer() {
    if (!_userId) return null;
    try {
      const r = await fetch(`/api/user/location?user_id=${_userId}`,
        { signal: AbortSignal.timeout(5000) });
      const d = await r.json();
      if (d.lat) return d;
    } catch (_e) {}
    return null;
  }

  async function _saveLocationToServer(lat, lon, city) {
    if (!_userId) return;
    try {
      fetch('/api/user/location', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ user_id: _userId, lat, lon, city }),
        signal : AbortSignal.timeout(5000),
      });
    } catch (_e) {}
  }

  /* "Lokatsiyani o'zgartirish" — clears all cached coords and re-requests */
  function _changeLocation() {
    localStorage.removeItem('islamtime_last_lat');
    localStorage.removeItem('islamtime_last_lon');
    ['uz', 'uz_cyr', 'ru', 'en'].forEach(l =>
      localStorage.removeItem('islamtime_mosques_' + l + '_v2')
    );
    _lat = null; _lon = null; _city = '';
    _mosques = []; _noLocation = false; _notFound = false;
    _loading = true;
    _refreshBody();

    if (!navigator.geolocation) { _showNoLocation(); return; }
    _loadTimer = setTimeout(_showNoLocation, GEO_TIMEOUT);
    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(_loadTimer);
        _lat = pos.coords.latitude;
        _lon = pos.coords.longitude;
        localStorage.setItem('islamtime_last_lat', _lat);
        localStorage.setItem('islamtime_last_lon', _lon);
        _saveLocationToServer(_lat, _lon, '');
        _city = '';
        _fetchMosques(false);
      },
      () => { clearTimeout(_loadTimer); _showNoLocation(); },
      { timeout: GEO_TIMEOUT, enableHighAccuracy: true }
    );
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  }

  /* ══════════════════════════════════════════════
     Overpass API fetch
  ══════════════════════════════════════════════ */
  async function _fetchMosques(background, radius) {
    if (radius === undefined) radius = _radius;
    _radius = radius;

    /* Cast a wide net: mosque/prayer_hall/musalla/community_centre/ahmadiyya */
    const R = radius, LA = _lat, LO = _lon;
    const query = `[out:json][timeout:25];
(
  node["amenity"="mosque"](around:${R},${LA},${LO});
  way["amenity"="mosque"](around:${R},${LA},${LO});
  relation["amenity"="mosque"](around:${R},${LA},${LO});
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${R},${LA},${LO});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${R},${LA},${LO});
  relation["amenity"="place_of_worship"]["religion"="muslim"](around:${R},${LA},${LO});
  node["amenity"="prayer_hall"]["religion"="muslim"](around:${R},${LA},${LO});
  way["amenity"="prayer_hall"]["religion"="muslim"](around:${R},${LA},${LO});
  node["amenity"="place_of_worship"]["denomination"="ahmadiyya"](around:${R},${LA},${LO});
  way["amenity"="place_of_worship"]["denomination"="ahmadiyya"](around:${R},${LA},${LO});
  node["amenity"="community_centre"]["religion"="muslim"](around:${R},${LA},${LO});
  way["amenity"="community_centre"]["religion"="muslim"](around:${R},${LA},${LO});
  node["building"="mosque"](around:${R},${LA},${LO});
  way["building"="mosque"](around:${R},${LA},${LO});
);
out center tags;`.trim();

    /* Log for debugging (req 6) */
    console.log(`[MOSQUES] user_id=${_userId} lat=${_lat?.toFixed(4)} lon=${_lon?.toFixed(4)} city="${_city||'-'}" radius=${radius}m`);

    try {
      const resp = await fetch(OVERPASS_URL, {
        method : 'POST',
        body   : 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal : AbortSignal.timeout(25000),
      });
      if (!resp.ok) throw new Error('http');
      const data = await resp.json();

      const mapped = (data.elements || []).map(e => {
        const lat = e.lat ?? e.center?.lat;
        const lon = e.lon ?? e.center?.lon;
        if (lat == null || lon == null) return null;
        const t = e.tags || {};
        return {
          lat, lon,
          name : t.name || t['name:en'] || t['name:ar'] || t['name:pl'] || t['name:ru'] || '',
          ar   : t['name:ar'] || '',
          addr : [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '),
          opening_hours: t.opening_hours || '',
          phone: t.phone || t['contact:phone'] || t['contact:mobile'] || '',
          juma : t['prayer:friday'] || '',
          distance: _haversine(_lat, _lon, lat, lon),
        };
      }).filter(Boolean).sort((a, b) => a.distance - b.distance);

      /* Deduplicate: same physical location tagged as node + way/relation */
      const fresh = [];
      for (const m of mapped) {
        const dup = fresh.find(k => _haversine(k.lat, k.lon, m.lat, m.lon) < 30);
        if (!dup) {
          fresh.push(m);
        } else if (!dup.name && m.name) {
          fresh.splice(fresh.indexOf(dup), 1, m);
        }
      }

      /* Auto-expand: 10km → 20km → 50km when fewer than 5 results */
      if (fresh.length < 5 && radius < RADIUS_MAX && !background) {
        const next = radius === RADIUS_DEFAULT ? RADIUS_EXPAND : RADIUS_MAX;
        await _fetchMosques(background, next);
        return;
      }

      /* All radii exhausted with 0 results */
      if (fresh.length === 0 && radius >= RADIUS_MAX) {
        _notFound = true;
      }

      if (fresh.length) {
        _mosques = fresh.slice(0, 20);
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
    const acceptLang = (_lang === 'ru' || _lang === 'uz_cyr') ? 'ru,en' : _lang === 'en' ? 'en' : 'uz,ru,en';
    try {
      const r = await fetch(
        `${NOMINATIM_URL}?lat=${_lat}&lon=${_lon}&format=json&zoom=10`,
        { headers: { 'Accept-Language': acceptLang }, signal: AbortSignal.timeout(5000) }
      );
      const d = await r.json();
      const a = d.address || {};
      _city = a.city || a.town || a.suburb || a.county || '';
      _saveCache();
      _updateHeader();
      if (_city) _saveLocationToServer(_lat, _lon, _city);
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
      <button class="ms-change-loc" id="ms-change-loc">📍 ${_T("O'zgartirish","Ўзгартириш","Изменить","Change")}</button>
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
    if (_noLocation) {
      return `<div class="ms-noloc">
        <div class="ms-noloc-icon">📍</div>
        <div class="ms-noloc-title">${_T("Lokatsiya topilmadi","Локация топилмади","Местоположение не найдено","Location not found")}</div>
        <div class="ms-noloc-text">${_T(
          "Yaqin masjidlarni ko'rish uchun lokatsiyangizni yuboring.",
          "Яқин масжидларни кўриш учун локациянгизни юборинг.",
          "Поделитесь геолокацией для поиска мечетей.",
          "Share your location to find nearby mosques."
        )}</div>
        <button class="ms-noloc-btn" id="ms-request-loc">
          📍 ${_T("Lokatsiyani yuborish","Локацияни юбориш","Поделиться геолокацией","Share Location")}
        </button>
      </div>`;
    }
    if (_notFound) {
      return `<div class="ms-noloc">
        <div class="ms-noloc-icon">🕌</div>
        <div class="ms-noloc-title">${_T(
          "Bu hududda masjid topilmadi",
          "Бу ҳудудда масжид топилмади",
          "В этом районе мечетей нет",
          "No mosques found in this area"
        )}</div>
        <div class="ms-noloc-text">${_T(
          "50 km radiusda birorta ham masjid topilmadi. Iltimos, boshqa lokatsiya yuboring.",
          "50 км радиусда ҳеч қандай масжид топилмади. Илтимос, бошқа локация юборинг.",
          "В радиусе 50 км мечетей не найдено. Попробуйте другое место.",
          "No mosques found within 50 km. Please share a different location."
        )}</div>
        <button class="ms-noloc-btn" id="ms-request-loc">
          📍 ${_T("Boshqa lokatsiya yuborish","Бошқа локация юбориш","Другое место","Change Location")}
        </button>
      </div>`;
    }
    if (!_mosques.length) {
      return `<div class="ms-empty">🕌 ${_T('Yaqin atrofda masjid topilmadi','Яқин атрофда масжид топилмади','Мечети не найдены','No mosques found nearby')}</div>`;
    }
    const rKm = _radius / 1000;
    const expandNotice = (_radius > RADIUS_DEFAULT)
      ? `<div class="ms-expand-notice">📍 ${_T(
          `Yaqin atrofda kam masjid topildi. Qidiruv radiusi ${rKm} km ga kengaytirildi.`,
          `Яқин атрофда кам масжид топилди. Қидирув радиуси ${rKm} км га кенгайтирилди.`,
          `В этом районе мало мечетей. Радиус расширен до ${rKm} км.`,
          `Few mosques nearby. Search radius expanded to ${rKm} km.`
        )}</div>`
      : '';
    const notice = expandNotice;
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
      const svgX = Math.max(8, Math.min(292, 150 + (dx / _radius) * 128));
      const svgY = Math.max(8, Math.min(122, 65  - (dy / _radius) * 54));
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
    _el.querySelector('#ms-change-loc')?.addEventListener('click', _changeLocation);
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
      if (e.target.closest('#ms-request-loc')) { _changeLocation(); return; }
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
    const rKm    = _radius / 1000;
    const rLabel = _T(`${rKm} km radius`, `${rKm} км радиус`, `${rKm} км радиус`, `${rKm} km radius`);
    return _city ? `📍 ${_city} · ${rLabel}` : `📍 ${rLabel}`;
  }

  /* ══════════════════════════════════════════════
     Cache
  ══════════════════════════════════════════════ */
  function _loadFromCache() {
    try {
      const c = JSON.parse(localStorage.getItem(_cacheKey()) || 'null');
      if (c && Array.isArray(c.mosques) && c.mosques.length > 0) {
        _lat = c.lat; _lon = c.lon; _mosques = c.mosques; _city = c.city || '';
        return true;
      }
    } catch (_e) {}
    return false;
  }

  function _saveCache() {
    try {
      localStorage.setItem(_cacheKey(), JSON.stringify({
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
