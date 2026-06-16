/* ═══════════════════════════════════════════════════════════════
   Settings Screen — master / detail pattern
   Main: 8 category cards
   Each card opens its own sub-screen (no full-screen navigate)
   ═══════════════════════════════════════════════════════════════ */

const SettingsScreen = (function () {

  const PRAYER_METHODS = [
    { id:3,  n:'Muslim World League'        },
    { id:4,  n:'Umm al-Qura, Makkah'        },
    { id:1,  n:'Karachi University (UISK)'  },
    { id:2,  n:'ISNA (Shimoliy Amerika)'    },
    { id:13, n:'Diyanet (Turkiya)'          },
    { id:14, n:'UOIF (Fransiya)'            },
    { id:12, n:'JAKIM (Malayziya)'          },
    { id:11, n:'Majlis Ugama (Singapur)'    },
    { id:5,  n:'Egyptian General Authority' },
  ];

  const MAZHABLAR = [
    { k:'hanafi',  l:'Hanafiy',  lc:'Ҳанафий',  lr:'Ханафи',   le:'Hanafi'   },
    { k:'maliki',  l:'Molikiy',  lc:'Моликий',  lr:'Маликиты', le:'Maliki'   },
    { k:'shafii',  l:'Shofeiy',  lc:'Шофеий',   lr:'Шафии',    le:"Shafi'i"  },
    { k:'hanbali', l:'Hanbaliy', lc:'Ҳанбалий', lr:'Ханбали',  le:'Hanbali'  },
  ];
  function _mzLabel(mz) {
    if (!mz) return '';
    const e = I18N['settings_' + mz.k];
    if (e && e[_lang]) return e[_lang];
    if (_lang === 'uz_cyr') return mz.lc || mz.l;
    if (_lang === 'ru') return mz.lr || mz.l;
    if (_lang === 'en') return mz.le || mz.l;
    return mz.l;
  }

  /* view = 'main' | 'location' | 'prayer' | 'langmazhab' |
            'interface' | 'notifications' | 'briefing' |
            'cloudsync' | 'contact' | 'about'                 */
  let _lang = 'uz';
  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }
  let _s    = {};
  let _view = 'main';

  /* ── Persistence ─────────────────────────────────────────── */
  function _loadS() {
    _s = {
      lang:              localStorage.getItem('islamtime_lang')                  || 'uz',
      mazhab:            localStorage.getItem('islamtime_madhab')                || 'hanafi',
      method:            parseInt(localStorage.getItem('islamtime_method')        || '3'),
      theme:             localStorage.getItem('islamtime_theme')                 || 'dark',
      gps:               (localStorage.getItem('islamtime_gps')                  ?? 'true')  === 'true',
      push:              (localStorage.getItem('islamtime_push')                 ?? 'true')  === 'true',
      ayah:              (localStorage.getItem('islamtime_notif_ayah')           ?? 'true')  === 'true',
      hadith:            (localStorage.getItem('islamtime_notif_hadith')         ?? 'true')  === 'true',
      dua:               (localStorage.getItem('islamtime_notif_dua')            ?? 'false') === 'true',
      daily_briefing:    (localStorage.getItem('islamtime_daily_briefing')       ?? 'false') === 'true',
      briefing_time:     localStorage.getItem('islamtime_briefing_time')         || '06:00',
      briefing_weather:  (localStorage.getItem('islamtime_briefing_weather')     ?? 'true')  === 'true',
      briefing_aqi:      (localStorage.getItem('islamtime_briefing_aqi')         ?? 'true')  === 'true',
      briefing_prayer:   (localStorage.getItem('islamtime_briefing_prayer')      ?? 'true')  === 'true',
    };
  }

  function _persist(key, val) {
    const map = {
      lang:'islamtime_lang', mazhab:'islamtime_madhab', method:'islamtime_method',
      theme:'islamtime_theme', gps:'islamtime_gps', push:'islamtime_push',
      ayah:'islamtime_notif_ayah', hadith:'islamtime_notif_hadith', dua:'islamtime_notif_dua',
      daily_briefing:   'islamtime_daily_briefing',
      briefing_time:    'islamtime_briefing_time',
      briefing_weather: 'islamtime_briefing_weather',
      briefing_aqi:     'islamtime_briefing_aqi',
      briefing_prayer:  'islamtime_briefing_prayer',
    };
    if (map[key]) localStorage.setItem(map[key], String(val));
    _s[key] = val;
  }

  /* ── Entry points ─────────────────────────────────────────── */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _view = 'main';
    _loadS();
    _rebuild();
  }

  function load(lang) {
    _lang = lang;
    _view = 'main';
    _loadS();
    _rebuild();
  }

  function _rebuild() {
    const el = document.getElementById('screen-settings');
    if (!el) return;
    el.innerHTML = _shell();
    _bindAll(el);
  }

  /* ── Shell (header + scrollable content) ─────────────────── */
  function _shell() {
    const isMain = _view === 'main';
    const TITLES = {
      main:          _T('Sozlamalar',            'Созламалар',            'Настройки',                  'Settings'),
      location:      _T('Joylashuv',             'Жойлашув',             'Местоположение',              'Location'),
      prayer:        _T('Namoz hisoblash usuli', 'Намоз ҳисоблаш усули', 'Метод расчёта намаза',        'Prayer Calculation Method'),
      langmazhab:    _T('Til va Mazhab',         'Тил ва Мазҳаб',        'Язык и Мазхаб',               'Language and Madhab'),
      interface:     _T('Interfeys',             'Интерфейс',            'Интерфейс',                   'Interface'),
      notifications: _T('Bildirishnomalar',      'Билдиришномалар',      'Уведомления',                 'Notifications'),
      cloudsync:     _T('Bulut sinxronizatsiyasi','Булут синхронизацияси','Синхронизация с облаком',    'Cloud Sync'),
      contact:       _T('Aloqa va yordam',       'Алоқа ва ёрдам',       'Контакты и помощь',           'Contact & Support'),
      about:         _T('Ilova haqida',          'Илова ҳақида',         'О приложении',                'About'),
      briefing:      _T("Kunlik ma'lumotlar",    'Кунлик маълумотлар',   'Ежедневная сводка',           'Daily Briefing'),
    };

    const langs = typeof LANG_META !== 'undefined' ? LANG_META : [];
    const lm    = langs.find(l => l.code === _s.lang);
    const mz    = MAZHABLAR.find(m => m.k === _s.mazhab);
    const sub   = isMain ? `${lm ? lm.flag + ' ' + lm.name : ''} · ${_mzLabel(mz)}` : '';

    return `
      <div class="screen-inner q-screen">
        <div class="st-header">
          <div class="nm-tile-bg"></div>
          <div class="nm-tile-ov"></div>
          <div class="st-header-in">
            <div class="st-nav-row">
              <button class="nm-back-btn" id="st-back">
                ${isMain ? '← ' + _T('Menyu','Меню','Меню','Menu') : '← ' + _T('Sozlamalar','Созламалар','Настройки','Settings')}
              </button>
              ${isMain ? '<div class="st-ver-badge"><span>v1.0 beta</span></div>' : '<div></div>'}
            </div>
            <div class="st-title-wrap">
              <div class="st-title">${TITLES[_view] || TITLES.main}</div>
              ${sub ? `<div class="st-subtitle">${sub}</div>` : ''}
            </div>
            <div class="nm-hdiv" style="margin-bottom:0"></div>
          </div>
        </div>
        <div class="nm-content" id="st-content">
          ${_content()}
        </div>
      </div>`;
  }

  function _content() {
    switch (_view) {
      case 'location':      return _htmlLocation();
      case 'prayer':        return _htmlPrayer();
      case 'langmazhab':    return _htmlLangMazhab();
      case 'interface':     return _htmlInterface();
      case 'notifications': return _htmlNotifications();
      case 'briefing':      return _htmlBriefing();
      case 'cloudsync':     return _htmlCloudSync();
      case 'contact':       return _htmlContact();
      case 'about':         return _htmlAbout();
      default:              return _htmlMain();
    }
  }

  /* ── Main: 8 category cards ─────────────────────────────── */
  function _htmlMain() {
    const langs  = typeof LANG_META !== 'undefined' ? LANG_META : [];
    const lm     = langs.find(l => l.code === _s.lang);
    const mz     = MAZHABLAR.find(m => m.k === _s.mazhab);
    const lat    = localStorage.getItem('islamtime_last_lat');
    const lon    = localStorage.getItem('islamtime_last_lon');
    const locSub = (lat && lon) ? `${parseFloat(lat).toFixed(2)}°, ${parseFloat(lon).toFixed(2)}°` : _T('GPS joylashuv','GPS жойлашув','GPS местоположение','GPS location');
    const methN  = PRAYER_METHODS.find(m => m.id === _s.method)?.n || 'Muslim World League';
    const notifN = [_s.push, _s.ayah, _s.hadith, _s.dua].filter(Boolean).length;
    const tg     = window.Telegram?.WebApp;
    const online = !!tg?.initDataUnsafe?.user?.id;

    const CARDS = [
      { v:'location',      t:_T('Joylashuv',              'Жойлашув',              'Местоположение',             'Location'),              s: locSub },
      { v:'prayer',        t:_T('Namoz hisoblash usuli',  'Намоз ҳисоблаш усули',  'Метод расчёта намаза',       'Prayer Calculation Method'), s: methN  },
      { v:'langmazhab',    t:_T('Til va Mazhab',          'Тил ва Мазҳаб',          'Язык и Мазхаб',             'Language and Madhab'),   s: `${lm ? lm.flag+' '+lm.name : ''} · ${_mzLabel(mz)}` },
      { v:'interface',     t:_T('Interfeys',              'Интерфейс',              'Интерфейс',                 'Interface'),             s: _s.theme === 'dark' ? _T('Tungi rejim','Тунги режим','Тёмный режим','Dark mode') : _T('Kunduzgi rejim','Кундузги режим','Светлый режим','Light mode') },
      { v:'notifications', t:_T('Bildirishnomalar',       'Билдиришномалар',        'Уведомления',               'Notifications'),         s: `${notifN} ${_T('ta yoqilgan','та ёқилган','вкл.','enabled')}` },
      { v:'briefing',      t:_T("Kunlik ma'lumotlar",    'Кунлик маълумотлар',     'Ежедневная сводка',         'Daily Briefing'),        s: _s.daily_briefing ? `${_T("Yoqilgan","Ёқилган","Включено","Enabled")} · ${_s.briefing_time}` : _T("O'chirilgan","Ўчирилган","Отключено","Disabled") },
      { v:'cloudsync',     t:_T('Bulut sinxronizatsiyasi','Булут синхронизацияси',  'Синхронизация с облаком',   'Cloud Sync'),            s: online ? _T("Bog'langan","Боғланган","Подключён",'Connected') : _T('Offline rejim','Офлайн режим','Режим офлайн','Offline mode') },
      { v:'contact',       t:_T('Aloqa va yordam',        'Алоқа ва ёрдам',        'Контакты и помощь',          'Contact & Support'),     s: _T('Xato, fikr, yordam','Хато, фикр, ёрдам','Ошибки, отзывы, помощь','Bugs, feedback, help') },
      { v:'about',         t:_T('Ilova haqida',           'Илова ҳақида',           'О приложении',              'About'),                 s: 'v1.0 beta · 14 lang · 10 mod' },
    ];

    return `
      <div class="st-sect">
        ${CARDS.map((c, i) => `
          <div class="st-cat-card" data-view="${c.v}">
            <div class="st-cat-body">
              <div class="st-cat-title">${c.t}</div>
              <div class="st-cat-sub">${c.s}</div>
            </div>
            <span class="st-arr">›</span>
          </div>
          ${i < CARDS.length - 1 ? '<div class="st-div"></div>' : ''}
        `).join('')}
      </div>`;
  }

  /* ── Sub-screen HTML ─────────────────────────────────────── */
  function _htmlLocation() {
    const lat    = localStorage.getItem('islamtime_last_lat');
    const lon    = localStorage.getItem('islamtime_last_lon');
    const locTxt = (lat && lon)
      ? `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`
      : _T('Joylashuv saqlanmagan','Жойлашув сақланмаган','Местоположение не сохранено','Location not saved');
    return `
      <div class="st-sect">
        <div class="st-contact-row" id="st-loc-ref">
          <div class="st-rb">
            <div class="st-rl">${_T('Joylashuvni yangilash','Жойлашувни янгилаш','Обновить местоположение','Update location')}</div>
            <div class="st-rs" id="st-loc-txt">${locTxt}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
        <div class="st-div"></div>
        <div class="st-plain-row">
          <div class="st-rb">
            <div class="st-rl">${_T('GPS boshqarish','GPS бошқариш','Управление GPS','GPS management')}</div>
            <div class="st-rs">${_T('Namoz vaqti va Qibla uchun','Намоз вақти ва Қибла учун','Для намаза и Киблы','For prayer times and Qibla')}</div>
          </div>
          <div class="st-toggle${_s.gps ? ' on' : ''}" id="st-gps-tog"></div>
        </div>
      </div>`;
  }

  function _htmlPrayer() {
    const opts = PRAYER_METHODS.map(m =>
      `<option value="${m.id}"${m.id === _s.method ? ' selected' : ''}>${m.n}</option>`
    ).join('');
    return `
      <div class="st-sect" style="padding:14px">
        <div class="st-sec-lbl" style="margin-bottom:10px">${_T('HISOBLASH USULINI TANLANG','ҲИСОБЛАШ УСУЛИНИ ТАНЛАНГ','ВЫБЕРИТЕ МЕТОД РАСЧЁТА','SELECT CALCULATION METHOD')}</div>
        <select class="st-select" id="st-method">${opts}</select>
      </div>`;
  }

  function _htmlLangMazhab() {
    const langs = typeof LANG_META !== 'undefined' ? LANG_META : [];
    const lm    = langs.find(l => l.code === _s.lang);
    const mz    = MAZHABLAR.find(m => m.k === _s.mazhab);
    return `
      <div class="st-sect">
        <div class="st-contact-row" id="st-change-lang">
          <div class="st-rb">
            <div class="st-rl">${_T('Til','Тил','Язык','Language')}</div>
            <div class="st-rs">${lm ? lm.flag + ' ' + lm.name : _T('Tanlang','Танланг','Выберите','Select')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
        <div class="st-div"></div>
        <div class="st-contact-row" id="st-change-mazhab">
          <div class="st-rb">
            <div class="st-rl">${_T('Mazhab','Мазҳаб','Мазхаб','Madhab')}</div>
            <div class="st-rs">${mz ? _mzLabel(mz) : _T('Tanlang','Танланг','Выберите','Select')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
      </div>`;
  }

  function _htmlInterface() {
    return `
      <div class="st-sect">
        <div class="st-tema-row" data-theme="dark">
          <span class="st-tema-ic">🌙</span>
          <div class="st-rb">
            <div class="st-rl">${_T('Tungi rejim','Тунги режим','Тёмный режим','Dark mode')}</div>
            <div class="st-rs">${_T('Navy + oltin (hozirgi)','Navy + олтин (ҳозирги)','Navy + золото (текущий)','Navy + gold (current)')}</div>
          </div>
          ${_s.theme === 'dark' ? '<div class="st-check">✓</div>' : ''}
        </div>
        <div class="st-div" style="margin-left:48px"></div>
        <div class="st-tema-row st-disabled" data-theme="light">
          <span class="st-tema-ic">☀️</span>
          <div class="st-rb">
            <div class="st-rl st-muted">${_T('Kunduzgi rejim','Кундузги режим','Светлый режим','Light mode')}</div>
            <div class="st-rs">${_T('Tez orada...','Тез орада...','Скоро...','Coming soon...')}</div>
          </div>
          <span class="st-soon-badge">${_T('Tez orada','Тез орада','Скоро','Soon')}</span>
        </div>
      </div>`;
  }

  function _htmlNotifications() {
    const rows = [
      { id:'st-push-tog',   k:'push',   l:_T('Namoz eslatmalari','Намоз эслатмалари','Напоминания о намазе','Prayer reminders'),   s:_T('Har namoz vaqtida xabar','Ҳар намоз вақтида хабар','Уведомление при каждом намазе','Notification for each prayer')      },
      { id:'st-ayah-tog',   k:'ayah',   l:_T('Kunlik oyat','Кунлик оят','Ежедневный аят','Daily verse'),                              s:_T("Har kuni Qur'on oyati","Ҳар куни Қуръон ояти",'Аят Корана каждый день','Quran verse every day')                },
      { id:'st-hadith-tog', k:'hadith', l:_T('Kunlik hadis','Кунлик ҳадис','Ежедневный хадис','Daily hadith'),                        s:_T("Payg'ambar s.a.v. so'zlari","Пайғамбар с.а.в. сўзлари",'Слова Пророка ﷺ','Words of the Prophet ﷺ')                },
      { id:'st-dua-tog',    k:'dua',    l:_T("Kunlik du'o","Кунлик дуо",'Ежедневная дуа','Daily dua'),                                s:_T('Ertalabki va kechki','Эрталабки ва кечки','Утренние и вечерние','Morning and evening')                        },
    ];
    return `
      <div class="st-sect">
        ${rows.map((r, i) => `
          <div class="st-plain-row">
            <div class="st-rb">
              <div class="st-rl">${r.l}</div>
              <div class="st-rs">${r.s}</div>
            </div>
            <div class="st-toggle${_s[r.k] ? ' on' : ''}" id="${r.id}"></div>
          </div>
          ${i < rows.length - 1 ? '<div class="st-div"></div>' : ''}
        `).join('')}
      </div>`;
  }

  function _htmlBriefing() {
    const on  = _s.daily_briefing;
    const dim = on ? '' : ' style="opacity:.45;pointer-events:none"';
    return `
      <div class="st-sect">
        <div class="st-plain-row">
          <div class="st-rb">
            <div class="st-rl">🌤 ${_T("Kunlik ma'lumotlar","Кунлик маълумотлар","Ежедневная сводка","Daily Briefing")}</div>
            <div class="st-rs">${_T("Har kuni belgilangan vaqtda xabar","Ҳар куни белгиланган вақтда хабар","Сообщение каждый день в выбранное время","Daily message at scheduled time")}</div>
          </div>
          <div class="st-toggle${on ? ' on' : ''}" id="st-brief-tog"></div>
        </div>
        <div class="st-div"></div>
        <div class="st-plain-row"${dim}>
          <div class="st-rb">
            <div class="st-rl">🕐 ${_T("Vaqt","Вақт","Время","Time")}</div>
            <div class="st-rs">${_T("Mahalliy vaqt","Маҳаллий вақт","Местное время","Local time")}</div>
          </div>
          <input type="time" class="st-time-input" id="st-brief-time" value="${_s.briefing_time}">
        </div>
        <div class="st-div"></div>
        <div class="st-plain-row"${dim}>
          <div class="st-rb">
            <div class="st-rl">🌡 ${_T("Ob-havo","Об-ҳаво","Погода","Weather")}</div>
            <div class="st-rs">${_T("Harorat va havo holati","Ҳарорат ва ҳаво ҳолати","Температура и погода","Temperature and conditions")}</div>
          </div>
          <div class="st-toggle${_s.briefing_weather ? ' on' : ''}" id="st-brief-weather"></div>
        </div>
        <div class="st-div"></div>
        <div class="st-plain-row"${dim}>
          <div class="st-rb">
            <div class="st-rl">🌬 ${_T("Havo sifati (AQI)","Ҳаво сифати (AQI)","Качество воздуха (AQI)","Air Quality (AQI)")}</div>
            <div class="st-rs">${_T("Havoning tozaligi","Ҳавонинг тозалиги","Чистота воздуха","Air cleanliness index")}</div>
          </div>
          <div class="st-toggle${_s.briefing_aqi ? ' on' : ''}" id="st-brief-aqi"></div>
        </div>
        <div class="st-div"></div>
        <div class="st-plain-row"${dim}>
          <div class="st-rb">
            <div class="st-rl">🕌 ${_T("Namoz vaqtlari","Намоз вақтлари","Время намаза","Prayer times")}</div>
            <div class="st-rs">${_T("Barcha 5 vaqt","Барча 5 вақт","Все 5 времён","All 5 daily prayers")}</div>
          </div>
          <div class="st-toggle${_s.briefing_prayer ? ' on' : ''}" id="st-brief-prayer"></div>
        </div>
      </div>
      <div class="st-sect" style="margin-top:10px">
        <button class="st-send-btn ready" id="st-brief-save" style="width:100%;padding:13px">
          ${_T("Saqlash","Сақлаш","Сохранить","Save")}
        </button>
      </div>`;
  }

  function _bindBriefing(el) {
    const togEl = el.querySelector('#st-brief-tog');

    function _refreshDim() {
      const on = _s.daily_briefing;
      el.querySelectorAll('#st-brief-time,#st-brief-weather,#st-brief-aqi,#st-brief-prayer')
        .forEach(e => {
          const row = e.closest('.st-plain-row');
          if (row) { row.style.opacity = on ? '' : '0.45'; row.style.pointerEvents = on ? '' : 'none'; }
        });
    }

    togEl?.addEventListener('click', () => {
      const nv = !_s.daily_briefing;
      _persist('daily_briefing', nv);
      togEl.classList.toggle('on', nv);
      _refreshDim();
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });

    el.querySelector('#st-brief-time')?.addEventListener('change', e => {
      _persist('briefing_time', e.target.value);
    });

    [
      { id:'st-brief-weather', k:'briefing_weather' },
      { id:'st-brief-aqi',     k:'briefing_aqi'     },
      { id:'st-brief-prayer',  k:'briefing_prayer'  },
    ].forEach(({ id, k }) => {
      el.querySelector(`#${id}`)?.addEventListener('click', () => {
        const nv = !_s[k]; _persist(k, nv);
        el.querySelector(`#${id}`)?.classList.toggle('on', nv);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });

    el.querySelector('#st-brief-save')?.addEventListener('click', () => {
      const tg     = window.Telegram?.WebApp;
      const uid    = tg?.initDataUnsafe?.user?.id;
      const tzOff  = -new Date().getTimezoneOffset(); // minutes east of UTC
      const btn    = el.querySelector('#st-brief-save');
      if (btn) btn.textContent = _T('Saqlanmoqda...','Сақланмоқда...','Сохранение...','Saving...');

      const payload = {
        user_id:  uid || 0,
        enabled:  _s.daily_briefing,
        time:     _s.briefing_time,
        weather:  _s.briefing_weather,
        aqi:      _s.briefing_aqi,
        prayer:   _s.briefing_prayer,
        tz_offset: tzOff,
      };

      fetch('/api/user/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(r => r.json())
        .then(data => {
          if (btn) btn.textContent = _T('Saqlash','Сақлаш','Сохранить','Save');
          if (data.ok) {
            _toast('✅ ' + _T("Saqlandi!","Сақланди!","Сохранено!","Saved!"));
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          } else {
            _toast('❌ ' + (data.error || 'Error'));
          }
        })
        .catch(() => {
          if (btn) btn.textContent = _T('Saqlash','Сақлаш','Сохранить','Save');
          _toast('❌ ' + _T("Tarmoq xatosi","Тармоқ хатоси","Ошибка сети","Network error"));
        });

      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    });
  }

  function _htmlCloudSync() {
    const online    = !!window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const statusTxt = online ? _T("Bog'langan","Боғланган","Подключён",'Connected') + ' · ' + new Date().toLocaleDateString(_lang === 'ru' ? 'ru' : _lang === 'en' ? 'en' : 'uz') : _T('Offline rejim','Офлайн режим','Режим офлайн','Offline mode');
    const dotClr    = online ? '#4fcfa0' : '#e8c15a';
    return `
      <div class="st-sect">
        <div class="st-plain-row">
          <div class="st-rb">
            <div class="st-rl">${_T('Sinxronizatsiya holati','Синхронизация ҳолати','Статус синхронизации','Sync status')}</div>
            <div class="st-rs" id="st-sync-status">${statusTxt}</div>
          </div>
          <span id="st-sync-dot" style="width:8px;height:8px;border-radius:50%;background:${dotClr};flex-shrink:0"></span>
        </div>
        <div class="st-div"></div>
        <div class="st-contact-row" id="st-sync-btn">
          <div class="st-rb">
            <div class="st-rl">${_T("Qo'lda sinxronlash","Қўлда синхронлаш","Синхронизировать вручную",'Sync manually')}</div>
            <div class="st-rs">${_T('Sozlamalarni serverga yuborish','Созламаларни серверга юбориш','Отправить настройки на сервер','Send settings to server')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
      </div>`;
  }

  function _htmlContact() {
    return `
      <div class="st-sect" style="margin-bottom:12px">
        <div class="st-contact-row" id="st-report-btn">
          <div class="st-rb">
            <div class="st-rl">${_T('Xatolik haqida xabar berish','Хатолик ҳақида хабар бериш','Сообщить об ошибке','Report an error')}</div>
            <div class="st-rs">${_T('Bug yoki muammo haqida yozish','Баг ёки муаммо ҳақида ёзиш','Описать ошибку или проблему','Describe a bug or issue')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
        <div class="st-div"></div>
        <div class="st-contact-row" id="st-feedback-btn">
          <div class="st-rb">
            <div class="st-rl">${_T('Fikr bildirish / taklif yuborish','Фикр билдириш / таклиф юбориш','Оставить отзыв / предложение','Send feedback / suggestion')}</div>
            <div class="st-rs">${_T('Ilovani yaxshilashga yordam bering','Иловани яхшилашга ёрдам беринг','Помогите улучшить приложение','Help improve the app')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
        <div class="st-div"></div>
        <div class="st-contact-row" id="st-help-btn">
          <div class="st-rb">
            <div class="st-rl">${_T("Yordam so'rash","Ёрдам сўраш","Получить помощь",'Get help')}</div>
            <div class="st-rs">${_T("Qo'llanma va tez-tez so'raladigan savollar","Қўлланма ва тез-тез сўраладиган саволлар","Руководство и часто задаваемые вопросы",'Guide and FAQ')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
        <div class="st-div"></div>
        <div class="st-contact-row" id="st-tg-btn">
          <div class="st-rb">
            <div class="st-rl">Telegram support</div>
            <div class="st-rs">@islamtimeworldsupport</div>
          </div>
          <span class="st-arr">›</span>
        </div>
      </div>
      <div class="st-fb-card" id="st-fb-wrap" style="display:none;margin-bottom:12px"></div>`;
  }

  function _htmlAbout() {
    const features = [
      _T('Aniq namoz vaqtlari',    'Аниқ намоз вақтлари',    'Точное время намаза',          'Accurate prayer times'),
      _T("Qibla yo'nalishi",       'Қибла йўналиши',          'Направление Киблы',            'Qibla direction'),
      _T('Yaqin masjidlar',        'Яқин масжидлар',          'Ближайшие мечети',             'Nearby mosques'),
      _T("Qur'on",                 "Қуръон",                  'Коран',                        'Quran'),
      _T('Hadis',                  'Ҳадис',                   'Хадис',                        'Hadith'),
      _T("Du'olar",                "Дуолар",                  'Дуа',                          "Du'as"),
      _T('Zikr va Salavot',        'Зикр ва Салавот',         'Зикр и Салавот',               'Dhikr & Salawat'),
      _T('Hijriy taqvim',          'Ҳижрий тақвим',           'Исламский календарь',          'Hijri calendar'),
      _T("Allohning 99 ismi",      'Аллоҳнинг 99 исми',       '99 имён Аллаха',               '99 Names of Allah'),
    ];

    return `
      <!-- Hero ─────────────────────────────────── -->
      <div class="ab-hero">
        <div class="ab-hero-topline"></div>
        <div class="ab-hero-crescent">🌙</div>
        <div class="ab-hero-name">IslamTimeWorldBot</div>
        <div class="ab-hero-tag">${_T(
          "Global Islomiy Ibodat va Turmush Platformasi",
          "Глобал Исломий Ибодат ва Турмуш Платформаси",
          "Глобальная исламская молитвенная платформа",
          "Global Islamic Prayer & Lifestyle Platform"
        )}</div>
        <div class="ab-hero-divider"></div>
        <div class="ab-hero-meta">
          🌍 14 ${_T('til','тил','языков','languages')} &nbsp;·&nbsp;
          📦 10 ${_T('modul','модул','модулей','modules')} &nbsp;·&nbsp;
          v1.0 Beta
        </div>
      </div>

      <!-- Mission hadith ─────────────────────── -->
      <div class="ab-hadith-card">
        <div class="ab-hadith-lbl">${_T('MISSIYA','МИССИЯ','МИССИЯ','MISSION')}</div>
        <div class="ab-hadith-quote">"${_T(
          "Kim bir yaxshilikka sababchi bo'lsa, uni qilgan kabi ajr oladi.",
          "Ким бир яхшиликка сабабчи бўлса, уни қилган каби ажр олади.",
          "Тот, кто указал на благое, получит такую же награду.",
          "Whoever guides to goodness will have a reward like the one who does it."
        )}"</div>
        <div class="ab-hadith-ref">— ${_T('Muslim, 2671','Муслим, 2671','Муслим, 2671','Muslim, 2671')}</div>
      </div>

      <!-- Stats grid ─────────────────────────── -->
      <div class="ab-stats-grid">
        <div class="ab-stat-box">
          <div class="ab-stat-num">14</div>
          <div class="ab-stat-lbl">${_T('Tillar','Тиллар','Языков','Languages')}</div>
        </div>
        <div class="ab-stat-box">
          <div class="ab-stat-num">10</div>
          <div class="ab-stat-lbl">${_T('Modullar','Модуллар','Модулей','Modules')}</div>
        </div>
        <div class="ab-stat-box ab-stat-box--blue">
          <div class="ab-stat-num ab-stat-num--sm">Telegram<br>WebApp</div>
          <div class="ab-stat-lbl">${_T('Platforma','Платформа','Платформа','Platform')}</div>
        </div>
        <div class="ab-stat-box ab-stat-box--green">
          <div class="ab-stat-num ab-stat-num--sm">Public<br>Beta</div>
          <div class="ab-stat-lbl">${_T('Holat','Ҳолат','Статус','Status')}</div>
        </div>
      </div>

      <!-- Purpose / Features ─────────────────── -->
      <div class="ab-feat-card">
        <div class="ab-feat-lbl">${_T('MAQSAD','МАҚСАД','ЦЕЛЬ','PURPOSE')}</div>
        <div class="ab-feat-desc">${_T(
          "IslamTimeWorldBot butun dunyo musulmonlariga quyidagilarda yordam beradi:",
          "IslamTimeWorldBot бутун дунё мусулмонларига қуйидагиларда ёрдам беради:",
          "IslamTimeWorldBot помогает мусульманам по всему миру:",
          "IslamTimeWorldBot helps Muslims around the world with:"
        )}</div>
        <div class="ab-feat-list">
          ${features.map(f => `
            <div class="ab-feat-item">
              <span class="ab-feat-bullet">•</span>
              <span class="ab-feat-text">${f}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Developer ──────────────────────────── -->
      <div class="ab-dev-card">
        <div class="ab-dev-lbl">${_lang === 'ar'
          ? 'مؤسس وصاحب المشروع'
          : _T('ASOSCHI VA LOYIHA MUALLIFI','АСОСЧИ ВА ЛОЙИҲА МУАЛЛИФИ','ОСНОВАТЕЛЬ И АВТОР ПРОЕКТА','FOUNDER & PROJECT AUTHOR')
        }</div>
        <div class="ab-dev-name">Mumin Kuziev</div>
        <div class="ab-dev-handle" id="ab-dev-handle">@islamtimeworldsupport</div>
      </div>

      <!-- Data sources ───────────────────────── -->
      <div class="ab-sources-card">
        <div class="ab-sources-lbl">${_T("MA'LUMOT MANBALARI","МАЪЛУМОТ МАНБАЛАРИ","ИСТОЧНИКИ ДАННЫХ","DATA SOURCES")}</div>
        <div class="ab-sources-list">
          Aladhan API &nbsp;·&nbsp; Al-Quran Cloud &nbsp;·&nbsp;
          HadithAPI &nbsp;·&nbsp; OpenStreetMap &nbsp;·&nbsp;
          Open-Meteo &nbsp;·&nbsp; OpenAQ
        </div>
      </div>

      <!-- Legal links ────────────────────────── -->
      <div class="st-sect" style="margin-bottom:12px">
        <div class="st-contact-row" id="st-privacy-btn">
          <div class="st-rb">
            <div class="st-rl">${_T('Maxfiylik siyosati','Махфийлик сиёсати','Политика конфиденциальности','Privacy Policy')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
        <div class="st-div"></div>
        <div class="st-contact-row" id="st-terms-btn">
          <div class="st-rb">
            <div class="st-rl">${_T('Foydalanish shartlari','Фойдаланиш шартлари','Условия использования','Terms of Use')}</div>
          </div>
          <span class="st-arr">›</span>
        </div>
      </div>

      <!-- Footer ─────────────────────────────── -->
      <div class="ab-footer">${_T(
        "Butun dunyo muslim jamoasi uchun samimiyat bilan yaratilgan.",
        "Бутун дунё муслим жамоаси учун самимийлик билан яратилган.",
        "Создано с искренностью для мусульманской общины всего мира.",
        "Developed with sincerity for the global Muslim community."
      )}</div>`;
  }

  /* ── Events ──────────────────────────────────────────────── */
  function _bindAll(el) {
    el.querySelector('#st-back')?.addEventListener('click', () => {
      if (_view === 'main') { window.App.navigate('screen-dashboard'); }
      else { _view = 'main'; _loadS(); _rebuild(); }
    });

    if (_view === 'main') {
      el.querySelectorAll('.st-cat-card').forEach(card => {
        card.addEventListener('click', () => {
          _view = card.dataset.view;
          _rebuild();
          window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        });
      });
      return;
    }

    if (_view === 'location')      _bindLocation(el);
    if (_view === 'prayer')        _bindPrayer(el);
    if (_view === 'langmazhab')    _bindLangMazhab(el);
    if (_view === 'interface')     _bindInterface(el);
    if (_view === 'notifications') _bindNotifications(el);
    if (_view === 'briefing')      _bindBriefing(el);
    if (_view === 'cloudsync')     _bindCloudSync(el);
    if (_view === 'contact')       _bindContact(el);
    if (_view === 'about')         _bindAbout(el);
  }

  /* ── Sub-screen binders ──────────────────────────────────── */
  function _bindLocation(el) {
    el.querySelector('#st-loc-ref')?.addEventListener('click', () => {
      const txt = el.querySelector('#st-loc-txt');
      if (txt) txt.textContent = _T('Aniqlanmoqda...','Аниқланмоқда...','Определяется...','Detecting...');
      const tg = window.Telegram?.WebApp;
      if (tg?.LocationManager) {
        tg.LocationManager.getLocation(res => {
          if (res?.latitude) {
            localStorage.setItem('islamtime_last_lat', res.latitude);
            localStorage.setItem('islamtime_last_lon', res.longitude);
            if (txt) txt.textContent = `${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`;
          } else { if (txt) txt.textContent = _T("Aniqlab bo'lmadi","Аниқлаб бўлмади","Не удалось определить",'Could not detect'); }
        });
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          localStorage.setItem('islamtime_last_lat', pos.coords.latitude);
          localStorage.setItem('islamtime_last_lon', pos.coords.longitude);
          if (txt) txt.textContent = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        }, () => { if (txt) txt.textContent = _T('Ruxsat berilmagan','Рухсат берилмаган','Доступ запрещён','Permission denied'); });
      }
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    });

    el.querySelector('#st-gps-tog')?.addEventListener('click', () => {
      const nv = !_s.gps; _persist('gps', nv);
      el.querySelector('#st-gps-tog')?.classList.toggle('on', nv);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });
  }

  function _bindPrayer(el) {
    el.querySelector('#st-method')?.addEventListener('change', e => {
      _persist('method', parseInt(e.target.value));
      _toast('✅ ' + _T('Namoz usuli saqlandi','Намоз усули сақланди','Метод намаза сохранён','Prayer method saved'));
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    });
  }

  function _bindLangMazhab(el) {
    el.querySelector('#st-change-lang')?.addEventListener('click', () => {
      window.App.navigate('screen-language');
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });
    el.querySelector('#st-change-mazhab')?.addEventListener('click', () => {
      window.App.navigate('screen-mazhab');
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });
  }

  function _bindInterface(el) {
    el.querySelectorAll('.st-tema-row').forEach(row => {
      row.addEventListener('click', () => {
        if (row.dataset.theme === 'light') return;
        const key = row.dataset.theme;
        _persist('theme', key);
        document.documentElement.setAttribute('data-theme', key);
        el.querySelectorAll('.st-tema-row').forEach(r => {
          const on  = r.dataset.theme === key;
          const chk = r.querySelector('.st-check');
          if (on && !chk) { const c = document.createElement('div'); c.className = 'st-check'; c.textContent = '✓'; r.appendChild(c); }
          else if (!on && chk) chk.remove();
        });
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
  }

  function _bindNotifications(el) {
    [
      { id:'st-push-tog',   k:'push'   },
      { id:'st-ayah-tog',   k:'ayah'   },
      { id:'st-hadith-tog', k:'hadith' },
      { id:'st-dua-tog',    k:'dua'    },
    ].forEach(({ id, k }) => {
      el.querySelector(`#${id}`)?.addEventListener('click', () => {
        const nv = !_s[k]; _persist(k, nv);
        el.querySelector(`#${id}`)?.classList.toggle('on', nv);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });
  }

  function _bindCloudSync(el) {
    el.querySelector('#st-sync-btn')?.addEventListener('click', () => {
      const txt = el.querySelector('#st-sync-status');
      const dot = el.querySelector('#st-sync-dot');
      if (txt) txt.textContent = _T('Sinxronlanmoqda...','Синхронланмоқда...','Синхронизация...','Syncing...');
      if (dot) dot.style.background = '#e8c15a';
      try {
        window.Telegram?.WebApp?.sendData(JSON.stringify({
          action:'sync_settings', lang:_s.lang, mazhab:_s.mazhab, method:_s.method,
        }));
      } catch (_) {}
      setTimeout(() => {
        if (txt) txt.textContent = _T('Muvaffaqiyatli sinxronlandi','Муваффақиятли синхронланди','Успешно синхронизировано','Successfully synced');
        if (dot) dot.style.background = '#4fcfa0';
        _toast('✅ ' + _T('Sozlamalar sinxronlandi','Созламалар синхронланди','Настройки синхронизированы','Settings synced'));
      }, 800);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    });
  }

  function _bindContact(el) {
    el.querySelector('#st-report-btn')?.addEventListener('click',
      () => _openFeedback(el, _T('Xato yoki muammoni tasvirlab bering...','Хато ёки муаммони тасвирлаб беринг...','Опишите ошибку или проблему...','Describe the error or issue...')));
    el.querySelector('#st-feedback-btn')?.addEventListener('click',
      () => _openFeedback(el, _T('Taklif yoki fikringizni yozing...','Таклиф ёки фикрингизни ёзинг...','Напишите ваш отзыв или предложение...','Write your feedback or suggestion...')));
    el.querySelector('#st-help-btn')?.addEventListener('click', () => {
      _toast(_T('Yordam uchun: @islamtimeworldsupport','Ёрдам учун: @islamtimeworldsupport','Помощь: @islamtimeworldsupport','Help: @islamtimeworldsupport'));
    });
    el.querySelector('#st-tg-btn')?.addEventListener('click', () => {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/islamtimeworldsupport');
      else window.open('https://t.me/islamtimeworldsupport', '_blank');
    });
  }

  function _bindAbout(el) {
    el.querySelector('#ab-dev-handle')?.addEventListener('click', () => {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/islamtimeworldsupport');
      else window.open('https://t.me/islamtimeworldsupport', '_blank');
    });
    el.querySelector('#st-privacy-btn')?.addEventListener('click', () => {
      const tg = window.Telegram?.WebApp;
      if (tg?.openLink) tg.openLink('https://islamtimeworld.com/privacy');
      else window.open('https://islamtimeworld.com/privacy', '_blank');
    });
    el.querySelector('#st-terms-btn')?.addEventListener('click', () => {
      const tg = window.Telegram?.WebApp;
      if (tg?.openLink) tg.openLink('https://islamtimeworld.com/terms');
      else window.open('https://islamtimeworld.com/terms', '_blank');
    });
  }

  /* ── Inline feedback form ────────────────────────────────── */
  function _openFeedback(el, placeholder) {
    const wrap = el.querySelector('#st-fb-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    wrap.innerHTML = `
      <textarea class="st-textarea" id="st-fb-txt"
        placeholder="${placeholder}" rows="4"></textarea>
      <button class="st-send-btn" id="st-send-btn">${_T('Yuborish →','Юбориш →','Отправить →','Send →')}</button>`;
    wrap.scrollIntoView({ behavior:'smooth', block:'nearest' });

    let msg = '';
    const fbTxt  = wrap.querySelector('#st-fb-txt');
    const sendBtn = wrap.querySelector('#st-send-btn');

    fbTxt?.addEventListener('input', e => {
      msg = e.target.value;
      sendBtn?.classList.toggle('ready', !!msg.trim());
    });

    sendBtn?.addEventListener('click', () => {
      if (!msg.trim()) return;
      wrap.innerHTML = `
        <div class="st-sent-wrap">
          <div class="st-sent-ic">✅</div>
          <div class="st-sent-title">${_T('Xabar yuborildi!','Хабар юборилди!','Сообщение отправлено!','Message sent!')}</div>
          <div class="st-sent-sub">${_T('Tez orada javob beramiz','Тез орада жавоб берамиз','Мы ответим в ближайшее время','We will respond soon')}</div>
          <button class="st-sent-again" id="st-close-fb">${_T('Yopish','Ёпиш','Закрыть','Close')}</button>
        </div>`;
      wrap.querySelector('#st-close-fb')?.addEventListener('click', () => {
        wrap.style.display = 'none';
      });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    });

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  /* ── Toast ───────────────────────────────────────────────── */
  function _toast(msg) {
    let t = document.querySelector('.st-toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.className = 'st-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.classList.add('show');
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
    });
  }

  /* Apply saved theme on module load */
  const _initTheme = localStorage.getItem('islamtime_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', _initTheme);

  return { render, load };
})();
