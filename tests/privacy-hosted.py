"""GET-only privacy checks against both mounted previews. Never sends mail or submits forms."""
import urllib.request,concurrent.futures,hashlib,json,os
from pathlib import Path
from privacy import Document
ORIGIN='https://www.faraios.com'
ACCOUNT=ORIGIN+'/_accounts-preview';WAITLIST=ORIGIN+'/_waitlist-preview'
EXPECTED=hashlib.sha256((Path(__file__).resolve().parents[1]/'privacy.html').read_bytes()).hexdigest()
def read(task):
 kind,url,fragment=task
 r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FaraiOS-Privacy-Preview-Verification/1.0'}),timeout=45);raw=r.read();html=raw.decode();d=Document(html)
 assert r.status==200,(url,r.status)
 if kind!='production':assert 'noindex' in r.headers.get('X-Robots-Tag',''),url
 if kind=='notice':
  assert hashlib.sha256(raw).hexdigest()==EXPECTED,url
  assert set(['overview','accounts','enquiries','bookings','business-records','waitlist','cookies','storage','rights']).issubset(d.ids)
 elif kind=='production':assert hashlib.sha256(raw).hexdigest()==EXPECTED
 elif kind=='asset':assert 'privacy-card' in html
 else:
  matches=[a for a in d.links if a.get('href','').endswith('privacy.html#'+fragment)];assert matches,(url,fragment)
  if kind=='form':assert any(a.get('target')=='_blank' and 'noopener' in a.get('rel','') and 'noreferrer' in a.get('rel','') for a in matches)
  if fragment=='bookings':assert html.index('class="review-privacy request-privacy"')>html.index('</fieldset>',html.index('<fieldset data-step="4"'))
  if fragment in ['enquiries','bookings']:assert 'shared privately with Bright &amp; Co Cleaning' in html
 return {'url':url,'kind':kind,'section':fragment,'status':r.status,'robots':r.headers.get('X-Robots-Tag'),'sha256':hashlib.sha256(raw).hexdigest() if kind in ['notice','production'] else None,'pass':True}
if __name__=='__main__':
 tasks=[('notice',ACCOUNT+'/privacy.html',None),('notice',WAITLIST+'/privacy.html',None),('asset',ACCOUNT+'/privacy.css?v=20261114',None),('asset',WAITLIST+'/privacy.css?v=20261114',None),('production',ORIGIN+'/privacy.html',None),('form',ACCOUNT+'/account/index.php?page=signup','accounts'),('form',ACCOUNT+'/b/faraios-demo-cleaning','enquiries'),('form',ACCOUNT+'/b/faraios-demo-cleaning/contact','enquiries'),('form',ACCOUNT+'/b/faraios-demo-cleaning?booking=1','bookings'),('footer',ACCOUNT+'/b/faraios-demo-cleaning/services','overview'),('form',ACCOUNT+'/waitlist.html','waitlist'),('form',WAITLIST+'/waitlist.html','waitlist'),('footer',WAITLIST+'/waitlist/confirm.php','waitlist'),('footer',WAITLIST+'/waitlist/unsubscribe.php','waitlist'),('footer',ACCOUNT+'/','overview'),('footer',WAITLIST+'/','overview')]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  results=[]
  for result in pool.map(read,tasks):results.append(result);print('PASS',result['kind'],result['section'],result['url'],flush=True)
 if os.environ.get('PRIVACY_HOSTED_REPORT'):
  Path(os.environ['PRIVACY_HOSTED_REPORT']).write_text(json.dumps(results,indent=2)+'\n')
 print('PASS',len(results),'read-only hosted privacy checks',flush=True)
