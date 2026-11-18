<?php
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/guard.php';
require_once '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/merchants.php';
if (!isset($_GET['webhook'])) {
    book05_gate();
    if (!is_string($_GET['slug'] ?? null) || !isset(book05_merchants()[$_GET['slug']])) {http_response_code(404);exit;}
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && in_array($_POST['action'] ?? '', ['hold','pay'], true)) {
        try { book05_merchant_key($_GET['slug'], '/var/www/vhosts/shalean.com/private/faraios-checkout-preview'); }
        catch (DomainException $exception) { http_response_code(503); exit('This test recipient is not connected.'); }
    }
    if (($_POST['action']??'')==='hold' && ($_POST['email']??'')!=='book05@example.com') {http_response_code(422);exit('Use the synthetic test address.');}
}
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/runtime/b/instant.php';

