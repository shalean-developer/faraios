<?php
// One-use CLI-only guarded two-file preview update. No Auth or database mutations.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$d='/var/www/vhosts/shalean.com/private/faraios-account/offline-preview-20261116';$web='/var/www/vhosts/shalean.com/faraios.com';
function census(string $root):array{$out=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS))as $p)if($p->isFile()&&!$p->isLink())$out[substr($p->getPathname(),strlen($root)+1)]=hash_file('sha256',$p->getPathname());ksort($out);return $out;}
function receipt(string $name,array $v):void{global $d;file_put_contents($d.'/'.$name,json_encode($v,JSON_THROW_ON_ERROR),LOCK_EX);chmod($d.'/'.$name,0600);}
try{
 if(file_exists($d.'/before.json'))throw new RuntimeException('Update already attempted; inspect receipts');
 $m=json_decode(file_get_contents($d.'/manifest.json'),true,512,JSON_THROW_ON_ERROR);$before=census($web);$expected=['_accounts-preview/account/delegated.php','_accounts-preview/account/workspace.js'];
 if(($before[$expected[0]]??null)!=='dcb569b8c55cc6e92fed89bb97a6307ee3b5a7ee401ba5ae84f5c8d4d22070c1'||isset($before[$expected[1]]))throw new RuntimeException('Preview baseline drift');
 $private=census('/var/www/vhosts/shalean.com/private/faraios-staff-invite');foreach(['config.php','production.php']as $n)$private['account/'.$n]=hash_file('sha256',dirname($d).'/'.$n);
 foreach($expected as $n)if(hash_file('sha256',$d.'/'.basename($n))!==$m[$n])throw new RuntimeException('Candidate drift');
 exec('/opt/plesk/php/8.2/bin/php -l '.escapeshellarg($d.'/delegated.php').' 2>&1',$lint,$code);if($code!==0)throw new RuntimeException('PHP lint failed');
 receipt('before.json',['web'=>$before,'private'=>$private]);copy($web.'/'.$expected[0],$d.'/delegated.before.php');chmod($d.'/delegated.before.php',0600);
 foreach($expected as $n){$to=$web.'/'.$n;if(!copy($d.'/'.basename($n),$to.'.offline-tmp'))throw new RuntimeException('Stage failed');chmod($to.'.offline-tmp',0644);if(!rename($to.'.offline-tmp',$to))throw new RuntimeException('Atomic replacement failed');}
 $after=census($web);$changed=[];foreach(array_unique(array_merge(array_keys($before),array_keys($after)))as $n)if(($before[$n]??null)!==($after[$n]??null))$changed[]=$n;sort($changed);sort($expected);if($changed!==$expected)throw new RuntimeException('Unexpected web change');
 foreach($expected as $n)if(($after[$n]??null)!==$m[$n])throw new RuntimeException('Installed hash mismatch');
 $now=census('/var/www/vhosts/shalean.com/private/faraios-staff-invite');foreach(['config.php','production.php']as $n)$now['account/'.$n]=hash_file('sha256',dirname($d).'/'.$n);if($now!==$private)throw new RuntimeException('Private configuration changed');
 $out=['status'=>'PASS','changed'=>$changed,'files'=>$m,'live_and_other_web_files_unchanged'=>true,'private_configuration_unchanged'=>true,'phone_retry_pending'=>true,'at'=>gmdate('c')];receipt('verified.json',$out);echo json_encode($out);
}catch(Throwable $e){echo json_encode(['status'=>'STOP','error'=>$e->getMessage()]);exit(1);}
