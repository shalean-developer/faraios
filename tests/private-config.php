<?php
declare(strict_types=1);
require dirname(__DIR__).'/scripts/private_config.php';
function check(bool $v):void{if(!$v)throw new RuntimeException('assertion failed');}
$root=sys_get_temp_dir().'/faraios-private-test-'.bin2hex(random_bytes(8));mkdir($root,0700);
$pass=str_repeat('synthetic-only-',4);
try{
 pc_key($root.'/key',$pass);$public=file_get_contents($root.'/key/public.pem');$encrypted=file_get_contents($root.'/key/encrypted-private.pem');
 foreach(PC_FILES as $name){if(!is_dir(dirname($root.'/source/'.$name)))mkdir(dirname($root.'/source/'.$name),0700,true);pc_write($root.'/source/'.$name,"<?php return ['private'=>'SYNTHETIC SECRET\\r\\n', 'resend_key'=>'re_synthetic_key_only_123456789'];\r\n");}
 $packet=pc_seal($root.'/source',$public);check(!str_contains(json_encode($packet),'SYNTHETIC SECRET'));check(!str_contains($encrypted,'BEGIN PRIVATE KEY'));
 $r=pc_restore($packet,$encrypted,$public,$pass,$root.'/restored');check($r['hashes_match']&&$r['file_count']===4);
 foreach(PC_FILES as $name){check(file_get_contents($root.'/source/'.$name)===file_get_contents($root.'/restored/'.$name));check((fileperms($root.'/restored/'.$name)&0777)===0600);}
 check(pc_mail_key($root.'/restored')==='re_synthetic_key_only_123456789');
 foreach(['wrong-key','tamper','project','existing'] as $kind){$p=$packet;$password=$pass;$out=$root.'/reject-'.$kind;if($kind==='wrong-key')$password=str_repeat('wrong',10);if($kind==='tamper')$p['ciphertext']=base64_encode('tampered');if($kind==='project')$p['project']='another-project';if($kind==='existing')mkdir($out,0700);$blocked=false;try{pc_restore($p,$encrypted,$public,$password,$out);}catch(Throwable $e){$blocked=true;}check($blocked);}
 foreach(PC_STAFF_FILES as $name){if(!is_dir(dirname($root.'/source/'.$name)))mkdir(dirname($root.'/source/'.$name),0700,true);pc_write($root.'/source/'.$name,"<?php return ['private'=>'SYNTHETIC INVITATION KEY'];\n");}
 $extended=pc_seal($root.'/source',$public);$r=pc_restore($extended,$encrypted,$public,$pass,$root.'/restored-with-staff');check($r['file_count']===6&&$r['hashes_match']);
 foreach(PC_STAFF_FILES as $name)check(file_get_contents($root.'/source/'.$name)===file_get_contents($root.'/restored-with-staff/'.$name));
 unlink($root.'/source/'.PC_STAFF_FILES[0]);$blocked=false;try{pc_seal($root.'/source',$public);}catch(Throwable $e){$blocked=true;}check($blocked);
 unlink($root.'/source/'.PC_FILES[0]);symlink($root.'/source/'.PC_FILES[1],$root.'/source/'.PC_FILES[0]);$blocked=false;try{pc_seal($root.'/source',$public);}catch(Throwable $e){$blocked=true;}check($blocked);
 echo "PASS actual key wrapping, encrypted export, byte equality, private modes, wrong key, tamper, project/overwrite/symlink denial; no transport sends.\n";
}finally{$remove=function($p)use(&$remove){if(is_dir($p)&&!is_link($p)){foreach(scandir($p) as $n)if($n!=='.'&&$n!=='..')$remove($p.'/'.$n);rmdir($p);}else unlink($p);};$remove($root);}
