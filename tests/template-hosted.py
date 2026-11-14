"""GET-only hosted preview verification. No record changes or form submissions."""
import json,hashlib,subprocess,urllib.request,urllib.error
from pathlib import Path
from seo import Head,NoRedirect
ROOT=Path(__file__).resolve().parents[1]
base='https://www.faraios.com';preview=base+'/_accounts-preview';report=[]
def get(url):
 try:r=urllib.request.build_opener(NoRedirect).open(url,timeout=30)
 except urllib.error.HTTPError as e:r=e
 return r.code,r.headers,r.read()
for suffix in ['', '/services','/how-it-works','/areas','/contact']:
 url=preview+'/b/faraios-demo-cleaning'+suffix;status,h,raw=get(url);html=raw.decode();head=Head(html)
 assert status==200 and 'noindex' in h['X-Robots-Tag'] and 'no-store' in h['Cache-Control']
 assert head.canonical==[url] and head.meta['og:url']==url
 assert head.schemas[0]['@graph'][0]['name']=='Bright & Co Cleaning'
 assert 'header-branding-1' in html and 'Footer navigation' in html
 report.append({'url':url,'status':status,'noindex':True,'noStore':True,'canonical':head.canonical[0]})
for name in ['business/homepage.css','business/booking.js']:
 status,h,raw=get(preview+'/'+name);expected=(ROOT/name).read_bytes();assert status==200 and raw==expected
 status,_,live=get(base+'/'+name);old=subprocess.check_output(['git','show','9e4c42d:'+name],cwd=ROOT);assert status==200 and live==old
 report.append({'asset':name,'previewMatchesCandidate':True,'productionMatchesBase':True})
for path in ['/b/unknown?booking=1','/b/faraios-demo-cleaning/unknown','/b/shalean-cleaning-services']:
 status,h,raw=get(preview+path);assert status==404 and 'noindex' in h['X-Robots-Tag'];report.append({'path':path,'status':status})
status,h,raw=get(preview+'/b/faraios-demo-cleaning?booking=1&service='+'2'*32);assert status==200 and b'required checked' in raw and b'booking-progress' in raw and b'template-service-entry-1' in raw
head=Head(raw.decode());assert not head.canonical and not head.schemas
report.append({'bookingServicePreselection':True,'noindex':True})
status,h,raw=get(base+'/b/shalean-cleaning-services');assert status==200 and b'Shalean Cleaning Services' in raw and b'template-type-2' not in raw
report.append({'productionShaleanUnchangedApplication':True,'status':status})
(ROOT/'docs/evidence/template-hosted-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS',len(report),'GET-only hosted checks; preview assets match candidate, production assets match base')
