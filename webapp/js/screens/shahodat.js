/* ═══════════════════════════════════════════════════════════════
   Shahodat va Kalimalar
   Placement: Boshqalar → Shahodat va Kalimalar

   Content policy (non-negotiable):
   - The Shahada (declaration of faith) is universal across all schools
     of Islam — its Arabic text, transliteration and meaning below are
     the standard, uncontroversial wording used across mainstream
     sources, not an AI translation.
   - The "6 Kalima" classification is a regional (primarily South Asian)
     devotional tradition, NOT a universal Islamic standard. This screen
     never presents it as universal, and never invents specific wording
     for it without a verified source — see the "pending" state below.
   ═══════════════════════════════════════════════════════════════ */

const ShahodatScreen = (function () {

  const LS_MEMORIZED = 'shahodat_memorized_v1';

  let _lang = 'uz';

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }

  const SHAHADA = {
    arabic: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللّٰهِ',
    transliteration: 'Ash-hadu an la ilaha illallah, wa ash-hadu anna Muhammadan rasulullah',
    meaning: {
      uz: "Men guvohlik beramanki, Allohdan boshqa haq iloh yo'q, va yana guvohlik beramanki, Muhammad Uning elchisidir.",
      uz_cyr: 'Мен гувоҳлик берамики, Аллоҳдан бошқа ҳақ илоҳ йўқ, ва яна гувоҳлик берамики, Муҳаммад Унинг элчисидир.',
      ru: 'Свидетельствую, что нет божества, кроме Аллаха, и свидетельствую, что Мухаммад — Его посланник.',
      en: 'I bear witness that there is no true god but Allah, and I bear witness that Muhammad is His messenger.',
    },
    ref: 'Sahih Bukhari 25 · Sahih Muslim 16',
  };

  /* ── localStorage ─────────────────────────────────────────────────────── */
  function _getMemorized() { try { return JSON.parse(localStorage.getItem(LS_MEMORIZED) || '{}'); } catch { return {}; } }
  function _toggleMemorized(id) {
    const m = _getMemorized();
    m[id] = !m[id];
    try { localStorage.setItem(LS_MEMORIZED, JSON.stringify(m)); } catch {}
    return m[id];
  }

  function render() {
    _lang = window.App?.state?.lang || 'uz';
    const el = document.getElementById('screen-shahodat');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-shahodat');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
  }

  function _html() {
    const memorized = _getMemorized();
    const shahadaMemorized = !!memorized['shahada'];

    return `
      <div class="sh-screen">
        <div class="sh-header">
          <button class="sh-back" id="sh-back">← ${_T('Boshqalar','Бошқалар','Другое','Others')}</button>
          <div class="sh-title">${_T('Shahodat va Kalimalar','Шаҳодат ва Калималар','Шахада и Калимы','Shahodat & Kalimas')}</div>
        </div>

        <div class="sh-section-label">${_T('Shahodat (imon guvohligi)','Шаҳодат (имон гувоҳлиги)','Шахада (свидетельство веры)','Shahodat (Declaration of Faith)')}</div>
        <div class="sh-card">
          <div class="sh-ar">${SHAHADA.arabic}</div>
          <div class="sh-translit">${SHAHADA.transliteration}</div>
          <div class="sh-meaning">${_esc(SHAHADA.meaning[_lang] || SHAHADA.meaning.en)}</div>
          <div class="sh-ref">📚 ${SHAHADA.ref}</div>
          <button class="sh-memorize-btn${shahadaMemorized ? ' active' : ''}" id="sh-memorize-shahada">
            ${shahadaMemorized ? '✓ ' : ''}${_T("Yodlandi deb belgilash","Ёдланди деб белгилаш",'Отметить как выученное','Mark as memorized')}
          </button>
        </div>

        <div class="sh-section-label">${_T('Kalimalar','Калималар','Калимы','Kalimas')}</div>
        <div class="sh-pending-card">
          <div class="sh-pending-title">⚠️ ${_T(
            "\"6 Kalima\" universal islomiy standart emas",
            '"6 Калима" универсал исломий стандарт эмас',
            '«6 Калим» — не универсальный исламский стандарт',
            '"6 Kalimas" is not a universal Islamic standard'
          )}</div>
          <div class="sh-pending-body">${_T(
            "Bu klassifikatsiya asosan Janubiy Osiyo an'anasida keng tarqalgan va u yerda mashhur, ammo butun islom olami uchun yagona standart hisoblanmaydi. Aniq matnlarni tasdiqlangan manbasiz taqdim etmaslik uchun, ular hozircha qo'shilmagan.",
            "Бу классификация асосан Жанубий Осиё анъанасида кенг тарқалган ва у ерда машҳур, аммо бутун ислом олами учун ягона стандарт ҳисобланмайди. Аниқ матнларни тасдиқланган манбасиз тақдим этмаслик учун, улар ҳозирча қўшилмаган.",
            'Эта классификация широко распространена преимущественно в южноазиатской традиции, но не является единым стандартом для всего islamic mira. Чтобы не приводить конкретные тексты без проверенного источника, они пока не добавлены.',
            'This classification is widely known mainly within the South Asian tradition, but is not a single standard across the whole Muslim world. To avoid presenting specific wording without a verified source, it has not been added yet.'
          )}</div>
        </div>
      </div>`;
  }

  function _bind(el) {
    el.querySelector('#sh-back')?.addEventListener('click', () => window.App.navigate('screen-others'));
    el.querySelector('#sh-memorize-shahada')?.addEventListener('click', (e) => {
      const on = _toggleMemorized('shahada');
      e.target.classList.toggle('active', on);
      e.target.innerHTML = (on ? '✓ ' : '') + _T(
        "Yodlandi deb belgilash","Ёдланди деб белгилаш",'Отметить как выученное','Mark as memorized'
      );
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    });
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  return { render, load };
})();
