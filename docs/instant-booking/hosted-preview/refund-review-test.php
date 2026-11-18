<?php
declare(strict_types=1);
require __DIR__.'/private/refund-review.php';
$cases=[
    [[],null,'Awaiting refund'],
    [[],'2026-11-18','Request recorded · check Paystack'],
    [[['amount'=>37500,'status'=>'pending']],null,'Refund in progress'],
    [[['amount'=>37500,'status'=>'processing']],null,'Refund in progress'],
    [[['amount'=>37500,'status'=>'failed']],null,'Refund needs attention'],
    [[['amount'=>37500,'status'=>'needs-attention']],null,'Refund needs attention'],
    [[['amount'=>1000,'status'=>'processed']],null,'Partially refunded'],
    [[['amount'=>1000,'status'=>'processed'],['amount'=>36500,'status'=>'processed']],null,'Refund completed'],
    [[['amount'=>37501,'status'=>'processed']],null,'Amount needs review'],
    [[['amount'=>37500,'status'=>'other']],null,'Check provider status'],
];
foreach ($cases as [$refunds,$requested,$expected]) {
    if (review_status(37500,$refunds,$requested)!==$expected) throw new RuntimeException($expected);
}
echo count($cases)." refund status checks passed\n";
