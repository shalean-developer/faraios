<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function enquiry_mail_escape(string $s): string {return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function enquiry_mail_message(array $job,array $config): array {
 $d=$job['payload'];$admin=$job['kind']==='admin';$business=preg_replace('/[\r\n\t]+/u',' ',(string)$d['business']);$ref=$d['reference'];
 $title=$admin?'New enquiry':'Enquiry received';
 $text=$admin?"A customer sent an enquiry to {$business}.\n\nName: {$d['customer']}\nEmail: {$d['email']}\nPhone: {$d['phone']}\nService: {$d['service']}\n\n{$d['requirements']}":"We received your enquiry for {$business}. The business will contact you to discuss your requirements. This is not a confirmed booking or quote.";
 $text.="\n\nReference: {$ref}";
 $url=$admin?$config['base_url'].'/account/enquiries.php?id='.$job['enquiry_id']:$config['base_url'].'/b/'.$d['slug'].'/contact';$label=$admin?'View enquiry':'Contact the business';
 $safe=enquiry_mail_escape($text);$safeUrl=enquiry_mail_escape($url);$safeBusiness=enquiry_mail_escape($business);$safeTitle=enquiry_mail_escape($title);
 $html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.$safeTitle.'</title></head><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#183047"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:auto;background:#fff;border:1px solid #dae2e7;border-radius:12px"><tr><td style="padding:28px"><p style="font-size:16px;font-weight:bold">'.$safeBusiness.'</p><h1 style="font-size:26px;line-height:1.2">'.$safeTitle.'</h1><p style="font-size:16px;line-height:1.6;overflow-wrap:anywhere">'.nl2br($safe).'</p><p style="margin:24px 0"><a href="'.$safeUrl.'" style="display:inline-block;background:#183c5d;color:#fff;padding:13px 20px;border-radius:6px;text-decoration:none">'.$label.'</a></p><p style="font-size:12px;color:#536675">Sent by FaraiOS for this enquiry. No marketing subscription was created.</p></td></tr></table></td></tr></table></body></html>';
 $mail=['from'=>$config['sender'],'to'=>[$job['recipient']],'subject'=>($config['environment']==='preview'?'[Preview] ':'').$title.' | '.$business.' | '.$ref,'text'=>$text."\n\n{$label}: {$url}",'html'=>$html];
 if($job['reply_to']!=='')$mail['reply_to']=$job['reply_to'];return $mail;
}
