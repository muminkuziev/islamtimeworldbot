/* ================================================================
   IslamTime World — Quran Provider Interface (Architecture)

   All Quran data sources implement this interface.
   Screens use window.QuranProvider, never a concrete provider directly.
   ================================================================ */

/* ── Provider Interface (documentation) ─────────────────────
  {
    id:          string          // 'alquran' | 'tanzil' | 'quranenc'
    name:        string          // Display name
    offline:     boolean         // Can work without internet?
    languages:   string[]        // Translation language codes supported

    listSurahs(): Promise<Surah[]>
    // → [{ id, name_ar, name_en, name_transliteration, ayah_count,
    //       revelation: 'Meccan'|'Medinan', juz_start }]

    getAyahs(surahId, options): Promise<Ayah[]>
    // options: { lang, translation, withArabic, withTranslit }
    // → [{ id, surah_id, ayah, arabic, translation, transliteration, audio_url }]

    getAudio(surahId, ayahId, reciterId): string
    // → CDN URL for MP3

    getSurahInfo(surahId): Promise<SurahInfo>
    // → full metadata

    search(query, lang): Promise<SearchResult[]>
    // → [{ surah_id, ayah_id, text, context }]
  }
────────────────────────────────────────────────────────────── */

/* ── Registered Providers ──────────────────────────────────── */
const _PROVIDERS = {};

function registerQuranProvider(provider) {
  if (!provider.id) throw new Error('Provider must have an id');
  _PROVIDERS[provider.id] = provider;
}

/* ── Al-Quran Cloud Provider (currently active) ────────────── */
registerQuranProvider({
  id:        'alquran',
  name:      'Al-Quran Cloud',
  offline:   false,
  languages: ['en', 'ru', 'uz', 'tr', 'ar', 'fr', 'de', 'id', 'ur'],

  listSurahs: async function () {
    const r = await fetch('https://api.alquran.cloud/v1/surah');
    const d = await r.json();
    return (d.data || []).map(s => ({
      id:                   s.number,
      name_ar:              s.name,
      name_en:              s.englishName,
      name_transliteration: s.englishNameTranslation,
      ayah_count:           s.numberOfAyahs,
      revelation:           s.revelationType,
      juz_start:            null,
    }));
  },

  getAyahs: async function (surahId, opts = {}) {
    const lang    = opts.lang || 'en';
    const edition = _editionFor(lang);
    const urls = [
      fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`).then(r => r.json()),
      edition ? fetch(`https://api.alquran.cloud/v1/surah/${surahId}/${edition}`).then(r => r.json()) : null,
    ];
    const [arabicRes, transRes] = await Promise.all(urls);
    const arabic   = arabicRes?.data?.ayahs || [];
    const transl   = transRes?.data?.ayahs  || [];
    return arabic.map((a, i) => ({
      id:              a.number,
      surah_id:        surahId,
      ayah:            a.numberInSurah,
      arabic:          a.text,
      translation:     transl[i]?.text || '',
      transliteration: '',
      audio_url:       _audioUrl(surahId, a.numberInSurah, opts.reciter || 'mishary'),
    }));
  },

  getAudio: function (surahId, ayahId, reciterId) {
    return _audioUrl(surahId, ayahId, reciterId);
  },
});

/* ── Edition mapping by language ───────────────────────────── */
function _editionFor(lang) {
  const MAP = {
    en: 'en.asad',       ru: 'ru.kuliev',
    uz: 'uz.sodik',      tr: 'tr.diyanet',
    fr: 'fr.hamidullah', de: 'de.bubenheim',
    id: 'id.indonesian', ur: 'ur.jalandhry',
    kk: 'ru.kuliev',     tg: 'ru.kuliev',
    ky: 'ru.kuliev',
  };
  return MAP[lang] || MAP['en'];
}

/* ── Audio CDN ──────────────────────────────────────────────── */
function _audioUrl(surahId, ayahId, reciterId) {
  const RECITERS = {
    mishary:   'https://cdn.islamic.network/quran/audio/128/ar.alafasy',
    sudais:    'https://cdn.islamic.network/quran/audio/128/ar.abdurrahmaansudais',
    minshawi:  'https://cdn.islamic.network/quran/audio/128/ar.minshawi',
  };
  const base = RECITERS[reciterId] || RECITERS.mishary;
  const ayahGlobal = _toGlobalAyah(surahId, ayahId);
  return `${base}/${ayahGlobal}.mp3`;
}

function _toGlobalAyah(surahId, ayahId) {
  // Simplified: for proper global numbering use lookup table
  // Full implementation: sum all ayahs before this surah
  return (surahId * 1000) + ayahId; // placeholder
}

/* ── Active Provider ────────────────────────────────────────── */
window.QuranProvider = _PROVIDERS['alquran'];

/* ── Switch provider at runtime (for future use) ────────────── */
window.setQuranProvider = function (id) {
  if (!_PROVIDERS[id]) throw new Error(`Unknown provider: ${id}`);
  window.QuranProvider = _PROVIDERS[id];
};
