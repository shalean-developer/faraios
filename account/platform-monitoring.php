<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(404);exit;}
require_once __DIR__.'/platform-directory.php';
final class PlatformMonitoring {
 public const WORKFLOWS=['operations-watchdog.yml'=>['Independent availability checks',3600],'database-backup.yml'=>['Encrypted database backup',43200],'database-backup-health.yml'=>['Backup and restore heartbeat',10800]];
 public function __construct(private readonly Closure $gate,private readonly Closure $sources,private readonly Closure $clock){}
 public function read(string $method,array $query):array{
  ($this->gate)($method);
  if($query!==[])throw new PlatformDirectoryError(400,'Check the monitoring address.');
  try{return self::project(($this->sources)(),($this->clock)());}catch(Throwable $e){throw new PlatformDirectoryError(503,'Monitoring sources are unavailable. Try again later.');}
 }
 public static function instant(mixed $v,int $now):?int{
  if(!is_string($v)||!preg_match('/\A\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|\+00:00)\z/D',$v))return null;
  try{$d=new DateTimeImmutable($v);return DateTimeImmutable::getLastErrors()===false&&$d->getTimestamp()<=$now+30?$d->getTimestamp():null;}catch(Throwable $e){return null;}
 }
 public static function run(mixed $r,int $now):?array{
  if(!is_array($r)||!is_int($r['id']??null)||$r['id']<1||($r['head_branch']??'')!=='main'||!is_string($r['path']??null)||!preg_match('~\A\.github/workflows/([a-z0-9-]+\.yml)\z~D',$r['path'],$m))return null;
  $at=self::instant($r['created_at']??null,$now);if($at===null)return null;
  if(!in_array($r['status']??null,['completed','queued','in_progress','waiting','requested','pending'],true))return null;
  $c=$r['conclusion']??null;if($r['status']==='completed'&&!in_array($c,['success','failure','cancelled','timed_out','action_required','neutral','skipped','stale','startup_failure'],true))return null;
  return ['id'=>$r['id'],'workflow'=>$m[1],'at'=>gmdate('Y-m-d\TH:i:s\Z',$at),'epoch'=>$at,'status'=>$r['status'],'conclusion'=>$c];
 }
 public static function project(array $s,int $now):array{
  $runs=[];$valid=is_array($s['runs']['workflow_runs']??null)&&array_is_list($s['runs']['workflow_runs'])&&count($s['runs']['workflow_runs'])<=50;
  if($valid){foreach($s['runs']['workflow_runs'] as $raw){$r=self::run($raw,$now);if($r===null){$valid=false;break;}$runs[]=$r;}}
  if(!$valid)$runs=[];usort($runs,fn($a,$b)=>($b['epoch']<=>$a['epoch'])?:($b['id']<=>$a['id']));
  $out=['observed_at'=>gmdate('Y-m-d\TH:i:s\Z',$now),'workflows'=>[],'runs_known'=>$valid,'sample_size'=>count($runs),'failures'=>[],'preview'=>['state'=>'Unknown','at'=>null,'counts'=>null],'recovery'=>[]];
  foreach(self::WORKFLOWS as $file=>[$label,$max]){
   $rows=array_values(array_filter($runs,fn($r)=>$r['workflow']===$file));$latest=$rows[0]??null;$success=null;foreach($rows as $r)if($r['status']==='completed'&&$r['conclusion']==='success'){$success=$r;break;}
   $state='Unknown';if($latest){$state=$latest['status']!=='completed'?'Running / queued':($latest['conclusion']==='success'?'Passed':(in_array($latest['conclusion'],['failure','timed_out','action_required','startup_failure'],true)?'Failed':'Not successful'));if($now-$latest['epoch']>$max)$state='Stale';}
   $retained=null;
   if($file==='database-backup.yml'&&$success){
    $a=$s['backup_artifacts']??null;
    if(is_array($a)&&($a['run_id']??null)===$success['id']&&is_array($a['artifacts']??null)&&count($a['artifacts'])<=30){
     $retained=false;foreach($a['artifacts'] as $artifact)if(($artifact['name']??'')==='faraios-encrypted-backup-'.$success['id']&&($artifact['expired']??null)===false&&is_int($artifact['size_in_bytes']??null)&&$artifact['size_in_bytes']>0&&($expiry=self::instant($artifact['expires_at']??null,PHP_INT_MAX))!==null&&$expiry>$now)$retained=true;
    }
    if($state==='Passed'&&$retained!==true)$state=$retained===false?'Evidence missing':'Unknown';
   }
   $out['workflows'][]=['label'=>$label,'file'=>$file,'state'=>$state,'latest'=>$latest,'last_success'=>$success,'retained'=>$retained,'max_seconds'=>$max];
  }
  foreach($runs as $r)if($r['status']==='completed'&&in_array($r['conclusion'],['failure','timed_out','action_required','startup_failure'],true))$out['failures'][]=['id'=>$r['id'],'at'=>$r['at'],'label'=>self::WORKFLOWS[$r['workflow']][0]??'Other workflow'];
  $out['failure_count']=count($out['failures']);$out['failures']=array_slice($out['failures'],0,5);
  $p=$s['preview']??[];$at=self::instant($p['time']??null,$now);
  if(($p['schema']??'')==='faraios.ops.monitor.v1'&&($p['environment']??'')==='preview'&&$at!==null){
   $out['preview']['at']=gmdate('Y-m-d\TH:i:s\Z',$at);$counts=$p['counts']??[];$good=true;
   foreach(['upstream_failure','workflow_failure','php_fatal'] as $k)if(!is_int($counts[$k]??null)||$counts[$k]<0||$counts[$k]>1000000)$good=false;
   foreach(['partial_logs','page_available','auth_available','application_heartbeat_recent'] as $k)if(!is_bool($p[$k]??null))$good=false;
   if($good){$out['preview']['counts']=array_intersect_key($counts,array_flip(['upstream_failure','workflow_failure','php_fatal']));$out['preview']['state']=$now-$at>900?'Stale':($p['partial_logs']||!$p['application_heartbeat_recent']||!in_array($p['state']??null,['healthy','attention'],true)?'Unknown':(($p['state']??'')==='attention'||!$p['page_available']||!$p['auth_available']||$counts['php_fatal']>0||array_sum($out['preview']['counts'])>=5?'Attention':'Passed'));}
  }
  foreach(['V1-023'=>'Component recovery acceptance','V1-014'=>'Full incident recovery'] as $id=>$label){
   $t=null;foreach($s['tracker']['tasks']??[] as $row)if(($row['id']??null)===$id){$t=$row;break;}
   $at=self::instant($t['updated_at']??null,$now);$status=is_array($t)&&in_array($t['status']??null,PLATFORM_STATUSES,true)?$t['status']:'Unknown';
   $checks=$t['checks']??null;$accepted=0;$total=0;if(is_array($checks)&&count($checks)<=30){$total=count($checks);foreach($checks as $c)if(($c['done']??null)===true)$accepted++;}
   $out['recovery'][]=['id'=>$id,'label'=>$label,'status'=>$status,'at'=>$at===null?null:gmdate('Y-m-d\TH:i:s\Z',$at),'accepted'=>$accepted,'total'=>$total,'verified'=>$status==='Verified'&&$total>0&&$accepted===$total&&$at!==null];
  }
  return $out;
 }
}
function platform_monitoring():PlatformMonitoring{
 require_once __DIR__.'/platform-monitoring-sources.php';
 return new PlatformMonitoring(static function(string $method):void{platform_directory()->read($method,'businesses',[]);},static fn():array=>platform_monitor_sources(),static fn():int=>time());
}
