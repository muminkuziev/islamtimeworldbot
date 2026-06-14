/* ═══════════════════════════════════════════════════════════════
   Hadith Screen — Navy+Gold UI
   ✅ Tile header ✅ Buxoriy/Muslim tabs ✅ List ✅ Detail ✅ Bo'limlar
   ✅ Search (API) ✅ Pagination ✅ Prev/Next in detail
   ═══════════════════════════════════════════════════════════════ */

const HadithScreen = (function () {

  const PAGE_SIZE = 20;

  const BOOKS = {
    bukhari: { label: 'Sahih al-Buxoriy', label_cyr: 'Саҳиҳ ал-Бухорий', label_ru: 'Sahih al-Bukhari',  label_en: 'Sahih al-Bukhari',  ar: 'صحيح البخاري', count: '6,638', imam: 'Imom Muhammad al-Buxoriy', imam_cyr: 'Имом Муҳаммад ал-Бухорий', imam_ru: 'Имам Мухаммад аль-Бухари',       imam_en: 'Imam Muhammad al-Bukhari'    },
    muslim:  { label: 'Sahih Muslim',     label_cyr: 'Саҳиҳ Муслим',      label_ru: 'Sahih Muslim',       label_en: 'Sahih Muslim',      ar: 'صحيح مسلم',    count: '7,360', imam: 'Imom Muslim ibn al-Hajjoj', imam_cyr: 'Имом Муслим ибн ал-Ҳажжож', imam_ru: 'Имам Муслим ибн аль-Хаджжадж', imam_en: 'Imam Muslim ibn al-Hajjaj' },
  };

  const KATEGORIYALAR = [
    "Iymon", "Tahorat", "Namoz", "Zakot", "Ro'za",
    "Haj", "Savdo", "Nikoh", "Ilm", "Adab", "Zikr", "Qiyomat",
  ];
  const KATEGORIYALAR_CYR = [
    "Иймон", "Таҳорат", "Намоз", "Закот", "Рўза",
    "Ҳаж", "Савдо", "Никоҳ", "Илм", "Адаб", "Зикр", "Қиёмат",
  ];
  const KATEGORIYALAR_EN = [
    "Faith", "Purification", "Prayer", "Zakat", "Fasting",
    "Hajj", "Trade", "Marriage", "Knowledge", "Manners", "Dhikr", "Judgment Day",
  ];

  const KAT_ICONS = {
    "Iymon":"🕌","Tahorat":"💧","Namoz":"🙏","Zakot":"💰","Ro'za":"🌙",
    "Haj":"🕋","Savdo":"🤝","Nikoh":"💍","Ilm":"📚","Adab":"🌹",
    "Zikr":"📿","Qiyomat":"⚖️",
  };

  let _el           = null;
  let _lang         = 'uz';
  function _T(lat, cyr, ru, en) {
    if (_lang === 'uz_cyr') return cyr;
    if (_lang === 'ru' && ru !== undefined) return ru;
    if (_lang === 'en' && en !== undefined) return en;
    return lat;
  }
  function _bLbl(b) { return _T(b.label, b.label_cyr, b.label_ru, b.label_en || b.label_ru); }
  function _bImam(b) { return _T(b.imam, b.imam_cyr, b.imam_ru, b.imam_en || b.imam); }
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
  let _collection   = 'bukhari';
  let _tab          = 'hadiths';
  let _page         = 1;
  let _totalPages   = 1;
  let _totalCount   = 0;
  let _pageHadiths  = [];
  let _loading      = false;
  let _selIdx       = null;
  let _katFilter    = null;
  let _searchVal    = '';
  /* Category browsing state */
  let _catCounts    = {};   // {name: {count, chapter_count}}
  let _catChapters  = [];   // [{chapter_id, chapter_name, jild, count}]
  let _muslimBooks  = [];   // [{book_id, name, count}]
  let _selChapterId = null; // currently browsed chapter_id
  let _katView      = 'grid'; // 'grid' | 'chapters' | 'muslim-books'

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _collection = 'bukhari'; _tab = 'hadiths'; _page = 1;
    _pageHadiths = []; _selIdx = null; _katFilter = null; _searchVal = '';
    _catCounts = {}; _catChapters = []; _muslimBooks = []; _selChapterId = null; _katView = 'grid';
    _el = document.getElementById('screen-hadith');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
    _fetchPage();
    _fetchCatCounts();
  }

  function load(lang) {
    _lang = lang;
    _selIdx = null; _selChapterId = null; _katView = 'grid';
    _katFilter = null; _catChapters = [];
    _el = document.getElementById('screen-hadith');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
    if (_pageHadiths.length > 0) {
      _refreshBody();
    } else {
      _fetchPage();
    }
    if (!Object.keys(_catCounts).length) _fetchCatCounts();
  }

  /* ══════════════════════════════════════════════
     HTML builders
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    const langMeta = (typeof LANG_META !== 'undefined') ? LANG_META[_lang] : null;
    const langLbl  = langMeta ? (langMeta.flag + ' ' + langMeta.name) : _lang.toUpperCase();

    const booksHTML = ['bukhari', 'muslim'].map(k => {
      const b   = BOOKS[k];
      const act = _collection === k;
      const c   = k === 'bukhari' ? 'gold' : 'purple';
      return `<button class="hd-book-btn${act ? ' ' + c : ''}" data-col="${k}">
  <div class="hd-book-name${act ? ' ' + c : ''}">${_esc(_bLbl(b))}</div>
  <div class="hd-book-cnt">${b.count} ${_T('hadis','ҳадис','хадисов','hadiths')}</div>
</button>`;
    }).join('\n');

    const tabsHTML = [
      { k: 'hadiths',    l: '📜 ' + _T('Hadislar','Ҳадислар','Хадисы','Hadiths')      },
      { k: 'qidiruv',    l: '🔍 ' + _T('Qidiruv','Қидирув','Поиск','Search')          },
      { k: 'kategoriya', l: "📂 " + _T("Bo'limlar","Бўлимлар","Разделы",'Categories') },
    ].map(t =>
      `<button class="hd-tab${_tab === t.k ? ' active' : ''}" data-tab="${t.k}">${t.l}</button>`
    ).join('\n');

    return `
<div class="hd-hdr">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov" style="background:rgba(9,18,31,0.65)"></div>
  <div class="hd-hdr-inner">
    <div class="hd-nav-row">
      <button class="hd-back" id="hd-back">← ${_T('Menyu','Меню','Меню','Menu')}</button>
      <div class="hd-lang-badge">${_esc(langLbl)}</div>
    </div>
    <div class="hd-title">${_T('Hadis kitoblari','Ҳадис китоблари','Книги хадисов','Hadith Books')}</div>
    <div class="hd-ar-sub">كتب الحديث الشريف</div>
    <div class="hd-books">${booksHTML}</div>
    <div class="hd-divider"></div>
    <div class="hd-tabs">${tabsHTML}</div>
  </div>
</div>
<div class="hd-body" id="hd-body">
  ${_buildContent()}
</div>`;
  }

  function _buildContent() {
    if (_tab === 'kategoriya') {
      if (_katView === 'chapters') return _buildCatChapters();
      if (_katView === 'muslim-books') return _buildMuslimBooks();
      return _buildKat();
    }
    if (_selIdx !== null) return _buildDetail();
    return _buildList();
  }

  /* ── Hadith list (Hadislar + Qidiruv tabs) ── */
  function _buildList() {
    const searchBar = _tab === 'qidiruv' ? `
<div class="hd-search-wrap">
  <span style="font-size:12px;opacity:.35">🔍</span>
  <input class="hd-search-in" id="hd-search" type="text"
    placeholder="${_T("Hadis raqami yoki kalit so'z...","Ҳадис рақами ёки калит сўз...","Номер или ключевое слово…","Hadith number or keyword...")}"
    autocomplete="off" dir="auto" value="${_esc(_searchVal)}"/>
  <button class="hd-search-clr" id="hd-search-clr"
    style="display:${_searchVal ? '' : 'none'}">✕</button>
</div>` : '';

    let _badgeLbl = '';
    if (_selChapterId !== null) {
      const ch = _catChapters.find(c => c.chapter_id === _selChapterId);
      _badgeLbl = (_katFilter ? _katFilter + ' › ' : '') + (ch ? ch.chapter_name : '');
    } else if (_katFilter) {
      _badgeLbl = _katFilter;
    }
    const katBadge = _badgeLbl ? `
<div class="hd-kat-badge">
  <span class="hd-kat-lbl">📂 ${_esc(_badgeLbl)}</span>
  <button class="hd-kat-clr" id="hd-kat-clr">✕</button>
</div>` : '';

    const listHTML = _pageHadiths.length === 0
      ? `<div class="hd-loading"><div class="hd-spinner"></div></div>`
      : _buildListItems();

    const pagHTML = _totalPages > 1 ? `
<div class="hd-pag">
  <button class="hd-pag-btn" id="hd-prev" ${_page <= 1 ? 'disabled' : ''}>‹ ${_T('Oldingi','Олдинги','Предыдущий','Previous')}</button>
  <span class="hd-pag-info">${_page} / ${_totalPages}</span>
  <button class="hd-pag-btn" id="hd-next" ${_page >= _totalPages ? 'disabled' : ''}>${_T('Keyingi','Кейинги','Следующий','Next')} ›</button>
</div>` : '';

    return `${searchBar}${katBadge}<div id="hd-list">${listHTML}</div>${pagHTML}`;
  }

  function _buildListItems() {
    const items = [];
    let prevChapter = null;
    _pageHadiths.forEach((h, i) => {
      const ch = h.chapter || '';
      if (ch && ch !== prevChapter) {
        items.push(`<div class="hd-chapter-hdr">📖 ${_esc(ch)}</div>`);
        prevChapter = ch;
      }
      items.push(_buildCard(h, i));
    });
    return items.join('\n');
  }

  function _buildCard(h, i) {
    const colLbl   = _collection === 'bukhari' ? _T('Buxoriy','Бухорий','Аль-Бухари','Al-Bukhari') : _T('Muslim','Муслим','Муслим','Muslim');
    const ref      = `${colLbl} · ${h.hadith_number || h.id || ''}`;
    const txt      = _getText(h);
    const isFall   = (_lang === 'uz' || _lang === 'uz_cyr') && !h.text;
    const isRuFall = _lang === 'ru' && _isRuFallback(h);
    const isRealUz = (_lang === 'uz' || _lang === 'uz_cyr') && !!h.text;
    const textHTML = txt
      ? ((isFall || isRuFall)
          ? `<div class="hd-card-uz" style="opacity:.45;font-style:italic">${_esc(txt)}</div>`
          : isRealUz
            ? `<div class="hd-card-uz" style="font-style:normal;font-size:13px;opacity:.88;color:rgba(232,223,200,.88)">${_esc(txt)}</div>`
            : `<div class="hd-card-uz">${_esc(txt)}</div>`)
      : '';
    return `
<div class="hd-card" data-idx="${i}">
  ${h.arabic
    ? `<div class="hd-card-ar">${h.arabic}</div><div class="hd-card-sep"></div>`
    : ''}
  ${textHTML}
  <div class="hd-card-foot">
    <div class="hd-card-foot-left">
      ${h.narrator ? `<span class="hd-card-narrator">${_esc(h.narrator)}</span>` : ''}
      <span class="hd-sahih">SAHIH</span>
    </div>
    <span class="hd-card-ref">${_esc(ref)}</span>
  </div>
</div>`;
  }

  /* ── Hadith detail ── */
  function _buildDetail() {
    const h = _pageHadiths[_selIdx];
    if (!h) return `<div class="hd-empty">${_T('Hadis topilmadi','Ҳадис топилмади','Хадис не найден','Hadith not found')}</div>`;
    const colLbl  = _collection === 'bukhari' ? _T('Buxoriy','Бухорий','Аль-Бухари','Al-Bukhari') : _T('Muslim','Муслим','Муслим','Muslim');
    const ref     = `${colLbl} · ${h.hadith_number || h.id || ''}`;
    const hasPrev = _selIdx > 0;
    const hasNext = _selIdx < _pageHadiths.length - 1;

    const detailTxt  = _getText(h);
    const isFallback = (_lang === 'uz' || _lang === 'uz_cyr') && !h.text;
    const isRuFallDt = _lang === 'ru' && _isRuFallback(h);
    const isRealUzDt = (_lang === 'uz' || _lang === 'uz_cyr') && !!h.text;
    const detailTextHTML = detailTxt
      ? ((isFallback || isRuFallDt)
          ? `<div class="hd-detail-uz" style="opacity:.45;font-style:italic">${_esc(detailTxt)}</div>`
          : isRealUzDt
            ? `<div class="hd-detail-uz" style="font-style:normal;font-size:15px;line-height:1.8;opacity:.92">${_esc(detailTxt)}</div>`
            : `<div class="hd-detail-uz">${_esc(detailTxt)}</div>`)
      : '';

    const isUzBukhari = (_lang === 'uz' || _lang === 'uz_cyr') && _collection === 'bukhari' && h.text;
    const jildBadge   = isUzBukhari && h.jild
      ? `<span class="hd-detail-kat">${_T('Jild','Жилд','Том','Vol.')} ${h.jild}</span>`
      : '';
    const uzSource = isUzBukhari
      ? `<div style="margin-top:14px;font-size:11px;opacity:.4;text-align:center">
           📚 Al-Jome' as-Sahih · ${_T('Zokirjon Ismoil tarjimasi, 1991','Зокиржон Исмоил таржимаси, 1991','','')}
         </div>`
      : '';

    return `
<button class="hd-detail-back" id="hd-detail-back">← ${_T('Orqaga','Орқага','Назад','Back')}</button>
<div class="hd-detail-box">
  <div class="hd-detail-topline"></div>
  <div class="hd-detail-badges">
    <span class="hd-detail-ref">${_esc(ref)}</span>
    <div class="hd-badge-row">
      <span class="hd-detail-sahih">✓ SAHIH</span>
      ${h.chapter ? `<span class="hd-detail-kat">${_esc(h.chapter)}</span>` : ''}
      ${jildBadge}
    </div>
  </div>
  ${h.arabic ? `<div class="hd-detail-ar">${h.arabic}</div>` : ''}
  ${h.arabic && detailTxt ? `<div class="hd-detail-sep"></div>` : ''}
  ${detailTextHTML}
  ${h.narrator ? `
  <div class="hd-detail-rowi">
    <span class="hd-detail-rowi-lbl">${_T('Rowi (rivoyatchi)','Ровий (ривоятчи)','Рассказчик','Narrator')}</span>
    <span class="hd-detail-rowi-val">${_esc(h.narrator)}</span>
  </div>` : ''}
  ${uzSource}
</div>
<div class="hd-detail-nav">
  <button class="hd-nav-btn" id="hd-nav-prev" ${hasPrev ? '' : 'disabled'}>‹ ${_T('Oldingi','Олдинги','Предыдущий','Previous')}</button>
  <span class="hd-nav-pos">${_selIdx + 1} / ${_pageHadiths.length}</span>
  <button class="hd-nav-btn" id="hd-nav-next" ${hasNext ? '' : 'disabled'}>${_T('Keyingi','Кейинги','Следующий','Next')} ›</button>
</div>`;
  }

  /* ── Category (Bo'limlar) tab ── */
  function _buildKat() {
    const b = BOOKS[_collection];

    if (_collection === 'muslim') {
      const infoBox = `
<div class="hd-book-info">
  <div class="hd-book-info-topline"></div>
  <div class="hd-book-info-ar">${b.ar}</div>
  <div class="hd-book-info-name">${_esc(_bLbl(b))}</div>
  <div class="hd-book-info-imam">${_esc(_bImam(b))}</div>
  <div class="hd-book-info-count">${b.count} ${_T('hadis','ҳадис','хадисов','hadiths')}</div>
</div>`;
      if (_muslimBooks.length === 0) {
        _fetchMuslimBooks();
        return `<div class="hd-sec-lbl">${_esc(_bLbl(b))} · ${_T('Kitoblari','Китоблари','Книги','Books')}</div>${infoBox}
<div class="hd-loading"><div class="hd-spinner"></div></div>`;
      }
      const cards = _muslimBooks.map(bk => `
<div class="hd-kat-ch-card" data-chid="${bk.book_id}">
  <div class="hd-kat-ch-jild">${_T('Kitob','Китоб','Книга','Book')} ${bk.book_id}</div>
  <div class="hd-kat-ch-name">${_esc(bk.name)}</div>
  <div class="hd-kat-ch-cnt">${bk.count} ${_T('hadis','ҳадис','хадисов','hadiths')} →</div>
</div>`).join('');
      return `<div class="hd-sec-lbl">${_esc(_bLbl(b))} · ${_T('Kitoblari','Китоблари','Книги','Books')}</div>${infoBox}${cards}`;
    }

    const isUzBukhari = (_lang === 'uz' || _lang === 'uz_cyr') && _collection === 'bukhari';
    const cards = KATEGORIYALAR.map((k, idx) => {
      const ic  = KAT_ICONS[k] || '📖';
      const cnt = _catCounts[k];
      const sub = isUzBukhari && cnt
        ? `${cnt.count} ${_T('hadis','ҳадис','хадисов','hadiths')} · ${cnt.chapter_count} ${_T("bo'lim","бўлим","раздел","chapters")}`
        : (isUzBukhari ? '…' : _T("Bo'lim →","Бўлим →","Раздел →","Section →"));
      const displayName = _lang === 'uz_cyr' ? (KATEGORIYALAR_CYR[idx] || k) : _lang === 'en' ? (KATEGORIYALAR_EN[idx] || k) : k;
      return `<div class="hd-kat-card" data-kat="${_esc(k)}">
  <div class="hd-kat-card-ic">${ic}</div>
  <div class="hd-kat-card-name">${_esc(displayName)}</div>
  <div class="hd-kat-card-sub">${sub}</div>
</div>`;
    }).join('\n');
    return `
<div class="hd-sec-lbl">${_esc(_bLbl(b))} · ${_T("Bo'limlari","Бўлимлари","Разделы","Sections")}</div>
<div class="hd-book-info">
  <div class="hd-book-info-topline"></div>
  <div class="hd-book-info-ar">${b.ar}</div>
  <div class="hd-book-info-name">${_esc(_bLbl(b))}</div>
  <div class="hd-book-info-imam">${_esc(_bImam(b))}</div>
  <div class="hd-book-info-count">${b.count} ${_T('hadis','ҳадис','хадисов','hadiths')}</div>
</div>
<div class="hd-kat-grid">${cards}</div>`;
  }

  function _buildMuslimBooks() {
    if (_muslimBooks.length === 0) {
      return `<div class="hd-loading"><div class="hd-spinner"></div></div>`;
    }
    const cards = _muslimBooks.map(bk => `
<div class="hd-kat-ch-card" data-chid="${bk.book_id}">
  <div class="hd-kat-ch-jild">${_T('Kitob','Китоб','Книга','Book')} ${bk.book_id}</div>
  <div class="hd-kat-ch-name">${_esc(bk.name)}</div>
  <div class="hd-kat-ch-cnt">${bk.count} ${_T('hadis','ҳадис','хадисов','hadiths')} →</div>
</div>`).join('');
    return `
<button class="hd-detail-back" id="hd-cat-back">← Sahih Muslim</button>
<div class="hd-sec-lbl">📚 Sahih Muslim · ${_T('Kitoblari','Китоблари','Книги','Books')}</div>
${cards}`;
  }

  function _buildCatChapters() {
    const loading = _catChapters.length === 0
      ? `<div class="hd-loading"><div class="hd-spinner"></div></div>`
      : _catChapters.map(ch => `
<div class="hd-kat-ch-card" data-chid="${ch.chapter_id}">
  <div class="hd-kat-ch-jild">${_T('Jild','Жилд','Том','Vol.')} ${ch.jild}</div>
  <div class="hd-kat-ch-name">${_esc(ch.chapter_name)}</div>
  <div class="hd-kat-ch-cnt">${ch.count} ${_T('hadis','ҳадис','хадисов','hadiths')} →</div>
</div>`).join('');

    return `
<button class="hd-detail-back" id="hd-cat-back">← ${_esc(_katFilter || '')}</button>
<div class="hd-sec-lbl">📂 ${_esc(_katFilter || '')} · ${_T("Bo'limlari","Бўлимлари","Разделы","Chapters")}</div>
${loading}`;
  }

  /* ══════════════════════════════════════════════
     Event binding (called ONCE per render/load)
  ══════════════════════════════════════════════ */
  function _bind() {
    if (!_el) return;

    /* ← Menyu */
    _el.querySelector('#hd-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    /* Book switch — update visuals + re-fetch, no full re-render */
    _el.querySelectorAll('.hd-book-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (_collection === btn.dataset.col) return;
        _collection = btn.dataset.col;
        _page = 1; _pageHadiths = []; _selIdx = null; _katFilter = null; _searchVal = '';
        _catChapters = []; _selChapterId = null; _katView = 'grid';
        _el.querySelectorAll('.hd-book-btn').forEach(b => {
          const c = b.dataset.col === 'bukhari' ? 'gold' : 'purple';
          const isAct = _collection === b.dataset.col;
          b.classList.toggle(c, isAct);
          const nm = b.querySelector('.hd-book-name');
          if (nm) nm.classList.toggle(c, isAct);
        });
        _fetchPage();
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    /* Tab switch */
    _el.querySelectorAll('.hd-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (_tab === btn.dataset.tab) return;
        _tab = btn.dataset.tab;
        _selIdx = null;
        _el.querySelectorAll('.hd-tab').forEach(t =>
          t.classList.toggle('active', t.dataset.tab === _tab)
        );
        _refreshBody();
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    /* Body — event delegation (body element is stable, only innerHTML changes) */
    const body = _el.querySelector('#hd-body');
    if (!body) return;

    body.addEventListener('click', e => {
      /* ← Orqaga in detail */
      if (e.target.closest('#hd-detail-back')) {
        _selIdx = null; _refreshBody(); return;
      }
      /* Detail prev/next */
      if (e.target.closest('#hd-nav-prev')) {
        if (_selIdx > 0) { _selIdx--; _refreshBody(); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); }
        return;
      }
      if (e.target.closest('#hd-nav-next')) {
        if (_selIdx < _pageHadiths.length - 1) { _selIdx++; _refreshBody(); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); }
        return;
      }
      /* List pagination */
      if (e.target.closest('#hd-prev')) {
        if (_page > 1) { _page--; _fetchPage(); }
        return;
      }
      if (e.target.closest('#hd-next')) {
        if (_page < _totalPages) { _page++; _fetchPage(); }
        return;
      }
      /* ← back from chapter list / Muslim books to category grid */
      if (e.target.closest('#hd-cat-back')) {
        _katView = 'grid'; _katFilter = null; _catChapters = [];
        _refreshBody(); return;
      }
      /* Chapter card → open hadiths for that chapter */
      const chCard = e.target.closest('.hd-kat-ch-card');
      if (chCard) {
        _selChapterId = parseInt(chCard.dataset.chid);
        _page = 1; _pageHadiths = []; _selIdx = null;
        _tab = 'hadiths';
        _el.querySelectorAll('.hd-tab').forEach(t =>
          t.classList.toggle('active', t.dataset.tab === 'hadiths')
        );
        _fetchPage();
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        return;
      }
      /* ✕ — clear chapter filter, go back to chapter list */
      if (e.target.closest('#hd-kat-clr')) {
        if (_selChapterId !== null && _katFilter) {
          _selChapterId = null; _selIdx = null; _page = 1; _pageHadiths = [];
          _tab = 'kategoriya'; _katView = 'chapters';
          _el.querySelectorAll('.hd-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.tab === 'kategoriya')
          );
          _refreshBody();
        } else {
          _katFilter = null; _selChapterId = null; _refreshBody();
        }
        return;
      }
      /* Search clear */
      if (e.target.closest('#hd-search-clr')) {
        _searchVal = '';
        const si = body.querySelector('#hd-search');
        if (si) { si.value = ''; si.focus(); }
        e.target.style.display = 'none';
        return;
      }
      /* Retry button */
      if (e.target.closest('#hd-retry')) {
        _fetchPage(); return;
      }
      /* Hadith card → open detail */
      const card = e.target.closest('.hd-card');
      if (card) {
        _selIdx = parseInt(card.dataset.idx);
        _refreshBody();
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        return;
      }
      /* Category card → chapter list (uz+bukhari only, not Muslim) */
      const katCard = e.target.closest('.hd-kat-card');
      if (katCard) {
        const kat = katCard.dataset.kat;
        if ((_lang === 'uz' || _lang === 'uz_cyr') && _collection === 'bukhari') {
          _katFilter = kat; _katView = 'chapters'; _catChapters = [];
          _selIdx = null;
          _refreshBody();
          _fetchCatChapters(kat);
        }
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
        return;
      }
    });

    /* Search input */
    body.addEventListener('input', e => {
      if (e.target.id !== 'hd-search') return;
      _searchVal = e.target.value;
      const clr = body.querySelector('#hd-search-clr');
      if (clr) clr.style.display = _searchVal ? '' : 'none';
    });

    /* Search on Enter */
    body.addEventListener('keydown', e => {
      if (e.target.id !== 'hd-search' || e.key !== 'Enter') return;
      const q = e.target.value.trim();
      if (q) _fetchSearch(q);
    });
  }

  /* ══════════════════════════════════════════════
     Category API helpers
  ══════════════════════════════════════════════ */
  async function _fetchCatCounts() {
    if (_lang !== 'uz' && _lang !== 'uz_cyr') return;
    try {
      const r = await fetch(`/api/hadith/categories?lang=${_lang}`);
      if (!r.ok) return;
      const d = await r.json();
      (d.categories || []).forEach(c => { _catCounts[c.name] = c; });
      if (_tab === 'kategoriya' && _katView === 'grid') _refreshBody();
    } catch {}
  }

  async function _fetchCatChapters(catName) {
    try {
      const r = await fetch(`/api/hadith/category?name=${encodeURIComponent(catName)}&lang=${_lang}`);
      if (!r.ok) return;
      const d = await r.json();
      _catChapters = d.chapters || [];
      _refreshBody();
    } catch {}
  }

  async function _fetchMuslimBooks() {
    if (_muslimBooks.length > 0) return;
    try {
      const r = await fetch('/api/hadith/muslim/books');
      if (!r.ok) return;
      const d = await r.json();
      _muslimBooks = d.books || [];
      if (_tab === 'kategoriya') _refreshBody();
    } catch {}
  }

  /* ══════════════════════════════════════════════
     DOM helpers
  ══════════════════════════════════════════════ */
  function _refreshBody() {
    const body = _el?.querySelector('#hd-body');
    if (body) body.innerHTML = _buildContent();
  }

  /* ══════════════════════════════════════════════
     API calls
  ══════════════════════════════════════════════ */
  async function _fetchPage() {
    if (_loading) return;
    _loading = true;
    _pageHadiths = [];
    _refreshBody(); // shows spinner (empty list = spinner)

    try {
      const chParam = _selChapterId !== null ? `&chapter_id=${_selChapterId}` : '';
      const resp = await fetch(
        `/api/hadith?collection=${_collection}&page=${_page}&limit=${PAGE_SIZE}&lang=${_lang}${chParam}`
      );
      if (!resp.ok) throw new Error('api');
      const data   = await resp.json();
      _totalPages  = data.pages  || 1;
      _totalCount  = data.total  || 0;
      _pageHadiths = data.hadiths || [];
      _refreshBody();
    } catch (_) {
      const body = _el?.querySelector('#hd-body');
      if (body) body.innerHTML = `
<div class="hd-empty">❌ ${_T('Xatolik yuz berdi','Хатолик юз берди','Произошла ошибка','Error occurred')}
  <br><button class="hd-retry-btn" id="hd-retry">${_T('Qayta urinish','Қайта уриниш','Повторить','Retry')}</button>
</div>`;
    } finally {
      _loading = false;
    }
  }

  async function _fetchSearch(q) {
    if (_loading) return;
    _loading = true;
    _page = 1; _pageHadiths = [];
    _refreshBody(); // shows spinner

    try {
      const resp = await fetch(
        `/api/hadith/search?q=${encodeURIComponent(q)}&collection=${_collection}&lang=${_lang}`
      );
      if (!resp.ok) throw new Error('api');
      const data   = await resp.json();
      _pageHadiths = data.hadiths || [];
      _totalPages  = 1;
      _totalCount  = _pageHadiths.length;
      _refreshBody();
    } catch (_) {
      const body = _el?.querySelector('#hd-body');
      if (body) body.innerHTML = `<div class="hd-empty">❌ ${_T('Qidiruvda xatolik','Қидирувда хатолик','Ошибка поиска','Search error')}</div>`;
    } finally {
      _loading = false;
    }
  }

  /* ══════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════ */
  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _isRuFallback(h) {
    if (!h.text) return true;
    return /^Telah\b|^Diceritakan\b|^Dari\b/.test(h.text);
  }

  function _getText(h) {
    if (_lang === 'uz' || _lang === 'uz_cyr') {
      if (h.text) return _lang === 'uz_cyr' ? _cy(h.text) : h.text;
      return _lang === 'uz_cyr'
        ? 'Ушбу ҳадис таржимаси ҳозирча мавжуд эмас.'
        : "Ushbu hadis tarjimasi hozircha mavjud emas.";
    }
    if (_lang === 'ru') {
      if (!_isRuFallback(h)) return h.text;
      return 'Русский перевод данного хадиса пока не добавлен.';
    }
    if (_lang === 'en') {
      return h.text || 'English translation not yet available.';
    }
    return h.text || '';
  }

  return { render, load };
})();
