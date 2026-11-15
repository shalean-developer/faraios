"""Render actual PHP views using disposable synthetic fixtures; never hosted records.
Produces a static-only UI review bundle. All preview submissions are blocked.
"""
import importlib.util,json,re,sys,zipfile,shutil,urllib.parse
from pathlib import Path
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('full_journey',ROOT/'tests/full-journey.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
Case=mod.FullJourney
OUT=ROOT/'test-results/release/ui-preview';OUT.mkdir(parents=True,exist_ok=True)
PREFIX='_ui-preview'
base=OUT/PREFIX;base.mkdir(exist_ok=True)
# Copy only browser assets and public HTML. Never copy config, executable PHP or SQL.
for p in ROOT.rglob('*'):
 rel=p.relative_to(ROOT)
 if any(x in rel.parts for x in ['.git','test-results','docs','tests','supabase','release','config']):continue
 if p.is_file() and p.suffix in ['.html','.css','.js','.svg','.png']:
  target=base/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
records=[]
def snapshot(path,target):
 status,html=case.get(path)
 if status!=200:raise RuntimeError(f'{path}: HTTP{status}')
 if 'could not load' in html.lower():raise RuntimeError(f'{path}: load failure')
 # Resolve original URLs relative to the requested route, then retain only static preview paths.
 def attr(m):
  name,value=m[1],m[2]
  if value.startswith(('#','mailto:','tel:','data:')):return m[0]
  u=urllib.parse.urlsplit(urllib.parse.urljoin(Case.url+path,value))
  if u.netloc and u.netloc!=urllib.parse.urlsplit(Case.url).netloc:return m[0]
  route=u.path.removeprefix('/preview').lstrip('/');q=urllib.parse.parse_qs(u.query)
  if name=='action':dest='/_ui-preview/review.html'
  elif route=='account/index.php':dest='/_ui-preview/account/'+q.get('page',['signin'])[0]+'.html'
  elif route.startswith('b/'):
   parts=route.split('/');dest='/_ui-preview/business-example/'+('/'.join(parts[2:]) or 'index')+'.html'
  else:
   dest='/_ui-preview/'+route.replace('.php','.html')
   if route.endswith('.php') and q.get('new')==['1']:dest=dest.replace('.html','-new.html')
   if not route:dest='/_ui-preview/index.html'
  return name+'="'+dest+(('#'+u.fragment) if u.fragment else '')+'"'
 html=re.sub(r'(href|src|action)="([^\"]*)"',attr,html)
 html=html.replace('PRIVATE-PERSON','Alex Example').replace('PRIVATE-ACCOUNT@example.test','alex@example.test').replace('Fresh Test','Example Services')
 html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"><script src="/_ui-preview/ui/preview-guard.js"></script></head>')
 p=base/target;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(html)
 records.append({'path':path,'snapshot':target,'status':status})
Case.setUpClass()
try:
 case=Case('test_journey');ids=case.seed_journey()
 for name in ['dashboard','requests','enquiries','quotes','bookings','customers','staff','invoices','services','profile']:
  snapshot('/preview/account/'+name+'.php','account/'+name+'.html')
 for name in ['quotes','bookings','customers','staff','invoices']:
  snapshot('/preview/account/'+name+'.php?new=1','account/'+name+'-new.html')
 snapshot('/preview/account/enquiry-new.php','account/enquiry-new.html')
 for page in ['signin','signup','forgot','verify','confirm','welcome','business']:
  snapshot('/preview/account/index.php?page='+page+('&edit=location' if page=='business' else ''),'account/'+page+'.html')
 snapshot('/preview/account/index.php?page=welcome&edit=personal','account/welcome-edit.html')
 for page in ['','services','how-it-works','areas','contact']:
  snapshot('/preview/b/journey-field-service'+('/'+page if page else ''),'business-example/'+(page or 'index')+'.html')
 snapshot('/preview/account/customer.php?slug=journey-field-service','account/customer.html')
 snapshot('/preview/account/customer-help.php?slug=journey-field-service','account/customer-help.html')
 for kind,table,idkey in [('quote','business_quotes','quote'),('invoice','business_invoices','invoice')]:
  token=case.scope(case.ids[0],'select share_token from public.'+table+' where id='+lit(ids[idkey]))
  snapshot('/'+kind+'/index.php?token='+token,kind+'/index.html')
finally:Case.tearDownClass()
(base/'ui/preview-guard.js').write_text("document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();alert('UI preview only. No information is saved or sent.');},true);HTMLFormElement.prototype.submit=function(){return false;};")
# No executable endpoints or production credentials exist in the bundle.
(base/'.htaccess').write_text('''Options -Indexes
<IfModule mod_headers.c>
Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_METHOD} !^(GET|HEAD)$
RewriteRule ^ - [F,L]
RewriteCond %{QUERY_STRING} ^page=(signup|signin|forgot|verify|confirm|welcome|business)(?:&|$)
RewriteRule ^account/index\\.php$ account/%1.html [R=302,L,QSD]
RewriteRule ^account/index\\.php$ account/signin.html [R=302,L,QSD]
RewriteRule ^guides/enquiry-to-invoice$ guides/enquiry-to-invoice.html [L]
RewriteRule ^(features|hosting|industries|pricing|marketplace|terms|industries/(?:tourism|gardening|technology|construction|cleaning|electrical|security|beauty-spa|fitness|consulting))$ $1.html [L]
</IfModule>
''')
links=['index.html','features','about.html','contact.html','privacy.html','terms','pricing','marketplace','industries','waitlist.html','guides/enquiry-to-invoice']+[x['snapshot'] for x in records]
(base/'review.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>FaraiOS UI review</title><link rel="stylesheet" href="ui/design-system.css"></head><body class="ui-page"><main style="max-width:960px;margin:40px auto;padding:24px"><h1>FaraiOS UI preview</h1><p>Homepage-derived styling. Account, business and document examples use disposable synthetic data. Forms cannot submit.</p><ul>'+''.join('<li style="padding:8px"><a href="'+p+'">'+p+'</a></li>' for p in links)+'</ul></main></body></html>')
(OUT/'rendered-views.json').write_text(json.dumps(records,indent=2)+'\n')
with zipfile.ZipFile(OUT/'preview.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(base.rglob('*')):
  if not p.is_file():continue
  assert p.suffix not in ['.php','.sql','.sqlite','.env']
  n=p.relative_to(OUT).as_posix();i=zipfile.ZipInfo(n,(2026,11,15,0,0,0));i.external_attr=0o100644<<16;i.compress_type=zipfile.ZIP_DEFLATED;z.writestr(i,p.read_bytes())
print('PASS static UI preview:',len(records),'actual PHP views; synthetic-only; forms blocked; no PHP/config/SQL included')
