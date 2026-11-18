<?php
declare(strict_types=1);
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/guard.php';
book05_gate();
header("Content-Security-Policy: default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
session_name('book05_eft_review');
session_set_cookie_params(['path'=>BOOK05_PATH,'secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
session_start();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
const API = 'https://jqnecahhaxxdsrybwuoo.supabase.co';
const PUBLISHABLE = 'sb_publishable_RnXDADzjKXxkoC2cy28_Fg_BvyV281k';
const BUSINESSES = [
    '2102f628-95f9-48d4-a617-38ceac9e4f70'=>'Shalean Cleaning Services',
    '7c1bd408-d900-4656-8ab5-60b25fd3b6e0'=>'Bokkie Cleaning Services',
    'fc6f6ec5-1f5d-453c-a2e8-bdde8974e5bb'=>'Pure Quality Cleaning Services',
];
function h(string $s): string {return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function eft_api(string $path,array $data,array $headers=[]): array {
    $headers=array_merge(['apikey: '.PUBLISHABLE,'Content-Type: application/json'],$headers);
    $ctx=stream_context_create(['http'=>['method'=>'POST','header'=>implode("\r\n",$headers),
        'content'=>json_encode($data,JSON_THROW_ON_ERROR),'ignore_errors'=>true,'timeout'=>12,'follow_location'=>0]]);
    $body=@file_get_contents(API.$path,false,$ctx,0,32768);
    preg_match('~^HTTP/\S+ (\d+)~',$http_response_header[0]??'',$match);
    return [(int)($match[1]??0),json_decode($body?:'{}',true)];
}
$err=''; $message='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>4096 || !is_string($_POST['csrf']??null) ||
        !hash_equals($_SESSION['csrf'],$_POST['csrf']) || ($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site') {
        http_response_code(403); exit;
    }
    try {
        $business=$_POST['business']??'';
        if (!isset(BUSINESSES[$business])) throw new DomainException('Choose a preview business.');
        $ref=trim($_POST['reference']??''); $bank=trim($_POST['bank']??''); $amount=trim($_POST['amount']??'');
        if (!preg_match('/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/D',$ref) ||
            !preg_match('/^([0-9]{1,7})(?:\.([0-9]{1,2}))?$/D',$amount,$m) ||
            !preg_match('/^[A-Za-z0-9][A-Za-z0-9 \/-]{2,63}$/D',$bank))
            throw new DomainException('Check the report reference, amount and bank receipt reference.');
        $cents=100*(int)$m[1]+(int)str_pad($m[2]??'',2,'0');
        [$code,$auth]=eft_api('/auth/v1/token?grant_type=password',
            ['email'=>$_POST['email']??'','password'=>$_POST['password']??'']);
        if ($code!==200 || empty($auth['access_token'])) throw new DomainException('Preview verifier sign-in failed.');
        try {
            [$status,$result]=eft_api('/rest/v1/rpc/book05_verify_eft',
                ['p_business'=>$business,'p_ref'=>$ref,'p_amount'=>$cents,'p_bank_ref'=>$bank],
                ['Content-Profile: book05_eft','Accept-Profile: book05_eft','Authorization: Bearer '.$auth['access_token'],'x-faraios-business: '.$business,'x-faraios-environment: preview']);
        } finally {
            eft_api('/auth/v1/logout?scope=local',[],['Authorization: Bearer '.$auth['access_token']]);
        }
        if ($status===403) throw new DomainException('Verification requires an authorized verifier for this business.');
        if ($status!==200) throw new DomainException('Could not verify this transfer. Check the business, amount and receipt reference before retrying.');
        $message=match($result['state']??'') {
            'confirmed'=>'Receipt verified. Booking confirmed: '.$result['booking'],
            'review'=>'Receipt verified. The slot is unavailable. Reconcile this transfer with the customer.',
            default=>throw new RuntimeException('Unexpected state')
        };
        $_SESSION['notice']=$message;
        header('Location: eft.php',true,303);exit;
    } catch(DomainException $e) {$err=$e->getMessage();}
    catch(Throwable $e) {$err='Verification status unavailable. Retry using the same receipt details.';}
}
$message=$_SESSION['notice']??'';unset($_SESSION['notice']);
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify a test EFT receipt</title><link rel="stylesheet" href="payments.css"></head><body><main>
<a href="b/index.php">Private checkout</a><h1>Verify a test EFT receipt</h1>
<p>Use your authorized preview account. Match the full amount and reference to the synthetic bank receipt.</p>
<?php if($err): ?><p role="alert"><?=h($err)?></p><?php endif;?>
<?php if($message): ?><p role="status"><?=h($message)?></p><?php endif;?>
<form method="post"><input type="hidden" name="csrf" value="<?=h($_SESSION['csrf'])?>">
<label>Business <select name="business"><?php foreach(BUSINESSES as $id=>$name): ?><option value="<?=h($id)?>"><?=h($name)?></option><?php endforeach;?></select></label>
<p><label>Transfer report reference <input name="reference" maxlength="36" required></label></p>
<p><label>Received amount in ZAR <input name="amount" inputmode="decimal" required></label></p>
<p><label>Bank receipt reference <input name="bank" maxlength="64" required></label></p>
<p><label>Preview verifier email <input name="email" type="email" required></label></p>
<p><label>Preview verifier password <input name="password" type="password" autocomplete="off" required></label></p>
<button>Verify test receipt</button></form></main></body></html>
