<?php
declare(strict_types=1);
const BOOK05_PATH='/account/_book05-preview/';
function book05_sig(string $expiry): string {
    $key=file_get_contents('/var/www/vhosts/shalean.com/private/faraios-checkout-preview/owner-cookie.key');
    if (!is_string($key) || strlen($key)<32) throw new RuntimeException('Preview unavailable.');
    return hash_hmac('sha256','operator|'.$expiry,$key);
}
function book05_gate(): void {
    header('Cache-Control: no-store');header('X-Robots-Tag: noindex, nofollow');header('Referrer-Policy: no-referrer');
    $value=$_COOKIE['book05_private']??'';
    if (!is_string($value)||!preg_match('/^(\d{10})\.([a-f0-9]{64})$/D',$value,$m)|| (int)$m[1]<time() || (int)$m[1]>time()+1800 || !hash_equals(book05_sig($m[1]),$m[2])) {http_response_code(403);exit;}
}
