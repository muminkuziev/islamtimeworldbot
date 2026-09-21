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

/* ── Translation source registry ─────────────────────────────
   Every entry is a real, named, published translation hosted by
   Al-Quran Cloud (api.alquran.cloud) — never AI-generated. `edition`
   is the exact identifier AlQuran Cloud serves; `translator` and
   `verification` are shown in the reader's source-metadata panel. ── */
const _TRANSLATION_SOURCES = {
  ar: { edition: null,             translator: null,                                   verification: 'canonical_arabic' },
  en: { edition: 'en.asad',        translator: 'Muhammad Asad',                        verification: 'provider_published' },
  ru: { edition: 'ru.kuliev',      translator: 'Elmir Kuliev',                         verification: 'provider_published' },
  uz: { edition: 'uz.sodik',       translator: "Muhammad Sodik Muhammad Yusuf",         verification: 'provider_published' },
  tr: { edition: 'tr.diyanet',     translator: 'Diyanet İşleri Başkanlığı',             verification: 'provider_published' },
  fr: { edition: 'fr.hamidullah',  translator: 'Muhammad Hamidullah',                   verification: 'provider_published' },
  de: { edition: 'de.bubenheim',   translator: 'Bubenheim & Elyas',                     verification: 'provider_published' },
  id: { edition: 'id.indonesian',  translator: 'Kementerian Agama Republik Indonesia',  verification: 'provider_published' },
  ur: { edition: 'ur.jalandhry',   translator: 'Fateh Muhammad Jalandhry',              verification: 'provider_published' },
  hi: { edition: 'hi.hindi',       translator: 'Suhel Farooq Khan & Saifur Rahman Nadwi', verification: 'provider_published' },
  bn: { edition: 'bn.bengali',     translator: 'Muhiuddin Khan',                        verification: 'provider_published' },
  fa: { edition: 'fa.makarem',     translator: 'Naser Makarem Shirazi',                 verification: 'provider_published' },
  ms: { edition: 'ms.basmeih',     translator: 'Abdullah Muhammad Basmeih',             verification: 'provider_published' },
  // Legacy/back-compat UI languages without their own edition: fall back to Russian.
  kk: { edition: 'ru.kuliev',      translator: 'Elmir Kuliev',                          verification: 'provider_published', fallback: true },
  tg: { edition: 'ru.kuliev',      translator: 'Elmir Kuliev',                          verification: 'provider_published', fallback: true },
  ky: { edition: 'ru.kuliev',      translator: 'Elmir Kuliev',                          verification: 'provider_published', fallback: true },
};

/* ── Al-Quran Cloud Provider (currently active) ────────────── */
registerQuranProvider({
  id:        'alquran',
  name:      'Al-Quran Cloud',
  offline:   false,
  languages: Object.keys(_TRANSLATION_SOURCES).filter(l => l !== 'ar'),

  listSurahs: async function () {
    const r = await fetch('https://api.alquran.cloud/v1/surah');
    const d = await r.json();
    _cacheSurahOffsets(d.data || []);
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
    if (!_surahOffsetsReady()) await this.listSurahs();
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
      source:          _sourceMetaFor(lang),
    }));
  },

  getAudio: function (surahId, ayahId, reciterId) {
    return _audioUrl(surahId, ayahId, reciterId);
  },

  getSourceMeta: function (lang) {
    return _sourceMetaFor(lang);
  },
});

/* ── Edition mapping by language ───────────────────────────── */
function _editionFor(lang) {
  return (_TRANSLATION_SOURCES[lang] || _TRANSLATION_SOURCES.en).edition;
}

/* ── Source/provenance metadata for the reader's "source" panel ── */
function _sourceMetaFor(lang) {
  const s = _TRANSLATION_SOURCES[lang] || _TRANSLATION_SOURCES.en;
  return {
    language:      lang,
    provider:      'Al-Quran Cloud (api.alquran.cloud)',
    edition:       s.edition,
    translator:    s.translator,
    verification:  s.verification,
    is_fallback:   !!s.fallback,
  };
}

/* ── Reciters (Qorilar) ─────────────────────────────────────
   Two separate CDN namespaces exist on cdn.islamic.network and NOT every
   reciter is hosted on both — an unverified id here means silent playback
   failure (HTTP 403) for the user. Every id below was checked live against
   the actual endpoint it is used with before being added; do not add a new
   one without checking `curl -o /dev/null -w '%{http_code}' <url>` first. ── */
const PER_AYAH_RECITERS = [
  // verified 200 on https://cdn.islamic.network/quran/audio/128/<id>/<globalAyah>.mp3
  { id: 'mishary',  edition: 'ar.alafasy',            name: 'Mishary Rashid al-Afasy' },
  { id: 'husary',   edition: 'ar.husary',             name: 'Mahmoud Khalil Al-Husary' },
  { id: 'minshawi', edition: 'ar.minshawi',           name: 'Mohamed Siddiq El-Minshawi' },
  { id: 'hudhaify', edition: 'ar.hudhaify',           name: 'Ali Al-Hudhaify' },
  { id: 'muaiqly',  edition: 'ar.mahermuaiqly',       name: 'Maher Al Muaiqly' },
];

const FULL_SURAH_RECITERS = [
  // verified 200 on https://cdn.islamic.network/quran/audio-surah/128/<id>/<surahNum>.mp3
  // (a much smaller set than PER_AYAH_RECITERS — most reciters on that CDN are
  // only published per-ayah, not as pre-concatenated full-surah files)
  { id: 'mishary', edition: 'ar.alafasy',       name: 'Mishary Rashid al-Afasy', flag: '🇰🇼' },
  { id: 'basfar',  edition: 'ar.abdullahbasfar', name: 'Abdullah Basfar',        flag: '🇸🇦' },
];

function getFullSurahReciters() { return FULL_SURAH_RECITERS; }
function getFullSurahAudioUrl(reciterId, surahNum) {
  const r = FULL_SURAH_RECITERS.find(x => x.id === reciterId) || FULL_SURAH_RECITERS[0];
  return `https://cdn.islamic.network/quran/audio-surah/128/${r.edition}/${surahNum}.mp3`;
}
window.QuranReciters = { getFullSurahReciters, getFullSurahAudioUrl };

function _audioUrl(surahId, ayahId, reciterId) {
  const r = PER_AYAH_RECITERS.find(x => x.id === reciterId) || PER_AYAH_RECITERS[0];
  const base = `https://cdn.islamic.network/quran/audio/128/${r.edition}`;
  const ayahGlobal = _toGlobalAyah(surahId, ayahId);
  return `${base}/${ayahGlobal}.mp3`;
}

/* ── Global ayah numbering (1..6236), needed for the audio CDN ──
   cdn.islamic.network indexes ayah audio files by their position in
   the whole Quran, not by surah*1000+ayah. We cache the real
   per-surah ayah counts (fetched once from the surah list) and use
   their cumulative sum to compute the correct global index. ── */
let _surahAyahCounts = null; // [null, count_of_surah_1, count_of_surah_2, ...]

function _cacheSurahOffsets(surahs) {
  if (_surahAyahCounts) return;
  _surahAyahCounts = [null];
  for (const s of surahs) _surahAyahCounts[s.number] = s.numberOfAyahs;
}

function _surahOffsetsReady() {
  return !!_surahAyahCounts;
}

function _toGlobalAyah(surahId, ayahId) {
  if (!_surahAyahCounts) {
    // Offsets not loaded yet (getAudio() called standalone, without a prior
    // listSurahs()/getAyahs() call) — best effort rather than a silently
    // wrong audio URL: fetch is unavailable synchronously here, so fall back
    // to treating surahId/ayahId as already-global (correct only for Surah 1).
    console.warn('[QuranProvider] surah offsets not cached yet; audio URL may be wrong for surah > 1');
    return ayahId;
  }
  let offset = 0;
  for (let s = 1; s < surahId; s++) offset += _surahAyahCounts[s] || 0;
  return offset + ayahId;
}

/* ── Active Provider ────────────────────────────────────────── */
window.QuranProvider = _PROVIDERS['alquran'];

/* ── Switch provider at runtime (for future use) ────────────── */
window.setQuranProvider = function (id) {
  if (!_PROVIDERS[id]) throw new Error(`Unknown provider: ${id}`);
  window.QuranProvider = _PROVIDERS[id];
};
