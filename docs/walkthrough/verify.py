"""Read-only hosted guide/public-content acceptance; no application writes."""
import urllib.request,urllib.error,urllib.parse,json,concurrent.futures,sys
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[2];PREVIEW='--preview' in sys.argv
BASE='https://www.faraios.com';PREFIX='/_walkthrough-preview' if PREVIEW else ''
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
op=urllib.request.build_opener(NoRedirect)
def get(p):
 try:r=op.open(BASE+PREFIX+p,timeout=30)
 except urllib.error.HTTPError as e:r=e
 return r.status,{k.lower():v for k,v in r.headers.items()},r.read()
class Tags(HTMLParser):
 def __init__(self):super().__init__();self.h1=0;self.c=[];self.desc=[];self.ids=[];self.anchors=[];self.scripts=[];self.inscript=False
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='h1':self.h1+=1
  if t=='link' and a.get('rel')=='canonical':self.c.append(a.get('href'))
  if t=='meta' and a.get('name')=='description':self.desc.append(a.get('content'))
  if a.get('id'):self.ids.append(a['id'])
  if t=='a' and a.get('href','').startswith('#'):self.anchors.append(a['href'][1:])
  if t=='script' and a.get('type')=='application/ld+json':self.inscript=True
 def handle_data(self,s):
  if self.inscript:self.scripts.append(json.loads(s))
 def handle_endtag(self,t):
  if t=='script':self.inscript=False
tasks=[('/guides/enquiry-to-invoice','guides/enquiry-to-invoice.html'),('/pricing','pricing.html'),('/about.html','about.html'),('/','index.html')]
def check(task):
 p,file=task
 try:
  code,h,b=get(p);t=Tags();t.feed(b.decode());url=BASE+('/' if p=='/' else p)
  checks={'200':code==200,'exact_bytes':b==(ROOT/file).read_bytes(),'one_h1':t.h1==1,'canonical':t.c==[url],'description':len(t.desc)==1 and bool(t.desc[0]),'preview_header':('noindex' in h.get('x-robots-tag','')) if PREVIEW else 'noindex' not in h.get('x-robots-tag',''),'anchors':all(a in t.ids for a in t.anchors),'unique_ids':len(t.ids)==len(set(t.ids))}
  if 'guides/' in p:checks.update(article=any(x.get('@type')=='Article' for x in t.scripts),no_form=b'<form' not in b)
  return {'path':p,'checks':checks,'passed':all(checks.values())}
 except Exception as e:return {'path':p,'error':str(e),'passed':False}
results=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(check,tasks))
for p,status,target in [('/guides/enquiry-to-invoice.html',301,'/guides/enquiry-to-invoice'),('/guides/enquiry-to-invoice/',301,'/guides/enquiry-to-invoice'),('/guides/not-a-real-guide',404,None)]:
 try:
  code,h,b=get(p);passed=code==status and (target is None or urllib.parse.urljoin(BASE+PREFIX+p,h.get('location',''))==BASE+PREFIX+target);results.append({'path':p,'status':code,'passed':passed})
 except Exception as e:results.append({'path':p,'error':str(e),'passed':False})
out={'preview':PREVIEW,'passed':all(x['passed'] for x in results),'checks':len(results),'results':results};(ROOT/'docs/walkthrough'/('preview-http.json' if PREVIEW else 'live-http.json')).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out));sys.exit(not out['passed'])
