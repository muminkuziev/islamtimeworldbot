/* ================================================================
   IslamTime World — Capacitor Native Bridge
   Loads only in Android/iOS native context (window.Capacitor present)
   ================================================================ */

(function () {
  'use strict';

  const Cap = window.Capacitor;

  /* Not running inside native app — browser mode, skip all */
  if (!Cap?.isNativePlatform()) return;

  const Plugins = Cap.Plugins;
  const {
    App, StatusBar, SplashScreen,
    PushNotifications, Haptics, Network,
    Geolocation,
  } = Plugins;

  /* ── Location permission helper (called by screens that need GPS) ── */
  window._requestLocationPermission = async function () {
    if (!Geolocation) return true; /* no plugin — let navigator.geolocation handle it */
    try {
      const perm = await Geolocation.checkPermissions();
      /* Accept fine OR coarse location */
      if (perm.location === 'granted' || perm.coarseLocation === 'granted') return true;
      /* Always request — even if status is 'denied' (Samsung can mis-report on fresh install) */
      const req = await Geolocation.requestPermissions({
        permissions: ['location', 'coarseLocation'],
      });
      return req.location === 'granted' || req.coarseLocation === 'granted';
    } catch (e) {
      return true; /* fall through to navigator.geolocation */
    }
  };

  /* ── Device ID (stable UUID per install) ────────────────── */
  function _deviceId() {
    let id = localStorage.getItem('islamtime_device_id');
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
      localStorage.setItem('islamtime_device_id', id);
    }
    return id;
  }

  /* ── Status Bar ─────────────────────────────────────────── */
  if (StatusBar) {
    StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#080D1A' }).catch(() => {});
  }

  /* ── Splash Screen ──────────────────────────────────────── */
  if (SplashScreen) {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {}), 2600);
    });
  }

  /* ── Hardware Back Button ───────────────────────────────── */
  if (App) {
    App.addListener('backButton', () => {
      const state = window.App?.state;
      if (!state) { App.exitApp(); return; }

      const HOME = new Set(['screen-dashboard', 'screen-splash', 'screen-language']);
      if (!state.currentScreen || HOME.has(state.currentScreen)) {
        App.exitApp();
      } else {
        window.App.navigate(state._prevScreen || 'screen-dashboard');
      }
    });

    /* Deep Links: islamtimeworld://screen/prayer */
    App.addListener('appUrlOpen', ({ url }) => {
      const match = url.match(/screen[/=]([a-z]+)/i);
      if (match) window.App?.navigate('screen-' + match[1].toLowerCase());
    });

    /* App resume: dispatch event so screens can refresh */
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) document.dispatchEvent(new CustomEvent('islamtime:resume'));
    });
  }

  /* ── Network Status ─────────────────────────────────────── */
  let _isOnline = true;
  if (Network) {
    Network.getStatus().then(s => { _isOnline = s.connected; }).catch(() => {});
    Network.addListener('networkStatusChange', s => {
      _isOnline = s.connected;
      document.dispatchEvent(new CustomEvent('islamtime:network', { detail: s.connected }));
    });
  }

  /* ── FCM Push Notifications ─────────────────────────────── */
  async function _initPush() {
    if (!PushNotifications) return;
    try {
      const perm = await PushNotifications.checkPermissions();
      let granted = perm.receive === 'granted';
      if (!granted && perm.receive !== 'denied') {
        const req = await PushNotifications.requestPermissions();
        granted = req.receive === 'granted';
      }
      if (!granted) return;

      await PushNotifications.register();

      PushNotifications.addListener('registration', ({ value: token }) => {
        localStorage.setItem('islamtime_fcm_token', token);
        _registerDevice(token);
      });

      PushNotifications.addListener('registrationError', err =>
        console.warn('[Push] registration error:', err)
      );

      /* Foreground: navigate to relevant screen */
      PushNotifications.addListener('pushNotificationReceived', notification => {
        const screen = notification.data?.screen;
        if (screen) setTimeout(() => window.App?.navigate('screen-' + screen), 300);
      });

      /* User tapped notification */
      PushNotifications.addListener('pushNotificationActionPerformed', action => {
        const screen = action.notification?.data?.screen;
        if (screen) window.App?.navigate('screen-' + screen);
      });

    } catch (e) {
      console.warn('[Push] init failed:', e);
    }
  }

  /* ── Register device token on server ───────────────────── */
  function _registerDevice(fcmToken) {
    fetch('/api/app/register-device', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: _deviceId(),
        fcm_token: fcmToken,
        lang:      localStorage.getItem('islamtime_lang') || 'uz',
        platform:  Cap.getPlatform?.() || 'android',
      }),
    }).catch(() => {});
  }

  /* ── Haptics (native replacement for Telegram.HapticFeedback) */
  window.IslamHaptics = {
    light:   () => Haptics?.impact({ style: 'LIGHT'  }).catch(() => {}),
    medium:  () => Haptics?.impact({ style: 'MEDIUM' }).catch(() => {}),
    success: () => Haptics?.notification({ type: 'SUCCESS' }).catch(() => {}),
    error:   () => Haptics?.notification({ type: 'ERROR'   }).catch(() => {}),
  };

  /* ── SW → App message relay ─────────────────────────────── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'navigate' && e.data.screen)
        window.App?.navigate('screen-' + e.data.screen);
    });
  }

  /* ── Public API ─────────────────────────────────────────── */
  window.IslamNative = {
    isOnline:       () => _isOnline,
    deviceId:       _deviceId,
    platform:       Cap.getPlatform?.() || 'android',
    initPush:       _initPush,
    registerDevice: _registerDevice,
  };

  /* ── Boot ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => _initPush());

  console.log('[Native] Bridge loaded — platform:', Cap.getPlatform?.());

})();
