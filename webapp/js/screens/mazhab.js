/* ═══════════════════════════════════════════════════
   Mazhab Selection Screen — v1 (KB tile design)
   ═══════════════════════════════════════════════════ */

const MazhabScreen = (function () {
  'use strict';

  const TILE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%230d1829'/%3E%3Cline x1='0' y1='0' x2='60' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Cline x1='60' y1='0' x2='0' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%23F5C542' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E";

  const MAZHABLAR = [
    {
      k: 'hanafi',
      ar: 'حنفي',
      uz: 'Hanafiy',
      mintaqa: "Markaziy Osiyo · Turkiya · Hindiston · Pokiston",
    },
    {
      k: 'maliki',
      ar: 'مالكي',
      uz: 'Molikiy',
      mintaqa: "Shimoliy va G'arbiy Afrika · Andalusiya",
    },
    {
      k: 'shafii',
      ar: 'شافعي',
      uz: 'Shofeiy',
      mintaqa: "Janubi-Sharqiy Osiyo · Misr · Sharqiy Afrika",
    },
    {
      k: 'hanbali',
      ar: 'حنبلي',
      uz: 'Hanbaliy',
      mintaqa: "Saudiya Arabistoni · Fors ko'rfazi",
    },
  ];

  let _selected = 'hanafi';

  /* ── Entry points ─────────────────────────────────────────── */
  function render() {
    const el = document.getElementById('screen-mazhab');
    if (!el) return;
    _selected = localStorage.getItem('islamtime_madhab') || 'hanafi';
    el.innerHTML = _buildHTML();
    _bind(el);
  }

  /* ── HTML ─────────────────────────────────────────────────── */
  function _buildHTML() {
    const lang     = window.App?.state?.lang || 'uz';
    const langMeta = (typeof LANG_META !== 'undefined')
      ? (LANG_META.find(l => l.code === lang) || LANG_META[0])
      : { name: lang, sub: '' };
    const backLbl  = '← ' + langMeta.name + (langMeta.sub ? ' (' + langMeta.sub + ')' : '');
    const sel      = MAZHABLAR.find(m => m.k === _selected) || MAZHABLAR[0];

    return `
      <div class="mz-wrap">

        <div class="mz-header">
          <div class="mz-tile" style="background-image:url('${TILE}')"></div>
          <div class="mz-ov"></div>
          <div class="mz-hi">
            <button class="mz-back" id="mz-back">${backLbl}</button>
            <div class="mz-title">Mazhabni tanlang</div>
            <div class="mz-subtitle">Namoz vaqtlari shu asosda hisoblanadi</div>
            <div class="mz-divider"></div>
          </div>
        </div>

        <div class="mz-body" id="mz-body">
          ${MAZHABLAR.map(m => _cardHTML(m)).join('')}
        </div>

        <div class="mz-footer">
          <button class="mz-btn" id="mz-btn">
            <span class="mz-btn-lbl" id="mz-btn-lbl">${sel.uz}</span>
            <div class="mz-btn-sep"></div>
            <span class="mz-btn-arr">→</span>
          </button>
        </div>

      </div>`;
  }

  function _cardHTML(m) {
    const a = m.k === _selected;
    return `
      <div class="mz-card${a ? ' mz-card--on' : ''}" data-k="${m.k}">
        <div class="mz-ar-circle${a ? ' mz-ar-circle--on' : ''}">
          <span class="mz-ar">${m.ar}</span>
        </div>
        <div class="mz-info">
          <div class="mz-name-row">
            <span class="mz-name${a ? ' mz-name--on' : ''}">${m.uz}</span>
            ${a ? '<div class="mz-dot"></div>' : ''}
          </div>
          <div class="mz-mintaqa">${m.mintaqa}</div>
        </div>
        ${a ? '<div class="mz-check">✓</div>' : ''}
      </div>`;
  }

  /* ── Events ───────────────────────────────────────────────── */
  function _bind(el) {
    el.querySelector('#mz-body').addEventListener('click', e => {
      const card = e.target.closest('.mz-card');
      if (!card) return;
      _pick(card.dataset.k);
    });
    el.querySelector('#mz-back').addEventListener('click', () => {
      window.App.navigate('screen-language');
    });
    el.querySelector('#mz-btn').addEventListener('click', _go);
  }

  function _pick(k) {
    if (_selected === k) return;
    _selected = k;

    const body = document.getElementById('mz-body');
    if (body) body.innerHTML = MAZHABLAR.map(m => _cardHTML(m)).join('');

    const lbl = document.getElementById('mz-btn-lbl');
    const meta = MAZHABLAR.find(m => m.k === k);
    if (lbl && meta) lbl.textContent = meta.uz;

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  }

  function _go() {
    if (!_selected) return;
    localStorage.setItem('islamtime_madhab', _selected);
    try {
      window.Telegram?.WebApp?.sendData(JSON.stringify({ action: 'set_mazhab', mazhab: _selected }));
    } catch (_) {}
    window.App.navigate('screen-location');
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  }

  return { render };
})();
