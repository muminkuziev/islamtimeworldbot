/* ═══════════════════════════════════════════════════
   IslamTimeWorldBot — Main App Controller
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Telegram WebApp SDK ── */
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    try { tg.disableVerticalSwipes(); }      catch (_) {}
    try { tg.setHeaderColor('#FFFFFF'); }    catch (_) {}
    try { tg.setBackgroundColor('#FFFFFF'); } catch (_) {}
  }

  /* Allow passive touch scroll in WebView */
  document.addEventListener('touchmove', function () {}, { passive: true });

  /* ── URL parameters (read once at load) ── */
  const _urlParams   = new URLSearchParams(window.location.search);
  const _isStartFlow = _urlParams.get('start') === '1';
  const _urlLang     = (_urlParams.get('lang') || '').toLowerCase();

  /* ── App State ── */
  const state = {
    lang:          localStorage.getItem('islamtime_lang') || _detectLang(),
    user:          tg?.initDataUnsafe?.user || null,
    currentScreen: null,
    _prevScreen:   null,
  };

  const NAV_ITEMS = [
    { id: 'screen-dashboard', icon: 'home',           key: 'home' },
    { id: 'screen-quran',     icon: 'menu_book',      key: 'quran' },
    { id: 'screen-prayer',    icon: 'schedule',       key: 'prayer' },
    { id: 'screen-calendar',  icon: 'calendar_month', key: 'calendar' },
    { id: 'screen-others',    icon: 'grid_view',      key: 'more' },
  ];
  const NAV_LABELS = {
    home:     {uz:'Bosh sahifa',uz_cyr:'Бош саҳифа',ru:'Главная',en:'Home',tr:'Ana sayfa',ar:'الرئيسية',kk:'Басты бет',tg:'Асосӣ',ky:'Башкы бет',de:'Start',fr:'Accueil',id:'Beranda',hi:'होम',ur:'ہوم',bn:'হোম',fa:'خانه',ms:'Utama'},
    quran:    {uz:"Qur'on",uz_cyr:'Қуръон',ru:'Коран',en:'Quran',tr:'Kur’an',ar:'القرآن',kk:'Құран',tg:'Қуръон',ky:'Куран',de:'Koran',fr:'Coran',id:'Al-Quran',hi:'क़ुरआन',ur:'قرآن',bn:'কুরআন',fa:'قرآن',ms:'Al-Quran'},
    prayer:   {uz:'Namoz',uz_cyr:'Намоз',ru:'Намаз',en:'Prayer',tr:'Namaz',ar:'الصلاة',kk:'Намаз',tg:'Намоз',ky:'Намаз',de:'Gebet',fr:'Prière',id:'Salat',hi:'नमाज़',ur:'نماز',bn:'নামাজ',fa:'نماز',ms:'Solat'},
    calendar: {uz:'Taqvim',uz_cyr:'Тақвим',ru:'Календарь',en:'Calendar',tr:'Takvim',ar:'التقويم',kk:'Күнтізбе',tg:'Тақвим',ky:'Жылнаама',de:'Kalender',fr:'Calendrier',id:'Kalender',hi:'कैलेंडर',ur:'تقویم',bn:'ক্যালেন্ডার',fa:'تقویم',ms:'Kalendar'},
    more:     {uz:"Ko'proq",uz_cyr:'Кўпроқ',ru:'Ещё',en:'More',tr:'Daha fazla',ar:'المزيد',kk:'Қосымша',tg:'Бештар',ky:'Дагы',de:'Mehr',fr:'Plus',id:'Lainnya',hi:'और',ur:'مزید',bn:'আরও',fa:'بیشتر',ms:'Lagi'},
  };
  const MORE_SCREENS = new Set([
    'screen-others','screen-settings','screen-qibla','screen-mosques','screen-hadith',
    'screen-duas','screen-dhikr','screen-names','screen-shahodat','screen-haramayn',
    'screen-qazo','screen-monthly-calendar'
  ]);
  const ONBOARDING_SCREENS = new Set(['screen-splash','screen-language','screen-mazhab','screen-location']);

  function _navLabel(key) {
    const values = NAV_LABELS[key] || {};
    return values[state.lang] || values.en || key;
  }

  function _ensureBottomNav() {
    let nav = document.getElementById('app-bottom-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'app-bottom-nav';
      nav.className = 'app-bottom-nav';
      nav.setAttribute('aria-label', 'Primary');
      document.body.appendChild(nav);
    }
    nav.innerHTML = NAV_ITEMS.map(item => {
      const label = _navLabel(item.key);
      return `<button class="app-nav-item" type="button" data-screen="${item.id}" aria-label="${label}">
        <span class="material-symbols-rounded app-nav-icon" data-icon="${item.icon}" aria-hidden="true">${item.icon}</span>
        <span class="app-nav-label">${label}</span>
      </button>`;
    }).join('');
    nav.querySelectorAll('.app-nav-item').forEach(btn => btn.addEventListener('click', () => _openPrimary(btn.dataset.screen)));
  }

  function _openPrimary(screenId) {
    const lang = state.lang || 'uz';
    try {
      if (screenId === 'screen-dashboard') DashboardScreen.update(lang);
      if (screenId === 'screen-quran') QuranScreen.load(lang);
      if (screenId === 'screen-prayer') PrayerScreen.load(lang);
      if (screenId === 'screen-calendar') CalendarScreen.load(lang);
      if (screenId === 'screen-others') OthersScreen.load(lang);
    } catch (e) { console.warn('primary navigation load failed:', e); }
    navigate(screenId);
    try { tg?.HapticFeedback?.selectionChanged(); } catch (_) {}
  }

  function _updateBottomNav(screenId) {
    const nav = document.getElementById('app-bottom-nav');
    if (!nav) return;
    const hidden = ONBOARDING_SCREENS.has(screenId);
    nav.classList.toggle('is-hidden', hidden);
    document.body.classList.toggle('has-bottom-nav', !hidden);
    const activeId = MORE_SCREENS.has(screenId) ? 'screen-others' : screenId;
    nav.querySelectorAll('.app-nav-item').forEach(btn => {
      const active = btn.dataset.screen === activeId;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  /* ── Screen Navigation ── */
  function navigate(screenId) {
    const next    = document.getElementById(screenId);
    const current = document.querySelector('.screen.active');

    if (!next || current === next) return;

    /* Cleanup outgoing screen sensors */
    if (state.currentScreen === 'screen-qibla') {
      try { QiblaScreen.unload(); } catch (_) {}
    }

    state._prevScreen  = state.currentScreen;
    state.currentScreen = screenId;
    _updateBottomNav(screenId);

    if (current) {
      current.classList.add('exit');
      current.classList.remove('active');
      setTimeout(() => {
        current.classList.remove('exit'); /* CSS sets display:none via .screen default */
      }, 380);
    }

    /* Two-frame sequence: display→flex first, then trigger transition */
    next.classList.add('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        next.classList.add('active');
        next.classList.remove('entering');
      });
    });

    /* Update Telegram Back Button */
    if (tg?.BackButton) {
      const showBack = screenId !== 'screen-dashboard' && screenId !== 'screen-splash' && screenId !== 'screen-language';
      if (showBack) { tg.BackButton.show(); }
      else          { tg.BackButton.hide(); }
    }
  }

  /* Telegram hardware back button */
  if (tg?.BackButton) {
    tg.BackButton.onClick(() => {
      const prev = state._prevScreen || 'screen-dashboard';
      navigate(prev);
    });
  }

  /* ── Supported active languages — all 14 enabled ── */
  const _ACTIVE_LANGS = new Set(['ar','en','id','ur','bn','fr','hi','fa','tr','ru','uz','de','ms','uz_cyr','kk','tg','ky']);

  /* ── Auto-detect language from URL param or Telegram SDK ── */
  function _detectLang() {
    const _LANG_MAP = {
      uz: 'uz', ru: 'ru', en: 'en', ar: 'ar',
      tr: 'tr', de: 'de', fr: 'fr', fa: 'fa', bn: 'bn', ms: 'ms',
      kk: 'kk', id: 'id', hi: 'hi', ur: 'ur',
      ky: 'ky', tg: 'tg',
    };
    /* 1. URL hint passed by the bot (most reliable — comes from Telegram API) */
    if (_urlLang) {
      const mapped = _LANG_MAP[_urlLang] || _LANG_MAP[_urlLang.split('-')[0]];
      if (mapped) return mapped;
    }
    /* 2. Telegram SDK language_code */
    const tgLang = tg?.initDataUnsafe?.user?.language_code || '';
    const fromSdk = _LANG_MAP[tgLang] || _LANG_MAP[tgLang.split('-')[0]];
    if (fromSdk) return fromSdk;
    return null;
  }

  /* ── Expose global App API ── */
  window.App = { navigate, state };

  _ensureBottomNav();

  /* ── Render all screen shells (builds initial DOM) ── */
  const _screens = [
    SplashScreen, LanguageScreen, MazhabScreen, LocationScreen,
    PrayerScreen, QazoScreen, MonthlyCalendarScreen, QiblaScreen, MosquesScreen, QuranScreen,
    HadithScreen, DuasScreen, DhikrScreen, CalendarScreen,
    NamesScreen, OthersScreen, ShahodatScreen, HaramaynScreen, SettingsScreen, DashboardScreen,
  ];
  for (const s of _screens) {
    try { s.render(); } catch (e) { console.error('render failed:', e); }
  }

  /* ── Reset mode: ?reset=1 clears all onboarding state ── */
  if (_urlParams.get('reset') === '1') {
    ['islamtime_lang','islamtime_madhab','islamtime_location_asked',
     'islamtime_last_lat','islamtime_last_lon','islamtime_mosques_v1'].forEach(k => localStorage.removeItem(k));
  }

  /* ── Boot sequence ── */
  navigate('screen-splash');

  const langConfirmed = !!localStorage.getItem('islamtime_lang');
  const SPLASH_DURATION = langConfirmed ? 1600 : 2600;

  setTimeout(() => {
    /* Returning user: has saved language → go straight to where they left off.
       Never force Language screen on a user who already completed onboarding. */
    if (langConfirmed) {
      applyLangDir(state.lang);
      const madhab   = localStorage.getItem('islamtime_madhab');
      const locAsked = localStorage.getItem('islamtime_location_asked');
      if (madhab && locAsked) {
        DashboardScreen.update(state.lang);
        navigate('screen-dashboard');
      } else if (madhab) {
        navigate('screen-location');
      } else {
        navigate('screen-mazhab');
      }
      return;
    }

    /* First-time user: auto-apply detected language if it is an active (non-WIP) lang.
       This lets Uzbek/Russian/English speakers skip the Language screen automatically. */
    const detected = _detectLang();
    if (detected && _ACTIVE_LANGS.has(detected)) {
      localStorage.setItem('islamtime_lang', detected);
      applyLangDir(detected);
      state.lang = detected;
      navigate('screen-mazhab');
      return;
    }

    /* Unknown or WIP language → show Language screen to let user pick */
    navigate('screen-language');
  }, SPLASH_DURATION);

})();
