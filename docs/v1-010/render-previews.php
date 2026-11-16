<?php
require __DIR__.'/runtime/notifications/lifecycle.php';
$c=['base_url'=>'https://www.faraios.com/_accounts-preview','sender'=>'notifications@notify.faraios.com'];
$events=['request.accepted','request.declined','quote.sent','quote.accepted','quote.declined','booking.confirmation','booking.changed','booking.cancelled','booking.completed','invoice.issued','invoice.void'];
echo "# V1-010 — prepared synthetic message review\n\n17 November 2026. **Unsent illustrative fixtures**, rendered by the candidate template. Proposed controlled inbox: owner+v1009@faraios.com (used in V1-009). No customer addresses. Reference, invoice number and zero-token document URLs below are fictional examples, not hosted records or valid links. Actual preview records generate their own confidential links; review those exact messages before requesting sending authorization. No sending is authorized by this file.\n\n";
foreach($events as $event){
 $p=['business'=>'Synthetic V1-010 ZA Cleaning','event'=>$event,'reference'=>'SYNTH010','local'=>'24 Nov 2026 10:00','zone'=>'Africa/Johannesburg','duration'=>90,'address'=>'123 Fictional Test Road, Cape Town','status'=>str_starts_with($event,'booking.')?($event==='booking.cancelled'?'Cancelled':($event==='booking.completed'?'Completed':'Scheduled')):'','link'=>''];
 if($event==='booking.changed')$p+=['previous_local'=>'24 Nov 2026 09:00','previous_zone'=>'Africa/Johannesburg','previous_duration'=>60,'previous_address'=>'123 Fictional Test Road, Cape Town','previous_status'=>'Scheduled'];
 if(str_starts_with($event,'quote.'))$p+=['currency'=>'ZAR','total_minor'=>87525,'expires_on'=>'30 Nov 2026'];
 if(str_starts_with($event,'invoice.'))$p+=['currency'=>'ZAR','total_minor'=>87525,'number'=>'SYNTH-INV-000001','due_on'=>'08 Dec 2026'];
 if(str_starts_with($event,'quote.'))$p['link']='/quote/index.php?token='.str_repeat('0',64);
 if(str_starts_with($event,'invoice.'))$p['link']='/invoice/index.php?token='.str_repeat('0',64);
 $m=lifecycle_message(['recipient'=>'owner+v1009@faraios.com','environment'=>'preview','payload'=>$p],$c);
 echo '## '.$event."\n\nTo: owner+v1009@faraios.com\n\nSubject: ".$m['subject']."\n\n```text\n".$m['text']."\n```\n\n";
}
