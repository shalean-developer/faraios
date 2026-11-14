<?php
declare(strict_types=1);
// Use the existing account entrypoint's private environment-config routing.
// Cookie identity and customer authorization remain business-scoped below.
$_SERVER['SCRIPT_NAME']=preg_replace('~/account/customer\.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']??'');
require __DIR__.'/core.php';
require __DIR__.'/profile-core.php';
require dirname(__DIR__).'/business/homepage.php';
header('Cache-Control: no-store, private');header('X-Robots-Tag: noindex, nofollow');header('Vary: Cookie');
$slug=is_string($_GET['slug']??null)?$_GET['slug']:'';
$header=($_GET['mode']??'')==='header';if($header&&$_SERVER['REQUEST_METHOD']!=='GET'){http_response_code(405);header('Allow: GET');exit;}$p=null;$error='';$u=null;
try{
 if(!preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/',$slug)||strlen($slug)>64){http_response_code(404);exit;}
 $base=cfg()['base_url'];
 $rows=api('/rest/v1/business_public_pages?environment=eq.'.profile_env().'&slug=eq.'.rawurlencode($slug).'&select=slug,document',[],'GET');$p=$rows[0]['document']??null;
 if(!$p){http_response_code(404);exit;}
 // Separate browser sessions per mount and business; never read the owner cookie.
 $return=is_string($_GET['return']??null)?$_GET['return']:'';
 if(!in_array($return,['','services','how-it-works','areas','contact','booking','booking-service','booking-details','booking-schedule','booking-contact','booking-review'],true))$return='';
 $home=$base.'/b/'.$slug;$back=$home.(str_starts_with($return,'booking')?'?booking=1'.(str_starts_with($return,'booking-')?'&step='.substr($return,8):''):($return!==''?'/'.$return:''));
 $self=$base.'/account/customer.php?slug='.rawurlencode($slug).'&return='.rawurlencode($return);
 header('Referrer-Policy: same-origin');header('X-Content-Type-Options: nosniff');
 header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
 ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
 session_name('faraios_customer_'.substr(hash('sha256',$base.'|'.$slug),0,20));
 session_set_cookie_params(['lifetime'=>0,'path'=>(parse_url($base,PHP_URL_PATH)?:'').'/account/','secure'=>(cfg()['environment']??'')!=='test','httponly'=>true,'samesite'=>'Lax']);
 if(!session_start())throw new RuntimeException('Please try again shortly.');
 if(isset($_SESSION['touched'])&&time()-$_SESSION['touched']>1800){$_SESSION=[];session_regenerate_id(true);}
 $_SESSION['csrf']??=bin2hex(random_bytes(32));$_SESSION['touched']=time();
 if($_SERVER['REQUEST_METHOD']==='POST'){
  csrf();
  if(($_POST['action']??'')==='logout'){
   if(!empty($_SESSION['auth'])){try{api('/auth/v1/logout?scope=local',[],'POST',$_SESSION['auth']['access_token']);}catch(Throwable $e){}}
   $_SESSION=[];session_regenerate_id(true);header('Location: '.$back,true,303);exit;
  }
  $password=$_POST['password']??'';if(!is_string($password)||strlen($password)>128||$password==='')throw new RuntimeException('Enter your password.');
  $s=api('/auth/v1/token?grant_type=password',['email'=>email(),'password'=>$password]);$s['expires_at']=time()+(int)($s['expires_in']??3600);store_session($s);
 }
 elseif($_SERVER['REQUEST_METHOD']!=='GET'){http_response_code(405);header('Allow: GET, POST');exit;}
 if(!empty($_SESSION['auth'])){$u=user();if($_SERVER['REQUEST_METHOD']==='POST'){header('Location: '.$back,true,303);exit;}}
}catch(Throwable $e){
 if($e instanceof AccountSessionExpired){unset($_SESSION['auth']);session_regenerate_id(true);}
 $error=$e instanceof RuntimeException?$e->getMessage():'Sign in unavailable. Please try again.';
 if(!$p){http_response_code(503);exit;}
}
if($header){header('Content-Type: application/json');$initials='U';if($u){$name=(string)($u['user_metadata']['name']??'');preg_match('/[\p{L}\p{N}]/u',$name,$match);$initials=strtoupper($match[0]??'U');}echo json_encode(['authenticated'=>(bool)$u]+($u?['initials'=>$initials]:[]));exit;}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=esc($u?'Your account':'Customer sign in')?> · <?=esc($p['name'])?></title><link rel="stylesheet" href="<?=esc($base)?>/business/profile.css"><link rel="stylesheet" href="<?=esc($base)?>/business/homepage.css?v=customer-centre-1"></head><body class="homepage-page">
<?php homepage_header($p,$home,$base,$home.'?logo=1');?><main id="homepage" class="customer-main<?=esc(business_style_classes($p))?>" tabindex="-1"><h1 class="customer-intro"><?=$u?'Your account':'Customer sign in'?></h1><p class="customer-intro"><?=esc($p['name'])?></p>
<?php if($error!==''):?><p role="alert"><?=esc($error)?></p><?php endif;?>
<?php if($u):?><p>You are signed in. Customer booking history and profile management are not available yet.</p><?php form_start();?><input type="hidden" name="action" value="logout"><button class="home-button">Sign out</button></form>
<?php else:?><p class="customer-intro">Sign in to your account.</p><?php form_start();input('email','Email address','email','email',254);?><label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" maxlength="128" required><button class="home-button">Sign in</button></form><?php endif;?><p class="customer-back"><a href="<?=esc($back)?>">Back to <?=esc($p['name'])?></a></p></main><script src="<?=esc($base)?>/ui/booking-header.js?v=2" defer></script></body></html>
