/* ═══════════════════════════════════════════════════════════════
   Masjidlar Screen — Navy+Gold UI
   Cached coordinates or GPS → bounded public OpenStreetMap request.
   Display each successful radius immediately; users may widen it explicitly.
   ═══════════════════════════════════════════════════════════════ */

const MosquesScreen = (function () {

  const OVERPASS_URL   = 'https://overpass-api.de/api/interpreter';
  const NOMINATIM_URL  = 'https://nominatim.openstreetmap.org/reverse';
  const RADIUS_DEFAULT = 10000;
  const GEO_TIMEOUT    = 15000;    /* ms to wait for geolocation (fallback to error UI) */

  /* Cache key is per-language so city names are always in the right script */
  function _cacheKey() { return 'islamtime_mosques_' + _lang + '_v3'; }

  let _lang       = 'uz';
  let _tab        = 'royxat';

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }
  let _lat        = null;
  let _lon        = null;
  let _city       = '';
  let _userId     = null;   /* Telegram user ID — for server-side location storage */
  let _mosques    = [];
  let _radius     = RADIUS_DEFAULT;
  let _loading    = false;
  let _noLocation = false;  /* true when no coords could be obtained */
  let _notFound   = false;
  let _loadError  = false;
  let _generation = 0;
  let _requestId  = 0;
  let _controller = null;
  let _selIdx     = null;
  let _el         = null;
  let _loadTimer  = null;
  let _map        = null;
  let _mapModule  = null;
  let _mapMarkers = [];

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
    if (_el.classList.contains('active')) _start();
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
    _generation++;
    _requestId++;
    _controller?.abort();
    _controller = null;
    _destroyMap();
    clearTimeout(_loadTimer);
    _loadTimer  = null;
    _tab        = 'royxat';
    _selIdx     = null;
    _noLocation = false;
    _notFound   = false;
    _loadError  = false;
    _loading    = false;
    _lat = null; _lon = null; _city = ''; _mosques = [];
    _radius     = RADIUS_DEFAULT;
    _userId     = window.App?.state?.user?.id || null;
  }

  /* ══════════════════════════════════════════════
     Boot sequence
  ══════════════════════════════════════════════ */
  async function _start() {
    const generation = _generation;
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
    if (_validCoords(sLat, sLon)) {
      _lat = sLat; _lon = sLon;
      await _fetchMosques(false);
      return;
    }

    /* 3. Server-stored location for this Telegram user */
    if (_userId) {
      const srv = await _loadLocationFromServer();
      if (generation !== _generation) return;
      if (srv) {
        _lat = srv.lat; _lon = srv.lon;
        if (srv.city) _city = srv.city;
        localStorage.setItem('islamtime_last_lat', _lat);
        localStorage.setItem('islamtime_last_lon', _lon);
        window.ThemeEngine?.refresh();
        await _fetchMosques(false);
        return;
      }
    }

    /* 4. Geolocation — Capacitor (Android native) or browser fallback */
    console.log('[GPS] mosques: request started');
    _loadTimer = setTimeout(() => {
      if (generation !== _generation) return;
      console.log('[GPS] mosques: timeout after', GEO_TIMEOUT, 'ms');
      _showNoLocation();
    }, GEO_TIMEOUT);

    _requestCurrentLocation(generation, false);
  }

  function _acceptLocation(generation, lat, lon) {
    if (generation !== _generation || !_validCoords(lat, lon)) return false;
    clearTimeout(_loadTimer);
    _loadTimer = null;
    _lat = Number(lat);
    _lon = Number(lon);
    _city = '';
    localStorage.setItem('islamtime_last_lat', _lat);
    localStorage.setItem('islamtime_last_lon', _lon);
    window.ThemeEngine?.setLocation(_lat, _lon);
    _saveLocationToServer(_lat, _lon, '');
    _fetchMosques(false);
    return true;
  }

  function _requestCurrentLocation(generation, forceHighAccuracy) {
    const Geo = window.Capacitor?.Plugins?.Geolocation;
    const native = !!window.Capacitor?.isNativePlatform?.();

    const browserFallback = () => {
      if (generation !== _generation) return;
      if (!navigator.geolocation) {
        clearTimeout(_loadTimer);
        _showNoLocation();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (!_acceptLocation(generation, pos.coords.latitude, pos.coords.longitude)) return;
          console.log('[GPS] mosques browser success');
        },
        err => {
          if (generation !== _generation) return;
          clearTimeout(_loadTimer);
          console.log('[GPS] mosques browser error', err?.code, err?.message);
          _showNoLocation();
        },
        {
          timeout: 12000,
          maximumAge: forceHighAccuracy ? 0 : 120000,
          enableHighAccuracy: !!forceHighAccuracy,
        }
      );
    };

    if (native && Geo) {
      console.log('[GPS] mosques: using Capacitor Geolocation');
      Geo.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: forceHighAccuracy ? 0 : 120000,
      }).then(pos => {
        if (!_acceptLocation(generation, pos?.coords?.latitude, pos?.coords?.longitude)) browserFallback();
      }).catch(err => {
        console.log('[GPS] mosques Capacitor error', err?.message || err);
        browserFallback();
      });
      return;
    }

    browserFallback();
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
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    if (!_validCoords(sLat, sLon)) return;
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
      if (_validCoords(d.lat, d.lon)) return d;
    } catch (_e) {}
    return null;
  }

  async function _saveLocationToServer(lat, lon, city) {
    if (!_userId) return;
    try {
      await fetch('/api/user/location', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ user_id: _userId, lat, lon, city }),
        signal : AbortSignal.timeout(5000),
      });
    } catch (_e) {}
  }

  /* "Lokatsiyani o'zgartirish" — clears all cached coords and re-requests */
  function _changeLocation() {
    _reset();
    const generation = _generation;
    localStorage.removeItem('islamtime_last_lat');
    localStorage.removeItem('islamtime_last_lon');
    ['ar','en','id','ur','bn','fr','hi','fa','tr','ru','uz','de','ms','uz_cyr','kk','tg','ky','ce','av'].forEach(l => {
      localStorage.removeItem('islamtime_mosques_' + l + '_v2');
      localStorage.removeItem('islamtime_mosques_' + l + '_v3');
    });
    _lat = null; _lon = null; _city = '';
    _mosques = []; _noLocation = false; _notFound = false;
    _loading = true;
    _refreshBody();

    console.log('[GPS] mosques: change location request');
    _loadTimer = setTimeout(() => { if (generation === _generation) _showNoLocation(); }, GEO_TIMEOUT);

    _requestCurrentLocation(generation, true);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  }

  /* ══════════════════════════════════════════════
     Overpass API fetch
  ══════════════════════════════════════════════ */
  async function _fetchMosques(background, radius) {
    if (!_validCoords(_lat, _lon)) return;
    if (radius === undefined) radius = _radius;
    const changedRadius = radius !== _radius;
    _radius = radius;
    _controller?.abort();
    const controller = new AbortController();
    _controller = controller;
    const requestId = ++_requestId;
    const timeout = setTimeout(() => controller.abort(), 18000);
    _loadError = false;
    _notFound = false;
    _noLocation = false;
    if (changedRadius) _mosques = [];
    _loading = !background;
    _refreshBody();

    /* Lightweight query. Keep it small enough for public Overpass servers. */
    const R = radius, LA = _lat, LO = _lon;
    const query = `[out:json][timeout:7];
(
  nwr["amenity"="mosque"](around:${R},${LA},${LO});
  nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${R},${LA},${LO});
  nwr["building"="mosque"](around:${R},${LA},${LO});
);
out center tags;`.trim();

    try {
      const params = new URLSearchParams({
        lat: String(LA),
        lon: String(LO),
        radius: String(R),
      });

      let data = null;

      /* Layer 1: our backend proxy. Give it a short deadline so a blocked
         Render egress path can never hold the mobile UI for 25 seconds. */
      const backendController = new AbortController();
      const abortBackend = () => backendController.abort();
      const backendTimer = setTimeout(abortBackend, 7000);
      controller.signal.addEventListener('abort', abortBackend, { once: true });
      try {
        const resp = await fetch('/api/mosques/nearby?' + params.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: backendController.signal,
        });
        if (resp.ok) {
          const candidate = await resp.json();
          if (Array.isArray(candidate?.elements)) data = candidate;
        }
      } catch (_backendError) {
        /* Direct provider fallback below. */
      } finally {
        clearTimeout(backendTimer);
        controller.signal.removeEventListener('abort', abortBackend);
      }

      /* Layer 2: direct-from-device Overpass fallback. This avoids hosting
         provider egress restrictions and races multiple public instances. */
      if (!data) {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const endpoints = [
          'https://overpass-api.de/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
          'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        ];
        const body = new URLSearchParams({ data: query }).toString();
        const directController = new AbortController();
        const abortDirect = () => directController.abort();
        const directTimer = setTimeout(abortDirect, 10000);
        controller.signal.addEventListener('abort', abortDirect, { once: true });

        try {
          data = await Promise.any(endpoints.map(async endpoint => {
            const resp = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              },
              body,
              signal: directController.signal,
              mode: 'cors',
            });
            if (!resp.ok) throw new Error('provider http ' + resp.status);
            const candidate = await resp.json();
            if (!Array.isArray(candidate?.elements)) throw new Error('provider payload');
            return candidate;
          }));
        } finally {
          clearTimeout(directTimer);
          controller.signal.removeEventListener('abort', abortDirect);
        }
      }

      if (requestId !== _requestId) return;
      if (!Array.isArray(data?.elements)) throw new Error('incomplete mosque response');

      const mapped = (data.elements || []).map(e => {
        const lat = e.lat ?? e.center?.lat;
        const lon = e.lon ?? e.center?.lon;
        if (!_validCoords(lat, lon)) return null;
        const t = e.tags || {};
        return {
          lat, lon,
          name : t.name || t['name:en'] || t['name:ar'] || t['name:pl'] || t['name:ru'] || '',
          ar   : t['name:ar'] || '',
          addr : [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '),
          opening_hours: t.opening_hours || '',
          phone: t.phone || t['contact:phone'] || t['contact:mobile'] || '',
          juma : t['prayer:friday'] || '',
          photo: /^https:\/\//i.test(t.image || '') ? t.image : '',
          website: /^https?:\/\//i.test(t.website || t['contact:website'] || '') ? (t.website || t['contact:website']) : '',
          wheelchair: t.wheelchair === 'yes',
          toilets: t.toilets === 'yes',
          distance: _haversine(LA, LO, lat, lon),
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

      _mosques = fresh.slice(0, 20);
      _notFound = !fresh.length;
      _saveCache();
      if (!_city) _fetchCity();
    } catch (_e) {
      if (requestId === _requestId) _loadError = true;
    } finally {
      clearTimeout(timeout);
      if (requestId === _requestId) {
        _controller = null;
        _loading = false;
        _refreshBody();
        _updateHeader();
      }
    }
  }

  /* Reverse geocode for city name */
  async function _fetchCity() {
    const generation = _generation, lat = _lat, lon = _lon;
    const acceptLang = _lang === 'uz_cyr' ? 'uz-Cyrl,uz' : normalizeLanguage(_lang);
    try {
      const r = await fetch(
        `${NOMINATIM_URL}?lat=${lat}&lon=${lon}&format=json&zoom=10`,
        { headers: { 'Accept-Language': acceptLang }, signal: AbortSignal.timeout(5000) }
      );
      const d = await r.json();
      if (generation !== _generation || lat !== _lat || lon !== _lon) return;
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
  <img class="ms-hdr-photo" src="assets/reference-ui/mosque-hero.png" alt="Mosque" loading="eager">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov"></div>
  <div class="ms-hdr-inner">
    <div class="ms-nav-row">
      <button class="ms-back" id="ms-back"><img src="assets/icons/tabler/chevron-right.svg" alt="" aria-hidden="true"><span>${_T('Menyu','Меню','Меню','Menu')}</span></button>
      <div class="ms-nav-actions">
        <button class="ms-change-loc" id="ms-change-loc"><img src="assets/icons/tabler/map-pin.svg" alt="" aria-hidden="true"><span id="ms-nav-city">${_T('Joylashuv','Жойлашув','Место','Location')}</span><img class="ms-location-chevron" src="assets/icons/tabler/chevron-right.svg" alt="" aria-hidden="true"></button>
        <button class="ms-settings-btn" id="ms-settings" type="button" aria-label="Settings"><img src="assets/icons/tabler/settings.svg" alt="" aria-hidden="true"></button>
      </div>
    </div>
    <div class="ms-title">${_T('Yaqin masjidlar','Яқин масжидлар','Ближайшие мечети','Nearby Mosques')}</div>
    <div class="ms-loc">${_T('Allohning uylari','Аллоҳнинг уйлари','Дома Аллаха','Houses of Allah')}</div>
    <div class="ms-verse" data-quran-verse="72:18"></div>
    <div class="ms-divider"></div>
    <div class="ms-tabs">
      <button class="ms-tab${_tab === 'royxat' ? ' active' : ''}" data-tab="royxat"><img src="assets/icons/tabler/list.svg" alt="" aria-hidden="true"> ${_T("Ro'yxat","Рўйхат","Список","List")}</button>
      <button class="ms-tab${_tab === 'xarita' ? ' active' : ''}" data-tab="xarita"><img src="assets/icons/tabler/map.svg" alt="" aria-hidden="true"> ${_T('Xarita','Харита','Карта','Map')}</button>
    </div>
  </div>
</div>
<div class="ms-body" id="ms-body"></div>`;
  }

  function _buildContent() {
    if (_loading && !_mosques.length) {
      return `<div class="ms-loading" role="status"><span class="ms-spinner"></span><div class="ms-load-txt">${_validCoords(_lat, _lon) ? t('mosques_loading', _lang) : _T('Joylashuv aniqlanmoqda...','Жойлашув аниқланмоқда...','Определение местоположения...','Detecting location...')}</div></div>`;
    }
    if (_noLocation) {
      return `<div class="ms-noloc">
        <div class="ms-noloc-icon">📍</div>
        <div class="ms-noloc-title">${_T("Joylashuv aniqlanmadi","Жойлашув аниқланмади","Местоположение не определено","Location not found")}</div>
        <div class="ms-noloc-text">${_T(
          "GPS ruxsat berilmagan yoki signal yo'q. Qayta urinib ko'ring yoki shahar tanlang.",
          "GPS рухсат берилмаган ёки сигнал йўқ. Қайта уриниб кўринг ёки шаҳар танланг.",
          "GPS недоступен. Повторите попытку или выберите город.",
          "GPS unavailable. Retry or select a city."
        )}</div>
        <button class="ms-noloc-btn" id="ms-request-loc">
          🔄 ${_T("Qayta urinish","Қайта уриниш","Повторить","Retry")}
        </button>
        <button class="ms-noloc-btn ms-noloc-btn-sec" id="ms-go-location">
          🏙️ ${_T("Shahar tanlash","Шаҳар танлаш","Выбрать город","Select City")}
        </button>
        <button class="ms-noloc-btn ms-noloc-btn-ghost" id="ms-go-home">
          ← ${_T("Asosiy menyu","Асосий меню","Главное меню","Main Menu")}
        </button>
      </div>`;
    }
    const errorNotice = _loadError ? `<div class="ms-noloc" role="status"><div class="ms-noloc-text">${t('mosques_load_error', _lang)}</div><button type="button" class="ms-noloc-btn" id="ms-retry">${t('mosques_retry', _lang)}</button></div>` : '';
    if (_loadError && !_mosques.length) return errorNotice;
    const radiusBar = `<div class="ms-radius-bar" aria-label="${_T('Qidiruv radiusi','Қидирув радиуси','Радиус поиска','Search radius')}">
      ${[10,2,5,25,50].map(km => `<button type="button" class="ms-radius-btn${_radius === km * 1000 ? ' active' : ''}" data-radius="${km * 1000}">${km} km</button>`).join('')}
    </div>`;
    if (_notFound || !_mosques.length) {
      return radiusBar + `<div class="ms-noloc">
        <div class="ms-noloc-icon">🕌</div>
        <div class="ms-noloc-title">${_T(
          "Bu hududda masjid topilmadi",
          "Бу ҳудудда масжид топилмади",
          "В этом районе мечетей нет",
          "No mosques found in this area"
        )}</div>
        <div class="ms-noloc-text">${_T('{n} km radius','{n} км радиус','{n} км радиус','{n} km radius').replace('{n}', _radius / 1000)}</div>
        <button class="ms-noloc-btn" id="ms-request-loc">
          📍 ${_T("Boshqa lokatsiya yuborish","Бошқа локация юбориш","Другое место","Change Location")}
        </button>
      </div>`;
    }
    const notice = errorNotice;
    const foundBar = `<div class="ms-found-bar"><img src="assets/icons/tabler/map-pin.svg" alt="" aria-hidden="true"><span>${_esc(_city) || _T('Yaqin atrof','Яқин атроф','Рядом','Nearby')} ${_T('atrofida','атрофида','—','area') } <strong>${_mosques.length} ${_T('ta','та','','')}</strong> ${_T('masjid topildi','масжид топилди','мечетей найдено','mosques found')}</span><img class="ms-found-info" src="assets/icons/tabler/info-circle.svg" alt="" aria-hidden="true"></div>`;
    if (_tab === 'royxat') return radiusBar + foundBar + notice + (_selIdx !== null ? _buildDetail() : _buildList());
    if (_tab === 'xarita') return radiusBar + foundBar + notice + _buildMap();
    if (_tab === 'jadval') return radiusBar + notice + _buildJadval();
    return '';
  }

  /* ── List ── */
  function _buildList() {
    return `<div class="ms-list">${_mosques.slice(0, 20).map((m, i) => {
      const dist   = _fmtDist(m.distance);
      const walk   = Math.max(1, Math.round(m.distance / 80));
      const isOpen = _isOpen(m.opening_hours);
      const dot    = isOpen === true ? '#4fcfa0' : isOpen === false ? '#e05555' : 'rgba(22,33,43,.28)';
      const txt    = isOpen === true ? `${_T('Ochiq','Очиқ','Открыто','Open')} · ${m.closes || ''}`.trimEnd().replace(/·\s*$/, '') : isOpen === false ? _T('Yopiq','Ёпиқ','Закрыто','Closed') : '';
      const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`;
      const facility = [m.wheelchair ? _T('Nogironlar uchun','Ногиронлар учун','Доступная среда','Wheelchair access') : '', m.toilets ? _T('Qulayliklar','Қулайликлар','Удобства','Facilities') : ''].filter(Boolean);
      return `<div class="ms-card" data-idx="${i}">
  ${m.photo ? `<img class="ms-card-photo" src="${_esc(m.photo)}" alt="${_esc(m.name)}" loading="lazy" referrerpolicy="no-referrer">` : '<div class="ms-card-photo ms-photo-placeholder" aria-hidden="true"><img src="assets/icons/tabler/mosque.svg" alt=""></div>'}
  <div class="ms-card-top">
    <div class="ms-card-left">
      <div class="ms-card-name">${_esc(m.name || 'Masjid')}</div>
      ${m.ar ? `<div class="ms-card-ar">${_esc(m.ar)}</div>` : ''}
      ${m.addr ? `<div class="ms-card-addr"><img src="assets/icons/tabler/map-pin.svg" alt="" aria-hidden="true">${_esc(m.addr)}</div>` : ''}
    </div>
    <div class="ms-card-right">
      <div class="ms-card-dist">${dist}</div>
      <div class="ms-card-walk">~${walk} ${_T('daqiqa yurish','дақиқа юриш','мин. ходьбы','min walk')}</div>
    </div>
  </div>
  <div class="ms-card-foot">
    <div class="ms-open-line">${txt ? `<div class="ms-open-dot" style="background:${dot}"></div><span class="ms-open-txt" style="color:${dot}">${_esc(txt)}</span>` : ''}</div>
    ${m.opening_hours && !txt ? `<span class="ms-card-hours">${_esc(m.opening_hours.substring(0, 28))}</span>` : ''}
    ${m.juma ? `<div class="ms-prayer-mini"><span><img src="assets/icons/tabler/clock.svg" alt="" aria-hidden="true"><small>${_T('Juma namozi','Жума намози','Джума-намаз','Friday prayer')}</small><strong>${_esc(m.juma)}</strong></span></div>` : ''}
    <div class="ms-facilities">${facility.map(x => `<span class="ms-facility">${_esc(x)}</span>`).join('')}</div>
  </div>
  <div class="ms-card-actions">
    <a class="ms-card-route" href="${routeUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><img src="assets/icons/tabler/route.svg" alt="" aria-hidden="true">${_T("Yo'nalish","Йўналиш","Маршрут","Directions")}</a>
    ${m.phone ? `<a class="ms-card-secondary" href="tel:${_esc(m.phone)}" onclick="event.stopPropagation()"><img src="assets/icons/tabler/phone.svg" alt="" aria-hidden="true">${_T("Qo'ng'iroq","Қўнғироқ","Позвонить","Call")}</a>` : ''}
    <button class="ms-card-secondary ms-save-btn" data-save-idx="${i}" type="button" aria-pressed="${_isSaved(m)}"><img src="assets/icons/tabler/bookmark.svg" alt="" aria-hidden="true">${_isSaved(m) ? '✓ ' : ''}${_T('Saqlash','Сақлаш','Сохранить','Save')}</button>
  </div>
</div>`;
    }).join('')}</div>
<div class="ms-osm-attr">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</div>`;
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
    const openC    = isOpen === true ? '#4fcfa0' : isOpen === false ? '#e05555' : '#16212B';
    const openTxt  = isOpen === true ? _T('Ochiq','Очиқ','Открыто','Open') : isOpen === false ? _T('Yopiq','Ёпиқ','Закрыто','Closed') : '—';
    const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`;
    const rows = [
      { l:_T('Manzil','Манзил','Адрес','Address'),    v: m.addr || '—' },
      { l:_T('Masofa','Масофа','Расстояние','Distance'),    v: `${dist} · ~${walk} ${_T('daqiqa yurish','дақиқа юриш','мин. ходьбы','min walk')}` },
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
  { ic:'🚶', l:_T('Piyoda','Пиёда','Пешком','Walking'),   t:`~${walk} ${_T('daqiqa','дақиқа','мин.','min')}`,  c:'#4fcfa0' },
  { ic:'🚌', l:_T('Avtobus','Автобус','Автобус','Bus'),    t:`${bus} ${_T('daqiqa','дақиқа','мин.','min')}`,  c:'#5b9bd5' },
  { ic:'🚗', l:_T('Mashina','Машина','Машина','Car'),      t:`${drive} ${_T('daqiqa','дақиқа','мин.','min')}`, c:'#16794A' },
].map(r => `
<a class="ms-route-row" href="${routeUrl}" target="_blank" rel="noopener">
  <span class="ms-route-ic">${r.ic}</span>
  <div class="ms-route-info">
    <div class="ms-route-name">${r.l}</div>
    <div class="ms-route-dist">${dist}</div>
  </div>
  <div class="ms-route-time" style="color:${r.c}">${r.t}</div>
</a>`).join('')}
<div class="ms-osm-attr">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</div>`;
  }

  /* ── Real interactive MapLibre map ── */
  function _buildMap() {
    const shown = _mosques.slice(0, 20);
    return `
<div class="ms-real-map-shell">
  <div id="ms-real-map" class="ms-real-map" aria-label="${_T('Masjidlar xaritasi','Масжидлар харитаси','Карта мечетей','Mosques map')}">
    <div class="ms-map-loading">${_T('Xarita yuklanmoqda...','Харита юкланмоқда...','Загрузка карты...','Loading map...')}</div>
  </div>
  <button type="button" class="ms-map-recenter" id="ms-map-recenter" aria-label="${_T('Mening joylashuvim','Менинг жойлашувим','Моё местоположение','My location')}">
    <img src="assets/icons/tabler/map-pin.svg" alt="">
  </button>
</div>
<div class="ms-map-list">
  ${shown.map((m,i)=>`
  <div class="ms-map-row${_selIdx===i?' sel':''}" data-idx="${i}">
    <div class="ms-map-num">${i+1}</div>
    <div class="ms-map-name">${_esc(m.name||'Masjid')}</div>
    <div class="ms-map-dist">${_fmtDist(m.distance)}</div>
  </div>`).join('')}
</div>`;
  }

  function _destroyMap() {
    for (const marker of _mapMarkers) { try { marker.remove(); } catch (_) {} }
    _mapMarkers = [];
    if (_map) { try { _map.remove(); } catch (_) {} _map = null; }
  }

  function _focusMosqueOnMap(index) {
    const m = _mosques[index];
    if (!_map || !m) return;
    _selIdx = index;
    _map.easeTo({center:[m.lon,m.lat],zoom:15.2,pitch:42,duration:650});
    (_el?.querySelectorAll('.ms-map-row')||[]).forEach((row,i)=>row.classList.toggle('sel',i===index));
    (_el?.querySelectorAll('.ms-live-marker-mosque')||[]).forEach((el,i)=>el.classList.toggle('active',i===index));
  }

  async function _ensureRealMap() {
    const container = _el?.querySelector('#ms-real-map');
    if (!container || !_validCoords(_lat,_lon) || !_mosques.length) return;
    try {
      _mapModule ||= await import('/vendor/maplibre/maplibre-gl.mjs');
      if (!container.isConnected) return;
      const ml = _mapModule;
      container.innerHTML = '';
      _map = new ml.Map({
        container,
        style:'https://tiles.openfreemap.org/styles/liberty',
        center:[_lon,_lat], zoom:12.7, pitch:38, bearing:0,
        antialias:true, attributionControl:true
      });
      _map.addControl(new ml.NavigationControl({visualizePitch:true}),'top-right');
      if (ml.ScaleControl) _map.addControl(new ml.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-left');

      _map.on('load',()=>{
        const youEl=document.createElement('div');
        youEl.className='ms-live-marker ms-live-marker-you';
        youEl.innerHTML='<span class="ms-live-marker-pulse"></span><span class="ms-live-marker-core"></span>';
        _mapMarkers.push(new ml.Marker({element:youEl,anchor:'center'}).setLngLat([_lon,_lat]).addTo(_map));

        _mosques.slice(0,20).forEach((m,i)=>{
          const el=document.createElement('button');
          el.type='button';
          el.className='ms-live-marker ms-live-marker-mosque';
          el.textContent=String(i+1);
          el.addEventListener('click',e=>{e.stopPropagation();_focusMosqueOnMap(i);});
          const popup=new ml.Popup({offset:22,closeButton:false,className:'ms-map-popup'})
            .setHTML('<strong>'+_esc(m.name||'Masjid')+'</strong><span>'+_fmtDist(m.distance)+'</span>');
          _mapMarkers.push(new ml.Marker({element:el,anchor:'center'}).setLngLat([m.lon,m.lat]).setPopup(popup).addTo(_map));
        });

        const bounds=new ml.LngLatBounds();
        bounds.extend([_lon,_lat]);
        _mosques.slice(0,20).forEach(m=>bounds.extend([m.lon,m.lat]));
        _map.fitBounds(bounds,{padding:{top:52,bottom:52,left:42,right:42},maxZoom:14.8,duration:650});
      });

      _el?.querySelector('#ms-map-recenter')?.addEventListener('click',()=>{
        _map?.easeTo({center:[_lon,_lat],zoom:14.5,pitch:35,duration:550});
      });
    } catch (error) {
      console.warn('[MosquesMap] unavailable',error);
      if (container.isConnected) container.innerHTML='<div class="ms-map-fallback">'+_T('Xarita vaqtincha mavjud emas','Харита вақтинча мавжуд эмас','Карта временно недоступна','Map temporarily unavailable')+'</div>';
    }
  }

  /* ── Schedule ── */
  function _buildJadval() {
    return `<div class="ms-sec-lbl">${_T('NAMOZ VAQTLARI (JUMA)','НАМОЗ ВАҚТЛАРИ (ЖУМА)','РАСПИСАНИЕ НАМАЗОВ (ДЖУМА)','PRAYER SCHEDULE (FRIDAY)')}</div>
${_mosques.slice(0, 8).map(m => {
  const isOpen = _isOpen(m.opening_hours);
  const dot    = isOpen === true ? '#4fcfa0' : isOpen === false ? '#e05555' : 'rgba(22,33,43,.28)';
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
    <div class="ms-jadval-cell"><div class="ms-jadval-lbl">${_T('Juma','Жума','Джума','Jumu\'ah')}</div><div class="ms-jadval-val">${m.juma ? _esc(m.juma) : '—'}</div></div>
    <div class="ms-jadval-cell"><div class="ms-jadval-lbl">${_T('Ish vaqti','Иш вақти','Часы работы','Opening hours')}</div><div class="ms-jadval-val">${m.opening_hours ? _esc(m.opening_hours.substring(0,10)) : '—'}</div></div>
    <div class="ms-jadval-cell"><div class="ms-jadval-lbl">${_T('Yurish','Юриш','Ходьба','Walk')}</div><div class="ms-jadval-val">~${walk} min</div></div>
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
    _el.querySelector('#ms-settings')?.addEventListener('click', () => { SettingsScreen.load(_lang); window.App.navigate('screen-settings'); });
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
      if (e.target.closest('#ms-retry')) { _fetchMosques(false); return; }
      const saveButton = e.target.closest('.ms-save-btn');
      if (saveButton) {
        const mosque = _mosques[Number(saveButton.dataset.saveIdx)];
        if (mosque) {
          const saved = _savedMosques(), key = `${mosque.lat},${mosque.lon}`;
          try { localStorage.setItem('islamtime_saved_mosques', JSON.stringify(saved.includes(key) ? saved.filter(id => id !== key) : [...saved, key])); } catch (_e) {}
          _refreshBody();
        }
        return;
      }
      const radiusBtn = e.target.closest('.ms-radius-btn');
      if (radiusBtn) {
        _selIdx = null;
        _loading = true;
        _refreshBody();
        _fetchMosques(false, Number(radiusBtn.dataset.radius));
        return;
      }
      if (e.target.closest('#ms-request-loc'))  { _changeLocation(); return; }
      if (e.target.closest('#ms-go-location'))  { window.App.navigate('screen-location'); return; }
      if (e.target.closest('#ms-go-home'))      { window.App.navigate('screen-dashboard'); return; }
      if (e.target.closest('#ms-detail-back')) { _selIdx = null; _refreshBody(); return; }
      const mapRow = e.target.closest('.ms-map-row');
      if (mapRow) { _focusMosqueOnMap(parseInt(mapRow.dataset.idx)); return; }
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
    if (!body) return;
    if (_map) _destroyMap();
    body.innerHTML = _buildContent();
    if (_tab === 'xarita' && _mosques.length && !_loading && !_loadError) {
      const schedule = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn => setTimeout(fn, 0));
      schedule(() => _ensureRealMap());
    }
  }

  function _updateHeader() {
    const navCity = _el?.querySelector('#ms-nav-city');
    if (navCity) navCity.textContent = _city || _T('Joylashuv','Жойлашув','Место','Location');
  }

  function _locLine() {
    const rKm    = _radius / 1000;
    const rLabel = _T('{n} km radius','{n} км радиус','{n} км радиус','{n} km radius').replace('{n}', rKm);
    return _city ? `📍 ${_city} · ${rLabel}` : `📍 ${rLabel}`;
  }

  /* ══════════════════════════════════════════════
     Cache
  ══════════════════════════════════════════════ */
  function _loadFromCache() {
    try {
      const c = JSON.parse(localStorage.getItem(_cacheKey()) || 'null');
      const lat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
      const lon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
      if (c && _validCoords(lat, lon) && _validCoords(c.lat, c.lon)
          && _haversine(lat, lon, c.lat, c.lon) < 1000
          && c.savedAt > Date.now() - 86400000 && c.savedAt <= Date.now()
          && Array.isArray(c.mosques) && c.mosques.length > 0) {
        _lat = lat; _lon = lon; _radius = c.radius || RADIUS_DEFAULT;
        _mosques = c.mosques.filter(m => _validCoords(m.lat, m.lon)).map(m => ({...m, distance: _haversine(lat, lon, m.lat, m.lon)}));
        _city = c.city || '';
        return _mosques.length > 0;
      }
    } catch (_e) {}
    return false;
  }

  function _saveCache() {
    try {
      localStorage.setItem(_cacheKey(), JSON.stringify({
        lat: _lat, lon: _lon, mosques: _mosques, city: _city, radius: _radius, savedAt: Date.now(),
      }));
    } catch (_e) {}
  }

  /* ══════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════ */
  function _fmtDist(d) {
    return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
  }

  function _validCoords(lat, lon) {
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  }

  function _savedMosques() {
    try { const saved = JSON.parse(localStorage.getItem('islamtime_saved_mosques') || '[]'); return Array.isArray(saved) ? saved : []; } catch (_e) { return []; }
  }

  function _isSaved(mosque) {
    return _savedMosques().includes(`${mosque.lat},${mosque.lon}`);
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
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  return { render, load };
})();
