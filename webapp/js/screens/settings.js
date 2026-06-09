/* ═══════════════════════════════════════════════════
   Settings Screen
   ═══════════════════════════════════════════════════ */

const SettingsScreen = (function () {

  const PRAYER_METHODS = [
    { id: 3,  name_en: 'Muslim World League',        name_uz: "Musulmon Jahon Ligasi" },
    { id: 1,  name_en: 'University of Islamic Sciences, Karachi', name_uz: "Karachi Islom Universiteti" },
    { id: 2,  name_en: 'Islamic Society of North America (ISNA)', name_uz: "Shimoliy Amerika Islom Jamiyati" },
    { id: 4,  name_en: 'Umm al-Qura, Makkah',        name_uz: "Umm al-Qura (Makka)" },
    { id: 5,  name_en: 'Egyptian General Authority', name_uz: "Misr Bosh Idorasi" },
    { id: 13, name_en: 'Diyanet, Turkey',             name_uz: "Diyanet, Turkiya" },
    { id: 14, name_en: 'UOIF, France',                name_uz: "UOIF, Fransiya" },
    { id: 12, name_en: 'JAKIM, Malaysia',             name_uz: "JAKIM, Malayziya" },
    { id: 11, name_en: 'Majlis Ugama, Singapore',     name_uz: "Singapur" },
  ];

  const MADHABS = ['hanafi','shafii','maliki','hanbali'];

  function render() {
    const el = document.getElementById('screen-settings');
    if (!el) return;
    const lang = window.App?.state?.lang || 'uz';
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el, lang);
  }

  function load(lang) {
    const el = document.getElementById('screen-settings');
    if (!el) return;
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el, lang);
  }

  function _buildHTML(lang) {
    const curLang   = lang;
    const curMethod = parseInt(localStorage.getItem('islamtime_method') || '3');
    const curMadhab = localStorage.getItem('islamtime_madhab') || 'hanafi';

    const flagsHTML = (typeof LANG_META !== 'undefined' ? LANG_META : []).map(lm => `
          <div class="set-lang-btn${lm.code === curLang ? ' active' : ''}"
               data-lang="${lm.code}" role="button" tabindex="0">
            <span class="set-lang-flag">${lm.flag}</span>
            <span class="set-lang-code">${lm.code.toUpperCase()}</span>
            <span class="set-lang-name">${lm.name}</span>
          </div>
        `).join('');

    const methodsHTML = PRAYER_METHODS.map(m => `
      <option value="${m.id}" ${m.id === curMethod ? 'selected' : ''}>${m.name_en}</option>
    `).join('');

    const madhabhHTML = MADHABS.map(key => `
      <button class="set-madhab-btn${curMadhab === key ? ' active' : ''}" data-madhab="${key}">
        ${t('settings_' + key, lang)}
      </button>
    `).join('');

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="set-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">⚙️ ${t('modules_list.settings', lang)}</h1>
        </div>

        <div class="set-body">

          <!-- Language -->
          <div class="set-section">
            <div class="set-section-label">🌐 ${t('settings_language', lang)}</div>
            <div class="set-lang-grid" id="set-lang-grid">
              ${flagsHTML}
            </div>
          </div>

          <!-- Prayer method -->
          <div class="set-section">
            <div class="set-section-label">🕌 ${t('settings_prayer_method', lang)}</div>
            <select class="set-select" id="set-method">
              ${methodsHTML}
            </select>
          </div>

          <!-- Madhab -->
          <div class="set-section">
            <div class="set-section-label">📚 ${t('settings_madhab', lang)}</div>
            <div class="set-madhab-row" id="set-madhab-row">
              ${madhabhHTML}
            </div>
          </div>

          <!-- Save -->
          <button class="set-save-btn" id="set-save">
            ${t('save', lang)}
          </button>

          <div id="set-saved-msg" class="set-saved-msg" style="display:none">
            ${t('settings_saved', lang)}
          </div>

        </div>
      </div>
    `;
  }

  function _bindEvents(el, lang) {
    el.querySelector('#set-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    /* Language selection */
    el.querySelectorAll('.set-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.set-lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });

    /* Madhab selection */
    el.querySelectorAll('.set-madhab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.set-madhab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });

    /* Save */
    el.querySelector('#set-save')?.addEventListener('click', () => _save(el, lang));
  }

  function _save(el, _lang) {
    const langBtn  = el.querySelector('.set-lang-btn.active');
    const methodEl = el.querySelector('#set-method');
    const madhab   = el.querySelector('.set-madhab-btn.active')?.dataset?.madhab || 'hanafi';

    const newLang   = langBtn?.dataset?.lang || window.App?.state?.lang || 'uz';
    const newMethod = parseInt(methodEl?.value || '3');

    localStorage.setItem('islamtime_lang',   newLang);
    localStorage.setItem('islamtime_method', String(newMethod));
    localStorage.setItem('islamtime_madhab', madhab);

    if (window.App?.state) window.App.state.lang = newLang;
    applyLangDir(newLang);

    DashboardScreen.update(newLang);

    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');

    const msg = el.querySelector('#set-saved-msg');
    if (msg) {
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 2000);
    }
  }

  return { render, load };
})();
