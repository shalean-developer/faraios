<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require __DIR__.'/private_config.php';
function watchdog_decision(array $current,array $previous,int $now): string {
 if($current['state']==='healthy')return ($previous['notified_state']??'healthy')==='attention'?'recovery':'quiet';
 return ($previous['notified_state']??'')!=='attention'||$now-(int)($previous['sent_at']??0)>=3600?'attention':'suppressed';
}
if(realpath($_SERVER['SCRIPT_FILENAME']??'')!==__FILE__)return;
try{
 $o=getopt('',['bundle:','restored:','report:','test-notification']);$bundle=$o['bundle'];$root=$o['restored'];$now=time();
 $receipt=json_decode(file_get_contents($bundle.'/receipt.json'),true,32,JSON_THROW_ON_ERROR);
 if(($receipt['status']??'')!=='private_configuration_restored'||($receipt['hashes_match']??false)!==true)throw new RuntimeException();
 $previous=is_file($bundle.'/monitor-state.json')?json_decode(file_get_contents($bundle.'/monitor-state.json'),true):[];
 $fetch=static function(string $url,array $headers=[]) : array {
  $args=['curl','--silent','--show-error','--proto','=https','--max-time','12','--max-filesize','2097152','--user-agent','Mozilla/5.0 (compatible; FaraiOSOperationsMonitor/1.0)','--header','Accept: text/html,application/json','--write-out',"\n%{http_code}"];
  foreach($headers as $header){$args[]='--header';$args[]=$header;}$args[]=$url;
  $p=proc_open($args,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
  if(!is_resource($p))return [0,''];fclose($pipes[0]);$raw=stream_get_contents($pipes[1]);fclose($pipes[1]);stream_get_contents($pipes[2]);fclose($pipes[2]);$exit=proc_close($p);
  if($exit!==0||!preg_match('/\n(\d{3})$/',$raw,$m))return [0,''];return [(int)$m[1],substr($raw,0,-4)];
 };
 [$homeCode,$raw]=$fetch('https://www.faraios.com/');$home=$homeCode===200&&str_contains($raw,'FaraiOS');
 [$previewCode,$raw]=$fetch('https://www.faraios.com/_accounts-preview/account/index.php?page=signin');$preview=$previewCode===200&&str_contains($raw,'Sign in');
 $config=file_get_contents($root.'/faraios-account/production.php');
 if(!preg_match('/[\'"]publishable_key[\'"]\s*=>\s*[\'"]([A-Za-z0-9_.-]{20,700})[\'"]/',$config,$m))throw new RuntimeException();
 [$code,$raw]=$fetch('https://rxelmugnucfajrqmphhe.supabase.co/auth/v1/health',['apikey: '.$m[1]]);$data=json_decode($raw,true);$auth=$code===200&&is_array($data)&&isset($data['name']);unset($config,$m,$raw,$data);
 $backup=json_decode(getenv('BACKUP_HEALTH_JSON')?:'{}',true);$backupOk=($backup['backup']??'')==='ok'&&($backup['restore']??'')==='ok';
 $captured=strtotime((string)($receipt['captured_utc']??''));$fresh=$captured!==false&&$captured<=$now+60&&$captured>=$now-30*86400;
 $r=['schema'=>'faraios.external-monitor.v1','time'=>gmdate('c'),'state'=>$home&&$preview&&$auth&&$backupOk&&$fresh?'healthy':'attention','home_available'=>$home,'home_status'=>$homeCode,'preview_available'=>$preview,'preview_status'=>$previewCode,'auth_available'=>$auth,'auth_status'=>$code,'backup_restore_healthy'=>$backupOk,'configuration_copy_recent'=>$fresh,'alert_sent'=>false];
 $decision=watchdog_decision($r,$previous,$now);$id='faraios-external/'.getenv('GITHUB_RUN_ID');
 if(isset($previous['pending'])){
  if($now-(int)$previous['pending']['created_at']>=82800)throw new RuntimeException();
  $decision=$previous['pending']['decision'];$id=$previous['pending']['id'];
 }
 if(isset($o['test-notification'])&&!($previous['test_notification_sent']??false)){
  pc_smtp(pc_mail_key($root),'FaraiOS operations need attention','TEST: the independent FaraiOS host-down alert route works from a recovery runner using the restored SMTP credential. No outage was induced and no customer action occurred.',$id.'/test');$previous['test_notification_sent']=true;$r['test_alert_sent']=true;
 }
 if(in_array($decision,['attention','recovery'],true)){
  if(!isset($previous['pending'])){$id='faraios-external/'.bin2hex(random_bytes(16));$previous['pending']=['decision'=>$decision,'id'=>$id,'created_at'=>$now];pc_write($bundle.'/monitor-state.json',json_encode($previous));}
  $subject=$decision==='recovery'?'FaraiOS operations recovered':'FaraiOS operations need attention';
  pc_smtp(pc_mail_key($root),$subject,$decision==='recovery'?'The independent FaraiOS page/Auth/backup checks have recovered.':'The independent FaraiOS monitor reports a failed page, Auth, backup or configuration-freshness check. Review the private operations report and GitHub Actions. No customer data is included.',$id.'/'.$decision);
  unset($previous['pending']);$previous['notified_state']=$decision==='recovery'?'healthy':'attention';$previous['sent_at']=$now;$r['alert_sent']=true;
 }
 $r['alert_decision']=$decision;pc_write($bundle.'/monitor-state.json',json_encode($previous));pc_write($o['report'],json_encode($r));echo json_encode($r)."\n";exit($r['state']==='healthy'?0:1);
}catch(Throwable $e){fwrite(STDERR,"Independent operations check unavailable; private configuration/provider output suppressed.\n");exit(2);}
