<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function enquiry_workflow_fields(): array {
 $notes=$_POST['private_notes']??'';$due=$_POST['follow_up_on']??'';if(is_string($notes))$notes=form_multiline($notes);
 if(!is_string($notes)||!is_string($due)||!preg_match('//u',$notes)||mb_len($notes)>2000||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$notes))throw new RuntimeException('Use up to 2000 characters for your private notes.');
 if($due!==''&&(!preg_match('/\A20[0-9]{2}-[0-9]{2}-[0-9]{2}\z/',$due)||!($d=DateTimeImmutable::createFromFormat('!Y-m-d',$due))||$d->format('Y-m-d')!==$due))throw new RuntimeException('Choose a valid follow-up date from 2000 to 2099.');
 return ['p_notes'=>$notes,'p_follow_up'=>$due?:null];
}
function enquiry_workspace_render(array $detail,array $workspace,array $b,int $activityPage): void {
 echo '<section class="enquiry-workspace"><h3>Linked quotes</h3><p class="muted">Quote responses and bookings are shown here. Your enquiry status stays under your control.</p>';
 $quotes=$workspace['quotes']??[];
 foreach(array_slice($quotes,0,20) as $q){echo '<article class="service-card"><a href="quotes.php?id='.esc($q['id']).'">Quote '.esc(strtoupper(substr($q['id'],0,8))).'</a> <span class="badge">'.esc($q['status']).'</span><p>'.esc(quote_money((int)$q['total'],$q['currency'])).'</p>';if($q['booking_id'])echo '<a href="bookings.php?id='.esc($q['booking_id']).'">Open booking</a>';echo '</article>';}
 if(!$quotes)echo '<p>No linked quotes yet.</p>';
 if($quotes)echo '<p><a href="quotes.php?enquiry='.esc($detail['id']).'">View all linked quotes</a></p>';
 echo '<details class="enquiry-history"><summary>Private activity history</summary><p class="muted">Status, note and follow-up changes recorded since this feature was enabled. Earlier history is not reconstructed.</p>';
 $events=$workspace['activity']??[];
 foreach(array_slice($events,0,20) as $event){echo '<article class="service-card"><strong>'.esc($event['event']).' · '.esc(enquiry_date($event['created_at'],$b)).'</strong><p>Status: '.esc($event['status']).' · Follow-up: '.esc($event['follow_up_on']?:'Not set').'</p>';if($event['private_notes']!=='')echo '<p class="description">'.nl2br(esc($event['private_notes'])).'</p>';echo '</article>';}
 if(!$events)echo '<p>No recorded changes on this page.</p>';
 echo '<nav aria-label="Activity pages">';if($activityPage>1)echo '<a href="?id='.esc($detail['id']).'&amp;activity_page='.($activityPage-1).'">Previous activity</a> ';if(count($events)>20)echo '<a href="?id='.esc($detail['id']).'&amp;activity_page='.($activityPage+1).'">Next activity</a>';echo '</nav></details></section>';
}
