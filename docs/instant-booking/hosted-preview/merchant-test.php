<?php
declare(strict_types=1);
require __DIR__.'/private/merchants.php';
$folder = sys_get_temp_dir().'/book05-'.bin2hex(random_bytes(12));
mkdir($folder,0700);
function check(bool $ok): void { if (!$ok) throw new RuntimeException('Check failed'); }
function rejects(callable $fn): void { try { $fn(); } catch (DomainException $e) { return; } throw new RuntimeException('Expected rejection'); }
try {
    $merchants = book05_merchants();
    foreach ($merchants as $slug => $merchant) {
        rejects(fn()=>book05_merchant_key($slug,$folder));
        $file=$folder.'/'.$merchant['file'];
        file_put_contents($file,'sk_test_'.bin2hex(random_bytes(20)));
        chmod($file,0600);
        check(book05_merchant_key($slug,$folder)===file_get_contents($file));
        foreach (array_keys($merchants) as $other)
            check(book05_receipt_matches(['slug'=>$slug], $other) === ($slug === $other));
    }
    rejects(fn()=>book05_merchant_key('unknown-business',$folder));
    check(!book05_receipt_matches([], 'synthetic-cleaning'));
    $bokkie=$folder.'/'.$merchants['bokkie-book05']['file'];
    file_put_contents($bokkie,book05_merchant_key('synthetic-cleaning',$folder));
    rejects(fn()=>book05_merchant_key('bokkie-book05',$folder));
    file_put_contents($bokkie,'sk_live_placeholder');
    rejects(fn()=>book05_merchant_key('bokkie-book05',$folder));
    file_put_contents($bokkie,'sk_test_placeholder');
    chmod($bokkie,0644);
    clearstatcache();
    rejects(fn()=>book05_merchant_key('bokkie-book05',$folder));
    echo "PASS: merchant selection, mismatched receipts and missing, duplicate, live or exposed keys.\n";
} finally {
    foreach (glob($folder.'/*') as $file) unlink($file);
    rmdir($folder);
}
