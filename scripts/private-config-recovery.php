<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require __DIR__.'/private_config.php';
try{
 $o=getopt('',['action:','out:','key-dir:','packet:','smtp-test']);$action=$o['action']??'';$pass=getenv('BACKUP_PASSPHRASE')?:'';
 if($action==='key'){pc_key($o['out'],$pass);echo '{"status":"encrypted_recovery_key_created","new_password_required":false}'."\n";}
 elseif($action==='restore'){
  $packet=json_decode(file_get_contents($o['packet']),true,32,JSON_THROW_ON_ERROR);$dir=$o['key-dir'];
  $r=pc_restore($packet,file_get_contents($dir.'/encrypted-private.pem'),file_get_contents($dir.'/public.pem'),$pass,$o['out']);
  if(isset($o['smtp-test'])){pc_smtp(pc_mail_key($o['out']),'FaraiOS configuration recovery verification','Private FaraiOS configuration was decrypted and restored in an isolated recovery test. This message verifies the recovered SMTP credential. No customer messages or booking requests were processed.','faraios-config-recovery/'.substr(hash('sha256',json_encode($packet)),0,32));$r['smtp_accepted']=true;}
  echo json_encode($r)."\n";
 }else throw new RuntimeException();
}catch(Throwable $e){fwrite(STDERR,"Private configuration recovery failed; secret values and provider responses suppressed.\n");exit(1);}
