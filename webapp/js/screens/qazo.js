/* ═══════════════════════════════════════════════════════════════
   Qazo Namozlari — manual missed-prayer counter
   Placement: Namoz → Qazo namozlari

   Product rule (explicit, non-negotiable): the app NEVER assumes a
   prayer became qazo just because it wasn't marked. The user enters
   their own qazo count for each category, and manually decreases it
   after making up a prayer. No automatic tracking, no "Prayer Tracker".
   ═══════════════════════════════════════════════════════════════ */

const QazoScreen = (function () {

  const LS = 'qazo_counts_v1';

  const CATEGORIES = [
    { id: 'bomdod', icon: '🌅' },
    { id: 'peshin',  icon: '☀️' },
    { id: 'asr',     icon: '🌇' },
    { id: 'shom',    icon: '🌆' },
    { id: 'xufton',  icon: '🌙' },
    { id: 'vitr',    icon: '✨' },
  ];

  let _lang = 'uz';

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }

  const MADHHAB_NAMES = {
    hanafi:  { uz:'Hanafiy', uz_cyr:'Ҳанафий', ru:'Ханафи',   en:'Hanafi' },
    shafii:  { uz:'Shofiiy', uz_cyr:'Шофиий',  ru:'Шафии',    en:"Shafi'i" },
    maliki:  { uz:'Molikiy', uz_cyr:'Моликий', ru:'Малики',   en:'Maliki' },
    hanbali: { uz:'Hanbaliy',uz_cyr:'Ҳанбалий',ru:'Ханбали',  en:'Hanbali' },
  };
  function _getMadhhab() {
    try { return localStorage.getItem('islamtime_madhab') || 'hanafi'; } catch { return 'hanafi'; }
  }
  function _madhhabName(id) {
    const m = MADHHAB_NAMES[id] || MADHHAB_NAMES.hanafi;
    return m[_lang] || m.en;
  }

  const LABELS = {
    bomdod: { uz:'Bomdod', uz_cyr:'Бомдод', ru:'Фаджр', en:'Fajr' },
    peshin: { uz:'Peshin', uz_cyr:'Пешин', ru:'Зухр',  en:'Dhuhr' },
    asr:    { uz:'Asr',    uz_cyr:'Аср',   ru:'Аср',   en:'Asr' },
    shom:   { uz:'Shom',   uz_cyr:'Шом',   ru:'Магриб',en:'Maghrib' },
    xufton: { uz:'Xufton', uz_cyr:'Хуфтон',ru:'Иша',   en:'Isha' },
    vitr:   { uz:'Vitr',   uz_cyr:'Витр',  ru:'Витр',  en:'Witr' },
  };

  function _label(catId) {
    const l = LABELS[catId];
    return _T(l.uz, l.uz_cyr, l.ru, l.en);
  }

  /* ── localStorage ──────────────────────────────────────────── */
  function _getCounts() {
    try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
  }
  function _saveCounts(c) {
    try { localStorage.setItem(LS, JSON.stringify(c)); } catch {}
  }
  function _getCount(catId) {
    const c = _getCounts();
    return Math.max(0, parseInt(c[catId], 10) || 0);
  }
  function _setCount(catId, n) {
    const c = _getCounts();
    c[catId] = Math.max(0, parseInt(n, 10) || 0);
    _saveCounts(c);
  }

  function render() {
    _lang = window.App?.state?.lang || 'uz';
    const el = document.getElementById('screen-qazo');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
    _loadFiqhNote(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-qazo');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
    _loadFiqhNote(el);
  }

  function _html() {
    const counts = _getCounts();
    const total  = CATEGORIES.reduce((sum, c) => sum + _getCount(c.id), 0);

    const rows = CATEGORIES.map(c => {
      const n = _getCount(c.id);
      return `
        <div class="qz-row" data-cat="${c.id}">
          <div class="qz-row-info">
            <span class="qz-row-icon">${c.icon}</span>
            <span class="qz-row-name">${_label(c.id)}</span>
          </div>
          <div class="qz-stepper">
            <button class="qz-btn qz-btn--minus" data-action="dec" data-cat="${c.id}" ${n === 0 ? 'disabled' : ''}>−</button>
            <input class="qz-count-input" type="number" min="0" step="1" inputmode="numeric"
                   data-cat="${c.id}" value="${n}">
            <button class="qz-btn qz-btn--plus" data-action="inc" data-cat="${c.id}">+</button>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="qz-screen">
        <div class="qz-header">
          <button class="qz-back" id="qz-back">← ${_T('Namoz','Намоз','Намаз','Prayer')}</button>
          <div class="qz-title">${_T('Qazo namozlari','Қазо намозлари','Восполнение намазов','Missed Prayers (Qazo)')}</div>
        </div>

        <div class="qz-total-card">
          <div class="qz-total-num">${total}</div>
          <div class="qz-total-label">${_T('jami qazo','жами қазо','всего қазо','total qazo')}</div>
        </div>

        <div class="qz-hint">
          ${_T(
            "Qazo sonini o'zingiz kiriting. Ilova avtomatik ravishda hech qaysi namozni qazo deb belgilamaydi.",
            "Қазо сонини ўзингиз киритинг. Илова автоматик равишда ҳеч қайси намозни қазо деб белгиламайди.",
            'Введите количество қазо самостоятельно. Приложение никогда не помечает намаз как қазо автоматически.',
            'Enter your own qazo count for each prayer. The app never automatically marks a prayer as qazo.'
          )}
        </div>

        <div class="qz-list">${rows}</div>

        <div class="qz-fiqh-note" id="qz-fiqh-note">
          ⚠️ ${_T('Yuklanmoqda…','Юкланмоқда…','Загрузка…','Loading…')}
        </div>
      </div>`;
  }

  /* ── Madhhab-scoped fiqh guidance (never mixed across madhhabs) ──────────
     Calls /api/fiqh, which returns exactly one madhhab's content — see
     domain/fiqh/registry.py. If nothing has been independently verified yet
     for this madhhab/topic, we say so honestly instead of inventing a
     ruling or silently borrowing another madhhab's text. ── */
  async function _loadFiqhNote(el) {
    const madhhab = _getMadhhab();
    const noteEl = el.querySelector('#qz-fiqh-note');
    if (!noteEl) return;
    try {
      const r = await fetch(`/api/fiqh?madhhab=${madhhab}&topic=qazo&lang=${_lang}`);
      const d = await r.json();
      const name = _madhhabName(madhhab);
      if (d.verification_status === 'verified' && d.ruling_text) {
        noteEl.innerHTML = `
          <div class="qz-fiqh-madhhab">${name}</div>
          <div>${_esc(d.ruling_text)}</div>
          ${d.scholar_or_institution ? `<div class="qz-fiqh-source">— ${_esc(d.scholar_or_institution)}</div>` : ''}`;
      } else {
        noteEl.innerHTML = `
          <div class="qz-fiqh-madhhab">${name}</div>
          <div>⚠️ ${_T(
            "Ushbu mazhab bo'yicha tekshirilgan ko'rsatma hali qo'shilmagan. Aniq hukm uchun o'z mazhabingiz bo'yicha ishonchli manbaga murojaat qiling.",
            "Ушбу мазҳаб бўйича текширилган кўрсатма ҳали қўшилмаган. Аниқ ҳукм учун ўз мазҳабингиз бўйича ишончли манбага мурожаат қилинг.",
            'Проверенное руководство для этого мазхаба пока не добавлено. За точным решением обратитесь к надёжному источнику вашего мазхаба.',
            'No independently verified guidance for this madhhab has been added yet. For a specific ruling, consult a reliable source for your own madhhab.'
          )}</div>`;
      }
    } catch {
      noteEl.textContent = '⚠️ ' + _T(
        "Ko'rsatmani yuklab bo'lmadi.", "Кўрсатмани юклаб бўлмади.",
        'Не удалось загрузить рекомендацию.', 'Could not load guidance.'
      );
    }
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function _bind(el) {
    el.querySelector('#qz-back')?.addEventListener('click', () => window.App.navigate('screen-prayer'));

    function _refreshRow(catId) {
      const n = _getCount(catId);
      const row = el.querySelector(`.qz-row[data-cat="${catId}"]`);
      if (!row) return;
      const input = row.querySelector('.qz-count-input');
      const minus = row.querySelector('.qz-btn--minus');
      if (input) input.value = n;
      if (minus) minus.disabled = (n === 0);
      const total = CATEGORIES.reduce((sum, c) => sum + _getCount(c.id), 0);
      const totalEl = el.querySelector('.qz-total-num');
      if (totalEl) totalEl.textContent = total;
    }

    el.querySelectorAll('.qz-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        const cur = _getCount(cat);
        const next = btn.dataset.action === 'inc' ? cur + 1 : Math.max(0, cur - 1);
        _setCount(cat, next);
        _refreshRow(cat);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    el.querySelectorAll('.qz-count-input').forEach(input => {
      input.addEventListener('change', () => {
        const cat = input.dataset.cat;
        _setCount(cat, input.value);
        _refreshRow(cat);
      });
    });
  }

  return { render, load };
})();
