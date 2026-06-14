/* ═══════════════════════════════════════════════════
   Location Permission Screen — onboarding step 3
   ═══════════════════════════════════════════════════ */

const LocationScreen = (function () {
  'use strict';

  const TILE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%230d1829'/%3E%3Cline x1='0' y1='0' x2='60' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Cline x1='60' y1='0' x2='0' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%23F5C542' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E";

  const MAZH_NAMES = { hanafi:'Hanafiy', maliki:'Molikiy', shafii:'Shofeiy', hanbali:'Hanbaliy' };

  let _loading = false;

  /* ── Entry points ─────────────────────────────────────────── */
  function render() {
    const el = document.getElementById('screen-location');
    if (!el) return;
    _loading = false;
    el.innerHTML = _buildHTML();
    _bind(el);
  }

  /* ── HTML ─────────────────────────────────────────────────── */
  function _buildHTML() {
    const mazhab  = localStorage.getItem('islamtime_madhab') || 'hanafi';
    const backLbl = '← ' + (MAZH_NAMES[mazhab] || mazhab);

    return `
      <div class="lc-wrap">

        <div class="lc-header">
          <div class="lc-tile" style="background-image:url('${TILE}')"></div>
          <div class="lc-ov"></div>
          <div class="lc-hi">
            <button class="lc-back" id="lc-back">${backLbl}</button>
            <div class="lc-title">Joylashuv</div>
            <div class="lc-subtitle">Aniq namoz vaqtlarini aniqlash uchun</div>
            <div class="lc-divider"></div>
          </div>
        </div>

        <div class="lc-body">
          <div class="lc-icon-wrap">
            <div class="lc-icon-ring lc-ring-outer">
              <div class="lc-icon-ring lc-ring-inner">
                <div class="lc-icon-core">📍</div>
              </div>
            </div>
          </div>

          <div class="lc-heading">Joylashuvingizga ruxsat bering</div>
          <div class="lc-desc">
            Aniq namoz vaqtlari, qibla yo'nalishi va yaqin masjidlarni topish uchun GPS kerak
          </div>

          <div class="lc-features">
            <div class="lc-feat">
              <span class="lc-feat-ic">🕌</span>
              <span class="lc-feat-txt">Namoz vaqtlari</span>
            </div>
            <div class="lc-feat">
              <span class="lc-feat-ic">🧭</span>
              <span class="lc-feat-txt">Qibla yo'nalishi</span>
            </div>
            <div class="lc-feat">
              <span class="lc-feat-ic">🕋</span>
              <span class="lc-feat-txt">Yaqin masjidlar</span>
            </div>
          </div>
        </div>

        <div class="lc-footer">
          <button class="lc-btn-main" id="lc-allow">
            <span id="lc-btn-lbl">📍 GPS ruxsatini bering</span>
            <div class="lc-btn-sep"></div>
            <span class="lc-btn-arr">→</span>
          </button>
          <button class="lc-btn-skip" id="lc-skip">O'tkazib yuborish →</button>
        </div>

      </div>`;
  }

  /* ── Events ───────────────────────────────────────────────── */
  function _bind(el) {
    el.querySelector('#lc-back').addEventListener('click', () => {
      window.App.navigate('screen-mazhab');
    });
    el.querySelector('#lc-allow').addEventListener('click', _requestGPS);
    el.querySelector('#lc-skip').addEventListener('click', _skip);
  }

  function _requestGPS() {
    if (_loading) return;
    _loading = true;
    localStorage.setItem('islamtime_location_asked', '1');

    const lbl = document.getElementById('lc-btn-lbl');
    if (lbl) lbl.textContent = '⏳ Aniqlanmoqda...';

    if (!navigator.geolocation) { _goToDashboard(); return; }

    navigator.geolocation.getCurrentPosition(
      pos => {
        localStorage.setItem('islamtime_last_lat', String(pos.coords.latitude));
        localStorage.setItem('islamtime_last_lon', String(pos.coords.longitude));
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        _goToDashboard();
      },
      () => { _goToDashboard(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function _skip() {
    localStorage.setItem('islamtime_location_asked', '1');
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    _goToDashboard();
  }

  function _goToDashboard() {
    const lang = window.App?.state?.lang || 'uz';
    DashboardScreen.update(lang);
    window.App.navigate('screen-dashboard');
  }

  return { render };
})();
