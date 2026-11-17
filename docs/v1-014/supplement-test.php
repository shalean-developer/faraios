<?php
require __DIR__.'/supplement.php';
$root=sys_get_temp_dir().'/v1014-'.bin2hex(random_bytes(8));mkdir($root,0700);$pass=bin2hex(random_bytes(32));
try{
 $key=openssl_pkey_new(['private_key_bits'=>3072]);openssl_pkey_export($key,$private,$pass);$public=openssl_pkey_get_details($key)['key'];
 $files=[V14_NAMES[0]=>"<?php throw new Exception('MUST NOT EXECUTE');",V14_NAMES[1]=>'SYNTHETIC PRIVATE',V14_NAMES[2]=>json_encode(['schema'=>1,'revision'=>9,'tasks'=>[['id'=>'SYNTHETIC']],'history'=>[['revision'=>9]]])];
 $p=v14_seal($files,$public);$r=v14_restore($p,$private,$public,$pass,$root.'/ok');if($r['tracker_revision']!==9||!$r['hashes_match'])throw new Exception('Roundtrip failed');
 foreach($files as $n=>$v)if(file_get_contents($root.'/ok/'.$n)!==$v)throw new Exception('Bytes differ');
 foreach(['tamper','project','wrong-key','overwrite','symlink'] as $kind){$q=$p;$pw=$pass;$out=$root.'/'.$kind;if($kind==='tamper')$q['ciphertext']=base64_encode('tampered');if($kind==='project')$q['project']='wrong';if($kind==='wrong-key')$pw='wrong';if($kind==='overwrite')mkdir($out);if($kind==='symlink')symlink($root.'/ok',$out);$denied=false;try{v14_restore($q,$private,$public,$pw,$out);}catch(Throwable $e){$denied=true;}if(!$denied)throw new Exception('Boundary failed');}
 $bad=$files;$bad['unexpected.php']='bad';$denied=false;try{v14_seal($bad,$public);}catch(Throwable $e){$denied=true;}if(!$denied)throw new Exception('Paths accepted');
 echo "PASS supplemental bytes, tracker history, non-execution, private modes, tamper/project/key/overwrite/symlink/path denial\n";
}finally{$rm=function($f)use(&$rm){if(is_dir($f)&&!is_link($f)){foreach(scandir($f)as$n)if($n!=='.'&&$n!=='..')$rm($f.'/'.$n);rmdir($f);}else unlink($f);};$rm($root);}
