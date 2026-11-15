<?php
if(!is_file(__DIR__.'/core.php')){http_response_code(404);exit;}
require __DIR__.'/core.php';
$error='';$contexts=[];
try {
 start();user();$contexts=api('/rest/v1/rpc/business_contexts',['p_discovery'=>true],'POST',$_SESSION['auth']['access_token']);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  csrf();$key=(string)($_POST['context']??'');$matches=array_values(array_filter($contexts,fn($c)=>$key===$c['business_id'].':'.$c['environment']));
  if(count($matches)!==1)throw new RuntimeException('Business access is unavailable.');
  $_SESSION['business_context']=$matches[0];session_regenerate_id(true);
  header('Location: '.($matches[0]['role']==='owner'?'dashboard.php':'delegated.php'),true,303);exit;
 }
}catch(AccountSessionExpired $e){go('signin');}catch(Throwable $e){$error=$e instanceof RuntimeException?$e->getMessage():'Business access is unavailable.';}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Choose business | FaraiOS</title><link rel="stylesheet" href="account.css"></head><body><main><section class="card"><h1>Choose business</h1><?php if($error):?><p role="alert"><?=esc($error)?></p><?php endif;if($contexts):form_start();?><label for="context">Business and environment</label><select name="context" id="context" required><option value="">Choose a workspace</option><?php foreach($contexts as $c):?><option value="<?=esc($c['business_id'].':'.$c['environment'])?>"><?=esc(($c['name']??substr($c['business_id'],0,8)).' · '.$c['environment'].' · '.$c['role'])?></option><?php endforeach;?></select><button class="primary">Continue</button></form><?php else:?><p>No active business access.</p><a href="index.php?page=business">Create your business</a><?php endif;?></section></main></body></html>
