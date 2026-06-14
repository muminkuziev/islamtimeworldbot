/* ═══════════════════════════════════════════════════════════════
   Quran Screen — React UI + vanilla JS logic
   ═══════════════════════════════════════════════════════════════ */

const QuranScreen = (function () {

  /* ── 114 suras ── [num, name_en, arabic, verses, juz, type] ─ */
  const SURAHS = [
    [1,'Al-Fatihah','الفاتحة',7,'1','M'],
    [2,'Al-Baqarah','البقرة',286,'1-3','D'],
    [3,"Al-'Imran","آل عمران",200,'3-4','D'],
    [4,"An-Nisa'","النساء",176,'4-6','D'],
    [5,"Al-Ma'idah","المائدة",120,'6-7','D'],
    [6,"Al-An'am","الأنعام",165,'7-8','M'],
    [7,"Al-A'raf","الأعراف",206,'8-9','M'],
    [8,'Al-Anfal','الأنفال',75,'9-10','D'],
    [9,'At-Tawbah','التوبة',129,'10-11','D'],
    [10,'Yunus','يونس',109,'11','M'],
    [11,'Hud','هود',123,'11-12','M'],
    [12,'Yusuf','يوسف',111,'12-13','M'],
    [13,"Ar-Ra'd","الرعد",43,'13','D'],
    [14,'Ibrahim','إبراهيم',52,'13','M'],
    [15,'Al-Hijr','الحجر',99,'14','M'],
    [16,'An-Nahl','النحل',128,'14','M'],
    [17,"Al-Isra'","الإسراء",111,'15','M'],
    [18,'Al-Kahf','الكهف',110,'15-16','M'],
    [19,'Maryam','مريم',98,'16','M'],
    [20,'Ta-Ha','طه',135,'16','M'],
    [21,"Al-Anbiya'","الأنبياء",112,'17','M'],
    [22,'Al-Hajj','الحج',78,'17','D'],
    [23,"Al-Mu'minun","المؤمنون",118,'18','M'],
    [24,'An-Nur','النور',64,'18','D'],
    [25,'Al-Furqan','الفرقان',77,'18-19','M'],
    [26,"Ash-Shu'ara","الشعراء",227,'19','M'],
    [27,'An-Naml','النمل',93,'19-20','M'],
    [28,'Al-Qasas','القصص',88,'20','M'],
    [29,'Al-Ankabut','العنكبوت',69,'20-21','M'],
    [30,'Ar-Rum','الروم',60,'21','M'],
    [31,'Luqman','لقمان',34,'21','M'],
    [32,'As-Sajdah','السجدة',30,'21','M'],
    [33,'Al-Ahzab','الأحزاب',73,'21-22','D'],
    [34,"Saba'","سبأ",54,'22','M'],
    [35,'Fatir','فاطر',45,'22','M'],
    [36,'Ya-Sin','يس',83,'22-23','M'],
    [37,'As-Saffat','الصافات',182,'23','M'],
    [38,'Sad','ص',88,'23','M'],
    [39,'Az-Zumar','الزمر',75,'23-24','M'],
    [40,'Ghafir','غافر',85,'24','M'],
    [41,'Fussilat','فصلت',54,'24-25','M'],
    [42,'Ash-Shura','الشورى',53,'25','M'],
    [43,'Az-Zukhruf','الزخرف',89,'25','M'],
    [44,'Ad-Dukhan','الدخان',59,'25','M'],
    [45,'Al-Jathiyah','الجاثية',37,'25','M'],
    [46,'Al-Ahqaf','الأحقاف',35,'26','M'],
    [47,'Muhammad','محمد',38,'26','D'],
    [48,'Al-Fath','الفتح',29,'26','D'],
    [49,'Al-Hujurat','الحجرات',18,'26','D'],
    [50,'Qaf','ق',45,'26','M'],
    [51,'Adh-Dhariyat','الذاريات',60,'26-27','M'],
    [52,'At-Tur','الطور',49,'27','M'],
    [53,'An-Najm','النجم',62,'27','M'],
    [54,'Al-Qamar','القمر',55,'27','M'],
    [55,'Ar-Rahman','الرحمن',78,'27','D'],
    [56,"Al-Waqi'ah","الواقعة",96,'27','M'],
    [57,'Al-Hadid','الحديد',29,'27','D'],
    [58,'Al-Mujadila','المجادلة',22,'28','D'],
    [59,'Al-Hashr','الحشر',24,'28','D'],
    [60,'Al-Mumtahanah','الممتحنة',13,'28','D'],
    [61,'As-Saf','الصف',14,'28','D'],
    [62,"Al-Jumu'ah","الجمعة",11,'28','D'],
    [63,'Al-Munafiqun','المنافقون',11,'28','D'],
    [64,'At-Taghabun','التغابن',18,'28','D'],
    [65,'At-Talaq','الطلاق',12,'28','D'],
    [66,'At-Tahrim','التحريم',12,'28','D'],
    [67,'Al-Mulk','الملك',30,'29','M'],
    [68,'Al-Qalam','القلم',52,'29','M'],
    [69,'Al-Haqqah','الحاقة',52,'29','M'],
    [70,"Al-Ma'arij","المعارج",44,'29','M'],
    [71,'Nuh','نوح',28,'29','M'],
    [72,'Al-Jinn','الجن',28,'29','M'],
    [73,'Al-Muzzammil','المزمل',20,'29','M'],
    [74,'Al-Muddaththir','المدثر',56,'29','M'],
    [75,'Al-Qiyamah','القيامة',40,'29','M'],
    [76,'Al-Insan','الإنسان',31,'29','D'],
    [77,'Al-Mursalat','المرسلات',50,'29','M'],
    [78,"An-Naba'","النبأ",40,'30','M'],
    [79,"An-Nazi'at","النازعات",46,'30','M'],
    [80,'Abasa','عبس',42,'30','M'],
    [81,'At-Takwir','التكوير',29,'30','M'],
    [82,'Al-Infitar','الانفطار',19,'30','M'],
    [83,'Al-Mutaffifin','المطففين',36,'30','M'],
    [84,'Al-Inshiqaq','الانشقاق',25,'30','M'],
    [85,'Al-Buruj','البروج',22,'30','M'],
    [86,'At-Tariq','الطارق',17,'30','M'],
    [87,"Al-A'la","الأعلى",19,'30','M'],
    [88,'Al-Ghashiyah','الغاشية',26,'30','M'],
    [89,'Al-Fajr','الفجر',30,'30','M'],
    [90,'Al-Balad','البلد',20,'30','M'],
    [91,'Ash-Shams','الشمس',15,'30','M'],
    [92,'Al-Layl','الليل',21,'30','M'],
    [93,'Ad-Duha','الضحى',11,'30','M'],
    [94,'Ash-Sharh','الشرح',8,'30','M'],
    [95,'At-Tin','التين',8,'30','M'],
    [96,'Al-Alaq','العلق',19,'30','M'],
    [97,'Al-Qadr','القدر',5,'30','M'],
    [98,'Al-Bayyinah','البينة',8,'30','D'],
    [99,'Az-Zalzalah','الزلزلة',8,'30','D'],
    [100,"Al-Adiyat","العاديات",11,'30','M'],
    [101,"Al-Qari'ah","القارعة",11,'30','M'],
    [102,'At-Takathur','التكاثر',8,'30','M'],
    [103,'Al-Asr','العصر',3,'30','M'],
    [104,'Al-Humazah','الهمزة',9,'30','M'],
    [105,'Al-Fil','الفيل',5,'30','M'],
    [106,'Quraysh','قريش',4,'30','M'],
    [107,"Al-Ma'un","الماعون",7,'30','M'],
    [108,'Al-Kawthar','الكوثر',3,'30','M'],
    [109,'Al-Kafirun','الكافرون',6,'30','M'],
    [110,'An-Nasr','النصر',3,'30','D'],
    [111,'Al-Masad','المسد',5,'30','M'],
    [112,'Al-Ikhlas','الإخلاص',4,'30','M'],
    [113,'Al-Falaq','الفلق',5,'30','M'],
    [114,"An-Nas","الناس",6,'30','M'],
  ];

  /* Uzbek sura names */
  const UZ = {
    1:'Al-Fatihah',2:'Al-Baqarah',3:'Ali Imron',4:'An-Niso',5:'Al-Moidah',
    6:"Al-An'om",7:"Al-A'rof",8:'Al-Anfol',9:'At-Tavba',10:'Yunus',
    11:'Hud',12:'Yusuf',13:"Ar-Ra'd",14:'Ibrohim',15:'Al-Hijr',
    16:'An-Nahl',17:"Al-Isro'",18:'Al-Kahf',19:'Maryam',20:'To-Ha',
    21:"Al-Anbiyo'",22:'Al-Haj',23:"Al-Mo'minun",24:'An-Nur',25:'Al-Furqon',
    26:"Ash-Shu'aro",27:'An-Naml',28:'Al-Qasas',29:'Al-Ankabut',30:'Ar-Rum',
    31:'Luqmon',32:'As-Sajda',33:'Al-Ahzob',34:"Sabo'",35:'Fotir',
    36:'Yosin',37:'As-Soffot',38:'Sod',39:'Az-Zumar',40:"G'ofir",
    41:'Fussilat',42:'Ash-Shuro',43:'Az-Zuxruf',44:'Ad-Duxon',45:'Al-Josiya',
    46:'Al-Ahqof',47:'Muhammad',48:'Al-Fath',49:'Al-Hujurot',50:'Qof',
    51:'Az-Zoriyot',52:'At-Tur',53:'An-Najm',54:'Al-Qamar',55:'Ar-Rohmon',
    56:"Al-Voqi'a",57:'Al-Hadid',58:'Al-Mujodala',59:'Al-Hashr',60:'Al-Mumtahana',
    61:'As-Saff',62:"Al-Jum'a",63:'Al-Munofiqun',64:"At-Tag'obun",65:'At-Taloq',
    66:'At-Tahrim',67:'Al-Mulk',68:'Al-Qalam',69:'Al-Haqqa',70:"Al-Ma'orij",
    71:'Nuh',72:'Al-Jin',73:'Al-Muzzammil',74:'Al-Muddaththir',75:'Al-Qiyoma',
    76:'Al-Inson',77:'Al-Mursalot',78:"An-Naba'",79:"An-Nazi'ot",80:'Abasa',
    81:'At-Takwir',82:'Al-Infitor',83:'Al-Mutaffifin',84:'Al-Inshiqoq',85:'Al-Buruj',
    86:'At-Toriq',87:"Al-A'lo",88:"Al-G'oshiya",89:'Al-Fajr',90:'Al-Balad',
    91:'Ash-Shams',92:'Al-Layl',93:'Ad-Duho',94:'Ash-Sharh',95:'At-Tin',
    96:"Al-Aloq",97:'Al-Qadr',98:'Al-Bayyina',99:'Az-Zalzala',100:'Al-Odiyot',
    101:"Al-Qori'a",102:'At-Takosur',103:'Al-Asr',104:'Al-Humaza',105:'Al-Fil',
    106:'Quraysh',107:"Al-Mo'un",108:'Al-Kavsar',109:'Al-Kofirun',110:'An-Nasr',
    111:'Al-Masad',112:'Al-Ixlos',113:'Al-Falaq',114:'An-Nos'
  };
  const _uz = s => UZ[s[0]] || s[1];

  const TRANSLATIONS = {
    uz:'uz.sodik', uz_cyr:'uz.sodik', en:'en.sahih', ru:'ru.kuliev',
    tr:'tr.diyanet', ar:null, kk:'ru.kuliev', tg:'ru.kuliev',
    ky:'ru.kuliev', de:'de.aburida', fr:'fr.hamidullah',
    id:'id.indonesian', hi:'hi.hindi', ur:'ur.ahmedali'
  };

  const RECITER = { id:'ar.alafasy', name:'Mishary Rashid al-Afasy', flag:'🇰🇼' };

  /* ── State ── */
  let _lang         = 'uz';
  let _tab          = 'suralar';
  let _view         = 'list';
  let _surahIdx     = 0;
  let _filter       = 'all';
  let _showTranslit = true;
  let _showTafsir   = {};
  let _audio        = null;
  let _playing      = false;

  const LS_BM      = 'quran_bookmarks_v2';
  const LS_LAST    = 'quran_last_read';
  const LS_TRANSLIT= 'quran_translit';

  function _getBM()    { try { return JSON.parse(localStorage.getItem(LS_BM)||'{}'); } catch { return {}; } }
  function _saveBM(b)  { try { localStorage.setItem(LS_BM, JSON.stringify(b)); } catch {} }
  function _getLast()  { try { return JSON.parse(localStorage.getItem(LS_LAST)||'null'); } catch { return null; } }
  function _saveLast(n){ try { localStorage.setItem(LS_LAST, JSON.stringify({num:n})); } catch {} }

  /* ── Entry points ── */
  function render() {
    const el = document.getElementById('screen-quran');
    if (!el) return;
    _lang         = window.App?.state?.lang || 'uz';
    _showTranslit = localStorage.getItem(LS_TRANSLIT) !== 'false';
    _tab          = 'suralar';
    _view         = 'list';
    el.innerHTML  = _buildMainHTML();
    _bindMainEvents(el);
  }

  function load(lang) {
    _lang = lang;
    const el = document.getElementById('screen-quran');
    if (!el) return;
    if (_view === 'list') {
      el.innerHTML = _buildMainHTML();
      _bindMainEvents(el);
    }
  }

  /* ════════════════════════════════════════════════════════
     MAIN SHELL  (header + 3 tabs + content)
  ════════════════════════════════════════════════════════ */
  function _buildMainHTML() {
    return `
      <div class="screen-inner q-screen">
        <div class="q-header">
          <div class="q-nav-row">
            <button id="quran-back" class="q-back-btn">← Menyu</button>
            <div class="q-qori-badge">
              <span>${RECITER.flag}</span>
              <span>${RECITER.name.split(' ')[0]}</span>
            </div>
          </div>
          <div class="q-title-block">
            <div class="q-title-main">Al-Qur'on al-Karim</div>
            <div class="q-title-sub">القرآن الكريم · 114 sura · 6,236 oyat</div>
          </div>
          <div class="q-divider"></div>
          <div class="q-tabs-row">
            <button class="q-tab-btn${_tab==='suralar'?' active':''}" data-tab="suralar">📖 Suralar</button>
            <button class="q-tab-btn${_tab==='qori'?' active':''}" data-tab="qori">🎙 Qori</button>
            <button class="q-tab-btn${_tab==='saqlangan'?' active':''}" data-tab="saqlangan">🔖 Saqlangan</button>
          </div>
        </div>
        <div class="q-content" id="q-content">${_tabContent()}</div>
      </div>`;
  }

  function _tabContent() {
    if (_tab === 'suralar')   return _suralarHTML();
    if (_tab === 'qori')      return _qoriHTML();
    if (_tab === 'saqlangan') return _saqlanganHTML();
    return _suralarHTML();
  }

  /* ── Tab: Suralar ── */
  function _suralarHTML() {
    const lastRead = _getLast();
    const bm       = _getBM();

    const continueBanner = lastRead ? (() => {
      const s = SURAHS.find(x => x[0] === lastRead.num);
      return s ? `
        <div class="q-continue-banner" id="quran-continue-btn">
          <span>📖</span>
          <div style="flex:1">
            <div class="q-banner-title">Davom ettirish</div>
            <div class="q-banner-sub">${_uz(s)} · ${s[0]}-sura</div>
          </div>
          <span class="q-banner-arrow">›</span>
        </div>` : '';
    })() : '';

    const rows = SURAHS.map((s, i) => {
      const [num,, ar, verses, juz, type] = s;
      if (_filter === 'makka'  && type !== 'M') return '';
      if (_filter === 'madina' && type !== 'D') return '';
      if (_filter === 'juz30'  && juz  !== '30') return '';
      const hasBm = Object.keys(bm).some(k => k.startsWith(num + '_'));
      return `
        <div class="q-sura-row" data-num="${num}">
          <div class="q-sura-num">${num}</div>
          <div class="q-sura-info">
            <div class="q-sura-name">${_uz(s)}</div>
            <div class="q-sura-meta">${verses} oyat · Juz ${juz} · ${type==='M'?'🕋':'🕌'} ${type==='M'?'Makka':'Madina'}</div>
          </div>
          <div class="q-sura-ar">${ar}</div>
          <button class="q-bm-btn${hasBm?' bm-on':''}" data-bm="${num}">🔖</button>
        </div>
        <div class="q-sura-sep"></div>`;
    }).join('');

    return `
      <div class="q-search-box">
        <span class="q-search-icon">🔍</span>
        <input id="quran-search" class="q-search-input" type="text"
               placeholder="Sura nomi yoki raqami..." autocomplete="off"/>
        <button id="q-search-clear" class="q-search-clear" style="display:none">✕</button>
      </div>
      <div class="q-filters-row">
        ${[['all','Barchasi'],['makka','🕋 Makkiy'],['madina','🕌 Madaniy'],['juz30','Juz 30']].map(
          ([k,l]) => `<button class="q-filter-btn${_filter===k?' active':''}" data-filter="${k}">${l}</button>`
        ).join('')}
      </div>
      ${continueBanner}
      <div id="quran-list">${rows}</div>`;
  }

  /* ── Tab: Qori ── */
  function _qoriHTML() {
    return `
      <div class="q-section-label" style="margin-bottom:8px">QORI TANLASH</div>
      <div class="q-qori-card active">
        <span class="q-qori-flag">${RECITER.flag}</span>
        <div class="q-qori-info">
          <div class="q-qori-name">${RECITER.name}</div>
          <div class="q-qori-style">Murattal · 128kbps</div>
        </div>
        <div class="q-qori-check">✓</div>
      </div>
      <div class="q-qori-note">Keyingi versiyada ko'proq qorilar qo'shiladi.</div>`;
  }

  /* ── Tab: Saqlangan ── */
  function _saqlanganHTML() {
    const bm      = _getBM();
    const entries = Object.values(bm);
    if (!entries.length) return '<div class="q-empty">🔖 Hali hech narsa saqlanmagan</div>';

    const bysurah = {};
    entries.forEach(b => { bysurah[b.surah] = (bysurah[b.surah] || 0) + 1; });

    return `
      <div class="q-section-label" style="margin-bottom:8px">SAQLANGAN · ${entries.length} ta oyat</div>
      ${Object.entries(bysurah).map(([sn, cnt]) => {
        const s = SURAHS.find(x => x[0] === parseInt(sn));
        if (!s) return '';
        return `
          <div class="q-bm-card" data-surah="${sn}">
            <div class="q-bm-num">${sn}</div>
            <div class="q-bm-info">
              <div class="q-bm-name">${_uz(s)}</div>
              <div class="q-bm-sub">${cnt} ta oyat saqlangan</div>
            </div>
            <button class="q-bm-del" data-surah="${sn}">✕</button>
          </div>`;
      }).join('')}`;
  }

  /* ════════════════════════════════════════════════════════
     EVENT BINDING
  ════════════════════════════════════════════════════════ */
  function _bindMainEvents(el) {
    el.querySelector('#quran-back')?.addEventListener('click', () => {
      _stopAudio();
      window.App.navigate('screen-dashboard');
    });

    el.querySelectorAll('.q-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        el.querySelectorAll('.q-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const c = el.querySelector('#q-content');
        if (c) {
          c.innerHTML = _tabContent();
          _bindTabContent(el);
        }
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    _bindTabContent(el);
  }

  function _bindTabContent(el) {
    if (_tab === 'suralar')   _bindSuralar(el);
    if (_tab === 'saqlangan') _bindSaqlangan(el);
  }

  function _bindSuralar(el) {
    const inp = el.querySelector('#quran-search');
    const clr = el.querySelector('#q-search-clear');

    inp?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      if (clr) clr.style.display = q ? '' : 'none';
      el.querySelectorAll('.q-sura-row').forEach(row => {
        const name = (row.querySelector('.q-sura-name')?.textContent || '').toLowerCase();
        const arTxt = row.querySelector('.q-sura-ar')?.textContent || '';
        const num   = row.querySelector('.q-sura-num')?.textContent || '';
        const vis   = !q || name.includes(q) || arTxt.includes(q) || num.includes(q);
        row.style.display = vis ? '' : 'none';
        const sep = row.nextElementSibling;
        if (sep?.classList.contains('q-sura-sep')) sep.style.display = vis ? '' : 'none';
      });
    });

    clr?.addEventListener('click', () => {
      if (inp) inp.value = '';
      if (clr) clr.style.display = 'none';
      el.querySelectorAll('.q-sura-row, .q-sura-sep').forEach(r => r.style.display = '');
    });

    el.querySelectorAll('.q-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _filter = btn.dataset.filter;
        const c = el.querySelector('#q-content');
        if (c) { c.innerHTML = _tabContent(); _bindTabContent(el); }
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    el.querySelector('#quran-continue-btn')?.addEventListener('click', () => {
      const lr = _getLast();
      if (!lr) return;
      const idx = SURAHS.findIndex(s => s[0] === lr.num);
      if (idx >= 0) { _surahIdx = idx; _openSurah(el); }
    });

    el.querySelectorAll('.q-sura-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.q-bm-btn')) return;
        const idx = SURAHS.findIndex(s => s[0] === parseInt(row.dataset.num));
        if (idx >= 0) { _surahIdx = idx; _openSurah(el); }
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      });
    });

    el.querySelectorAll('.q-bm-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const num   = parseInt(btn.dataset.bm);
        const bm2   = _getBM();
        const hasBm = Object.keys(bm2).some(k => k.startsWith(num + '_'));
        if (hasBm) {
          Object.keys(bm2).forEach(k => { if (k.startsWith(num + '_')) delete bm2[k]; });
          btn.classList.remove('bm-on');
        } else {
          const s = SURAHS.find(x => x[0] === num);
          bm2[`${num}_1`] = { surah: num, ayah: 1, name: _uz(s) };
          btn.classList.add('bm-on');
        }
        _saveBM(bm2);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      });
    });
  }

  function _bindSaqlangan(el) {
    el.querySelectorAll('.q-bm-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.q-bm-del')) return;
        const idx = SURAHS.findIndex(s => s[0] === parseInt(card.dataset.surah));
        if (idx >= 0) { _surahIdx = idx; _tab = 'suralar'; _openSurah(el); }
      });
    });
    el.querySelectorAll('.q-bm-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const sn  = parseInt(btn.dataset.surah);
        const bm2 = _getBM();
        Object.keys(bm2).forEach(k => { if (k.startsWith(sn + '_')) delete bm2[k]; });
        _saveBM(bm2);
        btn.closest('.q-bm-card')?.remove();
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     READER VIEW
  ════════════════════════════════════════════════════════ */
  async function _openSurah(el) {
    const s = SURAHS[_surahIdx];
    if (!s) return;
    _view = 'reader';
    _showTafsir = {};
    _saveLast(s[0]);

    el.innerHTML = _buildReaderShell(s);
    _bindReaderShell(el, s);
    _initAudio(el, s[0]);

    const cacheKey = `quran_${s[0]}_${_lang}_v6`;
    const cached   = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const d = JSON.parse(cached);
        _renderAyahs(el, s, d.arabic, d.translation, d.translit);
        return;
      } catch {}
    }

    try {
      const edition = TRANSLATIONS[_lang];
      const [arData, trData, txData] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${s[0]}/quran-uthmani`).then(r => r.json()),
        edition
          ? fetch(`https://api.alquran.cloud/v1/surah/${s[0]}/${edition}`).then(r => r.json())
          : Promise.resolve(null),
        fetch(`https://api.alquran.cloud/v1/surah/${s[0]}/en.transliteration`).then(r => r.json()),
      ]);
      const arabic    = arData?.code===200 ? arData.data.ayahs.map(a => a.text) : [];
      const rawTransl = trData?.code===200 ? trData.data.ayahs.map(a => a.text) : [];
      const transl    = (_lang === 'uz') ? rawTransl.map(_cyrToLat) : rawTransl;
      const translit  = txData?.code===200 ? txData.data.ayahs.map(a => a.text) : [];
      try { localStorage.setItem(cacheKey, JSON.stringify({arabic, translation:transl, translit})); } catch {}
      _renderAyahs(el, s, arabic, transl, translit);
    } catch {
      const body = el.querySelector('#quran-reader-body');
      if (body) body.innerHTML = `
        <div class="quran-loading">❌ Yuklanmadi.
          <button class="quran-retry-btn" id="quran-retry">Qayta urinish</button>
        </div>`;
      el.querySelector('#quran-retry')?.addEventListener('click', () => _openSurah(el));
    }
  }

  function _buildReaderShell(s) {
    const [num,, ar, verses, juz, type] = s;
    const nameUz    = _uz(s);
    const typeLabel = type === 'M' ? '🕋 Makkiy' : '🕌 Madaniy';
    const wave = Array.from({length:12}, (_, i) =>
      `<div class="quran-wave-bar" style="animation-delay:${(i*0.07).toFixed(2)}s"></div>`).join('');

    return `
      <div class="screen-inner q-screen">
        <div class="q-header q-rdr-hdr">
          <div class="q-nav-row">
            <button id="quran-reader-back" class="q-back-btn">← ${nameUz}</button>
            <button id="quran-translit-btn" class="q-translit-toggle${_showTranslit?' active':''}">Tr</button>
          </div>

          <div class="q-sura-title-card">
            <div class="q-sura-title-ar">${ar}</div>
            <div class="q-sura-title-uz">${nameUz}</div>
            <div class="q-sura-badges">
              <span class="q-sura-badge">${verses} oyat</span>
              <span class="q-sura-badge">Juz ${juz}</span>
              <span class="q-sura-badge">${typeLabel}</span>
              <span class="q-sura-badge">${_surahIdx+1}/114</span>
            </div>
          </div>

          <div class="q-audio-card">
            <div class="q-audio-info">
              <div class="q-audio-avatar">🎙</div>
              <div class="q-audio-meta">
                <div class="q-audio-name">${RECITER.name}</div>
                <div class="q-audio-quality">Murattal · 128kbps</div>
              </div>
              <div class="quran-waveform" id="quran-waveform">${wave}</div>
            </div>
            <div class="q-audio-progress" id="quran-progress-track">
              <div class="q-audio-progress-fill" id="quran-progress-fill" style="width:0%"></div>
            </div>
            <div class="q-audio-time-row">
              <span id="quran-time-curr">0:00</span>
              <button class="q-audio-repeat" id="quran-repeat-btn">🔁</button>
              <span id="quran-time-dur">--:--</span>
            </div>
            <div class="q-audio-btns">
              <button class="q-audio-btn" id="quran-prev-btn" ${_surahIdx===0?'disabled':''}>⏮</button>
              <button class="q-audio-btn" id="quran-seek-back">⏪</button>
              <button class="q-audio-play" id="quran-play-btn">
                <span id="quran-play-icon">▶</span>
              </button>
              <button class="q-audio-btn" id="quran-seek-fwd">⏩</button>
              <button class="q-audio-btn" id="quran-next-btn" ${_surahIdx===SURAHS.length-1?'disabled':''}>⏭</button>
            </div>
          </div>
        </div>

        <div class="quran-reader-body" id="quran-reader-body">
          <div class="quran-loading"><span class="quran-spinner"></span> Yuklanmoqda...</div>
        </div>
      </div>`;
  }

  function _bindReaderShell(el, s) {
    el.querySelector('#quran-reader-back')?.addEventListener('click', () => {
      _stopAudio();
      _view = 'list';
      el.innerHTML = _buildMainHTML();
      _bindMainEvents(el);
    });

    el.querySelector('#quran-play-btn')?.addEventListener('click', () => _togglePlay(el));

    el.querySelector('#quran-seek-back')?.addEventListener('click', () => {
      if (_audio) _audio.currentTime = Math.max(0, _audio.currentTime - 15);
    });
    el.querySelector('#quran-seek-fwd')?.addEventListener('click', () => {
      if (_audio?.duration) _audio.currentTime = Math.min(_audio.duration, _audio.currentTime + 15);
    });
    el.querySelector('#quran-prev-btn')?.addEventListener('click', () => {
      if (_surahIdx > 0) { _stopAudio(); _surahIdx--; _openSurah(el); }
    });
    el.querySelector('#quran-next-btn')?.addEventListener('click', () => {
      if (_surahIdx < SURAHS.length-1) { _stopAudio(); _surahIdx++; _openSurah(el); }
    });
    el.querySelector('#quran-repeat-btn')?.addEventListener('click', () => {
      if (!_audio) return;
      _audio.loop = !_audio.loop;
      el.querySelector('#quran-repeat-btn')?.classList.toggle('active', _audio.loop);
    });
    el.querySelector('#quran-translit-btn')?.addEventListener('click', () => {
      _showTranslit = !_showTranslit;
      localStorage.setItem(LS_TRANSLIT, _showTranslit);
      el.querySelectorAll('.quran-ayah-translit').forEach(d => {
        d.style.display = _showTranslit ? '' : 'none';
      });
      el.querySelector('#quran-translit-btn')?.classList.toggle('active', _showTranslit);
    });
    el.querySelector('#quran-progress-track')?.addEventListener('click', e => {
      if (!_audio?.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      _audio.currentTime = Math.max(0, Math.min(1, (e.clientX-rect.left)/rect.width)) * _audio.duration;
    });
  }

  /* ════════════════════════════════════════════════════════
     RENDER AYAHS
  ════════════════════════════════════════════════════════ */
  function _renderAyahs(el, s, arabic, translation, translit) {
    const [num] = s;
    const body  = el.querySelector('#quran-reader-body');
    if (!body) return;
    const bm = _getBM();

    const basmala = (num !== 9 && num !== 1)
      ? '<div class="quran-basmala">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>' : '';

    const ayahsHTML = arabic.map((arText, i) => {
      const n     = i + 1;
      const bmKey = `${num}_${n}`;
      const isBm  = !!bm[bmKey];
      return `
        <div class="quran-ayah-block" id="ayah-${n}">
          <div class="quran-ayah-header">
            <div class="quran-ayah-num-badge">${num}:${n}</div>
            <div class="quran-ayah-actions">
              <button class="quran-ayah-icon-btn${isBm?' bm-on':''}"
                      data-action="bm" data-n="${n}" data-sn="${num}">
                ${isBm?'🔖':'🏷️'}
              </button>
              <button class="quran-ayah-icon-btn" data-action="tafsir" data-n="${n}">📝</button>
              <button class="quran-ayah-icon-btn" data-action="share"  data-n="${n}" data-sn="${num}">📤</button>
            </div>
          </div>
          <div class="quran-ayah-ar">${arText}</div>
          ${translit[i] ? `
            <div class="quran-ayah-translit"${(_showTranslit || _lang === 'uz') ? '' : ' style="display:none"'}>
              ${_esc(translit[i])}
            </div>` : ''}
          ${translation[i]
            ? `<div class="quran-ayah-tr">${_esc(translation[i])}</div>`
            : ((_lang === 'uz' || _lang === 'uz_cyr')
                ? `<div class="quran-ayah-tr" style="opacity:.45;font-style:italic">${_lang === 'uz_cyr' ? 'Ушбу таржима ҳозирча мавжуд эмас.' : "Ushbu tarjima hozircha mavjud emas."}</div>`
                : '')}
          <div class="quran-tafsir-wrap" id="tafsir-${n}" style="display:none">
            <div class="quran-tafsir-loading">
              <span class="quran-spinner" style="width:14px;height:14px;border-width:2px"></span>
              Tafsir yuklanmoqda...
            </div>
          </div>
        </div>`;
    }).join('');

    body.innerHTML = `${basmala}<div class="quran-ayahs-list">${ayahsHTML}</div>`;

    body.querySelectorAll('[data-action="bm"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.n), sn = parseInt(btn.dataset.sn);
        const key = `${sn}_${n}`, bm2 = _getBM();
        if (bm2[key]) {
          delete bm2[key]; btn.textContent='🏷️'; btn.classList.remove('bm-on');
        } else {
          bm2[key] = { surah:sn, ayah:n, name:_uz(s) };
          btn.textContent='🔖'; btn.classList.add('bm-on');
        }
        _saveBM(bm2);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      });
    });

    body.querySelectorAll('[data-action="tafsir"]').forEach(btn => {
      btn.addEventListener('click', () => _toggleTafsir(body, s[0], parseInt(btn.dataset.n)));
    });

    body.querySelectorAll('[data-action="share"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.n), i = n-1;
        const txt = `${_uz(s)} (${num}:${n})\n${arabic[i]}${translation[i]?'\n\n'+translation[i]:''}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(txt).then(() => {
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
            const orig = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = orig; }, 1400);
          });
        }
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     TAFSIR
  ════════════════════════════════════════════════════════ */
  async function _toggleTafsir(body, surahNum, ayahNum) {
    const wrap = body.querySelector(`#tafsir-${ayahNum}`);
    if (!wrap) return;
    if (wrap.style.display !== 'none') { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    const cKey   = `tafsir_${surahNum}_${ayahNum}`;
    const cached = localStorage.getItem(cKey);
    if (cached) {
      wrap.innerHTML = `<div class="quran-tafsir-text">${_esc(cached)}</div>
        <div class="quran-tafsir-source">📚 Maududi Tafsir (English)</div>`;
      return;
    }
    try {
      const resp = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/en.maududi`);
      const data = await resp.json();
      if (data.code === 200 && data.data?.text) {
        const text = data.data.text;
        try { localStorage.setItem(cKey, text); } catch {}
        wrap.innerHTML = `<div class="quran-tafsir-text">${_esc(text)}</div>
          <div class="quran-tafsir-source">📚 Maududi Tafsir (English)</div>`;
      } else {
        wrap.innerHTML = `<div class="quran-tafsir-text quran-tafsir-na">Ushbu oyat uchun tafsir hozircha mavjud emas.</div>`;
      }
    } catch {
      wrap.innerHTML = `<div class="quran-tafsir-text quran-tafsir-na">Tafsir yuklanmadi. Internet aloqasini tekshiring.</div>`;
    }
  }

  /* ════════════════════════════════════════════════════════
     AUDIO
  ════════════════════════════════════════════════════════ */
  function _initAudio(el, surahNum) {
    if (_audio) { _audio.pause(); _audio.src = ''; }
    _audio   = new Audio();
    _playing = false;
    _audio.preload = 'none';
    _audio.src = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNum}.mp3`;

    _audio.addEventListener('playing',        () => { _playing=true;  _setPlayIcon(el,'pause'); _setWave(el,true); });
    _audio.addEventListener('pause',          () => { _playing=false; _setPlayIcon(el,'play');  _setWave(el,false); });
    _audio.addEventListener('waiting',        () => _setPlayIcon(el,'load'));
    _audio.addEventListener('canplay',        () => { if (!_playing) _setPlayIcon(el,'play'); });
    _audio.addEventListener('timeupdate',     () => _updateProgress(el));
    _audio.addEventListener('loadedmetadata', () => _updateDuration(el));
    _audio.addEventListener('ended', () => {
      if (!_audio.loop) { _playing=false; _setPlayIcon(el,'play'); _setWave(el,false); }
    });
    _audio.addEventListener('error', () => { _playing=false; _setPlayIcon(el,'play'); _setWave(el,false); });
  }

  function _togglePlay(el) {
    if (!_audio) return;
    if (_playing) { _audio.pause(); }
    else { _setPlayIcon(el,'load'); _audio.play().catch(() => _setPlayIcon(el,'play')); }
  }

  function _stopAudio() {
    if (_audio) { _audio.pause(); _audio.src=''; _audio=null; }
    _playing = false;
  }

  function _setPlayIcon(el, state) {
    const icon = el.querySelector('#quran-play-icon');
    const btn  = el.querySelector('#quran-play-btn');
    if (!icon) return;
    if (state==='play')  { icon.textContent='▶'; btn?.classList.remove('loading'); }
    if (state==='pause') { icon.textContent='⏸'; btn?.classList.remove('loading'); }
    if (state==='load')  { icon.textContent='⏳'; btn?.classList.add('loading'); }
  }

  function _updateProgress(el) {
    if (!_audio) return;
    const fill = el.querySelector('#quran-progress-fill');
    const curr = el.querySelector('#quran-time-curr');
    if (fill && _audio.duration)
      fill.style.width = (_audio.currentTime / _audio.duration * 100) + '%';
    if (curr) curr.textContent = _fmt(_audio.currentTime);
  }

  function _updateDuration(el) {
    const dur = el.querySelector('#quran-time-dur');
    if (dur && _audio?.duration && !isNaN(_audio.duration))
      dur.textContent = _fmt(_audio.duration);
  }

  function _setWave(el, active) {
    el.querySelector('#quran-waveform')?.classList.toggle('playing', active);
  }

  function _fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  }

  /* ── Uzbek Cyrillic → Latin converter (for uz.sodik API output) ── */
  function _cyrToLat(text) {
    if (!text || typeof text !== 'string') return text;
    if (!/[Ѐ-ӿ]/.test(text)) return text; // no Cyrillic → pass through
    const MAP = [
      // Uzbek-specific Cyrillic letters first (before general ones)
      ["Ғ","G'"],["ғ","g'"],
      ["Қ","Q"], ["қ","q"],
      ["Ҳ","H"], ["ҳ","h"],
      ["Ў","O'"],["ў","o'"],
      ["Ҷ","J"], ["ҷ","j"],
      // Digraphs
      ["Шч","Shch"],["шч","shch"],
      ["Нг","Ng"],  ["нг","ng"],
      ["Ш","Sh"],   ["ш","sh"],
      ["Ч","Ch"],   ["ч","ch"],
      ["Щ","Sh"],   ["щ","sh"],
      ["Ю","Yu"],   ["ю","yu"],
      ["Я","Ya"],   ["я","ya"],
      ["Ё","Yo"],   ["ё","yo"],
      ["Ж","J"],    ["ж","j"],
      ["Ц","Ts"],   ["ц","ts"],
      // Standard single chars
      ["А","A"],["а","a"],
      ["Б","B"],["б","b"],
      ["В","V"],["в","v"],
      ["Г","G"],["г","g"],
      ["Д","D"],["д","d"],
      ["Е","E"],["е","e"],
      ["З","Z"],["з","z"],
      ["И","I"],["и","i"],
      ["Й","Y"],["й","y"],
      ["К","K"],["к","k"],
      ["Л","L"],["л","l"],
      ["М","M"],["м","m"],
      ["Н","N"],["н","n"],
      ["О","O"],["о","o"],
      ["П","P"],["п","p"],
      ["Р","R"],["р","r"],
      ["С","S"],["с","s"],
      ["Т","T"],["т","t"],
      ["У","U"],["у","u"],
      ["Ф","F"],["ф","f"],
      ["Х","X"],["х","x"],
      ["Ы","I"],["ы","i"],
      ["Э","E"],["э","e"],
      ["Ъ","'"], ["ъ","'"],
      ["Ь",""],  ["ь",""],
    ];
    let r = text;
    for (const [from, to] of MAP) r = r.split(from).join(to);
    // clean up double-apostrophe from ўъ → o'' → o'
    r = r.replace(/o''/g, "o'").replace(/O''/g, "O'").replace(/g''/g, "g'").replace(/G''/g, "G'");
    return r;
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render, load };
})();
