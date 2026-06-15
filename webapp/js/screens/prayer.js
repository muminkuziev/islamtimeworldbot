/* ═══════════════════════════════════════════════════════════════
   Prayer Times Screen  —  Navy+Gold Premium v2
   Tabs: Vaqtlar | Ob-havo | AQI | Sozlama
═══════════════════════════════════════════════════════════════ */

const PrayerScreen = (function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let _data        = null;
  let _countdownId = null;
  let _lang        = 'uz';
  let _lat         = null;
  let _lon         = null;
  let _tab         = 'vaqt';

  const PRAYER_AR = {
    fajr:'الفجر', sunrise:'الشروق', dhuhr:'الظهر',
    asr:'العصر',  maghrib:'المغرب', isha:'العشاء'
  };

  /* ── Local AQI levels (0–500 WHO scale) ─────────────────────── */
  const AQI_LEVELS = [
    { max:50,  label:'Yaxshi',                label_cyr:'Яхши',                label_ru:'Хорошо',              label_en:'Good',                  color:'#4fcfa0', safe:true  },
    { max:100, label:"O'rtacha",              label_cyr:'Ўртача',              label_ru:'Умеренно',             label_en:'Moderate',              color:'#a3e635', safe:true  },
    { max:150, label:'Sezgirlar uchun zarar', label_cyr:'Сезгирлар учун зарар',label_ru:'Вредно (чувствит.)', label_en:'Sensitive Groups',      color:'#f59e0b', safe:false },
    { max:200, label:'Zararli',               label_cyr:'Зарарли',             label_ru:'Вредно',               label_en:'Unhealthy',             color:'#f97316', safe:false },
    { max:300, label:'Juda zararli',          label_cyr:'Жуда зарарли',        label_ru:'Очень вредно',         label_en:'Very Unhealthy',        color:'#e05555', safe:false },
    { max:500, label:'Xavfli',               label_cyr:'Хавфли',              label_ru:'Опасно',               label_en:'Hazardous',             color:'#c084fc', safe:false },
  ];

  function _getAqiLevel(v) {
    return AQI_LEVELS.find(l => v <= l.max) || AQI_LEVELS[5];
  }

  /* ── Notification prefs (localStorage) ──────────────────────── */
  function _getNotifPrefs() {
    try { return JSON.parse(localStorage.getItem('islamtime_notif_v1') || '{}'); }
    catch { return {}; }
  }
  function _setNotifPref(k, v) {
    const p = _getNotifPrefs(); p[k] = v;
    localStorage.setItem('islamtime_notif_v1', JSON.stringify(p));
  }
  function _getTimingPref(key) {
    const p = _getNotifPrefs();
    return p['timing_' + key] ?? 0;
  }

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
                  en:'All prayers done 🌙',              ru:'Все намазы прошли 🌙',
                  tr:'Tüm namazlar bitti 🌙',            ar:'انتهت الصلوات 🌙',
                  kk:'Барлық намаздар аяқталды 🌙',      tg:'Ҳамаи намозҳо гузаштанд 🌙',
                  ky:'Бардык намаздар аяктады 🌙',       de:'Alle Gebete erledigt 🌙',
                  fr:'Toutes les prières terminées 🌙',  id:'Semua sholat selesai 🌙',
                  hi:'आज की नमाज़ें हो गईं 🌙',          ur:'آج کی نمازیں ختم 🌙' },

    refresh:    { uz:'🔄 Yangilash',  uz_cyr:'🔄 Янгилаш', en:'🔄 Refresh',
                  ru:'🔄 Обновить',   tr:'🔄 Yenile',       ar:'🔄 تحديث',
                  kk:'🔄 Жаңарту',   tg:'🔄 Навсоз кардан',ky:'🔄 Жаңылоо',
                  de:'🔄 Aktualisieren',fr:'🔄 Actualiser', id:'🔄 Perbarui',
                  hi:'🔄 रिफ्रेश',   ur:'🔄 تازہ کریں' },

    changeLoc:  { uz:"📍 Lokatsiyani o'zgartirish", uz_cyr:'📍 Локацияни ўзгартириш',
                  en:'📍 Change Location',            ru:'📍 Изменить локацию',
                  tr:'📍 Konumu değiştir',            ar:'📍 تغيير الموقع',
                  kk:'📍 Орынды өзгерту',            tg:'📍 Мавқеатро иваз кунед',
                  ky:'📍 Жайгашкан жерди өзгөртүү', de:'📍 Standort ändern',
                  fr:"📍 Changer d'emplacement",     id:'📍 Ubah lokasi',
                  hi:'📍 स्थान बदलें',               ur:'📍 مقام تبدیل کریں' },

    loading:    { uz:'Namoz vaqtlari yuklanmoqda…', uz_cyr:'Намоз вақтлари юкланмоқда…',
                  en:'Loading prayer times…',        ru:'Загрузка намаза…',
                  tr:'Namaz vakitleri yükleniyor…',  ar:'جاري التحميل…',
                  kk:'Жүктелуде…',                  tg:'Бор карда мешавад…',
                  ky:'Жүктөлүүдө…',                 de:'Wird geladen…',
                  fr:'Chargement…',                  id:'Memuat…',
                  hi:'लोड हो रहा है…',              ur:'لوڈ ہو رہا ہے…' },

    locError:   { uz:'Lokatsiyaga ruxsat berilmadi yoki xatolik yuz berdi.',
                  uz_cyr:'Жойга рухсат берилмади ёки хатолик юз берди.',
                  en:'Location access denied or an error occurred.',
                  ru:'Доступ к геолокации отклонён или произошла ошибка.',
                  tr:'Konum erişimi reddedildi veya hata oluştu.',
                  ar:'تم رفض الوصول إلى الموقع أو حدث خطأ.',
                  kk:'Геолокацияға рұқсат берілмеді немесе қате орын алды.',
                  tg:'Дастрасӣ ба ҷуғрофиё рад карда шуд ё хато рӯй дод.',
                  ky:'Жайгашкан жерге уруксат берилген жок же ката чыкты.',
                  de:'Standortzugriff verweigert oder Fehler aufgetreten.',
                  fr:'Accès à la localisation refusé ou erreur survenue.',
                  id:'Akses lokasi ditolak atau terjadi kesalahan.',
                  hi:'स्थान की अनुमति अस्वीकार या त्रुटि हुई।',
                  ur:'مقام تک رسائی منع یا خرابی پیش آئی۔' },

    tryAgain:   { uz:'Qayta urinish',  uz_cyr:'Қайта уриниш',
                  en:'Try Again',      ru:'Повторить',
                  tr:'Tekrar Dene',    ar:'حاول مجدداً',
                  kk:'Қайта көріңіз', tg:'Бори дигар кӯшиш кунед',
                  ky:'Кайра аракет',  de:'Erneut versuchen',
                  fr:'Réessayer',     id:'Coba lagi',
                  hi:'पुनः प्रयास',  ur:'دوبارہ کوشش' },

    weather:    { uz:'Ob-havo',     uz_cyr:'Об-ҳаво',  en:'Weather',  ru:'Погода',
                  tr:'Hava durumu', ar:'الطقس',          kk:'Ауа райы', tg:'Обу ҳаво',
                  ky:'Аба ырайы',   de:'Wetter',         fr:'Météo',    id:'Cuaca',
                  hi:'मौसम',        ur:'موسم' },

    airQuality: { uz:'Havo sifati',     uz_cyr:'Ҳаво сифати', en:'Air Quality',
                  ru:'Качество воздуха',tr:'Hava kalitesi',    ar:'جودة الهواء',
                  kk:'Ауа сапасы',     tg:'Сифати ҳаво',      ky:'Аба сапаты',
                  de:'Luftqualität',   fr:"Qualité de l'air",  id:'Kualitas Udara',
                  hi:'वायु गुणवत्ता', ur:'ہوا کا معیار' },

    dailyAyah:  { uz:'Kunlik oyat',     uz_cyr:'Кунлик оят',   en:'Daily Ayah',
                  ru:'Аят дня',         tr:'Günün Ayeti',       ar:'آية اليوم',
                  kk:'Күндегі аят',    tg:'Ояти рӯзона',       ky:'Күнүмдүк аят',
                  de:'Tagesayah',      fr:'Verset du jour',     id:'Ayat Harian',
                  hi:'आज की आयत',     ur:'آج کی آیت' },

    dailyHadith:{ uz:'Kunlik hadis',    uz_cyr:'Кунлик ҳадис', en:'Daily Hadith',
                  ru:'Хадис дня',       tr:'Günün Hadisi',      ar:'حديث اليوم',
                  kk:'Күндегі хадис',  tg:'Ҳадиси рӯзона',    ky:'Күнүмдүк хадис',
                  de:'Tageshadith',    fr:'Hadith du jour',     id:'Hadits Harian',
                  hi:'आज का हदीस',    ur:'آج کا حدیث' },

    feelsLike:  { uz:'Seziladi',    uz_cyr:'Сезилади', en:'Feels',    ru:'Ощущается',
                  tr:'Hissedilen',  ar:'يبدو',          kk:'Сезіледі', tg:'Эҳсос мешавад',
                  ky:'Сезилет',    de:'Gefühlt',        fr:'Ressenti', id:'Terasa',
                  hi:'महसूस',      ur:'محسوس' },

    humidity:   { uz:'Namlik',      uz_cyr:'Намлик',  en:'Humidity',    ru:'Влажность',
                  tr:'Nem',         ar:'الرطوبة',       kk:'Ылғалдылық', tg:'Намӣ',
                  ky:'Нымдуулук',  de:'Feuchtigkeit',  fr:'Humidité',   id:'Kelembaban',
                  hi:'आर्द्रता',   ur:'نمی' },

    wind:       { uz:'Shamol',   uz_cyr:'Шамол', en:'Wind',  ru:'Ветер',
                  tr:'Rüzgar',  ar:'الرياح',      kk:'Жел',  tg:'Шамол',
                  ky:'Шамал',  de:'Wind',         fr:'Vent', id:'Angin',
                  hi:'हवा',    ur:'ہوا' },

    tabVaqt:    { uz:'Vaqtlar',    uz_cyr:'Вақтлар',     en:'Times',    ru:'Времена',
                  tr:'Vakitler',   ar:'الأوقات',           kk:'Уақыттар', tg:'Вақтҳо',
                  ky:'Убактылар', de:'Zeiten',             fr:'Horaires', id:'Waktu',
                  hi:'समय',       ur:'اوقات' },

    tabObhavo:  { uz:'Ob-havo',  uz_cyr:'Об-ҳаво', en:'Weather', ru:'Погода',
                  tr:'Hava',     ar:'الطقس',         kk:'Ауа',     tg:'Ҳаво',
                  ky:'Аба',     de:'Wetter',         fr:'Météo',   id:'Cuaca',
                  hi:'मौसम',    ur:'موسم' },

    tabAqi:     { uz:'AQI', uz_cyr:'AQI', en:'AQI', ru:'ИКВ', tr:'HKİ',
                  ar:'جودة الهواء', kk:'АКС', tg:'КАҲ', ky:'АКС',
                  de:'LQI', fr:'IQA', id:'IKU', hi:'AQI', ur:'AQI' },

    tabSoz:     { uz:'Sozlama',    uz_cyr:'Созлама',      en:'Settings',  ru:'Настройки',
                  tr:'Ayarlar',    ar:'الإعدادات',          kk:'Параметр', tg:'Танзимот',
                  ky:'Жөндөөлөр', de:'Einstellungen',      fr:'Paramètres',id:'Pengaturan',
                  hi:'सेटिंग्स', ur:'ترتیبات' },

    /* ── Countdown units ── */
    hours:    { uz:'soat',   uz_cyr:'соат',   en:'h',   ru:'ч',      tr:'s',   ar:'س', kk:'сағ', tg:'соат', ky:'саат', de:'Std', fr:'h',   id:'j',   hi:'घं', ur:'گھ'  },
    minutes:  { uz:'daqiqa', uz_cyr:'дақиқа', en:'min', ru:'мин',    tr:'dk',  ar:'د', kk:'мин', tg:'дақ',  ky:'мүн',  de:'Min', fr:'min', id:'mnt', hi:'मि', ur:'من'  },
    seconds:  { uz:'soniya', uz_cyr:'сония',  en:'s',   ru:'с',      tr:'sn',  ar:'ث', kk:'с',   tg:'сон',  ky:'с',    de:'Sek', fr:'s',   id:'dtk', hi:'से', ur:'سی'  },
    remaining:{ uz:'qoldi',  uz_cyr:'қолди',  en:'left',ru:'осталось',tr:'kaldı',ar:'باقي',kk:'қалды',tg:'монд',ky:'калды',de:'noch',fr:'rest.',id:'lagi',hi:'शेष',ur:'باقی' },

    /* ── Sun arc labels ── */
    sunArc:   { uz:'QUYOSH HARAKATI', uz_cyr:'ҚУЁШ ҲАРАКАТИ', en:'SUN MOVEMENT',       ru:'ДВИЖЕНИЕ СОЛНЦА',  tr:'GÜNEŞ HAREKETİ', ar:'حركة الشمس',  kk:'КҮН ҚОЗҒАЛЫСЫ', tg:'ҲАРАКАТИ ОФТОБ',  ky:'КҮН КЫЙМЫЛЫ',    de:'SONNENBEWEGUNG',          fr:'MOUVEMENT DU SOLEIL', id:'PERGERAKAN MATAHARI', hi:'सूर्य गति', ur:'سورج کی حرکت' },
    sunRise:  { uz:'Chiqishi',        uz_cyr:'Чиқиши',         en:'Rise',               ru:'Восход',           tr:'Doğuş',          ar:'شروق',         kk:'Шығу',           tg:'Тулӯъ',           ky:'Чыгуу',          de:'Aufgang',                 fr:'Lever',               id:'Terbit',              hi:'उदय',       ur:'طلوع'          },
    sunSet:   { uz:'Botishi',         uz_cyr:'Ботиши',         en:'Set',                ru:'Закат',            tr:'Batış',          ar:'غروب',         kk:'Батуы',          tg:'Ғуруб',           ky:'Батуу',          de:'Untergang',               fr:'Coucher',             id:'Terbenam',            hi:'अस्त',      ur:'غروب'          },
    dayLen:   { uz:'Kun uzunligi',    uz_cyr:'Кун узунлиги',   en:'Day length',         ru:'День',             tr:'Gün uzunluğu',   ar:'طول النهار',   kk:'Күн ұзақтығы',   tg:'Дарозии рӯз',     ky:'Күндүн узундугу', de:'Tagesdauer',              fr:'Durée du jour',       id:'Panjang hari',        hi:'दिन',       ur:'دن'            },

    /* ── Weather labels ── */
    now:      { uz:'Hozir',  uz_cyr:'Ҳозир',  en:'Now',   ru:'Сейчас', tr:'Şimdi', ar:'الآن', kk:'Қазір', tg:'Ҳозир', ky:'Азыр', de:'Jetzt',   fr:'Maint.', id:'Skrg',     hi:'अभी', ur:'ابھی' },
    today:    { uz:'Bugun',  uz_cyr:'Бугун',  en:'Today', ru:'Сегодня',tr:'Bugün', ar:'اليوم',kk:'Бүгін', tg:'Имрӯз', ky:'Бүгүн',de:'Heute',   fr:"Auj.",   id:'Hari ini', hi:'आज',  ur:'آج'   },
  };

  function _l(key, lang) {
    const d = L[key];
    return d ? (d[lang] || d.en || Object.values(d)[0]) : key;
  }
  function _T(lat, cyr, ru, en) { if (_lang === 'uz_cyr') return cyr; if (_lang === 'ru' && ru !== undefined) return ru; if (_lang === 'en' && en !== undefined) return en; return lat; }
  function _aqiLabel(lvl) { if (_lang === 'uz_cyr') return lvl.label_cyr; if (_lang === 'ru') return lvl.label_ru || lvl.label; if (_lang === 'en') return lvl.label_en || lvl.label; return lvl.label; }

  /* ── Render shell ───────────────────────────────────────────── */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    const el = document.getElementById('screen-prayer');
    if (!el) return;
    el.innerHTML = `
      <div class="screen-inner q-screen">
        <div class="q-header">
          <div class="q-nav-row">
            <button id="prayer-back" class="q-back-btn">‹ ${_lang === 'ar' ? 'القائمة' : _T('Menyu','Меню','Меню','Menu')}</button>
            <button id="prayer-hdr-refresh" class="pm-refresh-btn" aria-label="Refresh">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            </button>
          </div>
          <div class="q-title-block">
            <div class="q-title-main" id="prayer-title">${_l('title', _lang)}</div>
            <div class="pm-hdr-meta" id="pm-hdr-meta">
              <span id="pm-hdr-city" class="pm-hdr-city">الصلاة</span>
            </div>
            <div class="pm-hdr-date" id="pm-hdr-date"></div>
          </div>
          <div id="pm-banner-wrap"></div>
          <div class="q-divider" style="margin-top:10px"></div>
          <div class="q-tabs-row" id="pm-tabs-row">
            <button class="q-tab-btn active" data-tab="vaqt">${_l('tabVaqt', _lang)}</button>
            <button class="q-tab-btn" data-tab="obhavo">${_l('tabObhavo', _lang)}</button>
            <button class="q-tab-btn" data-tab="aqi">${_l('tabAqi', _lang)}</button>
            <button class="q-tab-btn" data-tab="sozlama">${_l('tabSoz', _lang)}</button>
          </div>
        </div>
        <div class="pm-content" id="prayer-content"></div>
      </div>`;

    document.getElementById('prayer-back').addEventListener('click', _goBack);
    document.getElementById('prayer-hdr-refresh').addEventListener('click', _onRefresh);
    _bindTabs();
    _fitContent();
    try { window.Telegram?.WebApp?.onEvent('viewportChanged', _fitContent); } catch (_) {}
  }

  /* ── Explicit height fit (bypasses flex/height:100% quirks in WebView) ── */
  function _fitContent() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        const screen  = document.getElementById('screen-prayer');
        const content = document.getElementById('prayer-content');
        if (!screen || !content) return;
        const header = screen.querySelector('.q-header');
        if (!header) return;
        /* window.innerHeight is most reliable; viewportStableHeight may be 0 on first call */
        const tg     = window.Telegram?.WebApp;
        const vh     = tg?.viewportStableHeight;
        const totalH = (vh > 100 ? vh : 0) || window.innerHeight;
        const headH  = header.getBoundingClientRect().height;
        const h      = Math.max(150, totalH - headH);
        content.style.height    = h + 'px';
        content.style.minHeight = '';        /* clear previous minHeight */
        content.style.flex      = 'none';
        content.style.overflowY = 'scroll';
      });
    });
  }

  /* ── Entry point ────────────────────────────────────────────── */
  function load(lang) {
    _lang = lang || window.App?.state?.lang || 'uz';
    _stopCountdown();
    _tab = 'vaqt';

    const titleEl = document.getElementById('prayer-title');
    if (titleEl) titleEl.textContent = _l('title', _lang);

    const row = document.getElementById('pm-tabs-row');
    if (row) {
      row.querySelectorAll('.q-tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    }

    _showLoading();
    _getLocation();
  }

  function _bindTabs() {
    const row = document.getElementById('pm-tabs-row');
    if (!row) return;
    row.querySelectorAll('.q-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (_tab === btn.dataset.tab) return;
        _tab = btn.dataset.tab;
        row.querySelectorAll('.q-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (_data) _renderTabContent();
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     LOCATION
  ══════════════════════════════════════════════════════════════ */
  function _getLocation(forceNew = false) {
    /* Fast path: use saved coords for instant load */
    if (!forceNew) {
      const lat = parseFloat(localStorage.getItem('islamtime_last_lat'));
      const lon = parseFloat(localStorage.getItem('islamtime_last_lon'));
      if (!isNaN(lat) && !isNaN(lon)) { _onLocation(lat, lon); return; }
    }

    const tgLM = window.Telegram?.WebApp?.LocationManager;
    if (tgLM && typeof tgLM.init === 'function') {
      let _done = false;
      /* 3-second fallback — LocationManager.init() can silently never call back */
      const _t = setTimeout(() => { if (!_done) { _done = true; _browserGeo(); } }, 3000);
      tgLM.init(() => {
        if (_done) return;
        _done = true; clearTimeout(_t);
        if (tgLM.isLocationAvailable && tgLM.isAccessGranted) {
          tgLM.getLocation(loc => {
            if (loc && loc.latitude != null) _onLocation(loc.latitude, loc.longitude);
            else _browserGeo();
          });
        } else { _browserGeo(); }
      });
    } else { _browserGeo(); }
  }

  function _browserGeo() {
    if (!navigator.geolocation) { _showError(); return; }
    navigator.geolocation.getCurrentPosition(
      pos  => _onLocation(pos.coords.latitude, pos.coords.longitude),
      _err => _showError(),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  function _onLocation(lat, lon) {
    _lat = lat; _lon = lon;
    try {
      localStorage.setItem('islamtime_last_lat', lat);
      localStorage.setItem('islamtime_last_lon', lon);
    } catch (_) {}
    _fetchPrayerTimes(lat, lon);
  }

  function _onRefresh() {
    _stopCountdown();
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    if (_lat !== null && _lon !== null) { _showLoading(); _fetchPrayerTimes(_lat, _lon); }
    else { _showLoading(); _getLocation(); }
  }

  function _onChangeLoc() {
    _stopCountdown(); _lat = null; _lon = null;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    _showLoading(); _getLocation(true);
  }

  /* ══════════════════════════════════════════════════════════════
     API
  ══════════════════════════════════════════════════════════════ */
  async function _fetchPrayerTimes(lat, lon) {
    try {
      const url  = `${window.location.origin}/api/prayer-times?lat=${lat}&lon=${lon}&lang=${_lang}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      _data = json;
      _renderFull();
    } catch { _showError(); }
  }

  /* ══════════════════════════════════════════════════════════════
     LOADING / ERROR
  ══════════════════════════════════════════════════════════════ */
  function _showLoading() {
    const wrap = document.getElementById('pm-banner-wrap');
    if (wrap) wrap.innerHTML = '';
    const el = document.getElementById('prayer-content');
    if (!el) return;
    el.innerHTML = `
      <div class="pm-loader">
        <img src="assets/logo.svg" class="pm-loader-logo" alt=""/>
        <div class="splash-dots">
          <span class="splash-dot"></span><span class="splash-dot"></span><span class="splash-dot"></span>
        </div>
        <p class="pm-loader-text">${_l('loading', _lang)}</p>
      </div>`;
  }

  function _showError() {
    const el = document.getElementById('prayer-content');
    if (!el) return;
    el.innerHTML = `
      <div class="pm-loader">
        <div style="font-size:36px;margin-bottom:8px">📍</div>
        <p class="pm-loader-text">${_l('locError', _lang)}</p>
        <button class="pm-retry-btn" id="prayer-retry">${_l('tryAgain', _lang)}</button>
      </div>`;
    document.getElementById('prayer-retry')
      ?.addEventListener('click', () => { _showLoading(); _getLocation(); });
  }

  /* ══════════════════════════════════════════════════════════════
     FULL RENDER
  ══════════════════════════════════════════════════════════════ */
  function _renderFull() {
    if (!_data) return;

    /* Header meta: city · method */
    const cityEl = document.getElementById('pm-hdr-city');
    if (cityEl) {
      const city = _data.city || _data.country || '';
      const meth = _data.method || '';
      cityEl.textContent = [city, meth].filter(Boolean).join(' · ');
    }

    /* Header dates: Gregorian + Hijri */
    const dateEl = document.getElementById('pm-hdr-date');
    if (dateEl && _data.gregorian && _data.hijri) {
      const g = _data.gregorian;
      dateEl.innerHTML = `
        <span class="pm-hdr-greg">${g.day} ${g.month} ${g.year}</span>
        <span class="pm-hdr-sep">·</span>
        <span class="pm-hdr-hijri">${_data.hijri.full || ''}</span>`;
    }

    _buildBanner();
    _renderTabContent();
    _fitContent();

    const secs = _data.next_prayer?.countdown_seconds;
    if (secs != null && secs > 0) _startCountdown(secs);
    else {
      const cd = document.getElementById('pm-countdown');
      if (cd) cd.textContent = _l('allDone', _lang);
    }
  }

  /* ── Premium Banner ─────────────────────────────────────────── */
  function _buildBanner() {
    const wrap = document.getElementById('pm-banner-wrap');
    if (!wrap || !_data) return;
    const np = _data.next_prayer;

    if (!np || !np.key) {
      wrap.innerHTML = `
        <div class="pm-banner pm-banner--done">
          <div class="pm-banner-label">${_l('allDone', _lang)}</div>
        </div>`;
      return;
    }

    const pObj   = (_data.prayers || []).find(p => p.key === np.key) || {};
    const arName = PRAYER_AR[np.key] || '';

    /* Progress: current time between first and last prayer */
    const prayers = _data.prayers || [];
    const _toMin  = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
    const nowMin  = new Date().getHours() * 60 + new Date().getMinutes();
    const s       = _toMin(prayers[0]?.time);
    const e       = _toMin(prayers[prayers.length - 1]?.time);
    const pct     = e > s ? Math.min(100, Math.max(0, ((nowMin - s) / (e - s)) * 100)).toFixed(0) : 0;

    wrap.innerHTML = `
      <div class="pm-banner">
        <div class="pm-banner-topline"></div>
        <div class="pm-banner-row">
          <div>
            <div class="pm-banner-label">${_l('nextPrayer', _lang)}</div>
            <div class="pm-banner-name">${_esc(pObj.name || np.key)}</div>
            ${arName ? `<div class="pm-banner-ar-sub">${arName}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div class="pm-banner-bigtime">${np.time || '—:—'}</div>
            <div class="pm-banner-cd" id="pm-countdown">—</div>
          </div>
        </div>
        <div class="pm-banner-track">
          <div class="pm-banner-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  /* ── Tab router ─────────────────────────────────────────────── */
  function _renderTabContent() {
    const el = document.getElementById('prayer-content');
    if (!el || !_data) return;

    switch (_tab) {
      case 'vaqt':    el.innerHTML = _buildVaqtTab();    break;
      case 'obhavo':  el.innerHTML = _buildObHavoTab();  break;
      case 'aqi':     el.innerHTML = _buildAqiTab();     break;
      case 'sozlama':
        el.innerHTML = _buildSozlamaTab();
        _bindSozlama(el);
        break;
    }
    el.scrollTop = 0;
    setTimeout(function(){ el.scrollTop = 0; }, 0);
  }

  /* ══════════════════════════════════════════════════════════════
     VAQTLAR TAB — checkmarks, done opacity, sunrise special
  ══════════════════════════════════════════════════════════════ */
  function _buildVaqtTab() {
    const prayers = _data.prayers || [];
    const nextKey = _data.next_prayer?.key;
    const nextIdx = prayers.findIndex(p => p.key === nextKey);

    const rows = prayers.map((p, i) => {
      const isNext = p.key === nextKey;
      const isDone = nextIdx > -1 && i < nextIdx;
      const isSun  = p.key === 'sunrise';
      const ar     = PRAYER_AR[p.key] || '';

      if (isSun) {
        return `
          <div class="pm-row pm-row--sun">
            <div style="display:flex;align-items:baseline;gap:7px">
              <span class="pm-row-name">☀️ ${_esc(p.name)}</span>
              ${ar ? `<span class="pm-row-ar">${ar}</span>` : ''}
            </div>
            <span class="pm-row-time pm-row-time--muted">${p.time}</span>
          </div>`;
      }

      return `
        <div class="pm-row${isNext ? ' pm-row--next' : ''}${isDone ? ' pm-row--done' : ''}">
          ${isNext ? '<div class="pm-row-accent-bar"></div>' : ''}
          <div class="pm-row-info">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span class="pm-row-name${isNext ? ' pm-row-name--next' : ''}">${_esc(p.name)}</span>
              ${ar ? `<span class="pm-row-ar">${ar}</span>` : ''}
            </div>
          </div>
          <div class="pm-row-right">
            <span class="pm-row-time${isNext ? ' pm-row-time--next' : ''}">${p.time}</span>
            <div class="pm-row-check${isDone ? ' pm-row-check--done' : ''}">
              ${isDone ? '✓' : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    const ayah   = _data.daily_ayah   ? _buildAyahCard()   : '';
    const hadith = _data.daily_hadith ? _buildHadithCard() : '';
    return `<div class="pm-vaqt-list">${rows}</div>${ayah}${hadith}`;
  }

  /* ── SVG weather icons (inline, no emoji) ──────────────────── */
  function _weatherSvg(hour, size) {
    size = size || 22;
    const isDay = hour >= 4 && hour < 19;
    const G = '#E8C15A', GL = '#F5D98A', C = 'rgba(232,223,200,.55)';
    if (!isDay) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none"><path d="M22 4a13 13 0 1 0 6 14 11 11 0 0 1-6-14Z" fill="${C}"/></svg>`;
    }
    if (hour >= 10 && hour <= 16) {
      const rays = [0,60,120,180,240,300].map(a => {
        const r = a*Math.PI/180;
        return `<line x1="${(13+8.5*Math.cos(r)).toFixed(1)}" y1="${(12+8.5*Math.sin(r)).toFixed(1)}" x2="${(13+11.5*Math.cos(r)).toFixed(1)}" y2="${(12+11.5*Math.sin(r)).toFixed(1)}" stroke="${G}" stroke-width="2" stroke-linecap="round"/>`;
      }).join('');
      return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none"><circle cx="13" cy="12" r="6" fill="${G}"/>${rays}<path d="M11 25a5 5 0 0 1-.6-9.97A6.5 6.5 0 0 1 23 14.2 5.5 5.5 0 0 1 26.5 25H11Z" fill="${C}"/></svg>`;
    }
    const rays = [0,45,90,135,180,225,270,315].map(a => {
      const r = a*Math.PI/180;
      return `<line x1="${(16+10*Math.cos(r)).toFixed(1)}" y1="${(16+10*Math.sin(r)).toFixed(1)}" x2="${(16+14*Math.cos(r)).toFixed(1)}" y2="${(16+14*Math.sin(r)).toFixed(1)}" stroke="${G}" stroke-width="2" stroke-linecap="round"/>`;
    }).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="7" fill="${G}"/>${rays}</svg>`;
  }

  /* ── Sun arc card — elliptical arc, fully contained ───────────── */
  function _buildSunArc(riseTime, setTime) {
    if (!riseTime || !setTime) return '';
    const toMin = t => { const [h,m] = (t||'0:0').split(':').map(Number); return h*60+m; };
    const rise  = toMin(riseTime);
    const set   = toMin(setTime);
    const now   = new Date().getHours()*60 + new Date().getMinutes();
    const f     = Math.max(0, Math.min(1, (now - rise) / (set - rise || 1)));
    const total = set - rise;
    const dayLen = `${Math.floor(total/60)} ${_l('hours',_lang)} ${total%60} ${_l('minutes',_lang)}`;
    const isDay = now >= rise && now <= set;

    /* Elliptical arc: rx=128, ry=38
       Baseline at y=52. Arc peak at y=52-38=14. SVG height=58.
       Sun dot radius=5 → min rendered y=14-5=9 > 0 → fully inside viewBox.
       θ=π*(1-f): f=0→θ=π (left end), f=1→θ=0 (right end)           */
    const θ  = Math.PI * (1 - f);
    const sx = (140 + 128 * Math.cos(θ)).toFixed(1);
    const sy = (52  - 38  * Math.sin(θ)).toFixed(1);   /* max rise = 38px */

    const sunDot = isDay ? `
      <circle cx="${sx}" cy="${sy}" r="10" fill="#E8C15A" fill-opacity=".18"/>
      <circle cx="${sx}" cy="${sy}" r="5"  fill="#E8C15A"/>` : '';

    return `
      <div style="background:rgba(232,193,90,.06);border:1px solid rgba(232,193,90,.16);
                  border-radius:16px;padding:14px 16px 12px;margin-bottom:10px;overflow:hidden">
        <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);
                    letter-spacing:1.3px;text-transform:uppercase;margin-bottom:10px">
          ${_l('sunArc', _lang)}
        </div>
        <svg width="100%" height="58" viewBox="0 0 280 58"
             style="display:block;overflow:hidden;margin-bottom:6px">
          <defs>
            <linearGradient id="sunArcG" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stop-color="#5b9bd5" stop-opacity=".4"/>
              <stop offset="50%"  stop-color="#E8C15A"/>
              <stop offset="100%" stop-color="#5b9bd5" stop-opacity=".4"/>
            </linearGradient>
          </defs>
          <line x1="12" y1="52" x2="268" y2="52"
                stroke="rgba(232,223,200,.1)" stroke-width="1" stroke-dasharray="4 4"/>
          <path d="M12 52 A128 38 0 0 1 268 52"
                fill="none" stroke="url(#sunArcG)" stroke-width="2.5"
                stroke-linecap="round" opacity=".7"/>
          <circle cx="12"  cy="52" r="3.5" fill="rgba(232,223,200,.22)"/>
          <circle cx="268" cy="52" r="3.5" fill="rgba(232,223,200,.22)"/>
          ${sunDot}
        </svg>
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:9px;color:rgba(232,223,200,.38);margin-bottom:3px">🌅 ${_l('sunRise', _lang)}</div>
            <div style="font-size:13px;font-weight:700;color:#e8dfc8">${riseTime}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:9px;color:rgba(232,223,200,.38);margin-bottom:3px">${_l('dayLen', _lang)}</div>
            <div style="font-size:13px;font-weight:700;color:#E8C15A">${dayLen}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:9px;color:rgba(232,223,200,.38);margin-bottom:3px">🌇 ${_l('sunSet', _lang)}</div>
            <div style="font-size:13px;font-weight:700;color:#e8dfc8">${setTime}</div>
          </div>
        </div>
      </div>`;
  }

  /* ── Hourly forecast helper ─────────────────────────────────── */
  function _buildHourlyHtml(hourly) {
    const items = hourly.map((h, i) => {
      const hr  = parseInt((h.time||'0').split(':')[0]);
      const pop = h.precip_pct || h.pop || 0;
      const BG  = i===0 ? 'rgba(232,193,90,.1)'  : 'rgba(255,255,255,.04)';
      const BD  = i===0 ? 'rgba(232,193,90,.25)' : 'rgba(255,255,255,.06)';
      const TC  = i===0 ? '#E8C15A'              : 'rgba(232,223,200,.28)';
      return `
        <div style="flex-shrink:0;background:${BG};border:1px solid ${BD};border-radius:12px;
                    padding:10px 10px 8px;text-align:center;min-width:56px;
                    display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:10px;font-weight:700;color:${TC}">${i===0?_l('now',_lang):h.time}</div>
          ${_weatherSvg(hr, 24)}
          <div style="font-size:14px;font-weight:800;color:#e8dfc8">${h.temp_c}°</div>
          <div style="font-size:9px;color:#5b9bd5;font-weight:600;visibility:${pop>0?'visible':'hidden'}">💧${pop}%</div>
        </div>`;
    }).join('');
    return `
      <div class="pm-section-lbl" style="margin-top:14px;margin-bottom:8px">${_T('SOATLIK PROGNOZ','СОАТЛИК ПРОГНОЗ','ПОЧАСОВОЙ ПРОГНОЗ','HOURLY FORECAST')}</div>
      <div style="display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:6px;margin-bottom:14px">${items}</div>`;
  }

  /* ── 5-day forecast helper ──────────────────────────────────── */
  function _buildForecastHtml(forecast) {
    const items = forecast.map((day, i) => {
      const hr    = 14;
      const mn    = day.temp_min_c != null ? day.temp_min_c : 10;
      const mx    = day.temp_max_c != null ? day.temp_max_c : 26;
      const span  = mx - mn || 1;
      const left  = Math.max(0, ((mn - 8) / 22) * 100).toFixed(0);
      const width = Math.min(100, (span / 22) * 100).toFixed(0);
      const pop   = day.precip_pct || 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;
                    background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);
                    border-radius:12px;padding:9px 12px">
          <span style="font-size:12px;font-weight:700;color:${i===0?'#E8C15A':'#e8dfc8'};width:72px;flex-shrink:0">${i===0?_l('today',_lang):_esc(day.day_name||day.date||'')}</span>
          ${_weatherSvg(hr, 22)}
          <span style="font-size:9px;color:#5b9bd5;font-weight:600;width:34px;text-align:center;visibility:${pop>0?'visible':'hidden'}">${pop}%</span>
          <div style="flex:1;display:flex;align-items:center;gap:6px;justify-content:flex-end">
            <span style="font-size:11px;color:rgba(232,223,200,.55);font-weight:600">${mn}°</span>
            <div style="width:46px;height:3px;border-radius:2px;background:rgba(255,255,255,.08);position:relative;overflow:hidden">
              <div style="position:absolute;left:${left}%;width:${width}%;height:100%;
                          background:linear-gradient(90deg,#5b9bd5,#E8C15A);border-radius:2px"></div>
            </div>
            <span style="font-size:12px;color:#e8dfc8;font-weight:800">${mx}°</span>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="pm-section-lbl" style="margin-top:14px;margin-bottom:8px">${_T('5 KUNLIK PROGNOZ','5 КУНЛИК ПРОГНОЗ','5-ДНЕВНЫЙ ПРОГНОЗ','5-DAY FORECAST')}</div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px">${items}</div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     OB-HAVO TAB — premium v2
  ══════════════════════════════════════════════════════════════ */
  function _buildObHavoTab() {
    const w = _data.weather;
    if (!w) {
      setTimeout(function() {
        if (_data && !_data.weather && _lat && _lon) {
          var el = document.getElementById('prayer-obhavo-loading');
          if (el) el.textContent = _T('Yuklanmoqda…','Юкланмоқда…','Загрузка…','Loading…');
          _fetchPrayerTimes(_lat, _lon);
        }
      }, 2000);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px;text-align:center">
          <div style="width:44px;height:44px;border:3px solid rgba(91,155,213,.15);border-top-color:#5b9bd5;border-radius:50%;animation:spin 1s linear infinite"></div>
          <div id="prayer-obhavo-loading" style="font-size:13px;color:rgba(232,223,200,.5)">${_T('Ob-havo yuklanmoqda…','Об-ҳаво юкланмоқда…','Погода загружается…','Weather loading…')}</div>
          <button onclick="(function(){var b=document.getElementById('prayer-obhavo-btn');if(b)b.disabled=true;PrayerScreen._retryWeather&&PrayerScreen._retryWeather();})()" id="prayer-obhavo-btn"
            style="background:rgba(91,155,213,.12);border:1px solid rgba(91,155,213,.25);border-radius:12px;color:#5b9bd5;font-size:12px;font-weight:700;padding:8px 20px;cursor:pointer;margin-top:4px">
            ${_l('refresh',_lang)}
          </button>
        </div>`
      ;
    }
    const now  = new Date();
    const nowH = now.getHours();
    const nowStr = `${String(nowH).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    /* ── Hero card (React prototype exact, inline styles only) ── */
    const minMaxHtml = (w.temp_min_c != null && w.temp_max_c != null) ? `
      <div style="height:1px;background:rgba(91,155,213,.18);margin:12px 0 10px"></div>
      <div style="display:flex;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:10px;color:rgba(232,223,200,.28)">${_T('Eng yuqori','Энг юқори','Макс.','Max.')}</span>
          <span style="font-size:13px;font-weight:800;color:#E8C15A">${w.temp_max_c}°</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:10px;color:rgba(232,223,200,.28)">${_T('Eng past','Энг паст','Мин.','Min.')}</span>
          <span style="font-size:13px;font-weight:800;color:#5b9bd5">${w.temp_min_c}°</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:10px;color:rgba(232,223,200,.28)">${_T('Yangilandi','Янгиланди','Обновлено','Updated')}</span>
          <span style="font-size:11px;font-weight:700;color:rgba(232,223,200,.55)">${nowStr}</span>
        </div>
      </div>` : '';

    const heroHtml = `
      <div style="background:linear-gradient(145deg,rgba(91,155,213,.14),rgba(91,155,213,.04));border:1px solid rgba(91,155,213,.22);border-radius:18px;padding:16px;margin-bottom:10px;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#5b9bd5,transparent)"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">${_weatherSvg(nowH, 40)}</div>
            <div style="font-size:13px;color:#e8dfc8;font-weight:600">${_esc(w.description)}</div>
            <div style="font-size:10px;color:rgba(232,223,200,.28);margin-top:2px">📍 ${_esc(w.city || _data.city || '')}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:48px;font-weight:800;color:#e8dfc8;letter-spacing:-2px;line-height:1">${w.temp_c}°</div>
            <div style="font-size:10px;color:rgba(232,223,200,.55);margin-top:4px">${_T('His qilinadi','Ҳис қилинади','Ощущается','Feels like')}: ${w.feels_like_c}°</div>
          </div>
        </div>
        ${minMaxHtml}
      </div>`;

    /* ── Sun arc — use Open-Meteo sunrise/sunset, fallback to prayer data ── */
    const prayers  = _data.prayers || [];
    const sunriseT = w.sunrise || (prayers.find(p => p.key === 'sunrise') || {}).time || '';
    const sunsetT  = w.sunset  || (prayers.find(p => p.key === 'maghrib') || {}).time || '';
    const sunArc   = _buildSunArc(sunriseT, sunsetT);

    /* ── Hourly (React prototype exact, inline styles only) ── */
    const hourlyHtml = (w.hourly && w.hourly.length) ? `
      <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1.3px;text-transform:uppercase;margin-top:14px;margin-bottom:8px">${_T('SOATLIK PROGNOZ','СОАТЛИК ПРОГНОЗ','ПОЧАСОВОЙ ПРОГНОЗ','HOURLY FORECAST')}</div>
      <div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:14px;padding-bottom:2px">
        ${w.hourly.map((h, i) => {
          const hr  = parseInt((h.time||'0').split(':')[0]);
          const pop = h.precip_pct || 0;
          const BG  = i===0 ? 'rgba(232,193,90,.1)'  : 'rgba(255,255,255,.04)';
          const BD  = i===0 ? 'rgba(232,193,90,.25)' : 'rgba(255,255,255,.06)';
          const TC  = i===0 ? '#E8C15A'              : 'rgba(232,223,200,.28)';
          return `<div style="flex-shrink:0;background:${BG};border:1px solid ${BD};border-radius:12px;padding:10px 10px 8px;text-align:center;min-width:52px;display:flex;flex-direction:column;align-items:center;gap:6px">
            <div style="font-size:9px;font-weight:700;color:${TC}">${i===0?_l('now',_lang):h.time}</div>
            ${_weatherSvg(hr, 22)}
            <div style="font-size:13px;font-weight:800;color:#e8dfc8">${h.temp_c}°</div>
            <div style="font-size:8px;color:#5b9bd5;font-weight:600;visibility:${pop>0?'visible':'hidden'}">💧${pop}%</div>
          </div>`;
        }).join('')}
      </div>` : '';

    /* ── BATAFSIL (React prototype exact, inline styles only) ── */
    const details = [
      { ic:'💨', l:_T('Shamol','Шамол','Ветер','Wind'),           v: w.wind_kmph     != null ? `${w.wind_kmph} km/s`  : '—', sub: w.wind_dir_full || w.wind_dir || '' },
      { ic:'💧', l:_T('Namlik','Намлик','Влажность','Humidity'),     v: w.humidity      != null ? `${w.humidity}%`        : '—', sub: _T('Qulay daraja','Қулай даража','Комфортный уровень','Comfortable level')  },
      { ic:'🌡️', l:_T('Bosim','Босим','Давление','Pressure'),       v: w.pressure_hpa  != null ? `${w.pressure_hpa}`    : '—', sub: _T('hPa · Barqaror','hPa · Барқарор','гПа · Устойчиво','hPa · Stable') },
      { ic:'☀️', l:_T('UV indeksi','УВ индекси','УФ-индекс','UV index'), v: w.uv_index  != null ? `${w.uv_index}`         : '—', sub: _T("O'rtacha",'Ўртача','Умеренно','Moderate')                       },
      { ic:'👁️', l:_T("Ko'rinish",'Кўриниш','Видимость','Visibility'), v: w.visibility_km != null ? `${w.visibility_km} km`: '—', sub: _T('Aniq','Аниқ','Ясно','Clear')                               },
      { ic:'❄️', l:_T('Shabnam nuq.','Шабнам нуқ.','Точка росы','Dew point'), v: w.dew_point_c != null ? `${w.dew_point_c}°`: '—', sub: _T('Qulay','Қулай','Комфортно','Comfortable')                   },
    ];
    const batafsil = `
      <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1.3px;text-transform:uppercase;margin-bottom:8px">${_T('BATAFSIL','БАТАФСИЛ','ПОДРОБНЕЕ','DETAILS')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        ${details.map(x => `
          <div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:10px 12px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="font-size:13px">${x.ic}</span>
              <span style="font-size:8px;font-weight:700;color:rgba(232,223,200,.45);letter-spacing:.5px;text-transform:uppercase">${x.l}</span>
            </div>
            <div style="font-size:16px;font-weight:800;color:#e8dfc8;letter-spacing:-.3px;margin-bottom:2px">${x.v}</div>
            <div style="font-size:8px;color:rgba(232,223,200,.35)">${x.sub}</div>
          </div>`).join('')}
      </div>`;

    /* ── 5-day forecast (React prototype exact, inline styles only) ── */
    const forecastHtml = (w.forecast && w.forecast.length) ? `
      <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1.3px;text-transform:uppercase;margin-bottom:8px">${_T('5 KUNLIK PROGNOZ','5 КУНЛИК ПРОГНОЗ','5-ДНЕВНЫЙ ПРОГНОЗ','5-DAY FORECAST')}</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${w.forecast.map((day, i) => {
          const mn  = day.temp_min_c != null ? day.temp_min_c : 10;
          const mx  = day.temp_max_c != null ? day.temp_max_c : 26;
          const pop = day.precip_pct || 0;
          const lft = Math.max(0, ((mn - 8) / 22) * 100).toFixed(0);
          const wid = Math.min(100, ((mx - mn) / 22) * 100).toFixed(0);
          return `<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:9px 12px">
            <span style="font-size:11px;font-weight:700;color:${i===0?'#E8C15A':'#e8dfc8'};width:62px;flex-shrink:0">${i===0?_l('today',_lang):_esc(day.day_name||day.date||'')}</span>
            ${_weatherSvg(14, 20)}
            <span style="font-size:9px;color:#5b9bd5;font-weight:600;width:34px;text-align:center;visibility:${pop>0?'visible':'hidden'}">${pop}%</span>
            <div style="flex:1;display:flex;align-items:center;gap:6px;justify-content:flex-end">
              <span style="font-size:11px;color:rgba(232,223,200,.55);font-weight:600">${mn}°</span>
              <div style="width:46px;height:3px;border-radius:2px;background:rgba(255,255,255,.08);position:relative;overflow:hidden">
                <div style="position:absolute;left:${lft}%;width:${wid}%;height:100%;background:linear-gradient(90deg,#5b9bd5,#E8C15A);border-radius:2px"></div>
              </div>
              <span style="font-size:11px;color:#e8dfc8;font-weight:800">${mx}°</span>
            </div>
          </div>`;
        }).join('')}
      </div>` : '';

    return heroHtml + sunArc + hourlyHtml + batafsil + forecastHtml + `
      <div style="margin-top:12px;background:rgba(79,207,160,.07);border:1px solid rgba(79,207,160,.2);border-radius:12px;padding:10px 12px">
        <div style="font-size:9px;font-weight:700;color:#4fcfa0;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:5px">${_T("NAMOZGA TA'SIR","НАМОЗГА ТА'СИР","ВЛИЯНИЕ НА НАМАЗ",'EFFECT ON PRAYER')}</div>
        <div style="font-size:11px;color:#4fcfa0;font-weight:600">✓ ${_T('Ob-havo qulay — masjidga borish uchun yaxshi sharoit','Об-ҳаво қулай — масжидга бориш учун яхши шароит','Погода благоприятна — хорошие условия для мечети','Weather is favorable — good conditions for the mosque')}</div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     AQI TAB — circular gauge, mini grids, 24h trend, recommendations
  ══════════════════════════════════════════════════════════════ */
  function _buildAqiTab() {
    const a = _data.aqi;
    if (!a) {
      setTimeout(function() {
        if (_data && !_data.aqi && _lat && _lon) {
          var el = document.getElementById('prayer-aqi-loading');
          if (el) el.textContent = _T('Yuklanmoqda…','Юкланмоқда…','Загрузка…','Loading…');
          _fetchPrayerTimes(_lat, _lon);
        }
      }, 2000);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px;text-align:center">
          <div style="width:44px;height:44px;border:3px solid rgba(91,155,213,.15);border-top-color:#5b9bd5;border-radius:50%;animation:spin 1s linear infinite"></div>
          <div id="prayer-aqi-loading" style="font-size:13px;color:rgba(232,223,200,.5)">${_T('Havo sifati yuklanmoqda…','Ҳаво сифати юкланмоқда…','Качество воздуха загружается…','Air quality loading…')}</div>
          <button onclick="(function(){var b=document.getElementById('prayer-aqi-btn');if(b)b.disabled=true;PrayerScreen._retryWeather&&PrayerScreen._retryWeather();})()" id="prayer-aqi-btn"
            style="background:rgba(91,155,213,.12);border:1px solid rgba(91,155,213,.25);border-radius:12px;color:#5b9bd5;font-size:12px;font-weight:700;padding:8px 20px;cursor:pointer;margin-top:4px">
            ${_l('refresh',_lang)}
          </button>
        </div>`
      ;
    }

    const aqiVal    = a.aqi || 0;
    const lvl       = _getAqiLevel(aqiVal);
    const circ      = 2 * Math.PI * 44;
    const dash      = (Math.min(aqiVal, 200) / 200 * circ).toFixed(1);
    const needlePct = Math.min((aqiVal / 200) * 100, 98).toFixed(1);
    const now       = new Date();
    const nowH      = now.getHours();
    const nowStr    = `${String(nowH).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    /* ── Hero gauge (React prototype exact, all inline styles) ── */
    const heroGauge = `
      <div style="background:${lvl.color}14;border:1px solid ${lvl.color}30;border-radius:18px;padding:16px;margin-bottom:10px;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${lvl.color},transparent)"></div>
        <div style="display:flex;align-items:center;gap:16px">
          <div style="position:relative;width:104px;height:104px;flex-shrink:0">
            <svg width="104" height="104" style="transform:rotate(-90deg)">
              <defs>
                <linearGradient id="aqiArcG" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#4fcfa0"/>
                  <stop offset="35%" stop-color="#a3e635"/>
                  <stop offset="60%" stop-color="#f59e0b"/>
                  <stop offset="80%" stop-color="#e05555"/>
                  <stop offset="100%" stop-color="#c084fc"/>
                </linearGradient>
              </defs>
              <circle cx="52" cy="52" r="44" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="9"/>
              <circle cx="52" cy="52" r="44" fill="none" stroke="url(#aqiArcG)" stroke-width="9"
                stroke-linecap="round" stroke-dasharray="${dash} ${circ.toFixed(1)}"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div style="font-size:32px;font-weight:800;color:${lvl.color};letter-spacing:-1px;line-height:1">${aqiVal}</div>
              <div style="font-size:8px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1px;text-transform:uppercase;margin-top:2px">AQI</div>
            </div>
          </div>
          <div style="flex:1">
            <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px">${_T('HAVO SIFATI','ҲАВО СИФАТИ','КАЧЕСТВО ВОЗДУХА','AIR QUALITY')}</div>
            <div style="font-size:18px;font-weight:800;color:${lvl.color};letter-spacing:-.3px;margin-bottom:6px">${_aqiLabel(lvl)}</div>
            <div style="font-size:10px;color:rgba(232,223,200,.55);line-height:1.6">📍 ${_esc(_data.city || '')}<br>${_T('Yangilandi','Янгиланди','Обновлено','Updated')}: ${nowStr}</div>
          </div>
        </div>
        <div style="margin-top:14px">
          <div style="height:6px;border-radius:3px;overflow:hidden;background:linear-gradient(90deg,#4fcfa0,#a3e635,#f59e0b,#e05555,#c084fc);position:relative">
            <div style="position:absolute;top:-2px;left:${needlePct}%;width:2px;height:10px;background:#fff;border-radius:1px;transform:translateX(-50%)"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            ${['0','50','100','150','200+'].map(l=>`<span style="font-size:7px;color:rgba(232,223,200,.28)">${l}</span>`).join('')}
          </div>
        </div>
      </div>`;

    /* ── Mini pollutant gauges ── */
    const c2 = 2 * Math.PI * 16;
    const pollutants6 = [
      { k:'PM2.5', v:a.pm2_5, max:75,  desc:_T('Mayda zarra','Майда зарра','Мелкие частицы','Fine particles')     },
      { k:'PM10',  v:a.pm10,  max:150, desc:_T('Yirik zarra','Йирик зарра','Крупные частицы','Coarse particles')    },
      { k:'NO₂',   v:a.no2,   max:200, desc:_T('Azot dioksid','Азот диоксид','Диоксид азота','Nitrogen dioxide')   },
      { k:'O₃',    v:a.ozone, max:180, desc:_T('Ozon','Озон','Озон','Ozone')                              },
      { k:'SO₂',   v:a.so2,   max:350, desc:_T('Oltingugurt','Олтингугурт','Диоксид серы','Sulfur dioxide')       },
      { k:'CO',    v:a.co,    max:9,   desc:_T('Uglerod oks.','Углерод окс.','Монооксид CO','Carbon monoxide')     },
    ];
    const miniHtml = pollutants6.map(p => {
      if (p.v == null) return `
        <div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:10px 8px;text-align:center">
          <div style="position:relative;width:40px;height:40px;margin:0 auto 6px;opacity:.25">
            <svg width="40" height="40" style="transform:rotate(-90deg)"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3.5"/></svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(232,223,200,.3)">—</div>
          </div>
          <div style="font-size:10px;font-weight:700;color:#e8dfc8">${p.k}</div>
          <div style="font-size:7px;color:rgba(232,223,200,.28);margin-top:1px">${p.desc}</div>
        </div>`;
      const pct = Math.min((p.v / p.max) * 100, 100);
      const c   = pct<30?'#4fcfa0':pct<60?'#a3e635':pct<80?'#f59e0b':'#e05555';
      return `
        <div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:10px 8px;text-align:center">
          <div style="position:relative;width:40px;height:40px;margin:0 auto 6px">
            <svg width="40" height="40" style="transform:rotate(-90deg)">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3.5"/>
              <circle cx="20" cy="20" r="16" fill="none" stroke="${c}" stroke-width="3.5"
                stroke-linecap="round" stroke-dasharray="${(pct/100*c2).toFixed(1)} ${c2.toFixed(1)}"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${c}">${p.v}</div>
          </div>
          <div style="font-size:10px;font-weight:700;color:#e8dfc8">${p.k}</div>
          <div style="font-size:7px;color:rgba(232,223,200,.28);margin-top:1px">${p.desc}</div>
        </div>`;
    }).join('');

    /* ── 24h trend bars (React prototype — bordered container) ── */
    const trendVals = (a.hourly && a.hourly.length === 24)
      ? a.hourly.map(h => h.aqi || aqiVal)
      : Array.from({length:24}, (_, i) => Math.round(aqiVal + Math.sin(i/2.8)*Math.min(aqiVal*0.3,15)));
    const trendBarsHtml = trendVals.map((v, i) => {
      const c = v<50?'#4fcfa0':v<100?'#a3e635':v<150?'#f59e0b':'#e05555';
      const h = Math.max(3, Math.round((v/120)*54));
      return `<div style="flex:1;height:${h}px;background:${i===nowH?'#E8C15A':c};opacity:${i===nowH?1:.55};border-radius:2px;align-self:flex-end"></div>`;
    }).join('');

    /* ── Health recommendations ── */
    const recs = [
      {ic:'🏃', t:_T('Tashqi faoliyat','Ташқи фаолият','Активности на улице','Outdoor activity'), v: lvl.safe?_T("Xavfsiz — erkin shug'ullaning","Хавфсиз — эркин шуғулланинг",'Безопасно — занимайтесь свободно','Safe — feel free to exercise'):_T("Ehtiyot bo'ling","Эҳтиёт бўлинг","Будьте осторожны",'Be cautious')},
      {ic:'🕌', t:_T('Masjidga borish','Масжидга бориш','Посещение мечети','Going to mosque'), v: lvl.safe?_T("To'siqsiz — havo toza","Тўсиқсиз — ҳаво тоза",'Свободно — воздух чистый','Free — air is clean'):_T("Imkon bo'lsa uyda o'qing","Имкон бўлса уйда ўқинг",'При возможности молитесь дома','Pray at home if possible')},
      {ic:'🪟', t:_T('Deraza ochish','Дераза очиш','Открыть окна','Open windows'),    v: lvl.safe?_T('Tavsiya etiladi','Тавсия этилади','Рекомендуется','Recommended'):_T('Tavsiya etilmaydi','Тавсия этилмайди','Не рекомендуется','Not recommended')},
      {ic:'😷', t:_T('Sezgir guruhlar','Сезгир гуруҳлар','Чувствительные группы','Sensitive groups'), v: lvl.safe?_T('Maxsus ehtiyot shart emas','Махсус эҳтиёт шарт эмас','Особых мер не требуется','No special precautions needed'):_T("Ehtiyot bo'lish kerak","Эҳтиёт бўлиш керак","Следует быть осторожным",'Should be cautious')},
    ];

    return heroGauge + `
      <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1.3px;text-transform:uppercase;margin-bottom:8px">${_T('ZARRACHALAR VA GAZLAR','ЗАРРАЧАЛАР ВА ГАЗЛАР','ЧАСТИЦЫ И ГАЗЫ','PARTICLES AND GASES')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:14px">${miniHtml}</div>

      <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1.3px;text-transform:uppercase;margin-bottom:8px">${_T("24 SOATLIK O'ZGARISH","24 СОАТЛИК ЎЗГАРИШ","24-ЧАСОВАЯ ДИНАМИКА",'24-HOUR TREND')}</div>
      <div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:12px 12px 8px;margin-bottom:14px">
        <div style="display:flex;align-items:flex-end;gap:4px;height:54px">${trendBarsHtml}</div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          ${['00:00','06:00','12:00','18:00', _l('now',_lang)].map(l=>`<span style="font-size:7px;color:rgba(232,223,200,.28)">${l}</span>`).join('')}
        </div>
      </div>

      <div style="font-size:9px;font-weight:700;color:rgba(232,223,200,.28);letter-spacing:1.3px;text-transform:uppercase;margin-bottom:8px">${_T("SOG'LIQ TAVSIYALARI","СОҒЛИҚ ТАВСИЯЛАРИ","РЕКОМЕНДАЦИИ ДЛЯ ЗДОРОВЬЯ",'HEALTH RECOMMENDATIONS')}</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
        ${recs.map(x=>`
          <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:9px 12px">
            <span style="font-size:16px">${x.ic}</span>
            <span style="flex:1;font-size:11px;font-weight:600;color:#e8dfc8">${x.t}</span>
            <span style="font-size:10px;font-weight:700;color:${lvl.safe?'#4fcfa0':lvl.color};text-align:right;max-width:130px;line-height:1.35">${x.v}</span>
          </div>`).join('')}
      </div>

      <div style="background:${lvl.safe?'rgba(232,193,90,.07)':lvl.color+'0d'};border:1px solid ${lvl.safe?'rgba(232,193,90,.2)':lvl.color+'33'};border-radius:12px;padding:10px 12px">
        <div style="font-size:9px;font-weight:700;color:${lvl.safe?'#E8C15A':lvl.color};letter-spacing:1.2px;text-transform:uppercase;margin-bottom:5px">${_T("NAMOZGA TA'SIR","НАМОЗГА ТА'СИР","ВЛИЯНИЕ НА НАМАЗ",'EFFECT ON PRAYER')}</div>
        <div style="font-size:11px;font-weight:600;color:${lvl.safe?'#4fcfa0':lvl.color}">
          ${lvl.safe?`✓ ${_T("Havo toza — masjidga borishga to'sqinlik yo'q","Ҳаво тоза — масжидга боришга тўсқинлик йўқ","Воздух чистый — посещение мечети не ограничено","Air is clean — no restriction on mosque visit")}`:`⚠ ${_T("Havo ifloslanishi yuqori — ehtiyot bo'ling","Ҳаво ифлосланиши юқори — эҳтиёт бўлинг","Высокое загрязнение — соблюдайте осторожность",'High pollution — take precautions')}`}
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     SOZLAMA TAB — info + notification toggles + timing
  ══════════════════════════════════════════════════════════════ */
  function _buildSozlamaTab() {
    const d    = _data;
    const city = d.city ? `${d.city}, ${d.country}` : (d.country || '—');
    const flag = d.country_code ? _countryFlag(d.country_code) : '';
    const greg = `${d.gregorian.day} ${d.gregorian.month} ${d.gregorian.year}`;
    const hij  = d.hijri.full;
    const meth = d.method || '—';

    const prefs = _getNotifPrefs();
    const toggles = [
      { k:'push',    l:_T('Push bildirishnoma','Push билдиришнома','Push-уведомления','Push notifications'),   sub:_T('Har namoz vaqtida eslatma','Ҳар намоз вақтида эслатма','Напоминание при каждом намазе','Reminder for each prayer') },
      { k:'offline', l:_T('Offline ishlash','Offline ишлаш','Работа офлайн','Offline mode'),             sub:_T('Internetsiz namoz vaqtlari','Интернетсиз намоз вақтлари','Время намаза без интернета','Prayer times without internet') },
      { k:'aqi_warn',l:_T('AQI ogohlantirish','AQI огоҳлантириш','Предупреждение AQI','AQI alert'),  sub:_T("AQI > 100 da xabar berish","AQI > 100 да хабар бериш","Уведомление при AQI > 100",'Notify when AQI > 100') },
    ];

    const prayers = (_data.prayers || []).filter(p => p.key !== 'sunrise');

    return `
      <div class="pm-section-lbl">${_T('JOYLASHUV VA SANA','ЖОЙЛАШУВ ВА САНА','МЕСТОПОЛОЖЕНИЕ И ДАТА','LOCATION AND DATE')}</div>
      <div class="pm-info-block">
        <div class="pm-info-row"><span class="pm-info-icon">${flag || '📍'}</span><span class="pm-info-val">${_esc(city)}</span></div>
        <div class="pm-info-row"><span class="pm-info-icon">🕌</span><span class="pm-info-val">${_esc(meth)}</span></div>
        <div class="pm-info-row"><span class="pm-info-icon">📅</span><span class="pm-info-val">${_esc(greg)}</span></div>
        <div class="pm-info-row"><span class="pm-info-icon">🗓</span><span class="pm-info-val">${_esc(hij)}</span></div>
      </div>

      <div class="pm-section-lbl" style="margin-top:14px">${_T('BILDIRISHNOMALAR','БИЛДИРИШНОМАЛАР','УВЕДОМЛЕНИЯ','NOTIFICATIONS')}</div>
      <div class="pm-notif-list">
        ${toggles.map(tog => {
          const on = !!prefs[tog.k];
          return `
            <div class="pm-toggle-row">
              <div class="pm-toggle-info">
                <div class="pm-toggle-label">${tog.l}</div>
                <div class="pm-toggle-sub">${tog.sub}</div>
              </div>
              <div class="pm-toggle${on ? ' pm-toggle--on' : ''}" data-pref="${tog.k}">
                <div class="pm-toggle-knob"></div>
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="pm-section-lbl" style="margin-top:14px">${_T('ESLATMA VAQTI (daqiqa oldin)','ЭСЛАТМА ВАҚТИ (дақиқа олдин)','НАПОМИНАНИЕ ЗА (минут)','REMINDER (minutes before)')}</div>
      <div class="pm-timing-list">
        ${prayers.map(p => {
          const cur = String(_getTimingPref(p.key));
          return `
            <div class="pm-timing-row">
              <span class="pm-timing-name">${_esc(p.name)}</span>
              <div class="pm-timing-btns">
                ${['-30','-15','-10','0'].map(v => {
                  const lbl = v === '0'
                    ? _T("Vaqtida","Вақтида","Вовремя","On time")
                    : `${Math.abs(parseInt(v))} ${_T('daqiqa','дақиқа','мин','min')}`;
                  return `<button class="pm-timing-btn${cur === v ? ' pm-timing-btn--on' : ''}"
                                  data-pkey="${p.key}" data-val="${v}">${lbl}</button>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="pm-action-row" style="margin-top:16px">
        <button class="pm-action-btn" id="p-btn-refresh">${_l('refresh', _lang)}</button>
        <button class="pm-action-btn pm-action-btn--sec" id="p-btn-changeloc">${_l('changeLoc', _lang)}</button>
      </div>`;
  }

  /* Save notification preferences to server so the scheduler can deliver them */
  async function _syncNotifPrefsToServer(enabled) {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;
    if (!userId) return;
    const prefs   = _getNotifPrefs();
    const timing  = {};
    ['fajr','dhuhr','asr','maghrib','isha'].forEach(k => {
      timing[k] = parseInt(_getTimingPref(k) || '0');
    });
    const tzOffset = -(new Date().getTimezoneOffset()); // minutes east of UTC
    try {
      await fetch('/api/user/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:   userId,
          enabled:   enabled ? 1 : 0,
          timing,
          tz_offset: tzOffset,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (_e) {}
  }

  function _bindSozlama(el) {
    el.querySelector('#p-btn-refresh')?.addEventListener('click', _onRefresh);
    el.querySelector('#p-btn-changeloc')?.addEventListener('click', _onChangeLoc);

    el.querySelectorAll('.pm-toggle').forEach(tog => {
      tog.addEventListener('click', () => {
        const k  = tog.dataset.pref;
        const on = tog.classList.toggle('pm-toggle--on');
        _setNotifPref(k, on);
        if (k === 'push') _syncNotifPrefsToServer(on);  /* register/unregister with server */
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    el.querySelectorAll('.pm-timing-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pkey = btn.dataset.pkey;
        const val  = btn.dataset.val;
        _setNotifPref('timing_' + pkey, val);
        el.querySelectorAll(`.pm-timing-btn[data-pkey="${pkey}"]`).forEach(b => {
          b.classList.toggle('pm-timing-btn--on', b.dataset.val === val);
        });
        /* Sync timing changes to server if push is already enabled */
        if (_getNotifPrefs().push) _syncNotifPrefsToServer(true);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
  }

  /* ── Ayah / Hadith cards ────────────────────────────────────── */
  function _buildAyahCard() {
    const ay = _data.daily_ayah;
    return `
      <div class="pm-card pm-card--gold">
        <div class="pm-card-label"><span class="pm-card-dot pm-card-dot--gold"></span>${_l('dailyAyah', _lang)}</div>
        <div class="pm-ayah-ar" dir="rtl">${_esc(ay.arabic)}</div>
        <div class="pm-ayah-tr">${_esc(ay.translation)}</div>
        <div class="pm-ayah-ref">— ${_esc(ay.reference)}</div>
      </div>`;
  }

  function _buildHadithCard() {
    const h = _data.daily_hadith;
    return `
      <div class="pm-card pm-card--green">
        <div class="pm-card-label"><span class="pm-card-dot pm-card-dot--green"></span>${_l('dailyHadith', _lang)}</div>
        <div class="pm-hadith-text">"${_esc(h.text)}"</div>
        <div class="pm-hadith-narrator">${_esc(h.narrator)}</div>
        <div class="pm-hadith-source">${_esc(h.source)}</div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     COUNTDOWN — natural language format
  ══════════════════════════════════════════════════════════════ */
  function _formatRemaining(secs) {
    if (secs <= 0) return _l('allDone', _lang);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h} ${_l('hours', _lang)} ${m} ${_l('minutes', _lang)} ${_l('remaining', _lang)}`;
    if (m > 0) return `${m} ${_l('minutes', _lang)} ${s} ${_l('seconds', _lang)} ${_l('remaining', _lang)}`;
    return `${s} ${_l('seconds', _lang)} ${_l('remaining', _lang)}`;
  }

  function _startCountdown(initialSec) {
    let rem = initialSec;
    function tick() {
      const el = document.getElementById('pm-countdown');
      if (!el) { _stopCountdown(); return; }
      if (rem <= 0) {
        el.textContent = _l('allDone', _lang);
        _stopCountdown();
        setTimeout(() => { if (_lat && _lon) { _showLoading(); _fetchPrayerTimes(_lat, _lon); } }, 2000);
        return;
      }
      el.textContent = _formatRemaining(rem);
      rem--;
    }
    tick();
    _countdownId = setInterval(tick, 1000);
  }

  function _stopCountdown() {
    if (_countdownId !== null) { clearInterval(_countdownId); _countdownId = null; }
  }

  /* ── Navigation ─────────────────────────────────────────────── */
  function _goBack() {
    _stopCountdown();
    window.App.navigate('screen-dashboard');
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  /* ── Utilities ──────────────────────────────────────────────── */
  function _esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _countryFlag(cc) {
    if (!cc || cc.length !== 2) return '';
    return [...cc.toUpperCase()].map(c =>
      String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
    ).join('');
  }

  function _retryWeather() {
    if (_lat !== null && _lon !== null) {
      _showLoading();
      _fetchPrayerTimes(_lat, _lon);
    }
  }

  return { render, load, _retryWeather };
})();
