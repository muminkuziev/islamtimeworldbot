/* ═══════════════════════════════════════════════════
   Language Selection Screen — v4
   All strings sourced from I18N (i18n.js) — no local
   hardcoded text tables.
   ═══════════════════════════════════════════════════ */

const LanguageScreen = (function () {
  'use strict';

  const TILE = ''; // canonical light surface; no legacy dark pattern

  const WIP_LANGS = new Set();

  let _selected = null;
  let _legacyCode = null;

  /* Use the shared registry and missing-translation policy. */
  function _t(key, lang) {
    return t(key, lang);
  }

  function render() {
    const el = document.getElementById('screen-language');
    if (!el) return;
    /* Pre-select previously saved language so returning users can confirm quickly */
    const saved = localStorage.getItem('islamtime_lang');
    _selected = normalizeLanguage(window.App?.state?.lang || saved);
    _legacyCode = LANG_META.some(l => l.code === _selected && !l.canonical) ? _selected : null;
    el.innerHTML = _buildHTML();
    _bind(el);
  }

  /* ── HTML ─────────────────────────────────────────────────── */
  function _buildHTML() {
    const sel    = LANG_META.find(l => l.code === _selected) || LANG_META[0];
    const selLbl = _t('choose_language', _selected);
    return `
      <div class="ls-wrap" dir="${RTL_LANGS.has(_selected) ? 'rtl' : 'ltr'}">

        <div class="ls-header">
          <div class="ls-tile" style="background-image:url('${TILE}')"></div>
          <div class="ls-ov"></div>
          <div class="ls-hi">
            <div class="ls-botname">IslamTimeWorld</div>
            <div class="ls-subrow">
              <span class="ls-sg" id="ls-sel-lbl">${selLbl}</span>
            </div>
            <div class="ls-divider"></div>
          </div>
        </div>

        <div class="ls-body">
          <div class="ls-grid" id="ls-grid" role="radiogroup" aria-label="${selLbl}">
            ${LANG_META.filter(l => l.canonical || l.code === _legacyCode).map(l => _cardHTML(l)).join('')}
          </div>
        </div>

        <div class="ls-footer">
          <button class="ls-btn" id="ls-btn">
            <span class="ls-btn-lbl" id="ls-btn-lbl">${_t('continue', sel.code)}</span>
            <div class="ls-btn-sep"></div>
            <span class="ls-btn-arr">→</span>
          </button>
        </div>

      </div>`;
  }

  function _cardHTML(l) {
    const wip    = WIP_LANGS.has(l.code);
    const active = !wip && l.code === _selected;
    const subTxt = wip ? _t('comingSoon', _selected) : '';
    return `
      <div class="ls-card${active ? ' ls-card--on' : ''}${wip ? ' ls-card--wip' : ''}" data-code="${l.code}" role="radio" aria-checked="${active}" tabindex="0">
        <div class="ls-flag">${l.flag}</div>
        <div class="ls-name">${l.name}</div>
        <div class="ls-sub">${subTxt}</div>
        <div class="ls-dot${active ? '' : ' ls-dot--off'}"></div>
      </div>`;
  }

  /* ── Events ───────────────────────────────────────────────── */
  function _bind(el) {
    el.querySelectorAll('.ls-card').forEach(card => {
      card.addEventListener('click', () => _pick(card.getAttribute('data-code')));
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        _pick(card.getAttribute('data-code'));
      });
    });
    el.querySelector('#ls-btn').addEventListener('click', _go);
  }

  function _pick(code) {
    if (!code || WIP_LANGS.has(code)) return;
    if (!LANG_META.find(l => l.code === code)) return;
    if (_selected === code) return;
    _selected = code;

    /* Update card selection state */
    document.querySelectorAll('.ls-card').forEach(c => {
      const on = c.dataset.code === code;
      c.classList.toggle('ls-card--on', on);
      c.setAttribute('aria-checked', String(on));
      const dot = c.querySelector('.ls-dot');
      if (dot) dot.classList.toggle('ls-dot--off', !on);
      /* Refresh WIP sub-label in the newly selected language */
      if (WIP_LANGS.has(c.dataset.code)) {
        const sub = c.querySelector('.ls-sub');
        if (sub) sub.textContent = _t('comingSoon', code);
      }
    });

    /* Update header subtitle to reflect selected language */
    const hdr = document.getElementById('ls-sel-lbl');
    if (hdr) hdr.textContent = _t('choose_language', code);
    const wrap = document.querySelector('#screen-language .ls-wrap');
    if (wrap) wrap.setAttribute('dir', RTL_LANGS.has(code) ? 'rtl' : 'ltr');
    const grid = document.getElementById('ls-grid');
    if (grid) grid.setAttribute('aria-label', _t('choose_language', code));

    /* Update Continue button label */
    const lbl = document.getElementById('ls-btn-lbl');
    if (lbl) lbl.textContent = _t('continue', code);

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  function _go() {
    if (!_selected) return;

    if (typeof window.App.setLanguage === 'function') {
      window.App.setLanguage(_selected);
    } else {
      localStorage.setItem('islamtime_lang', _selected);
      applyLangDir(_selected);
      window.App.state.lang = _selected;
    }
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    try {
      window.Telegram?.WebApp?.sendData(JSON.stringify({ action: 'set_language', lang: _selected }));
    } catch (_) {}

    /* Always re-render mazhab with the newly selected language */
    MazhabScreen.render();

    const onboarded = !!localStorage.getItem('islamtime_madhab') &&
                      !!localStorage.getItem('islamtime_location_asked');
    if (onboarded) {
      /* Language changed mid-session (from Settings) — return to dashboard */
      DashboardScreen.update(_selected);
      window.App.navigate('screen-dashboard');
    } else {
      /* First-time onboarding — proceed to mazhab selection */
      window.App.navigate('screen-mazhab');
    }
  }

  return { render };
})();
