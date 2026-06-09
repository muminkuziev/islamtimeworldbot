/* ═══════════════════════════════════════════════════
   99 Names of Allah Screen
   ═══════════════════════════════════════════════════ */

const NamesScreen = (function () {

  let _lang = 'uz';

  function render() {
    const el = document.getElementById('screen-names');
    if (!el) return;
    _lang = window.App?.state?.lang || 'uz';
    el.innerHTML = _buildHTML(_lang);
    _bindEvents(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-names');
    if (!el) return;
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el);
  }

  function _buildHTML(lang) {
    const names = typeof NAMES_OF_ALLAH !== 'undefined' ? NAMES_OF_ALLAH : [];

    const cardsHTML = names.map(name => {
      const meaning = getNameMeaning(name, lang);
      return `
        <div class="name-card" data-num="${name.n}">
          <div class="name-num">${name.n}</div>
          <div class="name-arabic">${name.ar}</div>
          <div class="name-transliteration">${name.tr}</div>
          <div class="name-meaning">${meaning}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="names-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">🕋 ${t('modules_list.names', lang)}</h1>
        </div>

        <div class="names-body">
          <div class="names-bismillah">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
          <div class="names-subtitle">الأَسْمَاءُ الحُسْنَى</div>

          <!-- Search -->
          <div class="names-search-wrap">
            <input type="text" class="names-search-input" id="names-search"
                   placeholder="${t('search', lang)}" autocomplete="off"/>
          </div>

          <div class="names-grid" id="names-grid">
            ${cardsHTML}
          </div>
        </div>

        <!-- Detail modal -->
        <div class="name-modal-overlay" id="name-modal-overlay" style="display:none">
          <div class="name-modal" id="name-modal"></div>
        </div>
      </div>
    `;
  }

  function _bindEvents(el) {
    el.querySelector('#names-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    el.querySelectorAll('.name-card').forEach(card => {
      card.addEventListener('click', () => {
        const num = parseInt(card.dataset.num);
        _showDetail(el, num);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    el.querySelector('#names-search')?.addEventListener('input', e => {
      _filterNames(el, e.target.value.toLowerCase());
    });

    el.querySelector('#name-modal-overlay')?.addEventListener('click', e => {
      if (e.target === el.querySelector('#name-modal-overlay')) {
        _closeModal(el);
      }
    });
  }

  function _showDetail(el, num) {
    const names = typeof NAMES_OF_ALLAH !== 'undefined' ? NAMES_OF_ALLAH : [];
    const name = names.find(n => n.n === num);
    if (!name) return;

    const meaning = getNameMeaning(name, _lang);

    const modal = el.querySelector('#name-modal');
    const overlay = el.querySelector('#name-modal-overlay');

    modal.innerHTML = `
      <button class="name-modal-close" id="name-modal-close">✕</button>
      <div class="name-modal-num">${name.n} / 99</div>
      <div class="name-modal-arabic">${name.ar}</div>
      <div class="name-modal-transliteration">${name.tr}</div>
      <div class="name-modal-meaning-label">${t('names_meaning', _lang)}</div>
      <div class="name-modal-meaning">${meaning}</div>
    `;
    overlay.style.display = 'flex';

    modal.querySelector('#name-modal-close')?.addEventListener('click', () => _closeModal(el));
  }

  function _closeModal(el) {
    const overlay = el.querySelector('#name-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function _filterNames(el, query) {
    const cards = el.querySelectorAll('.name-card');
    cards.forEach(card => {
      const num  = card.querySelector('.name-num')?.textContent || '';
      const ar   = card.querySelector('.name-arabic')?.textContent.toLowerCase() || '';
      const trn  = card.querySelector('.name-transliteration')?.textContent.toLowerCase() || '';
      const mn   = card.querySelector('.name-meaning')?.textContent.toLowerCase() || '';
      const show = !query || num.includes(query) || ar.includes(query)
                           || trn.includes(query) || mn.includes(query);
      card.style.display = show ? '' : 'none';
    });
  }

  function getNameMeaning(name, lang) {
    const map = { uz_cyr: 'ru' };
    const l = map[lang] || lang;
    return name[l] || name['en'] || '';
  }

  return { render, load };
})();
