<?php
declare(strict_types=1);
// Private CLI only. Never install under the document root or print fixture credentials.
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';
$root='/var/www/vhosts/shalean.com/faraios.com';
$dir=$private.'/defect-preview-20261116';
$phase=getopt('',['phase:'])['phase']??'inspect';
function must(bool $ok,string $why):void{if(!$ok)throw new RuntimeException($why);}
function savej(string $path,array $data):void{must(file_put_contents($path,json_encode($data,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR),LOCK_EX)!==false,'Receipt write');chmod($path,0600);}
function filemap(string $root):array{$out=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS))as $f){if($f->isFile()&&!$f->isLink())$out[substr($f->getPathname(),strlen($root)+1)]=hash_file('sha256',$f->getPathname());}ksort($out);return $out;}
try{
 must(is_dir($dir),'Private staging directory missing');
 $_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';
 $c=require $private.'/config.php';
 must(($c['supabase_url']??'')==='https://rxelmugnucfajrqmphhe.supabase.co'&&($c['base_url']??'')==='https://www.faraios.com/_accounts-preview','Exact preview configuration');
 $f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true,512,JSON_THROW_ON_ERROR);
 must($f['_business_a']==='2f16e658-e031-4c4a-930a-2731ec1d1492'&&$f['_business_b']==='4627f805-8243-4890-bf18-a14fdf3fd21b','Registered fixtures');
 foreach(['owner_a','owner_b','manager','receptionist','worker']as $role)must(str_ends_with($f[$role]['email'],'@example.test'),'Reserved fixture account');
 $manifest=json_decode(file_get_contents($dir.'/manifest.json'),true,512,JSON_THROW_ON_ERROR);
 $baseline=['account/core.php'=>'20de2c9c307a14255494dcd46cecf6b838990215592989023236190cda7c164d','account/delegated.php'=>'24b154b919951dbfaf748e8ffaaee92c5eced15d954fb7614846e690fc882f9f'];
 if($phase==='inspect'){
  must(!file_exists($dir.'/before.json'),'Inspection already recorded');
  $before=['files'=>filemap($root),'configuration'=>[],'php'=>PHP_VERSION];
  foreach(['config.php','production.php','sc04-acceptance.json','sc04-acceptance-state.json']as $p)$before['configuration'][$p]=hash_file('sha256',$private.'/'.$p);
  foreach($baseline as $p=>$hash)foreach(['','_accounts-preview/']as $prefix)must(($before['files'][$prefix.$p]??null)===$hash,'Installed baseline drift: '.$prefix.$p);
  foreach($manifest['files']as $p=>$hash)must(hash_file('sha256',$dir.'/candidate/'.$p)===$hash,'Staged candidate drift');
  savej($dir.'/before.json',$before);
  echo json_encode(['phase'=>$phase,'status'=>'PASS','php'=>PHP_VERSION,'files'=>count($before['files']),'fixture_accounts'=>5,'join_files_present'=>array_map(fn($p)=>isset($before['files']['_accounts-preview/account/'.$p]),['staff-join.php','staff-join.js','staff-join.css'])]);
 }elseif($phase==='install'){
  must(!file_exists($dir.'/installed.json'),'Already installed; inspect receipt');
  $before=json_decode(file_get_contents($dir.'/before.json'),true,512,JSON_THROW_ON_ERROR);
  foreach($before['configuration']as $p=>$hash)must(hash_file('sha256',$private.'/'.$p)===$hash,'Private configuration drift');
  foreach($baseline as $p=>$hash)must(hash_file('sha256',$root.'/_accounts-preview/'.$p)===$hash,'Preview changed since inspection');
  $installed=[];
  foreach($manifest['files']as $p=>$hash){
   $src=$dir.'/candidate/'.$p;$dest=$root.'/_accounts-preview/'.$p;
   must(hash_file('sha256',$src)===$hash,'Candidate changed');
   $backup=$dir.'/before-'.basename($p);must(!file_exists($backup),'Backup exists');must(copy($dest,$backup),'Backup failed');chmod($backup,0600);
   $tmp=$dest.'.d0106-next';must(!file_exists($tmp),'Temporary file exists');must(copy($src,$tmp),'Stage copy failed');chmod($tmp,fileperms($dest)&0777);
   exec(escapeshellarg(PHP_BINARY).' -l '.escapeshellarg($tmp).' 2>&1',$lint,$code);must($code===0,'PHP lint failed');
   must(rename($tmp,$dest),'Atomic install failed');if(function_exists('opcache_invalidate'))opcache_invalidate($dest,true);
   must(hash_file('sha256',$dest)===$hash,'Installed hash mismatch');$installed[$p]=$hash;
  }
  $after=filemap($root);$allowed=array_map(fn($p)=>'_accounts-preview/'.$p,array_keys($manifest['files']));$changed=[];
  foreach(array_unique(array_merge(array_keys($before['files']),array_keys($after)))as $p)if(($before['files'][$p]??null)!==($after[$p]??null))$changed[]=$p;
  sort($changed);sort($allowed);must($changed===$allowed,'Unexpected web file changes');
  savej($dir.'/installed.json',['source'=>$manifest['source'],'files'=>$installed,'changed'=>$changed,'live_unchanged'=>true,'private_configuration_unchanged'=>true,'worker_join_unchanged'=>true,'installed_at'=>gmdate('c')]);
  echo json_encode(['phase'=>$phase,'status'=>'PASS','changed'=>$changed,'live_unchanged'=>true,'worker_join_unchanged'=>true]);
 }else throw new RuntimeException('Unknown phase');
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','phase'=>$phase,'error'=>$e->getMessage(),'secrets_printed'=>false])."\n");exit(1);}
