<?php
declare(strict_types=1);
require dirname(__DIR__).'/platform-session.php';
require dirname(__DIR__).'/platform-core.php';
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/guard.php';
header('Cache-Control: no-store');header('Referrer-Policy: no-referrer');header('X-Robots-Tag: noindex, nofollow');
try {
    start();$operator=user();
    if(!platform_authorized($operator,platform_settings())) {http_response_code(403);exit;}
    $expiry=(string)(time()+1800);
    setcookie('book05_private',$expiry.'.'.book05_sig($expiry),['expires'=>(int)$expiry,'path'=>BOOK05_PATH,'secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
    header('Location: '.BOOK05_PATH.'b/index.php',true,303);
} catch(Throwable $e){http_response_code(403);}
