/* ═══════════════════════════════════════════════════
   Hadith Screen — Sahih Bukhari & Sahih Muslim
   Fetches from /api/hadith (FastAPI backend with SQLite)
   Falls back to a small bundled sample if offline
   ═══════════════════════════════════════════════════ */

const HadithScreen = (function () {

  const API_BASE    = '/api/hadith';
  const PAGE_SIZE   = 20;

  const COLLECTIONS = [
    { key: 'bukhari', total: 7563 },
    { key: 'muslim',  total: 7500 },
  ];

  let _lang       = 'uz';
  let _collection = 'bukhari';
  let _page       = 1;
  let _totalPages = 1;
  let _loading    = false;

  function render() {
    const el = document.getElementById('screen-hadith');
    if (!el) return;
    _lang = window.App?.state?.lang || 'uz';
    _collection = 'bukhari';
    _page = 1;
    el.innerHTML = _buildHTML(_lang);
    _bindEvents(el);
    _fetchPage(el);
  }

  function load(lang) {
    _lang = lang;
    _collection = 'bukhari';
    _page = 1;
    const el = document.getElementById('screen-hadith');
    if (!el) return;
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el);
    _fetchPage(el);
  }

  function _buildHTML(lang) {
    const colLabel = col => col === 'bukhari'
      ? t('hadith_bukhari', lang)
      : t('hadith_muslim', lang);

    const tabsHTML = COLLECTIONS.map(c => `
      <button class="hadith-tab${c.key === _collection ? ' active' : ''}" data-col="${c.key}">
        ${colLabel(c.key)}
      </button>
    `).join('');

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="hadith-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">📚 ${t('modules_list.hadith', lang)}</h1>
        </div>

        <div class="hadith-body">
          <!-- Collection tabs -->
          <div class="hadith-tabs">
            ${tabsHTML}
          </div>

          <!-- Search -->
          <div class="hadith-search-wrap">
            <input type="text" class="hadith-search-input" id="hadith-search"
                   placeholder="${t('search', lang)}" autocomplete="off"/>
            <button class="hadith-search-btn" id="hadith-search-btn">🔍</button>
          </div>
          <div class="hadith-search-hint">${t('hadith_search_hint', lang)}</div>

          <!-- List -->
          <div class="hadith-list" id="hadith-list">
            <div class="hadith-loading"><span class="hadith-spinner"></span></div>
          </div>

          <!-- Pagination -->
          <div class="hadith-pagination" id="hadith-pagination" style="display:none">
            <button class="hadith-page-btn" id="hadith-prev">‹</button>
            <span class="hadith-page-info" id="hadith-page-info"></span>
            <button class="hadith-page-btn" id="hadith-next">›</button>
          </div>
        </div>
      </div>
    `;
  }

  function _bindEvents(el) {
    el.querySelector('#hadith-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    el.querySelectorAll('.hadith-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _collection = tab.dataset.col;
        _page = 1;
        el.querySelectorAll('.hadith-tab').forEach(t2 => t2.classList.remove('active'));
        tab.classList.add('active');
        _fetchPage(el);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    el.querySelector('#hadith-search-btn')?.addEventListener('click', () => {
      const q = el.querySelector('#hadith-search')?.value?.trim() || '';
      if (q) _fetchSearch(el, q);
    });

    el.querySelector('#hadith-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) _fetchSearch(el, q);
      }
    });

    el.querySelector('#hadith-prev')?.addEventListener('click', () => {
      if (_page > 1) { _page--; _fetchPage(el); }
    });

    el.querySelector('#hadith-next')?.addEventListener('click', () => {
      if (_page < _totalPages) { _page++; _fetchPage(el); }
    });
  }

  async function _fetchPage(el) {
    if (_loading) return;
    _loading = true;
    _setList(el, '<div class="hadith-loading"><span class="hadith-spinner"></span></div>');

    try {
      const url = `${API_BASE}?collection=${_collection}&page=${_page}&limit=${PAGE_SIZE}&lang=${_lang}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();
      _totalPages = Math.ceil((data.total || 0) / PAGE_SIZE);
      _renderList(el, data.hadiths || []);
      _updatePagination(el, data.total);
    } catch (_e) {
      _renderFallback(el);
    } finally {
      _loading = false;
    }
  }

  async function _fetchSearch(el, query) {
    if (_loading) return;
    _loading = true;
    _page = 1;
    _setList(el, '<div class="hadith-loading"><span class="hadith-spinner"></span></div>');

    try {
      const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&collection=${_collection}&lang=${_lang}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();
      _totalPages = Math.ceil((data.total || 0) / PAGE_SIZE);
      _renderList(el, data.hadiths || []);
      _updatePagination(el, data.total);
    } catch (_e) {
      _renderFallback(el);
    } finally {
      _loading = false;
    }
  }

  function _renderList(el, hadiths) {
    if (!hadiths.length) {
      _setList(el, `<div class="hadith-empty">📚 ${t('noData', _lang)}</div>`);
      return;
    }

    const html = hadiths.map(h => _buildCard(h)).join('');
    _setList(el, html);
  }

  function _buildCard(h) {
    const colLabel = h.collection === 'bukhari'
      ? (typeof I18N !== 'undefined' && I18N.hadith_bukhari ? I18N.hadith_bukhari[_lang] || 'Sahih al-Bukhari' : 'Sahih al-Bukhari')
      : (typeof I18N !== 'undefined' && I18N.hadith_muslim  ? I18N.hadith_muslim[_lang]  || 'Sahih Muslim'     : 'Sahih Muslim');

    return `
      <div class="hadith-card">
        <div class="hadith-card-header">
          <span class="hadith-num">${t('hadith_number', _lang)} ${h.hadith_number || h.id}</span>
          <span class="hadith-col-badge">${colLabel}</span>
        </div>
        ${h.arabic ? `<div class="hadith-card-arabic">${h.arabic}</div>` : ''}
        <div class="hadith-card-text">${_esc(h.text || '')}</div>
        ${h.narrator ? `<div class="hadith-card-narrator">${t('hadith_narrator', _lang)}: ${_esc(h.narrator)}</div>` : ''}
        ${h.chapter  ? `<div class="hadith-card-chapter">${_esc(h.chapter)}</div>` : ''}
      </div>
    `;
  }

  function _renderFallback(el) {
    /* Show a small hardcoded sample when API is unavailable */
    const sample = [
      {
        collection:'bukhari', hadith_number:1, narrator:'Umar ibn al-Khattab (r.a.)',
        text: "Actions are judged by intentions, and every person will get the reward according to what he has intended. So whoever emigrated for Allah and His Messenger, his emigration will be for Allah and His Messenger; and whoever emigrated for worldly benefits or to marry a woman, then his emigration will be for what he emigrated for.",
        arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ'
      },
      {
        collection:'muslim', hadith_number:2699, narrator:'Abu Hurairah (r.a.)',
        text: "He who follows a path in quest of knowledge, Allah will make the path of Jannah easy to him.",
        arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا'
      },
    ];
    _renderList(el, sample);
  }

  function _updatePagination(el, total) {
    const pag = el.querySelector('#hadith-pagination');
    const inf = el.querySelector('#hadith-page-info');
    if (!pag || !inf) return;
    if (total > PAGE_SIZE) {
      pag.style.display = 'flex';
      inf.textContent = `${_page} / ${_totalPages}`;
      el.querySelector('#hadith-prev').disabled = _page <= 1;
      el.querySelector('#hadith-next').disabled = _page >= _totalPages;
    } else {
      pag.style.display = 'none';
    }
  }

  function _setList(el, html) {
    const list = el.querySelector('#hadith-list');
    if (list) list.innerHTML = html;
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render, load };
})();
