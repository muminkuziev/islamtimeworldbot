/* Verified HadeethEnc provider — 144 records in each canonical language. */
const HadithRegistry = (function () {
  'use strict';
  const CANONICAL = new Set(['ar','en','id','ur','bn','fr','hi','fa','tr','ru','uz','de','ms']);
  const ALIASES = { uz_cyr:'uz' };
  function language(code) {
    const value = ALIASES[code] || code || 'en';
    return CANONICAL.has(value) ? value : 'en';
  }
  async function request(path, params) {
    const query = new URLSearchParams(params || {});
    const response = await fetch(path + (query.toString() ? '?' + query : ''));
    if (!response.ok) throw new Error('Hadith request failed');
    return response.json();
  }
  const verified = {
    key: 'hadeethenc',
    count: 144,
    languages: [...CANONICAL],
    list(page, limit, lang, filters) {
      return request('/api/hadeethenc', {
        page: page || 1, limit: limit || 12, lang: language(lang),
        q: filters?.q || '', book: filters?.book || ''
      });
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
  return {
    get: key => key === 'hadeethenc' ? verified : null,
    list: () => [verified],
    language,
  };
})();
window.HadithRegistry = HadithRegistry;
