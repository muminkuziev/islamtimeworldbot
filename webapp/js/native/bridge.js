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
    PushNotifications, LocalNotifications, Haptics, Network,
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
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    StatusBar.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
    StatusBar.setBackgroundColor({ color: dark ? '#091714' : '#FFFFFF' }).catch(() => {});
    Plugins.SystemAppearance?.setTheme({ dark }).catch(() => {});
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
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;
    fetch('/api/app/register-device', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: _deviceId(),
        fcm_token: fcmToken,
        lang:      localStorage.getItem('islamtime_lang') || 'uz',
        platform:  Cap.getPlatform?.() || 'android',
        user_id:   userId,
      }),
    }).catch(() => {});
  }

  /* ── Local prayer notifications ─────────────────────── */
  async function _cancelPrayerNotifications() {
    if (!LocalNotifications) return;
    try {
      await LocalNotifications.cancel({ notifications: [5101,5102,5103,5104,5105].map(id => ({ id })) });
    } catch (_) {}
  }

  let _lastSchedule = null; // so a mode change elsewhere can reschedule
  async function _schedulePrayerNotifications(prayers, timing, mode) {
    if (!LocalNotifications || !Array.isArray(prayers)) return;
    _lastSchedule = { prayers, timing };
    await _cancelPrayerNotifications();
    try {
      const perm = await LocalNotifications.checkPermissions();
      let allowed = perm.display === 'granted';
      if (!allowed && perm.display !== 'denied') {
        const req = await LocalNotifications.requestPermissions();
        allowed = req.display === 'granted';
      }
      if (!allowed) return;

      const channelId = 'itw_' + (['silent','sound','vibrate','adhan'].includes(mode) ? mode : 'sound');
      const now = new Date();
      const list = prayers.filter(p => p && p.key !== 'sunrise' && /^\d{2}:\d{2}$/.test(p.time || ''));
      const notifications = [];
      list.slice(0,5).forEach((p, i) => {
        const [h,m] = p.time.split(':').map(Number);
        const at = new Date(now);
        at.setHours(h, m, 0, 0);
        at.setMinutes(at.getMinutes() + Number(timing?.[p.key] || 0));
        if (at <= now) return;
        notifications.push({
          id: 5101 + i,
          title: 'IslamTimeWorld · ' + (p.name || p.key),
          body: (p.name || p.key) + ' · ' + p.time,
          schedule: { at },
          channelId,
          smallIcon: 'ic_notification',
          iconColor: '#16794A',
          extra: { screen: 'prayer', prayer: p.key, mode }
        });
      });
      if (notifications.length) await LocalNotifications.schedule({ notifications });
    } catch (e) {
      console.warn('[LocalNotifications] schedule failed:', e);
    }
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
  function _setNotificationMode(mode) {
    if (!['silent','sound','vibrate','adhan'].includes(mode)) return;
    localStorage.setItem('islamtime_notification_mode', mode);
    // Android binds sound/vibration to the channel chosen at schedule time.
    if (_lastSchedule) _schedulePrayerNotifications(_lastSchedule.prayers, _lastSchedule.timing, mode);
  }

  window.IslamNative = {
    isOnline:            () => _isOnline,
    deviceId:            _deviceId,
    platform:            Cap.getPlatform?.() || 'android',
    initPush:            _initPush,
    registerDevice:              _registerDevice,
    setNotificationMode:         _setNotificationMode,
    schedulePrayerNotifications: _schedulePrayerNotifications,
    cancelPrayerNotifications:   _cancelPrayerNotifications,
  };

  /* ── Boot ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => _initPush());

  console.log('[Native] Bridge loaded — platform:', Cap.getPlatform?.());

})();
