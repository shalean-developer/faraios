<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/account/observability.php';
// No customer dispatch, queue updates, raw log output, recipient lookup or credential output.
try{
 $o=getopt('',['config-dir:','canary','status-only','alerts','test-alert','mail-config:']);$root=realpath((string)($o['config-dir']??''));$web=realpath(dirname(__DIR__));
 if(!$root||$root===$web||str_starts_with($root,$web.'/')||!is_file($root.'/config.php'))throw new RuntimeException();
 $_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$_SERVER['REQUEST_URI']='/_accounts-preview/account/index.php?page=signin';
 $c=require $root.'/config.php';if(!is_array($c)||!($c['enabled']??false)||!ops_preview($c))throw new RuntimeException();
 if(($c['environment']??'')!=='test'&&(($c['base_url']??'')!=='https://www.faraios.com/_accounts-preview'||($c['supabase_url']??'')!=='https://rxelmugnucfajrqmphhe.supabase.co'))throw new RuntimeException();
 $c['_ops_root']=$root;$dir=ops_private_dir($c);if(!$dir)throw new RuntimeException();
 if(isset($o['test-alert'])){require dirname(__DIR__).'/notifications/ops-alerts.php';$result=ops_alert_dispatch($dir,[],ops_alert_transport((string)($o['mail-config']??'/var/www/vhosts/shalean.com/private/faraios-enquiry-mail/config.php')),true);echo json_encode($result)."\n";exit(in_array($result['state'],['accepted','already_verified'],true)?0:2);}
 if(isset($o['canary'])){if(!ops_event($c,'monitor_canary','other',200))throw new RuntimeException();echo '{"state":"private_canary_stored","environment":"preview"}'."\n";exit(0);}
 $page=false;$auth=false;
 if(!isset($o['status-only'])){
  $fetch=static function(string $url,array $headers=[]): array {
   $raw=@file_get_contents($url,false,stream_context_create(['http'=>['method'=>'GET','header'=>implode("\r\n",$headers),'timeout'=>15,'ignore_errors'=>true,'follow_location'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]));
   preg_match('/\s(\d{3})\s/',$http_response_header[0]??'',$m);return [(int)($m[1]??0),$raw?:''];
  };
  [$code,$html]=$fetch($c['base_url'].'/account/index.php?page=signin');$page=$code===200&&str_contains($html,'Sign in');
  [$code,$raw]=$fetch($c['supabase_url'].'/auth/v1/health',['apikey: '.(string)($c['publishable_key']??'')]);$data=json_decode($raw,true);$auth=$code===200&&is_array($data)&&isset($data['name']);
 }
 $counts=['upstream_failure'=>0,'workflow_failure'=>0,'php_fatal'=>0];$now=time();$partial=false;
 foreach(glob($dir.'/events-*')?:[] as $file){
  if(!preg_match('/^events-[0-9]{8}\.jsonl(?:\.1)?$/',basename($file))||is_link($file))continue;
  if(filesize($file)>1056768){$partial=true;continue;}
  $stream=@fopen($file,'rb');if(!$stream){$partial=true;continue;}
  while(($line=fgets($stream,8192))!==false){$r=json_decode($line,true);if(!is_array($r)||($r['schema']??'')!=='faraios.ops.v1'||($r['environment']??'')!=='preview'||!array_key_exists($r['event']??'',$counts))continue;$at=strtotime((string)($r['time']??''));if($at!==false&&$at<=$now+60&&$at>=$now-900)$counts[$r['event']]++;}fclose($stream);
 }
 $beat=$dir.'/application-heartbeat.json';$heartbeat=is_file($beat)&&!is_link($beat)?json_decode(file_get_contents($beat),true):null;
 $at=is_array($heartbeat)?strtotime((string)($heartbeat['time']??'')):false;$recent=($heartbeat['schema']??'')==='faraios.ops.heartbeat.v1'&&($heartbeat['environment']??'')==='preview'&&$at!==false&&$at<=$now+60&&$at>=$now-600;
 $state=$partial||!$recent||isset($o['status-only'])?'unknown':(($counts['php_fatal']>0||array_sum($counts)>=5||!$page||!$auth)?'attention':'healthy');
 $report=['schema'=>'faraios.ops.monitor.v1','time'=>gmdate('c'),'environment'=>'preview','state'=>$state,'page_available'=>$page,'auth_available'=>$auth,'application_heartbeat_recent'=>$recent,'counts'=>$counts,'partial_logs'=>$partial,'alert_sent'=>false];
 $lock=ops_lock($dir);if(!$lock)throw new RuntimeException();
 try{if(is_link($dir.'/monitor-state.json')||file_put_contents($dir.'/monitor-state.json',json_encode($report))===false)throw new RuntimeException();chmod($dir.'/monitor-state.json',0600);}finally{flock($lock,LOCK_UN);fclose($lock);}
 if(isset($o['alerts'])){require dirname(__DIR__).'/notifications/ops-alerts.php';$result=ops_alert_dispatch($dir,$report,ops_alert_transport((string)($o['mail-config']??'/var/www/vhosts/shalean.com/private/faraios-enquiry-mail/config.php')));$report['alert_sent']=$result['alert_sent'];$report['alert_state']=$result['state'];}
 echo json_encode($report)."\n";exit($state==='healthy'?0:($state==='attention'?1:2));
}catch(Throwable $e){fwrite(STDERR,"Private preview monitoring unavailable; check configuration and filesystem access.\n");exit(2);}
