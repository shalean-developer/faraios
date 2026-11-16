<?php
declare(strict_types=1);
const PLATFORM_STATUSES=['To do','In progress','Preview','Accepted','Live','Verified'];
const PLATFORM_KINDS=['Defect','Capability','Verification','Decision','Dashboard','Later'];
const PLATFORM_PRIORITIES=['Critical','High','Normal'];
function platform_authorized(array $u,array $p): bool {
 if(($p['enabled']??false)!==true||empty($u['email_confirmed_at'])||!empty($u['is_anonymous']))return false;
 $id=$u['id']??'';if(!is_string($id)||!preg_match('/\A[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/D',$id))return false;
 // Only an explicitly configured immutable Auth identity grants platform access.
 return in_array($id,$p['owner_ids']??[],true);
}
function platform_settings(): array {
 $dir=realpath(getenv('FARAIOS_ACCOUNT_DIR')?:'/var/www/vhosts/shalean.com/private/faraios-account');
 if(!$dir||!is_file($dir.'/platform-owner.php'))return [];
 $p=require $dir.'/platform-owner.php';return is_array($p)?$p:[];
}
function platform_store_dir(): string {
 $private=realpath(getenv('FARAIOS_ACCOUNT_DIR')?:'/var/www/vhosts/shalean.com/private/faraios-account');
 if(!$private)throw new RuntimeException('Tracker storage is unavailable.');
 $web=realpath(dirname(__DIR__));if($web&&($private===$web||str_starts_with($private,$web.'/')))throw new RuntimeException('Tracker storage must be private.');
 // Separate persisted state for preview and live; no migration of business records.
 $base=parse_url(cfg()['base_url'],PHP_URL_PATH)?:'';
 $dir=$private.'/platform-tracker-'.substr(hash('sha256',cfg()['base_url']),0,12);
 if(!is_dir($dir)&&!mkdir($dir,0700))throw new RuntimeException('Tracker storage is unavailable.');
 if(is_link($dir))throw new RuntimeException('Tracker storage is unavailable.');
 chmod($dir,0700);return $dir;
}
function platform_valid_store(array $s): void {
 if(($s['schema']??null)!==1||!is_int($s['revision']??null)||!is_array($s['tasks']??null)||count($s['tasks'])>2000||!is_array($s['history']??null))throw new RuntimeException('Tracker storage needs recovery.');
}
function platform_load(string $dir): array {
 $path=$dir.'/tracker.json';if(is_link($path))throw new RuntimeException('Tracker storage is unavailable.');
 $s=is_file($path)?json_decode(file_get_contents($path),true,128,JSON_THROW_ON_ERROR):require __DIR__.'/platform-seed.php';platform_valid_store($s);return $s;
}
function platform_text(array $input,string $key,int $max,bool $required=false): string {
 if(!is_string($input[$key]??''))throw new RuntimeException('Check the '.$key.'.');
 $v=trim(str_replace(["\r\n","\r"],"\n",$input[$key]??''));
 if(strlen($v)>$max||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$v)||($required&&strlen($v)<3))throw new RuntimeException('Check the '.$key.'.');return $v;
}
function platform_task(array $in,?array $old,array $all): array {
 $t=$old??['id'=>'TASK-'.strtoupper(bin2hex(random_bytes(5)))];
 foreach(['title'=>160,'summary'=>3000,'notes'=>6000,'evidence_note'=>3000,'evidence_url'=>1000] as $k=>$max)$t[$k]=platform_text($in,$k,$max,$k==='title');
 foreach(['status'=>PLATFORM_STATUSES,'priority'=>PLATFORM_PRIORITIES,'kind'=>PLATFORM_KINDS,'release'=>['v1.0.0','Later']] as $k=>$allowed){if(!is_string($in[$k]??null)||!in_array($in[$k],$allowed,true))throw new RuntimeException('Choose a valid '.$k.'.');$t[$k]=$in[$k];}
 $t['blocking']=isset($in['blocking']);
 if($t['evidence_url']!==''&&(!filter_var($t['evidence_url'],FILTER_VALIDATE_URL)||parse_url($t['evidence_url'],PHP_URL_SCHEME)!=='https'||parse_url($t['evidence_url'],PHP_URL_USER)!==null||parse_url($t['evidence_url'],PHP_URL_PASS)!==null))throw new RuntimeException('Use an HTTPS evidence link without credentials.');
 $lines=array_values(array_filter(array_map('trim',explode("\n",platform_text($in,'checklist',6000))),fn($v)=>$v!==''));
 if(count($lines)>30)throw new RuntimeException('Use up to 30 checklist items.');
 $done=$in['done']??[];if(!is_array($done))throw new RuntimeException('Check the acceptance items.');
 $t['checks']=[];foreach($lines as $i=>$line){if(strlen($line)>300)throw new RuntimeException('Keep checklist items under 300 characters.');$t['checks'][]=['text'=>$line,'done'=>in_array((string)$i,$done,true)&&isset($old['checks'][$i])&&$old['checks'][$i]['text']===$line];}
 $deps=array_values(array_unique(array_filter(array_map('trim',explode(',',platform_text($in,'dependencies',1000))))));
 $ids=array_column($all,'id');foreach($deps as $d)if($d===$t['id']||!in_array($d,$ids,true))throw new RuntimeException('Choose existing task IDs as dependencies.');
 $t['dependencies']=$deps;
 // Reject indirect dependency cycles.
 $graph=[];foreach($all as $a)$graph[$a['id']]=$a['dependencies'];$graph[$t['id']]=$deps;
 $visit=function($id,$trail)use(&$visit,$graph){if(in_array($id,$trail,true))throw new RuntimeException('Dependencies cannot form a cycle.');foreach($graph[$id]??[] as $d)$visit($d,[...$trail,$id]);};$visit($t['id'],[]);
 if($t['status']==='Verified'){
  if(!$t['checks']||in_array(false,array_column($t['checks'],'done'),true)||$t['evidence_note']==='')throw new RuntimeException('Complete every acceptance item and add verification evidence before marking Verified.');
  foreach($all as $a)if(in_array($a['id'],$deps,true)&&$a['status']!=='Verified')throw new RuntimeException('Verify dependencies before closing this task.');
 }
 if(($old['status']??'')==='Verified'&&$t['status']!=='Verified'){foreach($all as $a)if($a['status']==='Verified'&&in_array($t['id'],$a['dependencies'],true))throw new RuntimeException('Reopen dependent tasks before reopening this task.');}
 $t['updated_at']=gmdate('c');return $t;
}
function platform_save(string $dir,array $in,string $actor): array {
 $lock=fopen($dir.'/tracker.lock','c');if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Tracker is busy. Try again.');chmod($dir.'/tracker.lock',0600);
 try{
  $s=platform_load($dir);
  if(!is_string($in['revision']??null)||(string)$s['revision']!==$in['revision'])throw new RuntimeException('The tracker changed in another tab. Your input is retained below. Reload the latest task before saving.');
  $id=$in['id']??'';if(!is_string($id))throw new RuntimeException('Task unavailable.');$index=null;$old=null;
  foreach($s['tasks'] as $i=>$t)if($t['id']===$id){$index=$i;$old=$t;break;}
  if($id!==''&&!$old)throw new RuntimeException('Task unavailable.');if(!$old&&count($s['tasks'])>=2000)throw new RuntimeException('Task limit reached.');
  $task=platform_task($in,$old,$s['tasks']);if($index===null)$s['tasks'][]=$task;else $s['tasks'][$index]=$task;
  $s['revision']++;$s['history'][]=['revision'=>$s['revision'],'task'=>$task['id'],'actor'=>$actor,'at'=>gmdate('c'),'before'=>$old,'after'=>$task];
  $bytes=json_encode($s,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
  if(strlen($bytes)>12000000)throw new RuntimeException('Tracker storage limit reached. Export and review before continuing.');
  platform_backup($dir,$bytes);
  $tmp=tempnam($dir,'.save-');if($tmp===false)throw new RuntimeException('Task could not save.');
  try{chmod($tmp,0600);if(file_put_contents($tmp,$bytes,LOCK_EX)!==strlen($bytes)||!rename($tmp,$dir.'/tracker.json'))throw new RuntimeException('Task could not save.');}finally{if(is_file($tmp))unlink($tmp);}
  return $task;
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}
function platform_stats(array $tasks): array {
 $launch=array_values(array_filter($tasks,fn($t)=>$t['release']==='v1.0.0'));
 $verified=count(array_filter($launch,fn($t)=>$t['status']==='Verified'));
 return ['total'=>count($launch),'verified'=>$verified,'blockers'=>count(array_filter($launch,fn($t)=>$t['blocking']&&$t['status']!=='Verified')),'preview'=>count(array_filter($launch,fn($t)=>$t['status']==='Preview'))];
}

function platform_seal(string $bytes,string $public): array {
 $key=openssl_pkey_get_public($public);if(!$key||openssl_pkey_get_details($key)['bits']<3072)throw new RuntimeException('Tracker recovery key is unavailable.');
 $secret=random_bytes(32);$iv=random_bytes(12);$tag='';
 $cipher=openssl_encrypt($bytes,'aes-256-gcm',$secret,OPENSSL_RAW_DATA,$iv,$tag,'faraios.tracker.v1');
 if($cipher===false||!openssl_public_encrypt($secret,$sealed,$key,OPENSSL_PKCS1_OAEP_PADDING))throw new RuntimeException('Tracker backup could not be encrypted.');
 return ['schema'=>'faraios.tracker.v1','key_fingerprint'=>hash('sha256',openssl_pkey_get_details($key)['key']),'sealed_key'=>base64_encode($sealed),'iv'=>base64_encode($iv),'tag'=>base64_encode($tag),'ciphertext'=>base64_encode($cipher),'sha256'=>hash('sha256',$bytes)];
}
function platform_unseal(array $p,string $private,string $pass): string {
 $key=openssl_pkey_get_private($private,$pass);
 if(($p['schema']??'')!=='faraios.tracker.v1'||!$key||!openssl_private_decrypt(base64_decode($p['sealed_key'],true),$secret,$key,OPENSSL_PKCS1_OAEP_PADDING))throw new RuntimeException('Tracker recovery failed.');
 $raw=openssl_decrypt(base64_decode($p['ciphertext'],true),'aes-256-gcm',$secret,OPENSSL_RAW_DATA,base64_decode($p['iv'],true),base64_decode($p['tag'],true),'faraios.tracker.v1');
 if($raw===false||!hash_equals($p['sha256'],hash('sha256',$raw)))throw new RuntimeException('Tracker recovery failed.');
 platform_valid_store(json_decode($raw,true,128,JSON_THROW_ON_ERROR));return $raw;
}
function platform_backup(string $dir,string $bytes): void {
 $public=@file_get_contents(dirname(__DIR__).'/config/recovery-public.pem');if(!$public)throw new RuntimeException('Tracker recovery key is unavailable.');
 $packet=json_encode(platform_seal($bytes,$public),JSON_THROW_ON_ERROR);
 $path=$dir.'/recovery';if(is_link($path)||(!is_dir($path)&&!mkdir($path,0700)))throw new RuntimeException('Tracker backup storage is unavailable.');chmod($path,0700);
 $file=$path.'/revision-'.json_decode($bytes,true,128,JSON_THROW_ON_ERROR)['revision'].'-'.substr(hash('sha256',$bytes),0,16).'.packet';
 if(is_link($file))throw new RuntimeException('Tracker backup storage is unavailable.');
 $tmp=tempnam($path,'.backup-');if($tmp===false)throw new RuntimeException('Tracker backup could not save.');
 try{chmod($tmp,0600);if(file_put_contents($tmp,$packet,LOCK_EX)!==strlen($packet)||!rename($tmp,$file))throw new RuntimeException('Tracker backup could not save.');}finally{if(is_file($tmp))unlink($tmp);}
}
