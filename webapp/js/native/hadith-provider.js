/* ================================================================
   IslamTime World — Hadith Provider Interface (Architecture)

   All Hadith collections implement this interface.
   Screens use window.HadithRegistry to get a provider by key.
   ================================================================ */

/* ── Provider Interface (documentation) ─────────────────────
  {
    key:       string     // 'bukhari' | 'muslim' | 'tirmidhi' | 'abudawud'
    nameI18n:  object     // { uz, ru, en, ar, ... }
    arabicName:string     // الكتاب الأصلي
    count:     number     // total hadith count

    getHadith(number):       Promise<Hadith>
    listByPage(page, limit): Promise<Hadith[]>
    listByChapter(chapter):  Promise<Hadith[]>
    listChapters():          Promise<Chapter[]>
    search(query, lang):     Promise<Hadith[]>
  }

  Hadith: {
    id, number, book, chapter, narrator,
    arabic, text_uz, text_ru, text_en, text_ar,
    grade: 'sahih'|'hasan'|'daif'|null
  }
  Chapter: { id, name_ar, name_uz, name_ru, name_en, hadith_count }
────────────────────────────────────────────────────────────── */

const HadithRegistry = (function () {
  'use strict';

  const _providers = {};

  function register(provider) {
    if (!provider.key) throw new Error('Provider must have a key');
    _providers[provider.key] = provider;
  }

  function get(key) {
    return _providers[key] || null;
  }

  function list() {
    return Object.values(_providers);
  }

  /* ── Server-backed provider factory ─────────────────────────
     All collections backed by islamtimeworld.com /api/hadith/* */
  function _serverProvider(key, nameI18n, arabicName, count) {
    return {
      key, nameI18n, arabicName, count,

      getHadith: async function (number) {
        const r = await fetch(`/api/hadith?collection=${key}&number=${number}`);
        return (await r.json()).hadith || null;
      },

      listByPage: async function (page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const r = await fetch(`/api/hadith?collection=${key}&offset=${offset}&limit=${limit}`);
        return (await r.json()).hadiths || [];
      },

      listByChapter: async function (chapterId) {
        const r = await fetch(`/api/hadith?collection=${key}&chapter=${chapterId}`);
        return (await r.json()).hadiths || [];
      },

      listChapters: async function () {
        const lang = window.App?.state?.lang || 'uz';
        const r = await fetch(`/api/hadith/categories?collection=${key}&lang=${lang}`);
        return (await r.json()).categories || [];
      },

      search: async function (query, lang) {
        const r = await fetch(
          `/api/hadith/search?q=${encodeURIComponent(query)}&collection=${key}&lang=${lang || 'uz'}`
        );
        return (await r.json()).hadiths || [];
      },
    };
  }

  /* ── Register all 4 major collections ──────────────────────── */
  register(_serverProvider(
    'bukhari',
    { uz:"Sahih al-Buxoriy", uz_cyr:"Саҳиҳ ал-Бухорий",
      ru:"Sahih al-Bukhari",  en:"Sahih al-Bukhari", ar:"صحيح البخاري",
      tr:"Sahih Buhari",      kk:"Сахих аль-Бухари", tg:"Саҳеҳи Бухорӣ",
      ky:"Сахих аль-Бухари",  de:"Sahih al-Bukhari",  fr:"Sahih al-Bukhari",
      id:"Sahih al-Bukhari",  hi:"सहीह बुखारी",        ur:"صحیح البخاری" },
    'صحيح البخاري', 7563
  ));

  register(_serverProvider(
    'muslim',
    { uz:"Sahih Muslim",     uz_cyr:"Саҳиҳ Муслим",
      ru:"Sahih Muslim",     en:"Sahih Muslim",     ar:"صحيح مسلم",
      tr:"Sahih Müslim",     kk:"Сахих Муслим",     tg:"Саҳеҳи Муслим",
      ky:"Сахих Муслим",     de:"Sahih Muslim",     fr:"Sahih Muslim",
      id:"Sahih Muslim",     hi:"सहीह मुस्लिम",      ur:"صحیح مسلم" },
    'صحيح مسلم', 3032
  ));

  register(_serverProvider(
    'tirmidhi',
    { uz:"Jome' at-Termiziy",  uz_cyr:"Жомеъ ат-Термизий",
      ru:"Jami at-Tirmidhi",   en:"Jami at-Tirmidhi",   ar:"جامع الترمذي",
      tr:"Tirmizi",             kk:"Жами ат-Тирмизи",    tg:"Ҷомеи Термизӣ",
      ky:"Жами ат-Тирмизи",    de:"Jami at-Tirmidhi",   fr:"Jami at-Tirmidhi",
      id:"Jami at-Tirmidzi",   hi:"जामे तिर्मिज़ी",       ur:"جامع ترمذی" },
    'جامع الترمذي', 3956
  ));

  register(_serverProvider(
    'abudawud',
    { uz:"Abu Dovud",         uz_cyr:"Абу Довуд",
      ru:"Sunan Abu Dawud",   en:"Sunan Abu Dawud",   ar:"سنن أبي داود",
      tr:"Sünen Ebu Davud",   kk:"Сунан Абу Давуд",  tg:"Сунани Абу Довуд",
      ky:"Сунан Абу Дауд",   de:"Sunan Abu Dawud",   fr:"Sunan Abu Dawud",
      id:"Sunan Abu Dawud",   hi:"सुनन अबू दाऊद",     ur:"سنن ابو داؤد" },
    'سنن أبي داود', 5274
  ));

  return { register, get, list };
})();

window.HadithRegistry = HadithRegistry;