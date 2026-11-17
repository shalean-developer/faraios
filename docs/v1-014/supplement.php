<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
const V14_NAMES=['faraios-account/platform-owner.php','faraios-lifecycle/config.php','faraios-account/platform-tracker-d7a1fa306749/tracker.json'];
function v14_seal(array $files,string $public):array {
 if(array_keys($files)!==V14_NAMES)throw new RuntimeException('Unexpected paths');
 $rows=[];foreach($files as $n=>$raw){if(strlen($raw)>12000000)throw new RuntimeException('Oversized file');$rows[$n]=['sha256'=>hash('sha256',$raw),'bytes'=>base64_encode($raw)];}
 $h=['schema'=>'faraios.v1014.supplement.v1','project'=>'rxelmugnucfajrqmphhe','captured_utc'=>gmdate('c'),'key_fingerprint'=>hash('sha256',$public)];
 $key=openssl_pkey_get_public($public);if(!$key||openssl_pkey_get_details($key)['bits']<3072)throw new RuntimeException('Key rejected');
 $secret=random_bytes(32);$iv=random_bytes(12);$raw=gzencode(json_encode(['header'=>$h,'files'=>$rows],JSON_THROW_ON_ERROR));
 $cipher=openssl_encrypt($raw,'aes-256-gcm',$secret,OPENSSL_RAW_DATA,$iv,$tag,json_encode($h));
 if($cipher===false||!openssl_public_encrypt($secret,$sealed,$key,OPENSSL_PKCS1_OAEP_PADDING))throw new RuntimeException('Seal failed');
 return $h+['sealed_key'=>base64_encode($sealed),'iv'=>base64_encode($iv),'tag'=>base64_encode($tag),'ciphertext'=>base64_encode($cipher)];
}
function v14_restore(array $p,string $private,string $public,string $pass,string $out):array {
 if(file_exists($out)||is_link($out))throw new RuntimeException('New private target required');
 $h=array_intersect_key($p,array_flip(['schema','project','captured_utc','key_fingerprint']));
 if(($h['schema']??'')!=='faraios.v1014.supplement.v1'||($h['project']??'')!=='rxelmugnucfajrqmphhe'||($h['key_fingerprint']??'')!==hash('sha256',$public))throw new RuntimeException('Wrong packet');
 $key=openssl_pkey_get_private($private,$pass);if(!$key||!openssl_private_decrypt(base64_decode($p['sealed_key'],true),$secret,$key,OPENSSL_PKCS1_OAEP_PADDING)||strlen($secret)!==32)throw new RuntimeException('Key rejected');
 $z=openssl_decrypt(base64_decode($p['ciphertext'],true),'aes-256-gcm',$secret,OPENSSL_RAW_DATA,base64_decode($p['iv'],true),base64_decode($p['tag'],true),json_encode($h));
 if($z===false||strlen($z)>2000000)throw new RuntimeException('Ciphertext rejected');
 $raw=gzdecode($z,18000000);if($raw===false)throw new RuntimeException('Payload rejected');
 $data=json_decode($raw,true,128,JSON_THROW_ON_ERROR);
 if($data['header']!==$h||array_keys($data['files'])!==V14_NAMES)throw new RuntimeException('Unexpected paths');
 $valid=[];foreach($data['files'] as $n=>$r){$b=base64_decode($r['bytes'],true);if($b===false||strlen($b)>12000000||!hash_equals($r['sha256'],hash('sha256',$b)))throw new RuntimeException('Hash rejected');$valid[$n]=$b;}
 $tracker=json_decode($valid[V14_NAMES[2]],true,128,JSON_THROW_ON_ERROR);if(($tracker['schema']??0)!==1||!is_int($tracker['revision']??null)||!is_array($tracker['tasks']??null)||!is_array($tracker['history']??null))throw new RuntimeException('Tracker rejected');
 if(!mkdir($out,0700,true))throw new RuntimeException('Target failed');chmod($out,0700);
 foreach($valid as $n=>$b){$f=$out.'/'.$n;if(!is_dir(dirname($f)))mkdir(dirname($f),0700,true);if(file_put_contents($f,$b,LOCK_EX)!==strlen($b)||!chmod($f,0600)||!hash_equals(hash('sha256',$b),hash_file('sha256',$f))||(fileperms($f)&0777)!==0600)throw new RuntimeException('Restore failed');}
 return ['status'=>'supplement_restored','captured_utc'=>$h['captured_utc'],'file_count'=>3,'hashes_match'=>true,'private_modes'=>true,'tracker_revision'=>$tracker['revision'],'tracker_tasks'=>count($tracker['tasks']),'tracker_history'=>count($tracker['history']),'configuration_executed'=>false];
}
if(realpath($_SERVER['SCRIPT_FILENAME']??'')!==__FILE__)return;
try{
 $dir=getenv('V14_BUNDLE');$out=getenv('RUNNER_TEMP').'/v1014-supplement-restored';
 $keyFiles=glob($dir.'/*.pem');$private='';$public='';foreach($keyFiles as $f){$s=file_get_contents($f);if(str_contains($s,'PRIVATE KEY'))$private=$s;elseif(str_contains($s,'PUBLIC KEY'))$public=$s;}
 $packet=json_decode(file_get_contents(getenv('V14_PACKET_FILE')),true,32,JSON_THROW_ON_ERROR);
 $r=v14_restore($packet,$private,$public,getenv('BACKUP_PASSPHRASE'),$out);
 file_put_contents(getenv('V14_EVIDENCE').'/receipt.json',json_encode($r));
 file_put_contents(getenv('V14_EVIDENCE').'/supplement.packet',json_encode($packet));
 echo json_encode($r)."\n";
}catch(Throwable $e){fwrite(STDERR,"Supplemental recovery rejected; private output suppressed\n");exit(1);}
