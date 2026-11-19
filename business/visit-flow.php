<?php
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__) {http_response_code(404);exit;}
require_once __DIR__.'/visit-store.php';
require_once dirname(__DIR__).'/account/booking-location-ui.php';
function visit_url(string $step,string $service=''): string {
 $args=['booking'=>'1','step'=>$step];if($service!=='')$args['service']=$service;
 return '/b/shalean-cleaning-services?'.http_build_query($args);
}
function visit_money(int $n): string {return 'ZAR '.number_format($n/100,2);}
function visit_duration(int $n): string {
 $h=intdiv($n,60);$m=$n%60;return implode(' ',array_filter([$h?$h.' hour'.($h===1?'':'s'):'',$m?$m.' min':'']));
}
function visit_quote(array $s,array $selection): array {
 $cents=(int)$s['amount'];$mins=(int)$s['duration'];$parts=[[$s['name'],$cents]];$values=[];
 foreach($s['options']??[] as $o){
  $id=$o['id'];$v=$selection[$id]??max($o['minimum'],$o['included']);
  if(filter_var($v,FILTER_VALIDATE_INT)===false||$v<$o['minimum']||$v>$o['maximum'])throw new RuntimeException('Check the selected quantities.');
  $qty=(int)$v;$units=max(0,$qty-$o['included']);$values[$id]=$qty;
  if($units){$cost=$units*$o['price'];$cents+=$cost;$mins+=$units*$o['minutes'];$parts[]=[$o['name'],$cost];}
 }
 if($mins<1||$mins>10080||$cents<0||$cents>999999999)throw new RuntimeException('This visit requires a custom quote.');
 return ['cents'=>$cents,'minutes'=>$mins,'parts'=>$parts,'values'=>$values,'mode'=>$s['mode']];
}
function visit_field(string $k,int $min,int $max): string {
 $v=$_POST[$k]??'';if(!is_string($v)||mb_len(trim($v))<$min||mb_len(trim($v))>$max)throw new RuntimeException('Check the '.str_replace('_',' ',$k).' field.');
 return trim($v);
}
function visit_ref(): string {return 'fosb-'.bin2hex(random_bytes(16));}
function visit_summary(array $s, array $draft, string $step = 'details', ?array $q = null): void {
 $q ??= visit_quote($s, $draft['options']);
 $where = implode(', ', array_filter([$draft['address'] ?? '', $draft['unit'] ?? '', $draft['area']]));
 $when = empty($draft['time']) ? '' : (new DateTimeImmutable($draft['date']))->format('D j M').' @ '.$draft['time'].' SAST';
 $whereUrl = ($step === 'details' ? '' : visit_url('details', $s['id'])).'#visit-address';
 $whenUrl = ($step === 'schedule' ? '' : visit_url('schedule', $s['id'])).'#visit-date';
 $price = $s['mode'] === 'quote' ? 'Quote required' : visit_money($q['cents']);
 ?>
<div class="visit-summary-rows">
    <a href="<?=esc($whereUrl)?>"><span>Where: <span data-summary-address><?=esc($where ?: 'Add address')?></span></span><i aria-hidden="true">✎</i><span class="summary-sr">Edit address</span></a>
    <a href="<?=esc(visit_url('service'))?>"><span>What: <?=esc($s['name'])?></span><i aria-hidden="true">✎</i><span class="summary-sr">Change service</span></a>
    <a href="<?=esc($whenUrl)?>" data-summary-time-row <?=$when === '' ? 'hidden' : ''?>><span>When: <span data-summary-when><?=esc($when)?></span></span><i aria-hidden="true">✎</i><span class="summary-sr">Edit visit time</span></a>
</div>
<div class="visit-summary-footer">
    <?php if ($step === 'review'): ?>
    <span><strong><?=esc($price)?></strong><small><?=$s['mode'] === 'from' ? 'Estimated total from' : 'Total'?></small></span><a href="#visit-costs">Costs</a>
    <?php else: ?>
    <span><strong data-duration><?=esc(visit_duration($q['minutes']))?></strong><small>Est. duration</small></span>
    <span><strong data-total><?=esc($price)?></strong><small><?=$s['mode'] === 'from' ? 'Est. price from' : 'Est. price'?></small></span>
    <?php endif; ?>
</div>
<?php }
function visit_form_start(string $url,string $csrf,string $action): void {?>
<form method="post" action="<?=esc($url)?>"><input type="hidden" name="visit_token" value="<?=esc($csrf)?>"><input type="hidden" name="action" value="<?=esc($action)?>">
<?php }
function visit_main(array $row): void {
 enquiry_session();
 $catalogue=[];foreach($row['services']['items']??[] as $item)if(!empty($item['visible'])&&empty($item['archived']))$catalogue[$item['id']]=$item;
 $company=$row['document']['name']??'Shalean Cleaning Services';$areas=request_areas((string)($row['document']['areas']??''));
 $service=is_string($_GET['service']??null)?$_GET['service']:'';
 $step=is_string($_GET['step']??null)?$_GET['step']:'service';
 $s=$catalogue[$service]??null;
 if(!$s){$step='service';$service='';}
 elseif(!in_array($step,['details','schedule','review','payment'],true))$step='details';
 $csrf=$_SESSION['visit_csrf']??=bin2hex(random_bytes(32));$message='';
 $today=new DateTimeImmutable('today',new DateTimeZone(VISIT_TZ));$min=$today->format('Y-m-d');$max=$today->modify('+30 days')->format('Y-m-d');
 $initial=['service'=>$service,'ref'=>null,'area'=>$areas[0]??'','date'=>$min,'time'=>'','options'=>[]];
 $draft=$_SESSION['shalean_visit'][$service]??$initial;
 $q=$s?visit_quote($s,$draft['options']):[];$record=!empty($draft['ref'])?visit_record($draft['ref']):null;
 $latest=$s?hash('sha256',json_encode([$s,$areas,$row['services']['currency']])):'';
 if($s){
  try{
   if(isset($_GET['reference'])&&$record&&is_string($_GET['reference'])&&hash_equals($record['ref'],$_GET['reference'])){
    $record=visit_verify($record['ref']);$step='payment';
   }
   if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
    if(!is_string($_POST['visit_token']??null)||!hash_equals($csrf,$_POST['visit_token'])||($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site')throw new RuntimeException('Reload this booking before continuing.');
    $action=$_POST['action']??'';
    if($action==='restart' && $record && in_array($record['state'],['confirmed','reconcile'],true)){
     unset($_SESSION['shalean_visit'][$service]);
     header('Location: '.visit_url('service'),true,303);exit;
    }
    if($action==='details' && $step==='details'){
     if($record && (in_array($record['state'],['confirmed','eft_pending','reconcile'],true)||($record['state']==='held'&&$record['expires']>time())))throw new RuntimeException('Open Payment to view or release your existing hold.');
     $opts=$_POST['options']??[];if(!is_array($opts))throw new RuntimeException('Check the room quantities.');
     $q=visit_quote($s,$opts);$area=visit_field('service_area',1,200);
     if(!in_array($area,$areas,true))throw new RuntimeException('Choose a published service area.');
     $name=visit_field('name',2,120);$email=visit_field('email',3,254);$phone=visit_field('phone',0,40);
     if(!filter_var($email,FILTER_VALIDATE_EMAIL)||($phone!==''&&!preg_match('/^[+0-9 ()-]{5,40}$/D',$phone)))throw new RuntimeException('Check your contact details.');
     $draft=array_merge($draft,['address'=>visit_field('address',5,1000),'unit'=>visit_field('unit',0,120),'area'=>$area,'name'=>$name,'email'=>$email,'phone'=>$phone,'options'=>$q['values'],'snapshot'=>$latest,'ref'=>visit_ref(),'time'=>'']);
     $step='schedule';
    }else{
     if(!($record && $step==='payment' && $action==='report_eft') && ($draft['snapshot']??'')!==$latest)throw new RuntimeException('The service details changed. Review your selections in Details.');
     if(in_array($action,['date','review'],true)&&$step==='schedule'){
      $date=visit_field('date',10,10);
      $parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date,new DateTimeZone(VISIT_TZ));
      if(!$parsed||$parsed->format('Y-m-d')!==$date||$date<$min||$date>$max)throw new RuntimeException('Choose a date in the next 30 days.');
      $draft['date']=$date;$draft['time']='';
      foreach(['pets'=>['','No pets','Pets present'],'equipment'=>['','Available','Partly available','Unavailable']] as $k=>$choices){$v=visit_field($k,0,40);if(!in_array($v,$choices,true))throw new RuntimeException('Check your access choices.');$draft[$k]=$v;}
      $draft['notes']=visit_field('notes',0,1900);
      if($action==='review'){
       $clock=visit_field('time',5,5);$cap=visit_capacity($service,$date,$q['minutes']);
       if(!in_array($clock,visit_times($cap,$date,$q['minutes']),true))throw new RuntimeException('That time is no longer available. Choose another start.');
       $draft['time']=$clock;$step='review';
      }
     }elseif($action==='hold'&&$step==='review'&&!empty($draft['time'])&&$s['mode']!=='quote'&&$q['cents']>0){
      $record=visit_hold($draft,$q);$step='payment';
     }elseif($action==='report_eft'&&$step==='payment'&&$record){
      visit_report_eft($record['ref']);
     }elseif($action==='release'&&$step==='payment'&&$record){
      visit_stmt("UPDATE visits SET state='released' WHERE ref=? AND state='held'",[$record['ref']]);
      if(in_array(visit_record($record['ref'])['state'],['eft_pending','confirmed','reconcile'],true))throw new RuntimeException('This payment is already under review or recorded.');
      $draft['ref']=visit_ref();$draft['time']='';$record=null;$step='schedule';
     }elseif($action==='pay'&&$step==='payment'&&$record){
      $url=visit_pay($record,'https://www.faraios.com'.visit_url('payment',$service));
      header('Location: '.$url,true,303);exit;
     }else throw new RuntimeException('Open the current booking step and try again.');
    }
    $_SESSION['shalean_visit'][$service]=$draft;
    header('Location: '.visit_url($step,$service),true,303);exit;
   }
  }catch(Throwable $e){$message=$e instanceof RuntimeException&&!($e instanceof PDOException)?$e->getMessage():'The booking could not be updated. Try again.';}
  if($record && (in_array($record['state'],['confirmed','reconcile','eft_pending'],true)||($record['state']==='held'&&$record['expires']>time())))$step='payment';
  if(in_array($step,['schedule','review','payment'],true)&&empty($draft['name']))$step='details';
  if($step==='review'&&empty($draft['time']))$step='schedule';
  if($step==='payment'&&!$record)$step=empty($draft['name'])?'details':'schedule';
 }
 $slots=[];$configured=false;$alternatives=[];
 if($step==='schedule'){
  if($draft['date']<$min||$draft['date']>$max)$draft['date']=$min;
  try{$cap=visit_capacity($service,$draft['date'],$q['minutes']);$configured=!empty($cap['configured']);$slots=visit_times($cap,$draft['date'],$q['minutes']);
   if($configured&&!$slots){
    $from=new DateTimeImmutable($draft['date'],new DateTimeZone(VISIT_TZ));
    for($i=1;$i<=7 && count($alternatives)<3;$i++){ $day=$from->modify("+$i days")->format('Y-m-d');if($day>$max)break;
     if(visit_times(visit_capacity($service,$day,$q['minutes']),$day,$q['minutes']))$alternatives[]=$day;}
   }
  }catch(Throwable $e){$message='Start times could not be loaded. Please try again.';}
 }
 require __DIR__.'/visit-screen.php';
}
