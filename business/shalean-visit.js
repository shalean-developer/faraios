'use strict';

window.shaleanVisit = (() => {
  const one = (selector, root = document) => root.querySelector(selector);
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function prepare(form) {
    const details = one('.booking-details-content', form);
    const contacts = one('.contact-entry', form);
    contacts.querySelector('h2').remove();
    one('label[for="email"]', contacts).textContent = 'Contact email';
    one('label[for="phone"]', contacts).textContent = 'Phone number (optional)';
    details.append(...contacts.children);
    one('fieldset[data-step="3"]', form).remove();
    one('fieldset[data-step="4"]', form).dataset.step = '3';
    one('[aria-label="Edit reviewed contact"]', form).dataset.summaryEdit = '1';

    const coverage = one('.coverage-note', form);
    if (coverage) {
      const helper = coverage.nextElementSibling;
      one('#booking-options', form).before(coverage);
      if (helper?.tagName === 'SMALL') helper.hidden = true;
    }
    one('.schedule-entry h2', form).textContent = 'Choose a time';
    one('.review-entry h2', form).textContent = 'Review your visit';
    one('.review-section [data-review="service"]', form).removeAttribute('data-review');
    one('.review-section p', form).textContent = 'One-time';
    one('[data-review="options"]', form).remove();

    const aside = one('.request-summary');
    aside.setAttribute('aria-label', 'Your booking');
    const shell = one('.summary-shell', aside);
    const heading = one('summary', shell);
    heading.firstChild.textContent = 'Your booking ';
    const summary = element('div', '', 'visit-quote');
    summary.id = 'visit-quote';
    heading.after(summary);
    const nav = one('.booking-progress');
    nav.setAttribute('aria-label', 'Booking steps');
    const list = one('ol', nav);
    list.replaceChildren();
    for (const [index, label] of ['Details','Schedule','Review','Payment'].entries()) {
      const li = element('li');
      li.append(element('b', String(index + 1)), element('span', label));
      list.append(li);
    }
    const identity = one('.booking-identity');
    if (identity) {
      const help = element('details', '', 'visit-help');
      help.append(element('summary', 'Booking help'));
      const panel = element('div');
      panel.append(element('p', 'Choose your service and preferred time. Shalean reviews your request before payment.'));
      panel.append(...identity.children);
      help.append(panel);
      identity.append(help);
    }
    const restored = !!one('#booking .notice[role="status"]');
    if (restored && !one('#booking [role="alert"]')) {
      // The server has accepted the request. No slot or charge exists at this point.
      form.closest('.request-layout').hidden = true;
      const receipt = one('#booking .notice[role="status"]');
      receipt.before(element('h1','Awaiting visit confirmation'));
    }
  }

  function step(index, completed) {
    const active = completed ? 4 : index;
    const nav = one('.booking-progress');
    nav.hidden = active === 0;
    [...nav.querySelectorAll('li')].forEach((item, i) => {
      item.classList.toggle('complete', i + 1 < active);
      if (i + 1 === active) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    one('#booking-continue').textContent = index === 1 ? 'Choose a time' : 'Review this visit';
    document.body.classList.toggle('visit-entry', !completed && index === 0);
  }

  function quote(service, calculated, fields) {
    const target = one('#visit-quote');
    if (!target || !service) return;
    const lines = element('dl', '', 'visit-lines');
    const totals = element('dl', '', 'visit-lines visit-totals');
    const row = (list, label, value) => {
      const line = element('div');
      line.append(element('dt',label),element('dd',value));
      list.append(line);
    };
    for (const line of calculated.breakdown.split('\n')) {
      const split = line.lastIndexOf(': ');
      if (split >= 0) row(lines, line.slice(0,split),line.slice(split + 2));
    }
    row(totals, service.mode === 'from' ? 'Estimated total from' : 'Total', calculated.price);
    row(totals, 'Duration', calculated.duration);
    const area = fields.service_area?.value;
    target.replaceChildren(element('strong', service.name),element('p',area ? 'One-time visit / ' + area : 'One-time visit'),lines,totals);
    const review = one('#review-access');
    if (review) review.textContent = [fields.pets?.value,fields.equipment?.value && 'Equipment: ' + fields.equipment.value].filter(Boolean).join(' · ');
  }
  return { prepare, step, quote };
})();
