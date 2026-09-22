/* ═══════════════════════════════════════════════════════════════
   Boshqalar (Others) — hub screen for secondary modules
   ═══════════════════════════════════════════════════════════════ */

const OthersScreen = (function () {

  let _lang = 'uz';

  function _T(lat, cyr, ru, en) { return _resolveT(lat, cyr, ru, en, _lang); }

  const ITEMS = [
    { id:'qibla', icon:'explore', label:()=>_T("Qibla yo'nalishi",'Қибла йўналиши','Направление Киблы','Qibla direction'), open:l=>{ QiblaScreen.load(l); window.App.navigate('screen-qibla'); } },
    { id:'mosques', icon:'mosque', label:()=>_T('Yaqin masjidlar','Яқин масжидлар','Ближайшие мечети','Nearby mosques'), open:l=>{ MosquesScreen.load(l); window.App.navigate('screen-mosques'); } },
    { id:'hadith', icon:'import_contacts', label:()=>_T('Hadislar','Ҳадислар','Хадисы','Hadith'), open:l=>{ HadithScreen.load(l); window.App.navigate('screen-hadith'); } },
    { id:'duas', icon:'volunteer_activism', label:()=>_T("Du'olar",'Дуолар','Дуа','Duas'), open:l=>{ DuasScreen.load(l); window.App.navigate('screen-duas'); } },
    { id:'dhikr', icon:'prayer_times', label:()=>_T('Zikr va Salavot','Зикр ва Салавот','Зикр и салават','Dhikr & Salawat'), open:l=>{ DhikrScreen.load(l); window.App.navigate('screen-dhikr'); } },
    { id:'qazo', icon:'history', label:()=>_T('Qazo namozlari','Қазо намозлари','Пропущенные намазы','Missed prayers'), open:l=>{ QazoScreen.load(l); window.App.navigate('screen-qazo'); } },
    { id:'monthly', icon:'date_range', label:()=>_T('Oylik namoz taqvimi','Ойлик намоз тақвими','Месячное расписание','Monthly prayer calendar'), open:l=>{ MonthlyCalendarScreen.load(l); window.App.navigate('screen-monthly-calendar'); } },
    { id:'shahodat', icon:'front_hand', label:()=>_T('Shahodat va Kalimalar','Шаҳодат ва Калималар','Шахада и Калимы','Shahodat & Kalimas'), open:l=>{ ShahodatScreen.load(l); window.App.navigate('screen-shahodat'); } },
    { id:'names', icon:'stars_2', label:()=>_T("Allohning 99 ismi",'Аллоҳнинг 99 исми','99 имён Аллаха','99 Names of Allah'), open:l=>{ NamesScreen.load(l); window.App.navigate('screen-names'); } },
    { id:'haramayn', icon:'live_tv', label:()=>_T('Haramayn','Ҳарамайн','Харамайн','Haramayn'), open:l=>{ HaramaynScreen.load(l); window.App.navigate('screen-haramayn'); } },
    { id:'settings', icon:'settings', label:()=>_T('Sozlamalar','Созламалар','Настройки','Settings'), open:l=>{ SettingsScreen.load(l); window.App.navigate('screen-settings'); } },
  ];

  function render() {
    _lang = window.App?.state?.lang || 'uz';
    const el = document.getElementById('screen-others');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-others');
    if (!el) return;
    el.innerHTML = _html();
    _bind(el);
  }

  function _html() {
    const rows = ITEMS.map(it => `
      <button class="ot-row" data-id="${it.id}">
        <span class="material-symbols-rounded ot-row-icon" data-icon="${it.icon}" aria-hidden="true">${it.icon}</span>
        <span class="ot-row-label">${it.label()}</span>
        <span class="ot-row-chev">›</span>
      </button>`).join('');

    return `
      <div class="ot-screen">
        <div class="ot-header">
          <button class="ot-back" id="ot-back">← ${_T('Bosh sahifa','Бош саҳифа','Главная','Home')}</button>
          <div class="ot-title">${_T('Boshqalar','Бошқалар','Другое','Others')}</div>
        </div>
        <div class="ot-list">${rows}</div>
      </div>`;
  }

  function _bind(el) {
    el.querySelector('#ot-back')?.addEventListener('click', () => window.App.navigate('screen-dashboard'));
    el.querySelectorAll('.ot-row').forEach(row => {
      row.addEventListener('click', () => {
        const item = ITEMS.find(i => i.id === row.dataset.id);
        if (item) item.open(_lang);
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });
  }

  return { render, load };
})();
