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

// Enhance optional tasks while preserving the same select for pricing and submission.
const taskPaths = new Map([
    ['inside fridge', 'M6 3h12v18H6z M6 10h12 M9 6v2 M9 12v3'],
    ['inside oven', 'M3 4h18v16H3z M3 9h18 M7 12h10v5H7z M6 6.5h1 M10 6.5h1'],
    ['inside cabinets', 'M3 4h18v16H3z M12 4v16 M9 10v3 M15 10v3'],
    ['interior windows', 'M4 3h16v18H4z M12 3v18 M4 12h16 M2 21h20'],
    ['interior walls', 'M2 4h20v16H2z M2 9h20 M2 15h20 M9 4v5 M16 9v6 M7 15v5'],
    ['laundry', 'M4 2h16v20H4z M4 7h16 M7 4.5h2 M17 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M8 14q2-2 4 0t4 0'],
    ['ironing', 'M3 17q3-8 10-8h5l3 8v2H3z M9 9V6h6q2 0 3 3 M4 16h16']
]);
for (const row of document.querySelectorAll('[data-extra-toggle]')) {
    const select = row.querySelector('select');
    const label = row.querySelector('label');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'task-button';
    button.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    const circle = document.createElement('span');
    circle.className = 'task-circle';
    circle.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', taskPaths.get(label.textContent.trim().toLowerCase()) || 'M12 3l2 6 6 3-6 2-2 7-2-7-6-2 6-3z');
    svg.append(path);
    circle.append(svg);
    button.append(circle, document.createTextNode(label.textContent));
    const sync = () => button.setAttribute('aria-pressed', String(select.value === '1'));
    button.addEventListener('click', () => {
        select.value = select.value === '1' ? '0' : '1';
        select.dispatchEvent(new Event('change', {bubbles: true}));
    });
    select.addEventListener('change', sync);
    window.addEventListener('pageshow', sync);
    sync();
    select.hidden = label.hidden = true;
    row.append(button);
    row.classList.add('task-tile');
    row.closest('fieldset').classList.add('task-grid');
}
