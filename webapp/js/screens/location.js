/* ═══════════════════════════════════════════════════
   Location Permission Screen — onboarding step 3
   ═══════════════════════════════════════════════════ */

const LocationScreen = (function () {
  'use strict';

  const TILE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%230d1829'/%3E%3Cline x1='0' y1='0' x2='60' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Cline x1='60' y1='0' x2='0' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%23F5C542' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E";

  const LC = {
    title:    { uz:'Joylashuv',      uz_cyr:'Жойлашув',      ru:'Местоположение',   en:'Location',         tr:'Konum',           ar:'الموقع',             kk:'Орналасуы',          tg:'Мавқеъ',               ky:'Жайгашуу',        de:'Standort',                  fr:'Localisation',          id:'Lokasi',          hi:'स्थान',           ur:'مقام'               },
    subtitle: { uz:'Aniq namoz vaqtlarini aniqlash uchun', uz_cyr:'Аниқ намоз вақтларини аниқлаш учун', ru:'Для определения точного времени намаза', en:'To determine accurate prayer times', tr:'Doğru namaz vakitleri için', ar:'لتحديد أوقات الصلاة بدقة', kk:'Дәл намаз уақытын анықтау үшін', tg:'Барои муайян кардани вақтҳои дақиқи намоз', ky:'Так намаз убактарын аныктоо үчүн', de:'Für genaue Gebetszeiten', fr:'Pour déterminer les heures de prière précises', id:'Untuk menentukan waktu sholat yang akurat', hi:'सटीक नमाज़ के वक़्त के लिए', ur:'نماز کے صحیح اوقات معلوم کرنے کے لیے' },
    heading:  { uz:'Joylashuvingizga ruxsat bering', uz_cyr:'Жойлашувингизга рухсат беринг', ru:'Разрешите доступ к местоположению', en:'Allow location access', tr:'Konum erişimine izin verin', ar:'اسمح بالوصول إلى الموقع', kk:'Орналасуға рұқсат беріңіз', tg:'Ба мавқеъ иҷозат диҳед', ky:'Жайгашууга уруксат бериңиз', de:'Standortzugriff erlauben', fr:"Autoriser l'accès à la localisation", id:'Izinkan akses lokasi', hi:'स्थान की अनुमति दें', ur:'مقام تک رسائی کی اجازت دیں' },
    desc:     { uz:'Aniq namoz vaqtlari, qibla yo\'nalishi va yaqin masjidlarni topish uchun GPS kerak', uz_cyr:'Аниқ намоз вақтлари, қибла йўналиши ва яқин масжидларни топиш учун GPS керак', ru:'GPS нужен для точного времени намаза, направления киблы и ближайших мечетей', en:'GPS is needed for accurate prayer times, qibla direction and nearby mosques', tr:'Doğru namaz vakitleri, kıble yönü ve yakın camiler için GPS gerekli', ar:'يلزم GPS لتحديد أوقات الصلاة والقبلة والمساجد القريبة بدقة', kk:'Дәл намаз уақыты, қибла бағыты және жақын мешіттер үшін GPS қажет', tg:'GPS барои вақтҳои дақиқи намоз, самти қибла ва масҷидҳои наздик лозим аст', ky:'Так намаз убактары, кыбла багыты жана жакын мечиттер үчүн GPS керек', de:'GPS wird für genaue Gebetszeiten, Qibla-Richtung und nahe Moscheen benötigt', fr:'Le GPS est nécessaire pour les heures de prière, la direction de la qibla et les mosquées proches', id:'GPS diperlukan untuk waktu sholat akurat, arah kiblat, dan masjid terdekat', hi:'GPS नमाज़ के वक़्त, क़िबला दिशा और पास की मस्जिदों के लिए ज़रूरी है', ur:'GPS نماز کے اوقات، قبلہ سمت اور قریبی مساجد کے لیے ضروری ہے' },
    feat1:    { uz:'Namoz vaqtlari',   uz_cyr:'Намоз вақтлари',   ru:'Время намаза',      en:'Prayer times',     tr:'Namaz vakitleri', ar:'أوقات الصلاة',       kk:'Намаз уақыттары',    tg:'Вақтҳои намоз',        ky:'Намаз убактары',  de:'Gebetszeiten',              fr:'Heures de prière',      id:'Waktu sholat',    hi:'नमाज़ के वक़्त',   ur:'نماز کے اوقات'      },
    feat2:    { uz:"Qibla yo'nalishi", uz_cyr:'Қибла йўналиши',  ru:'Направление Киблы', en:'Qibla direction',  tr:'Kıble yönü',      ar:'اتجاه القبلة',       kk:'Қибла бағыты',       tg:'Самти қибла',          ky:'Кыбла багыты',    de:'Qibla-Richtung',            fr:'Direction de la qibla', id:'Arah kiblat',     hi:'क़िबला दिशा',    ur:'قبلہ سمت'           },
    feat3:    { uz:'Yaqin masjidlar', uz_cyr:'Яқин масжидлар',  ru:'Ближайшие мечети',  en:'Nearby mosques',   tr:'Yakın camiler',   ar:'المساجد القريبة',    kk:'Жақын мешіттер',     tg:'Масҷидҳои наздик',     ky:'Жакын мечиттер',  de:'Nahe Moscheen',             fr:'Mosquées proches',      id:'Masjid terdekat', hi:'पास की मस्जिदें', ur:'قریبی مساجد'        },
    gpsBtn:   { uz:'📍 GPS ruxsatini bering', uz_cyr:'📍 GPS рухсатини беринг', ru:'📍 Разрешить GPS', en:'📍 Allow GPS', tr:'📍 GPS izni ver', ar:'📍 السماح بـGPS', kk:'📍 GPS рұқсат беру', tg:'📍 Иҷозат ба GPS', ky:'📍 GPS уруксат', de:'📍 GPS erlauben', fr:'📍 Autoriser GPS', id:'📍 Izinkan GPS', hi:'📍 GPS की अनुमति दें', ur:'📍 GPS کی اجازت دیں' },
    skip:     { uz:"O'tkazib yuborish →", uz_cyr:'Ўтказиб юбориш →', ru:'Пропустить →', en:'Skip →', tr:'Atla →', ar:'تخطي ←', kk:'Өткізіп жіберу →', tg:'Гузаштан →', ky:'Өткөрүп жибер →', de:'Überspringen →', fr:'Ignorer →', id:'Lewati →', hi:'छोड़ें →', ur:'چھوڑیں ←' },
    loading:  { uz:'⏳ Aniqlanmoqda...', uz_cyr:'⏳ Аниқланмоқда...', ru:'⏳ Определяем...', en:'⏳ Detecting...', tr:'⏳ Algılanıyor...', ar:'⏳ جاري الكشف...', kk:'⏳ Анықталуда...', tg:'⏳ Муайян мешавад...', ky:'⏳ Аныкталууда...', de:'⏳ Wird erkannt...', fr:'⏳ Détection...', id:'⏳ Mendeteksi...', hi:'⏳ पता लगाया जा रहा है...', ur:'⏳ پتہ لگایا جا رہا ہے...' },
  };

  const MAZH_NAMES = {
    hanafi:  { uz:'Hanafiy', uz_cyr:'Ҳанафий', ru:'Ханафи', en:'Hanafi', tr:'Hanefi', ar:'الحنفي', kk:'Ханафи', tg:'Ҳанафӣ', ky:'Ханафи', de:'Hanafi', fr:'Hanafite', id:'Hanafi', hi:'हनफ़ी', ur:'حنفی' },
    maliki:  { uz:'Molikiy', uz_cyr:'Молиқий', ru:'Маликi', en:'Maliki', tr:'Mâlikî', ar:'المالكي', kk:'Малики', tg:'Моликӣ', ky:'Малики', de:'Maliki', fr:'Malékite', id:'Maliki', hi:'मालिकी', ur:'مالکی' },
    shafii:  { uz:'Shofeiy', uz_cyr:'Шофеий', ru:'Шафии', en:"Shafi'i", tr:'Şâfiî', ar:'الشافعي', kk:'Шафии', tg:'Шофеӣ', ky:'Шафии', de:"Schafi'i", fr:"Châfiite", id:"Syafi'i", hi:'शाफ़ई', ur:'شافعی' },
    hanbali: { uz:'Hanbaliy', uz_cyr:'Ҳанбалий', ru:'Ханбали', en:'Hanbali', tr:'Hanbelî', ar:'الحنبلي', kk:'Ханбали', tg:'Ҳанбалӣ', ky:'Ханбали', de:'Hanbali', fr:'Hanbalite', id:'Hanbali', hi:'हम्बली', ur:'حنبلی' },
  };

  let _loading = false;

  function _lc(key, lang) { const n = LC[key]; return n ? (n[lang] || n.en || '') : ''; }
  function _mazhName(k, lang) { const n = MAZH_NAMES[k]; return n ? (n[lang] || n.en || k) : k; }

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
    const lang    = window.App?.state?.lang || 'uz';
    const mazhab  = localStorage.getItem('islamtime_madhab') || 'hanafi';
    const backLbl = '← ' + _mazhName(mazhab, lang);

    return `
      <div class="lc-wrap">

        <div class="lc-header">
          <div class="lc-tile" style="background-image:url('${TILE}')"></div>
          <div class="lc-ov"></div>
          <div class="lc-hi">
            <button class="lc-back" id="lc-back">${backLbl}</button>
            <div class="lc-title">${_lc('title', lang)}</div>
            <div class="lc-subtitle">${_lc('subtitle', lang)}</div>
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

          <div class="lc-heading">${_lc('heading', lang)}</div>
          <div class="lc-desc">${_lc('desc', lang)}</div>

          <div class="lc-features">
            <div class="lc-feat">
              <span class="lc-feat-ic">🕌</span>
              <span class="lc-feat-txt">${_lc('feat1', lang)}</span>
            </div>
            <div class="lc-feat">
              <span class="lc-feat-ic">🧭</span>
              <span class="lc-feat-txt">${_lc('feat2', lang)}</span>
            </div>
            <div class="lc-feat">
              <span class="lc-feat-ic">🕋</span>
              <span class="lc-feat-txt">${_lc('feat3', lang)}</span>
            </div>
          </div>
        </div>

        <div class="lc-footer">
          <button class="lc-btn-main" id="lc-allow">
            <span id="lc-btn-lbl">${_lc('gpsBtn', lang)}</span>
            <div class="lc-btn-sep"></div>
            <span class="lc-btn-arr">→</span>
          </button>
          <button class="lc-btn-skip" id="lc-skip">${_lc('skip', lang)}</button>
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
    const lang = window.App?.state?.lang || 'uz';
    const lbl  = document.getElementById('lc-btn-lbl');
    if (lbl) lbl.textContent = _lc('loading', lang);

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
