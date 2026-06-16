/* ═══════════════════════════════════════════════════════════════
   99 Names of Allah — Navy+Gold UI
   ✅ Tile header ✅ 2-col grid ✅ Detail view + Prev/Next
   ✅ Zikr hisoblagich (localStorage) ✅ Search/filter
   ═══════════════════════════════════════════════════════════════ */

const NamesScreen = (function () {

  const LS_KEY = 'nm_counts_v2';

  let _lang   = 'uz';
  let _sel    = null;   // index into NAMES_OF_ALLAH (null = list view)
  let _search = '';
  let _counts = {};

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }
  function _cy(t) {
    if (!t || _lang !== 'uz_cyr') return t;
    return t
      .replace(/O'/g,'Ў').replace(/o'/g,'ў').replace(/G'/g,'Ғ').replace(/g'/g,'ғ')
      .replace(/Sh/g,'Ш').replace(/sh/g,'ш').replace(/Ch/g,'Ч').replace(/ch/g,'ч')
      .replace(/Ng/g,'Нг').replace(/ng/g,'нг').replace(/Yo/g,'Ё').replace(/yo/g,'ё')
      .replace(/Yu/g,'Ю').replace(/yu/g,'ю').replace(/Ya/g,'Я').replace(/ya/g,'я')
      .replace(/A/g,'А').replace(/a/g,'а').replace(/B/g,'Б').replace(/b/g,'б')
      .replace(/D/g,'Д').replace(/d/g,'д').replace(/E/g,'Е').replace(/e/g,'е')
      .replace(/F/g,'Ф').replace(/f/g,'ф').replace(/G/g,'Г').replace(/g/g,'г')
      .replace(/H/g,'Ҳ').replace(/h/g,'ҳ').replace(/I/g,'И').replace(/i/g,'и')
      .replace(/J/g,'Ж').replace(/j/g,'ж').replace(/K/g,'К').replace(/k/g,'к')
      .replace(/L/g,'Л').replace(/l/g,'л').replace(/M/g,'М').replace(/m/g,'м')
      .replace(/N/g,'Н').replace(/n/g,'н').replace(/O/g,'О').replace(/o/g,'о')
      .replace(/P/g,'П').replace(/p/g,'п').replace(/Q/g,'Қ').replace(/q/g,'қ')
      .replace(/R/g,'Р').replace(/r/g,'р').replace(/S/g,'С').replace(/s/g,'с')
      .replace(/T/g,'Т').replace(/t/g,'т').replace(/U/g,'У').replace(/u/g,'у')
      .replace(/V/g,'В').replace(/v/g,'в').replace(/X/g,'Х').replace(/x/g,'х')
      .replace(/Y/g,'Й').replace(/y/g,'й').replace(/Z/g,'З').replace(/z/g,'з');
  }

  function _loadCounts() {
    try { _counts = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { _counts = {}; }
  }
  function _saveCounts() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_counts)); } catch {}
  }

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _sel = null; _search = '';
    _loadCounts();
    _rebuild();
  }

  function load(lang) {
    _lang = lang;
    _sel = null; _search = '';
    _loadCounts();
    _rebuild();
  }

  function _rebuild() {
    const el = document.getElementById('screen-names');
    if (!el) return;
    el.innerHTML = _buildHTML();
    _bindEvents(el);
  }

  /* ══════════════════════════════════════════════
     Data helpers
  ══════════════════════════════════════════════ */
  function _all() {
    return typeof NAMES_OF_ALLAH !== 'undefined' ? NAMES_OF_ALLAH : [];
  }

  function _filtered() {
    const names = _all();
    if (!_search) return names;
    const q = _search.toLowerCase();
    return names.filter(x =>
      x.tr.toLowerCase().includes(q) ||
      x.ar.includes(_search) ||
      (x[_lang] || x.uz || '').toLowerCase().includes(q) ||
      String(x.n).includes(_search)
    );
  }

  function _totalZikr() {
    return Object.values(_counts).reduce((a, b) => a + b, 0);
  }

  function _shortMean(name) {
    const hasCyr = !!name[_lang];
    const full = name[_lang] || name.uz || name.en || '';
    const text = full.split(' — ')[0].trim();
    return (_lang === 'uz_cyr' && !hasCyr) ? _cy(text) : text;
  }

  function _tafsir(name) {
    const d = name.desc || {};
    const hasCyr = !!d[_lang];
    const text = d[_lang] || d.uz || d.en || '';
    return (_lang === 'uz_cyr' && !hasCyr) ? _cy(text) : text;
  }

  /* ══════════════════════════════════════════════
     HTML builders
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    return `
      <div class="screen-inner q-screen">

        <!-- HEADER with tile pattern background -->
        <div class="nm-header">
          <div class="nm-tile-bg"></div>
          <div class="nm-tile-ov"></div>
          <div class="nm-header-inner">

            <div class="nm-nav-row">
              <button class="nm-back-btn" id="nm-back">
                ${_sel !== null ? '← ' + _T('Ismlar','Исмлар','Имена','Names') : '← ' + _T('Menyu','Меню','Меню','Menu')}
              </button>
              <div class="nm-zikr-badge">
                <span class="nm-zikr-lbl">${_T('Zikr:','Зикр:','Зикр:','Dhikr:')}</span>
                <span class="nm-zikr-tot" id="nm-zikr-tot">${_totalZikr()}</span>
              </div>
            </div>

            <div class="nm-title-wrap">
              <div class="nm-title">${_T('Allohning 99 ismi','Аллоҳнинг 99 исми','99 имён Аллаха','99 Names of Allah')}</div>
              <div class="nm-title-ar">أسماء الله الحسنى</div>
            </div>

            <div class="nm-search-box">
              <span class="nm-search-ico">🔍</span>
              <input type="text" class="nm-search-inp" id="nm-search"
                placeholder="${_T('Ism qidirish...','Исм қидириш...','Поиск имени...','Search name...')}" value="${_esc(_search)}"
                autocomplete="off"/>
              <button class="nm-search-clr${_search ? '' : ' nm-hid'}" id="nm-clr">✕</button>
            </div>

            <div class="nm-hdiv"></div>
          </div>
        </div>

        <!-- CONTENT -->
        <div class="nm-content" id="nm-content">
          ${_buildContent()}
        </div>

      </div>`;
  }

  function _buildContent() {
    return _sel !== null ? _buildDetail() : _buildList();
  }

  /* ── List view: 2-column grid ── */
  function _buildList() {
    const list = _filtered();
    const all  = _all();
    return `
      <div class="nm-cnt-lbl">${list.length} ${_T('ta ism','та исм','имён','names')}</div>
      <div class="nm-grid">
        ${list.map(x => {
          const idx = all.indexOf(x);
          const cnt = _counts[x.n] || 0;
          return `
            <div class="nm-card" data-idx="${idx}">
              <div class="nm-card-n">${String(x.n).padStart(2,'0')}</div>
              ${cnt > 0 ? `<div class="nm-card-c">${cnt}</div>` : ''}
              <div class="nm-card-ar">${x.ar}</div>
              <div class="nm-card-tr">${x.tr}</div>
              <div class="nm-card-mn">${_shortMean(x)}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  /* ── Detail view ── */
  function _buildDetail() {
    const all    = _all();
    const ism    = all[_sel];
    if (!ism) return _buildList();
    const cnt    = _counts[ism.n] || 0;
    const isFirst = _sel === 0;
    const isLast  = _sel === all.length - 1;
    const tafsir  = _tafsir(ism);
    return `
      <div class="nm-detail">

        <!-- Main name card -->
        <div class="nm-det-card">
          <div class="nm-det-bar"></div>
          <div class="nm-det-num">${String(ism.n).padStart(2,'0')} / 99</div>
          <div class="nm-det-ar">${ism.ar}</div>
          <div class="nm-det-tr">${ism.tr}</div>
          <div class="nm-det-mn">${_shortMean(ism)}</div>
          <div class="nm-det-nav">
            <button class="nm-nav-b${isFirst ? ' nm-nav-off' : ''}" id="nm-prev"
              ${isFirst ? 'disabled' : ''}>‹ ${_T('Oldingi','Олдинги','Предыдущее','Previous')}</button>
            <button class="nm-nav-b${isLast ? ' nm-nav-off' : ''}" id="nm-next"
              ${isLast ? 'disabled' : ''}>${_T('Keyingi','Кейинги','Следующее','Next')} ›</button>
          </div>
        </div>

        ${tafsir ? `
        <!-- Tafsir -->
        <div class="nm-taf-card">
          <div class="nm-sec-lbl">${_T('TAFSIR','ТАФСИР','ТАФСИР','TAFSIR')}</div>
          <div class="nm-taf-txt">${_esc(tafsir)}</div>
        </div>` : ''}

        ${ism.ref ? `
        <div class="src-card">
          <span class="src-icon">📚</span>
          <span class="src-ref"><strong>${ism.ref}</strong></span>
        </div>` : ''}

        <!-- Zikr counter -->
        <div class="nm-zkr-card">
          <div class="nm-det-bar"></div>
          <div class="nm-sec-lbl">${_T('ZIKR HISOBLAGICHI','ЗИКР ҲИСОБЛАГИЧИ','СЧЁТЧИК ЗИКРА','DHIKR COUNTER')}</div>
          <div class="nm-zkr-num" id="nm-zkr-num">${cnt}</div>
          <div class="nm-zkr-sub">${_T('marta aytildi','марта айтилди','раз произнесено','times recited')}</div>
          <div class="nm-zkr-row">
            <button class="nm-zkr-plus" id="nm-zkr-tap">+ ${_T('Zikr','Зикр','Зикр','Dhikr')}</button>
            <button class="nm-zkr-rst"  id="nm-zkr-rst">${_T('Qayta','Қайта','Сбросить','Reset')}</button>
          </div>
        </div>

      </div>`;
  }

  /* ══════════════════════════════════════════════
     Events
  ══════════════════════════════════════════════ */
  function _bindEvents(el) {
    el.querySelector('#nm-back')?.addEventListener('click', () => {
      if (_sel !== null) {
        _sel = null;
        _rebuild();
      } else {
        window.App.navigate('screen-dashboard');
      }
    });

    el.querySelector('#nm-search')?.addEventListener('input', e => {
      _search = e.target.value;
      const content = el.querySelector('#nm-content');
      if (content) content.innerHTML = _buildContent();
      _bindContentEvents(el);
      el.querySelector('#nm-clr')?.classList.toggle('nm-hid', !_search);
    });

    el.querySelector('#nm-clr')?.addEventListener('click', () => {
      _search = '';
      const inp = el.querySelector('#nm-search');
      if (inp) { inp.value = ''; inp.focus(); }
      const content = el.querySelector('#nm-content');
      if (content) content.innerHTML = _buildContent();
      _bindContentEvents(el);
      el.querySelector('#nm-clr')?.classList.add('nm-hid');
    });

    _bindContentEvents(el);
  }

  function _bindContentEvents(el) {
    if (_sel === null) {
      el.querySelectorAll('.nm-card').forEach(card => {
        card.addEventListener('click', () => {
          _sel = parseInt(card.dataset.idx);
          const back = el.querySelector('#nm-back');
          if (back) back.textContent = '← ' + _T('Ismlar','Исмлар','Имена','Names');
          const content = el.querySelector('#nm-content');
          if (content) content.innerHTML = _buildContent();
          _bindContentEvents(el);
          window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
        });
      });
    } else {
      el.querySelector('#nm-prev')?.addEventListener('click', () => {
        if (_sel > 0) {
          _sel--;
          const content = el.querySelector('#nm-content');
          if (content) content.innerHTML = _buildContent();
          _bindContentEvents(el);
          window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
        }
      });

      el.querySelector('#nm-next')?.addEventListener('click', () => {
        const all = _all();
        if (_sel < all.length - 1) {
          _sel++;
          const content = el.querySelector('#nm-content');
          if (content) content.innerHTML = _buildContent();
          _bindContentEvents(el);
          window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
        }
      });

      el.querySelector('#nm-zkr-tap')?.addEventListener('click', () => {
        const ism = _all()[_sel];
        if (!ism) return;
        _counts[ism.n] = (_counts[ism.n] || 0) + 1;
        _saveCounts();
        const numEl = el.querySelector('#nm-zkr-num');
        if (numEl) numEl.textContent = _counts[ism.n];
        const totEl = el.querySelector('#nm-zikr-tot');
        if (totEl) totEl.textContent = _totalZikr();
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });

      el.querySelector('#nm-zkr-rst')?.addEventListener('click', () => {
        const ism = _all()[_sel];
        if (!ism) return;
        _counts[ism.n] = 0;
        _saveCounts();
        const numEl = el.querySelector('#nm-zkr-num');
        if (numEl) numEl.textContent = 0;
        const totEl = el.querySelector('#nm-zikr-tot');
        if (totEl) totEl.textContent = _totalZikr();
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
      });
    }
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render, load };
})();
