<?php
declare(strict_types=1);
require_once __DIR__.'/merchants.php';

function review_http(string $url, string $token, ?array $body=null): array
{
    $context = stream_context_create(['http'=>[
        'method'=>$body===null ? 'GET' : 'POST', 'timeout'=>12, 'ignore_errors'=>true, 'follow_location'=>0,
        'header'=>"Authorization: Bearer ".$token."\r\nContent-Type: application/json\r\nAccept: application/json\r\nUser-Agent: FaraiOS-Private-Checkout/1.0",
        'content'=>$body===null ? '' : json_encode($body,JSON_THROW_ON_ERROR),
    ], 'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
    $raw = @file_get_contents($url,false,$context,0,1048577);
    if ($raw===false || strlen($raw)>1048576 || !preg_match('~^HTTP/\S+ 2\d\d\b~',$http_response_header[0]??''))
        throw new RuntimeException('Provider or preview unavailable.');
    $response=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    if (!is_array($response)) throw new RuntimeException('Invalid response.');
    return $response;
}

function review_store(string $operation,array $args): array
{
    $token=trim((string)@file_get_contents(dirname(__DIR__).'/refund-review.key'));
    if (!preg_match('/^[a-f0-9]{64}$/D',$token)) throw new RuntimeException('Preview unavailable.');
    $result=review_http('https://jqnecahhaxxdsrybwuoo.supabase.co/functions/v1/book05-checkout',$token,
        ['operation'=>$operation,'args'=>$args]);
    if (!is_array($result['result']??null)) throw new RuntimeException('Invalid preview response.');
    return $result['result'];
}

function review_paystack(string $merchant,string $path,?array $body=null): array
{
    $reply=review_http('https://api.paystack.co/'.$path, book05_merchant_key($merchant,dirname(__DIR__)), $body);
    if (($reply['status']??false)!==true || !is_array($reply['data']??null)) throw new RuntimeException('Paystack unavailable.');
    return $reply;
}

function review_transaction(array $row): array
{
    $ref='fi-'.$row['reference'];
    $tx=review_paystack($row['slug'],'transaction/verify/'.rawurlencode($ref))['data'];
    if (($tx['domain']??'')!=='test' || ($tx['reference']??'')!==$ref ||
        ($tx['currency']??'')!=='ZAR' || ($tx['amount']??null)!==$row['amount'] ||
        !is_int($tx['id']??null) || (string)$tx['id']!==$row['transaction_id'])
        throw new RuntimeException('Transaction details differ.');
    return $tx;
}

function review_refunds(array $row): array
{
    $items=[];
    for ($page=1; $page<=100; $page++) {
        $response=review_paystack($row['slug'],'refund?'.http_build_query([
            'transaction'=>$row['transaction_id'],'currency'=>'ZAR','perPage'=>20,'page'=>$page]));
        $rows=$response['data'];
        if (!array_is_list($rows)) throw new RuntimeException('Invalid refund list.');
        foreach ($rows as $r) {
            $tx=$r['transaction']??null;
            if (is_array($tx)) $tx=$tx['id']??null;
            if ((string)$tx!==$row['transaction_id'] || ($r['domain']??'')!=='test' || ($r['currency']??'')!=='ZAR' ||
                !is_int($r['id']??null) || !is_int($r['amount']??null) || $r['amount']<=0 ||
                !is_string($r['status']??null) || isset($items[$r['id']])) throw new RuntimeException('Refund details differ.');
            $items[$r['id']]=['id'=>$r['id'],'amount'=>$r['amount'],'status'=>$r['status'],
                'updated'=>$r['updatedAt']??$r['updated_at']??$r['createdAt']??null];
        }
        if (count($rows)<20 || $page>=($response['meta']['pageCount']??PHP_INT_MAX)) return array_values($items);
    }
    throw new RuntimeException('Refund list could not be verified.');
}

function review_status(int $amount,array $refunds,?string $requested): string
{
    if (!$refunds) return $requested===null ? 'Awaiting refund' : 'Request recorded · check Paystack';
    $processed=0; $states=[];
    foreach ($refunds as $refund) {
        $states[]=$refund['status'];
        if ($refund['status']==='processed') $processed+=$refund['amount'];
    }
    if ($processed>$amount) return 'Amount needs review';
    if ($processed===$amount) return 'Refund completed';
    if (array_intersect($states,['failed','needs-attention','needs_attention'])) return 'Refund needs attention';
    if (array_intersect($states,['pending','processing'])) return 'Refund in progress';
    return $processed>0 ? 'Partially refunded' : 'Check provider status';
}

function review_request(array $row,array $tx,array $refunds): void
{
    if ($row['refund_requested_at']!==null || $refunds || ($tx['status']??null)!=='success')
        throw new DomainException('Check the current refund status before taking action.');
    $claim=review_store('claimRefund',[$row['reference'],$row['transaction_id']]);
    if (($claim['claimed']??false)!==true) throw new DomainException('A refund request is already recorded.');
    // The claim survives a timeout. Reconcile against Paystack before any manual retry.
    review_paystack($row['slug'],'refund',['transaction'=>'fi-'.$row['reference'],'amount'=>$row['amount'],'currency'=>'ZAR']);
}
