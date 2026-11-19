<?php
declare(strict_types=1);
require __DIR__.'/core.php';
require __DIR__.'/profile-core.php';
require dirname(__DIR__).'/business/visit-store.php';
require_once dirname(__DIR__).'/business/shalean-settings.php';
$_SERVER['SCRIPT_NAME'] = preg_replace('~/account/shalean-settings\.php$~', '/account/index.php', $_SERVER['SCRIPT_NAME']);
$error = '';
try {
    start();
    $owner = user();
    $rows = api('/rest/v1/businesses?id=eq.'.VISIT_EFT_BUSINESS.'&owner_id=eq.'.rawurlencode($owner['id']).'&select=id,name', [], 'GET', $_SESSION['auth']['access_token']);
    $b = $rows[0] ?? null;
    if (profile_env() !== 'live' || ($b['id'] ?? null) !== VISIT_EFT_BUSINESS) {
        http_response_code(403); exit('Only the Shalean business owner can manage these settings.');
    }
    $notice = $_SESSION['shalean_settings_notice'] ?? '';
    unset($_SESSION['shalean_settings_notice']);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        csrf();
        try {
            if (($_POST['action'] ?? '') === 'colour') {
                $colour = $_POST['colour'] ?? '';
                if (!is_string($colour) || !preg_match('/^#[a-f0-9]{6}$/Di', $colour)) throw new InvalidArgumentException('Choose a valid brand colour.');
                shalean_save_setting('colour', strtolower($colour));
                $notice = 'Brand colour saved.';
            } elseif (($_POST['action'] ?? '') === 'paystack') {
                shalean_save_paystack($_POST['mode'] ?? '', trim($_POST['public'] ?? ''), trim($_POST['secret'] ?? ''));
                $notice = 'Paystack keys saved.';
            } else throw new InvalidArgumentException('Choose a settings action.');
            $_SESSION['shalean_settings_notice'] = $notice;
            header('Location: shalean-settings.php', true, 303); exit;
        } catch (InvalidArgumentException $e) { $error = $e->getMessage(); }
          catch (Throwable $e) { $error = 'The settings could not be saved. Please try again.'; }
    }
} catch (AccountSessionExpired $e) { go('signin'); }
  catch (Throwable $e) { http_response_code(403); exit('Sign in as the business owner to manage settings.'); }
?>
<!doctype html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brand and payments | Shalean</title>
<link rel="icon" href="../favicon.svg">
<link rel="stylesheet" href="../business/profile.css">
<link rel="stylesheet" href="layout.css?v=20261113-4">
<link rel="stylesheet" href="private.css">
<link rel="stylesheet" href="settings.css">
<link rel="stylesheet" href="../ui/design-system.css?v=20261115">
<script src="layout.js?v=20261113-2" defer></script>
</head>
<body class="ui-page ui-workspace business-page account-settings">
<?php require_once __DIR__.'/layout.php'; app_layout('Brand and payments', $b); ?>
<main id="app-main" class="editor-main" tabindex="-1">
    <div class="editor-heading"><h1>Brand and payments</h1></div>
    <?php if ($notice): ?><p class="notice" role="status"><?=esc($notice)?></p><?php endif; ?>
    <?php if ($error): ?><p class="alert" role="alert"><?=esc($error)?></p><?php endif; ?>
    <div class="account-settings-grid">
        <section class="panel">
            <h2>Brand colour</h2>
            <?php form_start(); ?>
                <input type="hidden" name="action" value="colour">
                <label for="colour">Website and booking accent</label>
                <input type="color" id="colour" name="colour" value="<?=esc(shalean_colour())?>">
                <button class="button" type="submit">Save colour</button>
            </form>
        </section>
        <section class="panel">
            <h2>Paystack</h2>
            <p>Checkout uses the sandbox. Live keys are stored for launch.</p>
            <?php foreach (['test'=>'Sandbox','live'=>'Live'] as $mode=>$label): ?>
            <details>
                <summary><?=$label?> keys · <?=is_file(SHALEAN_SETTINGS.'/paystack-'.$mode)?'Configured':'Add keys'?></summary>
                <?php form_start(); ?>
                    <input type="hidden" name="action" value="paystack">
                    <input type="hidden" name="mode" value="<?=$mode?>">
                    <label for="<?=$mode?>-public">Public key</label>
                    <input type="password" id="<?=$mode?>-public" name="public" autocomplete="new-password" spellcheck="false" maxlength="140" required>
                    <label for="<?=$mode?>-secret">Secret key</label>
                    <input type="password" id="<?=$mode?>-secret" name="secret" autocomplete="new-password" spellcheck="false" maxlength="140" required>
                    <button class="button" type="submit">Save <?=strtolower($label)?> keys</button>
                </form>
            </details>
            <?php endforeach; ?>
        </section>
    </div>
</main>
</body>
</html>
