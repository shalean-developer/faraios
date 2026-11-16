<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$root='/var/www/vhosts/shalean.com/faraios.com';$private='/var/www/vhosts/shalean.com/private';$dir=$private.'/faraios-account/worker-join-20261116';$phase=getopt('',['phase:'])['phase']??'inspect';
function guard(bool $ok,string $why):void{if(!$ok)throw new RuntimeException($why);}
function files_map(string $root):array{$a=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS))as $f)if($f->isFile()&&!$f->isLink())$a[substr($f->getPathname(),strlen($root)+1)]=hash_file('sha256',$f->getPathname());ksort($a);return $a;}
function receipt(string $name,array $data):void{global $dir;guard(file_put_contents($dir.'/'.$name,json_encode($data,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR),LOCK_EX)!==false,'Receipt write');chmod($dir.'/'.$name,0600);}
try{
 $m=json_decode(file_get_contents($dir.'/manifest.json'),true,512,JSON_THROW_ON_ERROR);
 if($phase==='inspect'){
  guard(!file_exists($dir.'/before.json'),'Already inspected');$files=files_map($root);foreach($m['files']as $name=>$v)guard(($files['_accounts-preview/account/'.$name]??null)===$v['before'],'Preview drift: '.$name);
  $configs=[];foreach(['faraios-account/config.php','faraios-account/production.php','faraios-account/sc04-acceptance.json','faraios-staff-invite/web.php','faraios-staff-invite/worker.php']as $p)$configs[$p]=hash_file('sha256',$private.'/'.$p);
  receipt('before.json',['files'=>$files,'configs'=>$configs]);echo json_encode(['status'=>'PASS','phase'=>$phase,'web_files'=>count($files),'php'=>PHP_VERSION]);
 }elseif($phase==='install'){
  guard(!file_exists($dir.'/installed.json'),'Already installed');$b=json_decode(file_get_contents($dir.'/before.json'),true);guard(files_map($root)===$b['files'],'Concurrent files changed');foreach($b['configs']as $p=>$h)guard(hash_file('sha256',$private.'/'.$p)===$h,'Private config drift');
  foreach($m['files']as $name=>$v){$src=$dir.'/'.$name;guard(hash_file('sha256',$src)===$v['after'],'Candidate hash');if(str_ends_with($name,'.php')){exec(escapeshellarg(PHP_BINARY).' -l '.escapeshellarg($src),$o,$x);guard($x===0,'PHP lint');}$dest=$root.'/_accounts-preview/account/'.$name;if(is_file($dest)){guard(copy($dest,$dir.'/before-'.$name),'Backup');chmod($dir.'/before-'.$name,0600);}$tmp=$dest.'.join-next';guard(!file_exists($tmp),'Temporary file exists');guard(copy($src,$tmp),'Stage');chmod($tmp,0644);guard(rename($tmp,$dest),'Atomic rename');if(function_exists('opcache_invalidate'))opcache_invalidate($dest,true);}
  receipt('installed.json',['status'=>'PASS','at'=>gmdate('c')]);echo json_encode(['status'=>'PASS','phase'=>$phase,'files'=>array_keys($m['files'])]);
 }elseif($phase==='verify'){
  $b=json_decode(file_get_contents($dir.'/before.json'),true);$a=files_map($root);$changed=[];foreach(array_unique(array_merge(array_keys($a),array_keys($b['files'])))as $p)if(($a[$p]??null)!==($b['files'][$p]??null))$changed[]=$p;$expected=array_map(fn($p)=>'_accounts-preview/account/'.$p,array_keys($m['files']));sort($changed);sort($expected);guard($changed===$expected,'Unexpected file delta');foreach($b['configs']as $p=>$h)guard(hash_file('sha256',$private.'/'.$p)===$h,'Private config changed');foreach($m['files']as $p=>$v)guard($a['_accounts-preview/account/'.$p]===$v['after'],'Installed hash');
  $html=file_get_contents('https://www.faraios.com/_accounts-preview/account/staff-join.php');guard(is_string($html)&&str_contains($html,'Open your invitation email')&&str_contains($html,'Create account')&&str_contains($html,'staff-join.css'),'Served join page');foreach(['staff-join.js','staff-join.css']as $p)guard(hash('sha256',file_get_contents('https://www.faraios.com/_accounts-preview/account/'.$p))===$m['files'][$p]['after'],'Served asset hash');receipt('verified.json',['status'=>'PASS','web_files'=>count($a),'changed'=>$changed,'live_unchanged'=>true,'configuration_unchanged'=>true,'at'=>gmdate('c')]);echo json_encode(['status'=>'PASS','phase'=>$phase,'web_files'=>count($a),'only_three_preview_files_changed'=>true,'live_unchanged'=>true]);
 }else throw new RuntimeException('Unknown phase');
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','phase'=>$phase,'error'=>$e->getMessage()])."\n");exit(1);}
