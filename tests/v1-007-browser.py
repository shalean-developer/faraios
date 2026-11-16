"""Local responsive public-content check; no external requests or provider sends."""
import json,threading,subprocess,re,hashlib,os
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  p=self.path.split('?')[0]
  if p in ['/features','/pricing','/hosting','/industries','/marketplace','/terms','/guides/enquiry-to-invoice']:self.path=p+'.html'
  super().do_GET()
s=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=s.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{s.server_port}'
paths=['index.html','features.html','about.html','pricing.html','guides/enquiry-to-invoice.html'];report=[]
out=root/'test-results/v1-007';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('BROWSER_BIN'),args=['--no-sandbox'])
 for width in [320,390,1280]:
  page=b.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  for path in paths:
   page.goto(base+'/'+path);page.wait_for_load_state('networkidle')
   assert page.locator('h1').count()==1,path
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,path)
   text=page.locator('main').inner_text()
   assert 'not enabled in the current live release' not in text
   assert 'owner-only' not in text
   assert 'enabled businesses' in text,path
   assert re.search('booking requests',text,re.I),path
   assert 'not included' in text,path
   # Every existing link/asset/anchor remains intact relative to SEO source.
   for a in page.locator('a[href^="#"]').all():
    h=a.get_attribute('href');assert page.locator(h).count(),(path,h)
   if width<600:
    menu=page.get_by_role('button',name='Toggle navigation');menu.click();assert menu.get_attribute('aria-expanded')=='true';assert page.get_by_role('navigation',name='Main navigation').get_by_role('link',name='Features',exact=True).is_visible();menu.click()
   page.screenshot(path=str(out/(path.replace('/','_')+f'-{width}.png')),full_page=True)
   report.append({'path':path,'width':width,'overflow':False,'h1':1,'mobile_menu':width<600})
  assert not errors,errors
  page.close()
 b.close()
# Heads and href/src sequences unchanged, apart from the deliberate guide update date.
for path in paths:
 before=subprocess.check_output(['git','show','66ae7dc8b667a218685ef23313d9124027cdb307:'+path],cwd=root,text=True)
 after=(root/path).read_text()
 assert before.split('</head>')[0].replace('"dateModified": "2026-11-15"','"dateModified": "2026-11-16"')==after.split('</head>')[0],path
 assert re.findall(r'(?:href|src)="[^"]*"',before)==re.findall(r'(?:href|src)="[^"]*"',after),path
(out/'responsive.json').write_text(json.dumps({'passed':True,'views':report,'seo_heads_preserved':True,'all_link_and_asset_targets_preserved':True},indent=2)+'\n')
print('PASS: 15 responsive views; navigation, anchors, SEO heads, existing links/assets unchanged.')
s.shutdown()
