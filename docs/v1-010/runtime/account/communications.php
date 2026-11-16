<?php
require __DIR__.'/core.php';require __DIR__.'/profile-core.php';require __DIR__.'/../notifications/lifecycle.php';
$_SERVER['SCRIPT_NAME']=preg_replace('~/account/communications.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
$b=null;$error='';$notice='';$rows=[];$page=max(1,min(5001,(int)($_GET['page']??1)));
try{
 start();user();$b=business();if(!$b)go('business');
 if($_SERVER['REQUEST_METHOD']==='POST'){
  csrf(8192);if(($_POST['confirm']??'')!=='yes')throw new RuntimeException('Review the recipient and complete message before approving.');
  profile_rpc('business_communication_approve',['p_business'=>$b['id'],'p_environment'=>profile_env(),'p_id'=>(string)($_POST['id']??'')]);$notice='Message queued once. Check its outcome below; provider acceptance is not delivery.';
 }
 $rows=profile_rpc('business_communication_list',['p_business'=>$b['id'],'p_environment'=>profile_env(),'p_offset'=>($page-1)*20]);
}catch(AccountSessionExpired $e){$_SESSION=['csrf'=>bin2hex(random_bytes(32)),'notice'=>$e->getMessage()];session_regenerate_id(true);go('signin');}
catch(Throwable $e){
 $error='Communications unavailable or sending not approved. Reload to check the outcome before retrying.';
 foreach(['Sending disabled or recipient not approved','Message superseded. Review the current record; do not send old details.','Message cannot be retried safely. Check delivery with support; do not resend.','Review the recipient and complete message before approving.']as $safe)if(str_contains($e->getMessage(),$safe))$error=$safe;
 if($b)try{$rows=profile_rpc('business_communication_list',['p_business'=>$b['id'],'p_environment'=>profile_env(),'p_offset'=>($page-1)*20]);}catch(Throwable $unavailable){}
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Messages | FaraiOS</title><link rel="stylesheet" href="layout.css"><link rel="stylesheet" href="private.css"><link rel="stylesheet" href="../ui/design-system.css"><script src="layout.js" defer></script></head><body class="ui-page ui-workspace business-page"><?php require_once __DIR__.'/layout.php';app_layout('Messages',$b);?><main id="app-main" tabindex="-1" class="editor-main"><h1>Messages</h1><p>Lifecycle messages require your review and deliberate approval. Enquiry acknowledgements and invitations use their existing controls. No marketing messages.</p>
<?php if($error):?><p role="alert"><?=esc($error)?></p><?php endif;if($notice):?><p role="status"><?=esc($notice)?></p><?php endif;?>
<?php foreach(array_slice($rows,0,20)as $row):$message=lifecycle_message($row+['environment'=>profile_env()],['base_url'=>cfg()['base_url'],'sender'=>'notifications@notify.faraios.com']);?><section class="panel"><h2><?=esc(str_replace('.',' · ',$row['event']))?></h2><p><?=esc($row['recipient']?:'No email address')?> · <?=esc($row['status'])?> · Attempts <?=(int)$row['attempts']?> · Delivery <?=esc($row['delivery'])?></p><?php if($row['error']):?><p role="status"><?=esc($row['error'])?></p><?php endif;?><details><summary>Review message</summary><p><strong><?=esc($message['subject'])?></strong></p><p style="white-space:pre-wrap;overflow-wrap:anywhere"><?=esc($message['text'])?></p></details>
<?php if($row['status']==='review'||($row['status']==='failed'&&$row['error']==='Temporary provider failure')):form_start();?><input type="hidden" name="id" value="<?=esc($row['id'])?>"><label><input type="checkbox" name="confirm" value="yes" required> I reviewed this recipient and message.</label><button class="button">Approve this message</button></form><?php endif;?>
<p>Accepted means the email provider accepted the message. Delivery remains unknown until a verified delivery event. If blocked, rejected or expired, check the intended contact and delivery with support before any manual recovery. Do not resend uncertain messages.</p></section><?php endforeach;?>
<?php if(!$rows&&!$error):?><p>No lifecycle messages to review.</p><?php endif;?><nav aria-label="Message pages"><?php if($page>1):?><a href="?page=<?=$page-1?>">Previous</a><?php endif;if(count($rows)>20):?><a href="?page=<?=$page+1?>">Next</a><?php endif;?></nav></main></body></html>
