/* One calculation preference shared by daily, monthly and Home requests. */
(function () {
  'use strict';
  function get() {
    const stored = localStorage.getItem('islamtime_method') ?? localStorage.getItem('islamtime_prayer_method');
    const value = stored === null ? 3 : Number(stored);
    const method = Number.isInteger(value) && value >= 0 && value <= 23 ? value : 3;
    return { method, school: (localStorage.getItem('islamtime_madhab') || 'hanafi') === 'hanafi' ? 1 : 0 };
  }
  window.PrayerPreferences = {
    get,
    query() { return new URLSearchParams(get()).toString(); },
    key() { const {method, school} = get(); return `${method}:${school}`; },
  };
})();
