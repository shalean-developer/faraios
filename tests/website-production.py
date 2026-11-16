"""GET-only production release smoke checks. Never publishes a business or submits a form."""
import concurrent.futures,hashlib,json,os,urllib.request,urllib.error,xml.etree.ElementTree as ET
from pathlib import Path
from seo import Head,NoRedirect
from privacy import Document
ROOT=Path(__file__).resolve().parents[1];ORIGIN='https://www.faraios.com';PREVIEW=ORIGIN+'/_accounts-preview';DEMO='/b/faraios-demo-cleaning'
def check(task):
 kind,path=task;url=ORIGIN+path
 try:r=urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,headers={'User-Agent':'FaraiOS-Website-Release-Verification/1.0'}),timeout=45)
 except urllib.error.HTTPError as e:r=e
 raw=r.read();text=raw.decode();head=Head(text);doc=Document(text)
 if kind=='missing':assert r.code==404,(url,r.code);assert 'noindex' in r.headers.get('X-Robots-Tag','');assert not head.canonical
 elif kind=='private':assert r.code in [200,303],(url,r.code);assert 'noindex' in r.headers.get('X-Robots-Tag','')
 elif kind=='sitemap':assert r.code==200;assert 'application/xml' in r.headers.get('Content-Type','');assert 'noindex' in r.headers.get('X-Robots-Tag','');assert [e.text for e in ET.fromstring(text).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]==[ORIGIN+'/'];assert 'preview' not in text;assert 'booking' not in text
 elif kind=='preview':assert r.code==200;assert 'noindex' in r.headers.get('X-Robots-Tag','')
 elif kind=='notice':
  assert r.code==200;assert hashlib.sha256(raw).digest()==hashlib.sha256((ROOT/'privacy.html').read_bytes()).digest();assert 'noindex' not in r.headers.get('X-Robots-Tag','');assert 'bookings' in doc.ids;assert 'accounts' in doc.ids;assert head.canonical==[ORIGIN+'/privacy.html']
 elif kind=='asset':
  assert r.code==200,(url,r.code);file=path.split('?',1)[0].lstrip('/');assert hashlib.sha256(raw).digest()==hashlib.sha256((ROOT/file).read_bytes()).digest(),url
 elif kind=='root':assert r.code==200;assert 'noindex' not in r.headers.get('X-Robots-Tag','');assert any(a.get('href')=='privacy.html#overview' for a in doc.links)
 return {'kind':kind,'url':url,'status':r.code,'robots':r.headers.get('X-Robots-Tag'),'pass':True}
if __name__=='__main__':
 tasks=[('root','/'),('notice','/privacy.html'),('sitemap','/sitemap.xml'),('private','/account/index.php?page=signup'),('private','/account/index.php?page=signin'),('private','/account/profile.php'),('private','/account/profile.php?view=preview&section=services')]
 tasks += [('asset','/'+p) for p in ['business/homepage.css?v=seo-1','business/booking.js?v=booking-step-titles-20261114','privacy.css?v=20261114']]
 tasks += [('missing',DEMO+suffix) for suffix in ['','/services','/how-it-works','/areas','/contact','?booking=1']]
 tasks += [('preview','/_accounts-preview'+DEMO+suffix) for suffix in ['','/services','?booking=1']]
 tasks += [('preview','/_waitlist-preview/privacy.html')]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  results=[]
  for result in pool.map(check,tasks):results.append(result);print('PASS',result['kind'],result['status'],result['url'],flush=True)
 if os.environ.get('WEBSITE_RELEASE_REPORT'):Path(os.environ['WEBSITE_RELEASE_REPORT']).write_text(json.dumps(results,indent=2)+'\n')
 print('PASS',len(results),'GET-only production release checks; no public fixture created',flush=True)
