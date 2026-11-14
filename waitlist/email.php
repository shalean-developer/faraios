<?php
declare(strict_types=1);

/** Table-based, self-contained confirmation email; no tracking or external assets. */
function wl_confirmation_html(string $confirm, string $withdraw, string $privacy): string {
    $privacy = htmlspecialchars($privacy, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $confirm = htmlspecialchars($confirm, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $withdraw = htmlspecialchars($withdraw, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    return <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Confirm your FaraiOS waitlist request</title></head>
<body style="margin:0;padding:0;background-color:#f3f7f6;color:#17333e;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">One quick step to confirm your place on the FaraiOS waitlist. Your link expires in 24 hours.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f7f6;"><tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 8px 26px;"><a href="https://www.faraios.com/" style="color:#17333e;text-decoration:none;font-size:30px;font-weight:bold;letter-spacing:-1px;">Farai<span style="color:#087e7b;">OS</span></a><div style="padding-top:5px;font-size:11px;letter-spacing:1px;color:#53676d;">Build. Grow. Manage.</div></td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #dfe8e5;border-radius:16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:36px 28px;">
<p style="margin:0 0 18px;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:1.7px;color:#087e7b;">YOU’RE ONE STEP AWAY</p>
<h1 style="margin:0 0 18px;font-size:30px;line-height:37px;letter-spacing:-0.7px;color:#17333e;">Your next chapter<br>starts here.</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:25px;color:#4b626b;">Thanks for your interest in FaraiOS.</p>
<p style="margin:0 0 28px;font-size:16px;line-height:25px;color:#4b626b;">Confirm your email to join the waitlist and receive launch news and early-access updates about your selected interests.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#087e7b" style="border-radius:7px;mso-padding-alt:16px 26px;"><a href="$confirm" style="display:inline-block;padding:16px 26px;border:1px solid #087e7b;border-radius:7px;color:#ffffff;text-decoration:none;font-size:16px;line-height:20px;font-weight:bold;mso-padding-alt:0;">Confirm my place &#8594;</a></td></tr></table>
<p style="margin:16px 0 28px;font-size:13px;line-height:20px;color:#60747a;">This confirmation link expires in <strong>24 hours</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-top:1px solid #e3ebe8;padding-top:24px;">
<p style="margin:0;font-size:13px;line-height:21px;color:#60747a;">You’ll join the active waitlist only after confirming. If you didn’t request this, you can safely ignore this email.</p>
<p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#60747a;">Button not working? <a href="$confirm" style="color:#076c69;text-decoration:underline;">Open the confirmation page</a>.</p>
</td></tr></table>
</td></tr></table></td></tr>
<tr><td align="center" style="padding:24px 16px 0;font-size:12px;line-height:20px;color:#60747a;">Questions? <a href="mailto:hello@faraios.com" style="color:#076c69;text-decoration:underline;">hello@faraios.com</a><br><a href="$withdraw" style="color:#53676d;text-decoration:underline;">Cancel request or unsubscribe</a><span style="color:#a0aeac;"> &nbsp;·&nbsp; </span><a href="$privacy" style="color:#53676d;text-decoration:underline;">Waitlist privacy notice</a><p style="margin:14px 0 0;font-size:11px;color:#60747a;">FaraiOS — Build. Grow. Manage.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>
HTML;
}
