<?php
declare(strict_types=1);
// Nginx may route PHP directly without Apache rewrite rules. Helpers are include-only.
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function enquiry_session(): void {
 $c=cfg();$path=(parse_url($c['base_url'],PHP_URL_PATH)?:'').'/b/';
 ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
 session_name('faraios_enquiry_'.substr(hash('sha256',$c['base_url']),0,12));
 session_set_cookie_params(['lifetime'=>0,'path'=>$path,'secure'=>($c['environment']??'')!=='test','httponly'=>true,'samesite'=>'Lax']);
 if(!session_start())throw new RuntimeException('Please try again shortly.');
 $_SESSION['forms']??=[];foreach($_SESSION['forms'] as $key=>$v)if(time()-$v['time']>3600)unset($_SESSION['forms'][$key]);
}
function enquiry_ticket(string $slug): array {
 if(!isset($_SESSION['forms'][$slug])){if(count($_SESSION['forms'])>=20)array_shift($_SESSION['forms']);$r=bin2hex(random_bytes(16));$_SESSION['forms'][$slug]=['csrf'=>bin2hex(random_bytes(32)),'request'=>substr($r,0,8).'-'.substr($r,8,4).'-'.substr($r,12,4).'-'.substr($r,16,4).'-'.substr($r,20),'time'=>time()];}
 return $_SESSION['forms'][$slug];
}
function enquiry_text(string $key,int $min,int $max): string {
 $v=$_POST[$key]??'';if(!is_string($v))throw new RuntimeException('Check your details.');$v=trim($v);
 if(!preg_match('//u',$v)||mb_len($v)<$min||mb_len($v)>$max||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$v))throw new RuntimeException('Check your '.str_replace('_',' ',$key).'.');return $v;
}
function enquiry_ip_limit(): void {
 // Origin IP only; never trust arbitrary forwarded headers. Hashes expire after one hour; no raw IPs stored.
 $file=sys_get_temp_dir().'/faraios-enquiry-'.hash('sha256',__DIR__).'.json';$f=@fopen($file,'c+');if($f)chmod($file,0600);if(!$f||!flock($f,LOCK_EX))throw new RuntimeException('Please try again shortly.');
 try{$entries=json_decode(stream_get_contents($f)?:'{}',true)?:[];$now=time();foreach($entries as $k=>$v)if($now-$v['time']>=3600)unset($entries[$k]);$key=hash('sha256',($_SERVER['REMOTE_ADDR']??'unknown').'|'.cfg()['base_url']);$r=$entries[$key]??['time'=>$now,'n'=>0];if($r['n']>=10||count($entries)>2000)throw new RuntimeException('Too many attempts. Please try again later.');$r['n']++;$entries[$key]=$r;rewind($f);ftruncate($f,0);if(fwrite($f,json_encode($entries,JSON_THROW_ON_ERROR))===false)throw new RuntimeException('Please try again shortly.');}finally{flock($f,LOCK_UN);fclose($f);}
}
function enquiry_submit(string $slug,array $services,string $page='',string $businessName=''): void {
 $ticket=enquiry_ticket($slug);$origin=parse_url(cfg()['base_url'],PHP_URL_SCHEME).'://'.parse_url(cfg()['base_url'],PHP_URL_HOST);if($port=parse_url(cfg()['base_url'],PHP_URL_PORT))$origin.=':'.$port;
 if((int)($_SERVER['CONTENT_LENGTH']??0)>20000)throw new RuntimeException('This form is too large.');
 if(!is_string($_POST['csrf']??null)||!hash_equals($ticket['csrf'],$_POST['csrf'])||(isset($_SERVER['HTTP_ORIGIN'])&&$_SERVER['HTTP_ORIGIN']!==$origin)||($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site')throw new RuntimeException('This form has expired. Reload the page and try again.');
 if(($_POST['website']??'')!==''||time()-$ticket['time']<2)throw new RuntimeException('Please wait a moment and try again.');
 $name=enquiry_text('name',2,120);if(preg_match('/[\r\n\t]/',$name))throw new RuntimeException('Check your name.');
 $email=strtolower(enquiry_text('email',0,254));$phone=enquiry_text('phone',0,40);$requirements=enquiry_text('requirements',10,4000);
 if($email===''&&$phone==='')throw new RuntimeException('Enter an email address or phone number so the business can reply.');
 if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))throw new RuntimeException('Enter a valid email address.');
 if($phone!==''&&(!preg_match('/\A[+0-9 ()-]{5,40}\z/',$phone)||strlen(preg_replace('/[^0-9]/','',$phone))<5))throw new RuntimeException('Enter a valid phone number.');
 $service=enquiry_text('service',0,32);$allowed=array_column(array_filter($services['items']??[],fn($s)=>$s['visible']&&!$s['archived']),'id');if($service!==''&&!in_array($service,$allowed,true))throw new RuntimeException('That service is no longer available. Choose another service.');
 enquiry_ip_limit();api('/rest/v1/rpc/business_enquiry_submit',['p_environment'=>profile_env(),'p_slug'=>$slug,'p_service'=>$service,'p_name'=>$name,'p_email'=>$email,'p_phone'=>$phone,'p_requirements'=>$requirements,'p_request'=>$ticket['request']]);
 unset($_SESSION['forms'][$slug]);$_SESSION['enquiry_sent']=$slug;
 header('Location: '.cfg()['base_url'].'/b/'.rawurlencode($slug).($page==='contact'?'/contact':'').'#enquire',true,303);exit;
}
function enquiry_form(string $slug,array $services,string $error,bool $sent,bool $custom=false,string $page='',string $businessName=''): void {
 $ticket=enquiry_ticket($slug);echo '<section class="public-card enquiry-form" id="enquire"><h2>Enquire or request a quote</h2><p class="muted">Tell us what you need. The business will contact you directly.</p>';
 if($error!=='')echo '<p class="alert" role="alert">'.esc($error).'</p>';
 if($sent)echo '<p class="notice" role="status">Your enquiry has been sent. The business can now contact you.</p>';
 echo '<form method="post" action="'.esc(cfg()['base_url'].'/b/'.$slug.($page==='contact'?'/contact':'')).'#enquire"><input type="hidden" name="csrf" value="'.esc($ticket['csrf']).'"><div class="spam-field" aria-hidden="true"><label for="website">Leave blank</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>';
 $available=array_filter($services['items']??[],fn($s)=>!empty($s['visible'])&&empty($s['archived']));
 if($available){echo '<label for="service">Service <span class="optional">optional</span></label><select id="service" name="service"'.($custom?' data-faraios-select':'').'><option value="">General enquiry</option>';
 foreach($services['items']??[] as $s)if($s['visible']&&!$s['archived'])echo '<option value="'.esc($s['id']).'"'.(($_POST['service']??'')===$s['id']?' selected':'').'>'.esc($s['name']).'</option>';
 echo '</select>';}
 echo '<label for="name">Your name</label><input id="name" name="name" autocomplete="name" minlength="2" maxlength="120" required value="'.esc(is_string($_POST['name']??null)?$_POST['name']:'').'">';
 foreach(['email'=>'Email address','phone'=>'Phone number'] as $key=>$label)echo '<label for="'.$key.'">'.$label.'</label><input id="'.$key.'" name="'.$key.'" type="'.($key==='phone'?'tel':'email').'" autocomplete="'.($key==='phone'?'tel':'email').'" maxlength="'.($key==='phone'?40:254).'" value="'.esc(is_string($_POST[$key]??null)?$_POST[$key]:'').'">';
 echo '<small>Provide at least one: email address or phone number.</small><label for="requirements">What do you need?</label><textarea id="requirements" name="requirements" rows="5" minlength="10" maxlength="4000" required>'.esc(is_string($_POST['requirements']??null)?$_POST['requirements']:'').'</textarea><p class="muted enquiry-privacy">Your details are shared privately with '.esc($businessName!==''?$businessName:'this business').' to respond to your request. This does not subscribe you to marketing. <a href="'.esc(cfg()['base_url']).'/privacy.html#enquiries" target="_blank" rel="noopener noreferrer" aria-label="Enquiry privacy notice (opens in a new tab)">How this enquiry uses your data</a></p><button class="button">Send enquiry</button></form></section>';
}
