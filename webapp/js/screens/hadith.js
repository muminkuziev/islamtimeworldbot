/* Verified HadeethEnc reader. Originals remain source-exact; Uzbek display
   fields change the script only, while filters retain the source keys. */
const HadithScreen = (function () {
  'use strict';
  const PAGE_SIZE = 12;
  let el, lang = 'en', page = 1, pages = 0, tab = 'hadiths', query = '', book = '';
  let rows = [], books = [], selected = null, loading = true, failed = false;
  let booksLoading = true, booksFailed = false;
  let generation = 0, requestId = 0, controller;
  const esc = value => String(value ?? '').replace(/[&<>"']/g,
    char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const T = (uz, cyr, ru, en) => _resolveT(uz, cyr, ru, en, lang);
  const provider = () => window.HadithRegistry.get(lang === 'av' ? 'avar_official' : lang === 'ce' ? 'chechen_official' : 'hadeethenc');
  const providerMeta = () => lang === 'av'
    ? { name:'Ас-Салам · ДУМ Дагестана', count:194 }
    : lang === 'ce'
      ? { name:'IslamHouse · Нохчийн', count:93 }
      : { name:'HadeethEnc', count:144 };
  const text = (record, key) => HadithDisplay.field(record, key, lang);
  const label = {
    hadith: () => T('Hadislar','Ҳадислар','Хадисы','Hadiths'),
    source: () => T('Manba','Манба','Источник','Source'),
    search: () => T('Qidiruv','Қидирув','Поиск','Search'),
    empty: () => T('Hadis topilmadi','Ҳадис топилмади','Хадис не найден','Hadith not found'),
    back: () => T('Orqaga','Орқага','Назад','Back'),
    previous: () => T('Oldingi','Олдинги','Предыдущий','Previous'),
    next: () => T('Keyingi','Кейинги','Следующий','Next'),
    retry: () => T('Qayta urinish','Қайта уриниш','Повторить','Retry'),
    error: () => T('Xatolik yuz berdi','Хатолик юз берди','Произошла ошибка','Error occurred'),
  };

  function render() {
    lang = window.App?.state?.lang || 'en';
    el = document.getElementById('screen-hadith');
    if (!el) return;
    el.innerHTML = shell();
    bind();
  }

  function load(language) {
    controller?.abort();
    generation++;
    lang = language || window.App?.state?.lang || 'en';
    el = document.getElementById('screen-hadith');
    if (!el) return;
    page = 1; pages = 0; tab = 'hadiths'; query = ''; book = '';
    rows = []; books = []; selected = null; loading = true; failed = false;
    el.innerHTML = shell();
    bind();
    fetchPage();
    fetchBooks();
  }

  async function fetchBooks() {
    const current = generation;
    booksLoading = true; booksFailed = false;
    if (tab === 'books') refresh();
    try {
      const data = await provider().books(lang);
      if (current !== generation) return;
      books = data.books || [];
    } catch {
      if (current === generation) booksFailed = true;
    } finally {
      if (current === generation) { booksLoading = false; if (tab === 'books') refresh(); }
    }
  }

  function shell() {
    const tabs = [['hadiths', label.hadith()], ['books', label.source()], ['search', label.search()]];
    const meta = providerMeta();
    return `<div class="hd-hdr hd-hdr--photo">
      <img class="hd-hdr-photo" src="assets/landing/haram-madinah.webp" alt="" loading="eager">
      <div class="nm-tile-ov"></div><div class="hd-hdr-inner">
      <div class="hd-nav-row"><button class="hd-back" id="hd-back">${label.back()}</button></div>
      <h1 class="hd-title">${label.hadith()}</h1>
      <div class="hd-books"><div class="hd-book-btn gold"><div class="hd-book-name gold">${esc(meta.name)}</div>
      <div class="hd-book-cnt">${meta.count} ${T('tasdiqlangan hadis','тасдиқланган ҳадис','проверенных хадисов','verified hadiths')}</div></div></div>
      <div class="hd-tabs" role="tablist">${tabs.map(([key, text]) =>
        `<button class="hd-tab${tab === key ? ' active' : ''}" role="tab" aria-selected="${tab === key}" data-tab="${key}">${text}</button>`).join('')}</div>
      </div></div><div class="hd-body" id="hd-body">${body()}</div>`;
  }

  function body() {
    if (selected !== null) return detail();
    if (tab === 'books' && booksLoading) return `<div class="hd-loading" role="status"><div class="hd-spinner"></div><span>${t('loading', lang)}</span></div>`;
    if (tab === 'books' && booksFailed) return `<div class="hd-empty" role="alert">${label.error()}<br><button class="hd-retry-btn" id="hd-books-retry">${label.retry()}</button></div>`;
    if (tab === 'books') return books.length
      ? `<div class="hd-kat-grid">${books.map((item, index) =>
          `<button class="hd-kat-card" data-book="${index}"><span class="hd-kat-card-name" dir="auto">${esc(HadithDisplay.bookName(item, lang))}</span><span class="hd-kat-card-sub">${item.count}</span></button>`).join('')}</div>`
      : `<div class="hd-empty">${label.empty()}</div>`;
    const search = tab === 'search' ? `<form class="hd-search-wrap" id="hd-search-form">
      <input class="hd-search-in" id="hd-search" type="search" maxlength="160" dir="auto" value="${esc(query)}" placeholder="${label.search()}" aria-label="${label.search()}">
      <button class="hd-search-clr" type="submit" aria-label="${label.search()}">⌕</button>
      ${query ? `<button class="hd-search-clr" type="button" id="hd-search-clr" aria-label="${label.back()}">×</button>` : ''}</form>` : '';
    const filter = book ? `<div class="hd-kat-badge"><span dir="auto">${esc(HadithDisplay.bookName(books.find(item => item.name === book) || { name:book }, lang))}</span><button id="hd-kat-clr" class="hd-kat-clr" aria-label="${label.back()}">×</button></div>` : '';
    let list;
    if (loading) list = `<div class="hd-loading" role="status"><div class="hd-spinner"></div><span>${typeof t === 'function' ? t('loading', lang) : ''}</span></div>`;
    else if (failed) list = `<div class="hd-empty" role="alert">${label.error()}<br><button class="hd-retry-btn" id="hd-retry">${label.retry()}</button></div>`;
    else if (!rows.length) list = `<div class="hd-empty" role="status">${label.empty()}</div>`;
    else list = rows.map(card).join('');
    const pagination = !loading && !failed && pages > 1 ? `<div class="hd-pag">
      <button class="hd-pag-btn" id="hd-prev" ${page <= 1 ? 'disabled' : ''}>${label.previous()}</button>
      <span class="hd-pag-info">${page} / ${pages}</span>
      <button class="hd-pag-btn" id="hd-next" ${page >= pages ? 'disabled' : ''}>${label.next()}</button></div>` : '';
    return search + filter + `<div id="hd-list">${list}</div>` + pagination;
  }

  function card(hadith, index) {
    return `<button class="hd-card" data-idx="${index}" type="button" style="width:100%;text-align:start">
      ${hadith.title ? `<div class="hd-chapter-hdr" dir="auto">${esc(text(hadith, 'title'))}</div>` : ''}
      <div class="${hadith.language === 'ar' ? 'hd-card-ar' : 'hd-card-uz'}" dir="auto">${esc(text(hadith, 'text'))}</div>
      <div class="hd-card-foot"><div class="hd-card-foot-left">
      ${hadith.grade ? `<span class="hd-sahih" dir="auto">${esc(text(hadith, 'grade'))}</span>` : ''}
      </div><span class="hd-card-ref">${esc(hadith.provider_label || (hadith.source === 'as-salam.press' ? 'Ас-Салам' : hadith.source === 'islamhouse.com' ? 'IslamHouse' : 'HadeethEnc'))} · ${esc(hadith.id)}</span></div></button>`;
  }

  function detail() {
    const h = rows[selected];
    if (!h) return `<div class="hd-empty">${label.empty()}</div>`;
    const sourceUrl = h.source_url || `https://hadeethenc.com/${encodeURIComponent(h.language)}/browse/hadith/${encodeURIComponent(h.id)}`;
    const sourceLabel = h.provider_label || (h.source === 'as-salam.press' ? 'Ас-Салам' : h.source === 'islamhouse.com' ? 'IslamHouse' : 'HadeethEnc');
    return `<button class="hd-detail-back" id="hd-detail-back">${label.back()}</button>
      <article class="hd-detail-box"><div class="hd-detail-topline"></div>
      <div class="hd-detail-badges"><span class="hd-detail-ref">${esc(sourceLabel)} · ${esc(h.id)}</span>
      ${h.grade ? `<span class="hd-detail-sahih" dir="auto">${esc(text(h, 'grade'))}</span>` : ''}</div>
      ${h.title ? `<h2 class="hd-chapter-hdr" dir="auto">${esc(text(h, 'title'))}</h2>` : ''}
      ${h.arabic ? `<div class="hd-detail-ar" lang="ar" dir="rtl">${esc(h.arabic)}</div>` : ''}
      ${h.language !== 'ar' ? `<div class="hd-detail-sep"></div><div class="hd-detail-uz" lang="${lang === 'uz' ? 'uz-Latn' : esc(h.language)}" dir="auto" style="white-space:pre-line">${esc(text(h, 'text'))}</div>` : ''}
      ${h.attribution ? `<div class="hd-detail-rowi" dir="auto">${esc(text(h, 'attribution'))}</div>` : ''}
      ${h.explanation ? `<div class="hd-detail-sep"></div><div class="hd-detail-uz" dir="auto" style="white-space:pre-line">${esc(text(h, 'explanation'))}</div>` : ''}
      <a class="hd-detail-ref" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${label.source()}: ${esc(h.source)}</a>
      </article><div class="hd-detail-nav">
      <button class="hd-nav-btn" id="hd-nav-prev" ${selected === 0 ? 'disabled' : ''}>${label.previous()}</button>
      <span class="hd-nav-pos">${selected + 1} / ${rows.length}</span>
      <button class="hd-nav-btn" id="hd-nav-next" ${selected >= rows.length - 1 ? 'disabled' : ''}>${label.next()}</button></div>`;
  }

  function refresh() {
    const target = el?.querySelector('#hd-body');
    if (target) target.innerHTML = body();
    el?.querySelectorAll('.hd-tab').forEach(button => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function bind() {
    el.onclick = event => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.id === 'hd-back') return window.App?.navigate('screen-dashboard');
      if (target.dataset.tab) {
        tab = target.dataset.tab; selected = null;
        if (tab === 'hadiths' && (query || book)) { query = ''; book = ''; page = 1; fetchPage(); }
        else refresh();
        return;
      }
      if (target.dataset.book !== undefined) {
        book = books[Number(target.dataset.book)]?.name || '';
        tab = 'hadiths'; page = 1; query = ''; fetchPage(); return;
      }
      if (target.dataset.idx !== undefined) { selected = Number(target.dataset.idx); refresh(); return; }
      if (target.id === 'hd-detail-back') { selected = null; refresh(); }
      if (target.id === 'hd-nav-prev' && selected > 0) { selected--; refresh(); }
      if (target.id === 'hd-nav-next' && selected < rows.length - 1) { selected++; refresh(); }
      if (target.id === 'hd-prev' && page > 1) { page--; fetchPage(); }
      if (target.id === 'hd-next' && page < pages) { page++; fetchPage(); }
      if (target.id === 'hd-retry') fetchPage();
      if (target.id === 'hd-books-retry') fetchBooks();
      if (target.id === 'hd-search-clr' || target.id === 'hd-kat-clr') {
        query = ''; book = ''; page = 1; fetchPage();
      }
    };
    el.onsubmit = event => {
      if (event.target.id !== 'hd-search-form') return;
      event.preventDefault();
      query = el.querySelector('#hd-search').value.trim();
      page = 1; selected = null; fetchPage();
    };
  }

  async function fetchPage() {
    controller?.abort();
    controller = new AbortController();
    const request = ++requestId, current = generation;
    loading = true; failed = false; selected = null; rows = [];
    refresh();
    try {
      const data = await provider().list(page, PAGE_SIZE, lang, { q:query, book, signal:controller.signal });
      if (request !== requestId || current !== generation) return;
      rows = data.hadiths; pages = data.pages;
    } catch (error) {
      if (request !== requestId || current !== generation || error.name === 'AbortError') return;
      failed = true;
    } finally {
      if (request === requestId && current === generation) { loading = false; refresh(); }
    }
  }
  return { render, load };
})();
