<?php
require __DIR__.'/core.php';
$_SERVER['SCRIPT_NAME']=preg_replace('~/account/staff-join\.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
header('Referrer-Policy: no-referrer');header('Cache-Control: no-store');header("Content-Security-Policy: default-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
$error='';$u=null;$details=null;$environment=(parse_url(cfg()['base_url'],PHP_URL_PATH)?:'')===''?'live':'preview';
try{
 start();
 if($_SERVER['REQUEST_METHOD']==='POST'){
  csrf();
  if(($_POST['action']??'')==='capture'){
   $id=(string)($_POST['invitation']??'');$token=(string)($_POST['token']??'');
   if(!preg_match('/^[a-f0-9-]{36}$/',$id)||!preg_match('/^[a-f0-9]{64}$/',$token))throw new RuntimeException('Invalid invitation link.');
   $_SESSION['staff_join']=['id'=>$id,'token'=>$token];
  }elseif(($_POST['action']??'')==='accept'){
   $u=user();$pending=$_SESSION['staff_join']??[];
   api('/rest/v1/rpc/business_staff_invite_accept',['p_environment'=>$environment,'p_id'=>$pending['id']??'','p_token'=>$pending['token']??''],'POST',$_SESSION['auth']['access_token']);
   unset($_SESSION['staff_join'],$_SESSION['business_context']);session_regenerate_id(true);header('Location: context.php',true,303);exit;
  }
 }
 if(isset($_SESSION['staff_join'])){$_SESSION['after_signin']='staff-join';$u=user();$pending=$_SESSION['staff_join'];$details=api('/rest/v1/rpc/business_staff_invite_preview',['p_environment'=>$environment,'p_id'=>$pending['id'],'p_token'=>$pending['token']],'POST',$_SESSION['auth']['access_token']);}
}catch(AccountSessionExpired $e){go('signin');}catch(Throwable $e){$error='Invitation unavailable, expired, changed or intended for another verified email. Sign in with the invited account or ask the owner to resend.';}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Join your team | FaraiOS</title><link rel="stylesheet" href="account.css"><link rel="stylesheet" href="workspace.css"><link rel="stylesheet" href="staff-onboarding.css"><link rel="stylesheet" href="../ui/design-system.css"><script src="staff-join.js" defer></script></head><body class="ui-page ui-workspace"><main class="role-workspace"><h1>Join your team</h1><?php if($error):?><p role="alert"><?=esc($error)?></p><?php endif;?>
<?php if(!isset($_SESSION['staff_join'])):?><p>Continue from your invitation email. This does not grant access until you sign in and accept.</p><?php form_start();?><input type="hidden" name="action" value="capture"><input type="hidden" name="invitation" id="invitation"><input type="hidden" name="token" id="token"><button class="button" id="continue" disabled>Continue securely</button></form><noscript>Enable JavaScript to open the private invitation link.</noscript>
<?php elseif($u&&$details):?><p><?=esc($details['business'].' · '.$details['environment'].' · '.$details['role'])?></p><p>Signed in as <?=esc($u['email']??'')?>. Accept only if this is the email invited by the business owner.</p><?php form_start();?><input type="hidden" name="action" value="accept"><button class="button">Accept invitation</button></form><p>After acceptance you will select the business and environment explicitly.</p><?php endif;if($u):?><p>Wrong account? Sign out, then reopen the invitation email and sign in with the invited email.</p><?php form_start();?><input type="hidden" name="action" value="logout"><button class="button secondary" formaction="index.php?page=signin">Sign out</button></form><?php endif;?></main></body></html>
