<?php
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

// This directory is outside every public document root.
const SHALEAN_SETTINGS = '/var/www/vhosts/shalean.com/private/faraios-shalean-settings';
const SHALEAN_BLUE = '#6480fe';

function shalean_colour(): string {
    $path = SHALEAN_SETTINGS.'/colour';
    $colour = is_file($path) ? file_get_contents($path) : '';
    return is_string($colour) && preg_match('/^#[0-9a-f]{6}$/Di', $colour) ? $colour : SHALEAN_BLUE;
}

function shalean_save_setting(string $file, string $value): void {
    if (!in_array($file, ['colour','paystack-test','paystack-live'], true)) throw new LogicException();
    $dir = SHALEAN_SETTINGS;
    if (!is_dir($dir) && !@mkdir($dir, 0700) && !is_dir($dir)) throw new RuntimeException();
    $tmp = tempnam($dir, '.saving-');
    if ($tmp === false) throw new RuntimeException();
    try {
        if (dirname($tmp) !== $dir || !chmod($tmp, 0600) || file_put_contents($tmp, $value) !== strlen($value)
            || !rename($tmp, $dir.'/'.$file)) throw new RuntimeException();
    } finally {
        if (is_file($tmp)) unlink($tmp);
    }
}

function shalean_save_paystack(string $mode, string $public, string $secret): void {
    if (!in_array($mode, ['test','live'], true)
        || !preg_match('/^pk_'.$mode.'_[a-zA-Z0-9]{16,128}$/D', $public)
        || !preg_match('/^sk_'.$mode.'_[a-zA-Z0-9]{16,128}$/D', $secret))
        throw new InvalidArgumentException('Enter both Paystack keys for the selected environment.');
    shalean_save_setting('paystack-'.$mode, json_encode(['public'=>$public,'secret'=>$secret], JSON_THROW_ON_ERROR));
}
