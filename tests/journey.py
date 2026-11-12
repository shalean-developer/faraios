"""Real HTTP + SQLite + captured email tests. Only synthetic local data is used."""
import csv
import http.cookiejar
import io
import json
import os
from pathlib import Path
import re
import socket
import sqlite3
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('PHP_BIN', 'php')


class Journey(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='faraios-waitlist-')
        cls.private = Path(cls.temp.name)
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            cls.port = s.getsockname()[1]
        cls.base = f'http://127.0.0.1:{cls.port}'
        cls.env = dict(os.environ, FARAIOS_WAITLIST_DIR=str(cls.private))
        cls.config('capture')
        cls.server = subprocess.Popen([PHP, '-S', f'127.0.0.1:{cls.port}', '-t', str(ROOT)], env=cls.env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                urllib.request.urlopen(cls.base, timeout=.2)
                break
            except OSError:
                time.sleep(.05)

    @classmethod
    def config(cls, transport):
        (cls.private / 'config.php').write_text("<?php return " + "['enabled'=>true,'environment'=>'test','transport'=>'" + transport + "','base_url'=>'" + cls.base + "','secret'=>'" + 's' * 64 + "','min_seconds'=>0];")

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait()
        cls.temp.cleanup()

    def setUp(self):
        self.config('capture')
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.http('GET', '/waitlist/api.php')
        with self.db() as db:
            db.execute('DELETE FROM outbox')
            db.execute('DELETE FROM subscribers')
            db.execute('DELETE FROM rate_limits')
        (self.private / 'captured.jsonl').unlink(missing_ok=True)
        for file in self.private.glob('*.csv'): file.unlink()
        _, data, _ = self.http('GET', '/waitlist/api.php')
        self.fields = dict(name='Sample Owner', email='owner@example.test', business_type='cleaning', interests=['business-management', 'seo'], consent='yes', website='', csrf=data['csrf'])

    def db(self):
        return sqlite3.connect(self.private / 'waitlist.sqlite')

    def http(self, method, path, data=None, headers=None):
        h = {'Origin': self.base}
        if data is not None:
            data = json.dumps(data).encode()
            h['Content-Type'] = 'application/json'
        h.update(headers or {})
        request = urllib.request.Request(self.base + path, data=data, headers=h, method=method)
        try:
            response = self.client.open(request)
        except urllib.error.HTTPError as e:
            response = e
        raw = response.read().decode()
        result = json.loads(raw) if 'application/json' in response.headers.get('Content-Type', '') else raw
        return response.status, result, response.headers

    def signup(self, **overrides):
        return self.http('POST', '/waitlist/api.php', self.fields | overrides)

    def command(self, command):
        return subprocess.run([PHP, str(ROOT / 'scripts/waitlist.php'), command], env=self.env, capture_output=True, text=True, check=True).stdout

    def tokens(self):
        self.command('work')
        msg = json.loads((self.private / 'captured.jsonl').read_text().splitlines()[-1])
        return re.findall(r'#token=([a-f0-9]{64})', msg['text'])

    def action(self, action, token):
        request = urllib.request.Request(self.base + f'/waitlist/{action}.php', data=('token=' + token).encode(), method='POST', headers={'Content-Type': 'application/x-www-form-urlencoded'})
        return self.client.open(request).read().decode()

    def test_complete_journey_and_export(self):
        self.assertEqual(self.signup()[0], 200)
        confirm, withdraw = self.tokens()
        with self.db() as db:
            self.assertEqual(db.execute('SELECT status FROM subscribers').fetchone()[0], 'pending')
        # Link scanners cannot opt a person in with GET.
        self.http('GET', '/waitlist/confirm.php')
        with self.db() as db:
            self.assertEqual(db.execute('SELECT status FROM subscribers').fetchone()[0], 'pending')
        self.assertIn('You’re on the list.', self.action('confirm', confirm))
        self.assertIn('no longer active', self.action('confirm', confirm))
        self.command('export')
        rows = list(csv.reader(io.StringIO(next(self.private.glob('*.csv')).read_text())))
        self.assertEqual(rows[1][1], self.fields['email'])
        self.assertEqual(rows[1][4], 'confirmed')
        self.assertIn('2026-11-12-v1', rows[1])
        self.assertIn('unsubscribed', self.action('unsubscribe', withdraw))
        with self.db() as db:
            self.assertEqual(db.execute('SELECT status FROM subscribers').fetchone()[0], 'withdrawn')
        self.assertEqual(self.signup()[0], 200)
        with self.db() as db:
            self.assertEqual(db.execute('SELECT status FROM subscribers').fetchone()[0], 'withdrawn')

    def test_duplicate_email_casefold_preserves_details_and_one_email(self):
        first = self.signup()
        repeat = self.signup(email='  OWNER@EXAMPLE.TEST  ', name='Changed Name', interests=['hosting'])
        self.assertEqual(first[:2], repeat[:2])
        with self.db() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM subscribers').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT name FROM subscribers').fetchone()[0], 'Sample Owner')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0], 1)
        self.command('work'); self.command('work')
        self.assertEqual(len((self.private / 'captured.jsonl').read_text().splitlines()), 1)

    def test_server_validation(self):
        cases = [dict(name='x'), dict(email='no-email'), dict(email='x@example.test\r\nBcc:x@example.test'), dict(business_type='unknown'), dict(interests=[]), dict(interests=['unknown']), dict(consent='no'), dict(name=['x']), dict(interests='seo')]
        for values in cases:
            with self.db() as db: db.execute('DELETE FROM rate_limits')
            self.assertEqual(self.signup(**values)[0], 422, values)
        with self.db() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM subscribers').fetchone()[0], 0)

    def test_all_six_interests(self):
        interests = ['business-management','website-builder','website-creation','hosting','seo','marketing']
        self.assertEqual(self.signup(interests=interests)[0], 200)
        with self.db() as db:
            self.assertEqual(json.loads(db.execute('SELECT interests FROM subscribers').fetchone()[0]), interests)

    def test_csrf_origin_and_http_methods(self):
        self.assertEqual(self.signup(csrf='bad')[0], 403)
        self.assertEqual(self.http('POST', '/waitlist/api.php', self.fields, {'Origin': 'https://evil.example'})[0], 403)
        self.assertEqual(self.http('PUT', '/waitlist/api.php')[0], 405)
        self.assertEqual(self.http('POST', '/waitlist/api.php', self.fields, {'Content-Type':'text/plain'})[0], 415)

    def test_honeypot_and_rate_limit(self):
        self.assertEqual(self.signup(website='bot.example')[0], 200)
        with self.db() as db: self.assertEqual(db.execute('SELECT COUNT(*) FROM subscribers').fetchone()[0], 0)
        for i in range(4): self.signup(email=f'test{i}@example.test')
        self.assertEqual(self.signup()[0], 429)

    def test_too_fast(self):
        config = self.private / 'config.php'
        config.write_text(config.read_text().replace("'min_seconds'=>0", "'min_seconds'=>999"))
        self.assertEqual(self.signup()[0], 422)

    def test_expiry_and_withdraw_before_confirmation(self):
        self.signup()
        confirm, withdraw = self.tokens()
        with self.db() as db: db.execute('UPDATE subscribers SET confirm_expires=0')
        self.assertIn('no longer active', self.action('confirm', confirm))
        self.assertIn('unsubscribed', self.action('unsubscribe', withdraw))
        self.assertIn('no longer active', self.action('confirm', confirm))

    def test_email_failure_retry_and_payload_erasure(self):
        self.config('fail')
        self.signup()
        self.command('work')
        with self.db() as db:
            self.assertEqual(db.execute('SELECT status FROM outbox').fetchone()[0], 'retry')
            self.assertEqual(db.execute('SELECT status FROM subscribers').fetchone()[0], 'pending')
            db.execute('UPDATE outbox SET next_attempt=0')
        self.config('capture')
        self.command('work')
        with self.db() as db:
            self.assertEqual(db.execute('SELECT status,payload FROM outbox').fetchone(), ('sent', None))

    def test_interrupted_send_not_duplicated(self):
        self.config('fail')
        self.signup()
        self.config('capture')
        with self.db() as db: db.execute("UPDATE outbox SET status='sending',next_attempt=0")
        self.command('work')
        with self.db() as db: self.assertEqual(db.execute('SELECT status,payload FROM outbox').fetchone(), ('uncertain', None))
        self.assertFalse((self.private / 'captured.jsonl').exists())

    def test_retention_and_csv_formula_safety(self):
        self.signup(name='=HYPERLINK("https://example.test")')
        self.command('export')
        rows = list(csv.reader(io.StringIO(next(self.private.glob('*.csv')).read_text())))
        self.assertTrue(rows[1][0].startswith("'="))
        with self.db() as db: db.execute('UPDATE subscribers SET last_request_at=0')
        self.command('cleanup')
        with self.db() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM subscribers').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0], 0)

    def test_no_secrets_in_response_and_cookie_protection(self):
        _, body, headers = self.http('GET','/waitlist/api.php')
        self.assertEqual(set(body), {'csrf','consent_version'})
        self.assertEqual(headers['Cache-Control'], 'no-store, private')
        fresh = urllib.request.urlopen(self.base + '/waitlist/api.php')
        cookie = fresh.headers.get('Set-Cookie')
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Strict', cookie)
        self.assertIn('path=/waitlist/', cookie.lower())
        fresh.close()
        status, body, _ = self.http('GET', '/scripts/waitlist.php')
        self.assertEqual(status,404)


if __name__ == '__main__':
    unittest.main(verbosity=2)
