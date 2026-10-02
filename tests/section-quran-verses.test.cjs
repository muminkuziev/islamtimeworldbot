const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const expected={
  'dashboard.js':'94:5',
  'prayer.js':'108:2',
  'quran.js':'96:1',
  'qibla.js':'2:115',
  'hadith.js':'4:80',
  'duas.js':'21:83',
  'dhikr.js':'33:41',
  'names.js':'20:8',
  'calendar.js':'36:39',
  'qazo.js':'2:238',
  'shahodat.js':'47:19',
  'mosques.js':'72:18',
  'haramayn.js':'106:3',
};

test('every primary religious section uses the approved concise Quran reference',()=>{
  for(const [file,ref] of Object.entries(expected)){
    const code=fs.readFileSync('webapp/js/screens/'+file,'utf8');
    assert.match(code,new RegExp('data-quran-verse=["\\\']'+ref.replace(':','\\:')+'["\\\']'),file+' missing '+ref);
  }
});

test('legacy replaced section references are gone',()=>{
  const quran=fs.readFileSync('webapp/js/screens/quran.js','utf8');
  const mosques=fs.readFileSync('webapp/js/screens/mosques.js','utf8');
  assert.doesNotMatch(quran,/data-quran-verse=["']2:2["']/);
  assert.doesNotMatch(mosques,/data-quran-verse=["']9:18["']/);
});

test('section Quran verse styling is capped at two lines',()=>{
  const css=fs.readFileSync('webapp/css/reference-ui.css','utf8');
  assert.match(css,/\.section-quran-verse/);
  assert.match(css,/-webkit-line-clamp:\s*2/);
});

test('verified verse loader supports Chechen and Avar providers without cross-language fallback',()=>{
  const code=fs.readFileSync('webapp/js/verified-content.js','utf8');
  assert.match(code,/providerLang === 'ce' \|\| providerLang === 'av'/);
  assert.match(code,/QuranProvider\.getAyahs\(surah, \{ lang: providerLang \}\)/);
  assert.match(code,/providerLang === 'av' \? row\?\.arabic : \(row\?\.translation \|\| row\?\.arabic\)/);
});
