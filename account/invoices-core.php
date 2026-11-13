<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function invoice_amount(string $s,string $currency): int {
 if(!preg_match(in_array($currency,['JPY','UGX','RWF'],true)?'/\A[0-9]{1,7}\z/':'/\A[0-9]{1,7}(?:\.[0-9]{1,2})?\z/',trim($s)))throw new RuntimeException('Enter a valid positive amount in '.$currency.'.');
 $p=explode('.',trim($s));$n=(int)$p[0]*100+(int)str_pad($p[1]??'',2,'0');if($n<1||$n>999999999)throw new RuntimeException('Enter a valid positive payment amount.');return $n;
}
function invoice_date(string $s): string {$d=DateTimeImmutable::createFromFormat('!Y-m-d',$s);if(!$d||$d->format('Y-m-d')!==$s||$s<'2000-01-01'||$s>'2099-12-31')throw new RuntimeException('Choose a valid date from 2000 to 2099.');return $s;}
function invoice_balances(array $q): void {
 echo '<div class="invoice-balances"><p>Recorded payments <strong>'.esc(quote_money((int)$q['paid'],$q['document']['currency'])).'</strong></p><p>'.(($q['state']??$q['status'])==='Void'?'Voided amount':'Outstanding').' <strong>'.esc(quote_money((int)$q['balance'],$q['document']['currency'])).'</strong></p></div>';
}
function invoice_payments(array $b,string $id): array {
 $rows=[];for($offset=0;;$offset+=100){$page=api('/rest/v1/business_invoice_payments?business_id=eq.'.rawurlencode($b['id']).'&environment=eq.'.profile_env().'&invoice_id=eq.'.rawurlencode($id).'&select=*&order=created_at.asc,id.asc&limit=100&offset='.$offset,[],'GET',$_SESSION['auth']['access_token']);$rows=array_merge($rows,$page);if(count($page)<100)return $rows;if($offset>=9900)throw new RuntimeException('Payment history exceeds the display limit. Contact support.');}
}
function invoice_key(string $invoice,string $key): string {return $_SESSION['invoice_keys'][$invoice][$key]??=quote_uuid();}
function invoice_payment_forms(array $b,array $q): void {
 try{$payments=invoice_payments($b,$q['id']);}catch(Throwable $e){echo '<p class="alert" role="alert">Payment history could not load. Reload before making a payment correction.</p>';return;}$currency=$q['document']['currency'];$reversed=array_filter(array_column($payments,'reversal_of'));$today=(new DateTimeImmutable('now',new DateTimeZone($b['time_zone'])))->format('Y-m-d');
 if($q['state']==='Issued'&&$q['balance']>0){echo '<section class="quote-saved"><h3>Record payment</h3><p class="muted">Record money already received. This does not collect or transfer money.</p>';form_start();
 echo '<input type="hidden" name="action" value="payment"><input type="hidden" name="payment_id" value="'.esc(invoice_key($q['id'],'payment')).'"><label for="amount">Amount · '.esc($currency).'</label><input id="amount" name="amount" inputmode="decimal" required value="'.esc((string)(($_POST['action']??'')==='payment'?($_POST['amount']??''):'')).'"><label for="paid_on">Payment date</label><input id="paid_on" name="paid_on" type="date" max="'.esc($today).'" required value="'.esc((string)(($_POST['action']??'')==='payment'?($_POST['paid_on']??$today):$today)).'"><label for="reference">Payment reference</label><input id="reference" name="reference" maxlength="120" required value="'.esc((string)(($_POST['action']??'')==='payment'?($_POST['reference']??''):'')).'"><label class="check"><input type="checkbox" name="confirm_payment" required> I confirm this payment was received.</label><button class="button">Record payment</button></form></section>';
 }
 echo '<section class="quote-saved"><h3>Payment history</h3>';if(!$payments)echo '<p>No payments recorded.</p>';
 foreach($payments as $p){echo '<article class="service-card"><h4>'.($p['reversal_of']?'Reversal':'Payment').' · '.esc(quote_money((int)$p['amount'],$currency)).'</h4><p>'.esc($p['paid_on']).' · '.esc($p['reference']).'</p><small>Recorded '.esc($p['created_at']).' · '.esc(strtoupper(substr($p['id'],0,8))).'</small>';
 if($p['reversal_of'])echo '<p>Corrects '.esc(strtoupper(substr($p['reversal_of'],0,8))).' · '.esc($p['reason']).'</p>';
 elseif(in_array($p['id'],$reversed,true))echo '<p class="muted">Reversed · Original retained</p>';
 elseif($q['state']==='Issued'){echo '<details><summary>Correct payment</summary><p>Reverse this entire entry, then record the correct payment if needed. This does not refund money.</p>';form_start();echo '<input type="hidden" name="action" value="reverse"><input type="hidden" name="reversal" value="'.esc($p['id']).'"><input type="hidden" name="payment_id" value="'.esc(invoice_key($q['id'],'reverse_'.$p['id'])).'"><label>Correction reason<input name="reason" minlength="5" maxlength="500" required></label><label class="check"><input type="checkbox" name="confirm_payment" required> Reverse this ledger entry and retain its history.</label><button class="button secondary">Reverse payment</button></form></details>';}
 echo '</article>';}
 echo '</section>';
 if($q['state']==='Issued'&&(int)$q['paid']===0){echo '<details class="quote-saved"><summary>Void invoice</summary><p>This keeps the number, customer link and audit history. The invoice can no longer receive payments.</p>';form_start();echo '<input type="hidden" name="action" value="void"><input type="hidden" name="version" value="'.(int)$q['version'].'"><label>Reason<input name="reason" minlength="5" maxlength="500" required></label><label class="check"><input type="checkbox" name="confirm_void" required> Void this invoice.</label><button class="button secondary">Void invoice</button></form></details>';}
 if($q['state']==='Void')echo '<p>Void reason: '.esc($q['void_reason']).'</p>';
}
