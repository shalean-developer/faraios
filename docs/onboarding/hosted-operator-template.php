<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$base='/var/www/vhosts/shalean.com';$live=$base.'/faraios.com';$preview=$live.'/_accounts-preview';$private=$base.'/private/faraios-account';$work=$private.'/staff-onboarding-20261115';$configDir=$base.'/private/faraios-staff-invite';$php82='/opt/plesk/php/8.2/bin/php';
$payload=json_decode(gzdecode(base64_decode('PAYLOAD')),true,512,JSON_THROW_ON_ERROR);
$phase=getopt('',['phase:'])['phase']??'inspect';
function putprivate(string $path,string $bytes):void{if(is_link($path)||file_put_contents($path,$bytes,LOCK_EX)===false||!chmod($path,0600))throw new RuntimeException('Private write failed');}
function statewrite(string $file,array $data):void{putprivate($file,json_encode($data,JSON_THROW_ON_ERROR));}
function treehash(string $root,array $omit=[],bool $live=false):array{
 $r=[];$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS));
 foreach($it as $f){if(!$f->isFile()||$f->isLink())continue;$n=substr($f->getPathname(),strlen($root)+1);$first=explode('/',$n)[0];if($first==='.git'||($live&&str_starts_with($first,'_'))||in_array($n,$omit,true)||str_ends_with($n,'.zip'))continue;$r[$n]=hash_file('sha256',$f->getPathname());}ksort($r);return $r;
}
function targethash(string $root,array $payload):array{$r=[];foreach($payload as $n=>$v)$r[$n]=is_file($root.'/'.$n)?hash_file('sha256',$root.'/'.$n):null;return $r;}
function privatehash(string $base):array{$r=[];foreach(['faraios-account/config.php','faraios-account/production.php','faraios-enquiry-mail/config.php','faraios-waitlist/config.php','faraios-account/sc04-acceptance.json'] as $n){if(!is_file($base.'/private/'.$n))throw new RuntimeException('Required private precondition missing');$r[$n]=hash_file('sha256',$base.'/private/'.$n);}return $r;}
try{
 if(!is_dir($work)&&!mkdir($work,0700))throw new RuntimeException('Work directory failed');
 $_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$_SERVER['REQUEST_URI']=$_SERVER['SCRIPT_NAME'];$c=require $private.'/config.php';
 if($c['base_url']!=='https://www.faraios.com/_accounts-preview'||$c['supabase_url']!=='https://rxelmugnucfajrqmphhe.supabase.co')throw new RuntimeException('Preview/project mismatch');
 $lint=[];$status=0;exec(escapeshellarg($php82).' -r '.escapeshellarg('echo json_encode(["version"=>PHP_VERSION,"sodium"=>function_exists("sodium_crypto_box_seal"),"curl"=>extension_loaded("curl")]);').' 2>/dev/null',$lint,$status);$runtime=json_decode(implode('',$lint),true);if($status||!($runtime['sodium']??false)||!($runtime['curl']??false))throw new RuntimeException('PHP82 extension prerequisite failed');
 if($phase==='inspect'){
  if(is_file($work.'/before.json'))throw new RuntimeException('Inspection already recorded; use verify rather than overwriting');
  $before=['source'=>'169669888a3113b8a4e8f96a20f7cc6ff61c2f90','runtime'=>$runtime,'targets'=>targethash($preview,$payload),'live'=>treehash($live,[],true),'preview_other'=>treehash($preview,array_keys($payload)),'private'=>privatehash($base)];
  foreach($payload as $n=>$item)if(!str_contains($n,'/')||str_contains($n,'..')||hash('sha256',base64_decode($item['bytes'],true))!==$item['sha256'])throw new RuntimeException('Payload integrity');
  statewrite($work.'/before.json',$before);echo json_encode(['status'=>'onboarding_preflight_pass','php'=>$runtime['version'],'sodium'=>true,'targets'=>count($payload),'live_protected'=>count($before['live']),'private_protected'=>count($before['private']),'preview_only'=>true]);exit;
 }
 $before=json_decode(file_get_contents($work.'/before.json'),true,512,JSON_THROW_ON_ERROR);
 if(privatehash($base)!==$before['private']||treehash($live,[],true)!==$before['live'])throw new RuntimeException('Protected live/configuration drift; inspect legitimate concurrent work');
 if($phase==='install'){
  if(is_file($work.'/installed.json'))throw new RuntimeException('Install already completed; use verify');
  if(targethash($preview,$payload)!==$before['targets']||treehash($preview,array_keys($payload))!==$before['preview_other'])throw new RuntimeException('Preview changed after inspection');
  $backup=$work.'/backup';$stage=$work.'/stage';if(!mkdir($backup,0700)||!mkdir($stage,0700))throw new RuntimeException('Backup/stage already exists');
  foreach($payload as $n=>$item){foreach([$backup,$stage] as $dir)if(!is_dir(dirname($dir.'/'.$n)))mkdir(dirname($dir.'/'.$n),0700,true);if($before['targets'][$n]!==null){if(!copy($preview.'/'.$n,$backup.'/'.$n))throw new RuntimeException('Backup failed');chmod($backup.'/'.$n,0600);}putprivate($stage.'/'.$n,base64_decode($item['bytes'],true));if(str_ends_with($n,'.php')){exec(escapeshellarg($php82).' -l '.escapeshellarg($stage.'/'.$n).' 2>&1',$lines,$rc);if($rc)throw new RuntimeException('Candidate syntax rejected');}}
  foreach($payload as $n=>$item){$tmp=$preview.'/'.$n.'.onboarding-new';if(file_exists($tmp)||is_link($tmp))throw new RuntimeException('Unexpected staging file');if(!copy($stage.'/'.$n,$tmp))throw new RuntimeException('Stage copy failed');chmod($tmp,0644);if(!rename($tmp,$preview.'/'.$n))throw new RuntimeException('Atomic replace failed');$replaced[]=$n;}
  foreach($payload as $n=>$item)if(hash_file('sha256',$preview.'/'.$n)!==$item['sha256'])throw new RuntimeException('Installed hash mismatch');
  if(privatehash($base)!==$before['private']||treehash($live,[],true)!==$before['live']||treehash($preview,array_keys($payload))!==$before['preview_other'])throw new RuntimeException('Protected file changed');
  statewrite($work.'/installed.json',['source'=>$before['source'],'hashes'=>targethash($preview,$payload),'backup'=>$backup,'live_unchanged'=>true,'private_unchanged'=>true]);echo json_encode(['status'=>'onboarding_preview_installed','files'=>count($payload),'live_unchanged'=>true,'private_unchanged'=>true,'backup'=>'staff-onboarding-20261115/backup']);exit;
 }
 if($phase==='configure'){
  if(!is_file($work.'/installed.json'))throw new RuntimeException('Install required');
  if(is_dir($configDir))throw new RuntimeException('Configuration exists; never regenerate existing keys');
  $m=require $base.'/private/faraios-enquiry-mail/config.php';if($m['supabase_url']!==$c['supabase_url']||$m['sender']!=='notifications@notify.faraios.com'||!in_array('support@faraios.com',array_map('strtolower',$m['allow_recipients']??[]),true))throw new RuntimeException('Approved mail recipient/configuration mismatch');
  if(!mkdir($configDir,0700))throw new RuntimeException('Private directory failed');$pair=sodium_crypto_box_keypair();$public=bin2hex(sodium_crypto_box_publickey($pair));$secret=bin2hex(sodium_crypto_box_secretkey($pair));
  putprivate($configDir.'/web.php','<?php return '.var_export(['enabled'=>true,'public_key'=>$public],true).';');
  $worker=['enabled'=>true,'environment'=>'preview','base_url'=>$c['base_url'],'supabase_url'=>$c['supabase_url'],'sender'=>$m['sender'],'public_key'=>$public,'secret_key'=>$secret,'allow_recipients'=>['support@faraios.com'],'service_key'=>$m['service_key'],'resend_key'=>$m['resend_key']];putprivate($configDir.'/worker.php','<?php return '.var_export($worker,true).';');
  statewrite($work.'/configuration.json',['environment'=>'preview','allow_recipients'=>['support@faraios.com'],'public_fingerprint'=>hash('sha256',$public),'files_private'=>true,'new_keys_printed'=>false]);echo json_encode(['status'=>'onboarding_preview_mail_configured','environment'=>'preview','allowed_recipient'=>'support@faraios.com','private_modes'=>true,'live_configuration_unchanged'=>privatehash($base)===$before['private'],'secrets_printed'=>false]);exit;
 }
 if($phase==='verify'){
  foreach($payload as $n=>$item)if(hash_file('sha256',$preview.'/'.$n)!==$item['sha256'])throw new RuntimeException('Candidate drift');
  if(treehash($preview,array_keys($payload))!==$before['preview_other'])throw new RuntimeException('Other preview file drift');
  echo json_encode(['status'=>'onboarding_preview_verified','files'=>count($payload),'live_unchanged'=>true,'private_originals_unchanged'=>true,'php'=>$runtime['version']]);exit;
 }
 throw new RuntimeException('Choose inspect/install/configure/verify');
}catch(Throwable $e){if(isset($replaced,$backup)){foreach(array_reverse($replaced) as $n){if(is_file($backup.'/'.$n))copy($backup.'/'.$n,$preview.'/'.$n);else rename($preview.'/'.$n,$backup.'/new-'.str_replace('/','-',$n));}}echo json_encode(['status'=>'STOP','reason'=>$e->getMessage(),'phase'=>$phase,'secrets_printed'=>false]);exit(1);}
