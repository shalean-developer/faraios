"""Local Chromium UI checks against the real PHP endpoint, with private email capture."""
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
php = os.environ.get('PHP_BIN', 'php')
out = Path(os.environ.get('SCREENSHOT_DIR', '/tmp/faraios-preview'))
out.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='faraios-ui-') as temp:
    private = Path(temp)
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    (private / 'config.php').write_text("<?php return ['enabled'=>true,'environment'=>'test','transport'=>'capture','base_url'=>'" + base + "','secret'=>'" + 'u'*64 + "','min_seconds'=>0];")
    env = dict(os.environ, FARAIOS_WAITLIST_DIR=temp)
    server = subprocess.Popen([php,'-S',f'127.0.0.1:{port}','-t',str(root)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            page = browser.new_page(viewport={'width':1440,'height':1000})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base)
            assert page.locator('[data-waitlist]').count()==3
            for button in page.locator('[data-waitlist]').all():
                button.click()
                page.wait_for_url(base+'/waitlist.html')
                page.locator('#waitlist .wl-submit').wait_for(state='visible')
                page.wait_for_function("!document.querySelector('#waitlist .wl-submit').disabled")
                assert page.locator('.wl-form').is_visible()
                page.go_back()
            page.screenshot(path=str(out/'homepage-desktop.png'),full_page=True)
            for width in [320,360,390,768,1440]:
                page.set_viewport_size({'width':width,'height':844 if width<768 else 1000})
                page.goto(base)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                page.locator('[data-waitlist]').first.click()
                page.wait_for_function("!document.querySelector('#waitlist .wl-submit').disabled")
                assert page.locator('#waitlist').evaluate('(d)=>d.scrollWidth<=d.clientWidth'),width
                assert page.locator('#waitlist').evaluate('(d)=>getComputedStyle(d).overflowY==="visible"'),width
                page.screenshot(path=str(out/f'waitlist-{width}.png'))
                page.go_back()
            page.set_viewport_size({'width':390,'height':844})
            page.goto(base+'/waitlist.html')
            page.wait_for_function("!document.querySelector('#waitlist .wl-submit').disabled")
            page.get_by_label('Your name',exact=True).fill('Preview Owner')
            page.get_by_label('Email address',exact=True).fill('preview@example.test')
            page.get_by_label('Business type',exact=True).select_option('cleaning')
            page.get_by_label('Business management',exact=True).check()
            page.get_by_label('SEO',exact=True).check()
            page.locator('[name=consent]').check()
            page.locator('#waitlist .wl-submit').click()
            page.locator('.wl-success').wait_for(state='visible')
            assert page.locator('.wl-success h3').evaluate('(h)=>h===document.activeElement')
            page.screenshot(path=str(out/'waitlist-success-mobile.png'))
            message = json.loads((private/'captured.jsonl').read_text().splitlines()[0])
            links = re.findall(r'http[^\s]+#token=[a-f0-9]{64}',message['text'])
            page.goto(links[0])
            assert '#token' not in page.url
            page.get_by_role('button',name='Confirm my place',exact=True).click()
            page.get_by_role('heading',name='You’re on the list.',exact=True).wait_for()
            page.screenshot(path=str(out/'waitlist-confirmed-mobile.png'))
            page.goto(links[1])
            page.get_by_role('button',name='Unsubscribe',exact=True).click()
            page.get_by_role('heading',name='You’re unsubscribed.',exact=True).wait_for()
            assert not errors,errors
            browser.close()
        print('PASS: 3 CTA buttons, page navigation, 5 viewport sizes, no overflow, real form save → captured email → confirm → unsubscribe; no browser errors.')
    finally:
        server.terminate();server.wait()
