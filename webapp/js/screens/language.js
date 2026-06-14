/* ═══════════════════════════════════════════════════
   Language Selection Screen — v2 (KB tile design)
   ═══════════════════════════════════════════════════ */

const LanguageScreen = (function () {
  'use strict';

  const TILE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%230d1829'/%3E%3Cline x1='0' y1='0' x2='60' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Cline x1='60' y1='0' x2='0' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%23F5C542' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E";

  /* 10 languages that are not yet ready — show "jarayonda" when tapped */
  const WIP_LANGS = new Set(['tr','ar','kk','tg','ky','de','fr','id','hi','ur']);

  let _selected = null;

  function render() {
    const el = document.getElementById('screen-language');
    if (!el) return;
    _selected = LANG_META[0].code;
    el.innerHTML = _buildHTML();
    _bind(el);
  }

  /* ── HTML ─────────────────────────────────────────────────── */
  function _buildHTML() {
    const sel = LANG_META.find(l => l.code === _selected) || LANG_META[0];
    return `
      <div class="ls-wrap">

        <div class="ls-header">
          <div class="ls-tile" style="background-image:url('${TILE}')"></div>
          <div class="ls-ov"></div>
          <div class="ls-hi">
            <div class="ls-botname">IslamTimeWorldBot</div>
            <div class="ls-subrow">
              <span class="ls-sg">Tilni tanlang</span>
              <span class="ls-sdot">·</span>
              <span class="ls-sc">Select language</span>
              <span class="ls-sdot">·</span>
              <span class="ls-sa">اختر اللغة</span>
            </div>
            <div class="ls-divider"></div>
          </div>
        </div>

        <div class="ls-body">
          <div class="ls-grid" id="ls-grid">
            ${LANG_META.map(l => _cardHTML(l)).join('')}
          </div>
        </div>

        <div class="ls-footer">
          <button class="ls-btn" id="ls-btn">
            <span class="ls-btn-lbl" id="ls-btn-lbl">${sel.name}</span>
            <div class="ls-btn-sep"></div>
            <span class="ls-btn-arr">→</span>
          </button>
        </div>

        <div class="ls-wip-toast" id="ls-wip-toast"></div>

      </div>`;
  }

  function _cardHTML(l) {
    const a   = l.code === _selected;
    const wip = WIP_LANGS.has(l.code);
    return `
      <div class="ls-card${a ? ' ls-card--on' : ''}${wip ? ' ls-card--wip' : ''}" data-code="${l.code}">
        <div class="ls-flag">${l.flag}</div>
        <div class="ls-name">${l.name}</div>
        <div class="ls-sub">${wip ? '🚧' : (l.sub || '')}</div>
        <div class="ls-dot${a ? '' : ' ls-dot--off'}"></div>
      </div>`;
  }

  /* ── Events ───────────────────────────────────────────────── */
  function _bind(el) {
    el.querySelector('#ls-grid').addEventListener('click', e => {
      const card = e.target.closest('.ls-card');
      if (!card) return;
      _pick(card.dataset.code);
    });
    el.querySelector('#ls-btn').addEventListener('click', _go);
  }

  function _pick(code) {
    if (WIP_LANGS.has(code)) {
      _showWip(code);
      return;
    }
    if (_selected === code) return;
    _selected = code;

    document.querySelectorAll('.ls-card').forEach(c => {
      const on = c.dataset.code === code;
      c.classList.toggle('ls-card--on', on);
      const dot = c.querySelector('.ls-dot');
      if (dot) dot.classList.toggle('ls-dot--off', !on);
    });

    const meta = LANG_META.find(l => l.code === code);
    const lbl  = document.getElementById('ls-btn-lbl');
    if (lbl && meta) lbl.textContent = meta.name;

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  function _go() {
    if (!_selected || WIP_LANGS.has(_selected)) {
      _showWip(_selected);
      return;
    }
    localStorage.setItem('islamtime_lang', _selected);
    applyLangDir(_selected);
    window.App.state.lang = _selected;
    window.App.navigate('screen-mazhab');
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    try {
      window.Telegram?.WebApp?.sendData(JSON.stringify({ action: 'set_language', lang: _selected }));
    } catch (_) {}
  }

  function _showWip(code) {
    const meta = LANG_META.find(l => l.code === code);
    const name = meta ? meta.name : (code || '');
    const toast = document.getElementById('ls-wip-toast');
    if (!toast) return;
    toast.innerHTML = `🚧 <b>${name}</b> — Jarayonda / Coming soon`;
    toast.classList.add('ls-wip-toast--show');
    clearTimeout(toast._wipTid);
    toast._wipTid = setTimeout(() => toast.classList.remove('ls-wip-toast--show'), 2800);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
  }

  return { render };
})();
