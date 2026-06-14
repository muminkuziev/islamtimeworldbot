/* ═══════════════════════════════════════════════════════════════
   Zikr & Salavot Screen — Premium Tasbeh UI
   ═══════════════════════════════════════════════════════════════ */

const DhikrScreen = (function () {

  const GOLD   = '#E8C15A', GOLDD = '#C49A1E', GOLDL = '#F5D98A';
  const NAVY   = '#09121f';
  const CREAM  = '#e8dfc8';
  const CREAMD = 'rgba(232,223,200,.55)';
  const CREAMM = 'rgba(232,223,200,.28)';
  const GREEN  = '#4fcfa0';
  const RED    = '#e05555';
  const BLUE   = '#5b9bd5';
  const PURPLE = '#c084fc';

  const ZIKIRLAR = [
    { id:'k5', ar:'أَسْتَغْفِرُ اللّٰهُ',            tr:'Astaghfirullah',           uz:"Allohdan mag'firat so'rayman",      uz_cyr:'Аллоҳдан мағфират сўрайман',       ru:'Прошу прощения у Аллаха',          t:100, c:RED,    ms:[33,66,100] },
    { id:'k7', ar:'سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ',  tr:'Subhanallah wa bihamdihi', uz:'Alloh pokdir va hamd Uniki',         uz_cyr:'Аллоҳ покдир ва ҳамд Уники',        ru:'Аллах пречист, и Ему вся хвала',   t:100, c:GREEN,  ms:[33,66,100] },
    { id:'k2', ar:'الْحَمْدُ لِلّٰهِ',               tr:'Alhamdulillah',            uz:'Barcha hamdlar Allohga xos',         uz_cyr:'Барча ҳамдлар Аллоҳга хос',        ru:'Вся хвала принадлежит Аллаху',     t:33,  c:BLUE,   ms:[11,22,33]  },
    { id:'k3', ar:'اللّٰهُ أَكْبَرُ',                tr:'Allahu Akbar',             uz:"Alloh eng Ulug'dir",                 uz_cyr:"Аллоҳ энг Улуғдир",               ru:'Аллах Велик',                      t:34,  c:GOLD,   ms:[17,34]     },
    { id:'k4', ar:'لَا إِلٰهَ إِلَّا اللّٰهُ',       tr:'La ilaha illallah',        uz:"Allohdan boshqa haqiqiy iloh yo'q", uz_cyr:"Аллоҳдан бошқа ҳақиқий илоҳ йўқ", ru:'Нет божества, кроме Аллаха',       t:100, c:PURPLE, ms:[33,66,100] },
  ];

  function _T(lat, cyr, ru, en) { if (_lang === 'uz_cyr') return cyr; if (_lang === 'ru' && ru !== undefined) return ru; if (_lang === 'en' && en !== undefined) return en; return lat; }
  function _zUz(z) { if (_lang === 'uz_cyr') return z.uz_cyr || z.uz; if (_lang === 'ru') return z.ru || z.uz; if (_lang === 'en') return z.uz; return z.uz; }

  const LS      = 'dhikr_counts_v3';
  const LS_PREF = 'dhikr_prefs_v1';

  let _lang     = 'uz';
  let _view     = 'list';
  let _zikr     = null;
  let _cnt      = 0;
  let _vib      = true;
  let _snd      = false;
  let _modal    = null;
  let _audioCtx = null;

  /* ── localStorage ─────────────────────────────────────────────────────── */
  function _counts()   { try { return JSON.parse(localStorage.getItem(LS)||'{}'); } catch { return {}; } }
  function _addCnt(id) { const c=_counts(); c[id]=(c[id]||0)+1; try{localStorage.setItem(LS,JSON.stringify(c));}catch{} }

  function _loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(LS_PREF) || '{}');
      _vib = p.vib !== false;   /* default: true  */
      _snd = p.snd === true;    /* default: false */
    } catch (_) { _vib = true; _snd = false; }
  }
  function _savePrefs() {
    try { localStorage.setItem(LS_PREF, JSON.stringify({ vib: _vib, snd: _snd })); } catch (_) {}
  }

  /* ── Audio (Web Audio API) ─────────────────────────────────────────────── */
  function _getCtx() {
    try {
      if (!_audioCtx || _audioCtx.state === 'closed')
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      return _audioCtx;
    } catch (_) { return null; }
  }

  function _playSound(milestone) {
    const ctx = _getCtx();
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      osc.type = 'sine';
      if (milestone) {
        /* Completion: rising two-tone ding */
        osc.frequency.setValueAtTime(660, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.07);
        osc.frequency.exponentialRampToValueAtTime(660, t + 0.16);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.start(t);
        osc.stop(t + 0.24);
      } else {
        /* Normal tap: soft low click */
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(340, t + 0.07);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    } catch (_) {}
  }

  /* ── Vibration ─────────────────────────────────────────────────────────── */
  function _vibrate(milestone) {
    try {
      if (navigator.vibrate)
        navigator.vibrate(milestone ? [60, 40, 60] : 40);
    } catch (_) {}
  }

  /* ── Entry points ──────────────────────────────────────────────────────── */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _loadPrefs();
    _view = 'list'; _zikr = null; _cnt = 0; _modal = null;
    const el = document.getElementById('screen-dhikr');
    if (!el) return;
    el.innerHTML = _listHTML();
    _bindList(el);
  }

  function load(lang) {
    _lang = lang;
    _loadPrefs();
    const el = document.getElementById('screen-dhikr');
    if (!el) return;
    if (_view === 'tasbeh' && _zikr) { el.innerHTML = _tasbehHTML(); _bindTasbeh(el); }
    else { _view = 'list'; el.innerHTML = _listHTML(); _bindList(el); }
  }

  /* ── List view ─────────────────────────────────────────────────────────── */
  function _listHTML() {
    const counts = _counts();
    const total  = Object.values(counts).reduce((a, b) => a + b, 0);
    const circ   = 2 * Math.PI * 17;

    const rows = ZIKIRLAR.map(z => {
      const cnt  = counts[z.id] || 0;
      const done = cnt >= z.t;
      const dash = (Math.min(cnt / z.t, 1) * circ).toFixed(2);
      return `
        <div class="zk-row${done ? ' zk-row-done' : ''}" data-id="${z.id}" role="button" tabindex="0">
          <div class="zk-mini-ring">
            <svg width="40" height="40" style="transform:rotate(-90deg);position:absolute;inset:0">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3"/>
              <circle cx="20" cy="20" r="17" fill="none"
                stroke="${done ? GREEN : z.c}" stroke-width="3" stroke-linecap="round"
                stroke-dasharray="${dash} ${circ.toFixed(2)}"/>
            </svg>
            <span class="zk-mini-num" style="color:${done ? GREEN : z.c}">${done ? '✓' : cnt}</span>
          </div>
          <div class="zk-info">
            <div class="zk-ar-row${done ? ' zk-done-text' : ''}">${z.ar}</div>
            <div class="zk-tr-row" style="color:${z.c}">${z.tr}</div>
            <div class="zk-sub">×${z.t} · ${done ? '✓ ' + _T('Bajarildi','Бажарилди','Выполнено','Done') : `${z.t - cnt} ${_T('qoldi','қолди','осталось','left')}`}</div>
          </div>
          <div class="zk-row-ico">📿</div>
        </div>`;
    }).join('');

    return `
      <div class="zk-screen">
        <div class="zk-hdr">
          <div class="zk-hdr-tile"></div>
          <div class="zk-hdr-ov"></div>
          <div class="zk-hdr-cnt">
            <div class="zk-hdr-top">
              <button class="zk-back" id="zk-back">← ${_T('Menyu','Меню','Меню','Menu')}</button>
              ${total > 0 ? `<div class="zk-today-badge">
                <span class="zk-today-lbl">${_T('Bugun:','Бугун:','Сегодня:','Today:')}</span>
                <span class="zk-today-num">${total}</span>
              </div>` : '<div></div>'}
            </div>
            <div class="zk-h-title">Zikr &amp; Salavot</div>
            <div class="zk-h-ar">الأذكار والصلاة على النبي</div>
          </div>
        </div>
        <div class="zk-list-body">
          <div class="zk-list-hint">${_T('ZIKRNI BOSING — TASBEH REJIMI OCHILADI','ЗИКРНИ БОСИНГ — ТАСБЕҲ РЕЖИМИ ОЧИЛАДИ','НАЖМИТЕ НА ЗИКР — ОТКРОЕТСЯ РЕЖИМ ТАСБИХ','TAP DHIKR — TASBIH MODE OPENS')}</div>
          ${rows}
        </div>
      </div>`;
  }

  function _bindList(el) {
    el.querySelector('#zk-back')?.addEventListener('click', () => window.App.navigate('screen-dashboard'));
    el.querySelectorAll('.zk-row').forEach(row => {
      row.addEventListener('click', () => {
        _zikr = ZIKIRLAR.find(z => z.id === row.dataset.id);
        _cnt = 0; _modal = null; _view = 'tasbeh';
        el.innerHTML = _tasbehHTML();
        _bindTasbeh(el);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });
  }

  /* ── SVG Ring ──────────────────────────────────────────────────────────── */
  function _ringHTML(cnt, max) {
    const S    = 200;
    const r    = (S - 20) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (Math.min(cnt / max, 1) * circ).toFixed(2);
    return `
      <div style="position:relative;width:${S}px;height:${S}px;flex-shrink:0">
        <div style="position:absolute;inset:-4px;border-radius:50%;
          box-shadow:0 0 40px rgba(232,193,90,.13),0 0 80px rgba(232,193,90,.07);pointer-events:none"></div>
        <svg width="${S}" height="${S}" style="transform:rotate(-90deg);position:absolute;inset:0">
          <defs>
            <linearGradient id="zkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stop-color="${GOLDD}"/>
              <stop offset="50%"  stop-color="${GOLD}"/>
              <stop offset="100%" stop-color="${GOLDL}"/>
            </linearGradient>
            <filter id="zkGlow">
              <feGaussianBlur stdDeviation="3" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="${S/2}" cy="${S/2}" r="${r}" fill="none"
            stroke="rgba(255,255,255,.06)" stroke-width="10"/>
          <circle id="zk-arc" cx="${S/2}" cy="${S/2}" r="${r}" fill="none"
            stroke="url(#zkGrad)" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${dash} ${circ.toFixed(2)}"
            filter="url(#zkGlow)"
            style="transition:stroke-dasharray .25s cubic-bezier(.4,0,.2,1)"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div class="zk-big-num" id="zk-num">${cnt}</div>
          <div style="font-size:16px;color:${CREAMD};margin-top:4px;font-family:'Inter',sans-serif;letter-spacing:-.5px">/ ${max}</div>
        </div>
      </div>`;
  }

  /* ── Milestone Line ────────────────────────────────────────────────────── */
  function _msHTML(cnt, ms, max) {
    const pct    = Math.min(cnt / max * 100, 100).toFixed(1);
    const labels = ms.length === 3 ? [_T('Birinchi','Биринчи','Первый','First'), _T('Ikkinchi','Иккинчи','Второй','Second'), _T('Mukammal','Мукаммал','Отлично','Done')]
                 : ms.length === 2 ? [_T('Yarim','Ярим','Половина','Halfway'), _T('Mukammal','Мукаммал','Отлично','Done')] : [_T('Maqsad','Мақсад','Цель','Goal')];
    const dots = ms.map(m => {
      const p = (m / max * 100).toFixed(1);
      const ok = cnt >= m;
      return `<div style="position:absolute;left:${p}%;top:50%;transform:translate(-50%,-50%);
        width:12px;height:12px;border-radius:50%;z-index:2;transition:all .3s;
        background:${ok ? GOLD : 'rgba(255,255,255,.15)'};
        border:2px solid ${ok ? GOLDL : 'rgba(255,255,255,.2)'};
        box-shadow:${ok ? `0 0 8px ${GOLD}` : 'none'}"></div>`;
    }).join('');
    const lbls = ms.map((m, i) => {
      const p  = (m / max * 100).toFixed(1);
      const ok = cnt >= m;
      return `<div style="position:absolute;left:${p}%;transform:translateX(-50%);text-align:center;top:8px">
        <div style="font-size:8px;font-weight:700;color:${ok?GOLD:CREAMM};font-family:'Inter',sans-serif;white-space:nowrap">${m}</div>
        <div style="font-size:7px;color:${CREAMM};font-family:'Inter',sans-serif;white-space:nowrap">${labels[i]}</div>
      </div>`;
    }).join('');
    return `
      <div style="width:100%;padding:0 4px">
        <div style="position:relative;height:3px;background:rgba(255,255,255,.08);border-radius:2px;margin-bottom:8px">
          <div id="zk-ms-fill" style="position:absolute;left:0;top:0;width:${pct}%;height:100%;
            background:linear-gradient(90deg,${GOLDD},${GOLD});border-radius:2px;transition:width .3s"></div>
          ${dots}
        </div>
        <div style="position:relative;height:22px">${lbls}</div>
      </div>`;
  }

  /* ── Modal ─────────────────────────────────────────────────────────────── */
  function _modalHTML(val, target) {
    const fin = val === target;
    return `
      <div class="zk-modal-bg" id="zk-modal">
        <div class="zk-modal-box" id="zk-modal-box">
          <div class="zk-modal-medal">✅</div>
          <div class="zk-modal-title">${_T('Tabriklaymiz!','Табриклаймиз!','Поздравляем!','Congratulations!')}</div>
          <div class="zk-modal-sub">${fin ? _T('Siz maqsadga yetdingiz!','Сиз мақсадга етдингиз!','Вы достигли цели!','You reached your goal!') : `${_T('Siz','Сиз','Вы','You')} ${val}-${_T('maqsadga yetdingiz!','мақсадга етдингиз!','-я цель достигнута!',' goal reached!')}`}</div>
          <div class="zk-modal-dua">${_T('Alloh qabul qilsin','Аллоҳ қабул қилсин','Да примет Аллах','May Allah accept')} 🤲</div>
          <button class="zk-modal-btn" id="zk-m-cont">${fin ? '✨ ' + _T('Yana bir marta','Яна бир марта','Ещё раз','Again') : '▶ ' + _T('Davom etish','Давом этиш','Продолжить','Continue')}</button>
          ${fin ? `<button class="zk-modal-btn2" id="zk-m-end">✓ ${_T('Tugatish','Тугатиш','Завершить','Finish')}</button>` : ''}
        </div>
      </div>`;
  }

  /* ── Tasbeh view ───────────────────────────────────────────────────────── */
  function _tasbehHTML() {
    if (!_zikr) return '';
    const z    = _zikr;
    const done = _cnt >= z.t;
    const next = z.ms.find(m => _cnt < m) || z.ms[z.ms.length - 1];

    return `
      <div class="zk-screen">
        ${_modal !== null ? _modalHTML(_modal, z.t) : ''}

        <div class="zk-hdr">
          <div class="zk-hdr-tile"></div>
          <div class="zk-hdr-ov"></div>
          <div class="zk-hdr-cnt">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <button class="zk-back" id="zk-tb-back">← ${_T('Orqaga','Орқага','Назад','Back')}</button>
              <div style="font-size:14px;font-weight:800;color:${CREAM};letter-spacing:-.3px;font-family:'Inter',sans-serif">${z.tr}</div>
              <div class="zk-hdr-icon">📖</div>
            </div>
          </div>
        </div>

        <div class="zk-ar-block">
          <div class="zk-ar-big">${z.ar}</div>
          <div class="zk-uz-small">${_zUz(z)}</div>
        </div>

        <div class="zk-ring-row">${_ringHTML(_cnt, z.t)}</div>

        <div class="zk-goal-row">
          <div class="zk-goal-badge">
            <span>🎯</span>
            <span style="font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:${GOLD}">${_T('Maqsad','Мақсад','Цель','Goal')}: ${next}</span>
          </div>
        </div>

        <div class="zk-ms-row">${_msHTML(_cnt, z.ms, z.t)}</div>

        <div class="zk-btns-row">
          <div class="zk-toggle${_vib ? ' zk-on' : ''}" id="zk-vib">
            <span class="zk-tog-ico">${_vib ? '📳' : '🔕'}</span>
            <span class="zk-tog-lbl" style="color:${_vib ? GOLD : CREAMM}">${_vib ? _T('Yoqilgan','Ёқилган','Включено','On') : _T("O'chiq","Ўчиқ","Выключено",'Off')}</span>
          </div>

          <button class="zk-tap${done ? ' zk-tap-done' : ''}" id="zk-tap" ${done ? 'disabled' : ''}>
            <span style="font-size:28px">📿</span>
            <span style="font-family:'Inter',sans-serif;font-size:12px;font-weight:800;letter-spacing:.5px;
              color:${done ? GREEN : NAVY}">${done ? '✅' : _T('TASBEH','ТАСБЕҲ','ТАСБИХ','TASBIH')}</span>
            <span style="font-family:'Inter',sans-serif;font-size:9px;
              color:${done ? GREEN : 'rgba(9,18,31,.6)'}">${done ? _T('Bajarildi','Бажарилди','Выполнено','Done') : _T('Bosish uchun','Босиш учун','Нажмите','Tap to count')}</span>
          </button>

          <div class="zk-toggle${_snd ? ' zk-on' : ''}" id="zk-snd">
            <span class="zk-tog-ico">${_snd ? '🔊' : '🔇'}</span>
            <span class="zk-tog-lbl" style="color:${_snd ? GOLD : CREAMM}">${_snd ? _T('Yoqilgan','Ёқилган','Включено','On') : _T("O'chiq","Ўчиқ","Выключено",'Off')}</span>
          </div>
        </div>

        ${_cnt > 0 && _modal === null
          ? `<button class="zk-reset" id="zk-reset">↺ ${_T('Qayta boshlash','Қайта бошлаш','Начать заново','Start over')}</button>`
          : '<div style="height:16px"></div>'}
      </div>`;
  }

  function _bindTasbeh(el) {
    el.querySelector('#zk-tb-back')?.addEventListener('click', () => {
      _view = 'list'; _zikr = null; _cnt = 0; _modal = null;
      el.innerHTML = _listHTML(); _bindList(el);
    });
    el.querySelector('#zk-tap')?.addEventListener('click', () => _onTap(el));
    el.querySelector('#zk-vib')?.addEventListener('click', () => { _vib = !_vib; _savePrefs(); _rerender(el); });
    el.querySelector('#zk-snd')?.addEventListener('click', () => {
      if (!_snd) _getCtx();   /* init AudioContext on user gesture (browser policy) */
      _snd = !_snd; _savePrefs(); _rerender(el);
    });
    el.querySelector('#zk-reset')?.addEventListener('click', () => {
      _cnt = 0; _modal = null; _rerender(el);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    });
    el.querySelector('#zk-modal')?.addEventListener('click', () => { _modal = null; _rerender(el); });
    el.querySelector('#zk-modal-box')?.addEventListener('click', e => e.stopPropagation());
    el.querySelector('#zk-m-cont')?.addEventListener('click', () => {
      if (_cnt >= _zikr.t) _cnt = 0;
      _modal = null; _rerender(el);
    });
    el.querySelector('#zk-m-end')?.addEventListener('click', () => {
      _cnt = 0; _modal = null; _view = 'list'; _zikr = null;
      el.innerHTML = _listHTML(); _bindList(el);
    });
  }

  /* ── Tap logic ─────────────────────────────────────────────────────────── */
  function _onTap(el) {
    if (!_zikr || _cnt >= _zikr.t) return;
    _cnt++;
    _addCnt(_zikr.id);

    const isMilestone = _zikr.ms.includes(_cnt);

    if (_vib) _vibrate(isMilestone);
    if (_snd) _playSound(isMilestone);

    if (isMilestone) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
      _modal = _cnt;
      _rerender(el);
      return;
    }

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    _updateRing(el);
  }

  function _updateRing(el) {
    const z    = _zikr;
    const r    = (200 - 20) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (Math.min(_cnt / z.t, 1) * circ).toFixed(2);

    const arc = el.querySelector('#zk-arc');
    if (arc) arc.setAttribute('stroke-dasharray', `${dash} ${circ.toFixed(2)}`);

    const num = el.querySelector('#zk-num');
    if (num) { num.textContent = _cnt; num.classList.remove('zk-pop'); void num.offsetWidth; num.classList.add('zk-pop'); }

    const fill = el.querySelector('#zk-ms-fill');
    if (fill) fill.style.width = `${Math.min(_cnt / z.t * 100, 100).toFixed(1)}%`;

    if (_cnt >= z.t) {
      const btn = el.querySelector('#zk-tap');
      if (btn) { btn.disabled = true; btn.classList.add('zk-tap-done'); }
    }
  }

  function _rerender(el) { el.innerHTML = _tasbehHTML(); _bindTasbeh(el); }

  return { render, load };
})();
