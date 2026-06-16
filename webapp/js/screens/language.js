/* ═══════════════════════════════════════════════════
   Language Selection Screen — v3
   ═══════════════════════════════════════════════════ */

const LanguageScreen = (function () {
  'use strict';

  const TILE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%230d1829'/%3E%3Cline x1='0' y1='0' x2='60' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Cline x1='60' y1='0' x2='0' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%23F5C542' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E";

  /* Active: uz, uz_cyr, ru, en — rest temporarily disabled */
  const WIP_LANGS = new Set(['tr','ar','kk','tg','ky','de','fr','id','hi','ur']);

  /* "Select language" in all 14 languages */
  const SELECT_LABELS = {
    uz:     'Tilni tanlang',
    uz_cyr: 'Тилни танланг',
    en:     'Select language',
    ru:     'Выберите язык',
    tr:     'Dil seçin',
    ar:     'اختر اللغة',
    kk:     'Тілді таңдаңыз',
    tg:     'Забонро интихоб кунед',
    ky:     'Тилди тандаңыз',
    de:     'Sprache wählen',
    fr:     'Choisir la langue',
    id:     'Pilih bahasa',
    hi:     'भाषा चुनें',
    ur:     'زبان منتخب کریں',
  };

  /* "Continue" in all 14 languages */
  const CONTINUE_LABELS = {
    uz:     'Davom etish',
    uz_cyr: 'Давом этиш',
    en:     'Continue',
    ru:     'Продолжить',
    tr:     'Devam et',
    ar:     'المتابعة',
    kk:     'Жалғастыру',
    tg:     'Идома додан',
    ky:     'Улантуу',
    de:     'Weiter',
    fr:     'Continuer',
    id:     'Lanjutkan',
    hi:     'जारी रखें',
    ur:     'جاری رکھیں',
  };

  let _selected = null;

  function render() {
    const el = document.getElementById('screen-language');
    if (!el) return;
    /* Pre-select previously saved language so returning users can confirm quickly */
    const saved = localStorage.getItem('islamtime_lang');
    _selected = (saved && LANG_META.find(l => l.code === saved)) ? saved : LANG_META[0].code;
    el.innerHTML = _buildHTML();
    _bind(el);
  }

  /* ── HTML ─────────────────────────────────────────────────── */
  function _buildHTML() {
    const sel    = LANG_META.find(l => l.code === _selected) || LANG_META[0];
    const selLbl = SELECT_LABELS[_selected] || SELECT_LABELS.en;
    return `
      <div class="ls-wrap">

        <div class="ls-header">
          <div class="ls-tile" style="background-image:url('${TILE}')"></div>
          <div class="ls-ov"></div>
          <div class="ls-hi">
            <div class="ls-botname">IslamTimeWorldBot</div>
            <div class="ls-subrow">
              <span class="ls-sg" id="ls-sel-lbl">${selLbl}</span>
              <span class="ls-sdot">·</span>
              <span class="ls-sc">${SELECT_LABELS.en}</span>
              <span class="ls-sdot">·</span>
              <span class="ls-sa">${SELECT_LABELS.ar}</span>
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
            <span class="ls-btn-lbl" id="ls-btn-lbl">${CONTINUE_LABELS[sel.code] || sel.name}</span>
            <div class="ls-btn-sep"></div>
            <span class="ls-btn-arr">→</span>
          </button>
        </div>

      </div>`;
  }

  function _cardHTML(l) {
    const wip    = WIP_LANGS.has(l.code);
    const active = !wip && l.code === _selected;
    return `
      <div class="ls-card${active ? ' ls-card--on' : ''}${wip ? ' ls-card--wip' : ''}" data-code="${l.code}">
        <div class="ls-flag">${l.flag}</div>
        <div class="ls-name">${l.name}</div>
        <div class="ls-sub">${wip ? 'tez kunda' : (l.sub || '')}</div>
        <div class="ls-dot${active ? '' : ' ls-dot--off'}"></div>
      </div>`;
  }

  /* ── Events ───────────────────────────────────────────────── */
  function _bind(el) {
    el.querySelectorAll('.ls-card').forEach(card => {
      card.addEventListener('click', () => _pick(card.getAttribute('data-code')));
    });
    el.querySelector('#ls-btn').addEventListener('click', _go);
  }

  function _pick(code) {
    console.log('Language selected:', code);
    if (!code || WIP_LANGS.has(code)) return;
    if (!LANG_META.find(l => l.code === code)) return;
    if (_selected === code) return;
    _selected = code;

    /* Update card selection state */
    document.querySelectorAll('.ls-card').forEach(c => {
      const on = c.dataset.code === code;
      c.classList.toggle('ls-card--on', on);
      const dot = c.querySelector('.ls-dot');
      if (dot) dot.classList.toggle('ls-dot--off', !on);
    });

    /* Update header subtitle to reflect selected language */
    const hdr = document.getElementById('ls-sel-lbl');
    if (hdr) hdr.textContent = SELECT_LABELS[code] || SELECT_LABELS.en;

    /* Update Continue button label */
    const meta = LANG_META.find(l => l.code === code);
    const lbl  = document.getElementById('ls-btn-lbl');
    if (lbl && meta) lbl.textContent = CONTINUE_LABELS[code] || meta.name;

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  function _go() {
    if (!_selected) return;

    localStorage.setItem('islamtime_lang', _selected);
    applyLangDir(_selected);
    window.App.state.lang = _selected;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    try {
      window.Telegram?.WebApp?.sendData(JSON.stringify({ action: 'set_language', lang: _selected }));
    } catch (_) {}

    /* After language selection always proceed to Madhab — never skip onboarding */
    window.App.navigate('screen-mazhab');
  }

  return { render };
})();
