<?php
declare(strict_types=1);
require __DIR__ . '/core.php';
wl_headers();
$action = basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'unsubscribe.php' ? 'unsubscribe' : 'confirm';
$title = $action === 'confirm' ? 'Confirm your email.' : 'Leave the waitlist?';
$description = $action === 'confirm' ? 'Confirm that you want FaraiOS waitlist, launch and early-access updates about your selected interests.' : 'You will stop receiving FaraiOS waitlist updates. This also cancels an unconfirmed request.';
$button = $action === 'confirm' ? 'Confirm my place' : 'Unsubscribe';
$done = false;
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    try {
        if (!wl_config()['enabled']) throw new RuntimeException('Unavailable');
        $token = is_string($_POST['token'] ?? null) ? $_POST['token'] : '';
        $ok = wl_transition(wl_db(), $action, $token);
        $done = true;
        $title = $ok ? ($action === 'confirm' ? 'You’re on the list.' : 'You’re unsubscribed.') : 'This link is no longer active.';
        $description = $ok ? ($action === 'confirm' ? 'Your email is confirmed. We’ll email you when there’s news about your selected interests. Keep the confirmation email to unsubscribe at any time.' : 'Your request has been withdrawn. You won’t receive further waitlist updates.') : 'It may have expired or already been used. To request another confirmation link, submit the homepage form again. For help or to rejoin after unsubscribing, email hello@faraios.com.';
    } catch (Throwable $e) { http_response_code(503); $done = true; $title = 'Please try again shortly.'; $description = 'The waitlist is temporarily unavailable. Your link has not been changed.'; }
}
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title><?=htmlspecialchars($title)?> | FaraiOS</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="waitlist.css"></head>
<body class="wl-page"><main class="wl-card"><a href="../"><img src="../FaraiOS-logo.svg" width="180" height="52" alt="FaraiOS — Build. Grow. Manage."></a><p class="wl-eyebrow">FaraiOS waitlist</p><h1><?=htmlspecialchars($title)?></h1><p><?=htmlspecialchars($description)?></p>
<?php if (!$done): ?><form method="post" class="wl-token-form"><input type="hidden" name="token" value=""><button class="wl-submit" type="submit" disabled><?=htmlspecialchars($button)?></button><p class="wl-token-help">Open the full link from your confirmation email to continue.</p></form><noscript><p>Enable JavaScript to use the email link, or contact hello@faraios.com for help.</p></noscript><script src="token.js" defer></script><?php endif; ?>
<a class="wl-back" href="../">Back to homepage</a><p class="wl-small"><a href="../privacy.html">Privacy notice</a> · <a href="mailto:hello@faraios.com">Contact us</a></p></main></body></html>
