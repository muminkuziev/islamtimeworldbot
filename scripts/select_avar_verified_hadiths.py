import json,re
from difflib import SequenceMatcher

d=json.load(open('data/avar_sahih_final_candidates.json',encoding='utf-8'))
pool=[]
for x in d:
    t=x['text']
    if x.get('_score',0)<7: continue
    if not (38<=len(t)<=500): continue
    if '«' in t or '»' in t: continue
    if any(z in t for z in [
        'хIадис бицанщинас','хIадисал ракIариялъулъ','гIалимзабаз','авторас',
        'тIехьалда хъвалеб','жайна буго','хIадисазулъ дандеккунгутIи'
    ]): continue
    pool.append(x)

def nrm(t):
    t=re.sub(r'[^0-9A-Za-zА-Яа-яӀI]+',' ',t.lower())
    return ' '.join(t.split())

# semantic-ish duplicate removal: same prefix, containment, or high similarity
selected=[]; norms=[]
for x in pool:
    n=nrm(x['text'])
    dup=False
    for old in norms:
        ratio=SequenceMatcher(None,n,old).ratio()
        if (n[:34]==old[:34] and ratio>0.76) or ((n in old or old in n) and ratio>0.70) or ratio>0.93:
            dup=True; break
    if dup: continue
    selected.append(x); norms.append(n)
    if len(selected)>=200: break

for i,x in enumerate(selected,1):
    x['id']=f'av-sahih-{i:03d}'
    x.pop('_score',None)

out={
  'language':'av',
  'language_name':'Авар',
  'verified':True,
  'verification_policy':'Avar text published by As-Salam / DUM Dagestan; each selected item has explicit adjacent attribution to Sahih al-Bukhari and/or Sahih Muslim. No machine translation.',
  'count':len(selected),
  'hadiths':selected
}
open('data/avar_sahih_200.json','w',encoding='utf-8').write(json.dumps(out,ensure_ascii=False,indent=2))
print('pool',len(pool),'selected',len(selected))
from collections import Counter
print('sources',Counter(x['attribution'] for x in selected))
for i,x in enumerate(selected[:70],1):
    print(f"{i:03d}\t{x['attribution']}\t{x['text'][:180]}\t{x['source_url']}")
