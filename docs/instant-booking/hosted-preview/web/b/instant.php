<?php
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/guard.php';
if (!isset($_GET['webhook'])) {
    book05_gate();
    if (($_GET['slug']??'')!=='synthetic-cleaning') {http_response_code(404);exit;}
    if (($_POST['action']??'')==='hold' && ($_POST['email']??'')!=='book05@example.com') {http_response_code(422);exit('Use the synthetic test address.');}
}
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/runtime/b/instant.php';
