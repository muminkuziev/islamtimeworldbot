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
  const DAYS_MAP = {
    uz:     ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'],
    uz_cyr: ['Якшанба','Душанба','Сешанба','Чоршанба','Пайшанба','Жума','Шанба'],
    ru:     ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],
    en:     ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    tr:     ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
    ar:     ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
    kk:     ['Жексенбі','Дүйсенбі','Сейсенбі','Сәрсенбі','Бейсенбі','Жұма','Сенбі'],
    tg:     ['Якшанбе','Душанбе','Сешанбе','Чоршанбе','Панҷшанбе','Ҷумъа','Шанбе'],
    ky:     ['Жекшемби','Дүйшөмбү','Шейшемби','Шаршемби','Бейшемби','Жума','Ишемби'],
    de:     ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
    fr:     ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
    id:     ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'],
    hi:     ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'],
    ur:     ['اتوار','پیر','منگل','بدھ','جمعرات','جمعہ','ہفتہ'],
  };
  const MONTHS_MAP = {
    uz:     ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'],
    uz_cyr: ['Январ','Феврал','Март','Апрел','Май','Июн','Июл','Август','Сентябр','Октябр','Ноябр','Декабр'],
    ru:     ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
    en:     ['January','February','March','April','May','June','July','August','September','October','November','December'],
    tr:     ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
    ar:     ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    kk:     ['Қаңтар','Ақпан','Наурыз','Сәуір','Мамыр','Маусым','Шілде','Тамыз','Қыркүйек','Қазан','Қараша','Желтоқсан'],
    tg:     ['Январ','Феврал','Март','Апрел','Май','Июн','Июл','Август','Сентябр','Октябр','Ноябр','Декабр'],
    ky:     ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
    de:     ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    fr:     ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    id:     ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
    hi:     ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्तूबर','नवंबर','दिसंबर'],
    ur:     ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'],
  };
  const HIJRI_MONTHS_AR = [
    'محرم','صفر','ربيع الأول','ربيع الآخر',
    'جمادى الأولى','جمادى الآخرة','رجب','شعبان',
    'رمضان','شوال','ذو القعدة','ذو الحجة',
  ];

  /* ── Module definitions ── */
  const MODULES = [
    { key:'prayer',
      sub:     '5 vaqt · Ob-havo · AQI',   sub_cyr:'5 вақт · Об-ҳаво · AQI',
      sub_ru:  '5 намазов · Погода · AQI', sub_en: '5 Prayers · Weather · AQI',
      sub_tr:  '5 Vakit · Hava · AQI',     sub_ar: '٥ صلوات · الطقس · AQI',
      sub_kk:  '5 уақыт · Ауа райы · AQI',sub_tg: '5 вақт · Ҳаво · AQI',
      sub_ky:  '5 убак · Аба ырай · AQI', sub_de: '5 Gebete · Wetter · AQI',
      sub_fr:  '5 Prières · Météo · AQI',  sub_id: '5 Waktu · Cuaca · AQI',
      sub_hi:  '५ वक़्त · मौसम · AQI',    sub_ur: '۵ نماز · موسم · AQI' },
    { key:'qibla',
      sub:     "Kompas · Ka'ba masofasi",   sub_cyr:'Компас · Каъба масофаси',
      sub_ru:  'Компас · Расстояние до Каабы', sub_en:"Compass · Ka'bah Distance",
      sub_tr:  "Pusula · Kâbe Mesafesi",   sub_ar: 'البوصلة · المسافة للكعبة',
      sub_kk:  'Компас · Кааба қашықтығы', sub_tg: 'Компас · Масофа то Каъба',
      sub_ky:  'Компас · Кааба аралыгы',  sub_de: 'Kompass · Kaaba-Entfernung',
      sub_fr:  "Boussole · Distance Kaaba",sub_id: "Kompas · Jarak Ka'bah",
      sub_hi:  'कम्पास · काबा दूरी',       sub_ur: 'کمپاس · کعبہ فاصلہ' },
    { key:'mosques',
      sub:     "Xarita · Yo'nalish · Jadval", sub_cyr:'Харита · Йўналиш · Жадвал',
      sub_ru:  'Карта · Маршрут · Расписание',sub_en:'Map · Directions · Schedule',
      sub_tr:  'Harita · Yön · Program',   sub_ar: 'الخريطة · الاتجاه · الجدول',
      sub_kk:  'Карта · Бағыт · Кесте',   sub_tg: 'Харита · Самт · Ҷадвал',
      sub_ky:  'Карта · Багыт · Жадвал',  sub_de: 'Karte · Richtung · Zeitplan',
      sub_fr:  'Carte · Itinéraire · Horaires',sub_id:'Peta · Arah · Jadwal',
      sub_hi:  'नक्शा · दिशा · समय',       sub_ur: 'نقشہ · سمت · شیڈول' },
    { key:'quran',
      sub:     '114 sura · Audio · Qori',  sub_cyr:'114 сура · Аудио · Қори',
      sub_ru:  '114 сур · Аудио · Чтец',  sub_en: '114 Surahs · Audio · Reciter',
      sub_tr:  '114 Sure · Ses · Kâri',   sub_ar: '١١٤ سورة · صوت · القارئ',
      sub_kk:  '114 сүре · Аудио · Қари', sub_tg: '114 сура · Аудио · Қори',
      sub_ky:  '114 сура · Аудио · Қори', sub_de: '114 Suren · Audio · Rezitator',
      sub_fr:  '114 Sourates · Audio · Récitant',sub_id:'114 Surah · Audio · Qari',
      sub_hi:  '११४ सूरत · ऑडियो · क़ारी', sub_ur: '۱۱۴ سورتیں · آڈیو · قاری' },
    { key:'hadith',
      sub:     'Buxoriy · Muslim · Tarjima', sub_cyr:'Бухорий · Муслим · Таржима',
      sub_ru:  'Бухари · Муслим · Перевод', sub_en:'Bukhari · Muslim · Translation',
      sub_tr:  'Buhari · Müslim · Tercüme', sub_ar: 'البخاري · مسلم · الترجمة',
      sub_kk:  'Бухари · Муслим · Аударма', sub_tg: 'Бухорӣ · Муслим · Тарҷума',
      sub_ky:  'Бухарий · Муслим · Котормо',sub_de: 'Bukhari · Muslim · Übersetzung',
      sub_fr:  'Boukhari · Muslim · Trad.', sub_id: 'Bukhari · Muslim · Terjemahan',
      sub_hi:  'बुखारी · मुस्लिम · अनुवाद',  sub_ur: 'بخاری · مسلم · ترجمہ' },
    { key:'duas',
      sub:     'Kundalik · Mavzuli · Saqlash', sub_cyr:'Кундалик · Мавзули · Сақлаш',
      sub_ru:  'Утро/Вечер · По теме · Сохранённые',sub_en:'Morning/Evening · Topics · Saved',
      sub_tr:  'Sabah/Akşam · Konular · Kayıtlı',sub_ar:'الصباح/المساء · مواضيع · محفوظة',
      sub_kk:  'Таңертең/Кеш · Тақырып · Сақталған',sub_tg:'Субҳ/Шом · Мавзуҳо · Захира',
      sub_ky:  'Эртең/Кеч · Темалар · Сакталган',sub_de:'Morgen/Abend · Themen · Gespeichert',
      sub_fr:  'Matin/Soir · Thèmes · Sauvegardées',sub_id:'Pagi/Sore · Topik · Tersimpan',
      sub_hi:  'सुबह/शाम · विषय · सहेजे गए',  sub_ur: 'صبح/شام · موضوع · محفوظ' },
    { key:'dhikr',
      sub:     'Hisoblagich · Ertalab · Kechki', sub_cyr:'Ҳисоблагич · Эрталаб · Кечки',
      sub_ru:  'Счётчик · Утренние · Вечерние', sub_en:'Counter · Morning · Evening',
      sub_tr:  'Sayaç · Sabah · Akşam',      sub_ar: 'العداد · الصباح · المساء',
      sub_kk:  'Есептегіш · Таңертең · Кеш', sub_tg: 'Ҳисобкунак · Субҳ · Шом',
      sub_ky:  'Эсептегич · Эртең · Кеч',   sub_de: 'Zähler · Morgen · Abend',
      sub_fr:  'Compteur · Matin · Soir',    sub_id: 'Penghitung · Pagi · Sore',
      sub_hi:  'काउंटर · सुबह · शाम',         sub_ur: 'کاؤنٹر · صبح · شام' },
    { key:'calendar',
      sub:     '1447 · Islomiy kunlar',     sub_cyr:'1447 · Исломий кунлар',
      sub_ru:  '1447 · Исламские даты',    sub_en: '1447 · Islamic dates',
      sub_tr:  '1447 · İslam Takvimi',     sub_ar: '١٤٤٧ · التقويم الهجري',
      sub_kk:  '1447 · Ислам мерзімдері', sub_tg: '1447 · Санаҳои исломӣ',
      sub_ky:  '1447 · Ислам күндөрү',    sub_de: '1447 · Islamische Daten',
      sub_fr:  '1447 · Dates islamiques',  sub_id: '1447 · Kalender Islam',
      sub_hi:  '१४४७ · इस्लामी तिथियाँ',   sub_ur: '۱۴۴۷ · اسلامی تاریخیں' },
    { key:'names',
      sub:     'Arabcha · Tafsir · Zikr',  sub_cyr:'Арабча · Тафсир · Зикр',
      sub_ru:  'Арабский · Тафсир · Зикр', sub_en: 'Arabic · Tafsir · Dhikr',
      sub_tr:  'Arapça · Tefsir · Zikir',  sub_ar: 'العربية · التفسير · الذكر',
      sub_kk:  'Арабша · Тафсир · Зікір', sub_tg: 'Арабӣ · Тафсир · Зикр',
      sub_ky:  'Арабча · Тафсир · Зикр',  sub_de: 'Arabisch · Tafsir · Dhikr',
      sub_fr:  'Arabe · Tafsir · Dhikr',  sub_id: 'Arab · Tafsir · Dzikir',
      sub_hi:  'अरबी · तफ़सीर · ज़िक्र',    sub_ur: 'عربی · تفسیر · ذکر' },
    { key:'settings',
      sub:     'Til · Tema · Qori · GPS',  sub_cyr:'Тил · Тема · Қори · GPS',
      sub_ru:  'Язык · Тема · Чтец · GPS', sub_en: 'Language · Theme · Reciter · GPS',
      sub_tr:  'Dil · Tema · Kâri · GPS',  sub_ar: 'اللغة · المظهر · القارئ · GPS',
      sub_kk:  'Тіл · Тема · Қари · GPS', sub_tg: 'Забон · Тема · Қори · GPS',
      sub_ky:  'Тил · Тема · Қори · GPS', sub_de: 'Sprache · Thema · Rezitator · GPS',
      sub_fr:  'Langue · Thème · Récitant · GPS',sub_id:'Bahasa · Tema · Qari · GPS',
      sub_hi:  'भाषा · थीम · क़ारी · GPS',   sub_ur: 'زبان · تھیم · قاری · GPS' },
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
      const sub   = mod['sub_' + _lang] || (_lang === 'uz_cyr' ? mod.sub_cyr : null) || mod['sub_' + _lang.split('_')[0]] || mod.sub_en || mod.sub;
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
    const days   = DAYS_MAP[_lang]   || DAYS_MAP.en;
    const months = MONTHS_MAP[_lang] || MONTHS_MAP.en;
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
    /* 1. Per-language mosque cache (correct key: islamtime_mosques_${lang}_v2) */
    try {
      const mc = JSON.parse(localStorage.getItem('islamtime_mosques_' + _lang + '_v2') || 'null');
      if (mc && mc.city) { _setCity(mc.city); return; }
    } catch {}

    /* 2. Stored coords → Nominatim (language-aware) */
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
    /* Language-specific Accept-Language so Nominatim returns names in the right script */
    const acceptLang = (_lang === 'ru' || _lang === 'uz_cyr') ? 'ru,en'
                     : _lang === 'ar'                         ? 'ar,en'
                     : _lang === 'en'                         ? 'en'
                     : _lang === 'tr'                         ? 'tr,en'
                     : _lang === 'de'                         ? 'de,en'
                     : _lang === 'fr'                         ? 'fr,en'
                     :                                          'uz,en';
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { 'Accept-Language': acceptLang } }
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

  /* Recalculate which prayer is next using the CURRENT time (not cached countdown).
     Called every render so the card is never stale even when loaded from cache. */
  function _recalcNextPrayer(data) {
    const prayers = (data.prayers || []).filter(p => p.key !== 'sunrise');
    const now     = new Date();
    const nowMin  = now.getHours() * 60 + now.getMinutes();
    const nowSec  = now.getSeconds();
    for (const p of prayers) {
      if (!p.time || !p.time.includes(':')) continue;
      const [h, m]  = p.time.split(':').map(Number);
      const pMin    = h * 60 + m;
      if (pMin > nowMin) {
        return { key: p.key, time: p.time, countdown_seconds: Math.max(0, (pMin - nowMin) * 60 - nowSec) };
      }
    }
    return null;  // all prayers done for today
  }

  function _loadPrayer() {
    const today = new Date().toISOString().slice(0, 10);
    /* Use cached prayer TIMES (valid all day) but always recalc next_prayer with current time */
    try {
      const c = JSON.parse(localStorage.getItem('islamtime_dash_pt') || '{}');
      if (c.date === today && c.lang === _lang && c.data) {
        _renderPrayer({ ...c.data, next_prayer: _recalcNextPrayer(c.data) });
        return;
      }
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
      _renderPrayer({ ...data, next_prayer: _recalcNextPrayer(data) });
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
