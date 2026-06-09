/* ═══════════════════════════════════════════════════
   Dashboard Screen — 10 Modules
   ═══════════════════════════════════════════════════ */

const DashboardScreen = (function () {

  const MODULES = [
    { key: 'prayer',   icon: '🕌', wide: true  },
    { key: 'qibla',    icon: '🧭', wide: false },
    { key: 'mosques',  icon: '📍', wide: false },
    { key: 'quran',    icon: '📖', wide: false },
    { key: 'hadith',   icon: '📚', wide: false },
    { key: 'duas',     icon: '🤲', wide: false },
    { key: 'dhikr',    icon: '❤️', wide: false },
    { key: 'calendar', icon: '📅', wide: false },
    { key: 'names',    icon: '🕋', wide: false },
    { key: 'settings', icon: '⚙️', wide: false },
  ];

  function render() {
    const el = document.getElementById('screen-dashboard');
    const lang = window.App?.state?.lang || 'uz';
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el);
  }

  function update(lang) {
    const el = document.getElementById('screen-dashboard');
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el);
  }

  function _buildHTML(lang) {
    const user      = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const firstName = user?.first_name || 'Guest';
    const flag      = getLangFlag(lang);

    const modulesHTML = MODULES.map(mod => {
      const name = t('modules_list.' + mod.key, lang);

      if (mod.wide) {
        return `
          <div class="module-card prayer-times live" data-module="${mod.key}"
               role="button" tabindex="0">
            <span class="module-icon">${mod.icon}</span>
            <div>
              <div class="module-name">${name}</div>
            </div>
            <span class="module-arrow">›</span>
          </div>
        `;
      }
      return `
        <div class="module-card live" data-module="${mod.key}" role="button" tabindex="0">
          <span class="module-icon">${mod.icon}</span>
          <span class="module-name">${name}</span>
          <span class="module-arrow">›</span>
        </div>
      `;
    }).join('');

    return `
      <div class="geo-bg"></div>
      <div class="dash-screen">

        <div class="dash-header">
          <div class="dash-header-top">
            <div class="dash-logo-title">🕌 IslamTime</div>
            <button class="dash-lang-btn" id="btn-change-lang" aria-label="Change language">
              <span class="dash-lang-flag">${flag}</span>
              <span>${lang.toUpperCase()}</span>
            </button>
          </div>
          <p class="dash-greeting">${t('assalamu', lang)}</p>
          <h2 class="dash-username">${t('welcome', lang)}, <span>${_esc(firstName)}</span> 👋</h2>
        </div>

        <div class="dash-divider"></div>

        <div class="dash-body">
          <p class="dash-section-label">${t('modules', lang)}</p>
          <div class="module-grid">
            ${modulesHTML}
          </div>
        </div>

      </div>
    `;
  }

  function _bindEvents(el) {
    el.querySelector('#btn-change-lang')?.addEventListener('click', () => {
      window.App.navigate('screen-language');
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });

    el.querySelectorAll('.module-card').forEach(card => {
      card.addEventListener('click', () => _onModuleTap(card.dataset.module));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') _onModuleTap(card.dataset.module);
      });
    });
  }

  function _onModuleTap(key) {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    const lang = window.App?.state?.lang || 'uz';

    const SCREEN_MAP = {
      prayer:   () => { PrayerScreen.load(lang);   window.App.navigate('screen-prayer');   },
      qibla:    () => { QiblaScreen.load(lang);    window.App.navigate('screen-qibla');    },
      mosques:  () => { MosquesScreen.load(lang);  window.App.navigate('screen-mosques');  },
      quran:    () => { QuranScreen.load(lang);    window.App.navigate('screen-quran');    },
      hadith:   () => { HadithScreen.load(lang);   window.App.navigate('screen-hadith');   },
      duas:     () => { DuasScreen.load(lang);     window.App.navigate('screen-duas');     },
      dhikr:    () => { DhikrScreen.load(lang);    window.App.navigate('screen-dhikr');    },
      calendar: () => { CalendarScreen.load(lang); window.App.navigate('screen-calendar'); },
      names:    () => { NamesScreen.load(lang);    window.App.navigate('screen-names');    },
      settings: () => { SettingsScreen.load(lang); window.App.navigate('screen-settings'); },
    };

    (SCREEN_MAP[key] || (() => {}))();
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render, update };
})();
