/* ═══════════════════════════════════════════════════
   Duas Screen
   ═══════════════════════════════════════════════════ */

const DuasScreen = (function () {

  let _lang    = 'uz';
  let _activeCat = 'morning';

  const CAT_ICONS = {
    morning:'🌅', evening:'🌙', food:'🍽️',
    travel:'✈️', sleep:'😴', mosque:'🕌', general:'🤲'
  };

  function render() {
    const el = document.getElementById('screen-duas');
    if (!el) return;
    _lang = window.App?.state?.lang || 'uz';
    el.innerHTML = _buildHTML(_lang);
    _bindEvents(el);
  }

  function load(lang) {
    _lang = lang;
    _activeCat = 'morning';
    const el = document.getElementById('screen-duas');
    if (!el) return;
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el);
  }

  function _catLabel(key, lang) {
    const k = `duas_${key}`;
    return t(k, lang) || key;
  }

  function _buildHTML(lang) {
    const cats = typeof DUAS_CATEGORIES !== 'undefined' ? DUAS_CATEGORIES : Object.keys(CAT_ICONS);

    const tabsHTML = cats.map(cat => `
      <button class="duas-tab${cat === _activeCat ? ' active' : ''}" data-cat="${cat}">
        <span>${CAT_ICONS[cat] || '🤲'}</span>
        <span>${_catLabel(cat, lang)}</span>
      </button>
    `).join('');

    const duas = (typeof DUAS_DATA !== 'undefined' && DUAS_DATA[_activeCat]) || [];
    const duasHTML = duas.map(dua => _buildDuaCard(dua, lang)).join('');

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="duas-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">🤲 ${t('modules_list.duas', lang)}</h1>
        </div>

        <div class="duas-body">
          <div class="duas-tabs-scroll">
            ${tabsHTML}
          </div>

          <div class="duas-list" id="duas-list">
            ${duasHTML}
          </div>
        </div>
      </div>
    `;
  }

  function _buildDuaCard(dua, lang) {
    const transl = dua.translation || {};
    const text = transl[lang] || transl['en'] || '';
    const hasTranslit = !!dua.transliteration;

    return `
      <div class="dua-card" data-id="${dua.id}">
        <div class="dua-arabic">${dua.arabic}</div>
        ${hasTranslit ? `<div class="dua-transliteration">${dua.transliteration}</div>` : ''}
        <div class="dua-translation">${text}</div>
        <div class="dua-source">${dua.source || ''}</div>
      </div>
    `;
  }

  function _bindEvents(el) {
    el.querySelector('#duas-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    el.querySelectorAll('.duas-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _activeCat = tab.dataset.cat;
        el.querySelectorAll('.duas-tab').forEach(t2 => t2.classList.remove('active'));
        tab.classList.add('active');

        const duas = (typeof DUAS_DATA !== 'undefined' && DUAS_DATA[_activeCat]) || [];
        const list = el.querySelector('#duas-list');
        if (list) list.innerHTML = duas.map(d => _buildDuaCard(d, _lang)).join('');

        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
  }

  return { render, load };
})();
