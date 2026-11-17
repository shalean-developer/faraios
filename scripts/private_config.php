<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
const PC_PROJECT='rxelmugnucfajrqmphhe';
const PC_FILES=['faraios-account/config.php','faraios-account/production.php','faraios-enquiry-mail/config.php','faraios-waitlist/config.php'];
const PC_STAFF_FILES=['faraios-staff-invite/web.php','faraios-staff-invite/worker.php'];
function pc_write(string $path,string $bytes): void {if(is_link($path)||file_put_contents($path,$bytes,LOCK_EX)===false||!chmod($path,0600))throw new RuntimeException();}
function pc_key(string $dir,string $pass): void {
 if(strlen($pass)<32||file_exists($dir))throw new RuntimeException();mkdir($dir,0700,true);
 $key=openssl_pkey_new(['private_key_bits'=>3072,'private_key_type'=>OPENSSL_KEYTYPE_RSA]);
 if(!$key||!openssl_pkey_export($key,$pem,$pass,['encrypt_key_cipher'=>OPENSSL_CIPHER_AES_256_CBC]))throw new RuntimeException();
 pc_write($dir.'/encrypted-private.pem',$pem);pc_write($dir.'/public.pem',openssl_pkey_get_details($key)['key']);
}
function pc_seal(string $root,string $public): array {
 $root=realpath($root);if(!$root)throw new RuntimeException();$files=[];
 $names=PC_FILES;$present=array_filter(PC_STAFF_FILES,fn($name)=>file_exists($root.'/'.$name)||is_link($root.'/'.$name));if($present&&count($present)!==count(PC_STAFF_FILES))throw new RuntimeException();if($present)$names=array_merge($names,PC_STAFF_FILES);
 foreach($names as $name){$path=$root.'/'.$name;$parent=dirname($path);if(is_link($path)||is_link($parent)||realpath($path)!==$path||!is_file($path)||filesize($path)>65536)throw new RuntimeException();$raw=file_get_contents($path);$files[$name]=['sha256'=>hash('sha256',$raw),'bytes'=>base64_encode($raw)];}
 $key=openssl_pkey_get_public($public);if(!$key||openssl_pkey_get_details($key)['bits']<3072)throw new RuntimeException();
 $public=openssl_pkey_get_details($key)['key'];$header=['schema'=>'faraios.private-config.v1','project'=>PC_PROJECT,'key_fingerprint'=>hash('sha256',$public),'captured_utc'=>gmdate('c')];
 $secret=random_bytes(32);$iv=random_bytes(12);$aad=json_encode($header,JSON_THROW_ON_ERROR);
 $cipher=openssl_encrypt(json_encode(['header'=>$header,'files'=>$files],JSON_THROW_ON_ERROR),'aes-256-gcm',$secret,OPENSSL_RAW_DATA,$iv,$tag,$aad,16);
 if($cipher===false||!openssl_public_encrypt($secret,$sealed,$key,OPENSSL_PKCS1_OAEP_PADDING))throw new RuntimeException();
 return $header+['sealed_key'=>base64_encode($sealed),'iv'=>base64_encode($iv),'tag'=>base64_encode($tag),'ciphertext'=>base64_encode($cipher)];
}
function pc_restore(array $packet,string $encrypted,string $public,string $pass,string $out): array {
 $parent=realpath(dirname($out));$web=realpath(dirname(__DIR__));
 if(!$parent||$out!==$parent.'/'.basename($out)||str_starts_with($out,$web.'/')||file_exists($out)||is_link($out)||strlen($pass)<32)throw new RuntimeException();
 $header=array_intersect_key($packet,array_flip(['schema','project','key_fingerprint','captured_utc']));
 if(($header['schema']??'')!=='faraios.private-config.v1'||($header['project']??'')!==PC_PROJECT||($header['key_fingerprint']??'')!==hash('sha256',$public))throw new RuntimeException();
 $key=openssl_pkey_get_private($encrypted,$pass);if(!$key||!openssl_private_decrypt(base64_decode($packet['sealed_key'],true),$secret,$key,OPENSSL_PKCS1_OAEP_PADDING)||strlen($secret)!==32)throw new RuntimeException();
 $raw=openssl_decrypt(base64_decode($packet['ciphertext'],true),'aes-256-gcm',$secret,OPENSSL_RAW_DATA,base64_decode($packet['iv'],true),base64_decode($packet['tag'],true),json_encode($header,JSON_THROW_ON_ERROR));
 if($raw===false||strlen($raw)>600000)throw new RuntimeException();$data=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
 $names=array_keys($data['files']);if($data['header']!==$header||!in_array($names,[PC_FILES,array_merge(PC_FILES,PC_STAFF_FILES)],true))throw new RuntimeException();
 $validated=[];foreach($names as $name){$row=$data['files'][$name];$bytes=base64_decode($row['bytes'],true);if($bytes===false||strlen($bytes)>65536||!hash_equals($row['sha256'],hash('sha256',$bytes)))throw new RuntimeException();$validated[$name]=$bytes;}
 mkdir($out,0700,true);chmod($out,0700);
 foreach($validated as $name=>$bytes){if(!is_dir(dirname($out.'/'.$name)))mkdir(dirname($out.'/'.$name),0700,true);pc_write($out.'/'.$name,$bytes);if(hash_file('sha256',$out.'/'.$name)!==$data['files'][$name]['sha256'])throw new RuntimeException();}
 return ['status'=>'private_configuration_restored','project'=>PC_PROJECT,'file_count'=>count($validated),'hashes_match'=>true,'private_modes'=>true,'captured_utc'=>$header['captured_utc'],'secrets_printed'=>false];
}
function pc_mail_key(string $root): string {
 // Recover a literal transport key without executing any restored PHP configuration.
 $raw=file_get_contents($root.'/faraios-enquiry-mail/config.php');
 if(!preg_match('/[\'"]resend_key[\'"]\s*=>\s*[\'"](re_[A-Za-z0-9_-]{16,200})[\'"]/',$raw,$m))throw new RuntimeException();return $m[1];
}
function pc_smtp(string $key,string $subject,string $text,string $id): void {
 if(!in_array($subject,['FaraiOS configuration recovery verification','FaraiOS operations need attention','FaraiOS operations recovered'],true)||!preg_match('/^[a-z0-9\/-]{1,180}$/',$id))throw new RuntimeException();
 $s=@stream_socket_client('ssl://smtp.resend.com:465',$errno,$error,15,STREAM_CLIENT_CONNECT,stream_context_create(['ssl'=>['verify_peer'=>true,'verify_peer_name'=>true,'peer_name'=>'smtp.resend.com']]));if(!$s)throw new RuntimeException();stream_set_timeout($s,15);
 $read=static function(int $expected)use($s):void{do{$line=fgets($s,4096);if($line===false)throw new RuntimeException();}while(isset($line[3])&&$line[3]==='-');if((int)substr($line,0,3)!==$expected)throw new RuntimeException();};
 $cmd=static function(string $line,int $code)use($s,$read):void{if(fwrite($s,$line."\r\n")===false)throw new RuntimeException();$read($code);};
 try{$read(220);$cmd('EHLO recovery.faraios.com',250);$cmd('AUTH PLAIN '.base64_encode("\0resend\0".$key),235);$cmd('MAIL FROM:<notifications@notify.faraios.com>',250);$cmd('RCPT TO:<alerts@faraios.com>',250);$cmd('DATA',354);
  $body="From: FaraiOS <notifications@notify.faraios.com>\r\nTo: alerts@faraios.com\r\nReply-To: support@faraios.com\r\nSubject: ".$subject."\r\nResend-Idempotency-Key: ".$id."\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n".$text."\r\n.\r\n";
  if(fwrite($s,$body)===false)throw new RuntimeException();$read(250);$cmd('QUIT',221);
 }finally{fclose($s);}
}
