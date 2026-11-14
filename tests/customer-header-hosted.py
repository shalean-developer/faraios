"""GET-only deployed customer route checks; never signs in or alters records."""
import json,urllib.request,urllib.error,subprocess
from pathlib import Path
from seo import NoRedirect
root=Path(__file__).resolve().parents[1];base='https://www.faraios.com';preview=base+'/_accounts-preview';report=[]
def get(url):
 try:r=urllib.request.build_opener(NoRedirect).open(url,timeout=30)
 except urllib.error.HTTPError as e:r=e
 return r.code,r.headers,r.read()
for suffix in ['', '&return=services','&return=booking-details','&return=https://example.invalid']:
 status,h,raw=get(preview+'/account/customer.php?slug=faraios-demo-cleaning'+suffix)
 assert status==200 and b'Customer sign in' in raw and b'Bright &amp; Co Cleaning' in raw and b'noindex' in h['X-Robots-Tag'].encode() and 'no-store' in h['Cache-Control']
 assert b'/account/index.php' not in raw
 report.append({'customerRoute':suffix,'status':status,'privateNoStore':True})
status,h,raw=get(preview+'/account/customer.php?slug=faraios-demo-cleaning&mode=header');assert status==200 and json.loads(raw)=={'authenticated':False};report.append({'guestHeader':True})
for url in [preview+'/account/customer.php?slug=unknown',preview+'/account/customer.php?slug=shalean-cleaning-services',base+'/account/customer.php?slug=shalean-cleaning-services']:
 status,_,_=get(url);assert status==404;report.append({'url':url,'status':status})
for name in ['ui/booking-header.js','business/booking.css']:
 status,_,raw=get(preview+'/'+name);assert status==200 and raw==(root/name).read_bytes()
 status,_,raw=get(base+'/'+name);assert status==200 and raw==subprocess.check_output(['git','show','9e4c42d:'+name],cwd=root)
 report.append({'asset':name,'previewMatchesCandidate':True,'productionMatchesBase':True})
(root/'docs/evidence/customer-header-hosted.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',len(report),'GET-only customer route and preview/production asset checks')
