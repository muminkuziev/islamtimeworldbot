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
    try { tg.setHeaderColor('#080D1A'); }    catch (_) {}
    try { tg.setBackgroundColor('#080D1A'); } catch (_) {}
  }

  /* Allow passive touch scroll in WebView */
  document.addEventListener('touchmove', function () {}, { passive: true });

  /* ── URL parameters (read once at load) ── */
  const _urlParams   = new URLSearchParams(window.location.search);
  const _isStartFlow = _urlParams.get('start') === '1';

  /* ── App State ── */
  const state = {
    lang:          localStorage.getItem('islamtime_lang') || _detectLang(),
    user:          tg?.initDataUnsafe?.user || null,
    currentScreen: null,
    _prevScreen:   null,
  };

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

    if (current) {
      current.classList.add('exit');
      current.classList.remove('active');
      setTimeout(() => current.classList.remove('exit'), 380);
    }

    next.classList.add('active');

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

  /* ── Auto-detect language from Telegram user ── */
  function _detectLang() {
    const tgLang = tg?.initDataUnsafe?.user?.language_code || '';
    const map = {
      uz: 'uz', ru: 'ru', en: 'en', ar: 'ar',
      tr: 'tr', de: 'de', fr: 'fr',
      kk: 'kk', id: 'id', hi: 'hi', ur: 'ur',
      ky: 'ky', tg: 'tg',
    };
    return map[tgLang] || null;
  }

  /* ── Expose global App API ── */
  window.App = { navigate, state };

  /* ── Render all screen shells (builds initial DOM) ── */
  SplashScreen.render();
  LanguageScreen.render();
  MazhabScreen.render();
  LocationScreen.render();
  PrayerScreen.render();
  QiblaScreen.render();
  MosquesScreen.render();
  QuranScreen.render();
  HadithScreen.render();
  DuasScreen.render();
  DhikrScreen.render();
  CalendarScreen.render();
  NamesScreen.render();
  SettingsScreen.render();
  DashboardScreen.render();

  /* ── Reset mode: ?reset=1 clears all onboarding state ── */
  if (_urlParams.get('reset') === '1') {
    ['islamtime_lang','islamtime_madhab','islamtime_location_asked',
     'islamtime_last_lat','islamtime_last_lon','islamtime_mosques_v1'].forEach(k => localStorage.removeItem(k));
  }

  /* ── Boot sequence ── */
  navigate('screen-splash');

  const langConfirmed   = !!localStorage.getItem('islamtime_lang');
  /* Shorter splash for returning users; first-timers see full animation */
  const SPLASH_DURATION = langConfirmed ? 1600 : 2600;

  setTimeout(() => {
    /* ?start=1 → user pressed the /start button: always show Language screen.
       This ensures Language Selection is never bypassed regardless of cached state. */
    if (_isStartFlow || !langConfirmed) {
      navigate('screen-language');
      return;
    }

    /* Direct webapp access (no ?start=1): restore previous session normally */
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
  }, SPLASH_DURATION);

})();
