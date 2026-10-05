/* ═══════════════════════════════════════════════════════════════
   Qibla Screen — Navy+Gold UI
   ✅ 3 tabs: Kompas / Xarita / Ma'lumot
   ✅ SVG compass with ticks, cardinals, live needle rotation
   ✅ Device orientation + cached GPS + geo fallback
   ✅ Distance, direction, coordinate cards
   ═══════════════════════════════════════════════════════════════ */

const QiblaScreen = (function () {

  /* Single source of truth for geography — see native/qibla-geo.js */
  const KAABA_LAT = QiblaGeo.KAABA_LAT;
  const KAABA_LON = QiblaGeo.KAABA_LON;
  const S  = 250;               /* SVG compass size */
  const CX = 125, CY = 125;    /* center */
  const R  = 116;               /* radius = S/2 - 9 */

  let _lang        = 'uz';
  let _tab         = 'kompas';

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }
  let _lat         = null;
  let _lon         = null;
  let _city        = '';
  let _qiblaAngle  = 0;
  let _distKm      = 0;
  let _deviceNorth = 0;
  let _orientCb    = null;
  let _el          = null;
  let _found       = false;
  let _gpsAccuracyM   = null;  // meters, from position.coords.accuracy — real, never fabricated
  let _compassAccDeg  = null;  // degrees, from webkitCompassAccuracy when the platform provides it
  let _hasOrientation = false; // true once at least one real orientation event has been received
  let _calibrating    = false; // true when we've detected the compass needs the figure-8 gesture
  let _orientationStarted = false;
  let _hasAbsoluteOrientation = false;
  let _awaitingOrientationPermission = false;
  let _active = false;
  let _generation = 0;
  let _locationRequest = 0;
  let _nativeCompass = null;
  let _nativeListener = null;
  let _nativeActive = false;
  let _orientationTimer = null;
  let _visibilityCb = null;
  let _lastReadingAt = 0;
  let _sensorStatus = 'waiting';
  let _needsFlat = false;
  let _iosPermissionGranted = false;
  let _sensorSource = 'browser';
  let _mapV7 = null;
  let _mapV7Module = null;
  let _mapV7Ready = false;
  let _mapYouMarker = null;
  let _mapKaabaMarker = null;
  let _routeGlobe = null;
  let _routeGlobeReady = false;

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    // App boot builds every screen, including hidden ones. Sensors and GPS
    // belong to an explicitly activated route, not to that initial shell.
    _lang = window.App?.state?.lang || 'uz';
    _tab = 'kompas';
    unload();
    _resetRuntimeState();
    _el = document.getElementById('screen-qibla');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
  }

  function activate(lang) {
    if (!_active || _lang !== lang) load(lang);
  }

  function load(lang) {
    _lang = lang;
    _tab = 'kompas'; _found = false;
    unload();
    _resetRuntimeState();
    _el = document.getElementById('screen-qibla');
    if (!_el) return;
    _active = true;
    _el.innerHTML = _buildHTML();
    _bind();
    _ensureRouteGlobe();
    _startOrientation();
    _startLocation();
  }

  function unload() {
    _active = false;
    _generation++;
    _locationRequest++;
    if (_orientCb) {
      window.removeEventListener('deviceorientationabsolute', _orientCb);
      window.removeEventListener('deviceorientation', _orientCb);
      _orientCb = null;
    }
    if (_visibilityCb) document.removeEventListener('visibilitychange', _visibilityCb);
    _visibilityCb = null;
    if (_orientationTimer) clearInterval(_orientationTimer);
    _orientationTimer = null;
    if (_nativeListener) Promise.resolve(_nativeListener.remove()).catch(() => {});
    _nativeListener = null;
    if (_nativeCompass) _nativeCompass.stop().catch(() => {});
    _nativeCompass = null;
    _nativeActive = false;
    _orientationStarted = false;
    if (_mapYouMarker) { try { _mapYouMarker.remove(); } catch (_) {} }
    if (_mapKaabaMarker) { try { _mapKaabaMarker.remove(); } catch (_) {} }
    _mapYouMarker = null;
    _mapKaabaMarker = null;
    if (_mapV7) { try { _mapV7.remove(); } catch (_) {} }
    _mapV7 = null;
    _mapV7Ready = false;
    if (_routeGlobe) { try { _routeGlobe.remove(); } catch (_) {} }
    _routeGlobe = null;
    _routeGlobeReady = false;
  }

  function _resetRuntimeState() {
    _lat = null; _lon = null; _city = '';
    _qiblaAngle = 0; _distKm = 0; _deviceNorth = 0;
    _found = false; _gpsAccuracyM = null; _compassAccDeg = null;
    _hasOrientation = false; _hasAbsoluteOrientation = false;
    _calibrating = false; _awaitingOrientationPermission = false;
    _sensorStatus = 'waiting'; _needsFlat = false; _lastReadingAt = 0;
    _sensorSource = 'browser';
  }

  /* ══════════════════════════════════════════════
     Full HTML (built once)
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    return `
<div class="qb-hdr">
  <img class="qb-hdr-photo" src="assets/reference-ui/qibla-hero.png" alt="Earth view toward Makkah" loading="eager">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov"></div>
  <div class="qb-hdr-inner">
    <div class="qb-nav-row">
      <button class="qb-back" id="qb-back"><img src="assets/icons/tabler/chevron-right.svg" alt="" aria-hidden="true"><span>${_T('Menyu','Меню','Меню','Menu')}</span></button>
      <div class="qb-nav-actions">
        <div id="qb-gps-badge"></div>
        <button class="qb-settings-btn" id="qb-settings" aria-label="Settings"><img src="assets/icons/tabler/settings.svg" alt="" aria-hidden="true"></button>
      </div>
    </div>
    <div class="qb-title">${_T("Qibla yo'nalishi","Қибла йўналиши","Направление Киблы","Qibla Direction")}</div>
    <div class="qb-artitle">Masjid al-Haram <span class="qb-artitle-ar" lang="ar" dir="rtl">اتجاه القبلة</span></div>
    <div class="qb-verse-intro" data-quran-verse="106:3"></div>
    <div class="qb-hdivider"></div>
    <div class="qb-tabs">
      <button class="qb-tab active" data-tab="kompas"><img src="assets/icons/tabler/compass.svg" alt="" aria-hidden="true"> ${_T('Kompas','Компас','Компас','Compass')}</button>
      <button class="qb-tab" data-tab="xarita"><img src="assets/icons/tabler/map.svg" alt="" aria-hidden="true"> ${_T('Xarita','Харита','Карта','Map')}</button>
      <button class="qb-tab" data-tab="malumot"><img src="assets/icons/tabler/info-circle.svg" alt="" aria-hidden="true"> ${_T("Ma'lumot","Маълумот","Информация","Info")}</button>
    </div>
  </div>
</div>
<div class="qb-body">
  ${_panelKompas()}
  ${_panelXarita()}
  ${_panelMalumot()}
</div>`;
  }

  /* ══════════════════════════════════════════════
     Panel builders
  ══════════════════════════════════════════════ */

  /* ── Kompas ── */
  function _panelKompas() {
    /* Minor ticks every 30°, strong ticks on the four cardinals (reference style). */
    const ticks = Array.from({length: 12}, (_, i) => {
      const deg = i * 30, card = deg % 90 === 0;
      const rad = (deg - 90) * Math.PI / 180;
      const r1 = card ? R + 3 : R - 4, r2 = card ? R - 13 : R - 10;
      return `<line x1="${(CX + r1*Math.cos(rad)).toFixed(1)}" y1="${(CY + r1*Math.sin(rad)).toFixed(1)}"
        x2="${(CX + r2*Math.cos(rad)).toFixed(1)}" y2="${(CY + r2*Math.sin(rad)).toFixed(1)}"
        stroke="${card ? '#0b6b47' : 'rgba(11,107,71,.28)'}" stroke-width="${card ? 3 : 1.2}" stroke-linecap="round"/>`;
    }).join('');

    /* International compass marks stay unambiguous in all 13 languages. */
    const cards = [{a:0,l:'N'},{a:90,l:'E'},{a:180,l:'S'},{a:270,l:'W'}];
    const cardText = cards.map(({a, l}) => {
      const rad = (a - 90) * Math.PI / 180, r2 = R - 30;
      return `<text x="${(CX + r2*Math.cos(rad)).toFixed(1)}"
        y="${(CY + r2*Math.sin(rad) + 5.5).toFixed(1)}"
        text-anchor="middle" font-size="16"
        font-family="Inter,system-ui,sans-serif" font-weight="700"
        fill="#10262d">${l}</text>`;
    }).join('');

    /* Qibla pointer at 0° (up); rotated by transform. Same shape for the live
       needle and the static north-up bearing diagram. */
    const tipY = CY - (R - 22), dotY = CY - (R - 14);
    const pointer = (id, vis) => `
    <g id="${id}" visibility="${vis}">
      <polygon points="${CX - 13},${CY - 8} ${CX + 13},${CY - 8} ${CX + 2.5},${tipY} ${CX - 2.5},${tipY}"
        fill="url(#qb-pointer)"/>
      <circle cx="${CX}" cy="${dotY}" r="6.5" fill="#0b7a4f" stroke="#fff" stroke-width="2.5"/>
    </g>`;

    return `
<div id="qb-panel-kompas" class="qb-panel">

  <div class="qb-route-globe-wrap">
    <div id="qb-route-globe" class="qb-route-globe" aria-label="${_T('Sizdan Ka’bagacha 3D yo‘l','Сиздан Каъбагача 3D йўл','3D маршрут от вас до Каабы','3D route from you to Kaaba')}"></div>
    <div class="qb-route-globe-label">${_T('Joylashuvingizdan Ka’bagacha','Жойлашувингиздан Каъбагача','От вашего местоположения до Каабы','Your location → Kaaba')}</div>
    <div class="qb-route-globe-actions">
      <button type="button" id="qb-globe-you">${_T('Men','Мен','Я','Me')}</button>
      <button type="button" id="qb-globe-route">${_T('Yo‘l','Йўл','Маршрут','Route')}</button>
      <button type="button" id="qb-globe-kaaba">🕋</button>
    </div>
  </div>

  <div id="qb-load-badge" class="qb-load-badge">
    <span class="qb-load-spin"></span>
    <span>${_T('Joylashuv aniqlanmoqda...','Жойлашув аниқланмоқда...','Определение местоположения...','Detecting location...')}</span>
  </div>
  <div id="qb-location-error-badge" class="qb-found-badge qb-location-error-badge" style="display:none">
    <span id="qb-location-error-text">${_T('Joylashuv olinmadi','Жойлашув олинмади','Не удалось определить местоположение','Location unavailable')}</span>
    <button id="qb-location-retry-btn" type="button">${_T('Qayta urinish','Қайта уриниш','Повторить','Retry')}</button>
  </div>
  <div id="qb-found-badge" class="qb-found-badge" style="display:none">
    <div class="qb-found-dot"></div>
    <span class="qb-found-txt">${_T('Qibla topildi','Қибла топилди','Кибла найдена','Qibla found')}</span>
    <span style="color:rgba(22,33,43,.55)">·</span>
    <span id="qb-badge-deg" class="qb-badge-deg">—°</span>
    <span id="qb-badge-dir" class="qb-badge-dir">—</span>
  </div>
  <div id="qb-calibrate-badge" class="qb-found-badge qb-calibrate-badge" style="display:none">
    <span>🧭 ${_T("Kompas kalibrlanmoqda — telefonni 8 shaklida aylantiring","Компас калибрланмоқда — телефонни 8 шаклида айлантиринг",'Калибровка компаса — двигайте телефон по форме "8"','Calibrating compass — move your phone in a figure-8')}</span>
  </div>
  <div id="qb-sensor-status" class="qb-found-badge qb-location-error-badge" role="status" aria-live="polite" style="display:none"></div>
  <div id="qb-ios-permission-badge" class="qb-found-badge qb-ios-permission-badge" style="display:none">
    <button id="qb-ios-permission-btn" class="qb-ios-permission-btn">
      ${_T('Kompasni yoqish','Компасни ёқиш','Включить компас','Enable compass')}
    </button>
  </div>
  <div id="qb-ios-denied-badge" class="qb-found-badge qb-ios-denied-badge" style="display:none">
    ${_T("Kompas ruxsati berilmadi. Sozlamalarda yoqing.","Компас рухсати берилмади. Созламаларда ёқинг.",'Разрешение на компас не дано. Включите в настройках устройства.','Compass permission denied. Enable it in your device settings.')}
  </div>

  <div class="qb-compass-stack" style="width:${S}px;height:${S}px">
  <svg id="qb-compass-svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs>
      <linearGradient id="qb-pointer" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#1fa36f"/>
        <stop offset="100%" stop-color="#0b7a4f"/>
      </linearGradient>
      <clipPath id="qb-kaaba-clip"><circle cx="${CX}" cy="${CY}" r="21"/></clipPath>
    </defs>
    <circle cx="${CX}" cy="${CY}" r="${R + 5}" fill="#fff"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="#fff" stroke="rgba(11,107,71,.14)" stroke-width="1"/>
    <circle cx="${CX}" cy="${CY}" r="${(R * 0.66).toFixed(0)}" fill="none" stroke="rgba(11,107,71,.09)" stroke-width="1"/>
    <circle cx="${CX}" cy="${CY}" r="${(R * 0.4).toFixed(0)}" fill="none" stroke="rgba(11,107,71,.09)" stroke-width="1"/>
    <!-- Dial: follows the live heading; north-up when only the bearing is known. -->
    <g id="qb-compass-dial" visibility="hidden">
    ${ticks}
    ${cardText}
    <line x1="${CX}" y1="${CY - 30}" x2="${CX}" y2="${CY - (R - 44)}"
      stroke="#0b7a4f" stroke-width="1.6" stroke-dasharray="5 4" stroke-linecap="round" opacity=".75"/>
    </g>
    <!-- Static bearing diagram (north-up) — only while no live compass reading. -->
    ${pointer('qb-bearing-static', 'hidden')}
    <!-- Live Qibla needle — rotated via setAttribute -->
    ${pointer('qb-needle', 'hidden')}
    <!-- Center: Kaaba -->
    <circle cx="${CX}" cy="${CY}" r="27" fill="#fff" stroke="#0b7a4f" stroke-width="2.5"/>
    <image href="assets/reference-ui/kaaba-icon.png" x="${CX - 21}" y="${CY - 21}" width="42" height="42" preserveAspectRatio="xMidYMid slice" clip-path="url(#qb-kaaba-clip)"/>
  </svg>
  </div>
  <div id="qb-live-heading" class="qb-load-badge" style="display:none"></div>

  <div id="qb-igrid" class="qb-igrid" style="display:none">
    <div class="qb-icell">
      <svg class="qb-icell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>
      <div><div class="qb-icell-lbl">${_T('Qibla burchagi','Қибла бурчаги','Угол Киблы','Qibla angle')}</div>
      <div class="qb-icell-val" id="qb-ig-angle">—</div></div>
    </div>
    <div class="qb-icell">
      <svg class="qb-icell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4L3 11l7 3 3 7z" fill="currentColor"/></svg>
      <div><div class="qb-icell-lbl">${_T("Yo'nalish","Йўналиш","Направление","Direction")}</div>
      <div class="qb-icell-val" id="qb-ig-north">—</div></div>
    </div>
    <div class="qb-icell">
      <svg class="qb-icell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="none"/></svg>
      <div><div class="qb-icell-lbl">${_T("Ka'baga masofa","Каъбага масофа","Расстояние до Каабы","Distance to Ka'bah")}</div>
      <div class="qb-icell-val" id="qb-ig-dir">—</div></div>
    </div>
    <div class="qb-icell">
      <svg class="qb-icell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
      <div><div class="qb-icell-lbl">${_T('Aniqlik','Аниқлик','Точность','Accuracy')}</div>
      <div class="qb-icell-val" id="qb-ig-accuracy">—</div></div>
    </div>
  </div>

  <div class="qb-calibrate-tip">
    <span class="qb-calibrate-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 000 8c1.9 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 000-8c-1.9 0-3.5 1.3-5.5 4z"/></svg></span>
    <div class="qb-calibrate-copy">${_T('Aniqroq natija uchun telefoningizni "8-raqam" shaklida harakatlantiring.','Аниқроқ натижа учун телефонингизни "8-рақам" шаклида ҳаракатлантиринг.','Для точного результата двигайте телефон в форме «восьмёрки».','Calibrating compass — move your phone in a figure-8').replace(/("8[^"]*"|«[^»]*»)/, '<span>$1</span>')}</div>
    <img src="assets/reference-ui/qibla-calibration.png" alt="" aria-hidden="true">
    <img class="qb-calibrate-chevron" src="assets/icons/tabler/chevron-right.svg" alt="" aria-hidden="true">
  </div>

  <button class="qb-masjid-card" id="qb-open-haramayn-card">
    <img src="assets/landing/haram-makkah.webp" alt="Masjid al-Haram" loading="lazy">
    <span><strong>Masjid al-Haram</strong><small>${_T('Makka, Saudiya Arabistoni','Макка, Саудия Арабистони','Мекка, Саудовская Аравия','Makkah, Saudi Arabia')}</small></span>
    <span class="material-symbols-rounded" data-icon="chevron_right" aria-hidden="true">chevron_right</span>
  </button>
</div>`;
  }

  /* ── Xarita ── */
  function _panelXarita() {
    return `
<div id="qb-panel-xarita" class="qb-panel" style="display:none">

  <div class="qb-map-v7-shell" data-map-state="loading">
    <div id="qb-map-v7" class="qb-map-v7" aria-label="${_T('Qibla xaritasi','Қибла харитаси','Карта Киблы','Qibla map')}"></div>
    <div class="qb-map-v7-loading" id="qb-map-loading" role="status"><span></span>${_T('Xarita yuklanmoqda…','Харита юкланмоқда…','Карта загружается…','Loading map…')}</div>
    <div class="qb-map-v7-source">OpenFreeMap · MapLibre</div>
    <div class="qb-map-v7-badge qb-map-v7-badge--you"><span></span>${_T('Siz','Сиз','Вы','You')}</div>
    <div class="qb-map-v7-badge qb-map-v7-badge--kaaba">🕋 ${_T('Makka','Макка','Мекка','Makkah')}</div>
    <div class="qb-map-v7-distance" id="qb-map-dist-badge">~ — km</div>
    <div class="qb-map-v7-actions">
      <button type="button" id="qb-map-fit" class="qb-map-v7-action">${_T('Yo‘lni ko‘rsat','Йўлни кўрсат','Показать маршрут','Show route')}</button>
      <button type="button" id="qb-map-3d" class="qb-map-v7-action">3D</button>
    </div>
  </div>

  <div class="qb-coord-grid">
    <div class="qb-coord-card qb-coord-gold">
      <div class="qb-coord-head">📍 ${_T('Sizning joylashuvingiz','Сизнинг жойлашувингиз','Ваше местоположение','Your location')}</div>
      <div class="qb-coord-city" id="qb-coord-city">—</div>
      <div class="qb-coord-vals">
        <div id="qb-coord-lat">—</div>
        <div id="qb-coord-lon">—</div>
      </div>
    </div>
    <div class="qb-coord-card qb-coord-green">
      <div class="qb-coord-head">🕋 Masjid al-Haram</div>
      <div class="qb-coord-city">${_T('Makka','Макка','Мекка','Makkah')}</div>
      <div class="qb-coord-vals">
        <div>21.42° N</div>
        <div>39.82° E</div>
      </div>
    </div>
  </div>

  <div class="qb-dist-card">
    <div class="qb-dist-topline"></div>
    <div class="qb-dist-head">${_T("KA'BA MASOFASI","КАЪБА МАСОФАСИ","РАССТОЯНИЕ ДО КААБЫ","DISTANCE TO KA'BAH")}</div>
    <div class="qb-dist-row">
      <div>
        <div class="qb-dist-km" id="qb-dist-km">—</div>
        <div class="qb-dist-sub">km · ${_T("To'g'ri chiziq","Тўғри чизиқ","По прямой","Straight line")}</div>
      </div>
      <div style="text-align:right">
        <div class="qb-dist-angle" id="qb-dist-angle">—°</div>
        <div class="qb-dist-dir" id="qb-dist-dir">—</div>
      </div>
    </div>
  </div>
</div>`;
  }

  /* ── Ma'lumot ── */
  function _panelMalumot() {
    return `
<div id="qb-panel-malumot" class="qb-panel" style="display:none">

  <div class="qb-minfo-card">
    <div class="qb-minfo-topline"></div>
    <div class="qb-minfo-top">
      <div class="qb-minfo-ar">الكعبة المشرفة</div>
      <div class="qb-minfo-name">Ka'ba · Masjid al-Haram</div>
      <div class="qb-minfo-city">${_T('Makka al-Mukarrama, Saudiya Arabistoni','Макка ал-Мукаррама, Саудия Арабистони','Мекка аль-Мукаррама, Саудовская Аравия','Makkah al-Mukarramah, Saudi Arabia')}</div>
      <button class="qb-live-btn" id="qb-open-haramayn">${_T("Haramaynni ko'rish",'Ҳарамайнни кўриш','Открыть Харамайн','Open Haramayn')}</button>
    </div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T('Qibla burchagi','Қибла бурчаги','Угол Киблы','Qibla angle')}</span><span class="qb-mrow-val" id="qb-m-angle">—</span></div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T('Masofa','Масофа','Расстояние','Distance')}</span><span class="qb-mrow-val" id="qb-m-dist">—</span></div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T("Yo'nalish","Йўналиш","Направление","Direction")}</span><span class="qb-mrow-val" id="qb-m-dir">—</span></div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T('Hisoblash usuli','Ҳисоблаш усули','Метод расчёта','Calculation method')}</span><span class="qb-mrow-val">Haversine</span></div>
    <div class="qb-mrow last"><span class="qb-mrow-lbl">${_T('GPS aniqlik','GPS аниқлик','Точность GPS','GPS accuracy')}</span><span class="qb-mrow-val" id="qb-gps-accuracy-val">—</span></div>
  </div>

  <div class="qb-about-card">
    <div class="qb-about-lbl">${_T('QIBLA HAQIDA','ҚИБЛА ҲАҚИДА','О КИБЛЕ','ABOUT QIBLA')}</div>
    <div class="qb-about-txt">
      ${_T(
        "Qibla — namoz o'qilayotganda yuzlanish lozim bo'lgan Ka'ba tomoni. Ka'ba Masjid al-Haramning markazida, Makkai Mukarramada joylashgan.",
        "Қибла — намоз ўқилаётганда юзланиш лозим бўлган Каъба томони. Каъба Масжид ал-Харамнинг марказида, Маккаи Муккарамада жойлашган.",
        "Кибла — направление к Каабе, в сторону которой совершается намаз. Кааба находится в центре Масджид аль-Харама в Мекке.",
        "Qibla is the direction of the Ka'bah that Muslims face during prayer. The Ka'bah is located at the center of Masjid al-Haram in Makkah."
      )}
    </div>
  </div>

  <div class="qb-verse-card">
    <div class="qb-verse-ar">فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ</div>
    <div class="qb-verse-tr">"${_T('Masjid al-Haram tomonga yuzlan','Масжид ал-Ҳарам томонига юзлан','Обратись лицом к Масджид аль-Храму','Turn your face toward Masjid al-Haram')}"</div>
    <div class="qb-verse-ref">Al-Baqara, 2:144</div>
  </div>

</div>`;
  }

  /* ══════════════════════════════════════════════
     Events
  ══════════════════════════════════════════════ */
  function _bind() {
    _el.querySelector('#qb-back')?.addEventListener('click', () => {
      unload();
      window.App.navigate('screen-dashboard');
    });

    _el.querySelector('#qb-settings')?.addEventListener('click', () => {
      unload();
      SettingsScreen.load(_lang);
      window.App.navigate('screen-settings');
    });

    _el.querySelectorAll('.qb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        _el.querySelectorAll('.qb-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _el.querySelector('#qb-panel-kompas').style.display  = _tab==='kompas'  ? 'flex':'none';
        _el.querySelector('#qb-panel-xarita').style.display  = _tab==='xarita'  ? 'flex':'none';
        _el.querySelector('#qb-panel-malumot').style.display = _tab==='malumot' ? 'flex':'none';
        if (_tab === 'xarita') {
          _ensureMapV7();
          setTimeout(() => _mapV7?.resize(), 60);
        }
        // Pause the WebGL render loops off-screen — saves GPU/battery.
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    _el.querySelectorAll('#qb-open-haramayn, #qb-open-haramayn-card').forEach(btn => btn.addEventListener('click', () => {
      // Reuses the one canonical Haramayn module (domain/haramayn/registry.py
      // + HaramaynScreen) — never a second, independent video implementation.
      HaramaynScreen.load(_lang);
      window.App.navigate('screen-haramayn');
    }));

    _el.querySelector('#qb-ios-permission-btn')?.addEventListener('click', () => {
      const generation = _generation;
      DeviceOrientationEvent.requestPermission(true).then(state => {
        if (!_active || generation !== _generation) return;
        _awaitingOrientationPermission = false;
        _show('#qb-ios-permission-badge', false);
        if (state === 'granted') {
          _iosPermissionGranted = true;
          _attachOrientationListener();
        } else {
          _sensorStatus = 'denied';
          _show('#qb-ios-denied-badge', true);
        }
        _updateQualityBadge();
      }).catch(() => {
        if (!_active || generation !== _generation) return;
        _awaitingOrientationPermission = false;
        _sensorStatus = 'denied';
        _show('#qb-ios-permission-badge', false);
        _show('#qb-ios-denied-badge', true);
        _updateQualityBadge();
      });
    });

    _el.querySelector('#qb-location-retry-btn')?.addEventListener('click', () => {
      _show('#qb-location-error-badge', false);
      _show('#qb-load-badge', true);
      _browserGeo();
    });

    _el.querySelector('#qb-globe-you')?.addEventListener('click', () => _focusRouteGlobe('you'));
    _el.querySelector('#qb-globe-route')?.addEventListener('click', () => _focusRouteGlobe('route'));
    _el.querySelector('#qb-globe-kaaba')?.addEventListener('click', () => _focusRouteGlobe('kaaba'));
  }

  /* ══════════════════════════════════════════════
     Location
  ══════════════════════════════════════════════ */
  function _startLocation() {
    const generation = _generation;
    const current = () => _active && generation === _generation;
    /* cached coords → instant */
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    const cachedValid = Number.isFinite(sLat) && Number.isFinite(sLon)
      && Math.abs(sLat) <= 90 && Math.abs(sLon) <= 180;
    if (cachedValid) {
      _lat = sLat; _lon = sLon;
      const cachedAccuracy = parseFloat(localStorage.getItem('islamtime_last_accuracy') || '');
      _gpsAccuracyM = Number.isFinite(cachedAccuracy) && cachedAccuracy > 0 ? cachedAccuracy : null;
      _computeAndShow();
      _startOrientation();
    }

    /* Always refresh cached coordinates: users travel, and a stale Qibla is
       worse than a short GPS wait. The cache is only the instant first paint. */
    const lm = window.Telegram?.WebApp?.LocationManager;
    if (lm) {
      lm.init(() => {
        if (!current()) return;
        if (lm.isAccessGranted) {
          lm.getLocation(loc => {
            if (!current()) return;
            if (loc && QiblaGeo.validCoordinates(loc.latitude, loc.longitude)) {
              _lat = loc.latitude; _lon = loc.longitude;
              _gpsAccuracyM = Number.isFinite(loc.horizontal_accuracy) && loc.horizontal_accuracy > 0 ? loc.horizontal_accuracy : null;
              window.ThemeEngine?.setLocation(_lat, _lon);
              _computeAndShow(); _startOrientation();
            } else _browserGeo();
          });
        } else _browserGeo();
      });
    } else {
      _browserGeo();
    }
  }

  function _browserGeo() {
    const generation = _generation;
    const request = ++_locationRequest;
    const current = () => _active && generation === _generation && request === _locationRequest;
    if (!navigator.geolocation) {
      _showLocationError(_T('Bu qurilmada GPS mavjud emas','Бу қурилмада GPS мавжуд эмас','GPS недоступен на этом устройстве','GPS is unavailable on this device'));
      return;
    }

    const requestLocation = () => {
      if (!current()) return;
      navigator.geolocation.getCurrentPosition(
      pos => {
        if (!current()) return;
        if (!QiblaGeo.validCoordinates(pos.coords.latitude, pos.coords.longitude)) {
          _showLocationError(_T('Joylashuv olinmadi','Жойлашув олинмади','Не удалось определить местоположение','Location unavailable'));
          return;
        }
        _lat = pos.coords.latitude; _lon = pos.coords.longitude;
        _gpsAccuracyM = (typeof pos.coords.accuracy === 'number' && pos.coords.accuracy > 0) ? pos.coords.accuracy : null;
        localStorage.setItem('islamtime_last_lat', _lat);
        localStorage.setItem('islamtime_last_lon', _lon);
        window.ThemeEngine?.setLocation(_lat, _lon);
        if (_gpsAccuracyM !== null) localStorage.setItem('islamtime_last_accuracy', _gpsAccuracyM);
        localStorage.setItem('islamtime_last_location_at', Date.now());
        _show('#qb-location-error-badge', false);
        _computeAndShow(); _startOrientation();
      },
      err => {
        if (!current()) return;
        const denied = err && err.code === 1;
        _showLocationError(denied
          ? _T('GPS ruxsatini yoqing','GPS рухсатини ёқинг','Разрешите доступ к геолокации','Enable location permission')
          : _T('Joylashuv olinmadi','Жойлашув олинмади','Не удалось определить местоположение','Location unavailable'));
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
      );
    };

    if (typeof window._requestLocationPermission === 'function') {
      window._requestLocationPermission()
        .then(granted => {
          if (!current()) return;
          if (granted) requestLocation();
          else _showLocationError(_T('GPS ruxsatini yoqing','GPS рухсатини ёқинг','Разрешите доступ к геолокации','Enable location permission'));
        })
        .catch(requestLocation);
    } else requestLocation();
  }

  function _showLocationError(message) {
    if (!_found) _show('#qb-load-badge', false);
    _setText('#qb-location-error-text', message);
    _show('#qb-location-error-badge', true);
  }

  /* ══════════════════════════════════════════════
     Compute & update all views
  ══════════════════════════════════════════════ */
  function _computeAndShow() {
    if (!_active || !QiblaGeo.validCoordinates(_lat, _lon)) return;
    _qiblaAngle = _bearingToKaaba(_lat, _lon);
    _distKm     = _distToKaaba(_lat, _lon);
    _found      = true;
    if (_nativeCompass) _nativeCompass.setLocation({ latitude: _lat, longitude: _lon }).catch(() => {});

    const ang = Math.round(_qiblaAngle);
    const dir = _dirLabel(_qiblaAngle);

    /* GPS badge in header: "City, Country" for the current coordinates. */
    const gpsBadge = _el?.querySelector('#qb-gps-badge');
    if (gpsBadge) gpsBadge.innerHTML =
      `<img src="assets/icons/tabler/map-pin.svg" alt="" aria-hidden="true">
       <span class="qb-gps-txt">${_city || _T('Joylashuv topildi','Жойлашув топилди','Место найдено','Location found')}</span>
       <img class="qb-gps-chevron" src="assets/icons/tabler/chevron-right.svg" alt="" aria-hidden="true">`;
    if (!_city) _resolvePlace(_lat, _lon);

    /* Kompas: swap badges (found-vs-calibrating handled by _updateQualityBadge,
       gated on real GPS+compass quality, never shown unconditionally), fill grid */
    _show('#qb-load-badge',  false);
    _updateQualityBadge();

    const grid = _el?.querySelector('#qb-igrid');
    if (grid) grid.style.display = 'grid';
    _setText('#qb-ig-angle', `${ang}°`);
    _setText('#qb-ig-north', dir);
    _setText('#qb-ig-dir',   `${Math.round(_distKm).toLocaleString()} km`);

    /* 3D globe + 2D/3D route map */
    _updateRouteGlobe();
    _updateMap();

    /* Ma'lumot */
    _setText('#qb-m-angle', `${_qiblaAngle.toFixed(1)}°`);
    _setText('#qb-m-dist',  `${Math.round(_distKm).toLocaleString()} km`);
    _setText('#qb-m-dir',   dir);

    _updateNeedle();
  }

  async function _resolvePlace(lat, lon) {
    const generation = _generation;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`,
        { headers: { 'Accept-Language': _lang === 'uz_cyr' ? 'uz' : _lang } });
      const a = (await r.json()).address || {};
      const city = a.city || a.town || a.village || a.county || a.state || '';
      if (!city || generation !== _generation || lat !== _lat || lon !== _lon) return;
      _city = a.country ? `${city}, ${a.country}` : city;
      _setText('.qb-gps-txt', _city);
      _setText('#qb-coord-city', _city);
    } catch { /* keep "Location found" */ }
  }

  function _vectorToLngLat(point) {
    const lat = Math.asin(Math.max(-1, Math.min(1, point.y))) * 180 / Math.PI;
    const theta = Math.atan2(point.z, -point.x) * 180 / Math.PI;
    let lon = theta - 180;
    while (lon < -180) lon += 360;
    while (lon > 180) lon -= 360;
    return [lon, lat];
  }

  function _routeGeoJSON() {
    if (!Number.isFinite(_lat) || !Number.isFinite(_lon)) {
      return { type:'FeatureCollection', features:[] };
    }
    const coords = QiblaGeo.greatCirclePoints(_lat, _lon, KAABA_LAT, KAABA_LON, 72)
      .map(_vectorToLngLat);
    return {
      type:'FeatureCollection',
      features:[{ type:'Feature', properties:{}, geometry:{ type:'LineString', coordinates:coords } }]
    };
  }

  function _fitRouteGlobe() {
    if (!_routeGlobe || !_mapV7Module || !Number.isFinite(_lat) || !Number.isFinite(_lon)) return;
    const bounds = new _mapV7Module.LngLatBounds();
    const coords = _routeGeoJSON().features[0]?.geometry?.coordinates || [];
    coords.forEach(c => bounds.extend(c));
    if (!bounds.isEmpty()) {
      _routeGlobe.fitBounds(bounds, {
        padding:34,
        maxZoom:3.4,
        pitch:18,
        bearing:-8,
        duration:850,
      });
    }
  }

  function _focusRouteGlobe(target) {
    if (!_routeGlobe) return;
    if (target === 'you' && Number.isFinite(_lat) && Number.isFinite(_lon)) {
      _routeGlobe.easeTo({center:[_lon,_lat],zoom:5.2,pitch:30,bearing:0,duration:700});
    } else if (target === 'kaaba') {
      _routeGlobe.easeTo({center:[KAABA_LON,KAABA_LAT],zoom:5.4,pitch:30,bearing:0,duration:700});
    } else {
      _fitRouteGlobe();
    }
  }

  async function _ensureRouteGlobe() {
    const container = _el?.querySelector('#qb-route-globe');
    if (!container || _routeGlobe) return;
    try {
      _mapV7Module ||= await import('/vendor/maplibre/maplibre-gl.mjs');
      if (!container.isConnected) return;
      const ml = _mapV7Module;
      _routeGlobe = new ml.Map({
        container,
        style:'https://tiles.openfreemap.org/styles/liberty',
        center:Number.isFinite(_lon) && Number.isFinite(_lat) ? [_lon,_lat] : [30,30],
        zoom:Number.isFinite(_lat) ? 2.4 : 1.8,
        pitch:18,
        bearing:-8,
        attributionControl:false,
        antialias:true,
        dragRotate:true,
        touchZoomRotate:true,
        scrollZoom:true,
      });
      _routeGlobe.on('style.load', () => {
        try { _routeGlobe.setProjection({type:'globe'}); } catch (_) {}
      });
      _routeGlobe.on('load', () => {
        _routeGlobeReady = true;
        _routeGlobe.addSource('qb-globe-route', {type:'geojson',data:_routeGeoJSON()});
        _routeGlobe.addLayer({
          id:'qb-globe-route-glow',type:'line',source:'qb-globe-route',
          paint:{'line-color':'#ffffff','line-width':6,'line-opacity':0.7,'line-blur':3}
        });
        _routeGlobe.addLayer({
          id:'qb-globe-route',type:'line',source:'qb-globe-route',
          paint:{'line-color':'#10b981','line-width':3.2,'line-opacity':0.98}
        });
        _routeGlobe.addSource('qb-globe-points',{
          type:'geojson',
          data:{type:'FeatureCollection',features:[
            {type:'Feature',properties:{kind:'you'},geometry:{type:'Point',coordinates:[Number.isFinite(_lon)?_lon:20,Number.isFinite(_lat)?_lat:35]}},
            {type:'Feature',properties:{kind:'kaaba'},geometry:{type:'Point',coordinates:[KAABA_LON,KAABA_LAT]}}
          ]}
        });
        _routeGlobe.addLayer({
          id:'qb-globe-points',type:'circle',source:'qb-globe-points',
          paint:{
            'circle-radius':['match',['get','kind'],'kaaba',8,7],
            'circle-color':['match',['get','kind'],'kaaba','#f4c95d','#0d7a55'],
            'circle-stroke-color':'#ffffff',
            'circle-stroke-width':2.5
          }
        });
        _routeGlobe.addLayer({
          id:'qb-globe-labels',type:'symbol',source:'qb-globe-points',
          layout:{
            'text-field':['match',['get','kind'],'kaaba','Kaaba',_T('Siz','Сиз','Вы','You')],
            'text-size':11,
            'text-offset':[0,1.6],
            'text-anchor':'top',
            'text-font':['Noto Sans Regular']
          },
          paint:{
            'text-color':'#10262d',
            'text-halo-color':'#ffffff',
            'text-halo-width':1.5
          }
        });
        if (Number.isFinite(_lat) && Number.isFinite(_lon)) _fitRouteGlobe();
      });
      _routeGlobe.on('error', e => {
        if (e?.error) console.warn('[QiblaRouteGlobe] map error', e.error);
      });
    } catch (error) {
      console.warn('[QiblaRouteGlobe] unavailable', error);
    }
  }

  function _updateRouteGlobe() {
    if (_routeGlobeReady && _routeGlobe) {
      _routeGlobe.getSource('qb-globe-route')?.setData(_routeGeoJSON());
      _routeGlobe.getSource('qb-globe-points')?.setData({
        type:'FeatureCollection',
        features:[
          {type:'Feature',properties:{kind:'you'},geometry:{type:'Point',coordinates:[_lon,_lat]}},
          {type:'Feature',properties:{kind:'kaaba'},geometry:{type:'Point',coordinates:[KAABA_LON,KAABA_LAT]}}
        ]
      });
      _fitRouteGlobe();
    } else {
      _ensureRouteGlobe();
    }
  }

  function _mapMarkerElement(kind, label) {
    const el = document.createElement('div');
    el.className = 'qb-map-marker qb-map-marker--' + kind;
    el.setAttribute('aria-label', label);
    el.innerHTML = kind === 'kaaba'
      ? '<span class="qb-map-marker-pin">🕋</span><small>' + label + '</small>'
      : '<span class="qb-map-marker-pulse"></span><span class="qb-map-marker-dot"></span><small>' + label + '</small>';
    return el;
  }

  function _ensureMapMarkers() {
    if (!_mapV7 || !_mapV7Module || !Number.isFinite(_lat) || !Number.isFinite(_lon)) return;
    if (!_mapYouMarker) {
      _mapYouMarker = new _mapV7Module.Marker({
        element:_mapMarkerElement('you', _T('Siz','Сиз','Вы','You')),
        anchor:'center'
      }).setLngLat([_lon,_lat]).addTo(_mapV7);
    } else _mapYouMarker.setLngLat([_lon,_lat]);

    if (!_mapKaabaMarker) {
      _mapKaabaMarker = new _mapV7Module.Marker({
        element:_mapMarkerElement('kaaba', _T('Ka’ba','Каъба','Кааба','Kaaba')),
        anchor:'bottom'
      }).setLngLat([KAABA_LON,KAABA_LAT]).addTo(_mapV7);
    } else _mapKaabaMarker.setLngLat([KAABA_LON,KAABA_LAT]);
  }

  async function _ensureMapV7() {
    const container = _el?.querySelector('#qb-map-v7');
    if (!container || _mapV7) return;
    try {
      _mapV7Module ||= await import('/vendor/maplibre/maplibre-gl.mjs');
      const maplibregl = _mapV7Module;
      _mapV7 = new maplibregl.Map({
        container,
        style:'https://tiles.openfreemap.org/styles/liberty',
        center:[Number.isFinite(_lon) ? _lon : 20, Number.isFinite(_lat) ? _lat : 34],
        zoom:Number.isFinite(_lat) ? 3.15 : 2.25,
        minZoom:1.3,
        maxZoom:12,
        pitch:42,
        maxPitch:60,
        bearing:-10,
        attributionControl:false,
        antialias:true,
        dragRotate:true,
        touchZoomRotate:true,
        doubleClickZoom:true,
      });
      _mapV7.addControl(new maplibregl.NavigationControl({visualizePitch:true}), 'top-right');
      if (maplibregl.ScaleControl) {
        _mapV7.addControl(new maplibregl.ScaleControl({maxWidth:110, unit:'metric'}), 'bottom-left');
      }
      if (maplibregl.GlobeControl) _mapV7.addControl(new maplibregl.GlobeControl(), 'top-right');
      _mapV7.on('style.load', () => {
        try { _mapV7.setProjection({type:'globe'}); } catch (_) {}
      });
      _mapV7.on('load', () => {
        _mapV7Ready = true;
        const shell = _el?.querySelector('.qb-map-v7-shell');
        if (shell) shell.dataset.mapState = 'ready';
        _mapV7.addSource('qibla-route', { type:'geojson', data:_routeGeoJSON() });
        _mapV7.addLayer({
          id:'qibla-route-glow', type:'line', source:'qibla-route',
          paint:{ 'line-color':'#ffffff', 'line-width':7.5, 'line-opacity':0.82, 'line-blur':4 }
        });
        _mapV7.addLayer({
          id:'qibla-route', type:'line', source:'qibla-route',
          paint:{ 'line-color':'#0bb77d', 'line-width':3.6, 'line-opacity':1 }
        });
        _ensureMapMarkers();
        _fitMapV7();
      });
      _el?.querySelector('#qb-map-fit')?.addEventListener('click', _fitMapV7);
      _el?.querySelector('#qb-map-3d')?.addEventListener('click', () => {
        if (!_mapV7) return;
        const is3d = _mapV7.getPitch() > 20;
        _mapV7.easeTo({pitch:is3d?0:55,bearing:is3d?0:-18,duration:700});
      });
    } catch (error) {
      console.warn('[QiblaMapV7] unavailable', error);
      const shell = _el?.querySelector('.qb-map-v7-shell');
      if (shell) shell.dataset.mapState = 'error';
      container.innerHTML = '<div class="qb-map-v7-fallback">' +
        _T('Xarita hozir mavjud emas','Харита ҳозир мавжуд эмас','Карта сейчас недоступна','Map unavailable') +
        '</div>';
    }
  }

  function _fitMapV7() {
    if (!_mapV7 || !Number.isFinite(_lat) || !Number.isFinite(_lon)) return;
    const bounds = new _mapV7Module.LngLatBounds();
    _routeGeoJSON().features[0]?.geometry?.coordinates?.forEach(c => bounds.extend(c));
    if (!bounds.isEmpty()) _mapV7.fitBounds(bounds, {
      padding:{top:54,right:42,bottom:66,left:42},
      maxZoom:4.8,
      pitch:42,
      bearing:-10,
      duration:850
    });
  }

  function _updateMap() {
    _setText('#qb-map-dist-badge', `~ ${Math.round(_distKm).toLocaleString()} km`);
    _setText('#qb-coord-city', _city || '—');
    _setText('#qb-coord-lat', Number.isFinite(_lat) ? `${Math.abs(_lat).toFixed(2)}° ${_lat < 0 ? 'S' : 'N'}` : '—');
    _setText('#qb-coord-lon', Number.isFinite(_lon) ? `${Math.abs(_lon).toFixed(2)}° ${_lon < 0 ? 'W' : 'E'}` : '—');
    _setText('#qb-dist-km', Math.round(_distKm).toLocaleString());
    _setText('#qb-dist-angle', `${Math.round(_qiblaAngle)}°`);
    _setText('#qb-dist-dir', _dirLabel(_qiblaAngle));

    if (_mapV7Ready && _mapV7) {
      _mapV7.getSource('qibla-route')?.setData(_routeGeoJSON());
      _ensureMapMarkers();
      _fitMapV7();
    } else if (_tab === 'xarita') {
      _ensureMapV7();
    }
  }

  /* ══════════════════════════════════════════════
     Orientation
  ══════════════════════════════════════════════ */
  function _startOrientation() {
    if (!_active || _orientationStarted || _awaitingOrientationPermission) return;
    // iOS 13+ requires an explicit, user-gesture-triggered permission grant
    // before deviceorientation events fire at all — without this, the
    // compass silently never works on iOS (no error, just zero events).
    const cap = window.Capacitor;
    const nativeCompass = cap?.isNativePlatform?.() && cap.getPlatform?.() === 'android'
      && cap.isPluginAvailable?.('Compass');
    // Modern Chromium can expose requestPermission too. Android's native
    // Compass plugin does not depend on permission for browser sensor events.
    const needsIosPermission = !nativeCompass && typeof DeviceOrientationEvent !== 'undefined'
      && typeof DeviceOrientationEvent.requestPermission === 'function';
    if (needsIosPermission && !_iosPermissionGranted) {
      _awaitingOrientationPermission = true;
      _show('#qb-ios-permission-badge', true);
      _updateQualityBadge();
      return; // _attachOrientationListener() runs after the user taps the prompt
    }
    _attachOrientationListener();
  }

  function _attachOrientationListener() {
    if (_orientationStarted) return;
    _orientationStarted = true;
    const generation = _generation;
    _lastReadingAt = Date.now();
    _orientCb = e => {
      if (!_active || _nativeActive || document.hidden || generation !== _generation) return;
      const screenAngle = Number(window.screen?.orientation?.angle ?? window.orientation ?? 0) || 0;
      const heading = QiblaGeo.absoluteHeadingFromEvent(e, screenAngle);
      if (heading === null) {
        if (!_hasOrientation && Number.isFinite(e.alpha)) _sensorStatus = 'relative';
        _updateQualityBadge();
        return;
      }
      _acceptHeading({
        heading,
        accuracyDegrees: Number.isFinite(e.webkitCompassAccuracy) && e.webkitCompassAccuracy >= 0 ? e.webkitCompassAccuracy : null,
        calibrationRequired: Number.isFinite(e.webkitCompassAccuracy) && e.webkitCompassAccuracy > 20,
        needsFlat: Number.isFinite(e.beta) && Number.isFinite(e.gamma)
          && Math.abs(Math.cos(e.beta * Math.PI / 180) * Math.cos(e.gamma * Math.PI / 180)) < 0.5,
      });
    };
    /* Some Android WebViews expose the absolute event property but only
       dispatch deviceorientation, so listen to both variants. */
    window.addEventListener('deviceorientationabsolute', _orientCb);
    window.addEventListener('deviceorientation', _orientCb);
    _visibilityCb = () => {
      _hasOrientation = false;
      _hasAbsoluteOrientation = false;
      _sensorStatus = 'waiting';
      _lastReadingAt = Date.now();
      _updateNeedle();
      _updateQualityBadge();
    };
    document.addEventListener('visibilitychange', _visibilityCb);
    // A missing sensor is not a calibration problem. Never leave a frozen arrow
    // labelled as live when WebView/browser events stop or never arrive.
    _orientationTimer = setInterval(() => {
      if (!_active || document.hidden || Date.now() - _lastReadingAt < 6000) return;
      _sensorStatus = _hasOrientation ? 'stale' : 'unavailable';
      _hasOrientation = false;
      _hasAbsoluteOrientation = false;
      _updateNeedle();
      _updateQualityBadge();
    }, 1500);
    _startNativeCompass(generation);
    _updateQualityBadge();
  }

  async function _startNativeCompass(generation) {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== 'android' || !cap.isPluginAvailable?.('Compass')) return;
    const plugin = cap.Plugins?.Compass || cap.registerPlugin('Compass');
    _nativeCompass = plugin;
    let listener;
    try {
      listener = await plugin.addListener('heading', reading => {
        if (!_active || generation !== _generation || document.hidden) return;
        if (reading.absolute !== true || !Number.isFinite(reading.heading)) return;
        _nativeActive = true;
        _sensorSource = 'native';
        _acceptHeading(reading);
      });
      if (!_active || generation !== _generation) {
        await listener.remove();
        return;
      }
      _nativeListener = listener;
      const result = await plugin.start(QiblaGeo.validCoordinates(_lat, _lon) ? { latitude: _lat, longitude: _lon } : {});
      if (!_active || generation !== _generation) return;
      _nativeActive = result.available === true;
      if (!_nativeActive && !_hasOrientation) {
        _sensorStatus = 'unavailable';
        _updateQualityBadge();
      }
    } catch (_) {
      // Keep the browser listener as a fallback if an older native shell lacks
      // this plugin or a vendor refuses sensor registration.
      if (listener) await Promise.resolve(listener.remove()).catch(() => {});
      if (generation !== _generation) return;
      _nativeListener = null;
      _nativeActive = false;
    }
  }

  function _acceptHeading(reading) {
    const heading = QiblaGeo.normalizeHeading(reading.heading);
    if (heading === null) return;
    _deviceNorth = _hasOrientation
      ? QiblaGeo.normalizeHeading(_deviceNorth + QiblaGeo.headingDelta(heading, _deviceNorth) * 0.35)
      : heading;
    _hasOrientation = true;
    _hasAbsoluteOrientation = true;
    _lastReadingAt = Date.now();
    _sensorStatus = 'ready';
    _compassAccDeg = Number.isFinite(reading.accuracyDegrees) && reading.accuracyDegrees >= 0 ? reading.accuracyDegrees : null;
    _calibrating = reading.calibrationRequired === true;
    _needsFlat = reading.needsFlat === true;
    _updateNeedle();
    _updateQualityBadge();
  }

  /* The bearing is valid as soon as GPS is known. This stricter quality gate
     is only for the live physical compass: it requires an absolute sensor
     reading and keeps GPS/compass accuracy separate. */
  function _qualityGood() {
    if (!_hasOrientation) return false;
    if (!_hasAbsoluteOrientation) return false;
    if (_gpsAccuracyM !== null && _gpsAccuracyM > 100) return false; // >100m fix is too coarse to trust
    if (_calibrating) return false;
    if (_needsFlat) return false;
    return true;
  }

  function _updateQualityBadge() {
    const good = _qualityGood();
    const calculated = _found && Number.isFinite(_qiblaAngle);
    _show('#qb-found-badge', calculated);
    _show('#qb-calibrate-badge', _hasOrientation && _calibrating && !_awaitingOrientationPermission);
    const status = _el?.querySelector('#qb-sensor-status');
    if (status) {
      let message = '';
      if (!_awaitingOrientationPermission && _sensorStatus !== 'denied') {
        if (!_hasOrientation && _sensorStatus === 'waiting') message = _sensorText('waiting');
        else if (!_hasOrientation) message = _sensorText('unavailable');
        else if (_needsFlat) message = _sensorText('flat');
      }
      status.textContent = message;
      status.style.display = message ? 'flex' : 'none';
    }
    const compass = _el?.querySelector('#qb-compass-svg');
    if (compass) {
      compass.dataset.sensorState = !_hasOrientation ? _sensorStatus : _needsFlat ? 'hold-flat' : _calibrating ? 'calibrating' : 'ready';
      compass.dataset.quality = good ? 'ready' : 'limited';
      compass.dataset.sensorSource = _sensorSource;
      compass.dataset.heading = _hasOrientation ? _deviceNorth.toFixed(1) : '';
    }
    const headingLabel = _el?.querySelector('#qb-live-heading');
    if (headingLabel) {
      headingLabel.style.display = _hasOrientation ? 'flex' : 'none';
      headingLabel.textContent = `${_sensorText('heading')} · ${Math.round(_deviceNorth) % 360}°`;
    }
    if (calculated) {
      const ang = Math.round(_qiblaAngle);
      _setText('#qb-badge-deg', `${ang}°`);
      _setText('#qb-badge-dir', _dirLabel(_qiblaAngle));
    }
    const accCell = _el?.querySelector('#qb-ig-accuracy');
    if (accCell) {
      accCell.textContent = _compassAccDeg !== null ? `±${Math.round(_compassAccDeg)}°` : _T('Nomaʼlum','Номаълум','Неизвестно','Unknown');
    }
    const gpsRow = _el?.querySelector('#qb-gps-accuracy-val');
    if (gpsRow) {
      gpsRow.textContent = _gpsAccuracyM !== null ? `±${Math.round(_gpsAccuracyM)} m` : _T('Nomaʼlum','Номаълум','Неизвестно','Unknown');
    }
  }

  function _updateNeedle() {
    const needle = _el?.querySelector('#qb-needle');
    if (!needle) return;
    const live = _hasOrientation && _hasAbsoluteOrientation;
    needle.setAttribute('visibility', _found && live ? 'visible' : 'hidden');
    // Without a live reading, show a north-up bearing diagram (like a map),
    // never the live needle; the sensor status text says it is not live.
    const bearing = _el?.querySelector('#qb-bearing-static');
    if (bearing) {
      bearing.setAttribute('visibility', _found && !live ? 'visible' : 'hidden');
      bearing.setAttribute('transform', `rotate(${_qiblaAngle.toFixed(1)}, ${CX}, ${CY})`);
    }
    const dial = _el?.querySelector('#qb-compass-dial');
    if (dial) {
      dial.setAttribute('visibility', live || _found ? 'visible' : 'hidden');
      dial.setAttribute('transform', `rotate(${(live ? -_deviceNorth : 0).toFixed(1)}, ${CX}, ${CY})`);
    }
    if (!_found || !_hasOrientation) return;
    const delta = QiblaGeo.headingDelta(_qiblaAngle, _deviceNorth);
    needle.setAttribute('transform', `rotate(${delta.toFixed(1)}, ${CX}, ${CY})`);
  }

  /* ══════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════ */
  function _bearingToKaaba(lat, lon) { return QiblaGeo.bearingToKaaba(lat, lon); }
  function _distToKaaba(lat, lon)    { return QiblaGeo.distanceToKaabaKm(lat, lon); }

  // Device-status copy, including all 13 supported languages and legacy choices.
  const SENSOR_COPY = {
    uz: ['Telefon yo‘nalishi', 'Kompas sensori kutilmoqda…', 'Kompas sensori ishlamayapti. Qibla burchagi va Xarita bo‘limidan foydalaning.', 'Telefonni tekis, ekranini yuqoriga qaratib ushlang.'],
    uz_cyr: ['Телефон йўналиши', 'Компас сенсори кутилмоқда…', 'Компас сенсори ишламаяпти. Қибла бурчаги ва Харита бўлимидан фойдаланинг.', 'Телефонни текис, экранини юқорига қаратиб ушланг.'],
    en: ['Phone heading', 'Waiting for the compass sensor…', 'Compass sensor unavailable. Use the Qibla bearing and Map tab.', 'Hold your phone flat with the screen facing up.'],
    ru: ['Направление телефона', 'Ожидание датчика компаса…', 'Датчик компаса недоступен. Используйте угол Киблы и вкладку «Карта».', 'Держите телефон горизонтально, экраном вверх.'],
    tr: ['Telefon yönü', 'Pusula sensörü bekleniyor…', 'Pusula sensörü kullanılamıyor. Kıble açısını ve Harita sekmesini kullanın.', 'Telefonu ekranı yukarı bakacak şekilde yatay tutun.'],
    ar: ['اتجاه الهاتف', 'في انتظار مستشعر البوصلة…', 'مستشعر البوصلة غير متاح. استخدم زاوية القبلة وعلامة تبويب الخريطة.', 'أمسك الهاتف بشكل أفقي مع توجيه الشاشة إلى الأعلى.'],
    de: ['Telefonausrichtung', 'Warten auf den Kompasssensor…', 'Kompasssensor nicht verfügbar. Nutzen Sie den Qibla-Winkel und die Karte.', 'Halten Sie das Telefon waagerecht mit dem Bildschirm nach oben.'],
    fr: ['Orientation du téléphone', 'En attente du capteur de boussole…', 'Capteur de boussole indisponible. Utilisez l’angle de la Qibla et l’onglet Carte.', 'Tenez le téléphone à plat, écran vers le haut.'],
    id: ['Arah ponsel', 'Menunggu sensor kompas…', 'Sensor kompas tidak tersedia. Gunakan sudut kiblat dan tab Peta.', 'Pegang ponsel mendatar dengan layar menghadap ke atas.'],
    hi: ['फ़ोन की दिशा', 'कंपास सेंसर की प्रतीक्षा है…', 'कंपास सेंसर उपलब्ध नहीं है। क़िबला कोण और मानचित्र टैब का उपयोग करें।', 'फ़ोन को समतल रखें और स्क्रीन को ऊपर की ओर रखें।'],
    ur: ['فون کی سمت', 'کمپاس سینسر کا انتظار ہے…', 'کمپاس سینسر دستیاب نہیں۔ قبلہ زاویہ اور نقشہ ٹیب استعمال کریں۔', 'فون کو ہموار رکھیں اور اسکرین اوپر کی طرف رکھیں۔'],
    bn: ['ফোনের দিক', 'কম্পাস সেন্সরের জন্য অপেক্ষা করা হচ্ছে…', 'কম্পাস সেন্সর পাওয়া যাচ্ছে না। কিবলার কোণ এবং মানচিত্র ট্যাব ব্যবহার করুন।', 'ফোনটি সমতল করে স্ক্রিন উপরের দিকে রাখুন।'],
    fa: ['جهت گوشی', 'در انتظار حسگر قطب‌نما…', 'حسگر قطب‌نما در دسترس نیست. از زاویه قبله و زبانه نقشه استفاده کنید.', 'گوشی را افقی و صفحه را رو به بالا نگه دارید.'],
    ms: ['Arah telefon', 'Menunggu sensor kompas…', 'Sensor kompas tidak tersedia. Gunakan sudut kiblat dan tab Peta.', 'Pegang telefon secara mendatar dengan skrin menghadap ke atas.'],
    kk: ['Телефон бағыты', 'Компас сенсоры күтілуде…', 'Компас сенсоры қолжетімсіз. Құбыла бұрышын және Карта бөлімін пайдаланыңыз.', 'Телефонды экран жағын жоғары қаратып, көлденең ұстаңыз.'],
    tg: ['Самти телефон', 'Интизори сенсори қутбнамо…', 'Сенсори қутбнамо дастрас нест. Кунҷи қибла ва бахши Харитаро истифода баред.', 'Телефонро уфуқӣ ва экранашро ба боло нигоҳ доред.'],
    ky: ['Телефондун багыты', 'Компас сенсору күтүлүүдө…', 'Компас сенсору жеткиликсиз. Кыбыла бурчун жана Карта бөлүмүн колдонуңуз.', 'Телефонду экранын өйдө каратып, туурасынан кармаңыз.'],
  };
  function _sensorText(key) {
    return (SENSOR_COPY[_lang] || SENSOR_COPY.en)[{ heading: 0, waiting: 1, unavailable: 2, flat: 3 }[key]];
  }

  const DIR_MAP = {
    uz:     ['Shimol',"Shimoli-sharq",'Sharq','Janubi-sharq','Janub',"Janubi-g'arb","G'arb","Shimoli-g'arb"],
    uz_cyr: ['Шимол','Шимоли-шарқ','Шарқ','Жанубий-шарқ','Жануб','Жанубий-ғарб','Ғарб','Шимоли-ғарб'],
    ru:     ['Север','Северо-восток','Восток','Юго-восток','Юг','Юго-запад','Запад','Северо-запад'],
    en:     ['North','Northeast','East','Southeast','South','Southwest','West','Northwest'],
    tr:     ['Kuzey','Kuzeydoğu','Doğu','Güneydoğu','Güney','Güneybatı','Batı','Kuzeybatı'],
    ar:     ['شمال','شمال شرق','شرق','جنوب شرق','جنوب','جنوب غرب','غرب','شمال غرب'],
    kk:     ['Солтүстік','Солтүстік-шығыс','Шығыс','Оңтүстік-шығыс','Оңтүстік','Оңтүстік-батыс','Батыс','Солтүстік-батыс'],
    tg:     ['Шимол','Шимоли-шарқ','Шарқ','Ҷанубу-шарқ','Ҷануб','Ҷанубу-ғарб','Ғарб','Шимоли-ғарб'],
    ky:     ['Түндүк','Түндүк-чыгыш','Чыгыш','Түштүк-чыгыш','Түштүк','Түштүк-батыш','Батыш','Түндүк-батыш'],
    de:     ['Nord','Nordost','Ost','Südost','Süd','Südwest','West','Nordwest'],
    fr:     ['Nord','Nord-est','Est','Sud-est','Sud','Sud-ouest','Ouest','Nord-ouest'],
    id:     ['Utara','Timur Laut','Timur','Tenggara','Selatan','Barat Daya','Barat','Barat Laut'],
    hi:     ['उत्तर','उत्तर-पूर्व','पूर्व','दक्षिण-पूर्व','दक्षिण','दक्षिण-पश्चिम','पश्चिम','उत्तर-पश्चिम'],
    ur:     ['شمال','شمال مشرق','مشرق','جنوب مشرق','جنوب','جنوب مغرب','مغرب','شمال مغرب'],
  };
  function _dirLabel(a) {
    const d = DIR_MAP[_lang] || {
      bn: ['উত্তর','উত্তর-পূর্ব','পূর্ব','দক্ষিণ-পূর্ব','দক্ষিণ','দক্ষিণ-পশ্চিম','পশ্চিম','উত্তর-পশ্চিম'],
      fa: ['شمال','شمال شرقی','شرق','جنوب شرقی','جنوب','جنوب غربی','غرب','شمال غربی'],
      ms: ['Utara','Timur laut','Timur','Tenggara','Selatan','Barat daya','Barat','Barat laut']
    }[_lang] || DIR_MAP.en;
    return d[Math.round(a / 45) % 8];
  }

  function _setText(sel, val) {
    const el = _el?.querySelector(sel); if (el) el.textContent = val;
  }
  function _setAttr(sel, attr, val) {
    const el = _el?.querySelector(sel); if (el) el.setAttribute(attr, val);
  }
  function _show(sel, visible) {
    const el = _el?.querySelector(sel);
    if (el) el.style.display = visible ? 'flex' : 'none';
  }

  return { render, activate, load, unload };
})();
