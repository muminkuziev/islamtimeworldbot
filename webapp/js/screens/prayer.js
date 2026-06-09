/* ═══════════════════════════════════════════════════════════════
   Prayer Times Screen  —  Premium Full Card
   Features:
     • Telegram.WebApp.LocationManager (8.0+) → browser geo fallback
     • /api/prayer-times  (prayer + weather + AQI + ayah + hadith)
     • Live HH:MM:SS countdown, auto-refresh on prayer hit
     • 14-language UI
     • Refresh (cached coords) + Change Location (new geo request)
═══════════════════════════════════════════════════════════════ */

const PrayerScreen = (function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let _data        = null;
  let _countdownId = null;
  let _lang        = 'uz';
  let _lat         = null;
  let _lon         = null;

  /* ── i18n strings ──────────────────────────────────────────── */
  const L = {
    title:      { uz:'Namoz vaqtlari', uz_cyr:'Намоз вақтлари', en:'Prayer Times',
                  ru:'Время намаза',   tr:'Namaz Vakitleri',     ar:'مواقيت الصلاة',
                  kk:'Намаз уақыттары',tg:'Вақти намоз',        ky:'Намаз убактылары',
                  de:'Gebetszeiten',   fr:'Heures de prière',   id:'Waktu Sholat',
                  hi:'नमाज़ का वक्त',  ur:'نماز کے اوقات' },

    nextPrayer: { uz:'Keyingi namoz', uz_cyr:'Кейинги намоз', en:'Next Prayer',
                  ru:'Следующий намаз',tr:'Sonraki Namaz',     ar:'الصلاة القادمة',
                  kk:'Келесі намаз',  tg:'Намози навбатӣ',    ky:'Кийинки намаз',
                  de:'Nächstes Gebet',fr:'Prochaine prière',  id:'Sholat Berikutnya',
                  hi:'अगली नमाज़',    ur:'اگلی نماز' },

    allDone:    { uz:"Barcha namozlar o'tdi 🌙", uz_cyr:'Барча намозлар ўтди 🌙',
                  en:'All prayers done for today 🌙',         ru:'Все намазы прошли 🌙',
                  tr:'Tüm namazlar bitti 🌙',                 ar:'انتهت الصلوات 🌙',
                  kk:'Барлық намаздар аяқталды 🌙',           tg:'Ҳамаи намозҳо гузаштанд 🌙',
                  ky:'Бардык намаздар аяктады 🌙',            de:'Alle Gebete erledigt 🌙',
                  fr:'Toutes les prières terminées 🌙',       id:'Semua sholat selesai 🌙',
                  hi:'आज की सभी नमाज़ें हो गईं 🌙',          ur:'آج کی نمازیں ختم 🌙' },

    refresh:    { uz:'🔄 Yangilash',  uz_cyr:'🔄 Янгилаш', en:'🔄 Refresh',
                  ru:'🔄 Обновить',   tr:'🔄 Yenile',       ar:'🔄 تحديث',
                  kk:'🔄 Жаңарту',   tg:'🔄 Навсоз кардан',ky:'🔄 Жаңылоо',
                  de:'🔄 Aktualisieren',fr:'🔄 Actualiser', id:'🔄 Perbarui',
                  hi:'🔄 रिफ्रेश',   ur:'🔄 تازہ کریں' },

    changeLoc:  { uz:'📍 Lokatsiyani o\'zgartirish', uz_cyr:'📍 Локацияни ўзгартириш',
                  en:'📍 Change Location',            ru:'📍 Изменить локацию',
                  tr:'📍 Konumu değiştir',            ar:'📍 تغيير الموقع',
                  kk:'📍 Орынды өзгерту',            tg:'📍 Мавқеатро иваз кунед',
                  ky:'📍 Жайгашкан жерди өзгөртүү', de:'📍 Standort ändern',
                  fr:'📍 Changer d\'emplacement',     id:'📍 Ubah lokasi',
                  hi:'📍 स्थान बदलें',               ur:'📍 مقام تبدیل کریں' },

    loading:    { uz:'Namoz vaqtlari yuklanmoqda…', uz_cyr:'Намоз вақтлари юкланмоқда…',
                  en:'Loading prayer times…',        ru:'Загрузка намаза…',
                  tr:'Namaz vakitleri yükleniyor…',  ar:'جاري التحميل…',
                  kk:'Жүктелуде…',                  tg:'Бор карда мешавад…',
                  ky:'Жүктөлүүдө…',                 de:'Wird geladen…',
                  fr:'Chargement…',                  id:'Memuat…',
                  hi:'लोड हो रहा है…',              ur:'لوڈ ہو رہا ہے…' },

    locError:   { uz:'Lokatsiyaga ruxsat berilmadi yoki xatolik yuz berdi.',
                  en:'Location access denied or an error occurred.',
                  ru:'Доступ к геолокации отклонён или произошла ошибка.',
                  tr:'Konum erişimi reddedildi veya hata oluştu.',
                  ar:'تم رفض الوصول إلى الموقع.' },

    tryAgain:   { uz:'Qayta urinish', en:'Try Again', ru:'Повторить',
                  tr:'Tekrar Dene',   ar:'حاول مجدداً' },

    weather:    { uz:'Ob-havo',    en:'Weather',   ru:'Погода',   tr:'Hava durumu',
                  ar:'الطقس',      kk:'Ауа райы',  tg:'Обу ҳаво', ky:'Аба ырайы',
                  de:'Wetter',     fr:'Météo',      id:'Cuaca',    hi:'मौसम', ur:'موسم' },

    airQuality: { uz:'Havo sifati',     en:'Air Quality',     ru:'Качество воздуха',
                  tr:'Hava kalitesi',   ar:'جودة الهواء',     kk:'Ауа сапасы',
                  tg:'Сифати ҳаво',    ky:'Аба сапаты',       de:'Luftqualität',
                  fr:'Qualité de l\'air',id:'Kualitas Udara', hi:'वायु गुणवत्ता',
                  ur:'ہوا کا معیار' },

    dailyAyah:  { uz:'Kunlik oyat',    en:'Daily Ayah',     ru:'Аят дня',
                  tr:'Günün Ayeti',    ar:'آية اليوم',       kk:'Күндегі аят',
                  tg:'Ояти рӯзона',   ky:'Күнүмдүк аят',    de:'Tagesayah',
                  fr:'Verset du jour', id:'Ayat Harian',    hi:'आज की आयत',
                  ur:'آج کی آیت' },

    dailyHadith:{ uz:'Kunlik hadis',   en:'Daily Hadith',   ru:'Хадис дня',
                  tr:'Günün Hadisi',   ar:'حديث اليوم',     kk:'Күндегі хадис',
                  tg:'Ҳадиси рӯзона', ky:'Күнүмдүк хадис',  de:'Tageshadith',
                  fr:'Hadith du jour', id:'Hadits Harian',  hi:'आज का हदीस',
                  ur:'آج کا حدیث' },

    method:     { uz:'Hisoblash usuli', en:'Calculation Method', ru:'Метод расчёта',
                  tr:'Hesaplama Yöntemi', ar:'طريقة الحساب' },

    feelsLike:  { en:'Feels', ru:'Ощущается', uz:'Seziladi', tr:'Hissedilen', ar:'يبدو' },
    humidity:   { en:'Humidity', ru:'Влажность', uz:'Namlik', tr:'Nem', ar:'الرطوبة' },
    wind:       { en:'Wind', ru:'Ветер', uz:'Shamol', tr:'Rüzgar', ar:'الرياح' },
  };

  function _l(key, lang) {
    const d = L[key];
    return d ? (d[lang] || d.en || Object.values(d)[0]) : key;
  }

  /* ── Render shell (called once at app init) ────────────────── */
  function render() {
    const el = document.getElementById('screen-prayer');
    el.innerHTML = `
      <div class="geo-bg"></div>
      <div class="prayer-screen">
        <div class="prayer-header">
          <button class="prayer-back-btn" id="prayer-back" aria-label="Back">‹</button>
          <span class="prayer-header-title" id="prayer-title">Prayer Times</span>
          <button class="prayer-hdr-refresh" id="prayer-hdr-refresh" aria-label="Refresh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
        <div id="prayer-content"></div>
      </div>`;

    document.getElementById('prayer-back').addEventListener('click', _goBack);
    document.getElementById('prayer-hdr-refresh').addEventListener('click', _onRefresh);
  }

  /* ── Entry point: called every time user navigates here ─────── */
  function load(lang) {
    _lang = lang || window.App?.state?.lang || 'uz';
    _stopCountdown();

    const titleEl = document.getElementById('prayer-title');
    if (titleEl) titleEl.textContent = _l('title', _lang);

    _showLoading();
    _getLocation();
  }

  /* ══════════════════════════════════════════════════════════════
     LOCATION  —  Telegram LocationManager → browser geo fallback
  ══════════════════════════════════════════════════════════════ */
  function _getLocation(forceNew = false) {
    const tgLM = window.Telegram?.WebApp?.LocationManager;

    if (tgLM && typeof tgLM.init === 'function') {
      tgLM.init(() => {
        if (tgLM.isLocationAvailable && tgLM.isAccessGranted) {
          tgLM.getLocation(loc => {
            if (loc && loc.latitude != null) {
              _onLocation(loc.latitude, loc.longitude);
            } else {
              _browserGeo();
            }
          });
        } else {
          _browserGeo();
        }
      });
    } else {
      _browserGeo();
    }
  }

  function _browserGeo() {
    if (!navigator.geolocation) {
      _showError(); return;
    }
    navigator.geolocation.getCurrentPosition(
      pos  => _onLocation(pos.coords.latitude, pos.coords.longitude),
      _err => _showError(),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  }

  function _onLocation(lat, lon) {
    _lat = lat; _lon = lon;
    _fetchPrayerTimes(lat, lon);
  }

  /* ── Refresh without new geo request ───────────────────────── */
  function _onRefresh() {
    _stopCountdown();
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    if (_lat !== null && _lon !== null) {
      _showLoading();
      _fetchPrayerTimes(_lat, _lon);
    } else {
      _showLoading();
      _getLocation();
    }
  }

  /* ── Force new geo request (Change Location button) ─────────── */
  function _onChangeLoc() {
    _stopCountdown();
    _lat = null; _lon = null;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    _showLoading();
    _getLocation(true);
  }

  /* ══════════════════════════════════════════════════════════════
     API CALL
  ══════════════════════════════════════════════════════════════ */
  async function _fetchPrayerTimes(lat, lon) {
    try {
      const base = window.location.origin;
      const url  = `${base}/api/prayer-times?lat=${lat}&lon=${lon}&lang=${_lang}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      _data = json;
      _renderFull();
    } catch (e) {
      _showError();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     LOADING / ERROR STATES
  ══════════════════════════════════════════════════════════════ */
  function _showLoading() {
    const el = document.getElementById('prayer-content');
    if (!el) return;
    el.innerHTML = `
      <div class="prayer-loading">
        <img src="assets/logo.svg" class="prayer-loading-logo" alt=""/>
        <div class="splash-dots">
          <span class="splash-dot"></span>
          <span class="splash-dot"></span>
          <span class="splash-dot"></span>
        </div>
        <p class="prayer-loading-text">${_l('loading', _lang)}</p>
      </div>`;
  }

  function _showError() {
    const el = document.getElementById('prayer-content');
    if (!el) return;
    el.innerHTML = `
      <div class="prayer-error">
        <div class="prayer-error-icon">📍</div>
        <p class="prayer-error-text">${_l('locError', _lang)}</p>
        <button class="btn-retry" id="prayer-retry">${_l('tryAgain', _lang)}</button>
      </div>`;
    document.getElementById('prayer-retry')
      .addEventListener('click', () => { _showLoading(); _getLocation(); });
  }

  /* ══════════════════════════════════════════════════════════════
     FULL CARD RENDER
  ══════════════════════════════════════════════════════════════ */
  function _renderFull() {
    const el = document.getElementById('prayer-content');
    if (!el || !_data) return;

    el.innerHTML = `
      <div class="prayer-scroll">
        ${_buildInfoCard()}
        ${_buildNextPrayer()}
        ${_buildPrayerList()}
        ${_buildWeatherCard()}
        ${_buildAQICard()}
        ${_buildAyahCard()}
        ${_buildHadithCard()}
        ${_buildFooterBtns()}
      </div>`;

    _bindScrollEvents();

    const secs = _data.next_prayer?.countdown_seconds;
    if (secs != null && secs > 0) {
      _startCountdown(secs);
    } else {
      const cd = document.getElementById('cd-value');
      if (cd) cd.textContent = _l('allDone', _lang);
    }
  }

  /* ── Info card: location · method · dates ──────────────────── */
  function _buildInfoCard() {
    const d    = _data;
    const city = d.city ? `${d.city}, ${d.country}` : d.country;
    const flag = d.country_code ? _countryFlag(d.country_code) : '';
    const greg = `${d.gregorian.day} ${d.gregorian.month} ${d.gregorian.year}`;
    const hij  = d.hijri.full;
    const meth = d.method || '';
    return `
      <div class="p-card p-info-card">
        <div class="p-info-location">
          <span class="p-flag">${flag}</span>
          <span class="p-city">${_esc(city)}</span>
        </div>
        ${meth ? `
        <div class="p-info-row">
          <span class="p-info-icon">🕌</span>
          <span class="p-info-val">${_esc(meth)}</span>
        </div>` : ''}
        <div class="p-info-row">
          <span class="p-info-icon">📅</span>
          <span class="p-info-val">${_esc(greg)}</span>
        </div>
        <div class="p-info-row">
          <span class="p-info-icon">🗓</span>
          <span class="p-info-val">${_esc(hij)}</span>
        </div>
      </div>`;
  }

  /* ── Next-prayer hero card ─────────────────────────────────── */
  function _buildNextPrayer() {
    const np = _data.next_prayer;
    const prayers = _data.prayers;
    if (!np) return '';
    const pObj = prayers.find(p => p.key === np.key) || {};
    return `
      <div class="p-card p-next-card">
        <div class="p-next-label">${_l('nextPrayer', _lang)}</div>
        <div class="p-next-main">
          <div class="p-next-name">
            <span class="p-next-icon">${pObj.icon || '🕌'}</span>
            <span class="p-next-text">${_esc(pObj.name || np.key)}</span>
          </div>
          <span class="p-next-time">${np.time}</span>
        </div>
        <div class="p-next-cd-wrap">
          <span id="cd-value" class="p-next-cd">--:--:--</span>
        </div>
      </div>`;
  }

  /* ── Prayer list ───────────────────────────────────────────── */
  function _buildPrayerList() {
    const nextKey = _data.next_prayer?.key;
    const rows = _data.prayers.map(p => `
      <div class="p-row ${p.key === nextKey ? 'p-row--next' : ''}">
        <span class="p-row-icon">${p.icon}</span>
        <span class="p-row-name">${_esc(p.name)}</span>
        <span class="p-row-time">${p.time}</span>
        ${p.key === nextKey ? `<span class="p-row-dot"></span>` : ''}
      </div>`).join('');
    return `<div class="p-card p-list-card">${rows}</div>`;
  }

  /* ── Weather card ──────────────────────────────────────────── */
  function _buildWeatherCard() {
    const w = _data.weather;
    if (!w) return '';
    return `
      <div class="p-card p-section-card">
        <div class="p-section-hdr">
          <span class="p-section-dot"></span>
          ${_l('weather', _lang)}
        </div>
        <div class="p-weather-main">
          <span class="p-weather-icon">${w.icon}</span>
          <div class="p-weather-temp-wrap">
            <span class="p-weather-temp">${w.temp_c}°C</span>
            <span class="p-weather-desc">${_esc(w.description)}</span>
          </div>
        </div>
        <div class="p-weather-details">
          <div class="p-wdetail">
            <span>💧</span>
            <span>${_l('humidity', _lang)}: ${w.humidity}%</span>
          </div>
          <div class="p-wdetail">
            <span>🌬</span>
            <span>${_l('wind', _lang)}: ${w.wind_kmph} km/h</span>
          </div>
          <div class="p-wdetail">
            <span>🌡</span>
            <span>${_l('feelsLike', _lang)}: ${w.feels_like_c}°C</span>
          </div>
          ${w.uv_index != null ? `
          <div class="p-wdetail">
            <span>☀️</span>
            <span>UV: ${w.uv_index}</span>
          </div>` : ''}
        </div>
      </div>`;
  }

  /* ── AQI card ──────────────────────────────────────────────── */
  function _buildAQICard() {
    const a = _data.aqi;
    if (!a) return '';
    const pct = Math.min(Math.round((a.aqi / 120) * 100), 100);
    return `
      <div class="p-card p-section-card">
        <div class="p-section-hdr">
          <span class="p-section-dot"></span>
          ${_l('airQuality', _lang)}
        </div>
        <div class="p-aqi-main">
          <span class="p-aqi-icon">${a.icon}</span>
          <div>
            <span class="p-aqi-label" style="color:${a.color}">${_esc(a.label)}</span>
            <span class="p-aqi-val"> · AQI ${a.aqi}</span>
          </div>
        </div>
        <div class="p-aqi-bar-track">
          <div class="p-aqi-bar-fill" style="width:${pct}%;background:${a.color}"></div>
        </div>
        <div class="p-weather-details">
          <div class="p-wdetail"><span>PM2.5</span><span>${a.pm2_5} µg/m³</span></div>
          <div class="p-wdetail"><span>PM10</span><span>${a.pm10} µg/m³</span></div>
          ${a.no2 ? `<div class="p-wdetail"><span>NO₂</span><span>${a.no2} µg/m³</span></div>` : ''}
          ${a.ozone ? `<div class="p-wdetail"><span>O₃</span><span>${a.ozone} µg/m³</span></div>` : ''}
        </div>
      </div>`;
  }

  /* ── Daily Ayah card ───────────────────────────────────────── */
  function _buildAyahCard() {
    const ay = _data.daily_ayah;
    if (!ay) return '';
    return `
      <div class="p-card p-section-card p-ayah-card">
        <div class="p-section-hdr">
          <span class="p-section-dot p-section-dot--gold"></span>
          ${_l('dailyAyah', _lang)}
        </div>
        <p class="p-ayah-arabic" dir="rtl">${_esc(ay.arabic)}</p>
        <p class="p-ayah-trans">${_esc(ay.translation)}</p>
        <p class="p-ayah-ref">— ${_esc(ay.reference)}</p>
      </div>`;
  }

  /* ── Daily Hadith card ─────────────────────────────────────── */
  function _buildHadithCard() {
    const h = _data.daily_hadith;
    if (!h) return '';
    return `
      <div class="p-card p-section-card p-hadith-card">
        <div class="p-section-hdr">
          <span class="p-section-dot p-section-dot--green"></span>
          ${_l('dailyHadith', _lang)}
        </div>
        <p class="p-hadith-text">"${_esc(h.text)}"</p>
        <p class="p-hadith-narrator">${_esc(h.narrator)}</p>
        <p class="p-hadith-source">${_esc(h.source)}</p>
      </div>`;
  }

  /* ── Footer buttons ────────────────────────────────────────── */
  function _buildFooterBtns() {
    return `
      <div class="p-footer-btns">
        <button class="p-btn-secondary" id="p-btn-refresh">
          ${_l('refresh', _lang)}
        </button>
        <button class="p-btn-secondary" id="p-btn-changeloc">
          ${_l('changeLoc', _lang)}
        </button>
      </div>`;
  }

  function _bindScrollEvents() {
    document.getElementById('p-btn-refresh')
      ?.addEventListener('click', _onRefresh);
    document.getElementById('p-btn-changeloc')
      ?.addEventListener('click', _onChangeLoc);
  }

  /* ══════════════════════════════════════════════════════════════
     COUNTDOWN TIMER
  ══════════════════════════════════════════════════════════════ */
  function _startCountdown(initialSec) {
    let rem = initialSec;

    function tick() {
      const el = document.getElementById('cd-value');
      if (!el) { _stopCountdown(); return; }

      if (rem <= 0) {
        el.textContent = '00:00:00';
        _stopCountdown();
        setTimeout(() => {
          if (_lat && _lon) {
            _showLoading();
            _fetchPrayerTimes(_lat, _lon);
          }
        }, 2000);
        return;
      }

      const h = Math.floor(rem / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const s = rem % 60;
      el.textContent = `${_pad(h)}:${_pad(m)}:${_pad(s)}`;
      rem--;
    }

    tick();
    _countdownId = setInterval(tick, 1000);
  }

  function _stopCountdown() {
    if (_countdownId !== null) {
      clearInterval(_countdownId);
      _countdownId = null;
    }
  }

  /* ── Navigation ────────────────────────────────────────────── */
  function _goBack() {
    _stopCountdown();
    window.App.navigate('screen-dashboard');
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  /* ── Utilities ─────────────────────────────────────────────── */
  function _pad(n)    { return String(n).padStart(2, '0'); }
  function _esc(str)  {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* Convert ISO country code to flag emoji */
  function _countryFlag(cc) {
    if (!cc || cc.length !== 2) return '';
    return [...cc.toUpperCase()].map(c =>
      String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
    ).join('');
  }

  return { render, load };
})();
