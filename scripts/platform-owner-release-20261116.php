<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$base='/var/www/vhosts/shalean.com';$web=$base.'/faraios.com';$private=$base.'/private/faraios-account';
$commit='49509da913f952208c3e257427e95a6e5316c4b4';
$expected=json_decode('{"platform.php":"8c6c0f029be0521ceabea32316edc62ed914da1acc23e51b8fd08a60e5faee6d","platform-core.php":"4f06496db3bb0b9ce72ff37c29f24547fa2654708fd40e305a096bf9602f64c7","platform-seed.php":"283d5c1fdba87305e4515fe7e005550b4f726a16131aab13584ddfa6dc305da7","platform.css":"c96183f1ef3d55e228171d318a8216823b39bdd6ea326b4e8a30600272407c80","platform.js":"e0450345c2a40064cf767d4e6c555e111889e12f43a26ff4d432d1e8a1865c70"}',true,512,JSON_THROW_ON_ERROR);
function must(bool $ok,string $label):void{if(!$ok)throw new RuntimeException($label);}
function protected_files(string $dir,array $exclude=[]):array{$out=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $f){if($f->isFile()&&!in_array($f->getBasename(),$exclude,true))$out[$f->getPathname()]=hash_file('sha256',$f->getPathname());}ksort($out);return $out;}
function write_private(string $p,string $b):void{must(!is_link($p),'symlink');must(file_put_contents($p,$b,LOCK_EX)===strlen($b),'write');must(chmod($p,0600),'mode');}
try{
 $lock=fopen($private.'/platform-release.lock','c');must($lock!==false&&flock($lock,LOCK_EX),'lock');chmod($private.'/platform-release.lock',0600);
 $receipt=$private.'/platform-release-49509da.json';
 if(is_file($receipt)){foreach($expected as $n=>$h)must(is_file($web.'/account/'.$n)&&hash_file('sha256',$web.'/account/'.$n)===$h,'installed_hash');echo file_get_contents($receipt);exit;}
 $before=protected_files($web.'/account',array_keys($expected));$configs=[];foreach(['config.php','production.php','platform-owner.php'] as $n){must(is_file($private.'/'.$n),'private_config');$configs[$n]=hash_file('sha256',$private.'/'.$n);}
 foreach($expected as $n=>$h)must(!file_exists($web.'/account/'.$n),'existing_target');
 $stage=$private.'/platform-release-49509da';must(!file_exists($stage),'existing_stage');must(mkdir($stage,0700),'stage');
 $ctx=stream_context_create(['http'=>['timeout'=>30,'header'=>"User-Agent: FaraiOS-release\r\n"]]);
 foreach($expected as $n=>$h){$bytes=file_get_contents('https://raw.githubusercontent.com/shalean-developer/faraios/'.$commit.'/account/'.$n,false,$ctx);must(is_string($bytes)&&hash('sha256',$bytes)===$h,'source_hash');write_private($stage.'/'.$n,$bytes);}
 require $stage.'/platform-core.php';
 $public=file_get_contents($web.'/config/recovery-public.pem');must(is_string($public),'recovery_public_key');
 $previewBase='https://www.faraios.com/_accounts-preview';$liveBase='https://www.faraios.com';
 $src=$private.'/platform-tracker-'.substr(hash('sha256',$previewBase),0,12);
 $dst=$private.'/platform-tracker-'.substr(hash('sha256',$liveBase),0,12);
 must(is_dir($src)&&!is_link($src),'preview_state');
 $stateLock=fopen($src.'/tracker.lock','c');must($stateLock!==false&&flock($stateLock,LOCK_EX),'state_lock');chmod($src.'/tracker.lock',0600);
 $state=file_get_contents($src.'/tracker.json');must(is_string($state),'state');$data=json_decode($state,true,128,JSON_THROW_ON_ERROR);platform_valid_store($data);
 must(!file_exists($dst),'existing_live_state');must(mkdir($dst,0700),'live_state');
 $packet=platform_seal($state,$public);mkdir($dst.'/recovery',0700);write_private($dst.'/recovery/initial-preview-state.packet',json_encode($packet,JSON_THROW_ON_ERROR));
 // Rehearse actual task/history restoration in an isolated private directory with a disposable key.
 $key=openssl_pkey_new(['private_key_bits'=>3072]);must($key!==false,'test_key');openssl_pkey_export($key,$pem);$testPacket=platform_seal($state,openssl_pkey_get_details($key)['key']);
 $restored=platform_unseal($testPacket,$pem,'');must(hash_equals(hash('sha256',$state),hash('sha256',$restored)),'restore_equality');
 write_private($stage.'/restored-tracker.json',$restored);must(hash_file('sha256',$stage.'/restored-tracker.json')===hash('sha256',$state),'restored_disk');
 unlink($stage.'/restored-tracker.json');unset($pem,$key,$restored,$testPacket);
 write_private($dst.'/tracker.json',$state);
 foreach(array_keys($expected) as $n)if($n!=='platform.php'){must(copy($stage.'/'.$n,$web.'/account/'.$n),'install');chmod($web.'/account/'.$n,0644);}
 must(copy($stage.'/platform.php',$web.'/account/platform.php'),'entry');chmod($web.'/account/platform.php',0644);chmod($private.'/platform-owner.php',0600);
 foreach($expected as $n=>$h)must(hash_file('sha256',$web.'/account/'.$n)===$h,'live_hash');
 must(protected_files($web.'/account',array_keys($expected))===$before,'protected_runtime_changed');
 foreach($configs as $n=>$h)must(hash_file('sha256',$private.'/'.$n)===$h,'private_config_changed');
 must(hash_file('sha256',$src.'/tracker.json')===hash_file('sha256',$dst.'/tracker.json'),'state_preservation');
 $result=['status'=>'PASS','scope'=>'owner_dashboard_only','source'=>$commit,'runtime_files'=>count($expected),'existing_account_files_preserved'=>count($before),'private_configs_preserved'=>true,'preview_state_preserved'=>true,'tasks'=>count($data['tasks']),'history_entries'=>count($data['history']),'revision'=>$data['revision'],'encrypted_snapshot'=>true,'isolated_actual_history_restore'=>true,'business_records_changed'=>false,'time'=>gmdate('c')];
 write_private($receipt,json_encode($result,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR)."\n");echo file_get_contents($receipt);
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','reason'=>$e->getMessage(),'secrets_printed'=>false])."\n");exit(1);}
