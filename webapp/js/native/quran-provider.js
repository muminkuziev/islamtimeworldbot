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
  id: { edition: 'id.indonesian',  translator: null, verification: 'provider_published', translator_verification: 'unconfirmed_project_attribution', project_attribution: 'Kementerian Agama Republik Indonesia' },
  ur: { edition: 'ur.jalandhry',   translator: 'Fateh Muhammad Jalandhry',              verification: 'provider_published' },
  hi: { edition: 'hi.hindi',       translator: 'Suhel Farooq Khan & Saifur Rahman Nadwi', verification: 'provider_published' },
  bn: { edition: 'bn.bengali',     translator: 'Muhiuddin Khan',                        verification: 'provider_published' },
  fa: { edition: 'fa.makarem',     translator: 'Naser Makarem Shirazi',                 verification: 'provider_published' },
  ms: { edition: 'ms.basmeih',     translator: 'Abdullah Muhammad Basmeih',             verification: 'provider_published' },
  ce: { edition: null, resource_id: 106, provider: 'Quran.com (api.quran.com)', translator: 'Magomed Magomedov', verification: 'provider_published', translation_available: true, source_url: 'https://quran.com/' },
  av: { edition: null, provider: 'canonical Arabic (Uthmani)', translator: null, verification: 'arabic_only', translation_available: false, source_url: null },
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
    const d = await _fetchQuranData('surah');
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
    if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) throw new Error('Invalid surah');
    const lang    = opts.lang === 'uz_cyr' ? 'uz' : (opts.lang || 'en');
    if (!_surahOffsetsReady()) await this.listSurahs();
    if (lang === 'ce') return _fetchQuranComChechen(surahId, opts);
    const edition = _editionFor(lang);
    const urls = [
      _fetchQuranData(`surah/${surahId}/quran-uthmani`),
      edition ? _fetchQuranData(`surah/${surahId}/${edition}`) : null,
    ];
    const [arabicRes, transRes] = await Promise.all(urls);
    const arabic = _validateSurah(arabicRes, surahId, 'quran-uthmani');
    const transl = edition ? _validateSurah(transRes, surahId, edition) : [];
    if (edition && transl.length !== arabic.length) throw new Error('Incomplete Quran translation');
    const translated = new Map(transl.map(ayah => [ayah.numberInSurah, ayah]));
    if (edition && arabic.some(ayah => translated.get(ayah.numberInSurah)?.number !== ayah.number)) {
      throw new Error('Quran translation verse mismatch');
    }
    return arabic.map(a => ({
      id:              a.number,
      surah_id:        surahId,
      ayah:            a.numberInSurah,
      arabic:          a.text,
      translation:     translated.get(a.numberInSurah)?.text || '',
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
  const source = _TRANSLATION_SOURCES[lang === 'uz_cyr' ? 'uz' : lang];
  if (!source) throw new Error('Unsupported Quran translation language');
  return source.edition;
}

async function _fetchQuranData(path) {
  const response = await fetch(`https://api.alquran.cloud/v1/${path}`);
  if (!response.ok) throw new Error('Quran provider unavailable');
  const result = await response.json();
  if (result.code !== 200 || !result.data) throw new Error('Invalid Quran provider response');
  return result;
}

function _cleanQuranComTranslation(value) {
  return String(value || '')
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function _fetchQuranComChechen(surahId, opts = {}) {
  const count = _surahAyahCounts[surahId];
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=chechen&translations=106&fields=text_uthmani&per_page=${count}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chechen Quran provider unavailable');
  const payload = await response.json();
  const verses = payload?.verses;
  if (!Array.isArray(verses) || verses.length !== count) throw new Error('Incomplete Chechen Quran translation');
  if (verses.some((verse, index) =>
    verse?.verse_number !== index + 1 ||
    verse?.verse_key !== `${surahId}:${index + 1}` ||
    typeof verse?.text_uthmani !== 'string' || !verse.text_uthmani.trim() ||
    !Array.isArray(verse?.translations) || verse.translations[0]?.resource_id !== 106 ||
    !_cleanQuranComTranslation(verse.translations[0]?.text)
  )) {
    throw new Error('Chechen Quran source or verse mismatch');
  }
  return verses.map(verse => ({
    id:              verse.id,
    surah_id:        surahId,
    ayah:            verse.verse_number,
    arabic:          verse.text_uthmani,
    translation:     _cleanQuranComTranslation(verse.translations[0].text),
    transliteration: '',
    audio_url:       _audioUrl(surahId, verse.verse_number, opts.reciter || 'mishary'),
    source:          _sourceMetaFor('ce'),
  }));
}

function _validateSurah(result, surahId, edition) {
  const data = result?.data;
  if (data?.number !== surahId || data?.edition?.identifier !== edition ||
      !Array.isArray(data.ayahs) || data.ayahs.length !== _surahAyahCounts[surahId]) {
    throw new Error('Quran source or surah mismatch');
  }
  if (data.ayahs.some((ayah, index) => ayah.numberInSurah !== index + 1 ||
      !Number.isInteger(ayah.number) || typeof ayah.text !== 'string' || !ayah.text.trim())) {
    throw new Error('Incomplete Quran verses');
  }
  return data.ayahs;
}

/* ── Source/provenance metadata for the reader's "source" panel ── */
function _sourceMetaFor(lang) {
  const s = _TRANSLATION_SOURCES[lang === 'uz_cyr' ? 'uz' : lang];
  if (!s) return { language: lang, verification: 'unavailable', edition: null, translator: null, is_fallback: false };
  return {
    language:      lang,
    provider:      s.provider || 'Al-Quran Cloud (api.alquran.cloud)',
    edition:       s.edition,
    resource_id:   s.resource_id || null,
    translator:    s.translator,
    translator_verification: s.translator_verification || 'provider_metadata',
    project_attribution: s.project_attribution || null,
    verification:  s.verification,
    translation_available: s.translation_available !== false,
    is_fallback:   !!s.fallback,
    source_url:    s.source_url || null,
    terms_url:     s.provider ? null : 'https://alquran.cloud/terms-and-conditions',
    legal_clearance: false,
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
  if (surahs.length !== 114 || surahs.some((surah, index) => surah.number !== index + 1 ||
      !Number.isInteger(surah.numberOfAyahs) || surah.numberOfAyahs < 1) ||
      surahs.reduce((total, surah) => total + surah.numberOfAyahs, 0) !== 6236) {
    throw new Error('Incomplete Quran surah metadata');
  }
  _surahAyahCounts = [null];
  for (const s of surahs) _surahAyahCounts[s.number] = s.numberOfAyahs;
}

function _surahOffsetsReady() {
  return !!_surahAyahCounts;
}

function _toGlobalAyah(surahId, ayahId) {
  if (!_surahAyahCounts) {
    throw new Error('Quran audio requires verified surah metadata');
  }
  if (!Number.isInteger(surahId) || !Number.isInteger(ayahId) || !Number.isInteger(_surahAyahCounts[surahId]) ||
      ayahId < 1 || ayahId > _surahAyahCounts[surahId]) throw new Error('Invalid Quran audio verse');
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
