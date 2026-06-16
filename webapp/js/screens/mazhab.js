/* ═══════════════════════════════════════════════════
   Mazhab Selection Screen — v1 (KB tile design)
   ═══════════════════════════════════════════════════ */

const MazhabScreen = (function () {
  'use strict';

  const TILE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%230d1829'/%3E%3Cline x1='0' y1='0' x2='60' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Cline x1='60' y1='0' x2='0' y2='60' stroke='%23F5C542' stroke-width='0.2' opacity='0.13'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%23F5C542' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E";

  const MZ_STRINGS = {
    title:    { uz:'Mazhabni tanlang',   uz_cyr:'Мазҳабни танланг',   ru:'Выберите мазхаб',      en:'Choose Madhab',      tr:'Mezhep seçin',        ar:'اختر المذهب',          kk:'Мазхабты таңдаңыз',    tg:'Мазҳабро интихоб кунед',  ky:'Мазхапты тандаңыз',   de:'Madhab auswählen',         fr:'Choisir le madhab',      id:'Pilih Mazhab',     hi:'मज़हब चुनें',         ur:'مذہب منتخب کریں'    },
    subtitle: { uz:'Namoz vaqtlari shu asosda hisoblanadi', uz_cyr:'Намоз вақтлари шу асосда ҳисобланади', ru:'Время намаза рассчитывается на этой основе', en:'Prayer times are calculated based on this', tr:'Namaz vakitleri buna göre hesaplanır', ar:'تُحسب أوقات الصلاة وفقاً لذلك', kk:'Намаз уақыттары осы негізде есептеледі', tg:'Вақтҳои намоз дар асоси ин ҳисоб карда мешавад', ky:'Намаз убактары ушул негизде эсептелет', de:'Gebetszeiten werden danach berechnet', fr:'Les heures de prière sont calculées en fonction', id:'Waktu sholat dihitung berdasarkan ini', hi:'नमाज़ के वक़्त इसी के आधार पर गिने जाते हैं', ur:'نماز کے اوقات اسی بنیاد پر حساب ہوتے ہیں' },
  };

  const MAZHABLAR = [
    {
      k: 'hanafi',
      ar: 'حنفي',
      name: { uz:'Hanafiy', uz_cyr:'Ҳанафий', ru:'Ханафи', en:'Hanafi', tr:'Hanefi', ar:'الحنفي', kk:'Ханафи', tg:'Ҳанафӣ', ky:'Ханафи', de:'Hanafi', fr:'Hanafite', id:'Hanafi', hi:'हनफ़ी', ur:'حنفی' },
      mintaqa: { uz:"Markaziy Osiyo · Turkiya · Hindiston · Pokiston", uz_cyr:"Марказий Осиё · Туркия · Ҳиндистон · Покистон", ru:"Центральная Азия · Турция · Индия · Пакистан", en:"Central Asia · Turkey · India · Pakistan", tr:"Orta Asya · Türkiye · Hindistan · Pakistan", ar:"آسيا الوسطى · تركيا · الهند · باكستان", kk:"Орталық Азия · Түркия · Үндістан · Пәкістан", tg:"Осиёи Марказӣ · Туркия · Ҳиндустон · Покистон", ky:"Борбордук Азия · Түркия · Индия · Пакистан", de:"Zentralasien · Türkei · Indien · Pakistan", fr:"Asie centrale · Turquie · Inde · Pakistan", id:"Asia Tengah · Turki · India · Pakistan", hi:"मध्य एशिया · तुर्की · भारत · पाकिस्तान", ur:"وسطی ایشیا · ترکی · ہندوستان · پاکستان" },
    },
    {
      k: 'maliki',
      ar: 'مالكي',
      name: { uz:'Molikiy', uz_cyr:'Молиқий', ru:'Маликi', en:'Maliki', tr:'Mâlikî', ar:'المالكي', kk:'Малики', tg:'Моликӣ', ky:'Малики', de:'Maliki', fr:'Malékite', id:'Maliki', hi:'मालिकी', ur:'مالکی' },
      mintaqa: { uz:"Shimoliy va G'arbiy Afrika · Andalusiya", uz_cyr:"Шимолий ва Ғарбий Африка · Андалусия", ru:"Северная и Западная Африка · Андалусия", en:"North & West Africa · Andalusia", tr:"Kuzey ve Batı Afrika · Endülüs", ar:"شمال وغرب أفريقيا · الأندلس", kk:"Солтүстік және Батыс Африка · Андалусия", tg:"Африқои Шимолӣ ва Ғарбӣ · Андалусия", ky:"Түндүк жана Батыш Африка · Андалусия", de:"Nord- und Westafrika · Andalusien", fr:"Afrique du Nord et de l'Ouest · Andalousie", id:"Afrika Utara & Barat · Andalusia", hi:"उत्तर और पश्चिम अफ्रीका · अंदलुसिया", ur:"شمالی و مغربی افریقہ · اندلس" },
    },
    {
      k: 'shafii',
      ar: 'شافعي',
      name: { uz:'Shofeiy', uz_cyr:'Шофеий', ru:'Шафии', en:"Shafi'i", tr:'Şâfiî', ar:'الشافعي', kk:'Шафии', tg:'Шофеӣ', ky:'Шафии', de:"Schafi'i", fr:"Châfiite", id:"Syafi'i", hi:'शाफ़ई', ur:'شافعی' },
      mintaqa: { uz:"Janubi-Sharqiy Osiyo · Misr · Sharqiy Afrika", uz_cyr:"Жанубий-Шарқий Осиё · Миср · Шарқий Африка", ru:"Юго-Восточная Азия · Египет · Восточная Африка", en:"Southeast Asia · Egypt · East Africa", tr:"Güneydoğu Asya · Mısır · Doğu Afrika", ar:"جنوب شرق آسيا · مصر · شرق أفريقيا", kk:"Оңтүстік-Шығыс Азия · Египет · Шығыс Африка", tg:"Осиёи Ҷанубу Шарқӣ · Миср · Африқои Шарқӣ", ky:"Түштүк-Чыгыш Азия · Египет · Чыгыш Африка", de:"Südostasien · Ägypten · Ostafrika", fr:"Asie du Sud-Est · Égypte · Afrique de l'Est", id:"Asia Tenggara · Mesir · Afrika Timur", hi:"दक्षिण-पूर्व एशिया · मिस्र · पूर्व अफ्रीका", ur:"جنوب مشرقی ایشیا · مصر · مشرقی افریقہ" },
    },
    {
      k: 'hanbali',
      ar: 'حنبلي',
      name: { uz:'Hanbaliy', uz_cyr:'Ҳанбалий', ru:'Ханбали', en:'Hanbali', tr:'Hanbelî', ar:'الحنبلي', kk:'Ханбали', tg:'Ҳанбалӣ', ky:'Ханбали', de:'Hanbali', fr:'Hanbalite', id:'Hanbali', hi:'हम्बली', ur:'حنبلی' },
      mintaqa: { uz:"Saudiya Arabistoni · Fors ko'rfazi", uz_cyr:"Саудия Арабистони · Форс кўрфази", ru:"Саудовская Аравия · Персидский залив", en:"Saudi Arabia · Persian Gulf", tr:"Suudi Arabistan · Körfez ülkeleri", ar:"المملكة العربية السعودية · الخليج الفارسي", kk:"Сауд Арабиясы · Парсы шығанағы", tg:"Арабистони Саудӣ · Халиҷи Форс", ky:"Сауд Аравиясы · Перс булуңу", de:"Saudi-Arabien · Persischer Golf", fr:"Arabie Saoudite · Golfe Persique", id:"Arab Saudi · Teluk Persia", hi:"सउदी अरब · फ़ारस की खाड़ी", ur:"سعودی عرب · خلیج فارس" },
    },
  ];

  let _selected = 'hanafi';

  function _mzStr(key, lang) {
    const n = MZ_STRINGS[key];
    return n ? (n[lang] || n.en || '') : '';
  }
  function _name(m, lang)    { return m.name[lang]    || m.name.en    || ''; }
  function _mintaqa(m, lang) { return m.mintaqa[lang] || m.mintaqa.en || ''; }

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
            <div class="mz-title">${_mzStr('title', lang)}</div>
            <div class="mz-subtitle">${_mzStr('subtitle', lang)}</div>
            <div class="mz-divider"></div>
          </div>
        </div>

        <div class="mz-body" id="mz-body">
          ${MAZHABLAR.map(m => _cardHTML(m, lang)).join('')}
        </div>

        <div class="mz-footer">
          <button class="mz-btn" id="mz-btn">
            <span class="mz-btn-lbl" id="mz-btn-lbl">${_name(sel, lang)}</span>
            <div class="mz-btn-sep"></div>
            <span class="mz-btn-arr">→</span>
          </button>
        </div>

      </div>`;
  }

  function _cardHTML(m, lang) {
    lang = lang || window.App?.state?.lang || 'uz';
    const a = m.k === _selected;
    return `
      <div class="mz-card${a ? ' mz-card--on' : ''}" data-k="${m.k}">
        <div class="mz-ar-circle${a ? ' mz-ar-circle--on' : ''}">
          <span class="mz-ar">${m.ar}</span>
        </div>
        <div class="mz-info">
          <div class="mz-name-row">
            <span class="mz-name${a ? ' mz-name--on' : ''}">${_name(m, lang)}</span>
            ${a ? '<div class="mz-dot"></div>' : ''}
          </div>
          <div class="mz-mintaqa">${_mintaqa(m, lang)}</div>
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
    const lang = window.App?.state?.lang || 'uz';

    const body = document.getElementById('mz-body');
    if (body) body.innerHTML = MAZHABLAR.map(m => _cardHTML(m, lang)).join('');

    const lbl  = document.getElementById('mz-btn-lbl');
    const meta = MAZHABLAR.find(m => m.k === k);
    if (lbl && meta) lbl.textContent = _name(meta, lang);

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
