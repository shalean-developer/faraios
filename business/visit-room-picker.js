// The select is the submitted value and remains usable when JavaScript is unavailable.
for (const row of document.querySelectorAll('[data-room-picker]')) {
    const select = row.querySelector('select');
    const label = row.querySelector('label');
    const choices = Array.from(select.options, option => Number(option.value));
    if (choices.length < 2) continue;

    const min = choices[0];
    const max = choices[choices.length - 1];
    const threshold = min + 3;
    const group = document.createElement('div');
    group.className = 'room-choices';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', label.id);

    function makeButton(parent, text, action, accessibleName) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        if (accessibleName) button.setAttribute('aria-label', accessibleName);
        button.addEventListener('click', action);
        parent.append(button);
        return button;
    }

    function commit(value) {
        if (String(value) === select.value) return;
        select.value = String(value);
        select.dispatchEvent(new Event('change', {bubbles: true}));
    }

    const presets = choices.slice(0, 3).map(value => makeButton(group, String(value), () => {
        commit(value);
        render(false);
    }));
    const stepper = document.createElement('div');
    stepper.className = 'room-counter';
    const number = document.createElement('input');
    number.type = 'number';
    number.step = '1';
    number.min = String(min);
    number.max = String(max);
    number.setAttribute('aria-label', label.textContent + ' quantity');
    number.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    const decrease = makeButton(stepper, '−', () => step(-1), 'Decrease ' + label.textContent);
    stepper.append(number);
    const increase = makeButton(stepper, '+', () => step(1), 'Increase ' + label.textContent);
    function step(delta) {
        const value = Math.max(min, Math.min(max, Number(select.value) + delta));
        commit(value);
        render(value >= threshold);
        if (value < threshold) presets[value - min].focus();
    }
    let custom;
    if (max >= threshold) {
        custom = makeButton(group, threshold + '+ Custom', () => {
            commit(Math.max(Number(select.value), threshold));
            render(true);
            number.focus();
            number.select();
        });
        group.append(stepper);
    }
    function updateLimits() {
        decrease.disabled = number.valueAsNumber <= min;
        increase.disabled = number.valueAsNumber >= max;
    }
    function render(showCustom) {
        const value = Number(select.value);
        presets.forEach((button, index) => button.setAttribute('aria-pressed', String(!showCustom && value === choices[index])));
        if (custom) custom.setAttribute('aria-pressed', String(showCustom));
        stepper.hidden = !showCustom;
        number.disabled = !showCustom;
        number.required = showCustom;
        number.value = select.value;
        updateLimits();
    }
    number.addEventListener('input', () => {
        if (number.value !== '' && number.validity.valid) commit(number.valueAsNumber);
        updateLimits();
    });
    number.addEventListener('change', () => {
        if (number.validity.valid && number.valueAsNumber < threshold) {
            const value = number.valueAsNumber;
            render(false);
            presets[value - min]?.focus();
        }
    });
    select.hidden = true;
    label.removeAttribute('for');
    select.after(group);
    render(Number(select.value) >= threshold);
}
