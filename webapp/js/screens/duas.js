/* ═══════════════════════════════════════════════════════════════
   Du'olar Screen — Navy+Gold UI
   ✅ Tile header ✅ Category grid ✅ Detail view ✅ Search ✅ Favorites
   ═══════════════════════════════════════════════════════════════ */

const DuasScreen = (function () {

  const LS_FAV = 'islamtime_duas_saved';

  let _lang     = 'uz';
  let _tab      = 'kategoriya'; // 'kategoriya' | 'saqlangan'
  let _search   = '';
  let _selCat   = null;         // category key e.g. 'morning'
  let _selDuaId = null;         // dua id string

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

  const CAT_META = {
    morning: { ar: 'دعاء الصباح',    uz: 'Tong duosi',      uz_cyr: 'Тонг дуоси',      ru: 'Утренняя дуа',   en: 'Morning Dua'   },
    evening: { ar: 'دعاء المساء',    uz: 'Kech duosi',      uz_cyr: 'Кеч дуоси',       ru: 'Вечерняя дуа',   en: 'Evening Dua'   },
    food:    { ar: 'دعاء الطعام',    uz: 'Ovqat',           uz_cyr: 'Овқат',            ru: 'Еда',            en: 'Food'           },
    travel:  { ar: 'دعاء السفر',     uz: 'Safar',           uz_cyr: 'Сафар',            ru: 'Путешествие',    en: 'Travel'         },
    sleep:   { ar: 'دعاء النوم',     uz: 'Uxlash',          uz_cyr: 'Уxлаш',           ru: 'Сон',            en: 'Sleep'          },
    mosque:  { ar: 'دعاء المسجد',    uz: 'Masjid',          uz_cyr: 'Масжид',           ru: 'Мечеть',         en: 'Mosque'         },
    general: { ar: 'الأدعية العامة', uz: "Umumiy du'olar",  uz_cyr: 'Умумий дуолар',   ru: 'Общие дуа',      en: 'General Duas'   },
  };

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _tab = 'kategoriya'; _search = ''; _selCat = null; _selDuaId = null;
    _rebuild();
  }

  function load(lang) {
    _lang = lang;
    _tab = 'kategoriya'; _search = ''; _selCat = null; _selDuaId = null;
    _rebuild();
  }

  function _rebuild() {
    const el = document.getElementById('screen-duas');
    if (!el) return;
    el.innerHTML = _buildHTML();
    _bind(el);
  }

  /* ══════════════════════════════════════════════
     HTML builders
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    const favCnt  = _getFavs().length;
    const langMeta = (typeof LANG_META !== 'undefined') ? LANG_META[_lang] : null;
    const langLbl  = langMeta ? (langMeta.flag + ' ' + langMeta.name) : _lang.toUpperCase();
    const backLbl  = _backLabel();

    return `
<div class="du-hdr">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov" style="background:rgba(9,18,31,0.65)"></div>
  <div class="du-hdr-inner">
    <div class="du-nav-row">
      <button class="du-back" id="du-back">${_esc(backLbl)}</button>
      <div class="du-lang-badge">${_esc(langLbl)}</div>
    </div>
    <div class="du-title">${_T("Du'olar","Дуолар","Дуа","Duas")}</div>
    <div class="du-ar-sub">الأدعية المأثورة</div>
    <div class="du-search-wrap">
      <span style="font-size:12px;opacity:.35">🔍</span>
      <input class="du-search-in" id="du-search" type="text"
        placeholder="${_T("Du'o qidirish...","Дуо қидириш...","Поиск дуа...","Search duas...")}" autocomplete="off"
        value="${_esc(_search)}"/>
      <button class="du-search-clr" id="du-search-clr"
        style="display:${_search ? '' : 'none'}">✕</button>
    </div>
    <div class="du-divider"></div>
    <div class="du-tabs">
      <button class="du-tab${_tab === 'kategoriya' ? ' active' : ''}" data-tab="kategoriya">
        📂 ${_T('Kategoriya','Категория','Категории','Categories')}
      </button>
      <button class="du-tab${_tab === 'saqlangan' ? ' active' : ''}" data-tab="saqlangan">
        ⭐ ${_T('Saqlangan','Сақланган','Сохранённые','Saved')}${favCnt > 0 ? ' · ' + favCnt : ''}
      </button>
    </div>
  </div>
</div>
<div class="du-body" id="du-body">
  ${_buildContent()}
</div>`;
  }

  function _buildContent() {
    if (_search.length > 1)                         return _buildSearch();
    if (_selDuaId !== null)                         return _buildDetail();
    if (_selCat !== null && _tab === 'kategoriya')  return _buildCatList();
    if (_tab === 'saqlangan')                       return _buildSaved();
    return _buildCatGrid();
  }

  /* ── Category grid ── */
  function _buildCatGrid() {
    const cats = (typeof DUAS_CATEGORIES !== 'undefined') ? DUAS_CATEGORIES : Object.keys(CAT_META);
    return `<div class="du-cat-grid">
${cats.map(key => {
  const meta  = CAT_META[key] || {};
  const count = (typeof DUAS_DATA !== 'undefined' && DUAS_DATA[key]) ? DUAS_DATA[key].length : 0;
  const lbl   = _catLabel(key);
  return `<div class="du-cat-card" data-cat="${key}">
  <div class="du-cat-name">${_esc(lbl)}</div>
  <div class="du-cat-ar">${meta.ar || ''}</div>
  <div class="du-cat-cnt">${count} ${_T("ta du'o","та дуо","дуа","duas")}</div>
</div>`;
}).join('\n')}
</div>`;
  }

  /* ── Category duas list ── */
  function _buildCatList() {
    const duas = (typeof DUAS_DATA !== 'undefined' && DUAS_DATA[_selCat]) || [];
    const favs = _getFavs();
    const lbl  = _catLabel(_selCat);
    return `<div class="du-sec-lbl">${_esc(lbl.toUpperCase())} · ${duas.length} ${_T("TA DU'O","ТА ДУО","ДУА","DUAS")}</div>
${duas.length === 0
  ? `<div class="du-empty">${_T("Bu bo'limda du'olar mavjud emas","Бу бўлимда дуолар мавжуд эмас","В этом разделе нет дуа","No duas in this section")}</div>`
  : duas.map(d => _buildCard(d, favs, false)).join('\n')}`;
  }

  /* ── Search results ── */
  function _buildSearch() {
    const results = _searchAll();
    const favs    = _getFavs();
    return `<div class="du-sec-lbl">${_T('QIDIRUV','ҚИДИРУВ','ПОИСК','SEARCH')} · ${results.length} ${_T('NATIJA','НАТИЖА','РЕЗУЛЬТАТОВ','RESULTS')}</div>
${results.length === 0
  ? `<div class="du-empty">${_T('Hech narsa topilmadi','Ҳеч нарса топилмади','Ничего не найдено','Nothing found')}</div>`
  : results.map(d => _buildCard(d, favs, true)).join('\n')}`;
  }

  /* ── Dua detail ── */
  function _buildDetail() {
    const all = (typeof DUAS_DATA !== 'undefined') ? Object.values(DUAS_DATA).flat() : [];
    const dua = all.find(d => d.id === _selDuaId);
    if (!dua) return `<div class="du-empty">${_T("Du'o topilmadi","Дуо топилмади","Дуа не найдена","Dua not found")}</div>`;
    const favs     = _getFavs();
    const saved    = favs.includes(dua.id);
    const transl   = _resolveTransl(dua.translation || {}, _lang);
    const isUz     = _lang === 'uz' || _lang === 'uz_cyr';
    const translit = dua.transliteration || (isUz ? _T("O'qilishi hozircha qo'shilmagan","Ўқилиши ҳозирча қўшилмаган",'',' ') : '');
    return `
<button class="du-detail-back" id="du-detail-back">← ${_T('Orqaga','Орқага','Назад','Back')}</button>
<div class="du-detail-box">
  <div class="du-detail-topline"></div>
  <div class="du-detail-ar">${dua.arabic}</div>
  ${translit ? `<div class="du-detail-oqilishi-lbl">${_T("O'qilishi","Ўқилиши","Транслитерация","Transliteration")}</div>
  <div class="du-detail-translit">${_esc(translit)}</div>` : ''}
  <div class="du-detail-sep"></div>
  ${transl ? `<div class="du-detail-uz">"${_esc(transl)}"</div>` : ''}
  <div class="du-detail-manba">
    <span class="du-detail-manba-lbl">${_T('Manba','Манба','Источник','Source')}</span>
    <span class="du-detail-manba-val">${_esc(dua.source || '')}</span>
  </div>
  <button class="du-save-btn${saved ? ' saved' : ''}" id="du-save-btn" data-id="${dua.id}">
    ${saved ? '⭐ ' + _T('Saqlangan','Сақланган','Сохранено','Saved') : '⭐ ' + _T('Saqlash','Сақлаш','Сохранить','Save')}
  </button>
</div>`;
  }

  /* ── Saved tab ── */
  function _buildSaved() {
    const favIds = _getFavs();
    if (!favIds.length) return `<div class="du-empty">⭐ ${_T('Hali hech narsa saqlanmagan','Ҳали ҳеч нарса сақланмаган','Пока ничего не сохранено','Nothing saved yet')}</div>`;
    const all   = (typeof DUAS_DATA !== 'undefined') ? Object.values(DUAS_DATA).flat() : [];
    const saved = all.filter(d => favIds.includes(d.id));
    const favs  = _getFavs();
    return `<div class="du-sec-lbl">${_T('SAQLANGAN','САҚЛАНГАН','СОХРАНЁННЫЕ','SAVED')} · ${saved.length} ${_T('TA','ТА','ШТ.','')}</div>
${saved.map(d => _buildCard(d, favs, false)).join('\n')}`;
  }

  /* ── Dua card ── */
  function _buildCard(dua, favs, compact) {
    const transl   = _resolveTransl(dua.translation || {}, _lang);
    const saved    = favs.includes(dua.id);
    const isUz     = _lang === 'uz' || _lang === 'uz_cyr';
    const translit = dua.transliteration || (isUz ? _T("O'qilishi hozircha qo'shilmagan","Ўқилиши ҳозирча қўшилмаган",'',' ') : '');
    return `<div class="du-card" data-id="${dua.id}">
  <div class="du-card-ar">${dua.arabic}</div>
  ${!compact && translit ? `<div class="du-card-translit">${_esc(translit)}</div>` : ''}
  ${!compact ? `<div class="du-card-sep"></div>
  <div class="du-card-uz">"${_esc(transl)}"</div>` : ''}
  <div class="du-card-foot">
    <span class="du-card-src">${_esc(dua.source || '')}</span>
    <button class="du-card-star${saved ? ' saved' : ''}" data-id="${dua.id}">⭐</button>
  </div>
</div>`;
  }

  /* ══════════════════════════════════════════════
     Event binding
  ══════════════════════════════════════════════ */
  function _bind(el) {
    /* Header back */
    el.querySelector('#du-back')?.addEventListener('click', () => {
      if (_selDuaId !== null) {
        _selDuaId = null; _refreshBody(el);
      } else if (_selCat !== null) {
        _selCat = null; _refreshBody(el);
      } else {
        window.App.navigate('screen-dashboard');
      }
    });

    /* Tabs */
    el.querySelectorAll('.du-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        _selCat = null; _selDuaId = null;
        _search = '';
        const si = el.querySelector('#du-search');
        const sc = el.querySelector('#du-search-clr');
        if (si) si.value = '';
        if (sc) sc.style.display = 'none';
        _refreshBody(el);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    /* Search */
    el.querySelector('#du-search')?.addEventListener('input', e => {
      _search = e.target.value;
      const sc = el.querySelector('#du-search-clr');
      if (sc) sc.style.display = _search ? '' : 'none';
      _refreshBody(el);
    });

    el.querySelector('#du-search-clr')?.addEventListener('click', () => {
      _search = '';
      const si = el.querySelector('#du-search');
      const sc = el.querySelector('#du-search-clr');
      if (si) { si.value = ''; si.focus(); }
      if (sc) sc.style.display = 'none';
      _refreshBody(el);
    });

    /* Body click delegation */
    el.querySelector('#du-body')?.addEventListener('click', e => {

      /* Detail orqaga */
      if (e.target.closest('#du-detail-back')) {
        _selDuaId = null;
        _refreshBody(el);
        return;
      }

      /* Save btn in detail */
      const saveBtn = e.target.closest('#du-save-btn');
      if (saveBtn) {
        const id = saveBtn.dataset.id;
        _toggleFav(id);
        const isSaved = _getFavs().includes(id);
        saveBtn.textContent = isSaved ? '⭐ ' + _T('Saqlangan','Сақланган','Сохранено','Saved') : '⭐ ' + _T('Saqlash','Сақлаш','Сохранить','Save');
        saveBtn.classList.toggle('saved', isSaved);
        _updateFavTab(el);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
        return;
      }

      /* Star on card */
      const star = e.target.closest('.du-card-star');
      if (star) {
        e.stopPropagation();
        const id = star.dataset.id;
        _toggleFav(id);
        const isSaved = _getFavs().includes(id);
        star.classList.toggle('saved', isSaved);
        _updateFavTab(el);
        if (_tab === 'saqlangan' && !isSaved) {
          const card = star.closest('.du-card');
          card?.remove();
          const body = el.querySelector('#du-body');
          const cnt  = body?.querySelectorAll('.du-card').length || 0;
          const lbl  = body?.querySelector('.du-sec-lbl');
          if (lbl) lbl.textContent = `${_T('SAQLANGAN','САҚЛАНГАН','СОХРАНЁННЫЕ','SAVED')} · ${cnt} ${_T('TA','ТА','ШТ.','')}`;
          if (cnt === 0 && body) body.innerHTML = `<div class="du-empty">⭐ ${_T('Hali hech narsa saqlanmagan','Ҳали ҳеч нарса сақланмаган','Пока ничего не сохранено','Nothing saved yet')}</div>`;
        }
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
        return;
      }

      /* Category card */
      const catCard = e.target.closest('.du-cat-card');
      if (catCard) {
        _selCat = catCard.dataset.cat;
        _selDuaId = null;
        _refreshBody(el);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
        return;
      }

      /* Dua card (open detail) */
      const duaCard = e.target.closest('.du-card');
      if (duaCard) {
        _selDuaId = duaCard.dataset.id;
        _refreshBody(el);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        return;
      }
    });
  }

  /* ══════════════════════════════════════════════
     DOM helpers
  ══════════════════════════════════════════════ */
  function _refreshBody(el) {
    const body = el.querySelector('#du-body');
    if (body) body.innerHTML = _buildContent();
    const backBtn = el.querySelector('#du-back');
    if (backBtn) backBtn.textContent = _backLabel();
  }

  function _updateFavTab(el) {
    const cnt = _getFavs().length;
    const btn = el.querySelector('.du-tab[data-tab="saqlangan"]');
    if (btn) btn.textContent = `⭐ ${_T('Saqlangan','Сақланган','Сохранённые','Saved')}${cnt > 0 ? ' · ' + cnt : ''}`;
  }

  function _backLabel() {
    if (_selDuaId !== null) return '← ' + (_selCat ? _catLabel(_selCat) : _T("Du'olar","Дуолар","Дуа","Duas"));
    if (_selCat !== null)   return '← ' + _T('Kategoriyalar','Категориялар','Категории','Categories');
    return '← ' + _T('Menyu','Меню','Меню','Menu');
  }

  /* ══════════════════════════════════════════════
     Data helpers
  ══════════════════════════════════════════════ */
  function _searchAll() {
    const all = (typeof DUAS_DATA !== 'undefined') ? Object.values(DUAS_DATA).flat() : [];
    const q   = _search.toLowerCase();
    return all.filter(d => {
      const transl  = _resolveTransl(d.translation || {}, _lang).toLowerCase();
      const translit = (d.transliteration || '').toLowerCase();
      return translit.includes(q) || transl.includes(q) || (d.arabic || '').includes(_search);
    });
  }

  function _getFavs() {
    try { return JSON.parse(localStorage.getItem(LS_FAV) || '[]'); } catch { return []; }
  }

  function _toggleFav(id) {
    let favs = _getFavs();
    favs = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    localStorage.setItem(LS_FAV, JSON.stringify(favs));
  }

  function _catLabel(key) {
    const tried = t('duas_' + key, _lang);
    if (tried && tried !== 'duas_' + key) return tried;
    const meta = CAT_META[key];
    if (!meta) return key;
    if (_lang === 'uz_cyr' && meta.uz_cyr) return meta.uz_cyr;
    if (_lang === 'ru' && meta.ru) return meta.ru;
    if (_lang === 'en' && meta.en) return meta.en;
    return meta.uz || key;
  }

  function _resolveTransl(transl, lang) {
    const fb = { uz_cyr: 'uz', kk: 'ru', tg: 'ru', ky: 'ru' };
    const l  = fb[lang] || lang;
    const result = transl[l] || transl['en'] || '';
    return lang === 'uz_cyr' ? _cy(result) : result;
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render, load };
})();
