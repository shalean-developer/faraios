<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$root='/var/www/vhosts/shalean.com/faraios.com/account';$private='/var/www/vhosts/shalean.com/private/faraios-account';
function ensure(bool $b,string $m):void{if(!$b)throw new RuntimeException($m);}
function snapshot(string $d):array{$r=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($d,FilesystemIterator::SKIP_DOTS))as$f)if($f->isFile()&&!in_array($f->getBasename(),['platform.php','platform-session.php'],true))$r[$f->getPathname()]=hash_file('sha256',$f->getPathname());ksort($r);return $r;}
try{
 $before=snapshot($root);$cfg=[];foreach(['config.php','production.php','platform-owner.php']as$n)$cfg[$n]=hash_file('sha256',$private.'/'.$n);
 $current=file_get_contents($root.'/platform.php');ensure(hash('sha256',$current)==='8c6c0f029be0521ceabea32316edc62ed914da1acc23e51b8fd08a60e5faee6d','entry_baseline');
 $core=file_get_contents($root.'/core.php');ensure(substr_count($core,"$"."dir.'/config.php'")===2,'configuration_selector');
 $session=str_replace("$"."dir.'/config.php'","$"."dir.'/production.php'",$core);
 $session=str_replace('declare(strict_types=1);',"declare(strict_types=1);\nif(realpath(\$_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}",$session);
 token_get_all($session,TOKEN_PARSE);ensure(!file_exists($root.'/platform-session.php'),'adapter_exists');
 $entry=str_replace("require __DIR__.'/core.php';","require (is_file(__DIR__.'/platform-session.php')?__DIR__.'/platform-session.php':__DIR__.'/core.php');",$current);
 ensure(hash('sha256',$entry)==='d7ac087c3568b7032214118130f173bdc963d6568d84c0715f3d3aa30fb0128b','entry_hash');
 $backup=$private.'/platform-session-patch-backup.php';ensure(!file_exists($backup),'backup_exists');file_put_contents($backup,$current);chmod($backup,0600);
 ensure(file_put_contents($root.'/platform-session.php',$session)===strlen($session),'adapter_write');chmod($root.'/platform-session.php',0644);
 ensure(file_put_contents($root.'/platform.php',$entry)===strlen($entry),'entry_write');chmod($root.'/platform.php',0644);
 if(function_exists('opcache_invalidate')){opcache_invalidate($root.'/platform.php',true);opcache_invalidate($root.'/platform-session.php',true);}
 ensure(snapshot($root)===$before,'existing_files_changed');foreach($cfg as$n=>$hash)ensure(hash_file('sha256',$private.'/'.$n)===$hash,'config_changed');
 echo json_encode(['status'=>'PASS','production_session_adapter'=>true,'existing_runtime_preserved'=>count($before),'private_configs_preserved'=>true,'entry_hash'=>hash('sha256',$entry),'adapter_hash'=>hash('sha256',$session),'original_core_hash'=>hash('sha256',$core)])."\n";
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','reason'=>$e->getMessage()])."\n");exit(1);}
