/* ═══════════════════════════════════════════════════
   Language Selection Screen
   ═══════════════════════════════════════════════════ */

const LanguageScreen = (function () {

  let _selected = null;

  function render() {
    const el = document.getElementById('screen-language');

    el.innerHTML = `
      <div class="geo-bg"></div>
      <div class="lang-screen">

        <div class="lang-header">
          <img class="lang-logo-sm" src="assets/logo.svg" alt="" draggable="false"/>
          <h1 class="lang-title" id="lang-title-text">Tilni tanlang</h1>
          <p class="lang-subtitle">Select Language &nbsp;·&nbsp; Выберите язык</p>
        </div>

        <div class="lang-body">
          <div class="lang-grid" id="lang-grid">
            ${LANG_META.map(lang => `
              <button
                class="lang-card"
                data-code="${lang.code}"
                ${lang.dir === 'rtl' ? 'dir="rtl"' : ''}
                aria-label="${lang.name}"
              >
                <span class="lang-flag" aria-hidden="true">${lang.flag}</span>
                <span class="lang-name">${lang.name}</span>
                <span class="lang-check" aria-hidden="true">✓</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="lang-footer">
          <button class="btn-primary" id="btn-lang-continue" disabled>
            <span id="btn-continue-label">Davom etish</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

      </div>
    `;

    _bindEvents(el);
  }

  function _bindEvents(el) {
    el.querySelectorAll('.lang-card').forEach(card => {
      card.addEventListener('click', () => _onSelect(card));
    });
    el.querySelector('#btn-lang-continue').addEventListener('click', _onContinue);
  }

  function _onSelect(card) {
    const code = card.dataset.code;

    /* deselect previous */
    document.querySelectorAll('#lang-grid .lang-card').forEach(c =>
      c.classList.remove('selected')
    );

    card.classList.add('selected');
    _selected = code;

    /* update continue button label */
    const btn = document.getElementById('btn-lang-continue');
    btn.disabled = false;
    document.getElementById('btn-continue-label').textContent = t('continue', code);

    /* light haptic */
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  function _onContinue() {
    if (!_selected) return;

    localStorage.setItem('islamtime_lang', _selected);
    applyLangDir(_selected);

    window.App.state.lang = _selected;
    DashboardScreen.update(_selected);

    window.App.navigate('screen-dashboard');

    /* medium haptic */
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');

    /* notify bot about language choice */
    try {
      window.Telegram?.WebApp?.sendData(JSON.stringify({
        action: 'set_language',
        lang: _selected
      }));
    } catch (_) { /* sendData only works inside real Telegram */ }
  }

  return { render };
})();
