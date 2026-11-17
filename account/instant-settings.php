<?php
declare(strict_types=1);
require __DIR__.'/core.php';
require __DIR__.'/profile-core.php';
require __DIR__.'/enquiries-core.php';
require __DIR__.'/requests-core.php';
$_SERVER['SCRIPT_NAME']=preg_replace('~/account/instant-settings.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
if (!instant_enabled()) { http_response_code(404); exit; }
start();
$user=user();
$b=business();
if (!$b) go('business');
$error='';
$ready=false;
try {
    $context=['p_business'=>$b['id']];
    $saved=profile_rpc('preview_instant_offer',$context);
    $token=$_SESSION['auth']['access_token'];
    $filter='?business_id=eq.'.rawurlencode($b['id']).'&environment=eq.preview';
    $pages=api('/rest/v1/business_public_pages'.$filter.'&select=document,services',[],'GET',$token);
    $page=$pages[0] ?? [];
    $staff=api('/rest/v1/business_staff'.$filter.'&active=eq.true&select=id,name',[],'GET',$token);
    $areas=request_areas($page['document']['areas'] ?? '');
    $services=array_filter($page['services']['items'] ?? [],fn($s)=>$s['visible']&&!$s['archived']&&$s['mode']==='fixed'&&strtolower(trim($s['name']))==='regular cleaning');
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        csrf();
        profile_rpc('preview_instant_offer',$context+['p_save'=>true,'p_service'=>$_POST['service']??'',
            'p_workers'=>array_values($_POST['workers']??[]),'p_areas'=>array_values($_POST['areas']??[])]);
        header('Location: instant-settings.php?saved=1',true,303);exit;
    }
    $ready=true;
} catch (Throwable $e) { $error='Could not read or save the offer. Check owner access, strict scheduling and published service settings.'; }
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instant booking settings</title><link rel="stylesheet" href="../business/profile.css"><link rel="stylesheet" href="../business/instant.css"></head><body><main class="instant">
<a href="services.php">Services</a><h1>Instant booking settings</h1><p>Preview · One-time Regular Cleaning</p>
<?php if($error): ?><p role="alert"><?=esc($error)?></p><?php endif; ?>
<?php if($ready): if(isset($_GET['saved'])): ?><p role="status">Settings saved.</p><?php endif; ?>
<p>Publish a fixed ZAR price, enable strict working hours and select the cleaners and areas eligible for test checkout.</p>
<?php form_start(); ?><label>Published service<select name="service"><option value="">Off</option><?php foreach($services as $s): ?><option value="<?=esc($s['id'])?>" <?=($saved['service_id']??'')===$s['id']?'selected':''?>><?=esc($s['name'])?></option><?php endforeach; ?></select></label>
<fieldset><legend>Eligible cleaners</legend><?php foreach($staff as $s): ?><label><input type="checkbox" name="workers[]" value="<?=esc($s['id'])?>" <?=in_array($s['id'],$saved['workers']??[],true)?'checked':''?>><?=esc($s['name'])?></label><?php endforeach; ?></fieldset>
<fieldset><legend>Covered service areas</legend><?php foreach($areas as $area): ?><label><input type="checkbox" name="areas[]" value="<?=esc($area)?>" <?=in_array($area,$saved['areas']??[],true)?'checked':''?>><?=esc($area)?></label><?php endforeach; ?></fieldset><button>Save settings</button></form><?php endif; ?></main></body></html>
