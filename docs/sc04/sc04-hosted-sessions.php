<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';
$base='https://www.faraios.com/_accounts-preview/account/';
$file=$private.'/sc04-synthetic-browser-sessions.json';
$phase=getopt('',['phase:'])['phase']??'inspect';$report=[];
function session_check(bool $ok,string $name):void{global $report;if(!$ok)throw new RuntimeException('Check failed: '.$name);$report[]=['check'=>$name,'passed'=>true];}
function session_http(string $role,string $page,array $post=[]):string{
 global $base,$sessions;
 for($hop=0;$hop<8;$hop++){
  $headers=['Origin: https://www.faraios.com'];
  if(isset($sessions[$role]))$headers[]='Cookie: '.$sessions[$role];
  $opts=['http'=>['method'=>$post?'POST':'GET','header'=>implode("\r\n",$headers),'ignore_errors'=>true,'follow_location'=>0,'timeout'=>20],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]];
  if($post){$opts['http']['header'].="\r\nContent-Type: application/x-www-form-urlencoded";$opts['http']['content']=http_build_query($post);}
  $body=@file_get_contents($base.$page,false,stream_context_create($opts));$location=null;$status=0;
  foreach($http_response_header??[] as $h){if(preg_match('~^HTTP/\S+\s+(\d+)~',$h,$m))$status=(int)$m[1];if(preg_match('/^Set-Cookie: (faraios_account_[^;]+)/i',$h,$m))$sessions[$role]=$m[1];if(preg_match('/^Location: (.+)$/i',$h,$m))$location=$m[1];}
  if($status>=300&&$status<400&&$location){if(str_contains($location,'://')||str_starts_with($location,'//')||str_contains($location,'..'))throw new RuntimeException('Unexpected redirect');$page=$location;$post=[];continue;}
  if($status!==200||$body===false)throw new RuntimeException('Synthetic session HTTP unavailable');return $body;
 }
 throw new RuntimeException('Synthetic redirect limit');
}
function session_csrf(string $html):string{if(!preg_match('/name="csrf" value="([a-f0-9]+)"/',$html,$m))throw new RuntimeException('Missing synthetic session form');return $m[1];}
try{
 $f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true,512,JSON_THROW_ON_ERROR);
 $sessions=is_file($file)?json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR):[];
 if($phase==='prepare'){
  session_check(!$sessions,'new_isolated_cookie_jars');
  foreach(['manager','receptionist','worker'] as $role){
   session_check(str_ends_with($f[$role]['email'],'@example.test'),'reserved_account:'.$role);
   $html=session_http($role,'index.php?page=signin');
   session_http($role,'index.php?page=signin',['csrf'=>session_csrf($html),'email'=>$f[$role]['email'],'password'=>$f[$role]['password']]);
   $html=session_http($role,'context.php');
   $html=session_http($role,'context.php',['csrf'=>session_csrf($html),'context'=>$f['_business_a'].':preview']);
   session_check(str_contains($html,$role.' · preview'),'fresh_selected_workspace:'.$role);
   if($role==='worker')session_check(!str_contains($html,'SYNTHETIC PRIVATE NOTES')&&!str_contains($html,'50500'),'worker_html_filters');
  }
  file_put_contents($file,json_encode($sessions),LOCK_EX);chmod($file,0600);
 }elseif($phase==='check'){
  session_check(count($sessions)===3,'retained_cookie_jars');
  foreach(['manager','receptionist','worker'] as $role){$html=session_http($role,'delegated.php');session_check(str_contains($html,'No active business access.')&&!str_contains($html,'Synthetic remaining'),'same_cookie_revoked:'.$role);}
 }else throw new RuntimeException('Choose prepare or check');
 $out=['status'=>'PASS','phase'=>$phase,'checks'=>count($report),'results'=>$report,'synthetic_only'=>true,'no_user_browser_session_changed'=>true,'secrets_printed'=>false];
 file_put_contents($private.'/sc04-sessions-result-'.$phase.'.json',json_encode($out),LOCK_EX);chmod($private.'/sc04-sessions-result-'.$phase.'.json',0600);echo json_encode($out)."\n";
}catch(Throwable $e){echo json_encode(['status'=>'STOP','error'=>$e->getMessage(),'secrets_printed'=>false])."\n";exit(1);}
