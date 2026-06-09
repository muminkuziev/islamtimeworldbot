/* ═══════════════════════════════════════════════════
   Qibla Compass Screen
   Kaaba coords: 21.4225°N, 39.8262°E
   ═══════════════════════════════════════════════════ */

const QiblaScreen = (function () {

  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;

  let _lat = null;
  let _lon = null;
  let _qiblaAngle  = 0;   // degrees from North to Kaaba
  let _deviceNorth = 0;   // device compass heading
  let _watchId     = null;
  let _orientCb    = null;
  let _lang        = 'uz';

  function render() {
    const el = document.getElementById('screen-qibla');
    if (!el) return;
    _lang = window.App?.state?.lang || 'uz';
    el.innerHTML = _buildHTML(_lang);
    _bindEvents(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-qibla');
    if (!el) return;
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el);
    _startLocation(el);
  }

  function unload() {
    if (_watchId) navigator.geolocation.clearWatch(_watchId);
    if (_orientCb) window.removeEventListener('deviceorientationabsolute', _orientCb);
    window.removeEventListener('deviceorientation', _orientCb);
    _watchId = _orientCb = null;
  }

  function _buildHTML(lang) {
    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="qibla-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">🧭 ${t('modules_list.qibla', lang)}</h1>
        </div>

        <div class="qibla-body">
          <div class="qibla-status" id="qibla-status">
            <span class="qibla-spinner"></span>
            ${t('qibla_getting_loc', lang)}
          </div>

          <!-- Compass -->
          <div class="qibla-compass-wrap" id="qibla-compass-wrap" style="display:none">
            <div class="qibla-compass" id="qibla-compass">
              <!-- Rose / cardinal points -->
              <div class="compass-rose">
                <div class="compass-n">N</div>
                <div class="compass-s">S</div>
                <div class="compass-e">E</div>
                <div class="compass-w">W</div>
                <!-- Tick marks -->
                ${Array.from({length: 72}, (_,i) => {
                  const angle = i * 5;
                  const major = angle % 45 === 0;
                  return `<div class="compass-tick${major?' major':''}" style="transform:rotate(${angle}deg)"></div>`;
                }).join('')}
              </div>

              <!-- Qibla needle -->
              <div class="qibla-needle" id="qibla-needle">
                <div class="needle-kaaba">🕋</div>
              </div>

              <!-- Center dot -->
              <div class="compass-center-dot"></div>
            </div>

            <!-- Degree readout -->
            <div class="qibla-degree-row">
              <span class="qibla-degree-val" id="qibla-degree-val">--°</span>
              <span class="qibla-degree-label">${t('qibla_degree', lang)}</span>
            </div>
            <div class="qibla-from-north" id="qibla-from-north"></div>
          </div>

          <div class="qibla-calibrate">${t('qibla_calibrate', lang)}</div>
        </div>
      </div>
    `;
  }

  function _bindEvents(el) {
    el.querySelector('#qibla-back')?.addEventListener('click', () => {
      unload();
      window.App.navigate('screen-dashboard');
    });
  }

  function _startLocation(el) {
    if (_lat && _lon) {
      _computeAndShow(el);
      _startOrientation(el);
      return;
    }

    /* Try Telegram LocationManager first */
    const lm = window.Telegram?.WebApp?.LocationManager;
    if (lm) {
      lm.init(() => {
        if (lm.isAccessGranted) {
          lm.getLocation(loc => {
            if (loc) {
              _lat = loc.latitude;
              _lon = loc.longitude;
              _computeAndShow(el);
              _startOrientation(el);
            } else {
              _browserGeo(el);
            }
          });
        } else {
          _browserGeo(el);
        }
      });
    } else {
      _browserGeo(el);
    }
  }

  function _browserGeo(el) {
    if (!navigator.geolocation) {
      _setStatus(el, '❌ Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        _lat = pos.coords.latitude;
        _lon = pos.coords.longitude;
        _computeAndShow(el);
        _startOrientation(el);
      },
      () => { _setStatus(el, '❌ ' + t('error', _lang)); }
    );
  }

  function _computeAndShow(el) {
    _qiblaAngle = _bearingToKaaba(_lat, _lon);
    _setStatus(el, '');

    const compassWrap = el.querySelector('#qibla-compass-wrap');
    if (compassWrap) compassWrap.style.display = 'block';

    const status = el.querySelector('#qibla-status');
    if (status) status.style.display = 'none';

    _updateNeedle(el);
  }

  function _startOrientation(el) {
    _orientCb = e => {
      let alpha = e.webkitCompassHeading || (e.alpha ? (360 - e.alpha) : 0);
      _deviceNorth = alpha;
      _updateNeedle(el);
    };

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', _orientCb);
    } else {
      window.addEventListener('deviceorientation', _orientCb);
    }
  }

  function _updateNeedle(el) {
    const needle = el.querySelector('#qibla-needle');
    if (!needle) return;

    // Needle points toward Qibla; rotate so it accounts for device orientation
    const rotation = _qiblaAngle - _deviceNorth;
    needle.style.transform = `rotate(${rotation}deg)`;

    const degEl = el.querySelector('#qibla-degree-val');
    if (degEl) degEl.textContent = Math.round(_qiblaAngle) + '°';

    const fromEl = el.querySelector('#qibla-from-north');
    if (fromEl) fromEl.textContent = `${Math.round(_qiblaAngle)}° ${t('qibla_from_north', _lang)}`;
  }

  function _bearingToKaaba(lat, lon) {
    const lat1 = lat  * Math.PI / 180;
    const lat2 = KAABA_LAT * Math.PI / 180;
    const dLon = (KAABA_LON - lon) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2)
            - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  function _setStatus(el, msg) {
    const s = el.querySelector('#qibla-status');
    if (s) { s.innerHTML = msg; s.style.display = msg ? 'flex' : 'none'; }
  }

  return { render, load, unload };
})();
