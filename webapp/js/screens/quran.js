/* ═══════════════════════════════════════════════════
   Quran Screen — Surah list, read by surah
   Uses AlQuran.cloud API (free, no key)
   Caches Arabic text in localStorage per surah
   ═══════════════════════════════════════════════════ */

const QuranScreen = (function () {

  const SURAHS = [
    [1,'Al-Fatihah','الفاتحة',7],[2,'Al-Baqarah','البقرة',286],[3,"Al-'Imran","آل عمران",200],
    [4,'An-Nisa\'','النساء',176],[5,'Al-Ma\'idah','المائدة',120],[6,'Al-An\'am','الأنعام',165],
    [7,'Al-A\'raf','الأعراف',206],[8,'Al-Anfal','الأنفال',75],[9,'At-Tawbah','التوبة',129],
    [10,'Yunus','يونس',109],[11,'Hud','هود',123],[12,'Yusuf','يوسف',111],
    [13,'Ar-Ra\'d','الرعد',43],[14,'Ibrahim','إبراهيم',52],[15,'Al-Hijr','الحجر',99],
    [16,'An-Nahl','النحل',128],[17,'Al-Isra\'','الإسراء',111],[18,'Al-Kahf','الكهف',110],
    [19,'Maryam','مريم',98],[20,'Ta-Ha','طه',135],[21,'Al-Anbiya\'','الأنبياء',112],
    [22,'Al-Hajj','الحج',78],[23,'Al-Mu\'minun','المؤمنون',118],[24,'An-Nur','النور',64],
    [25,'Al-Furqan','الفرقان',77],[26,'Ash-Shu\'ara','الشعراء',227],[27,'An-Naml','النمل',93],
    [28,'Al-Qasas','القصص',88],[29,'Al-Ankabut','العنكبوت',69],[30,'Ar-Rum','الروم',60],
    [31,'Luqman','لقمان',34],[32,'As-Sajdah','السجدة',30],[33,'Al-Ahzab','الأحزاب',73],
    [34,'Saba\'','سبأ',54],[35,'Fatir','فاطر',45],[36,'Ya-Sin','يس',83],
    [37,'As-Saffat','الصافات',182],[38,'Sad','ص',88],[39,'Az-Zumar','الزمر',75],
    [40,'Ghafir','غافر',85],[41,'Fussilat','فصلت',54],[42,'Ash-Shura','الشورى',53],
    [43,'Az-Zukhruf','الزخرف',89],[44,'Ad-Dukhan','الدخان',59],[45,'Al-Jathiyah','الجاثية',37],
    [46,'Al-Ahqaf','الأحقاف',35],[47,'Muhammad','محمد',38],[48,'Al-Fath','الفتح',29],
    [49,'Al-Hujurat','الحجرات',18],[50,'Qaf','ق',45],[51,'Adh-Dhariyat','الذاريات',60],
    [52,'At-Tur','الطور',49],[53,'An-Najm','النجم',62],[54,'Al-Qamar','القمر',55],
    [55,'Ar-Rahman','الرحمن',78],[56,'Al-Waqi\'ah','الواقعة',96],[57,'Al-Hadid','الحديد',29],
    [58,'Al-Mujadila','المجادلة',22],[59,'Al-Hashr','الحشر',24],[60,'Al-Mumtahanah','الممتحنة',13],
    [61,'As-Saf','الصف',14],[62,'Al-Jumu\'ah','الجمعة',11],[63,'Al-Munafiqun','المنافقون',11],
    [64,'At-Taghabun','التغابن',18],[65,'At-Talaq','الطلاق',12],[66,'At-Tahrim','التحريم',12],
    [67,'Al-Mulk','الملك',30],[68,'Al-Qalam','القلم',52],[69,'Al-Haqqah','الحاقة',52],
    [70,'Al-Ma\'arij','المعارج',44],[71,'Nuh','نوح',28],[72,'Al-Jinn','الجن',28],
    [73,'Al-Muzzammil','المزمل',20],[74,'Al-Muddaththir','المدثر',56],[75,'Al-Qiyamah','القيامة',40],
    [76,'Al-Insan','الإنسان',31],[77,'Al-Mursalat','المرسلات',50],[78,'An-Naba\'','النبأ',40],
    [79,'An-Nazi\'at','النازعات',46],[80,'Abasa','عبس',42],[81,'At-Takwir','التكوير',29],
    [82,'Al-Infitar','الانفطار',19],[83,'Al-Mutaffifin','المطففين',36],[84,'Al-Inshiqaq','الانشقاق',25],
    [85,'Al-Buruj','البروج',22],[86,'At-Tariq','الطارق',17],[87,'Al-A\'la','الأعلى',19],
    [88,'Al-Ghashiyah','الغاشية',26],[89,'Al-Fajr','الفجر',30],[90,'Al-Balad','البلد',20],
    [91,'Ash-Shams','الشمس',15],[92,'Al-Layl','الليل',21],[93,'Ad-Duha','الضحى',11],
    [94,'Ash-Sharh','الشرح',8],[95,'At-Tin','التين',8],[96,'Al-Alaq','العلق',19],
    [97,'Al-Qadr','القدر',5],[98,'Al-Bayyinah','البينة',8],[99,'Az-Zalzalah','الزلزلة',8],
    [100,'Al-Adiyat','العاديات',11],[101,'Al-Qari\'ah','القارعة',11],[102,'At-Takathur','التكاثر',8],
    [103,'Al-Asr','العصر',3],[104,'Al-Humazah','الهمزة',9],[105,'Al-Fil','الفيل',5],
    [106,'Quraysh','قريش',4],[107,'Al-Ma\'un','الماعون',7],[108,'Al-Kawthar','الكوثر',3],
    [109,'Al-Kafirun','الكافرون',6],[110,'An-Nasr','النصر',3],[111,'Al-Masad','المسد',5],
    [112,'Al-Ikhlas','الإخلاص',4],[113,'Al-Falaq','الفلق',5],[114,'An-Nas','الناس',6],
  ];

  /* Translation editions on AlQuran.cloud */
  const TRANSLATIONS = {
    uz: 'uz.sodik', uz_cyr: 'ru.kuliev', en: 'en.sahih', ru: 'ru.kuliev',
    tr: 'tr.diyanet', ar: null, kk: 'ru.kuliev', tg: 'ru.kuliev',
    ky: 'ru.kuliev', de: 'de.aburida', fr: 'fr.hamidullah',
    id: 'id.indonesian', hi: 'hi.hindi', ur: 'ur.ahmedali'
  };

  let _lang     = 'uz';
  let _view     = 'list'; // 'list' | 'surah'
  let _surahNum = 1;
  let _surahCache = {}; // surahNum → { arabic, translation }

  function render() {
    const el = document.getElementById('screen-quran');
    if (!el) return;
    _lang = window.App?.state?.lang || 'uz';
    _view = 'list';
    el.innerHTML = _buildListHTML(_lang);
    _bindListEvents(el);
  }

  function load(lang) {
    _lang = lang;
    _view = 'list';
    const el = document.getElementById('screen-quran');
    if (!el) return;
    el.innerHTML = _buildListHTML(lang);
    _bindListEvents(el);
  }

  /* ── Surah List ── */
  function _buildListHTML(lang) {
    const rows = SURAHS.map(([num, name, ar, verses]) => `
      <div class="quran-surah-row" data-num="${num}" role="button" tabindex="0">
        <div class="quran-surah-num">${num}</div>
        <div class="quran-surah-ar">${ar}</div>
        <div class="quran-surah-info">
          <div class="quran-surah-name">${name}</div>
          <div class="quran-surah-verses">${verses} ${t('quran_verses', lang)}</div>
        </div>
        <div class="quran-surah-arrow">›</div>
      </div>
    `).join('');

    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="quran-back" aria-label="${t('back', lang)}">‹</button>
          <h1 class="screen-title">📖 ${t('modules_list.quran', lang)}</h1>
        </div>
        <div class="quran-body">
          <div class="quran-search-wrap">
            <input class="quran-search-input" id="quran-search" type="text"
                   placeholder="${t('search', lang)}" autocomplete="off"/>
          </div>
          <div class="quran-list" id="quran-list">
            ${rows}
          </div>
        </div>
      </div>
    `;
  }

  function _bindListEvents(el) {
    el.querySelector('#quran-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    el.querySelectorAll('.quran-surah-row').forEach(row => {
      row.addEventListener('click', () => {
        _surahNum = parseInt(row.dataset.num);
        _openSurah(el, _surahNum);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });

    el.querySelector('#quran-search')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      el.querySelectorAll('.quran-surah-row').forEach(row => {
        const name = (row.querySelector('.quran-surah-name')?.textContent || '').toLowerCase();
        const ar   = (row.querySelector('.quran-surah-ar')?.textContent || '').toLowerCase();
        const num  = (row.querySelector('.quran-surah-num')?.textContent || '');
        row.style.display = (!q || name.includes(q) || ar.includes(q) || num.includes(q)) ? '' : 'none';
      });
    });
  }

  /* ── Surah Reader ── */
  async function _openSurah(el, num) {
    const surah = SURAHS.find(s => s[0] === num);
    if (!surah) return;

    el.innerHTML = _buildSurahLoadingHTML(surah);
    _bindSurahBack(el);

    // Check cache
    const cacheKey = `quran_${num}_${_lang}`;
    const cached   = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        _renderSurah(el, surah, data.arabic, data.translation);
        return;
      } catch (_) {}
    }

    // Fetch from AlQuran.cloud
    const edition  = TRANSLATIONS[_lang];
    const arEdition = 'quran-uthmani';

    try {
      let arAyahs = [], trAyahs = [];

      const arResp = await fetch(`https://api.alquran.cloud/v1/surah/${num}/${arEdition}`);
      const arData = await arResp.json();
      if (arData.code === 200) arAyahs = arData.data.ayahs.map(a => a.text);

      if (edition) {
        const trResp = await fetch(`https://api.alquran.cloud/v1/surah/${num}/${edition}`);
        const trData = await trResp.json();
        if (trData.code === 200) trAyahs = trData.data.ayahs.map(a => a.text);
      }

      const payload = { arabic: arAyahs, translation: trAyahs };
      try { localStorage.setItem(cacheKey, JSON.stringify(payload)); } catch (_) {}
      _renderSurah(el, surah, arAyahs, trAyahs);
    } catch (_e) {
      const body = el.querySelector('#quran-surah-body');
      if (body) body.innerHTML = `<div class="quran-error">❌ ${t('error', _lang)}<br><button class="quran-retry-btn" id="quran-retry">${t('retry', _lang)}</button></div>`;
      el.querySelector('#quran-retry')?.addEventListener('click', () => _openSurah(el, num));
    }
  }

  function _buildSurahLoadingHTML(surah) {
    return `
      <div class="screen-inner">
        <div class="screen-header">
          <button class="back-btn" id="quran-surah-back">‹</button>
          <h1 class="screen-title">${surah[2]}</h1>
        </div>
        <div class="quran-surah-body" id="quran-surah-body">
          <div class="quran-loading"><span class="quran-spinner"></span> ${t('loading', _lang)}</div>
        </div>
      </div>
    `;
  }

  function _renderSurah(el, surah, arabic, translation) {
    const [num, name, ar, verses] = surah;
    const hasTranslation = translation && translation.length > 0;

    let ayahsHTML = '';
    for (let i = 0; i < arabic.length; i++) {
      const ayahNum = i + 1;
      const trText  = hasTranslation ? (translation[i] || '') : '';
      ayahsHTML += `
        <div class="quran-ayah-block">
          <div class="quran-ayah-num-badge">${num}:${ayahNum}</div>
          <div class="quran-ayah-ar">${arabic[i]}</div>
          ${trText ? `<div class="quran-ayah-tr">${_esc(trText)}</div>` : ''}
        </div>
      `;
    }

    const body = el.querySelector('#quran-surah-body');
    if (!body) return;

    body.innerHTML = `
      <div class="quran-surah-header">
        <div class="quran-surah-title-ar">${ar}</div>
        <div class="quran-surah-title-en">${name}</div>
        <div class="quran-surah-info-line">${verses} ${t('quran_verses', _lang)}</div>
      </div>
      ${num !== 9 ? '<div class="quran-basmala">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>' : ''}
      <div class="quran-ayahs-list">
        ${ayahsHTML}
      </div>
    `;
  }

  function _bindSurahBack(el) {
    el.querySelector('#quran-surah-back')?.addEventListener('click', () => {
      el.innerHTML = _buildListHTML(_lang);
      _bindListEvents(el);
    });
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render, load };
})();
