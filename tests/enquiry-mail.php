<?php
require __DIR__.'/../notifications/enquiry-email.php';require __DIR__.'/../notifications/dispatch.php';
function check($v){if(!$v)throw new RuntimeException('Mail assertion failed');}
$c=['environment'=>'preview','base_url'=>'https://www.faraios.com/_accounts-preview','sender'=>'notifications@notify.faraios.com','allow_recipients'=>['owner@example.test']];
$j=['id'=>'job-1','enquiry_id'=>'enquiry-1','kind'=>'admin','recipient'=>'owner@example.test','reply_to'=>'customer@example.test','lease'=>'lease-1','environment'=>'preview','payload'=>['business'=>'Demo <script>','reference'=>'AABBCCDD','customer'=>'Name <script>','email'=>'customer@example.test','phone'=>'0601234567','service'=>'Home clean','requirements'=>'<img src=x onerror=alert(1)>','slug'=>'demo']];
$m=enquiry_mail_message($j,$c);check(str_contains($m['html'],'&lt;img'));check(!str_contains($m['html'],'<script>'));check($m['to']===['owner@example.test']);check($m['reply_to']==='customer@example.test');check(str_contains($m['text'],'<img'));
foreach([0,429,503,422,200] as $status){$queue=[$j];$out=[];$sent=[];
 $rpc=function($name,$args)use(&$queue,&$out){if($name==='business_enquiry_mail_claim')return array_shift($queue)??[];$out[]=$args;return [];};
 $send=function($message,$key)use(&$sent,$status){$sent[]=[$message,$key];return ['status'=>$status,'body'=>['id'=>'provider-1']];};
 check(enquiry_mail_dispatch($c,$rpc,$send)===1);check(count($sent)===1);check($sent[0][1]==='enquiry/preview/job-1');check($out[0]['p_retry']===in_array($status,[0,429,503],true));check($out[0]['p_provider_id']===($status===200?'provider-1':''));
}
$queue=[$j];$out=[];$sent=[];$blocked=$c;$blocked['allow_recipients']=[];enquiry_mail_dispatch($blocked,$rpc,$send);check(count($sent)===0);check($out[0]['p_error']==='Recipient blocked in preview');
$j['kind']='customer';$j['payload']=array_diff_key($j['payload'],array_flip(['customer','requirements','email','phone']));$m=enquiry_mail_message($j,$c);check(!str_contains($m['text'],'<img'));check(!str_contains($m['text'],'0601234567'));check(str_contains($m['text'],'not a confirmed booking'));check(!str_contains($m['html'],'enquiries.php'));
$j['reply_to']='';$m=enquiry_mail_message($j,$c);check($m['reply_to']==='support@faraios.com');check($m['from']==='notifications@notify.faraios.com');
echo "PASS templates and dispatcher: escaping, distinct recipients, no customer reflection, stable keys, transient/permanent errors, preview allowlist.\n";
