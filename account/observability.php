<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
// No content, paths, URLs, tokens, email, business IDs or exception messages enter these events.
function ops_preview(array $c): bool {
 $path=parse_url((string)($c['base_url']??''),PHP_URL_PATH)?:'';
 return $path==='/_accounts-preview'||(($c['environment']??'')==='test'&&$path==='/preview');
}
function ops_event(array $c,string $event,string $operation,int $status): void {
 if(!ops_preview($c)||!in_array($event,['upstream_failure','workflow_failure','php_fatal','monitor_canary'],true))return;
 if(!in_array($operation,['auth','invoice','quote','booking','enquiry','publication','other','php'],true))$operation='other';
 static $id=null;$id??=bin2hex(random_bytes(12));
 $record=['schema'=>'faraios.ops.v1','time'=>gmdate('c'),'environment'=>'preview','event'=>$event,'operation'=>$operation,'status'=>$status>=0&&$status<=599?$status:0,'request_id'=>$id];
 $line=json_encode($record,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
 if(isset($c['_ops_root'])){if(!ops_private_write($c,$line))error_log('{"schema":"faraios.ops.v1","environment":"preview","event":"sink_unavailable"}');}
 else error_log($line);
}
function ops_operation(string $path): string {
 if(str_starts_with($path,'/auth/'))return 'auth';
 foreach(['invoice','quote','booking','enquiry'] as $name)if(str_starts_with($path,'/rest/v1/rpc/business_'.$name.'_'))return $name;
 if(str_starts_with($path,'/rest/v1/rpc/business_profile_')||str_starts_with($path,'/rest/v1/rpc/business_services_'))return 'publication';
 return 'other';
}
function ops_install(array $c): void {
 if(!ops_preview($c))return;
 if(isset($c['_ops_root']))ops_private_heartbeat($c);
 set_exception_handler(static function(Throwable $e)use($c):void{ops_event($c,'php_fatal','php',500);if(PHP_SAPI!=='cli'){http_response_code(500);header('Cache-Control: no-store');}echo 'Service temporarily unavailable. Please try again.';});
 register_shutdown_function(static function()use($c):void{$e=error_get_last();if($e&&in_array($e['type'],[E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR],true))ops_event($c,'php_fatal','php',500);});
}

// Only the validated private configuration directory supplies this path.
function ops_private_dir(array $c): ?string {
 if(!ops_preview($c))return null;
 $root=realpath((string)($c['_ops_root']??''));$web=realpath(dirname(__DIR__));
 if(!$root||!is_dir($root)||$root===$web||str_starts_with($root,$web.'/'))return null;
 $dir=$root.'/ops-preview';
 if(is_link($dir)||(!is_dir($dir)&&!@mkdir($dir,0700)))return null;
 if(!@chmod($dir,0700)||!is_writable($dir))return null;
 return $dir;
}
function ops_lock(string $dir) {
 $path=$dir.'/write.lock';if(is_link($path))return false;
 $lock=@fopen($path,'c');if(!$lock)return false;@chmod($path,0600);
 if(!flock($lock,LOCK_EX)){fclose($lock);return false;}return $lock;
}
function ops_private_write(array $c,string $line): bool {
 $dir=ops_private_dir($c);if(!$dir||!($lock=ops_lock($dir)))return false;
 try{
  $file=$dir.'/events-'.gmdate('Ymd').'.jsonl';
  if(is_link($file)||is_link($file.'.1'))return false;
  clearstatcache(true,$file);
  if(is_file($file)&&filesize($file)>=1048576){if(is_file($file.'.1'))@unlink($file.'.1');if(!@rename($file,$file.'.1'))return false;}
  if(@file_put_contents($file,$line."\n",FILE_APPEND)===false)return false;@chmod($file,0600);
  foreach(glob($dir.'/events-*')?:[] as $old){
   if(preg_match('/^events-([0-9]{8})\.jsonl(?:\.1)?$/',basename($old),$m)&&$m[1]<gmdate('Ymd',time()-13*86400)&&!is_link($old))@unlink($old);
  }
  return true;
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}
function ops_private_heartbeat(array $c): bool {
 $dir=ops_private_dir($c);if(!$dir||!($lock=ops_lock($dir)))return false;
 try{
  $file=$dir.'/application-heartbeat.json';if(is_link($file))return false;
  clearstatcache(true,$file);if(is_file($file)&&time()-filemtime($file)<60)return true;
  $ok=@file_put_contents($file,json_encode(['schema'=>'faraios.ops.heartbeat.v1','environment'=>'preview','time'=>gmdate('c')]))!==false;
  if($ok)@chmod($file,0600);return $ok;
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}
