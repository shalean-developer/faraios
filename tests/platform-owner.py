"""Actual PHP HTTP tracker/security/persistence tests. Fake Auth only, no network/provider writes."""
import os,subprocess,tempfile,unittest,json,threading,time,socket,re,urllib.request,urllib.parse,urllib.error,http.cookiejar
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]
PHP=os.environ.get('PHP_BIN','php')
OWNER='11111111-1111-4111-8111-111111111111'
OTHER='22222222-2222-4222-8222-222222222222'
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
class Tracker(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.tmp=tempfile.TemporaryDirectory();c.private=Path(c.tmp.name);c.httpport=port();c.authport=port();c.base=f'http://127.0.0.1:{c.httpport}';c.user=OWNER
  class Auth(BaseHTTPRequestHandler):
   def log_message(self,*a):pass
   def do_GET(self):
    self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'id':c.user,'email':'owner@example.test','email_confirmed_at':'2026-11-16','user_metadata':{'name':'Synthetic Owner'}}).encode())
   def do_POST(self):
    self.rfile.read(int(self.headers.get('Content-Length',0)));self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'access_token':'fake-test-token','refresh_token':'fake-refresh','expires_in':3600}).encode())
  c.auth=ThreadingHTTPServer(('127.0.0.1',c.authport),Auth);threading.Thread(target=c.auth.serve_forever,daemon=True).start()
  (c.private/'config.php').write_text("<?php return "+"['enabled'=>true,'environment'=>'test','base_url'=>"+repr(c.base)+",'supabase_url'=>"+repr(f'http://127.0.0.1:{c.authport}')+",'publishable_key'=>'fake'];")
  (c.private/'platform-owner.php').write_text("<?php return ['enabled'=>true,'owner_ids'=>['"+OWNER+"']];")
  c.log=open(c.private/'php.log','w');c.proc=subprocess.Popen([PHP,'-d','session.save_path='+str(c.private),'-S',f'127.0.0.1:{c.httpport}','-t',str(ROOT)],env=dict(os.environ,FARAIOS_ACCOUNT_DIR=str(c.private)),stdout=c.log,stderr=c.log)
  for _ in range(100):
   try:urllib.request.urlopen(c.base+'/favicon.svg');break
   except OSError:time.sleep(.03)
  c.client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 @classmethod
 def tearDownClass(c):c.proc.terminate();c.proc.wait();c.auth.shutdown();c.auth.server_close();c.log.close();c.tmp.cleanup()
 def get(self,path='/account/platform.php',client=None):
  try:r=(client or self.client).open(self.base+path);return r.status,r.read().decode()
  except urllib.error.HTTPError as e:return e.code,e.read().decode()
 def post(self,path,fields,origin=None):
  fields=dict(fields)
  if 'done' in fields:fields['done[]']=fields.pop('done')
  data=urllib.parse.urlencode(fields,doseq=True).encode();req=urllib.request.Request(self.base+path,data=data,headers={'Origin':origin or self.base})
  try:r=self.client.open(req);return r.status,r.read().decode()
  except urllib.error.HTTPError as e:return e.code,e.read().decode()
 def login(self):
  html=self.get('/account/index.php?page=signin')[1];csrf=re.search('name="csrf" value="([^"]+)"',html)[1]
  # Sign-in may route through business setup; the Auth session is established before that read.
  self.post('/account/index.php?page=signin',dict(csrf=csrf,email='owner@example.test',password='long-fake-password'))
 def fields(self,**kw):
  html=self.get('/account/platform.php?new=1')[1]
  return dict(csrf=re.search('name="csrf" value="([^"]+)"',html)[1],revision=re.search('name="revision" value="([^"]+)"',html)[1],id='',title='Synthetic tracker test',summary='A test only',kind='Verification',priority='High',status='To do',release='v1.0.0',blocking='on',checklist='Complete one check',dependencies='',evidence_note='',evidence_url='',notes='')|kw
 def test_01_authentication_and_owner_boundary(self):
  anonymous=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  self.assertIn('Welcome back',self.get(client=anonymous)[1]);self.login()
  type(self).user=OTHER;s,h=self.get();self.assertEqual(s,403);self.assertNotIn('V1-001',h);self.assertNotIn('Release on hold',h)
  self.assertFalse(list(self.private.glob('platform-tracker-*')))
  type(self).user=OWNER;s,h=self.get();self.assertEqual(s,200);self.assertIn('Release on hold',h)
  path=self.private/'platform-owner.php';original=path.read_text();path.write_text("<?php return ['enabled'=>false,'owner_ids'=>['"+OWNER+"']];")
  self.assertEqual(self.get()[0],403);path.write_text(original)
 def test_02_csrf_origin_and_no_side_effects(self):
  fields=self.fields();fields['csrf']='bad';self.assertEqual(self.post('/account/platform.php',fields)[0],400)
  self.assertEqual(self.post('/account/platform.php',self.fields(),origin='https://evil.example')[0],400)
  self.assertFalse(list(self.private.glob('platform-tracker-*/tracker.json')))
 def test_03_create_persist_escape_export_and_stale(self):
  f=self.fields(title='<script>alert(1)</script>');s,h=self.post('/account/platform.php',f);self.assertEqual(s,200);self.assertIn('Task saved',h);self.assertIn('&lt;script&gt;',h);self.assertNotIn('<script>alert',h)
  stale=self.post('/account/platform.php',f);self.assertEqual(stale[0],400);self.assertIn('input is retained',stale[1])
  s,h=self.get('/account/platform.php?export=1');store=json.loads(h);self.assertEqual(store['revision'],1);self.assertEqual(len(store['history']),1);self.assertEqual(store['history'][0]['actor'],OWNER)
  file=next(self.private.glob('platform-tracker-*/tracker.json'));self.assertEqual(file.stat().st_mode&0o777,0o600);self.assertEqual(file.parent.stat().st_mode&0o777,0o700)
  self.assertEqual(len([x for x in store['tasks'] if x['title']==f['title']]),1)
  self.assertIn('&lt;script&gt;',self.get('/account/platform.php?view=tasks&q=script')[1])
  type(self).taskid=store['history'][0]['task']
 def test_04_verified_gate_and_history(self):
  bad=self.fields(status='Verified');self.assertEqual(self.post('/account/platform.php',bad)[0],400)
  urlbad=self.fields(evidence_url='javascript:alert(1)');self.assertEqual(self.post('/account/platform.php',urlbad)[0],400)
  taskid=self.taskid
  f=self.fields(id=taskid,status='Verified',evidence_note='Actual synthetic evidence',done=['0']);self.assertEqual(self.post('/account/platform.php',f)[0],200)
  s,h=self.get('/account/platform.php?export=1');store=json.loads(h);self.assertEqual(store['history'][-1]['before']['status'],'To do');self.assertEqual(store['history'][-1]['after']['status'],'Verified')
  # Edited checklist text cannot reuse the former checked index.
  f=self.fields(id=taskid,status='Verified',evidence_note='Actual evidence',done=['0'],checklist='Different unaccepted check');self.assertEqual(self.post('/account/platform.php',f)[0],400)
 def test_05_dependency_and_input_checks(self):
  for changes in [dict(dependencies='does-not-exist'),dict(dependencies=self.taskid,id=self.taskid),dict(status='Complete'),dict(title='x'),dict(evidence_url='https://user:password@example.test/path'),dict(status='Verified',done=['0'],evidence_note='Proof',dependencies='V1-001')]:
   s,h=self.post('/account/platform.php',self.fields(**changes));self.assertEqual(s,400)
  # Source audit tasks remain unmodified by tracker edits.
  store=json.loads(self.get('/account/platform.php?export=1')[1]);self.assertEqual(next(t for t in store['tasks'] if t['id']=='V1-001')['status'],'Preview')
 def test_06_read_filters_and_no_public_storage(self):
  h=self.get('/account/platform.php?view=defects')[1];self.assertIn('Confirmed defects',h);self.assertNotIn('Prove new-account verification',h)
  h=self.get('/account/platform.php?view=tasks&q=nonexistent')[1];self.assertIn('No matching tasks',h)
  type(self).user=OTHER;self.assertEqual(self.get('/account/platform.php?export=1')[0],403);type(self).user=OWNER
  self.assertNotIn('localStorage',(ROOT/'account/platform.js').read_text())
  self.assertNotIn('service_role',(ROOT/'account/platform-core.php').read_text())
 def test_08_encrypted_history_recovery(self):
  code=r'''require 'account/platform-core.php';
  $key=openssl_pkey_new(['private_key_bits'=>3072]);openssl_pkey_export($key,$private);
  $public=openssl_pkey_get_details($key)['key'];
  $bytes=json_encode(['schema'=>1,'revision'=>4,'tasks'=>[['title'=>'Private recovery example']],'history'=>[['revision'=>4]]]);
  $p=platform_seal($bytes,$public);
  if(platform_unseal($p,$private,'')!==$bytes||str_contains(json_encode($p),'Private recovery example'))exit(1);
  $other=openssl_pkey_new(['private_key_bits'=>3072]);openssl_pkey_export($other,$wrong);
  try{platform_unseal($p,$wrong,'');exit(2);}catch(RuntimeException $e){}
  $p['tag']=base64_encode(str_repeat('x',16));
  try{platform_unseal($p,$private,'');exit(3);}catch(RuntimeException $e){}
  echo 'recovery_verified';'''
  r=subprocess.run([PHP,'-r',code],cwd=ROOT,capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout,'recovery_verified')
  files=list(self.private.glob('platform-tracker-*/recovery/*.packet'));self.assertTrue(files)
  for f in files:self.assertEqual(f.stat().st_mode&0o777,0o600)
 def test_07_browser_responsive_and_save(self):
  if os.environ.get('PLATFORM_BROWSER')!='1':self.skipTest('Optional isolated Chromium UI check')
  from playwright.sync_api import sync_playwright
  jar=next(h.cookiejar for h in self.client.handlers if isinstance(h,urllib.request.HTTPCookieProcessor))
  out=Path(os.environ.get('PLATFORM_PROOF_DIR',ROOT/'test-results/release/platform-owner'));out.mkdir(parents=True,exist_ok=True)
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=os.environ.get('BROWSER_BIN'),headless=True,args=['--no-sandbox'])
   for width in [1280,390,320]:
    context=browser.new_context(viewport={'width':width,'height':900})
    context.add_cookies([{'name':c.name,'value':c.value,'domain':'127.0.0.1','path':c.path} for c in jar])
    page=context.new_page();page.goto(self.base+'/account/platform.php')
    self.assertTrue(page.get_by_role('heading',name='Build a release you can trust.').is_visible())
    self.assertFalse(page.evaluate('document.documentElement.scrollWidth>innerWidth'))
    page.screenshot(path=str(out/f'overview-{width}.png'),full_page=False)
    page.get_by_role('link',name='New task',exact=True).click()
    page.get_by_label('Task title',exact=True).fill(f'Synthetic browser task {width}')
    page.get_by_label('Acceptance checklist',exact=True).fill('Verify synthetic browser save')
    page.get_by_role('button',name='Save task',exact=True).click()
    self.assertTrue(page.get_by_role('status').get_by_text('Task saved.',exact=False).is_visible())
    page.reload();self.assertEqual(page.get_by_label('Task title',exact=True).input_value(),f'Synthetic browser task {width}')
    self.assertFalse(page.evaluate('document.documentElement.scrollWidth>innerWidth'))
    page.screenshot(path=str(out/f'edit-{width}.png'),full_page=False)
    context.close()
   browser.close()
if __name__=='__main__':unittest.main(verbosity=2)
