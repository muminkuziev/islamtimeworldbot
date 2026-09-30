const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const code = fs.readFileSync('webapp/js/native/hadith-provider.js', 'utf8');

function makeContext(payloadFor) {
  const context = {
    URLSearchParams,
    fetch: async (url) => ({
      ok: true,
      json: async () => payloadFor(url),
    }),
    window: {},
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

test('Avar provider uses only verified As-Salam Avar content', async () => {
  const context = makeContext((url) => {
    if (url.startsWith('/api/avar-hadiths/books')) {
      return {
        language: 'av', verified: true,
        books: [{name:'Sahih Muslim', count:80}],
      };
    }
    return {
      language: 'av', verified: true, page:1, pages:17, total:194,
      hadiths: [{
        id:'av-sahih-001', language:'av', text:'fixture',
        grade:'sahih', source:'as-salam.press',
        source_url:'https://as-salam.press/ava/1/2/',
      }],
    };
  });
  const provider = context.window.HadithRegistry.get('avar_official');
  assert.equal(provider.count, 194);

  const page = await provider.list(1, 12, 'av', {});
  assert.equal(page.total, 194);
  assert.equal(page.hadiths[0].source, 'as-salam.press');

  const books = await provider.books('av');
  assert.equal(books.language, 'av');
  assert.equal(books.books[0].count, 80);
});

test('Avar provider rejects provenance mismatch', async () => {
  const context = makeContext(() => ({
    language:'av', verified:true,
    hadiths:[{
      id:'bad', language:'av', text:'fixture',
      source:'hadeethenc.com', source_url:'https://example.test/',
    }],
  }));
  await assert.rejects(
    () => context.window.HadithRegistry.get('avar_official').list(1, 12, 'av', {}),
    /provenance mismatch/
  );
});
