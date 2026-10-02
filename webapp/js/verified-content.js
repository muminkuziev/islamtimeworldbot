/* Contextual quotations come from the same named editions as the reader.
   No UI-authored religious translations and no cross-language fallback. */
(function () {
  'use strict';
  const requests = new Map();
  function language() {
    return window.App?.state?.lang || document.documentElement.lang;
  }
  function showState(node, state, lang) {
    node.dataset.verseState = state;
    node.setAttribute('aria-busy', String(state === 'loading'));
    node.replaceChildren();
    if (node.dataset.verseFeedback !== 'true') return;
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    message.textContent = state === 'loading' ? t('loading', lang)
      : _resolveT('Mavjud emas', 'Мавжуд эмас', 'Недоступно', 'Unavailable', lang);
    node.append(message);
    if (state === 'error') {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'hc-back';
      retry.textContent = t('retry', lang);
      retry.addEventListener('click', () => { delete node.dataset.verseRequest; fill(node); });
      node.append(retry);
    }
  }
  async function fill(node) {
    const lang = language();
    // Only the Arabic original may explicitly accompany the selected translation.
    const providerLang = node.dataset.quranLanguage === 'ar' ? 'ar' : (lang === 'uz_cyr' ? 'uz' : lang);
    const meta = window.QuranProvider?.getSourceMeta(providerLang);
    if (!meta) { showState(node, 'error', lang); return; }
    const reference = node.dataset.quranVerse;
    const [surah, ayah] = reference.split(':').map(Number);
    const specialProvider = providerLang === 'ce' || providerLang === 'av';
    const edition = providerLang === 'ar' ? 'quran-uthmani' : meta.edition;
    if (!specialProvider && (!edition || meta.is_fallback)) { showState(node, 'error', lang); return; }
    const providerKey = specialProvider ? `provider:${providerLang}` : edition;
    const key = `${reference}:${providerKey}`;
    const requestKey = `${key}:${lang}`;
    if (node.dataset.verseRequest === requestKey) return;
    node.dataset.verseRequest = requestKey;
    node.replaceChildren();
    showState(node, 'loading', lang);
    if (!requests.has(key)) requests.set(key, (async () => {
      if (specialProvider) {
        const rows = await window.QuranProvider.getAyahs(surah, { lang: providerLang });
        const row = rows.find(item => item.ayah === ayah);
        const text = providerLang === 'av' ? row?.arabic : (row?.translation || row?.arabic);
        if (!row || typeof text !== 'string' || !text.trim()) throw new Error('Verse source mismatch');
        return text;
      }
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${reference}/${edition}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Verse unavailable');
      const result = await response.json();
      if (result.code !== 200 || result.data?.edition?.identifier !== edition || result.data?.surah?.number !== surah || result.data?.numberInSurah !== ayah || typeof result.data.text !== 'string' || !result.data.text.trim()) throw new Error('Verse source mismatch');
      return result.data.text;
    })());
    try {
      const text = await requests.get(key);
      if (!node.isConnected || node.dataset.verseRequest !== requestKey || language() !== lang) return;
      const copy = document.createElement('span');
      copy.className = 'verified-verse-copy';
      copy.textContent = text;
      if (providerLang === 'ar') copy.dir = 'rtl';
      const source = document.createElement('small');
      source.textContent = `${reference} · ${meta.translator || edition}`;
      node.replaceChildren();
      node.dataset.verseState = 'ready';
      node.setAttribute('aria-busy', 'false');
      node.append(copy, source);
    } catch {
      requests.delete(key);
      if (node.isConnected && node.dataset.verseRequest === requestKey && language() === lang) showState(node, 'error', lang);
      // A source outage must never reveal a made-up or different-language quote.
    }
  }
  function refresh() {
    document.querySelectorAll('[data-quran-verse]').forEach(fill);
  }
  const observer = new MutationObserver(records => {
    if (records.some(r => Array.from(r.addedNodes).some(n => n.nodeType === 1 && (n.matches?.('[data-quran-verse]') || n.querySelector?.('[data-quran-verse]'))))) refresh();
  });
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  window.addEventListener('languagechange', refresh);
  window.addEventListener('online', () => {
    document.querySelectorAll('[data-quran-verse]:empty, [data-quran-verse][data-verse-state="error"]').forEach(n => delete n.dataset.verseRequest);
    refresh();
  });
  refresh();
})();
