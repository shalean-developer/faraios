#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('runner', ROOT / 'scripts/schedule-runner.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = m.EXPIRY - 10 * 86400

class Tests(unittest.TestCase):
    def fixture(self, directory):
        root = Path(directory)
        root.chmod(0o700)
        shutil.copyfile(ROOT / 'scripts/schedule-fallback.py', root / 'schedule-fallback.py')
        return root, m.load_helper(root)

    def test_missing_stale_unfinished_future_and_failed(self):
        self.assertEqual(m.health(None, NOW), ['no_timer_receipt'])
        r = {'started_at':NOW-900, 'finished_at':NOW-899, 'exit_code':0}
        self.assertEqual(m.health(r,NOW), [])
        self.assertIn('missed_timer_runs',m.health(r,NOW+1))
        self.assertIn('unfinished_timer_run',m.health(dict(r,finished_at=None),NOW))
        self.assertIn('timer_execution_failed',m.health(dict(r,exit_code=1),NOW))
        self.assertIn('invalid_timer_receipt',m.health(dict(r,started_at=NOW+31),NOW))
        self.assertIn('invalid_timer_receipt',m.health(dict(r,finished_at=NOW+31),NOW))

    def test_expiry_warning_and_expiration(self):
        self.assertIn('credential_expires_within_7_days',m.health(None,m.EXPIRY-86400))
        self.assertIn('credential_expired',m.health(None,m.EXPIRY))

    def test_durable_start_exact_id_and_restart_gap(self):
        with tempfile.TemporaryDirectory() as d:
            root,h = self.fixture(d)
            def execute(*args,**kwargs):
                start=json.loads(h.private_file(root/'latest-receipt.json'))
                self.assertIsNone(start['finished_at'])
                self.assertTrue((root/('receipt-'+start['id']+'.json')).exists())
                report={'mode':'execute','results':[{'workflow':w,'result':'dispatch_accepted','run_id':i+100} for i,w in enumerate(h.WORKFLOWS)]}
                return subprocess.CompletedProcess([],0,json.dumps(report),'')
            r=m.run_timer(root,h,execute,lambda:NOW)
            self.assertEqual(r['exit_code'],0)
            self.assertEqual(r['results'][0]['run_id'],100)
            self.assertEqual((root/'latest-receipt.json').stat().st_mode & 0o777,0o600)
            later=m.run_timer(root,h,execute,lambda:NOW+1800)
            self.assertEqual(later['previous_gap_seconds'],1800)
            self.assertEqual(len(list(root.glob('receipt-*.json'))),2)

    def test_timeout_and_malformed_output_never_leak(self):
        with tempfile.TemporaryDirectory() as d:
            root,h=self.fixture(d)
            def timeout(*args,**kwargs): raise TimeoutError('SECRET')
            r=m.run_timer(root,h,timeout,lambda:NOW)
            self.assertEqual(r['exit_code'],1)
            self.assertNotIn('SECRET',json.dumps(r))
            r=m.run_timer(root,h,lambda *a,**k:subprocess.CompletedProcess([],1,'SECRET','SECRET'),lambda:NOW)
            self.assertEqual(r['error'],'execution_requires_review')
            self.assertNotIn('SECRET',json.dumps(r))

    def test_expired_token_never_executes(self):
        with tempfile.TemporaryDirectory() as d:
            root,h=self.fixture(d)
            r=m.run_timer(root,h,lambda *a,**k:self.fail('must not execute'),lambda:m.EXPIRY)
            self.assertEqual(r['exit_code'],1)

    def test_notification_dedup_and_recovery(self):
        with tempfile.TemporaryDirectory() as d:
            root,h=self.fixture(d)
            self.assertTrue(m.check_timer(root,h,NOW)[1])
            self.assertFalse(m.check_timer(root,h,NOW+300)[1])
            self.assertTrue(m.check_timer(root,h,NOW+3600)[1])
            h.save(root/'latest-receipt.json',{'started_at':NOW+3700,'finished_at':NOW+3701,'exit_code':0})
            self.assertEqual(m.check_timer(root,h,NOW+3702),([],False))
            self.assertTrue(m.check_timer(root,h,NOW+5000)[1])

    def test_helper_drift_and_receipt_symlink_refused(self):
        with tempfile.TemporaryDirectory() as d:
            root,h=self.fixture(d)
            (root/'latest-receipt.json').symlink_to(root/'schedule-fallback.py')
            with self.assertRaises(OSError):m.check_timer(root,h,NOW)
            (root/'schedule-fallback.py').write_text('drift')
            with self.assertRaises(ValueError):m.load_helper(root)

    def test_receipt_filters_extra_fields_and_rejects_unexpected(self):
        workflows={'one':1}
        raw={'mode':'execute','results':[{'workflow':'one','result':'recent','secret':'SECRET'}]}
        self.assertNotIn('SECRET',json.dumps(m.validate_report(json.dumps(raw),workflows)))
        raw['results'][0]={'workflow':'one','result':'dispatch_accepted','run_id':True}
        with self.assertRaises(ValueError):m.validate_report(json.dumps(raw),workflows)
        raw['results'][0]={'workflow':'other','result':'recent'}
        with self.assertRaises(ValueError):m.validate_report(json.dumps(raw),workflows)

if __name__=='__main__':unittest.main()
