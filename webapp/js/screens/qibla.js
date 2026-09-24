/* ═══════════════════════════════════════════════════════════════
   Qibla Screen — Navy+Gold UI
   ✅ 3 tabs: Kompas / Xarita / Ma'lumot
   ✅ SVG compass with ticks, cardinals, live needle rotation
   ✅ Device orientation + cached GPS + geo fallback
   ✅ Distance, direction, coordinate cards
   ═══════════════════════════════════════════════════════════════ */

const QiblaScreen = (function () {

  /* Single source of truth for geography — shared with EarthGlobe so the
     compass and the 3D globes never disagree. See native/qibla-geo.js */
  const KAABA_LAT = QiblaGeo.KAABA_LAT;
  const KAABA_LON = QiblaGeo.KAABA_LON;
  const S  = 300;               /* SVG compass size */
  const CX = 150, CY = 150;    /* center */
  const R  = 140;               /* radius = S/2 - 10 */

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
  let _routeGlobe     = null;  // EarthGlobe instance — top "global route" view
  let _compassGlobe   = null;  // EarthGlobe instance — behind the SVG compass

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _tab = 'kompas'; _found = false;
    _el = document.getElementById('screen-qibla');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
    _initGlobes();
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    if (sLat && sLon) { _lat = sLat; _lon = sLon; _computeAndShow(); }
  }

  function load(lang) {
    _lang = lang;
    _tab = 'kompas'; _found = false;
    unload();
    _el = document.getElementById('screen-qibla');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
    _initGlobes();
    _startLocation();
  }

  /* Real 3D globes (Three.js) when WebGL is available; the existing SVG
     compass + Xarita map tab already work fully without them, so no
     separate "fallback UI" is needed when it's not. */
  function _initGlobes() {
    if (typeof EarthGlobe === 'undefined' || !EarthGlobe.isSupported()) return;
    const routeEl = _el?.querySelector('#qb-route-globe');
    const compassEl = _el?.querySelector('#qb-compass-globe');
    if (routeEl) _routeGlobe = EarthGlobe.create(routeEl, 'route');
    if (compassEl) _compassGlobe = EarthGlobe.create(compassEl, 'compass');
  }

  function _destroyGlobes() {
    if (_routeGlobe)   { _routeGlobe.destroy();   _routeGlobe = null; }
    if (_compassGlobe) { _compassGlobe.destroy(); _compassGlobe = null; }
  }

  function unload() {
    _destroyGlobes();
    if (_orientCb) {
      window.removeEventListener('deviceorientationabsolute', _orientCb);
      window.removeEventListener('deviceorientation', _orientCb);
      _orientCb = null;
    }
  }

  /* ══════════════════════════════════════════════
     Full HTML (built once)
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    return `
<div class="qb-hdr">
  <img class="qb-hdr-photo" src="assets/earth/earth_atmos_2048.jpg" alt="Earth view toward Makkah" loading="eager">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov"></div>
  <div class="qb-hdr-inner">
    <div class="qb-nav-row">
      <button class="qb-back" id="qb-back">← ${_T('Menyu','Меню','Меню','Menu')}</button>
      <div class="qb-nav-actions">
        <div id="qb-gps-badge"></div>
        <button class="qb-settings-btn" id="qb-settings" aria-label="Settings"><span class="material-symbols-rounded" data-icon="settings" aria-hidden="true">settings</span></button>
      </div>
    </div>
    <div class="qb-title">${_T("Qibla yo'nalishi","Қибла йўналиши","Направление Киблы","Qibla Direction")}</div>
    <div class="qb-artitle">اتجاه القبلة · Masjid al-Haram</div>
    <div class="qb-verse-intro">“${_T('Masjid al-Haram tomonga yuzlan','Масжид ал-Ҳарам томонига юзлан','Обратись лицом к Масджид аль-Хараму','Turn your face toward Masjid al-Haram')}”<br><span>Al-Baqara 2:144</span></div>
    <div class="qb-hdivider"></div>
    <div class="qb-tabs">
      <button class="qb-tab active" data-tab="kompas"><span class="material-symbols-rounded" data-icon="explore" aria-hidden="true">explore</span> ${_T('Kompas','Компас','Компас','Compass')}</button>
      <button class="qb-tab" data-tab="xarita"><span class="material-symbols-rounded" data-icon="map" aria-hidden="true">map</span> ${_T('Xarita','Харита','Карта','Map')}</button>
      <button class="qb-tab" data-tab="malumot"><span class="material-symbols-rounded" data-icon="info" aria-hidden="true">info</span> ${_T("Ma'lumot","Маълумот","Информация","Info")}</button>
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
    /* tick marks */
    const ticks = Array.from({length: 72}, (_, i) => {
      const deg = i * 5;
      const rad = (deg - 90) * Math.PI / 180;
      const isMaj = deg % 90 === 0, isMed = deg % 45 === 0;
      const len = isMaj ? 12 : isMed ? 8 : 5;
      const x1 = CX + (R - 2) * Math.cos(rad),      y1 = CY + (R - 2) * Math.sin(rad);
      const x2 = CX + (R - 2 - len) * Math.cos(rad), y2 = CY + (R - 2 - len) * Math.sin(rad);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
        x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
        stroke="${isMaj ? 'rgba(22,121,74,.6)' : 'rgba(22,121,74,.2)'}"
        stroke-width="${isMaj ? 1.5 : 0.8}"/>`;
    }).join('');

    /* International compass marks stay unambiguous in all 13 languages. */
    const cards = [{a:0,l:'N'},{a:90,l:'E'},{a:180,l:'S'},{a:270,l:'W'}];
    const cardText = cards.map(({a, l}) => {
      const rad = (a - 90) * Math.PI / 180, r2 = R - 22;
      return `<text x="${(CX + r2*Math.cos(rad)).toFixed(1)}"
        y="${(CY + r2*Math.sin(rad) + 4).toFixed(1)}"
        text-anchor="middle" font-size="11"
        font-family="Inter,system-ui,sans-serif" font-weight="700"
        fill="${a === 0 ? '#16794A' : 'rgba(22,33,43,.4)'}">${l}</text>`;
    }).join('');

    /* needle geometry at 0° (pointing up); rotated dynamically via transform */
    const nRad = -Math.PI / 2;
    const nx = CX + (R - 30) * Math.cos(nRad), ny = CY + (R - 30) * Math.sin(nRad);
    const t1x = CX + 10*Math.cos(nRad - Math.PI/2), t1y = CY + 10*Math.sin(nRad - Math.PI/2);
    const t2x = CX + 10*Math.cos(nRad + Math.PI/2), t2y = CY + 10*Math.sin(nRad + Math.PI/2);
    const odx = CX + (R - 2)*Math.cos(nRad),         ody = CY + (R - 2)*Math.sin(nRad);

    return `
<div id="qb-panel-kompas" class="qb-panel">

  <div class="qb-route-globe-wrap">
    <div id="qb-route-globe" class="qb-route-globe"></div>
    <div class="qb-route-globe-label">${_T('Joylashuvingizdan Kabagacha','Жойлашувингиздан Каъбагача','От вашего местоположения до Каабы','Your location → Kaaba')}</div>
  </div>

  <div id="qb-load-badge" class="qb-load-badge">
    <span class="qb-load-spin"></span>
    <span>${_T('Joylashuv aniqlanmoqda...','Жойлашув аниқланмоқда...','Определение местоположения...','Detecting location...')}</span>
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
  <div id="qb-ios-permission-badge" class="qb-found-badge qb-ios-permission-badge" style="display:none">
    <button id="qb-ios-permission-btn" class="qb-ios-permission-btn">
      🧭 ${_T('Kompasni yoqish','Компасни ёқиш','Включить компас','Enable compass')}
    </button>
  </div>
  <div id="qb-ios-denied-badge" class="qb-found-badge qb-ios-denied-badge" style="display:none">
    ⚠️ ${_T("Kompas ruxsati berilmadi. Sozlamalarda yoqing.","Компас рухсати берилмади. Созламаларда ёқинг.",'Разрешение на компас не дано. Включите в настройках устройства.','Compass permission denied. Enable it in your device settings.')}
  </div>

  <div class="qb-compass-stack" style="width:${S}px;height:${S}px">
  <div id="qb-compass-globe-wrap" class="qb-compass-globe-wrap" style="width:${S}px;height:${S}px">
    <div id="qb-compass-globe" class="qb-compass-globe"></div>
  </div>
  <svg id="qb-compass-svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs>
      <filter id="qb-glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="qb-bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#EFF6F2" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.55"/>
      </radialGradient>
    </defs>
    <circle cx="${CX}" cy="${CY}" r="${R+6}" fill="none"
      stroke="rgba(22,121,74,.08)" stroke-width="1"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#qb-bg)"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="rgba(22,121,74,.25)" stroke-width="1.5"/>
    ${ticks}
    ${cardText}
    <circle cx="${CX}" cy="${CY}" r="${(R*0.65).toFixed(0)}"
      fill="none" stroke="rgba(22,121,74,.07)" stroke-width="1"/>
    <circle cx="${CX}" cy="${CY}" r="${(R*0.4).toFixed(0)}"
      fill="none" stroke="rgba(22,121,74,.07)" stroke-width="1"/>
    <!-- North: static red dashed line pointing up -->
    <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY-(R-30)}"
      stroke="#e05555" stroke-width="1.5" opacity=".5"
      stroke-dasharray="4 3" stroke-linecap="round"/>
    <!-- Qibla needle — rotated via setAttribute -->
    <g id="qb-needle">
      <line x1="${CX}" y1="${CY}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"
        stroke="#4fcfa0" stroke-width="6" opacity=".15" stroke-linecap="round"/>
      <line x1="${CX}" y1="${CY}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"
        stroke="#4fcfa0" stroke-width="2" opacity=".9" stroke-linecap="round"/>
      <polygon
        points="${t1x.toFixed(1)},${t1y.toFixed(1)} ${t2x.toFixed(1)},${t2y.toFixed(1)} ${nx.toFixed(1)},${ny.toFixed(1)}"
        fill="#4fcfa0" opacity=".85" filter="url(#qb-glow)"/>
      <circle cx="${odx.toFixed(1)}" cy="${ody.toFixed(1)}" r="5"
        fill="#4fcfa0" opacity=".9" filter="url(#qb-glow)"/>
    </g>
    <!-- Center circle on top -->
    <circle cx="${CX}" cy="${CY}" r="20"
      fill="#F6FAF8" stroke="rgba(22,121,74,.3)" stroke-width="1.5"/>
    <circle cx="${CX}" cy="${CY}" r="14"
      fill="rgba(22,121,74,.1)" stroke="rgba(22,121,74,.2)" stroke-width="1"/>
    <text x="${CX}" y="${CY+5}" text-anchor="middle" font-size="14">🕋</text>
  </svg>
  </div>

  <div id="qb-igrid" class="qb-igrid" style="display:none">
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T('Qibla burchagi','Қибла бурчаги','Угол Киблы','Qibla angle')}</div>
      <div class="qb-icell-val" id="qb-ig-angle" style="color:#4fcfa0">—</div>
    </div>
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T('Shimoldan','Шимолдан','От Севера','From North')}</div>
      <div class="qb-icell-val" id="qb-ig-north" style="color:#16794A">—</div>
    </div>
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T("Yo'nalish","Йўналиш","Направление","Direction")}</div>
      <div class="qb-icell-val" id="qb-ig-dir" style="color:#16212B">—</div>
    </div>
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T('Kompas aniqligi','Компас аниқлиги','Точность компаса','Compass accuracy')}</div>
      <div class="qb-icell-val" id="qb-ig-accuracy" style="color:rgba(22,33,43,.55)">—</div>
    </div>
  </div>

  <div class="qb-calibrate-tip">
    ${_T('Aniqroq natija uchun telefoningizni','Аниқроқ натижа учун телефонингизни','Для точного результата переместите телефон','For better accuracy, move your phone')}
    ${(_lang === 'ru' || _lang === 'en') ? '' : `<span style="color:#16794A;font-weight:600"> "8-${_T('raqam','рақам')}" </span>`}
    ${_T('shaklida harakatlantiring','шаклида ҳаракатлантиринг',_lang === 'ru' ? 'в форме цифры "8"' : '', _lang === 'en' ? 'in a figure-8 pattern' : '')}
  </div>

  <button class="qb-masjid-card" id="qb-open-haramayn-card">
    <img src="assets/haram-makkah.webp" alt="Masjid al-Haram" loading="lazy">
    <span><strong>Masjid al-Haram</strong><small>${_T('Makka, Saudiya Arabistoni','Макка, Саудия Арабистони','Мекка, Саудовская Аравия','Makkah, Saudi Arabia')}</small></span>
    <span class="material-symbols-rounded" data-icon="chevron_right" aria-hidden="true">chevron_right</span>
  </button>
</div>`;
  }

  /* ── Xarita ── */
  function _panelXarita() {
    /* default angle 135° so map looks right before real location loads */
    const rad = (135 - 90) * Math.PI / 180;
    const mx  = (150 + 120*Math.cos(rad)).toFixed(1);
    const my  = (88  +  55*Math.sin(rad)).toFixed(1);
    const lx2 = (150 + 130*Math.cos(rad)).toFixed(1);
    const ly2 = (88  +  60*Math.sin(rad)).toFixed(1);
    const mlLeft = (parseFloat(mx)/300*100).toFixed(0);
    const mlTop  = (parseFloat(my)/160*100 - 7).toFixed(0);

    return `
<div id="qb-panel-xarita" class="qb-panel" style="display:none">

  <div class="qb-map-wrap">
    <svg class="qb-map-svg" viewBox="0 0 300 160"
      xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="qbmg" width="15" height="15" patternUnits="userSpaceOnUse">
          <path d="M 15 0 L 0 0 0 15" fill="none"
            stroke="rgba(22,121,74,.06)" stroke-width="0.4"/>
        </pattern>
      </defs>
      <rect width="300" height="160" fill="#F6FAF8"/>
      <rect width="300" height="160" fill="url(#qbmg)"/>
      <circle cx="150" cy="88" r="30"  fill="none" stroke="rgba(22,121,74,.08)" stroke-width="0.6"/>
      <circle cx="150" cy="88" r="55"  fill="none" stroke="rgba(22,121,74,.06)" stroke-width="0.5"/>
      <circle cx="150" cy="88" r="80"  fill="none" stroke="rgba(22,121,74,.05)" stroke-width="0.5"/>
      <circle cx="150" cy="88" r="105" fill="none" stroke="rgba(22,121,74,.04)" stroke-width="0.4"/>
      <line id="qb-map-line" x1="150" y1="88" x2="${lx2}" y2="${ly2}"
        stroke="#4fcfa0" stroke-width="1.2" opacity=".7" stroke-dasharray="5 3"/>
      <circle cx="150" cy="88" r="4" fill="#16794A" opacity=".9"/>
      <circle cx="150" cy="88" r="8" fill="none" stroke="#16794A" stroke-width="0.8" opacity=".4"/>
      <circle id="qb-mecca-dot"  cx="${mx}" cy="${my}" r="4" fill="#4fcfa0" opacity=".9"/>
      <circle id="qb-mecca-ring" cx="${mx}" cy="${my}" r="8"
        fill="none" stroke="#4fcfa0" stroke-width="0.8" opacity=".4"/>
    </svg>
    <div class="qb-map-you">📍 ${_T('Siz','Сиз','Вы','You')}</div>
    <div id="qb-map-mecca-lbl" class="qb-map-mecca"
      style="left:${mlLeft}%;top:${mlTop}%">🕋 ${_T('Makka','Макка','Мекка','Makkah')}</div>
    <div id="qb-map-dist-badge" class="qb-map-distbadge">~ — km</div>
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
        <div class="qb-dist-sub">km · ${_T("To'g'ri chiziq","Тўғри чизиқ","Прямая линия","Straight line")}</div>
      </div>
      <div style="text-align:right">
        <div class="qb-dist-angle" id="qb-dist-angle">—°</div>
        <div class="qb-dist-dir"   id="qb-dist-dir">—</div>
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
        // Pause the WebGL render loops off-screen — saves GPU/battery.
        if (_routeGlobe)   _routeGlobe.setVisible(_tab === 'kompas');
        if (_compassGlobe) _compassGlobe.setVisible(_tab === 'kompas');
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
      DeviceOrientationEvent.requestPermission().then(state => {
        _show('#qb-ios-permission-badge', false);
        if (state === 'granted') _attachOrientationListener();
        else _show('#qb-ios-denied-badge', true);
      }).catch(() => _show('#qb-ios-permission-badge', false));
    });
  }

  /* ══════════════════════════════════════════════
     Location
  ══════════════════════════════════════════════ */
  function _startLocation() {
    /* cached coords → instant */
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    if (sLat && sLon) {
      _lat = sLat; _lon = sLon;
      _computeAndShow();
      _startOrientation();
      return;
    }

    /* Telegram location */
    const lm = window.Telegram?.WebApp?.LocationManager;
    if (lm) {
      lm.init(() => {
        if (lm.isAccessGranted) {
          lm.getLocation(loc => {
            if (loc) {
              _lat = loc.latitude; _lon = loc.longitude;
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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        _lat = pos.coords.latitude; _lon = pos.coords.longitude;
        _gpsAccuracyM = (typeof pos.coords.accuracy === 'number' && pos.coords.accuracy > 0) ? pos.coords.accuracy : null;
        localStorage.setItem('islamtime_last_lat', _lat);
        localStorage.setItem('islamtime_last_lon', _lon);
        _computeAndShow(); _startOrientation();
      },
      () => {},
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }

  /* ══════════════════════════════════════════════
     Compute & update all views
  ══════════════════════════════════════════════ */
  function _computeAndShow() {
    _qiblaAngle = _bearingToKaaba(_lat, _lon);
    _distKm     = _distToKaaba(_lat, _lon);
    _found      = true;

    if (_routeGlobe) _routeGlobe.setRoute(_lat, _lon, KAABA_LAT, KAABA_LON);

    /* city name from mosques cache */
    try { _city = JSON.parse(localStorage.getItem('islamtime_mosques_v1') || '{}').city || ''; }
    catch { _city = ''; }

    const ang = Math.round(_qiblaAngle);
    const dir = _dirLabel(_qiblaAngle);

    /* GPS badge in header */
    const gpsBadge = _el?.querySelector('#qb-gps-badge');
    if (gpsBadge) gpsBadge.innerHTML =
      `<div class="qb-gps-dot"></div>
       <span class="qb-gps-txt">GPS${_city ? ' · '+_city : ' · ' + _T('Topildi','Топилди','Найдено','Found')}</span>`;

    /* Kompas: swap badges (found-vs-calibrating handled by _updateQualityBadge,
       gated on real GPS+compass quality, never shown unconditionally), fill grid */
    _show('#qb-load-badge',  false);
    _updateQualityBadge();

    const grid = _el?.querySelector('#qb-igrid');
    if (grid) grid.style.display = 'grid';
    _setText('#qb-ig-angle', `${ang}°`);
    _setText('#qb-ig-north', `${ang}° ${_T('Sh','Ш','С','N')}`);
    _setText('#qb-ig-dir',   dir);

    /* Xarita */
    _updateMap();

    /* Ma'lumot */
    _setText('#qb-m-angle', `${_qiblaAngle.toFixed(1)}°`);
    _setText('#qb-m-dist',  `${Math.round(_distKm).toLocaleString()} km`);
    _setText('#qb-m-dir',   dir);

    _updateNeedle();
  }

  function _updateMap() {
    const rad  = (_qiblaAngle - 90) * Math.PI / 180;
    const mx   = (150 + 120*Math.cos(rad)).toFixed(1);
    const my   = (88  +  55*Math.sin(rad)).toFixed(1);
    const lx2  = (150 + 130*Math.cos(rad)).toFixed(1);
    const ly2  = (88  +  60*Math.sin(rad)).toFixed(1);

    _setAttr('#qb-map-line',   'x2', lx2); _setAttr('#qb-map-line',   'y2', ly2);
    _setAttr('#qb-mecca-dot',  'cx', mx);  _setAttr('#qb-mecca-dot',  'cy', my);
    _setAttr('#qb-mecca-ring', 'cx', mx);  _setAttr('#qb-mecca-ring', 'cy', my);

    const mLbl = _el?.querySelector('#qb-map-mecca-lbl');
    if (mLbl) {
      mLbl.style.left = `${(parseFloat(mx)/300*100).toFixed(0)}%`;
      mLbl.style.top  = `${(parseFloat(my)/160*100 - 7).toFixed(0)}%`;
    }

    _setText('#qb-map-dist-badge', `~ ${Math.round(_distKm).toLocaleString()} km`);
    _setText('#qb-coord-city', _city || '—');
    _setText('#qb-coord-lat', _lat ? `${_lat.toFixed(2)}° N` : '—');
    _setText('#qb-coord-lon', _lon ? `${_lon.toFixed(2)}° E` : '—');
    _setText('#qb-dist-km',    Math.round(_distKm).toLocaleString());
    _setText('#qb-dist-angle', `${Math.round(_qiblaAngle)}°`);
    _setText('#qb-dist-dir',   _dirLabel(_qiblaAngle));
  }

  /* ══════════════════════════════════════════════
     Orientation
  ══════════════════════════════════════════════ */
  function _startOrientation() {
    // iOS 13+ requires an explicit, user-gesture-triggered permission grant
    // before deviceorientation events fire at all — without this, the
    // compass silently never works on iOS (no error, just zero events).
    const needsIosPermission = typeof DeviceOrientationEvent !== 'undefined'
      && typeof DeviceOrientationEvent.requestPermission === 'function';
    if (needsIosPermission) {
      _show('#qb-ios-permission-badge', true);
      return; // _attachOrientationListener() runs after the user taps the prompt
    }
    _attachOrientationListener();
  }

  function _attachOrientationListener() {
    let _lastHeading = null;
    let _bigJumpCount = 0;
    _orientCb = e => {
      const hasWebkit = typeof e.webkitCompassHeading === 'number';
      // Some browsers/environments fire a single null-data "capability probe"
      // event (alpha/beta/gamma all null) just to signal the API exists —
      // that is NOT a real compass reading and must not flip the quality
      // gate to "found".
      const hasUsableReading = hasWebkit || typeof e.alpha === 'number';
      if (!hasUsableReading) return;

      _deviceNorth = hasWebkit ? e.webkitCompassHeading : (360 - e.alpha) % 360;

      // iOS reports a real per-reading uncertainty; Android's DeviceOrientation
      // API does not expose one at all — leave it unknown rather than invent one.
      if (hasWebkit && typeof e.webkitCompassAccuracy === 'number' && e.webkitCompassAccuracy >= 0) {
        _compassAccDeg = e.webkitCompassAccuracy;
      } else if (!hasWebkit && 'absolute' in e) {
        // Chrome/Android: e.absolute === true means a real absolute (magnetometer-
        // backed) heading; false/undefined means relative-only, i.e. not yet
        // calibrated against magnetic north — treat as unknown accuracy.
        _compassAccDeg = e.absolute ? null : null; // still unknown numerically either way
      }

      // Heuristic calibration-needed signal: large heading jumps between
      // consecutive readings suggest the magnetometer hasn't settled yet.
      if (_lastHeading !== null) {
        const diff = Math.abs(((_deviceNorth - _lastHeading + 540) % 360) - 180);
        if (diff > 45) _bigJumpCount++;
      }
      _lastHeading = _deviceNorth;
      _calibrating = _bigJumpCount >= 2 && _bigJumpCount < 6;

      _hasOrientation = true;
      _updateNeedle();
      _updateQualityBadge();
      if (_compassGlobe) _compassGlobe.setHeadingDeg(_deviceNorth);
    };
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', _orientCb);
    } else {
      window.addEventListener('deviceorientation', _orientCb);
    }
  }

  /* Real quality gate: never claim "Qibla found" before we actually have
     both a GPS fix AND at least one live compass reading. GPS accuracy and
     compass accuracy are tracked and shown separately — never merged into
     one fabricated number. */
  function _qualityGood() {
    if (!_hasOrientation) return false;
    if (_gpsAccuracyM !== null && _gpsAccuracyM > 100) return false; // >100m fix is too coarse to trust
    return true;
  }

  function _updateQualityBadge() {
    const good = _qualityGood();
    _show('#qb-found-badge', good);
    // Whenever we're not confidently "found" — whether because no compass
    // reading has arrived yet, or because jitter suggests it needs
    // calibrating — show the figure-8 guidance rather than leaving a blank
    // gap that could be mistaken for a frozen screen.
    _show('#qb-calibrate-badge', !good);
    if (good) {
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
    const delta = QiblaGeo.headingDelta(_qiblaAngle, _deviceNorth);
    needle.setAttribute('transform', `rotate(${delta.toFixed(1)}, ${CX}, ${CY})`);
  }

  /* ══════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════ */
  function _bearingToKaaba(lat, lon) { return QiblaGeo.bearingToKaaba(lat, lon); }
  function _distToKaaba(lat, lon)    { return QiblaGeo.distanceToKaabaKm(lat, lon); }

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
    const d = DIR_MAP[_lang] || DIR_MAP.en;
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

  return { render, load, unload };
})();
