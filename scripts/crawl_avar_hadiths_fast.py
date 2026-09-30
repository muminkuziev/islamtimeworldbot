import requests,re,time,json,html,threading
from html.parser import HTMLParser
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE='https://as-salam.press'
START=BASE+'/ava/'
UA='Mozilla/5.0 IslamTimeWorld source audit'
_tls=threading.local()

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.text=[]; self.links=[]; self.h1=[]
        self._inh1=False
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='a' and d.get('href'): self.links.append(d['href'])
        if tag=='h1': self._inh1=True
        if tag in ('p','br','div','h1','h2','h3','li','blockquote'): self.text.append('\n')
    def handle_data(self,data):
        self.text.append(data)
        if self._inh1: self.h1.append(data)
    def handle_endtag(self,tag):
        if tag=='h1': self._inh1=False
        if tag in ('p','div','h1','h2','h3','li','blockquote'): self.text.append('\n')

def sess():
    if not hasattr(_tls,'s'):
        _tls.s=requests.Session(); _tls.s.headers['User-Agent']=UA
    return _tls.s

def fetch(url):
    r=sess().get(url,timeout=18)
    r.raise_for_status()
    return r.text

def parse(t):
    p=P(); p.feed(t); return p

root=parse(fetch(START))
paper_links=sorted({urljoin(BASE,h) for h in root.links if re.fullmatch(r'/ava/paper/\d+/',h)})
print('paper_pages',len(paper_links),flush=True)

def paper_articles(u):
    try:
        p=parse(fetch(u))
        return [urljoin(BASE,h) for h in p.links if re.fullmatch(r'/ava/\d+/\d+/',h)]
    except Exception:
        return []

article_links=set()
with ThreadPoolExecutor(max_workers=8) as ex:
    futs=[ex.submit(paper_articles,u) for u in paper_links]
    for n,f in enumerate(as_completed(futs),1):
        article_links.update(f.result())
        if n%25==0: print('papers_done',n,'articles',len(article_links),flush=True)
print('article_links',len(article_links),flush=True)
open('data/avar_article_links.json','w',encoding='utf-8').write(json.dumps(sorted(article_links),ensure_ascii=False,indent=2))

SOURCE_MARKERS=[
    'Бухарияс','Бухари','Муслимица','Муслим',
    'Бухариялда','Муслималъ','Бухарил','Муслимил',
    'ат-Тирмизи','Тирмизияс','Тирмизи',
    'Абу Давуд','Абу Давудас','Насаи','Ибн Маж'
]
HADITH_MARKERS=['хIадис','ХIадис','хадис','Хадис']

def scan_article(u):
    try:
        t=fetch(u); p=parse(t)
        txt=html.unescape(' '.join(''.join(p.text).split()))
        if not any(h in txt for h in HADITH_MARKERS): return []
        if not any(m in txt for m in SOURCE_MARKERS): return []
        title=html.unescape(' '.join(''.join(p.h1).split()))
        out=[]
        positions=[]
        for hm in HADITH_MARKERS:
            positions.extend(m.start() for m in re.finditer(re.escape(hm),txt))
        for pos in sorted(set(positions)):
            a=max(0,pos-900); b=min(len(txt),pos+1800)
            sn=txt[a:b]
            if any(m in sn for m in SOURCE_MARKERS):
                out.append({'url':u,'title':title,'snippet':sn})
        return out
    except Exception:
        return []

rows=[]
with ThreadPoolExecutor(max_workers=10) as ex:
    futs={ex.submit(scan_article,u):u for u in sorted(article_links)}
    for n,f in enumerate(as_completed(futs),1):
        rows.extend(f.result())
        if n%250==0: print('articles_done',n,'rows',len(rows),flush=True)
print('candidate_rows',len(rows),flush=True)
open('data/avar_hadith_candidates_raw.json','w',encoding='utf-8').write(json.dumps(rows,ensure_ascii=False,indent=2))
