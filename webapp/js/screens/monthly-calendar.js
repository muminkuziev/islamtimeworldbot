/* ═══════════════════════════════════════════════════════════════
   Oylik namoz taqvimi — Monthly Prayer Calendar
   Placement: Namoz → Oylik namoz taqvimi

   Reuses the exact same calculation service as the daily Prayer Times
   screen via GET /api/prayer-times/month (domain/prayer/service.py's
   get_monthly_prayer_data) — same location, same calculation method,
   never a second independent calculation.
   ═══════════════════════════════════════════════════════════════ */

const MonthlyCalendarScreen = (function () {

  let _lang = 'uz';
  let _month = new Date().getMonth() + 1;
  let _year = new Date().getFullYear();
  let _lat = null, _lon = null;

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }

  const MONTH_NAMES = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    uz: ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'],
  };

  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _loadLocation();
    const el = document.getElementById('screen-monthly-calendar');
    if (!el) return;
    el.innerHTML = _shellHTML();
    _bind(el);
    _load(el);
  }

  function load(lang) {
    _lang = lang;
    _loadLocation();
    const el = document.getElementById('screen-monthly-calendar');
    if (!el) return;
    el.innerHTML = _shellHTML();
    _bind(el);
    _load(el);
  }

  function _loadLocation() {
    try {
      _lat = parseFloat(localStorage.getItem('islamtime_last_lat'));
      _lon = parseFloat(localStorage.getItem('islamtime_last_lon'));
    } catch {}
  }

  function _monthLabel() {
    const names = MONTH_NAMES[_lang] || MONTH_NAMES.en;
    return `${names[_month - 1]} ${_year}`;
  }

  function _shellHTML() {
    return `
      <div class="mc-screen">
        <div class="mc-header">
          <button class="mc-back" id="mc-back">← ${_T('Namoz','Намоз','Намаз','Prayer')}</button>
          <div class="mc-title">${_T('Oylik namoz taqvimi','Ойлик намоз тақвими','Месячный календарь намазов','Monthly Prayer Calendar')}</div>
        </div>
        <div class="mc-month-nav">
          <button class="mc-nav-btn" id="mc-prev">‹</button>
          <div class="mc-month-label" id="mc-month-label">${_monthLabel()}</div>
          <button class="mc-nav-btn" id="mc-next">›</button>
        </div>
        <div id="mc-body" class="mc-body">
          <div class="mc-loading">${_T('Yuklanmoqda…','Юкланмоқда…','Загрузка…','Loading…')}</div>
        </div>
      </div>`;
  }

  async function _load(el) {
    const body = el.querySelector('#mc-body');
    const label = el.querySelector('#mc-month-label');
    if (label) label.textContent = _monthLabel();
    if (!_lat || !_lon || isNaN(_lat) || isNaN(_lon)) {
      body.innerHTML = `<div class="mc-error">⚠️ ${_T(
        "Joylashuv topilmadi. Namoz vaqtlari ekranida joylashuvni tanlang.",
        "Жойлашув топилмади. Намоз вақтлари экранида жойлашувни танланг.",
        'Местоположение не найдено. Выберите его на экране времени намаза.',
        'Location not found. Set your location on the Prayer Times screen.'
      )}</div>`;
      return;
    }
    body.innerHTML = `<div class="mc-loading">${_T('Yuklanmoqda…','Юкланмоқда…','Загрузка…','Loading…')}</div>`;
    try {
      const r = await fetch(`/api/prayer-times/month?lat=${_lat}&lon=${_lon}&month=${_month}&year=${_year}&lang=${_lang}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      body.innerHTML = _tableHTML(d);
    } catch {
      body.innerHTML = `<div class="mc-error">⚠️ ${_T(
        "Yuklab bo'lmadi. Qayta urinib ko'ring.", "Юклаб бўлмади. Қайта уриниб кўринг.",
        'Не удалось загрузить. Попробуйте снова.', "Couldn't load. Try again."
      )}</div>`;
    }
  }

  function _timeFor(day, key) {
    const p = day.prayers.find(x => x.key === key);
    return p ? p.time : '--:--';
  }

  function _tableHTML(d) {
    const todayStr = new Date().toISOString().slice(0, 10).split('-').reverse().join('-');
    const rows = d.days.map(day => {
      const isToday = day.gregorian_date === todayStr;
      return `
        <tr class="${isToday ? 'mc-row-today' : ''}">
          <td class="mc-cell-date">${day.gregorian_date.slice(0, 5)}<span class="mc-cell-hijri">${day.hijri_day}</span></td>
          <td>${_timeFor(day, 'Fajr')}</td>
          <td>${_timeFor(day, 'Sunrise')}</td>
          <td>${_timeFor(day, 'Dhuhr')}</td>
          <td>${_timeFor(day, 'Asr')}</td>
          <td>${_timeFor(day, 'Maghrib')}</td>
          <td>${_timeFor(day, 'Isha')}</td>
        </tr>`;
    }).join('');

    return `
      <div class="mc-loc">📍 ${_esc(d.city || '')}</div>
      <div class="mc-table-wrap">
        <table class="mc-table">
          <thead>
            <tr>
              <th>${_T('Sana','Сана','Дата','Date')}</th>
              <th>${_T('Bomdod','Бомдод','Фаджр','Fajr')}</th>
              <th>${_T('Quyosh','Қуёш','Восход','Sunrise')}</th>
              <th>${_T('Peshin','Пешин','Зухр','Dhuhr')}</th>
              <th>${_T('Asr','Аср','Аср','Asr')}</th>
              <th>${_T('Shom','Шом','Магриб','Maghrib')}</th>
              <th>${_T('Xufton','Хуфтон','Иша','Isha')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function _bind(el) {
    el.querySelector('#mc-back')?.addEventListener('click', () => window.App.navigate('screen-prayer'));
    el.querySelector('#mc-prev')?.addEventListener('click', () => {
      _month--; if (_month < 1) { _month = 12; _year--; }
      _load(el);
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    });
    el.querySelector('#mc-next')?.addEventListener('click', () => {
      _month++; if (_month > 12) { _month = 1; _year++; }
      _load(el);
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    });
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  return { render, load };
})();
