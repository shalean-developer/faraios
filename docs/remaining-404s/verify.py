"""Read-only HTTP acceptance: content, source bytes, redirects and genuine 404s."""
import concurrent.futures,hashlib,json,sys,urllib.request,urllib.error
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[2]
BASE='https://www.faraios.com'
PREVIEW='--preview' in sys.argv
PREFIX='/_recovery-preview' if PREVIEW else ''
PAGES=['terms','pricing','marketplace']+['industries/'+s for s in ['electrical','security','beauty-spa','cleaning','fitness','consulting']]
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*a,**kw): return None
opener=urllib.request.build_opener(NoRedirect)
def fetch(path):
    try:r=opener.open(BASE+PREFIX+path,timeout=30)
    except urllib.error.HTTPError as e:r=e
    return r.status,dict((k.lower(),v) for k,v in r.headers.items()),r.read()
class Tags(HTMLParser):
    def __init__(self): super().__init__();self.h1=0;self.c=[];self.desc=[];self.robots=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='h1':self.h1+=1
        if tag=='link' and a.get('rel')=='canonical':self.c.append(a.get('href'))
        if tag=='meta' and a.get('name')=='description':self.desc.append(a.get('content'))
        if tag=='meta' and a.get('name')=='robots':self.robots.append(a.get('content'))
def page(p):
    code,h,b=fetch('/'+p);t=Tags();t.feed(b.decode())
    expected=(ROOT/(p+'.html')).read_bytes()
    checks={'status_200':code==200,'one_h1':t.h1==1,'canonical':t.c==[BASE+'/'+p],
       'description':len(t.desc)==1 and bool(t.desc[0]),'exact_bytes':b==expected,
       'preview_excluded':('noindex' in h.get('x-robots-tag','')) if PREVIEW else 'noindex' not in h.get('x-robots-tag','') and all('noindex' not in r for r in t.robots)}
    return {'path':'/'+p,'checks':checks,'sha256':hashlib.sha256(b).hexdigest(),'passed':all(checks.values())}
def redirect(source,target,status):
    code,h,b=fetch(source);location=urllib.parse.urljoin(BASE+PREFIX+source,h.get('location',''))
    return {'path':source,'status':code,'location':location,'passed':code==status and location==target}
tasks=[('page',p) for p in PAGES]
for p in PAGES:
    for suffix in ['.html','/']:
        tasks.append(('redirect','/'+p+suffix,BASE+PREFIX+'/'+p,301))
legacy=[('/privacy','/privacy.html'),('/platform/about','/about.html'),('/marketplace/shalean-cleaning-services','/b/shalean-cleaning-services')]
for p,target in legacy:
    for suffix in ['','/']:
        tasks.append(('redirect',p+suffix,BASE+PREFIX+target,301))
for p in ['/industries/not-a-real-industry','/not-a-real-page']:
    tasks.append(('missing',p))
def exercise(task):
    try:
        if task[0]=='page':return page(task[1])
        if task[0]=='redirect':return redirect(*task[1:])
        code,h,b=fetch(task[1]);return {'path':task[1],'status':code,'passed':code==404}
    except Exception as e:return {'path':task[1],'error':str(e),'passed':False}
results=list(concurrent.futures.ThreadPoolExecutor(max_workers=8).map(exercise,tasks))
report={'preview':PREVIEW,'base':BASE+PREFIX,'passed':all(r['passed'] for r in results),'checks':len(results),'results':results}
out=ROOT/'docs/remaining-404s'/('hosted-preview.json' if PREVIEW else 'live.json');out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'checks':len(results),'failed':[r for r in results if not r['passed']]}));sys.exit(not report['passed'])
