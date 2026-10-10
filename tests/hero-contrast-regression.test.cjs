const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const css=fs.readFileSync('webapp/css/hero-contrast-fixes.css','utf8');
const html=fs.readFileSync('webapp/index.html','utf8');
const hadith=fs.readFileSync('webapp/js/screens/hadith.js','utf8');
const names=fs.readFileSync('webapp/js/screens/names.js','utf8');

test('Hadith 53:3 remains the verified original, is visible on a dark contrasting panel',()=>{
 assert.match(hadith,/data-quran-verse="53:3"/);
 assert.match(css,/#screen-hadith \.hd-hdr \.section-quran-verse/);
 assert.match(css,/background:rgba\(3,33,29,\.86\)!important/);
 assert.match(css,/font-size:12px!important/);
 assert.match(css,/opacity:1!important/);
 assert.match(html,/css\/hero-contrast-fixes\.css\?v=/);
});
test('Names 20:8 stays source-backed and the background extends through its entire header',()=>{
 assert.match(names,/data-quran-verse="20:8"/);
 assert.match(css,/#screen-names \.nm-header::before/);
 assert.match(css,/height:100%!important/);
 assert.match(css,/#screen-names \.nm-header \.section-quran-verse/);
 assert.match(css,/background:rgba\(3,34,29,\.77\)!important/);
});
test('Photo words stay in responsive layout with readable reference and remain unclipped',()=>{
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/max-width:calc\(100% - 28px\)!important/);
 assert.match(css,/@media\(max-width:359px\)/);
 assert.match(css,/font-size:10px!important/);
});
