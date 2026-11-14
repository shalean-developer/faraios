"""Preview structured-event privacy, no production activation, actual outage and recovery."""
from seo import SEO
from journey import PHP,ROOT
from pathlib import Path
import unittest,subprocess,json,os,urllib.request
class Observability(SEO):
 def test_events(self):
  log=Path(self.tmp.name)/'ops.log'
  script="<?php require "+repr(str(ROOT/'account/observability.php'))+";ini_set('log_errors','1');ini_set('error_log',"+repr(str(log))+");$c=['environment'=>'test','base_url'=>'http://localhost/preview'];ops_install($c);ops_event($c,'upstream_failure','quote',503);ops_event($c,'workflow_failure','customer@example.test TOKEN requirements',400);ops_event($c,'arbitrary customer text','quote',500);ops_event(['environment'=>'test','base_url'=>'http://localhost'],'upstream_failure','quote',500);"
  fixture=Path(self.tmp.name)/'events.php';fixture.write_text(script)
  subprocess.run([PHP,str(fixture)],check=True,capture_output=True)
  lines=log.read_text().splitlines();self.assertEqual(len(lines),2)
  records=[json.loads(x[x.index('{'):]) for x in lines];self.assertEqual(records[1]['operation'],'other')
  self.assertEqual(set(records[0]),{'schema','time','environment','event','operation','status','request_id'})
  self.assertNotIn('customer@example.test',log.read_text());self.assertNotIn('TOKEN',log.read_text())
  # Real PHP request: backend outage gives safe feedback; restoring gateway recovers normally.
  self.post('/preview/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  self.gw.shutdown();self.gw.server_close()
  html=self.get('/preview/account/dashboard.php')[1];self.assertNotIn('test_access',html);self.assertNotIn('PRIVATE-ACCOUNT',html);self.assertIn('Dashboard could not load',html)
  from http.server import ThreadingHTTPServer
  import threading
  handler=self.gw.RequestHandlerClass;port=self.gw.server_port
  type(self).gw=ThreadingHTTPServer(('127.0.0.1',port),handler);threading.Thread(target=self.gw.serve_forever,daemon=True).start()
  self.assertIn('Money overview',self.get('/preview/account/dashboard.php')[1])
  # API integration logs only fixed metadata, even when response/path/body contain secrets.
  from http.server import BaseHTTPRequestHandler
  class Unavailable(BaseHTTPRequestHandler):
   def log_message(self,*a):pass
   def do_POST(self):
    self.send_response(503);self.end_headers();self.wfile.write(b'{"message":"PRIVATE backend payload"}')
  outage=ThreadingHTTPServer(('127.0.0.1',0),Unavailable);threading.Thread(target=outage.serve_forever,daemon=True).start()
  cfgdir=Path(self.tmp.name)/'ops-config';cfgdir.mkdir();(cfgdir/'config.php').write_text("<?php return ['enabled'=>true,'environment'=>'test','base_url'=>'http://localhost/preview','publishable_key'=>'FAKE SECRET','supabase_url'=>'http://127.0.0.1:"+str(outage.server_port)+"'];")
  integration=Path(self.tmp.name)/'integration.php';integration.write_text("<?php ini_set('error_log',"+repr(str(log))+");require "+repr(str(ROOT/'account/core.php'))+";try{api('/rest/v1/rpc/business_quote_write?token=PRIVATESECRET',['email'=>'PRIVATE@example.test']);}catch(Throwable $e){}")
  subprocess.run([PHP,str(integration)],env=dict(os.environ,FARAIOS_ACCOUNT_DIR=str(cfgdir)),check=True,capture_output=True);outage.shutdown();outage.server_close()
  self.assertNotIn('PRIVATESECRET',log.read_text());self.assertNotIn('PRIVATE@example.test',log.read_text());self.assertNotIn('PRIVATE backend payload',log.read_text())
  private_log=next((cfgdir/'ops-preview').glob('events-*.jsonl'))
  self.assertIn('"status":503',private_log.read_text());self.assertNotIn('PRIVATE',private_log.read_text())
  # A separate direct PHP error proves fatal output event omits exception message and path.
  fatal=Path(self.tmp.name)/'fatal.php';fatal.write_text(script.split("ops_event($c,'upstream_failure'")[0]+"throw new RuntimeException('PRIVATE sensitive payload');")
  subprocess.run([PHP,str(fatal)],capture_output=True)
  self.assertNotIn('PRIVATE sensitive payload',log.read_text())
  structured=[json.loads(x[x.index('{'):]) for x in log.read_text().splitlines() if 'faraios.ops.v1' in x]
  self.assertTrue(any(x['event']=='php_fatal' for x in structured));self.assertTrue(all('PRIVATE' not in json.dumps(x) for x in structured))
  check=subprocess.run([PHP,str(ROOT/'scripts/operations-check.php'),'--file='+str(log)],capture_output=True,text=True)
  self.assertEqual(check.returncode,1);summary=json.loads(check.stdout);self.assertGreater(summary['counts']['php_fatal'],0);self.assertNotIn('PRIVATE',check.stdout)
  missing=subprocess.run([PHP,str(ROOT/'scripts/operations-check.php'),'--file=/missing'],capture_output=True,text=True);self.assertEqual(missing.returncode,2);self.assertEqual(json.loads(missing.stdout)['state'],'unknown')
 def test_private_sink_and_monitor(self):
  import datetime,threading
  from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
  class Probe(BaseHTTPRequestHandler):
   broken=False
   def log_message(self,*a):pass
   def do_GET(self):
    body=b'{"name":"GoTrue"}' if self.path=='/auth/v1/health' else b'Sign in'
    self.send_response(503 if self.broken else 200);self.end_headers();self.wfile.write(body)
  server=ThreadingHTTPServer(('127.0.0.1',0),Probe);threading.Thread(target=server.serve_forever,daemon=True).start()
  try:
   root=Path(self.tmp.name)/'monitor-private';root.mkdir();base='http://127.0.0.1:'+str(server.server_port)
   config="['enabled'=>true,'environment'=>'test','base_url'=>"+repr(base+'/preview')+",'supabase_url'=>"+repr(base)+",'publishable_key'=>'PRIVATEKEY']"
   (root/'config.php').write_text('<?php return '+config+';')
   fixture=root/'seed.php';fixture.write_text('<?php require '+repr(str(ROOT/'account/observability.php'))+';$c='+config+";$c['_ops_root']="+repr(str(root))+";ops_install($c);ops_event($c,'monitor_canary','PRIVATE@example.test TOKEN',200);")
   subprocess.run([PHP,str(fixture)],check=True,capture_output=True)
   directory=root/'ops-preview';log=next(directory.glob('events-*'));self.assertEqual(directory.stat().st_mode&0o777,0o700);self.assertEqual(log.stat().st_mode&0o777,0o600);self.assertNotIn('PRIVATE',log.read_text());self.assertNotIn('TOKEN',log.read_text())
   def monitor():return subprocess.run([PHP,str(ROOT/'scripts/operations-monitor.php'),'--config-dir='+str(root)],capture_output=True,text=True)
   result=monitor();self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(json.loads(result.stdout)['state'],'healthy');self.assertNotIn('PRIVATE',result.stdout)
   Probe.broken=True;result=monitor();self.assertEqual(result.returncode,1);self.assertEqual(json.loads(result.stdout)['state'],'attention')
   Probe.broken=False;self.assertEqual(monitor().returncode,0)
   heartbeat=directory/'application-heartbeat.json';heartbeat.write_text('{"time":"2000-01-01T00:00:00Z"}')
   result=monitor();self.assertEqual(result.returncode,2);self.assertEqual(json.loads(result.stdout)['state'],'unknown')
   # Rotation is bounded and removes only old matching event files.
   old=directory/('events-'+(datetime.date.today()-datetime.timedelta(days=20)).strftime('%Y%m%d')+'.jsonl');old.write_text('synthetic')
   unrelated=directory/'keep.txt';unrelated.write_text('keep')
   log.write_text('x'*1048576);subprocess.run([PHP,str(fixture)],check=True,capture_output=True);self.assertTrue(Path(str(log)+'.1').exists());self.assertFalse(old.exists());self.assertTrue(unrelated.exists());self.assertLess(log.stat().st_size,8192)
   # A malicious pre-existing log symlink must never be followed.
   target=root/'untouched';target.write_text('sentinel');log.unlink();log.symlink_to(target)
   subprocess.run([PHP,str(fixture)],capture_output=True);self.assertEqual(target.read_text(),'sentinel')
   # CLI rejects missing config and a live configuration.
   (root/'config.php').write_text("<?php return ['enabled'=>true,'base_url'=>'https://www.faraios.com','environment'=>'live'];")
   self.assertEqual(monitor().returncode,2)
  finally:server.shutdown();server.server_close()
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Observability('test_events'),Observability('test_private_sink_and_monitor')]));raise SystemExit(not r.wasSuccessful())
