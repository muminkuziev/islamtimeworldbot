from fastapi.testclient import TestClient
from server import app

client=TestClient(app)

def test_chechen_corpus_integrity_and_compatibility():
    rows=[]; page=1
    while True:
        r=client.get('/api/chechen-hadiths',params={'page':page,'limit':50})
        assert r.status_code==200
        d=r.json()
        assert d['language']=='ce'
        assert d['verified'] is True
        assert d['total']==93
        for h in d['hadiths']:
            assert h['language']=='ce'
            assert h['source']=='islamhouse.com'
            assert h['source_url'].startswith('https://islamhouse.com/ce/')
            assert h['text'].strip()
            assert h['grade']=='sahih'
            assert h['attribution'] in {'Sahih al-Bukhari','Sahih Muslim','Sahih al-Bukhari + Sahih Muslim'}
            rows.append(h)
        if page>=d['pages']: break
        page+=1
    assert len(rows)==93
    assert len({h['id'] for h in rows})==93
    assert len({h['text'] for h in rows})==93
    compat=client.get('/api/hadith',params={'lang':'ce','limit':20}).json()
    assert compat['language']=='ce'
    assert compat['total']==93

def test_chechen_and_avar_daily_use_exact_local_provider():
    ce=client.get('/api/hadeethenc/daily',params={'lang':'ce'})
    assert ce.status_code==200
    c=ce.json()
    assert c['language']=='ce' and c['verified'] is True
    assert c['hadith']['language']=='ce'
    assert c['hadith']['source']=='islamhouse.com'

    av=client.get('/api/hadeethenc/daily',params={'lang':'av'})
    assert av.status_code==200
    a=av.json()
    assert a['language']=='av' and a['verified'] is True
    assert a['hadith']['language']=='av'
    assert a['hadith']['source']=='as-salam.press'
