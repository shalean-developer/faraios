<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function account_business_version(array $b): string {
 return hash('sha256',json_encode(array_intersect_key($b,array_flip(['id','name','business_type','country','time_zone'])),JSON_THROW_ON_ERROR));
}
function save_account_details(array $u,array $b,string $redirect): void {
 $action=(string)($_POST['action']??'');$token=$_SESSION['auth']['access_token'];
 if($action==='save_personal') {
  $name=field('name',120);
  if(!hash_equals(hash('sha256',(string)($u['user_metadata']['name']??'')),(string)($_POST['version']??'')))throw new RuntimeException('Your name changed. Reload before saving.');
  api('/auth/v1/user',['data'=>['name'=>$name]],'PUT',$token);
  $_SESSION['notice']='Your name was saved.';
 } elseif($action==='save_business') {
  $name=field('business_name',120);$type=(string)($_POST['business_type']??'');
  if(!in_array($type,['cleaning','beauty-wellness','home-maintenance-trades','other'],true))throw new RuntimeException('Choose your business type.');
  $details=location_details();
  if(!hash_equals(account_business_version($b),(string)($_POST['version']??'')))throw new RuntimeException('Business details changed. Reload before saving.');
  $path='/rest/v1/businesses?id=eq.'.rawurlencode($b['id']);
  // Atomic compare-and-set also catches changes between the read and PATCH.
  foreach(['name','business_type','country','time_zone'] as $key)$path.='&'.$key.'='.(isset($b[$key])?'eq.'.rawurlencode($b[$key]):'is.null');
  $saved=api($path,array_merge(['name'=>$name,'business_type'=>$type],$details),'PATCH',$token);
  if(!$saved)throw new RuntimeException('Business details changed. Reload before saving.');
  $_SESSION['notice']='Business details saved. Published pages and issued documents were preserved.';
 } elseif($action==='change_email') {
  $email=email();
  if(strcasecmp($email,(string)$u['email'])===0)throw new RuntimeException('Enter a different email address.');
  api('/auth/v1/user?redirect_to='.rawurlencode($redirect),['email'=>$email],'PUT',$token);
  $_SESSION['notice']='Check both your current and new inboxes. Confirm both email links to finish changing your sign-in email.';
 } else {throw new RuntimeException('Choose the details you want to edit.');}
 go('welcome');
}
