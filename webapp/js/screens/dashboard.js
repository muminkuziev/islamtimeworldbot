/* ═══════════════════════════════════════════════════════════════
   Dashboard Screen — Navy+Gold UI v2
   ✅ Brand + Gregorian(Uz) + Hijri(Ar) dates
   ✅ Pulsing city badge from GPS
   ✅ Next prayer card with live countdown + progress bar
   ✅ 2-column grid, 10 tiles with icon + i18n title + subtitle
   ✅ Language button preserved
   ✅ All 10 module navigation preserved
   ═══════════════════════════════════════════════════════════════ */

const DashboardScreen = (function () {

  /* ── Calendar data ── */
  const DAYS_UZ  = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
  const DAYS_CYR = ['Якшанба','Душанба','Сешанба','Чоршанба','Пайшанба','Жума','Шанба'];
  const MONTHS_UZ  = ['Yanvar','Fevral','Mart','Aprel','May','Iyun',
                      'Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
  const MONTHS_CYR = ['Январ','Феврал','Март','Апрел','Май','Июн',
                      'Июл','Август','Сентябр','Октябр','Ноябр','Декабр'];
  const DAYS_RU   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                     'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const HIJRI_MONTHS_AR = [
    'محرم','صفر','ربيع الأول','ربيع الآخر',
    'جمادى الأولى','جمادى الآخرة','رجب','شعبان',
    'رمضان','شوال','ذو القعدة','ذو الحجة',
  ];

  /* ── Module definitions ── */
  const MODULES = [
    { key:'prayer',   sub:'5 vaqt · Ob-havo · AQI',         sub_cyr:'5 вақт · Об-ҳаво · AQI',       sub_ru:'5 намазов · Погода · AQI',            sub_en:'5 Prayers · Weather · AQI'           },
    { key:'qibla',    sub:"Kompas · Ka'ba masofasi",         sub_cyr:'Компас · Каъба масофаси',       sub_ru:'Компас · Расстояние до Каабы',        sub_en:"Compass · Ka'bah Distance"           },
    { key:'mosques',  sub:"Xarita · Yo'nalish · Jadval",     sub_cyr:'Харита · Йўналиш · Жадвал',    sub_ru:'Карта · Маршрут · Расписание',        sub_en:'Map · Directions · Schedule'         },
    { key:'quran',    sub:'114 sura · Audio · Qori',         sub_cyr:'114 сура · Аудио · Қори',       sub_ru:'114 сур · Аудио · Чтец',             sub_en:'114 Surahs · Audio · Reciter'        },
    { key:'hadith',   sub:'Buxoriy · Muslim · Tarjima',      sub_cyr:'Бухорий · Муслим · Таржима',    sub_ru:'Бухари · Муслим · Перевод',           sub_en:'Bukhari · Muslim · Translation'      },
    { key:'duas',     sub:'Kundalik · Mavzuli · Saqlash',    sub_cyr:'Кундалик · Мавзули · Сақлаш',  sub_ru:'Утро/Вечер · По теме · Сохранённые', sub_en:'Morning/Evening · Topics · Saved'    },
    { key:'dhikr',    sub:'Hisoblagich · Ertalab · Kechki',  sub_cyr:'Ҳисоблагич · Эрталаб · Кечки', sub_ru:'Счётчик · Утренние · Вечерние',       sub_en:'Counter · Morning · Evening'         },
    { key:'calendar', sub:'1447 · Islomiy kunlar',           sub_cyr:'1447 · Исломий кунлар',         sub_ru:'1447 · Исламские даты',              sub_en:'1447 · Islamic dates'                },
    { key:'names',    sub:'Arabcha · Tafsir · Zikr',         sub_cyr:'Арабча · Тафсир · Зикр',        sub_ru:'Арабский · Тафсир · Зикр',           sub_en:'Arabic · Tafsir · Dhikr'             },
    { key:'settings', sub:'Til · Tema · Qori · GPS',         sub_cyr:'Тил · Тема · Қори · GPS',       sub_ru:'Язык · Тема · Чтец · GPS',           sub_en:'Language · Theme · Reciter · GPS'    },
  ];

  let _el      = null;
  let _lang    = 'uz';
  let _ptTimer = null;

  /* ── Local i18n ── */
  const L = {
    nextPrayer: { uz:'KEYINGI NAMOZ',  uz_cyr:'КЕЙИНГИ НАМОЗ',  en:'NEXT PRAYER',       ru:'СЛЕДУЮЩИЙ НАМАЗ',  tr:'SONRAKİ NAMAZ',  ar:'الصلاة القادمة', kk:'КЕЛЕСІ НАМАЗ',   tg:'НАМОЗИ НАВБАТӢ',  ky:'КИЙИНКИ НАМАЗ',  de:'NÄCHSTES GEBET',           fr:'PROCHAINE PRIÈRE',           id:'SHOLAT BERIKUTNYA', hi:'अगली नमाज़',        ur:'اگلی نماز'     },
    services:   { uz:'Xizmatlar',      uz_cyr:'Хизматлар',      en:'Services',          ru:'Сервисы',          tr:'Servisler',      ar:'الخدمات',        kk:'Сервистер',      tg:'Хизматҳо',        ky:'Кызматтар',      de:'Dienste',                  fr:'Services',                   id:'Layanan',           hi:'सेवाएं',          ur:'خدمات'         },
    loading:    { uz:'Yuklanmoqda…',   uz_cyr:'Юкланмоқда…',   en:'Loading…',          ru:'Загрузка…',        tr:'Yükleniyor…',    ar:'جاري التحميل…',  kk:'Жүктелуде…',    tg:'Бор карда мешавад…',ky:'Жүктөлүүдö…',  de:'Wird geladen…',            fr:'Chargement…',                id:'Memuat…',           hi:'लोड हो रहा है…',  ur:'لوڈ ہو رہا ہے…' },
    allDone:    { uz:"Barcha namozlar o'qildi 🌙", uz_cyr:'Барча намозлар ўтди 🌙', en:'All prayers done 🌙', ru:'Все намазы прошли 🌙', tr:'Tüm namazlar bitti 🌙', ar:'انتهت الصلوات 🌙', kk:'Барлық намаздар аяқталды 🌙', tg:'Ҳамаи намозҳо гузаштанд 🌙', ky:'Бардык намаздар аяктады 🌙', de:'Alle Gebete erledigt 🌙', fr:'Toutes les prières terminées 🌙', id:'Semua sholat selesai 🌙', hi:'आज की नमाज़ें हो गईं 🌙', ur:'آج کی نمازیں ختم 🌙' },
    timeUp:     { uz:'Vaqt yetdi! 🕌', uz_cyr:'Вақт етди! 🕌',  en:'Time is up! 🕌',    ru:'Время настало! 🕌', tr:'Vakit geldi! 🕌', ar:'حان الوقت! 🕌',   kk:'Уақыт келді! 🕌', tg:'Вақт расид! 🕌',  ky:'Убакыт келди! 🕌', de:'Zeit ist da! 🕌',          fr:"C'est l'heure! 🕌",          id:'Waktunya! 🕌',      hi:'समय आ गया! 🕌',    ur:'وقت آ گیا! 🕌'  },
    hours:      { uz:'soat',           uz_cyr:'соат',           en:'h',                 ru:'ч',                tr:'s',              ar:'س',              kk:'сағ',            tg:'соат',            ky:'саат',           de:'Std',                      fr:'h',                          id:'j',                 hi:'घं',              ur:'گھ'            },
    minutes:    { uz:'daqiqa',         uz_cyr:'дақиқа',         en:'min',               ru:'мин',              tr:'dk',             ar:'د',              kk:'мин',            tg:'дақ',             ky:'мүн',            de:'Min',                      fr:'min',                        id:'mnt',               hi:'मि',              ur:'من'            },
    seconds:    { uz:'soniya',         uz_cyr:'сония',          en:'s',                 ru:'с',                tr:'sn',             ar:'ث',              kk:'с',              tg:'сон',             ky:'с',              de:'Sek',                      fr:'s',                          id:'dtk',               hi:'से',              ur:'سی'            },
    remaining:  { uz:'qoldi',          uz_cyr:'қолди',          en:'left',              ru:'осталось',         tr:'kaldı',          ar:'باقي',           kk:'қалды',          tg:'монд',            ky:'калды',          de:'noch',                     fr:'restant',                    id:'lagi',              hi:'शेष',             ur:'باقی'           },
  };
  function _l(key) {
    const d = L[key];
    return d ? (d[_lang] || d.en || '') : key;
  }

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _cleanup();
    _el = document.getElementById('screen-dashboard');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bindEvents();
    _updateDate();
    _loadCity();
    _loadPrayer();
  }

  function update(lang) {
    _lang = lang;
    render();
  }

  /* ══════════════════════════════════════════════
     HTML
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    const flag  = getLangFlag(_lang);
    const tiles = MODULES.map(mod => {
      const title = t('modules_list.' + mod.key, _lang);
      const sub   = _lang === 'uz_cyr' ? (mod.sub_cyr || mod.sub) : _lang === 'ru' ? (mod.sub_ru || mod.sub) : _lang === 'en' ? (mod.sub_en || mod.sub) : mod.sub;
      return `
        <div class="db-tile-wrap">
          <div class="db-cell" data-module="${mod.key}" role="button" tabindex="0">
            <div class="db-cell-title">${title}</div>
            <div class="db-cell-sub">${sub}</div>
          </div>
        </div>`;
    }).join('');

    return `
<div class="db-hdr">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov" style="background:rgba(9,18,31,0.65)"></div>
  <div class="db-hdr-inner">

    <div class="db-top-row">
      <div>
        <div class="db-brand">IslamTimeWorld</div>
        <div class="db-date-uz" id="db-date-uz">—</div>
        <div class="db-date-ar" id="db-date-ar">—</div>
      </div>
      <div class="db-top-right">
        <div class="db-city-badge" id="db-city-badge">
          <span class="db-city-dot"></span>
          <span class="db-city-name" id="db-city-name">GPS</span>
        </div>
        <button class="db-lang-btn" id="db-lang-btn" aria-label="Change language">
          <span>${flag}</span>
          <span>${_lang.toUpperCase()}</span>
        </button>
      </div>
    </div>

    <div class="db-divider"></div>

    <div class="db-next-wrap">
      <div class="db-next-box">
        <div class="db-next-topline"></div>
        <div class="db-next-row">
          <div>
            <div class="db-next-lbl">${_l('nextPrayer')}</div>
            <div class="db-next-name" id="db-np-name">—</div>
            <div class="db-next-remain" id="db-np-remain">${_l('loading')}</div>
          </div>
          <div style="text-align:right">
            <div class="db-next-time" id="db-np-time">—:—</div>
            <div class="db-next-sub"  id="db-np-sub">—</div>
          </div>
        </div>
        <div class="db-prog">
          <div class="db-prog-fill" id="db-prog-fill" style="width:0%"></div>
        </div>
        <div class="db-prog-labels">
          <span id="db-prog-start">—</span>
          <span id="db-prog-end">—</span>
        </div>
      </div>
    </div>

  </div>
</div>

<div class="db-body">
  <div class="db-section-lbl">${_l('services')}</div>
  <div class="db-grid">${tiles}</div>
</div>`;
  }

  /* ══════════════════════════════════════════════
     Events
  ══════════════════════════════════════════════ */
  function _bindEvents() {
    _el.querySelector('#db-lang-btn')?.addEventListener('click', () => {
      window.App.navigate('screen-language');
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });

    _el.querySelectorAll('.db-cell').forEach(card => {
      card.addEventListener('click',   () => _onModuleTap(card.dataset.module));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') _onModuleTap(card.dataset.module);
      });
    });
  }

  /* ══════════════════════════════════════════════
     Date (Gregorian + Hijri)
  ══════════════════════════════════════════════ */
  function _updateDate() {
    const uzEl = _el?.querySelector('#db-date-uz');
    const arEl = _el?.querySelector('#db-date-ar');
    if (!uzEl || !arEl) return;

    const n = new Date();
    const days   = _lang === 'uz_cyr' ? DAYS_CYR   : _lang === 'ru' ? DAYS_RU   : DAYS_UZ;
    const months = _lang === 'uz_cyr' ? MONTHS_CYR : _lang === 'ru' ? MONTHS_RU : MONTHS_UZ;
    uzEl.textContent = `${days[n.getDay()]}, ${String(n.getDate()).padStart(2,'0')} ${months[n.getMonth()]} ${n.getFullYear()}`;

    const h = _toHijri(n);
    arEl.textContent = `${_toArabicNum(h.day)} ${HIJRI_MONTHS_AR[h.month - 1]} ${_toArabicNum(h.year)}`;
  }

  function _toHijri(date) {
    const JD = Math.floor((14 + 1461*(date.getFullYear()+4800+Math.floor((date.getMonth()+1-14)/12)))/4)
      + Math.floor((367*(date.getMonth()+1-2-12*Math.floor((date.getMonth()+1-14)/12)))/12)
      - Math.floor((3*Math.floor((date.getFullYear()+4900+Math.floor((date.getMonth()+1-14)/12))/100))/4)
      + date.getDate() - 32075;
    let l = JD - 1948440 + 10632;
    const n = Math.floor((l-1)/10631);
    l = l - 10631*n + 354;
    const j = Math.floor((10985-l)/5316)*Math.floor((50*l)/17719)
      + Math.floor(l/5670)*Math.floor((43*l)/15238);
    l = l - Math.floor((30-j)/15)*Math.floor((17719*j)/50)
      - Math.floor(j/16)*Math.floor((15238*j)/43) + 29;
    const month = Math.floor((24*l)/709);
    const day   = l - Math.floor((709*month)/24);
    const year  = 30*n + j - 30;
    return { year, month, day };
  }

  function _toArabicNum(n) {
    return String(n).split('').map(d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)] ?? d).join('');
  }

  /* ══════════════════════════════════════════════
     City badge
  ══════════════════════════════════════════════ */
  function _loadCity() {
    /* 1. Mosques cache */
    try {
      const mc = JSON.parse(localStorage.getItem('islamtime_mosques_v1') || '{}');
      if (mc.city) { _setCity(mc.city); return; }
    } catch {}

    /* 2. Stored coords → Nominatim */
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    if (sLat && sLon) { _fetchCity(sLat, sLon); return; }

    /* 3. Browser geo */
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => _fetchCity(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { timeout: 5000, maximumAge: 600000 }
      );
    }
  }

  async function _fetchCity(lat, lon) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const d = await r.json();
      const a = d.address || {};
      _setCity(a.city || a.town || a.village || a.county || 'GPS');
    } catch {}
  }

  function _setCity(name) {
    const el = _el?.querySelector('#db-city-name');
    if (el) el.textContent = name;
  }

  /* ══════════════════════════════════════════════
     Prayer — next prayer card
  ══════════════════════════════════════════════ */
  function _loadPrayer() {
    const today = new Date().toISOString().slice(0, 10);
    /* cached? */
    try {
      const c = JSON.parse(localStorage.getItem('islamtime_dash_pt') || '{}');
      if (c.date === today && c.lang === _lang && c.data) { _renderPrayer(c.data); return; }
    } catch {}

    /* fetch */
    const sLat = parseFloat(localStorage.getItem('islamtime_last_lat') || '');
    const sLon = parseFloat(localStorage.getItem('islamtime_last_lon') || '');
    if (sLat && sLon) { _fetchPrayer(sLat, sLon); return; }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          localStorage.setItem('islamtime_last_lat', pos.coords.latitude);
          localStorage.setItem('islamtime_last_lon', pos.coords.longitude);
          _fetchPrayer(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { timeout: 5000, maximumAge: 300000 }
      );
    }
  }

  async function _fetchPrayer(lat, lon) {
    try {
      const r = await fetch(
        `${window.location.origin}/api/prayer-times?lat=${lat}&lon=${lon}&lang=${_lang}`
      );
      if (!r.ok) return;
      const data = await r.json();
      if (data.error) return;
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('islamtime_dash_pt', JSON.stringify({ date: today, lang: _lang, data }));
      _renderPrayer(data);
    } catch {}
  }

  function _renderPrayer(data) {
    const np      = data.next_prayer;
    const prayers = data.prayers || [];
    const first   = prayers[0];
    const last    = prayers[prayers.length - 1];
    if (!np) return;

    const pObj = prayers.find(p => p.key === np.key) || {};

    const nameEl   = _el?.querySelector('#db-np-name');
    const timeEl   = _el?.querySelector('#db-np-time');
    const remainEl = _el?.querySelector('#db-np-remain');
    const subEl    = _el?.querySelector('#db-np-sub');
    const fillEl   = _el?.querySelector('#db-prog-fill');
    const startEl  = _el?.querySelector('#db-prog-start');
    const endEl    = _el?.querySelector('#db-prog-end');
    if (!nameEl) return;

    nameEl.textContent = pObj.name || np.key;
    timeEl.textContent = np.time || '—:—';
    subEl.textContent  = data.method || pObj.name || np.key;
    if (first) startEl.textContent = `${first.name || first.key} ${first.time}`;
    if (last)  endEl.textContent   = `${last.name  || last.key}  ${last.time}`;

    /* progress bar — current time between Bomdod and Xufton */
    const _toMin = t => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; };
    const n = new Date(), now = n.getHours()*60 + n.getMinutes();
    const s = first ? _toMin(first.time) : 0, e = last ? _toMin(last.time) : 1440;
    const pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
    if (fillEl) fillEl.style.width = `${pct.toFixed(0)}%`;

    /* countdown */
    const secs = np.countdown_seconds;
    if (secs != null && secs > 0) _startCountdown(secs, remainEl);
    else remainEl.textContent = _l('allDone');
  }

  function _startCountdown(initSecs, el) {
    _cleanup();
    let secs = initSecs;
    function _tick() {
      if (!el || !document.body.contains(_el)) { clearInterval(_ptTimer); return; }
      if (secs <= 0) {
        el.textContent = _l('timeUp');
        clearInterval(_ptTimer);
        setTimeout(_loadPrayer, 60000);
        return;
      }
      const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
      el.textContent = h > 0
        ? `${h} ${_l('hours')} ${m} ${_l('minutes')} ${_l('remaining')}`
        : `${m} ${_l('minutes')} ${s} ${_l('seconds')} ${_l('remaining')}`;
      secs--;
    }
    _tick();
    _ptTimer = setInterval(_tick, 1000);
  }

  function _cleanup() {
    if (_ptTimer) { clearInterval(_ptTimer); _ptTimer = null; }
  }

  /* ══════════════════════════════════════════════
     Module navigation (all 10 preserved)
  ══════════════════════════════════════════════ */
  function _onModuleTap(key) {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    const lang = window.App?.state?.lang || 'uz';
    const MAP = {
      prayer:   () => { PrayerScreen.load(lang);   window.App.navigate('screen-prayer');   },
      qibla:    () => { QiblaScreen.load(lang);    window.App.navigate('screen-qibla');    },
      mosques:  () => { MosquesScreen.load(lang);  window.App.navigate('screen-mosques');  },
      quran:    () => { QuranScreen.load(lang);    window.App.navigate('screen-quran');    },
      hadith:   () => { HadithScreen.load(lang);   window.App.navigate('screen-hadith');   },
      duas:     () => { DuasScreen.load(lang);     window.App.navigate('screen-duas');     },
      dhikr:    () => { DhikrScreen.load(lang);    window.App.navigate('screen-dhikr');    },
      calendar: () => { CalendarScreen.load(lang); window.App.navigate('screen-calendar'); },
      names:    () => { NamesScreen.load(lang);    window.App.navigate('screen-names');    },
      settings: () => { SettingsScreen.load(lang); window.App.navigate('screen-settings'); },
    };
    (MAP[key] || (() => {}))();
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render, update };
})();
