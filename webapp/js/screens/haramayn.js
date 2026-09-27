/* ═══════════════════════════════════════════════════════════════
   Haramayn LIVE — Makkah / Madinah status center

   Policy (non-negotiable): never embed/proxy a stream without confirmed
   official permission, never show a static photo as if it were LIVE, never
   fabricate availability. Real status comes from GET /api/haramayn/status
   (domain/haramayn/registry.py). The "open official source" button always
   opens the authority's site in a new external tab — never embedded.
   ═══════════════════════════════════════════════════════════════ */

const HaramaynScreen = (function () {

  let _lang = 'uz';
  let _sites = null;

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }

  const IMAGES = {
    makkah:  'assets/landing/haram-makkah.webp',
    madinah: 'assets/landing/haram-madinah.webp',
  };
  const NAMES = {
    makkah:  { uz:'Makkah', uz_cyr:'Макка', ru:'Мекка', en:'Makkah' },
    madinah: { uz:'Madina', uz_cyr:'Мадина', ru:'Медина', en:'Madinah' },
  };
  const FALLBACK_SITES = [
    { site_id:'makkah', name_en:'Makkah', mosque_en:'Masjid al-Haram', status:'OFFICIAL_SOURCE_AVAILABLE', embed_url:null, official_external_url:'https://www.youtube.com/@SaudiQuranTv/live', official_authority:'Saudi Broadcasting Authority · Saudi Quran TV' },
    { site_id:'madinah', name_en:'Madinah', mosque_en:'Masjid an-Nabawi', status:'OFFICIAL_SOURCE_AVAILABLE', embed_url:null, official_external_url:'https://www.youtube.com/@SaudiSunnahTv/live', official_authority:'Saudi Broadcasting Authority · Saudi Sunnah TV' },
  ];
  const MOSQUES = {
    makkah:  { uz:'Masjid al-Haram', uz_cyr:'Масжид ал-Ҳаром', ru:'Masjid al-Haram', en:'Masjid al-Haram' },
    madinah: { uz:'Masjid an-Nabaviy', uz_cyr:'Масжид ан-Набавий', ru:'Masjid an-Nabawi', en:'Masjid an-Nabawi' },
  };

  function render() {
    _lang = window.App?.state?.lang || 'uz';
    const el = document.getElementById('screen-haramayn');
    if (!el) return;
    el.innerHTML = _shellHTML();
    _bind(el);
    _load(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-haramayn');
    if (!el) return;
    el.innerHTML = _shellHTML();
    _bind(el);
    _load(el);
  }

  function _shellHTML() {
    return `
      <div class="hl-screen">
        <div class="hl-header">
          <button class="hl-back" id="hl-back">← ${_T('Bosh sahifa','Бош саҳифа','Главная','Home')}</button>
          <div class="hl-title">${_T('Haramayn','Ҳарамайн','Харамайн','Haramayn')}</div>
        </div>
        <div id="hl-body" class="hl-body">
          <div class="hl-loading">${_T('Yuklanmoqda…','Юкланмоқда…','Загрузка…','Loading…')}</div>
        </div>
      </div>`;
  }

  async function _load(el) {
    const body = el.querySelector('#hl-body');
    try {
      const r = await fetch('/api/haramayn/status', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error('status unavailable');
      const d = await r.json();
      if (!Array.isArray(d.sites) || d.sites.length !== 2 ||
          d.sites.some(site => !IMAGES[site.site_id])) throw new Error('source registry unavailable');
      _sites = d.sites;
      body.innerHTML = _sites.map(s => _cardHTML(s)).join('');
      _bindCards(el);
    } catch {
      _sites = FALLBACK_SITES;
      body.innerHTML = _sites.map(s => _cardHTML(s)).join('');
      _bindCards(el);
    }
  }

  function _cardHTML(s) {
    const img = IMAGES[s.site_id];
    const name = localizeRecord(NAMES[s.site_id], _lang);
    const mosque = localizeRecord(MOSQUES[s.site_id], _lang);
    // A channel link (including a legacy LIVE status) cannot prove live playback.
    const hasSource = !!s.official_external_url;

    return `
      <div class="hl-card">
        <div class="hl-card-img-wrap">
          <img class="hl-card-img" src="${img}" alt="${mosque}" loading="lazy">
          <div class="hl-card-badge hl-card-badge--offline">
            ${hasSource ? _T('Rasmiy manba mavjud','Расмий манба мавжуд','Официальный источник доступен','Official source available') : _T('Hozircha mavjud emas','Ҳозирча мавжуд эмас','Пока недоступно','Not available yet')}
          </div>
        </div>
        <div class="hl-card-body">
          <div class="hl-card-name">${name}</div>
          <div class="hl-card-mosque">${mosque}</div>
          <div class="hl-card-note">${_T(
            'Jonli efir holati tasdiqlanmagan.',
            'Жонли эфир ҳолати тасдиқланмаган.',
            'Статус прямого эфира не подтверждён.',
            'Live status has not been verified.'
          )}</div>
          <button class="hl-card-btn" data-url="${_esc(s.official_external_url)}" ${hasSource ? '' : 'disabled'}>
            ${_T("Rasmiy manbani ochish", "Расмий манбани очиш", 'Открыть официальный источник', 'Open official source')} ↗
          </button>
          <div class="hl-card-authority">${_esc(s.official_authority)}</div>
        </div>
      </div>`;
  }

  function _bindCards(el) {
    el.querySelectorAll('.hl-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        if (!url) return;
        // Always external — this app never embeds/proxies a third-party stream.
        if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(url);
        else window.open(url, '_blank', 'noopener');
      });
    });
  }

  function _bind(el) {
    el.querySelector('#hl-back')?.addEventListener('click', () => window.App.navigate('screen-dashboard'));
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  return { render, load };
})();
