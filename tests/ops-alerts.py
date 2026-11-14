"""Offline operational mail checks: privacy, retries, suppression, concurrency and scope."""
import json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PHP=os.environ.get('PHP_BIN','php')
class OpsAlerts(unittest.TestCase):
 def run_php(self,body):
  with tempfile.TemporaryDirectory() as d:
   script=Path(d)/'case.php'
   script.write_text('<?php require '+repr(str(ROOT/'notifications/ops-alerts.php'))+'; $dir='+repr(d)+";function check($b){if(!$b)throw new RuntimeException('assertion failed');}"+body)
   p=subprocess.run([PHP,str(script)],capture_output=True,text=True)
   self.assertEqual(p.returncode,0,p.stdout+p.stderr)
 def test_transitions_privacy_and_retry(self):
  self.run_php("""
  $now=1800000000;$sent=[];$fail=false;
  $send=function($m,$k)use(&$sent,&$fail){$sent[]=[$m,$k];return $fail?['status'=>0]:['status'=>200,'body'=>['id'=>'synthetic-id']];};
  $r=['schema'=>'faraios.ops.monitor.v1','environment'=>'preview','time'=>gmdate('c',$now),'state'=>'healthy','secret'=>'CUSTOMER SECRET'];
  check(ops_alert_dispatch($dir,$r,$send,false,$now)['state']==='quiet');check(count($sent)===0);
  $r['state']='attention';$fail=true;
  check(ops_alert_dispatch($dir,$r,$send,false,$now)['state']==='send_failed');
  check(ops_alert_dispatch($dir,$r,$send,false,$now+1)['state']==='retry_wait');check(count($sent)===1);
  $fail=false;check(ops_alert_dispatch($dir,$r,$send,false,$now+300)['alert_sent']);check($sent[0]===$sent[1]);
  check(ops_alert_dispatch($dir,$r,$send,false,$now+301)['state']==='suppressed');
  $r['time']=gmdate('c',$now+3900);check(ops_alert_dispatch($dir,$r,$send,false,$now+3900)['alert_sent']);
  $r['state']='healthy';check(ops_alert_dispatch($dir,$r,$send,false,$now+3901)['alert_sent']);
  check(ops_alert_dispatch($dir,$r,$send,false,$now+3902)['state']==='quiet');
  check(ops_alert_dispatch($dir,[],$send,true,$now+4000)['alert_sent']);
  check(ops_alert_dispatch($dir,[],$send,true,$now+4001)['state']==='already_verified');
  foreach($sent as [$m,$k]){check($m['to']===['alerts@faraios.com']);check($m['from']==='FaraiOS <notifications@notify.faraios.com>');check(!str_contains(json_encode($m),'CUSTOMER'));}
  check((fileperms($dir.'/alert-state.json')&0777)===0600);check((fileperms($dir.'/alert.lock')&0777)===0600);
  // Wrong environment, stale evidence and future timestamps cannot claim recovery.
  $r['environment']='live';check(ops_alert_dispatch($dir,$r,$send,false,$now+4010)['alert_sent']);
  check(str_contains($sent[count($sent)-1][0]['subject'],'needs attention'));
  """)
 def test_hard_failure_expiry_and_symlinks(self):
  self.run_php("""
  $now=time();$count=0;$send=function($m,$k)use(&$count){$count++;return ['status'=>403];};
  check(ops_alert_dispatch($dir,[],$send,true,$now)['state']==='send_failed');
  check(ops_alert_dispatch($dir,[],$send,true,$now+3600)['state']==='requires_review');check($count===1);
  unlink($dir.'/alert-state.json');$send=function($m,$k)use(&$count){$count++;throw new RuntimeException('SECRET');};
  check(ops_alert_dispatch($dir,[],$send,true,$now)['state']==='send_failed');
  check(ops_alert_dispatch($dir,[],$send,true,$now+82800)['state']==='requires_review');check($count===2);
  unlink($dir.'/alert-state.json');file_put_contents($dir.'/untouched','preserved');symlink($dir.'/untouched',$dir.'/alert-state.json');
  $blocked=false;try{ops_alert_dispatch($dir,[],$send,true);}catch(Throwable $e){$blocked=true;}check($blocked);check(file_get_contents($dir.'/untouched')==='preserved');
  """)
  with tempfile.TemporaryDirectory() as d:
   config=Path(d)/'config.php';config.write_text("<?php return ['enabled'=>true,'environment'=>'live','base_url'=>'https://www.faraios.com'];")
   p=subprocess.run([PHP,str(ROOT/'scripts/operations-monitor.php'),'--config-dir='+d,'--test-alert'],capture_output=True,text=True)
   self.assertEqual(p.returncode,2);self.assertNotIn('SECRET',p.stderr)
 def test_concurrent_test_sends_once(self):
  with tempfile.TemporaryDirectory() as d:
   script=Path(d)/'race.php';script.write_text('<?php require '+repr(str(ROOT/'notifications/ops-alerts.php'))+';ops_alert_dispatch('+repr(d)+",[],function($m,$k){file_put_contents("+repr(d+'/calls')+",'sent\\n',FILE_APPEND);usleep(100000);return ['status'=>200,'body'=>['id'=>'synthetic-id']];},true);")
   jobs=[subprocess.Popen([PHP,str(script)],stdout=subprocess.PIPE,stderr=subprocess.PIPE) for _ in range(4)]
   for job in jobs:
    out,err=job.communicate();self.assertEqual(job.returncode,0,out+err)
   self.assertEqual((Path(d)/'calls').read_text(),'sent\\n')
if __name__=='__main__':unittest.main()
