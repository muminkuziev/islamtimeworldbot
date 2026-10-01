/* Verified HadeethEnc provider — 144 records in each canonical language. */
const HadithRegistry = (function () {
  'use strict';
  const CANONICAL = new Set(['ar','en','id','ur','bn','fr','hi','fa','tr','ru','uz','de','ms']);
  const ALIASES = { uz_cyr:'uz' };
  function language(code) {
    const normalized = String(code || 'en').toLowerCase().replace(/-/g, '_');
    const value = ALIASES[normalized] || normalized;
    return CANONICAL.has(value) ? value : 'en';
  }
  async function request(path, params, signal) {
    const query = new URLSearchParams(params || {});
    const response = await fetch(path + (query.toString() ? '?' + query : ''), { signal });
    if (!response.ok) throw new Error('Hadith request failed');
    const data = await response.json();
    if (data.language !== params.lang || data.verified !== true) throw new Error('Hadith source/language mismatch');
    if (path.endsWith('/books') ? !Array.isArray(data.books) : !Array.isArray(data.hadiths)) {
      throw new Error('Invalid Hadith provider response');
    }
    if (data.hadiths && data.hadiths.some(row => row.language !== params.lang || !row.text || row.source !== 'hadeethenc.com')) {
      throw new Error('Hadith content provenance mismatch');
    }
    return data;
  }
  const verified = {
    key: 'hadeethenc',
    count: 144,
    languages: [...CANONICAL],
    list(page, limit, lang, filters) {
      return request('/api/hadeethenc', {
        page: page || 1, limit: limit || 12, lang: language(lang),
        q: filters?.q || '', book: filters?.book || ''
      }, filters?.signal);
    },
    detail(id, lang) {
      return request('/api/hadeethenc', { hadith_id:id, lang:language(lang), limit:1 });
    },
    books(lang) {
      return request('/api/hadeethenc/books', { lang:language(lang) });
    },
    search(query, lang, page, limit) {
      return this.list(page || 1, limit || 12, lang, { q:query });
    }
  };

  async function requestAvar(path, params, signal) {
    const query = new URLSearchParams(params || {});
    const response = await fetch(path + (query.toString() ? '?' + query : ''), { signal });
    if (!response.ok) throw new Error('Avar Hadith request failed');
    const data = await response.json();
    if (data.language !== 'av' || data.verified !== true) throw new Error('Avar Hadith source/language mismatch');
    if (path.endsWith('/books') ? !Array.isArray(data.books) : !Array.isArray(data.hadiths)) {
      throw new Error('Invalid Avar Hadith provider response');
    }
    if (data.hadiths && data.hadiths.some(row =>
      row.language !== 'av' || !row.text || row.source !== 'as-salam.press' || !row.source_url
    )) {
      throw new Error('Avar Hadith content provenance mismatch');
    }
    return data;
  }

  const avarOfficial = {
    key: 'avar_official',
    count: 194,
    languages: ['av'],
    list(page, limit, _lang, filters) {
      return requestAvar('/api/avar-hadiths', {
        page: page || 1, limit: limit || 12,
        q: filters?.q || '', book: filters?.book || ''
      }, filters?.signal);
    },
    detail(id) {
      return requestAvar('/api/avar-hadiths', { hadith_id:id, limit:1 });
    },
    books() {
      return requestAvar('/api/avar-hadiths/books', {});
    },
    search(query, _lang, page, limit) {
      return this.list(page || 1, limit || 12, 'av', { q:query });
    }
  };

  async function requestChechen(path, params, signal) {
    const query = new URLSearchParams(params || {});
    const response = await fetch(path + (query.toString() ? '?' + query : ''), { signal });
    if (!response.ok) throw new Error('Chechen Hadith request failed');
    const data = await response.json();
    if (data.language !== 'ce' || data.verified !== true) throw new Error('Chechen Hadith source/language mismatch');
    if (path.endsWith('/books') ? !Array.isArray(data.books) : !Array.isArray(data.hadiths)) {
      throw new Error('Invalid Chechen Hadith provider response');
    }
    if (data.hadiths && data.hadiths.some(row =>
      row.language !== 'ce' || !row.text || row.source !== 'islamhouse.com' || !row.source_url
    )) {
      throw new Error('Chechen Hadith content provenance mismatch');
    }
    return data;
  }

  const chechenOfficial = {
    key: 'chechen_official',
    count: 93,
    languages: ['ce'],
    list(page, limit, _lang, filters) {
      return requestChechen('/api/chechen-hadiths', {
        page: page || 1, limit: limit || 12,
        q: filters?.q || '', book: filters?.book || ''
      }, filters?.signal);
    },
    detail(id) {
      return requestChechen('/api/chechen-hadiths', { hadith_id:id, limit:1 });
    },
    books() {
      return requestChechen('/api/chechen-hadiths/books', {});
    },
    search(query, _lang, page, limit) {
      return this.list(page || 1, limit || 12, 'ce', { q:query });
    }
  };

  return {
    get: key => key === 'hadeethenc' ? verified : key === 'avar_official' ? avarOfficial : key === 'chechen_official' ? chechenOfficial : null,
    list: () => [verified, avarOfficial, chechenOfficial],
    language,
  };
})();
window.HadithRegistry = HadithRegistry;
