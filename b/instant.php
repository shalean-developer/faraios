<?php
declare(strict_types=1);
require dirname(__DIR__).'/account/core.php';
require dirname(__DIR__).'/account/profile-core.php';
require dirname(__DIR__).'/account/enquiries-core.php';
require dirname(__DIR__).'/business/instant-core.php';
$_SERVER['SCRIPT_NAME'] = preg_replace('~/b/instant.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
if (!instant_enabled()) { http_response_code(404); exit; }

if (isset($_GET['webhook'])) {
    $raw = file_get_contents('php://input',false,null,0,65537);
    $key = cfg()['instant_paystack_key'] ?? '';
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || strlen($raw)>65536 || !str_starts_with($key,'sk_test_') ||
        !hash_equals(hash_hmac('sha512',$raw,$key),$_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '')) { http_response_code(403); exit; }
    $event = json_decode($raw,true);
    if (($event['event'] ?? '') === 'charge.success' && ($event['data']['domain'] ?? '') === 'test'
        && preg_match('/^fi-([0-9a-f-]{36})$/D',$event['data']['reference'] ?? '',$m)) {
        try { instant_verify($m[0]); } catch (Throwable $e) { http_response_code(503); }
    }
    exit;
}
enquiry_session();
$slug = $_GET['slug'] ?? '';
if (!is_string($slug) || !preg_match('/^[a-z0-9-]{3,64}$/D',$slug)) { http_response_code(404); exit; }
$ticket = enquiry_ticket($slug.':booking');
$base = cfg()['base_url'];
$back = $base.'/b/'.$slug.'?booking=1';
$self = $base.'/b/instant.php?slug='.$slug;
$flow = $_GET['flow'] ?? '';
$today = new DateTimeImmutable('today',new DateTimeZone('Africa/Johannesburg'));
foreach ($_SESSION['instant'] ?? [] as $id=>$stored) if ($stored['created']<time()-7200) unset($_SESSION['instant'][$id]);
$problem = '';
try {
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>20000 || !is_string($_POST['csrf'] ?? null) ||
            !hash_equals($ticket['csrf'],$_POST['csrf']) || ($_POST['website'] ?? '')!=='' ||
            ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')==='cross-site') throw new DomainException('Reload the booking form before continuing.');
        if ($flow==='') {
            if (count($_SESSION['instant'] ?? [])>=20) throw new DomainException('Too many open booking attempts.');
            $flow=instant_reference();
            $options=[];
            foreach ($_POST['options'] ?? [] as $id=>$quantity) {
                if (!is_string($quantity) || !ctype_digit($quantity) || strlen($quantity)>4) throw new DomainException('Check room quantities.');
                $options[]=['id'=>(string)$id,'quantity'=>(int)$quantity];
            }
            $address=enquiry_text('address',5,1000);
            $unit=enquiry_text('unit',0,120);
            if ($unit!=='') $address.=', '.$unit;
            if (mb_len($address)>1000) throw new DomainException('Shorten the service address.');
            $_SESSION['instant'][$flow]=['slug'=>$slug,'created'=>time(),'service'=>enquiry_text('service',32,32),
                'area'=>enquiry_text('service_area',1,200),'address'=>$address,'notes'=>enquiry_text('requirements',0,1900),
                'options'=>json_encode($options, JSON_THROW_ON_ERROR),'day'=>$today->modify('+1 day')->format('Y-m-d')];
            header('Location: '.$self.'&flow='.$flow,true,303); exit;
        }
    }
    if (!is_string($flow) || ($_SESSION['instant'][$flow]['slug'] ?? null)!==$slug) throw new DomainException('Start again from the booking form.');
    $f=&$_SESSION['instant'][$flow]; $self.='&flow='.$flow;
    $action=$_POST['action'] ?? '';
    if (isset($_GET['reference'])) {
        if (!isset($f['reserved']) || $_GET['reference']!=='fi-'.$flow) throw new DomainException('Payment reference unavailable.');
        $f['result']=instant_verify('fi-'.$flow);
        header('Location: '.$self,true,303); exit;
    }
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        if ($action==='date' && !isset($f['reserved'])) $f['day']=enquiry_text('date',10,10);
        elseif ($action==='hold' && !isset($f['reserved'])) {
            $at=$f['day'].' '.enquiry_text('time',5,5);
            if (!in_array($_POST['time'],$f['quote']['times'] ?? [],true)) throw new DomainException('Choose an available time.');
            $email=enquiry_text('email',3,254);
            if (!filter_var($email,FILTER_VALIDATE_EMAIL)) throw new DomainException('Enter an email address for test checkout.');
            $contact=['name'=>enquiry_text('name',2,120),'email'=>$email,'phone'=>enquiry_text('phone',0,40),'notes'=>$f['notes']];
            enquiry_ip_limit();
            $f['reserved']=instant_query('select instant_private.reserve(?::uuid,?,?,?,?::jsonb,?::timestamptz,?::int,?::int,?::jsonb,?)',
              [$flow,$slug,$f['service'],$f['area'],$f['options'],$at.'+02:00',$f['quote']['total'],$f['quote']['minutes'],json_encode($contact),$f['address']]);
            $f['contact']=$contact; $f['at']=$at;
        } elseif ($action==='pay' && isset($f['reserved']) && !isset($f['result'])) {
            if (strtotime($f['reserved']['expires'])<=time()) throw new DomainException('Your reservation expired. Choose a new time.');
            if (!isset($f['checkout'])) {
                $ref='fi-'.$flow;
                $reply=instant_provider('initialize',['amount'=>$f['reserved']['total'],'email'=>$f['contact']['email'],
                    'currency'=>'ZAR','reference'=>$ref,'callback_url'=>$self]);
                $f['checkout']=instant_checkout_url($reply,$ref);
            }
            header('Location: '.$f['checkout'],true,303); exit;
        }
        header('Location: '.$self,true,303); exit;
    }
    if (!isset($f['reserved'])) {
        $f['quote']=instant_query('select instant_private.slots(?,?,?,?::jsonb,?::date)',[$slug,$f['service'],$f['area'],$f['options'],$f['day']]);
    }
} catch (DomainException $e) { $problem=$e->getMessage(); }
catch (Throwable $e) {
    $problem=isset($_GET['reference'])?'Payment verification is pending. Refresh this page to check again.':
        'The booking could not proceed. Check your details or choose another available time.';
    if (isset($f) && !isset($f['reserved'])) unset($f['quote']);
}
function instant_form(string $action,string $url,string $csrf): void {
    echo '<form method="post" action="'.esc($url).'"><input type="hidden" name="csrf" value="'.esc($csrf).'"><input type="hidden" name="action" value="'.esc($action).'">';
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Regular Cleaning · Test booking</title><link rel="stylesheet" href="<?=esc($base)?>/business/profile.css"><link rel="stylesheet" href="<?=esc($base)?>/business/instant.css"></head><body><main class="instant">
<a href="<?=esc($back)?>">Back to service details</a>
<h1>Regular Cleaning</h1><p>Preview · Test checkout</p>
<?php if ($problem): ?><p role="alert"><?=esc($problem)?></p><?php endif; ?>
<?php if (isset($f['result'])): ?>
<h2><?=$f['result']['state']==='confirmed'?'Booking confirmed':'Payment needs review'?></h2>
<?php if ($f['result']['state']==='confirmed'): ?><p>Booking reference <?=esc($f['result']['booking'])?></p><p><?=esc($f['at'])?> · Africa/Johannesburg</p><p><?=esc($f['address'])?></p>
<?php else: ?><p>The test payment arrived after availability changed. Contact the business with reference <?=esc('fi-'.$flow)?>.</p><?php endif; ?>
<?php elseif (isset($f['reserved'])): ?>
<h2>Review and pay</h2><p><?=esc($f['address'])?> · <?=esc($f['area'])?></p><p><?=esc($f['at'])?> · Africa/Johannesburg · <?=(int)$f['quote']['minutes']?> minutes</p>
<p><?=esc($f['contact']['name'])?> · <?=esc($f['contact']['email'])?></p><p><strong>Total ZAR <?=number_format($f['reserved']['total']/100,2)?></strong></p>
<?php if (strtotime($f['reserved']['expires'])>time()): ?><p>Reserved until <?=esc((new DateTimeImmutable($f['reserved']['expires']))->setTimezone(new DateTimeZone('Africa/Johannesburg'))->format('H:i:s'))?> SAST.</p>
<?php instant_form('pay',$self,$ticket['csrf']); ?><button>Pay with test checkout</button></form>
<?php else: ?><p>Your reservation expired. Choose another time to start again.</p><?php endif; ?>
<?php elseif (isset($f)): ?><h2>Choose an available time</h2>
<?php instant_form('date',$self,$ticket['csrf']); ?><label>Date <input type="date" name="date" min="<?=$today->format('Y-m-d')?>" max="<?=$today->modify('+30 days')->format('Y-m-d')?>" value="<?=esc($f['day'])?>" required></label><button>Show times</button></form>
<?php if (isset($f['quote'])): ?><p><?=esc($f['area'])?> · <?=(int)$f['quote']['minutes']?> minutes · <strong>ZAR <?=number_format($f['quote']['total']/100,2)?></strong></p>
<?php if (!$f['quote']['times']): ?><p>No cleaner is available for this entire visit. Choose another date.</p>
<?php else: instant_form('hold',$self,$ticket['csrf']); ?><label>Available start time (SAST)<select name="time" required><option value="">Choose a time</option><?php foreach($f['quote']['times'] as $t): ?><option><?=esc($t)?></option><?php endforeach; ?></select></label>
<label>Your name<input name="name" autocomplete="name" required maxlength="120"></label><label>Email for test checkout<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Phone (optional)<input name="phone" type="tel" maxlength="40"></label><button>Reserve and review</button></form>
<?php endif; endif; endif; ?></main></body></html>
