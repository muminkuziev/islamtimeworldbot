/* ═══════════════════════════════════════════════════════════════
   Boshqalar (Others) — hub screen for secondary modules
   ═══════════════════════════════════════════════════════════════ */

const OthersScreen = (function () {

  let _lang = 'uz';

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }

  const ITEMS = [
    {
      id: 'shahodat', icon: '☝️',
      label: () => _T('Shahodat va Kalimalar','Шаҳодат ва Калималар','Шахада и Калимы','Shahodat & Kalimas'),
      open: (lang) => { ShahodatScreen.load(lang); window.App.navigate('screen-shahodat'); },
    },
    {
      id: 'names', icon: '📿',
      label: () => _T("Allohning 99 ismi","Аллоҳнинг 99 исми",'99 имён Аллаха','99 Names of Allah'),
      open: (lang) => { NamesScreen.load(lang); window.App.navigate('screen-names'); },
    },
    {
      id: 'settings', icon: '⚙️',
      label: () => _T('Sozlamalar','Созламалар','Настройки','Settings'),
      open: (lang) => { SettingsScreen.load(lang); window.App.navigate('screen-settings'); },
    },
  ];

  function render() {
    _lang = window.App?.state?.lang || 'uz';
    const el = document.getElementById('screen-others');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-others');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
  }

  function _html() {
    const rows = ITEMS.map(it => `
      <button class="ot-row" data-id="${it.id}">
        <span class="ot-row-icon">${it.icon}</span>
        <span class="ot-row-label">${it.label()}</span>
        <span class="ot-row-chev">›</span>
      </button>`).join('');

    return `
      <div class="ot-screen">
        <div class="ot-header">
          <button class="ot-back" id="ot-back">← ${_T('Bosh sahifa','Бош саҳифа','Главная','Home')}</button>
          <div class="ot-title">${_T('Boshqalar','Бошқалар','Другое','Others')}</div>
        </div>
        <div class="ot-list">${rows}</div>
      </div>`;
  }

  function _bind(el) {
    el.querySelector('#ot-back')?.addEventListener('click', () => window.App.navigate('screen-dashboard'));
    el.querySelectorAll('.ot-row').forEach(row => {
      row.addEventListener('click', () => {
        const item = ITEMS.find(i => i.id === row.dataset.id);
        if (item) item.open(_lang);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
  }

  return { render, load };
})();
