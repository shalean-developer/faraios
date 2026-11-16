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
   $_SESSION['staff_join']=['id'=>$id,'token'=>$token];if(($_POST['entry']??'')==='signup'){$_SESSION['after_signin']='staff-join';go('signup');}
  }elseif(($_POST['action']??'')==='accept'){
   $u=user();$pending=$_SESSION['staff_join']??[];
   api('/rest/v1/rpc/business_staff_invite_accept',['p_environment'=>$environment,'p_id'=>$pending['id']??'','p_token'=>$pending['token']??''],'POST',$_SESSION['auth']['access_token']);
   unset($_SESSION['staff_join'],$_SESSION['business_context']);session_regenerate_id(true);header('Location: context.php',true,303);exit;
  }
 }
 if(isset($_SESSION['staff_join'])){$_SESSION['after_signin']='staff-join';$u=user();$pending=$_SESSION['staff_join'];$details=api('/rest/v1/rpc/business_staff_invite_preview',['p_environment'=>$environment,'p_id'=>$pending['id'],'p_token'=>$pending['token']],'POST',$_SESSION['auth']['access_token']);}
}catch(AccountSessionExpired $e){go('signin');}catch(Throwable $e){$error='Use the newest invitation and the email it was sent to.';}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Join your team | FaraiOS</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="account.css"><link rel="stylesheet" href="../ui/design-system.css"><link rel="stylesheet" href="staff-join.css?v=20261115"><script src="staff-join.js?v=20261115-2" defer></script></head><body class="ui-page ui-auth staff-join-page"><header><a href="../index.html" aria-label="FaraiOS home"><img src="../FaraiOS-logo.svg" alt="FaraiOS" width="160"></a><span class="join-header-label">Team access</span></header><main><section class="card join-card" aria-labelledby="join-heading"><div class="join-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4"/></svg></div><h1 id="join-heading">Join your team</h1>
<div id="join-capture" hidden><p class="join-intro">New here? Create your account first.<br>Already registered? Sign in.</p><?php form_start();?><input type="hidden" name="action" value="capture"><input type="hidden" name="invitation" id="invitation"><input type="hidden" name="token" id="token"><button class="primary" name="entry" value="signup" id="create-account" disabled>Create account</button><button class="join-secondary" id="continue" disabled>Continue securely</button></form><p class="join-note">Use the email that received this invitation.</p></div>
<div class="join-current">
<?php if($error):?><div class="join-message" role="alert"><h2>Can't open this invitation</h2><p><?=esc($error)?></p></div>
<?php elseif(!isset($_SESSION['staff_join'])):?><h2>Open your invitation email</h2><p>Tap the join button in the latest email from your team. If you don't have one, ask the owner to invite you.</p>
<?php elseif($u&&$details):?><p class="join-intro">Your team is ready for you.</p><div class="join-team"><h2><?=esc($details['business'])?></h2><div class="join-tags"><span><?=esc($details['role']==='worker'?'Worker / cleaner':ucfirst($details['role']))?></span><span><?=esc($details['environment'])?></span></div><p class="join-email"><?=esc($u['email']??'')?></p></div><?php form_start();?><input type="hidden" name="action" value="accept"><button class="primary">Accept invitation</button></form><p class="join-note">Next, choose your business and environment.</p><?php endif;?>
<?php if($u):?><div class="join-account"><p>Using a different email? Sign out, then reopen your invitation.</p><?php form_start();?><input type="hidden" name="action" value="logout"><button class="join-secondary" formaction="index.php?page=signin">Sign out</button></form></div><?php else:?><p class="join-note">Already joined? <a href="index.php?page=signin">Sign in</a></p><?php endif;?></div><noscript><p class="join-message">Enable JavaScript, then reopen your invitation email.</p></noscript></section></main><footer>© <?=date('Y')?> FaraiOS · <a href="../privacy.html#accounts">Privacy</a></footer></body></html>
