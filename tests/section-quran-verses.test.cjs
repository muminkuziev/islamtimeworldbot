const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const expected={
  'prayer.js':'108:2',
  'quran.js':'96:1',
  'qibla.js':'106:3',
  'hadith.js':'53:3',
  'duas.js':'7:55',
  'dhikr.js':'33:41',
  'names.js':'20:8',
  'calendar.js':'55:5',
  'qazo.js':'2:238',
  'shahodat.js':'112:1',
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
  const files={
    quran:fs.readFileSync('webapp/js/screens/quran.js','utf8'),
    mosques:fs.readFileSync('webapp/js/screens/mosques.js','utf8'),
    hadith:fs.readFileSync('webapp/js/screens/hadith.js','utf8'),
    duas:fs.readFileSync('webapp/js/screens/duas.js','utf8'),
    calendar:fs.readFileSync('webapp/js/screens/calendar.js','utf8'),
    shahodat:fs.readFileSync('webapp/js/screens/shahodat.js','utf8'),
  };
  assert.doesNotMatch(files.quran,/data-quran-verse=["']2:2["']/);
  assert.doesNotMatch(files.mosques,/data-quran-verse=["']9:18["']/);
  assert.doesNotMatch(files.hadith,/data-quran-verse=["']4:80["']/);
  assert.doesNotMatch(files.duas,/data-quran-verse=["']21:83["']/);
  assert.doesNotMatch(files.calendar,/data-quran-verse=["']36:39["']/);
  assert.doesNotMatch(files.shahodat,/data-quran-verse=["']47:19["']/);
});

test('section verse loader strips long provider commentary from headers',()=>{
  const code=fs.readFileSync('webapp/js/verified-content.js','utf8');
  assert.match(code,/function compactHeaderVerse/);
  assert.match(code,/copy\.textContent = compactHeaderVerse\(text, providerLang\)/);
});

test('section Quran verse styling shows the complete ayah',()=>{
  const css=fs.readFileSync('webapp/css/reference-ui.css','utf8');
  assert.match(css,/\.section-quran-verse \.verified-verse-copy/);
  assert.match(css,/-webkit-line-clamp:\s*unset/);
  assert.match(css,/max-height:\s*none/);
});

test('verified verse loader supports Chechen and Avar providers without cross-language fallback',()=>{
  const code=fs.readFileSync('webapp/js/verified-content.js','utf8');
  assert.match(code,/providerLang === 'ce' \|\| providerLang === 'av'/);
  assert.match(code,/QuranProvider\.getAyahs\(surah, \{ lang: providerLang \}\)/);
  assert.match(code,/providerLang === 'av' \? row\?\.arabic : \(row\?\.translation \|\| row\?\.arabic\)/);
});
