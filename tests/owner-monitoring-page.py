"""Real PHP route with isolated Auth, database and operational-source adapters."""
import os,pathlib,shutil,socket,subprocess,tempfile,time,urllib.request,urllib.error
root=pathlib.Path(__file__).resolve().parents[1]
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
opener=urllib.request.build_opener(NoRedirect())
with tempfile.TemporaryDirectory() as tmp:
 d=pathlib.Path(tmp);a=d/'account';a.mkdir();p=d/'private';p.mkdir()
 for n in ['platform-monitoring.php','platform-monitoring-page.php','platform-directory.php','platform-core.php','platform-navigation.php']:shutil.copy(root/'account'/n,a/n)
 (p/'platform-owner.php').write_text("<?php return ['enabled'=>true,'owner_ids'=>['11111111-1111-4111-8111-111111111111']];")
 (a/'platform-session.php').write_text('''<?php
function start():void{}
function cfg():array{return [];}
function user():array{$w=$_COOKIE['who']??'';if($w===''){header('Location: index.php?page=signin',true,303);exit;}if($w==='expired')throw new RuntimeException('SECRET');return ['id'=>in_array($w,['platform','missing','failure','stale','revoked'],true)?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222','email_confirmed_at'=>'2026','user_metadata'=>['platform_owner'=>true]];}
''')
 (a/'platform-directory-https.php').write_text("<?php function platform_directory_https_reader(){return function(){if(($_COOKIE['who']??'')==='revoked')throw new RuntimeException('SECRET');return ['rows'=>[],'has_more'=>false,'observed_at'=>gmdate('c')];};}")
 (a/'platform-monitoring-sources.php').write_text('''<?php
function platform_monitor_sources(){
 $who=$_COOKIE['who']??'';if($who==='failure')throw new RuntimeException('SECRET');if($who==='missing')return [];
 return ['runs'=>['workflow_runs'=>[['id'=>1,'head_branch'=>'main','path'=>'.github/workflows/operations-watchdog.yml','created_at'=>gmdate('Y-m-d\\TH:i:s\\Z',time()-($who==='stale'?7200:30)),'status'=>'completed','conclusion'=>'success','secret'=>'SECRET']]],'tracker'=>['tasks'=>[['id'=>'V1-014','status'=>'In progress','updated_at'=>gmdate('c'),'checks'=>[['done'=>true],['done'=>false]],'notes'=>'SECRET']]]];
}
''')
 with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 log=open(d/'php.log','w+');server=subprocess.Popen([os.environ.get('PHP_BIN','php'),'-S',f'127.0.0.1:{port}','-t',str(d)],env=dict(os.environ,FARAIOS_ACCOUNT_DIR=str(p)),stdout=log,stderr=log)
 count=0
 def check(v,label):
  global count
  assert v,label
  count+=1
 def get(who='platform',query='',method='GET',path='platform-monitoring-page.php'):
  q=urllib.request.Request(f'http://127.0.0.1:{port}/account/{path}'+query,method=method,headers={'Cookie':'who='+who})
  try:r=opener.open(q,timeout=4)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.headers,r.read().decode()
 try:
  for _ in range(30):
   try:
    with socket.create_connection(('127.0.0.1',port),timeout=.1):break
   except OSError:time.sleep(.05)
  code,h,html=get();check(code==200 and 'aria-label="Operational checks"' in html,'owner page');check('SECRET' not in html,'redaction');check('Recovery is not yet fully proven' in html,'open recovery');check('accounts-preview only' in html and 'Customer delivery queues: Not connected' in html,'coverage boundaries');check(h['Cache-Control']=='no-store' and 'noindex' in h['X-Robots-Tag'],'private');check('platform.php?task=V1-014' in html and 'Development progress' in html,'source links')
  check(get('')[0]==303,'anonymous');check(get('expired')[0]==401,'expired')
  for who in ['owner','manager','receptionist','worker']:
   code,_,html=get(who);check(code==403 and 'aria-label="Operational checks"' not in html,'role denied '+who)
  code,_,html=get('revoked');check(code==503 and 'aria-label="Operational checks"' not in html,'database gate fail closed')
  for method in ['POST','PUT','DELETE']:check(get(method=method)[0]==405,'no writes '+method)
  for q in ['?url=https://evil.invalid','?restore=1','?retry=1','?environment=preview']:check(get(query=q)[0]==400,'reject query')
  code,_,html=get('missing');check(code==200 and 'Unknown — workflow history' in html and '0 failed or attention' not in html,'missing not zero');check('Unverified' in html,'missing recovery not accepted')
  check('Stale' in get('stale')[2],'stale shown');code,_,html=get('failure');check(code==503 and 'SECRET' not in html,'redacted failure')
  for n in ['platform-monitoring.php']:check(get(path=n)[0]==404,'include only')
  print({'status':'PASS','assertions':count,'hosted_requests':0})
 finally:server.terminate();server.wait(timeout=5);log.close()
