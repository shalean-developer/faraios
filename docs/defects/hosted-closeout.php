<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';$root='/var/www/vhosts/shalean.com/faraios.com';$dir=$private.'/defect-preview-20261116';
function verify(bool $ok,string $why):void{if(!$ok)throw new RuntimeException($why);}
try{
 $before=json_decode(file_get_contents($dir.'/before.json'),true,512,JSON_THROW_ON_ERROR);$manifest=json_decode(file_get_contents($dir.'/manifest.json'),true,512,JSON_THROW_ON_ERROR);$after=[];
 foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS))as $f)if($f->isFile()&&!$f->isLink())$after[substr($f->getPathname(),strlen($root)+1)]=hash_file('sha256',$f->getPathname());
 $changed=[];foreach(array_unique(array_merge(array_keys($before['files']),array_keys($after)))as $p)if(($before['files'][$p]??null)!==($after[$p]??null))$changed[]=$p;
 $allowed=[];foreach($manifest['files']as $p=>$hash){$allowed[]='_accounts-preview/'.$p;verify(($after['_accounts-preview/'.$p]??'')===$hash,'Installed candidate drift');}sort($changed);sort($allowed);verify($changed===$allowed,'Unexpected web changes');
 foreach($before['configuration']as $p=>$hash)verify(hash_file('sha256',$private.'/'.$p)===$hash,'Original private file drift');
 $phases=['auth','api','sessions','forms','workflow','assignment','zone-johannesburg','zone-utc','zone-london-summer','zone-london-winter','zone-gap','zone-repeat','close','revoked'];$results=[];$counts=[];
 foreach($phases as $phase){$r=json_decode(file_get_contents($dir.'/result-'.$phase.'.json'),true,512,JSON_THROW_ON_ERROR);verify(($r['status']??'')==='PASS'&&($r['synthetic_only']??false),'Incomplete phase: '.$phase);$results[$phase]=$r;$counts[$phase]=$r['checks'];}
 $receipt=['status'=>'PASS','at'=>gmdate('c'),'php'=>PHP_VERSION,'checked_web_files'=>count($after),'changed_web_files'=>$changed,'manifest'=>$manifest,'phase_results'=>$results,'live_files_unchanged'=>true,'private_originals_unchanged'=>true,'worker_join_unchanged'=>true,'physical_phone_accepted'=>false];
 $json=json_encode($receipt,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR);verify(file_put_contents($dir.'/closeout.json',$json,LOCK_EX)!==false,'Receipt failed');chmod($dir.'/closeout.json',0600);
 echo json_encode(['status'=>'PASS','phases'=>$counts,'checks'=>array_sum($counts),'web_files'=>count($after),'receipt_sha256'=>hash('sha256',$json)]);
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','error'=>$e->getMessage()])."\n");exit(1);}
