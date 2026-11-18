<?php
declare(strict_types=1);
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/guard.php';
book05_gate();
header("Content-Security-Policy: default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
session_name('book03_availability');
session_set_cookie_params(['path'=>BOOK05_PATH,'secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
session_start();
if (($_SESSION['until']??PHP_INT_MAX)<time()) $_SESSION=[];
$_SESSION['csrf']??=bin2hex(random_bytes(32));
function h(string $s): string {return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function call_preview(string $route,array $data,array $headers=[]): array {
    $headers=array_merge(['apikey: sb_publishable_RnXDADzjKXxkoC2cy28_Fg_BvyV281k','Content-Type: application/json'],$headers);
    $ctx=stream_context_create(['http'=>['method'=>'POST','header'=>implode("\r\n",$headers),'content'=>json_encode((object)$data,JSON_THROW_ON_ERROR),'ignore_errors'=>true,'timeout'=>12,'follow_location'=>0]]);
    $raw=@file_get_contents('https://jqnecahhaxxdsrybwuoo.supabase.co'.$route,false,$ctx,0,131072);
    preg_match('~^HTTP/\S+ (\d+)~',$http_response_header[0]??'',$m);
    $reply=json_decode($raw?:'{}',true);
    if (($m[1]??'')!=='200' && ($m[1]??'')!=='204') {
        $message=$reply['message']??'';
        $known=['Settings changed. Reload before saving.','Time off overlaps an assigned visit.','Time off must end after it starts.','Check availability limits and selections.','Select staff from this business.','Check working hours, time zone and buffers.','Outside working hours, including travel buffers. Choose another time.'];
        throw new DomainException(in_array($message,$known,true)?$message:'Could not complete the request. Check owner access and the entered values.');
    }
    return is_array($reply)?$reply:[];
}
function owner_rpc(string $op,array $data=[]): array {
    $headers=['Authorization: Bearer '.$_SESSION['token'],'Accept-Profile: book05_eft','Content-Profile: book05_eft','x-faraios-environment: preview'];
    if(isset($data['p_business'])) $headers[]='x-faraios-business: '.$data['p_business'];
    return call_preview('/rest/v1/rpc/'.$op,$data,$headers);
}
function minutes(string $s): int {
    if (!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$/D',$s)) throw new DomainException('Enter working hours as HH:MM.');
    return (int)substr($s,0,2)*60+(int)substr($s,3,2);
}
function clock_text(int $n): string {return sprintf('%02d:%02d',intdiv($n,60),$n%60);}
function csrf_field(): void {echo '<input type="hidden" name="csrf" value="'.h($_SESSION['csrf']).'">';}
function redirect_self(): never {header('Location: availability.php',true,303);exit;}
$error='';$settings=null;$businesses=[];
try{
    $post=$_SERVER['REQUEST_METHOD']==='POST';
    $action=$post?($_POST['action']??''):'';
    if ($post && ((int)($_SERVER['CONTENT_LENGTH']??0)>32768 || !is_string($_POST['csrf']??null) || !hash_equals($_SESSION['csrf'],$_POST['csrf']) || ($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site')){http_response_code(403);exit;}
    if ($action==='login') {
        $a=call_preview('/auth/v1/token?grant_type=password',['email'=>trim($_POST['email']??''),'password'=>$_POST['password']??'']);
        if(empty($a['access_token']))throw new DomainException('Owner sign-in failed.');
        session_regenerate_id(true);
        $_SESSION=['token'=>$a['access_token'],'until'=>time()+min(1500,(int)$a['expires_in']),'csrf'=>bin2hex(random_bytes(32))];redirect_self();
    }
    if ($action==='logout') {
        if(isset($_SESSION['token'])) {try{call_preview('/auth/v1/logout?scope=local',[],['Authorization: Bearer '.$_SESSION['token']]);}catch(Throwable $e){}}
        $_SESSION=[];session_destroy();redirect_self();
    }
    if(isset($_SESSION['token'])) {
        $businesses=owner_rpc('book03_businesses');
        $ids=array_column($businesses,'id');
        $bid=($action==='choose'?($_POST['business']??''):($_SESSION['business']??($ids[0]??'')));
        if($bid!==''&&!in_array($bid,$ids,true)) throw new DomainException('Choose a business you own.');
        if($bid!=='') {
            $_SESSION['business']=$bid;
            $settings=owner_rpc('book03_settings',['p_business'=>$bid]);
            if($action==='save') {
                if(($_POST['business']??'')!==$bid) throw new DomainException('Reload the selected business before saving.');
                $hours=[];
                foreach($_POST['days']??[] as $d) $hours[]=['day'=>(int)$d,'start'=>minutes($_POST['from'][$d]??''),'end'=>minutes($_POST['to'][$d]??'')];
                $blocks=[];
                foreach($settings['blocks'] as $i=>$block) if(!in_array((string)$i,$_POST['remove']??[],true))$blocks[]=$block;
                if(($_POST['off_start']??'')!=='' || ($_POST['off_end']??'')!=='') $blocks[]=['staff'=>$_POST['off_staff']??'','start'=>$_POST['off_start']??'','end'=>$_POST['off_end']??''];
                $changes=['hours'=>$hours,'before'=>$_POST['before']??'','after'=>$_POST['after']??'','eligible'=>array_values($_POST['eligible']??[]),'paused'=>isset($_POST['paused']),'notice'=>$_POST['notice']??'','horizon'=>$_POST['horizon']??'','holidays'=>preg_split('/[\s,]+/',trim($_POST['holidays']??''),-1,PREG_SPLIT_NO_EMPTY),'blocks'=>$blocks];
                owner_rpc('book03_settings',['p_business'=>$bid,'p_revision'=>$_POST['revision']??'','p_changes'=>$changes]);
                $_SESSION['notice']='Availability saved.';redirect_self();
            }
        }
    }
}catch(DomainException $e){$error=$e->getMessage();}catch(Throwable $e){$error='Availability settings could not be loaded or saved.';}
$notice=$_SESSION['notice']??'';unset($_SESSION['notice']);
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking availability</title><link rel="stylesheet" href="payments.css"></head><body><main>
<a href="b/index.php">Private checkout</a><h1>Booking availability</h1>
<?php if($error):?><p role="alert"><?=h($error)?></p><?php endif;if($notice):?><p role="status"><?=h($notice)?></p><?php endif;?>
<?php if(!isset($_SESSION['token'])):?><form method="post"><?php csrf_field();?><label>Preview owner email<input type="email" name="email" required></label><label>Password<input type="password" name="password" autocomplete="current-password" required></label><button name="action" value="login">Sign in</button></form>
<?php else: ?><form method="post"><?php csrf_field();?><button name="action" value="logout">Sign out</button></form>
<?php if(!$businesses):?><p>No eligible preview business is available for this owner.</p><?php else:?><form method="post"><?php csrf_field();?><label>Business<select name="business"><?php foreach($businesses as $b):?><option value="<?=h($b['id'])?>" <?=$bid===$b['id']?'selected':''?>><?=h($b['name'])?></option><?php endforeach;?></select></label><button name="action" value="choose">Open business</button></form><?php endif;endif;?>
<?php if($settings): $hours=array_column($settings['hours'],null,'day');$staff=array_column($settings['staff'],'name','id');?>
<form method="post"><?php csrf_field();?><input type="hidden" name="business" value="<?=h($bid)?>"><input type="hidden" name="revision" value="<?=h($settings['revision'])?>">
<label><input type="checkbox" name="paused" <?=$settings['paused']?'checked':''?>>Pause new instant bookings</label>
<fieldset><legend>Working hours · Africa/Johannesburg</legend>
<?php foreach(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as $i=>$day):$d=$i+1;?><p><label><input type="checkbox" name="days[]" value="<?=$d?>" <?=isset($hours[$d])?'checked':''?>><?=$day?></label>
<label><?=$day?> start<input name="from[<?=$d?>]" value="<?=clock_text($hours[$d]['start']??540)?>" size="5" maxlength="5"></label>
<label><?=$day?> end<input name="to[<?=$d?>]" value="<?=clock_text($hours[$d]['end']??1020)?>" size="5" maxlength="5"></label></p><?php endforeach;?></fieldset>
<?php foreach(['before'=>['Travel buffer before (minutes)',240],'after'=>['Travel buffer after (minutes)',240],'notice'=>['Minimum notice (minutes)',43200],'horizon'=>['Booking horizon (days)',30]] as $key=>[$label,$max]):?>
<label><?=$label?><input type="number" name="<?=$key?>" value="<?=(int)$settings[$key]?>" min="0" max="<?=$max?>" required></label><?php endforeach;?>
<label>Closed dates (YYYY-MM-DD, one per line)<textarea name="holidays"><?=h(implode("\n",$settings['holidays']))?></textarea></label>
<fieldset><legend>Eligible cleaners</legend><?php foreach($staff as $id=>$name):?><label><input type="checkbox" name="eligible[]" value="<?=h($id)?>" <?=in_array($id,$settings['eligible'],true)?'checked':''?>><?=h($name)?></label><?php endforeach;?></fieldset>
<fieldset><legend>Staff time off · SAST</legend><?php foreach($settings['blocks'] as $i=>$b):?><p><?=h($staff[$b['staff']]??'Inactive cleaner')?> · <?=h($b['start'])?> to <?=h($b['end'])?> <label><input type="checkbox" name="remove[]" value="<?=$i?>">Remove</label></p><?php endforeach;?>
<label>Cleaner for time off<select name="off_staff"><?php foreach($staff as $id=>$name):?><option value="<?=h($id)?>"><?=h($name)?></option><?php endforeach;?></select></label><label>Time off starts<input type="datetime-local" name="off_start"></label><label>Time off ends<input type="datetime-local" name="off_end"></label></fieldset>
<button name="action" value="save">Save availability</button></form><?php endif;?></main></body></html>
