<?php
declare(strict_types=1);

function booking_address_row(string $street = '', string $unit = ''): void { ?>
<div class="booking-address-row">
    <label class="booking-location-label">Street address
        <input name="address" autocomplete="address-line1" value="<?=esc($street)?>" required minlength="5" maxlength="1000">
    </label>
    <label class="booking-location-label">Apt/Unit No.
        <input name="unit" autocomplete="address-line2" value="<?=esc($unit)?>" maxlength="120">
    </label>
</div>
<?php }

function booking_service_area(array $areas, ?string $selected = null): void {
    booking_dropdown('service_area', 'Service area', $areas, $selected);
}

function booking_dropdown(string $name, string $label, array $options, ?string $selected = null, ?string $placeholder = null): void { ?>
<label class="booking-location-label"><?=esc($label)?>
    <span class="booking-area-control">
        <select name="<?=esc($name)?>"<?=$placeholder === null ? ' required' : ''?>>
            <?php if ($placeholder !== null): ?><option value=""><?=esc($placeholder)?></option><?php endif; ?>
            <?php foreach ($options as $option): ?>
                <option value="<?=esc($option)?>"<?=$selected === $option ? ' selected' : ''?>><?=esc($option)?></option>
            <?php endforeach; ?>
        </select>
    </span>
</label>
<?php }
