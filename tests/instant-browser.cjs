const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const [base, day] = process.argv.slice(2);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(8000);
    const capture = async (name) => {
      const html = await page.evaluate(() => {
        const root = document.documentElement.cloneNode(true);
        root.querySelectorAll('script:not([type="application/json"]),link,meta[http-equiv]').forEach(e=>e.remove());
        root.querySelectorAll('[name="csrf"],[name="snapshot_hash"]').forEach(e=>e.remove());
        root.querySelectorAll('[href],[action],[data-target],[src]').forEach(e=>{
          for (const attr of ['href','action','data-target','src']) if(e.hasAttribute(attr)) e.setAttribute(attr,'#');
        });
        return root.outerHTML;
      });
      const compressed=require('node:zlib').gzipSync(html);
      console.log('SCREENCAP_'+name+'='+compressed.toString('base64'));
    };
    await page.goto(base + '/b/synthetic-cleaning?booking=1');
    await capture('ENTRY');
    await page.getByText('Regular Cleaning', { exact: true }).first().click();
    await page.getByLabel('Street address', { exact: true }).fill('10 Example Street');
    await page.getByRole('group', { name: 'Bedrooms' }).getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('group', { name: 'Bathrooms' }).getByRole('button', { name: '1', exact: true }).click();
    await page.locator('select[name="service_area"]').selectOption('Gardens');
    await page.getByRole('button', { name: /See available times/ }).click();
    await capture('TIMES');
    await page.getByLabel('Date', { exact: true }).fill(day);
    await page.getByRole('button', { name: 'Show times' }).click();
    await page.getByLabel('Available start time (SAST)').selectOption('09:00');
    await page.getByLabel('Your name').fill('Mobile Fixture');
    await page.getByLabel('Email for test checkout').fill('mobile@example.test');
    await page.getByRole('button', { name: 'Reserve and review' }).click();
    await capture('REVIEW');
    assert.match(await page.locator('main').innerText(), /Total ZAR 375.00/);
    await page.getByRole('button', { name: 'Pay with test checkout' }).click();
    await page.getByRole('heading', { name: 'Booking confirmed' }).waitFor().catch(async e => { throw Error(e.message + ' · ' + await page.locator('body').innerText()); });
    await capture('CONFIRMED');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    console.log('Mobile browser confirmed a five-hour booking after verified test checkout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
