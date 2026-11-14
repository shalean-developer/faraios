<?php
declare(strict_types=1);
require __DIR__.'/core.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('Vary: Cookie');
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){http_response_code(405);header('Allow: GET');echo '{}';exit;}
$result=['authenticated'=>false];
try{
 start();
 if(!empty($_SESSION['auth'])){
  $u=user();
  $name=trim((string)($u['user_metadata']['full_name']??$u['user_metadata']['name']??''));
  $parts=preg_split('/\s+/u',$name,-1,PREG_SPLIT_NO_EMPTY)?:[];
  $initials='';
  foreach(array_slice($parts,0,2) as $part){preg_match('/[\p{L}\p{N}]/u',$part,$match);$initials.=$match[0]??'';}
  if($initials===''){preg_match('/[a-z0-9]/i',(string)($u['email']??''),$match);$initials=$match[0]??'U';}
  $result=['authenticated'=>true,'initials'=>strtoupper($initials)];
 }
 session_write_close();
}catch(Throwable $e){if(session_status()===PHP_SESSION_ACTIVE)session_write_close();}
echo json_encode($result,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR);
