<?php
require __DIR__.'/../account/platform-monitoring.php';
$now=strtotime('2026-11-18T13:00:00Z');$n=0;
function ok($v,$m){global $n;if(!$v)throw new RuntimeException($m);$n++;}
function runFixture($id,$file,$at,$status='completed',$conclusion='success'){return ['id'=>$id,'head_branch'=>'main','path'=>'.github/workflows/'.$file,'created_at'=>$at,'status'=>$status,'conclusion'=>$conclusion,'token'=>'SECRET'];}
$s=['runs'=>['workflow_runs'=>[runFixture(3,'operations-watchdog.yml','2026-11-18T12:55:00Z'),runFixture(2,'database-backup.yml','2026-11-18T08:17:00Z'),runFixture(1,'database-backup-health.yml','2026-11-18T12:43:00Z')]],'backup_artifacts'=>['run_id'=>2,'artifacts'=>[['name'=>'faraios-encrypted-backup-2','expired'=>false,'size_in_bytes'=>50,'expires_at'=>'2026-12-18T12:00:00Z']]],'preview'=>['schema'=>'faraios.ops.monitor.v1','environment'=>'preview','time'=>'2026-11-18T12:59:00Z','state'=>'healthy','page_available'=>true,'auth_available'=>true,'partial_logs'=>false,'application_heartbeat_recent'=>true,'counts'=>['upstream_failure'=>0,'workflow_failure'=>0,'php_fatal'=>0],'token'=>'SECRET'],'tracker'=>['tasks'=>[['id'=>'V1-014','status'=>'In progress','updated_at'=>'2026-11-18T12:00:00Z','checks'=>[['done'=>true],['done'=>true],['done'=>false]],'notes'=>'SECRET'],['id'=>'V1-023','status'=>'Verified','updated_at'=>'2026-11-17T12:00:00Z','checks'=>[['done'=>true]]]]]];
$p=PlatformMonitoring::project($s,$now);ok(array_column($p['workflows'],'state')===['Passed','Passed','Passed'],'fresh workflows');ok($p['preview']['state']==='Passed','preview projection');ok(!$p['recovery'][1]['verified']&&$p['recovery'][0]['verified'],'component not full recovery');ok(!str_contains(json_encode($p),'SECRET'),'redaction');ok($p['failure_count']===0&&$p['sample_size']===3,'bounded counts');
$x=$s;$x['runs']['workflow_runs'][0]['created_at']='2026-11-18T10:00:00Z';ok(PlatformMonitoring::project($x,$now)['workflows'][0]['state']==='Stale','stale success');
foreach(['failure','timed_out','action_required','startup_failure'] as $c){$x=$s;$x['runs']['workflow_runs'][0]['conclusion']=$c;$p=PlatformMonitoring::project($x,$now);ok($p['workflows'][0]['state']==='Failed'&&$p['failure_count']===1,'failure '.$c);}
foreach(['cancelled','skipped','neutral'] as $c){$x=$s;$x['runs']['workflow_runs'][0]['conclusion']=$c;ok(PlatformMonitoring::project($x,$now)['workflows'][0]['state']==='Not successful','not success '.$c);}
$x=$s;$x['runs']['workflow_runs'][0]['status']='in_progress';$x['runs']['workflow_runs'][0]['conclusion']=null;ok(PlatformMonitoring::project($x,$now)['workflows'][0]['state']==='Running / queued','pending not success');
$x=$s;$x['backup_artifacts']['artifacts'][0]['expired']=true;ok(PlatformMonitoring::project($x,$now)['workflows'][1]['state']==='Evidence missing','expired artifact');
$x=$s;unset($x['backup_artifacts']);ok(PlatformMonitoring::project($x,$now)['workflows'][1]['state']==='Unknown','artifact unavailable');
$x=$s;$x['backup_artifacts']['artifacts'][0]['expires_at']='2026-11-17T12:00:00Z';ok(PlatformMonitoring::project($x,$now)['workflows'][1]['state']==='Evidence missing','expiry checked');
$x=$s;$x['backup_artifacts']['run_id']=9;ok(PlatformMonitoring::project($x,$now)['workflows'][1]['state']==='Unknown','artifact must match run');
$x=$s;$x['preview']['time']='2026-11-18T12:00:00Z';ok(PlatformMonitoring::project($x,$now)['preview']['state']==='Stale','preview stale');
foreach(['partial_logs','application_heartbeat_recent'] as $k){$x=$s;$x['preview'][$k]=$k==='partial_logs';ok(PlatformMonitoring::project($x,$now)['preview']['state']==='Unknown','incomplete preview '.$k);}
$x=$s;$x['preview']['counts']['php_fatal']=1;ok(PlatformMonitoring::project($x,$now)['preview']['state']==='Attention','fatal event');
foreach(['preview','runs','tracker'] as $k){$x=$s;unset($x[$k]);$p=PlatformMonitoring::project($x,$now);ok($k==='preview'?$p['preview']['state']==='Unknown':($k==='runs'?!$p['runs_known']:!$p['recovery'][0]['verified']),'missing '.$k);}
foreach(['2026-02-30T12:00:00Z','2026-11-19T12:00:00Z','garbage'] as $date)ok(PlatformMonitoring::instant($date,$now)===null,'invalid date');
$x=$s;$x['runs']['workflow_runs']=array_fill(0,51,$s['runs']['workflow_runs'][0]);ok(!PlatformMonitoring::project($x,$now)['runs_known'],'oversized sample');
$x=$s;$x['runs']['workflow_runs'][0]['path']='https://evil.invalid';ok(!PlatformMonitoring::project($x,$now)['runs_known'],'invalid source');
$x=$s;$x['runs']['workflow_runs']=[runFixture(90,'database-restore-check.yml','2026-11-18T12:59:00Z')];$x['tracker']=[];ok(!PlatformMonitoring::project($x,$now)['recovery'][0]['verified'],'monitor-only restore workflow cannot prove restore');
$calls=0;$api=new PlatformMonitoring(function($m){if($m!=='GET')throw new PlatformDirectoryError(405,'Read only');},function()use(&$calls,$s){$calls++;return $s;},fn()=>$now);
foreach(['POST','DELETE','PUT'] as $method){try{$api->read($method,[]);throw new Exception('allowed');}catch(PlatformDirectoryError $e){ok($e->status===405,'method denial');}}
try{$api->read('GET',['url'=>'https://evil.invalid']);throw new Exception('allowed');}catch(PlatformDirectoryError $e){ok($e->status===400&&$calls===0,'query no source fetch');}
foreach([401,403,503] as $status){$api=new PlatformMonitoring(function()use($status){throw new PlatformDirectoryError($status,'denied');},function()use(&$calls){$calls++;return [];},fn()=>$now);try{$api->read('GET',[]);}catch(PlatformDirectoryError $e){ok($e->status===$status&&$calls===0,'gate no data');}}
require __DIR__.'/../account/platform-monitoring-sources.php';
try{platform_monitor_github('https://evil.invalid');throw new Exception('allowed');}catch(RuntimeException $e){ok(true,'fixed endpoint');}
$f=tempnam(sys_get_temp_dir(),'monitor');file_put_contents($f,'{"secret":"SECRET"}');try{platform_monitor_json($f,2);throw new Exception('allowed');}catch(RuntimeException $e){ok(true,'bounded file');}unlink($f);
echo json_encode(['status'=>'PASS','assertions'=>$n,'network_calls'=>0]);
