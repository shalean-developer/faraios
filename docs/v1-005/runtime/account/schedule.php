<?php
require __DIR__.'/core.php';require __DIR__.'/profile-core.php';
$_SERVER['SCRIPT_NAME']=preg_replace('~/account/schedule.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
$b=null;$policy=null;$error='';$notice='';$off=[];$page=max(1,min(100000,(int)($_GET['page']??1)));$days=[1=>'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function schedule_minute(string $value,bool $end=false): int {
 if($end&&$value==='24:00')return 1440;
 if(!preg_match('/\A([01][0-9]|2[0-3]):([0-5][0-9])\z/',$value,$m))throw new RuntimeException('Enter working times as HH:MM. Use 24:00 only for the end of a day.');
 return (int)$m[1]*60+(int)$m[2];
}
function schedule_clock(int $minutes): string {return sprintf('%02d:%02d',intdiv($minutes,60),$minutes%60);}
try {
 start();user();$b=business();if(!$b)go('business');
 $scope=['p_business'=>$b['id'],'p_environment'=>profile_env()];
 $policy=profile_rpc('business_schedule_policy_read',$scope);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  csrf(16384);
  if(($_POST['action']??'')==='resolve'){
   $id=(string)($_POST['id']??'');if(!preg_match('/\A[0-9a-f-]{36}\z/',$id))throw new RuntimeException('Time-off request unavailable.');
   profile_rpc('business_schedule_time_off_resolve',$scope+['p_id'=>$id,'p_reason'=>(string)($_POST['reason']??'')]);$notice='Time-off resolution recorded. The original request is retained.';
  }else{
   $hours=[];
   foreach($days as $day=>$label)if(isset($_POST['day_'.$day]))$hours[]=['day'=>$day,'start'=>schedule_minute((string)($_POST['start_'.$day]??'')),'end'=>schedule_minute((string)($_POST['end_'.$day]??''),true)];
   foreach(['version','before','after'] as $key)if(!isset($_POST[$key])||!is_string($_POST[$key])||!preg_match('/\A[0-9]{1,9}\z/',$_POST[$key]))throw new RuntimeException('Check working hours, time zone and buffers.');
   // Keep the submitted zone/version on rejection; never upgrade stale tokens.
   $policy=profile_rpc('business_schedule_policy_write',$scope+['p_version'=>(int)$_POST['version'],'p_enabled'=>isset($_POST['enabled']),'p_zone'=>(string)($_POST['zone']??''),'p_hours'=>$hours,'p_before'=>(int)$_POST['before'],'p_after'=>(int)$_POST['after'],'p_ack_legacy'=>isset($_POST['ack'])]);
   $notice='Scheduling settings saved.';
  }
  if($notice){$_SESSION['schedule_notice']=$notice;header('Location: schedule.php',true,303);exit;}
 }
 $notice=(string)($_SESSION['schedule_notice']??'');unset($_SESSION['schedule_notice']);
 $off=profile_rpc('business_schedule_time_off_read',$scope+['p_page'=>$page]);
}catch(AccountSessionExpired $e){go('signin');}catch(Throwable $e){$error=$e instanceof RuntimeException?$e->getMessage():'Scheduling unavailable. Please try again.';}
$posted=$_SERVER['REQUEST_METHOD']==='POST'&&($_POST['action']??'')!=='resolve';
$saved=[];foreach($policy['hours']??[] as $h)$saved[(int)$h['day']]=$h;
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Scheduling | FaraiOS</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="../business/profile.css?v=bookings-20261113"><link rel="stylesheet" href="layout.css?v=20261113-4"><link rel="stylesheet" href="private.css?v=20261113-3"><link rel="stylesheet" href="../ui/design-system.css?v=20261115"><script src="layout.js?v=20261113-2" defer></script></head><body class="ui-page ui-workspace business-page"><?php require_once __DIR__.'/layout.php';app_layout('Bookings',$b);?><main id="app-main" tabindex="-1" class="editor-main"><h1>Scheduling</h1><p><a href="bookings.php">← Bookings</a></p>
<?php if($error):?><p class="alert" role="alert"><?=esc($error)?></p><?php endif;if($notice):?><p class="notice" role="status"><?=esc($notice)?></p><?php endif;?>
<?php if($policy&&$error&&$_SERVER['REQUEST_METHOD']==='POST'&&($_POST['action']??'')==='resolve'):?><section class="panel"><h2>Unsaved resolution</h2><p>Your reason is retained. Check the request before submitting again.</p><?php form_start();?><input type="hidden" name="action" value="resolve"><input type="hidden" name="id" value="<?=esc(is_string($_POST['id']??null)?$_POST['id']:'')?>"><label for="retained_reason">Resolution reason</label><input id="retained_reason" name="reason" minlength="5" maxlength="500" required value="<?=esc(is_string($_POST['reason']??null)?$_POST['reason']:'')?>"><button class="button">Submit reviewed resolution</button></form><p><a href="schedule.php">Reload and compare</a></p></section><?php endif;?>
<?php if($policy):?><section class="panel"><h2>Working hours &amp; buffers</h2><p>Hours cover work and travel buffers. Closed days have no checked box. Unallocated bookings reserve no worker.</p><p><?=intval($policy['legacy_active'])?> existing jobs retained under the unchanged-schedule policy · <?=intval($policy['unallocated'])?> unallocated jobs.</p>
<?php form_start();?><input type="hidden" name="version" value="<?=esc((string)($posted?($_POST['version']??'-1'):$policy['version']))?>"><label><input type="checkbox" name="enabled" <?=($posted?isset($_POST['enabled']):$policy['enabled'])?'checked':''?>> Enable strict staffing checks for this business</label>
<label for="zone">Working-hours time zone</label><select id="zone" name="zone"><?php foreach(regions()['time_zones'] as $z):?><option value="<?=esc($z)?>" <?=($posted?($_POST['zone']??''):$policy['zone'])===$z?'selected':''?>><?=esc(str_replace('_',' ',$z))?></option><?php endforeach;?></select>
<?php foreach($days as $day=>$label):$h=$saved[$day]??[];$on=$posted?isset($_POST['day_'.$day]):isset($saved[$day]);?><fieldset><legend><label><input type="checkbox" name="day_<?=$day?>" <?=$on?'checked':''?>> <?=$label?></label></legend><div class="quote-numbers"><div><label for="start_<?=$day?>">From</label><input id="start_<?=$day?>" name="start_<?=$day?>" type="time" value="<?=esc($posted?(string)($_POST['start_'.$day]??''):(isset($h['start'])?schedule_clock($h['start']):''))?>"></div><div><label for="end_<?=$day?>">Until · HH:MM</label><input id="end_<?=$day?>" name="end_<?=$day?>" type="text" inputmode="numeric" maxlength="5" placeholder="17:00" value="<?=esc($posted?(string)($_POST['end_'.$day]??''):(isset($h['end'])?schedule_clock($h['end']):''))?>"></div></div></fieldset><?php endforeach;?>
<p>Use 24:00 to end at midnight. An overnight working period needs hours on both days.</p><div class="quote-numbers"><div><label for="before">Buffer before · minutes</label><input id="before" name="before" type="number" min="0" max="240" required value="<?=esc((string)($posted?($_POST['before']??''):$policy['before_minutes']))?>"></div><div><label for="after">Buffer after · minutes</label><input id="after" name="after" type="number" min="0" max="240" required value="<?=esc((string)($posted?($_POST['after']??''):$policy['after_minutes']))?>"></div></div><p>30 minutes before and after each job requires 60 minutes between jobs. Buffers are fixed allowances, not route estimates.</p>
<label><input type="checkbox" name="ack" <?=$posted&&isset($_POST['ack'])?'checked':''?>> I have reviewed existing jobs. Keep their current schedules and assignments; check any future changes.</label><p>Changes cannot invalidate strict assigned work. Resolve affected jobs before reducing hours or disabling safeguards.</p><button class="button">Save scheduling settings</button></form><p><a href="schedule.php">Reload and compare saved settings</a></p></section>
<section class="panel"><h2>Time off</h2><p>Submitted time off blocks new staffing. Resolving a request retains its original record and a reason.</p><?php foreach(array_slice($off,0,50) as $r):?><article class="service-card"><h3><?=esc($r['name'])?></h3><p><?=esc((new DateTimeImmutable($r['starts_at']))->setTimezone(new DateTimeZone($policy['zone']))->format('j M Y H:i'))?> → <?=esc((new DateTimeImmutable($r['ends_at']))->setTimezone(new DateTimeZone($policy['zone']))->format('j M Y H:i'))?> · <?=esc($policy['zone'])?></p><?php form_start();?><input type="hidden" name="action" value="resolve"><input type="hidden" name="id" value="<?=esc($r['id'])?>"><label for="reason_<?=esc($r['id'])?>">Resolution reason</label><input id="reason_<?=esc($r['id'])?>" name="reason" minlength="5" maxlength="500" required value="<?=esc(($_POST['id']??'')===$r['id']?(string)($_POST['reason']??''):'')?>"><button class="button secondary">Resolve request</button></form></article><?php endforeach;if(!$off):?><p>No unresolved time-off requests.</p><?php endif;?><nav aria-label="Time-off pages"><?php if($page>1):?><a href="?page=<?=$page-1?>">Previous</a><?php endif;if(count($off)>50):?><a href="?page=<?=$page+1?>">Next</a><?php endif;?></nav></section><?php endif;?></main></body></html>
