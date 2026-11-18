<?php
declare(strict_types=1);

function book05_merchants(): array
{
    return [
        'synthetic-cleaning' => ['name' => 'Shalean Cleaning Services', 'file' => 'paystack-test.key'],
        'bokkie-book05' => ['name' => 'Bokkie Cleaning Services', 'file' => 'bokkie-paystack-test.key'],
        'pure-book05' => ['name' => 'Pure Quality Cleaning Services', 'file' => 'pure-paystack-test.key'],
    ];
}

function book05_merchant_key(string $slug, string $directory): string
{
    $merchants = book05_merchants();
    if (!isset($merchants[$slug])) throw new DomainException('Unknown test recipient.');
    $keys = [];
    foreach ($merchants as $id => $merchant) {
        $file = $directory.'/'.$merchant['file'];
        if (!is_file($file) || is_link($file) || (fileperms($file) & 0077) !== 0) continue;
        $value = trim((string)file_get_contents($file));
        if (preg_match('/^sk_test_[A-Za-z0-9]+$/D', $value)) $keys[$id] = $value;
    }
    if (!isset($keys[$slug]) || count(array_keys($keys, $keys[$slug], true)) !== 1)
        throw new DomainException('Test checkout is unavailable for this recipient.');
    return $keys[$slug];
}

function book05_receipt_matches(array $hold, string $slug): bool
{
    return isset(book05_merchants()[$slug]) && ($hold['slug'] ?? '') === $slug;
}
