/* ═══════════════════════════════════════════════════
   Hijri Calendar Screen
   ═══════════════════════════════════════════════════ */

const CalendarScreen = (function () {

  let _lang     = 'uz';
  let _today    = null; // { gYear, gMonth, gDay, hYear, hMonth, hDay }
  let _viewYear = 0;
  let _viewMonth= 0;

  /* ── Gregorian → Hijri conversion (Kuwaiti algorithm) ── */
  function toHijri(year, month, day) {
    // Julian Day Number
    const jdn = _gregorianToJdn(year, month, day);
    return _jdnToHijri(jdn);
  }

  function _gregorianToJdn(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day
      + Math.floor((153 * m + 2) / 5)
      + 365 * y
      + Math.floor(y / 4)
      - Math.floor(y / 100)
      + Math.floor(y / 400)
      - 32045;
  }

  function _jdnToHijri(jdn) {
    const l = jdn - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor(50 * l2 / 17719)
            + Math.floor(l2 / 5670) * Math.floor(43 * l2 / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50)
             - Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
    const month = Math.floor(24 * l3 / 709);
    const day   = l3 - Math.floor(709 * month / 24);
    const year  = 30 * n + j - 30;
    return { hYear: year, hMonth: month, hDay: day };
  }

  function _hijriDaysInMonth(year, month) {
    // Hijri months alternate 30/29 days; Dhul-Hijja may have 30 on leap years
    const leap = ((((11 * year) + 14) % 30) < 11);
    if (month === 12 && leap) return 30;
    return month % 2 === 1 ? 30 : 29;
  }

  function _hijriToJdn(year, month, day) {
    return day
      + Math.ceil(29.5 * (month - 1))
      + (year - 1) * 354
      + Math.floor((3 + 11 * year) / 30)
      + 1948440 - 385;
  }

  function _jdnToGregorian(jdn) {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor(146097 * b / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day   = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year  = 100 * b + d - 4800 + Math.floor(m / 10);
    return { gYear: year, gMonth: month, gDay: day };
  }

  function render() {
    const el = document.getElementById('screen-calendar');
    if (!el) return;
    _init();
    el.innerHTML = _buildHTML();
    _bindEvents(el);
  }

  function load(lang) {
    _lang = lang;
    _init();
    const el = document.getElementById('screen-calendar');
    if (!el) return;
    el.innerHTML = _buildHTML();
    _bindEvents(el);
  }

  function _init() {
    _lang = window.App?.state?.lang || _lang;
    const now = new Date();
    const h = toHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    _today = {
      gYear: now.getFullYear(), gMonth: now.getMonth() + 1, gDay: now.getDate(),
      hYear: h.hYear, hMonth: h.hMonth, hDay: h.hDay
    };
    _viewYear  = _today.hYear;
    _viewMonth = _today.hMonth;
  }

  function _buildHTML() {
    const lang = _lang;
    const months = t('calendar_hijri_months', lang);
    const monthName = Array.isArray(months) ? (months[_viewMonth - 1] || '') : '';
    const weekDays  = t('calendar_week_days', lang);

    const todayHijri = `${_today.hDay} ${Array.isArray(months) ? months[_today.hMonth - 1] : ''} ${_today.hYear}`;
    const todayGreg  = `${_today.gDay}.${String(_today.gMonth).padStart(2,'0')}.${_today.gYear}`;

    // Build calendar grid
    const daysInMonth = _hijriDaysInMonth(_viewYear, _viewMonth);
    // Find weekday of 1st day: convert Hijri 1st to JDN, then JDN mod 7
    const firstJdn   = _hijriToJdn(_viewYear, _viewMonth, 1);
    const startWday  = ((firstJdn + 1) % 7); // 0=Sun

    let cells = '';
    for (let i = 0; i < startWday; i++) {
      cells += `<div class="cal-cell empty"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const jdn  = _hijriToJdn(_viewYear, _viewMonth, d);
      const greg = _jdnToGregorian(jdn);
      const isToday = (_viewYear === _today.hYear && _viewMonth === _today.hMonth && d === _today.hDay);
      const eventKey = `${_viewMonth}/${d}`;
      const events = (typeof I18N !== 'undefined' && I18N.calendar_islamic_events)
                     ? I18N.calendar_islamic_events[eventKey] : null;
      const hasEvent = !!events;

      cells += `
        <div class="cal-cell${isToday ? ' today' : ''}${hasEvent ? ' has-event' : ''}"
             data-hday="${d}" data-gday="${greg.gDay}" data-gmonth="${greg.gMonth}" data-gyear="${greg.gYear}"
             title="${hasEvent ? (events.en || '') : ''}">
          <span class="cal-hday">${d}</span>
          <span class="cal-gday">${greg.gDay}</span>
          ${hasEvent ? '<span class="cal-dot"></span>' : ''}
        </div>
      `;
    }

    // Upcoming Islamic events
    let eventsHTML = '';
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 30; d++) {
        const key = `${m}/${d}`;
        const ev  = (typeof I18N !== 'undefined' && I18N.calendar_islamic_events) ? I18N.calendar_islamic_events[key] : null;
        if (ev) {
          const emonths = t('calendar_hijri_months', lang);
          const mname   = Array.isArray(emonths) ? emonths[m-1] : '';
          const evName  = ev[lang] || ev['en'] || '';
          eventsHTML += `
            <div class="cal-event-row">
              <span class="cal-event-date">${d} ${mname}</span>
              <span class="cal-event-name">${evName}</span>
            </div>
          `;
        }
      }
    }

    const wdArr = Array.isArray(weekDays) ? weekDays : ['Su','Mo','Tu','We','Th','Fr','Sa'];

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="cal-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">📅 ${t('modules_list.calendar', lang)}</h1>
        </div>

        <div class="cal-body">
          <!-- Today card -->
          <div class="cal-today-card">
            <div class="cal-today-label">${t('calendar_today', lang)}</div>
            <div class="cal-today-hijri">${todayHijri} AH</div>
            <div class="cal-today-greg">${todayGreg}</div>
          </div>

          <!-- Month navigator -->
          <div class="cal-nav">
            <button class="cal-nav-btn" id="cal-prev">‹</button>
            <div class="cal-nav-title">
              <div class="cal-nav-month">${monthName}</div>
              <div class="cal-nav-year">${_viewYear} AH</div>
            </div>
            <button class="cal-nav-btn" id="cal-next">›</button>
          </div>

          <!-- Week day headers -->
          <div class="cal-week-row">
            ${wdArr.map(d => `<div class="cal-wd">${d}</div>`).join('')}
          </div>

          <!-- Day grid -->
          <div class="cal-grid" id="cal-grid">
            ${cells}
          </div>

          <!-- Selected day detail -->
          <div class="cal-detail" id="cal-detail" style="display:none"></div>

          <!-- Islamic events list -->
          <div class="cal-events-section">
            <div class="cal-events-title">✨ Islamic Calendar Events</div>
            ${eventsHTML}
          </div>
        </div>
      </div>
    `;
  }

  function _bindEvents(el) {
    el.querySelector('#cal-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    el.querySelector('#cal-prev')?.addEventListener('click', () => {
      _viewMonth--;
      if (_viewMonth < 1) { _viewMonth = 12; _viewYear--; }
      _refresh(el);
    });

    el.querySelector('#cal-next')?.addEventListener('click', () => {
      _viewMonth++;
      if (_viewMonth > 12) { _viewMonth = 1; _viewYear++; }
      _refresh(el);
    });

    el.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => {
      cell.addEventListener('click', () => {
        el.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        _showDetail(el, cell);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
  }

  function _showDetail(el, cell) {
    const hDay   = parseInt(cell.dataset.hday);
    const gDay   = cell.dataset.gday;
    const gMonth = cell.dataset.gmonth;
    const gYear  = cell.dataset.gyear;
    const months = t('calendar_hijri_months', _lang);
    const mname  = Array.isArray(months) ? months[_viewMonth - 1] : '';

    const eventKey = `${_viewMonth}/${hDay}`;
    const events   = (typeof I18N !== 'undefined' && I18N.calendar_islamic_events)
                     ? I18N.calendar_islamic_events[eventKey] : null;
    const evName   = events ? (events[_lang] || events['en'] || '') : '';

    const detail = el.querySelector('#cal-detail');
    detail.style.display = 'block';
    detail.innerHTML = `
      <div class="cal-detail-hijri">${hDay} ${mname} ${_viewYear} AH</div>
      <div class="cal-detail-greg">${gDay}.${String(gMonth).padStart(2,'0')}.${gYear}</div>
      ${evName ? `<div class="cal-detail-event">✨ ${evName}</div>` : ''}
    `;
  }

  function _refresh(el) {
    el.innerHTML = _buildHTML();
    _bindEvents(el);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  return { render, load };
})();
