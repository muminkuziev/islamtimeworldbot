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
    { site_id:'makkah', name_en:'Makkah', mosque_en:'Masjid al-Haram', status:'LIVE_EXTERNAL_ACTIVE', embed_url:null, official_external_url:'https://www.youtube.com/@SaudiQuranTv/live', official_authority:'Saudi Broadcasting Authority · Saudi Quran TV' },
    { site_id:'madinah', name_en:'Madinah', mosque_en:'Masjid an-Nabawi', status:'LIVE_EXTERNAL_ACTIVE', embed_url:null, official_external_url:'https://www.youtube.com/@SaudiSunnahTv/live', official_authority:'Saudi Broadcasting Authority · Saudi Sunnah TV' },
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
      _sites = d.sites || [];
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
    const name = NAMES[s.site_id]?.[_lang] || NAMES[s.site_id]?.en || s.name_en;
    const mosque = MOSQUES[s.site_id]?.[_lang] || MOSQUES[s.site_id]?.en || s.mosque_en;
    const isLive = (s.status === 'LIVE_EXTERNAL_ACTIVE' && s.official_external_url) || (s.status === 'LIVE_EMBED_ACTIVE' && s.embed_url);

    return `
      <div class="hl-card">
        <div class="hl-card-img-wrap">
          <img class="hl-card-img" src="${img}" alt="${mosque}" loading="lazy">
          <div class="hl-card-badge${isLive ? ' hl-card-badge--live' : ' hl-card-badge--offline'}">
            ${isLive ? '🔴 LIVE' : _T('Hozircha mavjud emas','Ҳозирча мавжуд эмас','Пока недоступно','Not available yet')}
          </div>
        </div>
        <div class="hl-card-body">
          <div class="hl-card-name">${name}</div>
          <div class="hl-card-mosque">${mosque}</div>
          <div class="hl-card-note">${isLive ? _T(
            "Saudiya rasmiy kanalining 24/7 jonli efiri.",
            "Саудия расмий каналининг 24/7 жонли эфири.",
            'Официальная круглосуточная трансляция саудовского телеканала.',
            'Official 24/7 broadcast from Saudi state television.'
          ) : _T(
            "Jonli efir hozircha ulanmagan. Rasmiy manba orqali tomosha qiling.",
            "Жонли эфир ҳозирча уланмаган. Расмий манба орқали томоша қилинг.",
            'Прямой эфир пока не подключён. Смотрите через официальный источник.',
            'Live stream is not connected yet. Watch via the official source.'
          )}</div>
          <button class="hl-card-btn" data-url="${s.official_external_url}">
            ${isLive ? _T("Jonli efirni ochish", "Жонли эфирни очиш", 'Открыть прямой эфир', 'Open live stream') : _T("Rasmiy manbani ochish", "Расмий манбани очиш", 'Открыть официальный источник', 'Open official source')} ↗
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
