<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
// Read-only public help. Do not start/read owner or legacy customer sessions.
header('Cache-Control: no-store, private');header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
if(!in_array($_SERVER['REQUEST_METHOD']??'GET',['GET','HEAD'],true)){http_response_code(405);header('Allow: GET, HEAD');exit;}
$slug=is_string($_GET['slug']??null)?$_GET['slug']:'';
if(!preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/',$slug)||strlen($slug)>64){http_response_code(404);exit;}
try{
 $base=cfg()['base_url'];
 $rows=api('/rest/v1/business_public_pages?environment=eq.'.profile_env().'&slug=eq.'.rawurlencode($slug).'&select=slug,document',[],'GET');$p=$rows[0]['document']??null;
 if(!$p){http_response_code(404);exit;}
 if(($_GET['mode']??'')==='header'){header('Content-Type: application/json; charset=utf-8');echo '{"authenticated":false}';exit;}
 $return=is_string($_GET['return']??null)?$_GET['return']:'';
 if(!in_array($return,['','services','how-it-works','areas','contact','booking','booking-service','booking-details','booking-schedule','booking-contact','booking-review'],true))$return='';
 $home=$base.'/b/'.$slug;$booking=business_booking_available($slug);
 $back=$home.(str_starts_with($return,'booking')?($booking?'?booking=1'.(str_starts_with($return,'booking-')?'&step='.substr($return,8):''):'/contact#enquire'):($return!==''?'/'.$return:''));
}catch(Throwable $e){http_response_code(503);header('Retry-After: 60');echo 'Customer help is temporarily unavailable. Please try again shortly.';exit;}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Customer help · <?=esc($p['name'])?></title><link rel="stylesheet" href="<?=esc($base)?>/business/profile.css"><link rel="stylesheet" href="<?=esc($base)?>/business/homepage.css?v=f04-1"></head><body class="homepage-page">
<?php homepage_header($p,$home,$base,$home.'?logo=1','',false,$booking);?><main id="homepage" class="customer-main<?=esc(business_style_classes($p))?>" tabindex="-1">
<h1 class="customer-intro">Customer help</h1><p class="customer-intro"><?=esc($p['name'])?></p>
<p>Use the confidential link shared by this business to open your quote or invoice. You do not need a customer account.</p>
<section><h2>Your quote or invoice</h2><p>Open the original link from the business. Each link opens one document; it does not show your other records. Anyone with the link can open it, so keep it private.</p><p>If the link is missing, unavailable or has been shared with the wrong person, contact the business. Quote responses are final; contact the business if you need a change.</p></section>
<section><h2>Your booking request</h2><?php if($booking):?><p>You can request a booking as a guest. Keep the reference shown after submission. Your request is pending until the business confirms it.</p><?php else:?><p>Online booking requests are currently unavailable. Contact the business to enquire.</p><p>If you already submitted a request, keep its reference and contact the business for confirmation.</p><?php endif;?><p>To check, change or cancel a request, contact the business with your reference. Online booking history and self-service changes are not available.</p><?php if($booking):?><p><a class="home-button" href="<?=esc($home.'?booking=1')?>">Request a booking</a></p><?php endif;?></section>
<section><h2>Contact the business</h2><p>Use the business’s contact page for help with a document or request. The business may need to verify your identity before sharing private information.</p><p><a class="home-button" href="<?=esc($home.'/contact#enquire')?>">Contact <?=esc($p['name'])?></a></p></section>
<p class="customer-back"><a href="<?=esc($back)?>">Back to <?=str_starts_with($return,'booking')&&$booking?'your request':esc($p['name'])?></a></p></main><script src="<?=esc($base)?>/ui/booking-header.js?v=f04-1" defer></script></body></html>
