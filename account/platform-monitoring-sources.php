<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(404);exit;}
function platform_monitor_json(string $path,int $max):array{
 if(is_link($path)||!is_file($path)||filesize($path)>$max)throw new RuntimeException();
 $raw=file_get_contents($path,false,null,0,$max+1);if($raw===false||strlen($raw)>$max)throw new RuntimeException();
 $d=json_decode($raw,true,128,JSON_THROW_ON_ERROR);if(!is_array($d))throw new RuntimeException();return $d;
}
function platform_monitor_github(string $path):array{
 if(!preg_match('~\Aactions/(?:runs\?branch=main&per_page=50|runs/[1-9][0-9]{0,14}/artifacts\?per_page=30)\z~D',$path))throw new RuntimeException();
 $c=stream_context_create(['http'=>['method'=>'GET','header'=>"User-Agent: FaraiOS-Owner-Monitor/1.0\r\nAccept: application/vnd.github+json",'timeout'=>3,'follow_location'=>0,'ignore_errors'=>true],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
 $f=@fopen('https://api.github.com/repos/shalean-developer/faraios/'.$path,'rb',false,$c);if(!$f)throw new RuntimeException();
 try{$raw=stream_get_contents($f,1048577);$meta=stream_get_meta_data($f);}finally{fclose($f);}
 if(!preg_match('~\AHTTP/\S+ 200\b~',$meta['wrapper_data'][0]??'')||($meta['timed_out']??false)||$raw===false||strlen($raw)>1048576)throw new RuntimeException();
 $d=json_decode($raw,true,64,JSON_THROW_ON_ERROR);if(!is_array($d))throw new RuntimeException();return $d;
}
function platform_monitor_sources():array{
 $s=[];try{$s['runs']=platform_monitor_github('actions/runs?branch=main&per_page=50');}catch(Throwable $e){}
 $rows=$s['runs']['workflow_runs']??[];if(is_array($rows)&&count($rows)<=50){foreach($rows as $raw){$r=PlatformMonitoring::run($raw,time());if($r&&$r['workflow']==='database-backup.yml'&&$r['status']==='completed'&&$r['conclusion']==='success'){try{$s['backup_artifacts']=platform_monitor_github('actions/runs/'.$r['id'].'/artifacts?per_page=30');$s['backup_artifacts']['run_id']=$r['id'];}catch(Throwable $e){}break;}}}
 $root=realpath(getenv('FARAIOS_ACCOUNT_DIR')?:'/var/www/vhosts/shalean.com/private/faraios-account');
 if($root&&$root!==realpath(dirname(__DIR__))&&!str_starts_with($root,realpath(dirname(__DIR__)).'/')){
  try{if(is_link($root.'/ops-preview'))throw new RuntimeException();$s['preview']=platform_monitor_json($root.'/ops-preview/monitor-state.json',16384);}catch(Throwable $e){}
  try{if((cfg()['base_url']??'')!=='https://www.faraios.com')throw new RuntimeException();$dir=$root.'/platform-tracker-'.substr(hash('sha256',cfg()['base_url']),0,12);if(is_link($dir))throw new RuntimeException();$s['tracker']=platform_monitor_json($dir.'/tracker.json',12000000);platform_valid_store($s['tracker']);}catch(Throwable $e){unset($s['tracker']);}
 }
 return $s;
}
