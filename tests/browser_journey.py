"""Optional browser checks on a host supporting Chromium. Uses the disposable PG/PHP fixture."""
import os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
from journey import Journey
out=Path(os.environ.get('SCREENSHOT_DIR','/tmp/faraios-preview'));out.mkdir(parents=True,exist_ok=True)
Journey.setUpClass()
try:
 fixture=Journey('test_complete_journey_owner_alert_and_export');fixture.setUp();base=fixture.base
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base)
  assert page.locator('[data-waitlist]').count()==3
  for index in range(3):
   page.locator('[data-waitlist]').nth(index).click();page.wait_for_url(base+'/waitlist.html');page.wait_for_function("!document.querySelector('.wl-submit').disabled");assert page.locator('.wl-form').is_visible();page.go_back()
  for width in [320,360,390,768,1440]:
   page.set_viewport_size({'width':width,'height':844 if width<768 else 1000});page.goto(base+'/waitlist.html');page.wait_for_function("!document.querySelector('.wl-submit').disabled")
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   assert page.locator('#waitlist').evaluate('(d)=>getComputedStyle(d).overflowY==="visible"'),width
   page.screenshot(path=str(out/f'waitlist-{width}.png'),full_page=True)
  page.get_by_label('Your name',exact=True).fill('Preview Owner');page.get_by_label('Email address',exact=True).fill('preview@example.test');page.get_by_label('Business type',exact=True).select_option('cleaning');page.get_by_label('Business management',exact=True).check();page.get_by_label('SEO',exact=True).check();page.locator('[name=consent]').check();page.locator('.wl-submit').click();page.locator('.wl-success').wait_for(state='visible')
  assert page.locator('.wl-success h3').evaluate('(h)=>h===document.activeElement')
  links=re.findall(r'http[^\s]+#token=[a-f0-9]{64}',fixture.capture()[0]['text']);page.goto(links[0]);assert '#token' not in page.url;page.get_by_role('button',name='Confirm my place',exact=True).click();page.get_by_role('heading',name='You’re on the list.',exact=True).wait_for();page.goto(links[1]);page.get_by_role('button',name='Unsubscribe',exact=True).click();page.get_by_role('heading',name='You’re unsubscribed.',exact=True).wait_for();assert not errors,errors;browser.close()
 print('PASS: all three CTA links; five viewport sizes; no overflow; form/confirmation/unsubscribe; no browser errors.')
finally:Journey.tearDownClass()
