<?php
declare(strict_types=1);
require_once __DIR__.'/shalean-settings.php';
header('Content-Type: text/css; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache');
$colour = shalean_colour();
// Keep white button text readable even when the owner chooses a pale accent.
$rgb = array_map('hexdec', str_split(substr($colour, 1), 2));
$linear = static fn($v) => ($v /= 255) <= .04045 ? $v / 12.92 : (($v + .055) / 1.055) ** 2.4;
while (.2126*$linear($rgb[0]) + .7152*$linear($rgb[1]) + .0722*$linear($rgb[2]) > .18) {
    $rgb = array_map(static fn($v) => (int)floor($v * .95), $rgb);
}
$action = sprintf('#%02x%02x%02x', ...$rgb);
?>
:root {
    --logo-accent: <?=$colour?>;
    --action: <?=$action?>;
    --deep: color-mix(in srgb, var(--action) 40%, #111629);
    --soft: color-mix(in srgb, var(--logo-accent) 10%, white);
    --edge: color-mix(in srgb, var(--logo-accent) 27%, #e4e7f0);
    --teal: var(--action); --line: var(--edge);
}
body, .ui-page.ui-business, .business-home, .home-header, .home-footer {
    --brand:var(--action); --ink:var(--deep); --f-teal:var(--action);
    --f-teal-hover:var(--deep); --f-mint:var(--soft); --f-focus:var(--action);
    --f-ink:var(--deep); --f-line:var(--edge);
    color:var(--deep);
}
body :is(.home-hero h1,.home-section h2,.home-page-intro h1,.home-brand,.home-header nav a,.booking-footer a) {color:var(--deep)}
body :is(.home-text-link,.booking-auth-button,.home-contact-links a,.home-eyebrow,.service-price,.service-arrow,.task-circle,.booking-policy-trigger) {color:var(--action)}
body .home-header nav a[aria-current=page],body .home-breadcrumbs a {color:var(--action)}
body :is(.home-area-list li,.home-service-card,.home-step,.home-mark,.booking-user-avatar,.home-contact .enquiry-form,.hold,.brand-row li:not(.current) b) {background:var(--soft);border-color:var(--edge)}
.ui-page.ui-business .home-button,body .home-contact .button,body .task-button[aria-pressed=true] .task-circle::after {background:var(--action);border-color:var(--action);color:white}
body :is(.home-button,.home-contact .button):hover {background:var(--deep)}
body .visit-summary-footer {background:var(--deep)}
body .task-button[aria-pressed=true] .task-circle,body .room-choices button[aria-pressed=true],body .booking-start-row label:has(:checked) {background:var(--soft);border-color:var(--action)}
body .booking-area-control::after {border-color:var(--action)}
body .task-button:focus-visible,body .service-tile:focus-visible,body .booking-start-row label:focus-within {outline-color:var(--action)}
body .booking-start-row input {accent-color:var(--action)}
