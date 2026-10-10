const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const quran=fs.readFileSync('webapp/js/screens/quran.js','utf8');
const quotes=fs.readFileSync('webapp/js/verified-content.js','utf8');

test('Uzbek Latin uses script transliteration of the existing Quran translation, not another edition',()=>{
 const ctx={console};vm.createContext(ctx);
 vm.runInContext(quran,ctx);
 const transform=vm.runInContext('QuranScreen.cyrToLat',ctx);
 assert.equal(transform('У ҳаводан нутқ қилмас.'),'U havodan nutq qilmas.');
 assert.equal(transform('Аллоҳ–ундан бошқа ибодатга сазовор илоҳ йўқ зотдир.'),"Alloh–undan boshqa ibodatga sazovor iloh yo'q zotdir.");
 assert.equal(transform('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ'),'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ');
 assert.equal(transform('Uzbek Latin'), 'Uzbek Latin');
});

test('Only Uzbek Latin headings transform, Uzbek Cyrillic and other languages preserve provider text',()=>{
 assert.match(quotes,/lang === 'uz' && typeof QuranScreen !== 'undefined'/);
 assert.match(quotes,/QuranScreen\.cyrToLat\(text\)/);
 assert.match(quotes,/lang === 'uz_cyr' \? 'uz' : lang/);
 assert.match(quotes,/copy\.textContent = compactHeaderVerse\(shown, providerLang\)/);
 assert.match(quotes,/source\.textContent =.*meta\.translator/);
});
