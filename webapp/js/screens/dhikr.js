/* ═══════════════════════════════════════════════════
   Dhikr & Salawat Counter Screen
   ═══════════════════════════════════════════════════ */

const DhikrScreen = (function () {

  const DHIKR_LIST = [
    { key: 'subhanallah',  arabic: 'سُبْحَانَ اللَّهِ',       target: 33, en:"SubhanAllah",  uz:"Subhanalloh",  color:'#1e9e6e' },
    { key: 'alhamdulillah',arabic: 'الْحَمْدُ لِلَّهِ',      target: 33, en:"Alhamdulillah",uz:"Alhamdulilloh",color:'#c9a227' },
    { key: 'allahuakbar',  arabic: 'اللَّهُ أَكْبَرُ',        target: 34, en:"Allahu Akbar", uz:"Allohu Akbar", color:'#5b8af5' },
    { key: 'lailaha',      arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 100, en:"La Ilaha Illallah", uz:"La ilaha illalloh", color:'#c9a227' },
    { key: 'salawat',      arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', target: 100, en:"Salawat ﷺ", uz:"Salavot ﷺ", color:'#e8a838' },
    { key: 'astaghfirullah',arabic:'أَسْتَغْفِرُ اللَّهَ',   target: 100, en:"Astaghfirullah", uz:"Astag'firulloh", color:'#9b59b6' },
    { key: 'hauqala',      arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 100, en:"La Hawla...", uz:"La havla...", color:'#16a085' },
  ];

  let _current  = 0;   // index in DHIKR_LIST
  let _count    = 0;
  let _lang     = 'uz';

  function render() {
    const el = document.getElementById('screen-dhikr');
    if (!el) return;
    _lang = window.App?.state?.lang || 'uz';
    _count = 0;
    el.innerHTML = _buildHTML(_lang);
    _bindEvents(el);
  }

  function load(lang) {
    _lang  = lang;
    _count = 0;
    _current = 0;
    const el = document.getElementById('screen-dhikr');
    if (!el) return;
    el.innerHTML = _buildHTML(lang);
    _bindEvents(el);
  }

  function _buildHTML(lang) {
    const item = DHIKR_LIST[_current];
    const pct  = Math.min(Math.round(_count / item.target * 100), 100);

    const listHTML = DHIKR_LIST.map((d, i) => `
      <button class="dhikr-list-item${i === _current ? ' active' : ''}" data-index="${i}">
        <span class="dhikr-list-ar">${d.arabic}</span>
        <span class="dhikr-list-en">${d.en}</span>
        <span class="dhikr-list-tgt">×${d.target}</span>
      </button>
    `).join('');

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="dhikr-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">❤️ ${t('modules_list.dhikr', lang)}</h1>
        </div>

        <div class="dhikr-body">
          <!-- Dhikr selector -->
          <div class="dhikr-list-scroll">
            ${listHTML}
          </div>

          <!-- Counter card -->
          <div class="dhikr-card" id="dhikr-card" style="--accent:${item.color}">
            <div class="dhikr-ar" id="dhikr-ar">${item.arabic}</div>
            <div class="dhikr-en" id="dhikr-en">${item.en}</div>

            <div class="dhikr-counter-wrap">
              <div class="dhikr-count" id="dhikr-count">${_count}</div>
              <div class="dhikr-target" id="dhikr-target">/ ${item.target}</div>
            </div>

            <!-- Progress arc -->
            <svg class="dhikr-arc" viewBox="0 0 120 120">
              <circle class="arc-bg"   cx="60" cy="60" r="54" />
              <circle class="arc-fill" cx="60" cy="60" r="54"
                      id="arc-fill"
                      stroke="${item.color}"
                      stroke-dasharray="${_arcDash(pct)}" />
            </svg>

            <!-- Tap button -->
            <button class="dhikr-tap-btn" id="dhikr-tap" aria-label="${t('dhikr_tap', lang)}">
              <span>${t('dhikr_tap', lang)}</span>
            </button>

            <!-- Complete msg -->
            <div class="dhikr-complete-msg" id="dhikr-complete" style="display:none">
              ${t('dhikr_complete', lang)}
            </div>
          </div>

          <!-- Reset -->
          <button class="dhikr-reset-btn" id="dhikr-reset">
            ${t('dhikr_reset', lang)}
          </button>
        </div>
      </div>
    `;
  }

  function _arcDash(pct) {
    const circ = 2 * Math.PI * 54;
    const filled = circ * pct / 100;
    return `${filled} ${circ}`;
  }

  function _bindEvents(el) {
    el.querySelector('#dhikr-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    el.querySelectorAll('.dhikr-list-item').forEach(btn => {
      btn.addEventListener('click', () => {
        _current = parseInt(btn.dataset.index);
        _count   = 0;
        el.querySelectorAll('.dhikr-list-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _updateCounter(el);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });

    el.querySelector('#dhikr-tap')?.addEventListener('click', () => _onTap(el));

    el.querySelector('#dhikr-reset')?.addEventListener('click', () => {
      _count = 0;
      el.querySelector('#dhikr-complete').style.display = 'none';
      _updateCounter(el);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    });
  }

  function _onTap(el) {
    const item = DHIKR_LIST[_current];
    if (_count >= item.target) return;

    _count++;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    _updateCounter(el);

    if (_count >= item.target) {
      el.querySelector('#dhikr-complete').style.display = 'block';
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }
  }

  function _updateCounter(el) {
    const item = DHIKR_LIST[_current];
    const pct  = Math.min(Math.round(_count / item.target * 100), 100);

    const card = el.querySelector('#dhikr-card');
    if (card) card.style.setProperty('--accent', item.color);

    const arEl = el.querySelector('#dhikr-ar');
    if (arEl) arEl.textContent = item.arabic;

    const enEl = el.querySelector('#dhikr-en');
    if (enEl) enEl.textContent = item.en;

    const cEl = el.querySelector('#dhikr-count');
    if (cEl) {
      cEl.textContent = _count;
      cEl.classList.remove('pop');
      void cEl.offsetWidth; // reflow
      cEl.classList.add('pop');
    }

    const tEl = el.querySelector('#dhikr-target');
    if (tEl) tEl.textContent = `/ ${item.target}`;

    const arc = el.querySelector('#arc-fill');
    if (arc) {
      arc.setAttribute('stroke', item.color);
      arc.setAttribute('stroke-dasharray', _arcDash(pct));
    }

    if (_count < item.target) {
      const comp = el.querySelector('#dhikr-complete');
      if (comp) comp.style.display = 'none';
    }
  }

  return { render, load };
})();
