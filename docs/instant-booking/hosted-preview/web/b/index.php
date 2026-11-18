<?php
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/guard.php';book05_gate();require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/runtime/account/core.php';require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/runtime/account/enquiries-core.php';
$_SERVER['SCRIPT_NAME']='/account/_book05-preview/account/index.php';
require_once '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/merchants.php';
enquiry_session();
$merchants = book05_merchants();
$slug = $_GET['slug'] ?? 'synthetic-cleaning';
if (!is_string($slug) || !isset($merchants[$slug])) { http_response_code(404); exit; }
$ready = true;
try { book05_merchant_key($slug, '/var/www/vhosts/shalean.com/private/faraios-checkout-preview'); }
catch (DomainException $exception) { $ready = false; }
$ticket=enquiry_ticket($slug.':booking');header("Content-Security-Policy: default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
?><!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private checkout test</title><main><h1>Regular Cleaning</h1><nav aria-label="Test recipient"><?php foreach ($merchants as $id=>$merchant): ?><a href="?slug=<?=esc($id)?>"><?=esc($merchant['name'])?></a> <?php endforeach; ?></nav><p>Recipient: <?=esc($merchants[$slug]['name'])?></p><p>Private test booking · Gardens · 2 bedrooms, 1 bathroom</p><?php if (!$ready): ?><p>Test checkout is awaiting this business’s Paystack connection.</p><?php else: ?><form action="instant.php?slug=<?=esc($slug)?>" method="post"><input type="hidden" name="csrf" value="<?=esc($ticket['csrf'])?>"><input type="hidden" name="service" value="<?=str_repeat('1',32)?>"><input type="hidden" name="address" value="10 Example Street"><input type="hidden" name="service_area" value="Gardens"><?php foreach([2=>2,3=>1,4=>1] as $id=>$qty):?><input type="hidden" name="options[<?=str_repeat((string)$id,32)?>]" value="<?=$qty?>"><?php endforeach;?><button>See available times</button></form><?php endif; ?></main></html>
