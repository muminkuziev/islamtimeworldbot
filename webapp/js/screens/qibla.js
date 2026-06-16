/* ═══════════════════════════════════════════════════════════════
   Qibla Screen — Navy+Gold UI
   ✅ 3 tabs: Kompas / Xarita / Ma'lumot
   ✅ SVG compass with ticks, cardinals, live needle rotation
   ✅ Device orientation + cached GPS + geo fallback
   ✅ Distance, direction, coordinate cards
   ═══════════════════════════════════════════════════════════════ */

const QiblaScreen = (function () {

  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;
  const S  = 220;               /* SVG compass size */
  const CX = 110, CY = 110;    /* center */
  const R  = 102;               /* radius = S/2 - 8 */

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
    _startLocation();
  }

  function unload() {
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
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov" style="background:rgba(9,18,31,0.65)"></div>
  <div class="qb-hdr-inner">
    <div class="qb-nav-row">
      <button class="qb-back" id="qb-back">← ${_T('Menyu','Меню','Меню','Menu')}</button>
      <div id="qb-gps-badge"></div>
    </div>
    <div class="qb-title">${_T("Qibla yo'nalishi","Қибла йўналиши","Направление Киблы","Qibla Direction")}</div>
    <div class="qb-artitle">اتجاه القبلة · Masjid al-Haram</div>
    <div class="qb-hdivider"></div>
    <div class="qb-tabs">
      <button class="qb-tab active" data-tab="kompas">🧭 ${_T('Kompas','Компас','Компас','Compass')}</button>
      <button class="qb-tab" data-tab="xarita">🗺 ${_T('Xarita','Харита','Карта','Map')}</button>
      <button class="qb-tab" data-tab="malumot">📐 ${_T("Ma'lumot","Маълумот","Информация","Info")}</button>
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
        stroke="${isMaj ? 'rgba(232,193,90,.6)' : 'rgba(232,193,90,.2)'}"
        stroke-width="${isMaj ? 1.5 : 0.8}"/>`;
    }).join('');

    /* S=Shimol(N) Sh=Sharq(E) J=Janub(S) G=G'arb(W) */
    const cards = _lang === 'uz_cyr'
      ? [{a:0,l:'Ш'},{a:90,l:'Шр'},{a:180,l:'Ж'},{a:270,l:'Ғ'}]
      : _lang === 'ru'
      ? [{a:0,l:'С'},{a:90,l:'В'},{a:180,l:'Ю'},{a:270,l:'З'}]
      : _lang === 'en'
      ? [{a:0,l:'N'},{a:90,l:'E'},{a:180,l:'S'},{a:270,l:'W'}]
      : [{a:0,l:'S'},{a:90,l:'Sh'},{a:180,l:'J'},{a:270,l:'G'}];
    const cardText = cards.map(({a, l}) => {
      const rad = (a - 90) * Math.PI / 180, r2 = R - 22;
      return `<text x="${(CX + r2*Math.cos(rad)).toFixed(1)}"
        y="${(CY + r2*Math.sin(rad) + 4).toFixed(1)}"
        text-anchor="middle" font-size="11"
        font-family="Inter,system-ui,sans-serif" font-weight="700"
        fill="${a === 0 ? '#E8C15A' : 'rgba(232,223,200,.4)'}">${l}</text>`;
    }).join('');

    /* needle geometry at 0° (pointing up); rotated dynamically via transform */
    const nRad = -Math.PI / 2;
    const nx = CX + (R - 30) * Math.cos(nRad), ny = CY + (R - 30) * Math.sin(nRad);
    const t1x = CX + 10*Math.cos(nRad - Math.PI/2), t1y = CY + 10*Math.sin(nRad - Math.PI/2);
    const t2x = CX + 10*Math.cos(nRad + Math.PI/2), t2y = CY + 10*Math.sin(nRad + Math.PI/2);
    const odx = CX + (R - 2)*Math.cos(nRad),         ody = CY + (R - 2)*Math.sin(nRad);

    return `
<div id="qb-panel-kompas" class="qb-panel">

  <div id="qb-load-badge" class="qb-load-badge">
    <span class="qb-load-spin"></span>
    <span>${_T('Joylashuv aniqlanmoqda...','Жойлашув аниқланмоқда...','Определение местоположения...','Detecting location...')}</span>
  </div>
  <div id="qb-found-badge" class="qb-found-badge" style="display:none">
    <div class="qb-found-dot"></div>
    <span class="qb-found-txt">${_T('Qibla topildi','Қибла топилди','Кибла найдена','Qibla found')}</span>
    <span style="color:rgba(232,223,200,.55)">·</span>
    <span id="qb-badge-deg" class="qb-badge-deg">—°</span>
    <span id="qb-badge-dir" class="qb-badge-dir">—</span>
  </div>

  <svg id="qb-compass-svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs>
      <filter id="qb-glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="qb-bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0f2040"/>
        <stop offset="100%" stop-color="#09121f"/>
      </radialGradient>
    </defs>
    <circle cx="${CX}" cy="${CY}" r="${R+6}" fill="none"
      stroke="rgba(232,193,90,.08)" stroke-width="1"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#qb-bg)"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="rgba(232,193,90,.25)" stroke-width="1.5"/>
    ${ticks}
    ${cardText}
    <circle cx="${CX}" cy="${CY}" r="${(R*0.65).toFixed(0)}"
      fill="none" stroke="rgba(232,193,90,.07)" stroke-width="1"/>
    <circle cx="${CX}" cy="${CY}" r="${(R*0.4).toFixed(0)}"
      fill="none" stroke="rgba(232,193,90,.07)" stroke-width="1"/>
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
      fill="#111e33" stroke="rgba(232,193,90,.3)" stroke-width="1.5"/>
    <circle cx="${CX}" cy="${CY}" r="14"
      fill="rgba(232,193,90,.1)" stroke="rgba(232,193,90,.2)" stroke-width="1"/>
    <text x="${CX}" y="${CY+5}" text-anchor="middle" font-size="14">🕋</text>
  </svg>

  <div id="qb-igrid" class="qb-igrid" style="display:none">
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T('Qibla burchagi','Қибла бурчаги','Угол Киблы','Qibla angle')}</div>
      <div class="qb-icell-val" id="qb-ig-angle" style="color:#4fcfa0">—</div>
    </div>
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T('Shimoldan','Шимолдан','От Севера','From North')}</div>
      <div class="qb-icell-val" id="qb-ig-north" style="color:#E8C15A">—</div>
    </div>
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T("Yo'nalish","Йўналиш","Направление","Direction")}</div>
      <div class="qb-icell-val" id="qb-ig-dir" style="color:#e8dfc8">—</div>
    </div>
    <div class="qb-icell">
      <div class="qb-icell-lbl">${_T('Aniqlik','Аниқлик','Точность','Accuracy')}</div>
      <div class="qb-icell-val" style="color:rgba(232,223,200,.55)">±0.5°</div>
    </div>
  </div>

  <div class="qb-calibrate-tip">
    ${_T('Aniqroq natija uchun telefoningizni','Аниқроқ натижа учун телефонингизни','Для точного результата переместите телефон','For better accuracy, move your phone')}
    ${(_lang === 'ru' || _lang === 'en') ? '' : `<span style="color:#E8C15A;font-weight:600"> "8-${_T('raqam','рақам')}" </span>`}
    ${_T('shaklida harakatlantiring','шаклида ҳаракатлантиринг',_lang === 'ru' ? 'в форме цифры "8"' : '', _lang === 'en' ? 'in a figure-8 pattern' : '')}
  </div>
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
            stroke="rgba(232,193,90,.06)" stroke-width="0.4"/>
        </pattern>
      </defs>
      <rect width="300" height="160" fill="#0a1628"/>
      <rect width="300" height="160" fill="url(#qbmg)"/>
      <circle cx="150" cy="88" r="30"  fill="none" stroke="rgba(232,193,90,.08)" stroke-width="0.6"/>
      <circle cx="150" cy="88" r="55"  fill="none" stroke="rgba(232,193,90,.06)" stroke-width="0.5"/>
      <circle cx="150" cy="88" r="80"  fill="none" stroke="rgba(232,193,90,.05)" stroke-width="0.5"/>
      <circle cx="150" cy="88" r="105" fill="none" stroke="rgba(232,193,90,.04)" stroke-width="0.4"/>
      <line id="qb-map-line" x1="150" y1="88" x2="${lx2}" y2="${ly2}"
        stroke="#4fcfa0" stroke-width="1.2" opacity=".7" stroke-dasharray="5 3"/>
      <circle cx="150" cy="88" r="4" fill="#E8C15A" opacity=".9"/>
      <circle cx="150" cy="88" r="8" fill="none" stroke="#E8C15A" stroke-width="0.8" opacity=".4"/>
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
    </div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T('Qibla burchagi','Қибла бурчаги','Угол Киблы','Qibla angle')}</span><span class="qb-mrow-val" id="qb-m-angle">—</span></div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T('Masofa','Масофа','Расстояние','Distance')}</span><span class="qb-mrow-val" id="qb-m-dist">—</span></div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T("Yo'nalish","Йўналиш","Направление","Direction")}</span><span class="qb-mrow-val" id="qb-m-dir">—</span></div>
    <div class="qb-mrow"><span class="qb-mrow-lbl">${_T('Hisoblash usuli','Ҳисоблаш усули','Метод расчёта','Calculation method')}</span><span class="qb-mrow-val">Haversine</span></div>
    <div class="qb-mrow last"><span class="qb-mrow-lbl">${_T('GPS aniqlik','GPS аниқлик','Точность GPS','GPS accuracy')}</span><span class="qb-mrow-val">±0.5°</span></div>
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
    <div class="qb-verse-ref">Al-Baqara, 144</div>
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

    _el.querySelectorAll('.qb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        _el.querySelectorAll('.qb-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _el.querySelector('#qb-panel-kompas').style.display  = _tab==='kompas'  ? 'flex':'none';
        _el.querySelector('#qb-panel-xarita').style.display  = _tab==='xarita'  ? 'flex':'none';
        _el.querySelector('#qb-panel-malumot').style.display = _tab==='malumot' ? 'flex':'none';
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
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

    /* Kompas: swap badges, fill grid */
    _show('#qb-load-badge',  false);
    _show('#qb-found-badge', true);
    _setText('#qb-badge-deg', `${ang}°`);
    _setText('#qb-badge-dir', dir);

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
    _orientCb = e => {
      _deviceNorth = e.webkitCompassHeading || (e.alpha ? (360 - e.alpha) : 0);
      _updateNeedle();
    };
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', _orientCb);
    } else {
      window.addEventListener('deviceorientation', _orientCb);
    }
  }

  function _updateNeedle() {
    const needle = _el?.querySelector('#qb-needle');
    if (!needle) return;
    needle.setAttribute('transform',
      `rotate(${(_qiblaAngle - _deviceNorth).toFixed(1)}, ${CX}, ${CY})`);
  }

  /* ══════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════ */
  function _bearingToKaaba(lat, lon) {
    const lat1 = lat*Math.PI/180, lat2 = KAABA_LAT*Math.PI/180;
    const dLon = (KAABA_LON - lon)*Math.PI/180;
    const y = Math.sin(dLon)*Math.cos(lat2);
    const x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    return (Math.atan2(y, x)*180/Math.PI + 360) % 360;
  }

  function _distToKaaba(lat, lon) {
    const R = 6371;
    const lat1 = lat*Math.PI/180, lat2 = KAABA_LAT*Math.PI/180;
    const dLat = (KAABA_LAT - lat)*Math.PI/180, dLon = (KAABA_LON - lon)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
