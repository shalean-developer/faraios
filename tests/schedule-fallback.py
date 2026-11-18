#!/usr/bin/env python3
import copy
import datetime as dt
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('fallback', Path(__file__).resolve().parents[1] / 'scripts/schedule-fallback.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = 1805558400


def run(workflow, age, status='completed', ident=1):
    return {'id': ident, 'head_branch': 'main', 'path': '.github/workflows/' + workflow,
            'created_at': dt.datetime.fromtimestamp(NOW-age, dt.timezone.utc).isoformat(),
            'status': status, 'conclusion': 'failure'}


class API:
    def __init__(self):
        self.calls = []
        self.fail = False
        self.data = {w: [run(w, interval+1)] for w, interval in m.WORKFLOWS.items()}

    def runs(self, w):
        return self.data[w]

    def dispatch(self, w):
        self.calls.append(w)
        if self.fail:
            raise TimeoutError('private token must never be logged')
        return 99


class Tests(unittest.TestCase):
    def test_boundaries_and_failed_run_cooldown(self):
        for w, interval in m.WORKFLOWS.items():
            self.assertEqual(m.decision(w, [run(w, interval-1)], NOW), 'recent')
            self.assertEqual(m.decision(w, [run(w, interval)], NOW), 'due')

    def test_all_active_statuses_prevent_overlap(self):
        for status in m.ACTIVE:
            for w in m.WORKFLOWS:
                self.assertEqual(m.decision(w, [run(w, 100000, status)], NOW), 'active')

    def test_wrong_branch_path_future_and_missing_fail_closed(self):
        w = next(iter(m.WORKFLOWS))
        for bad in [[], [run(w, -31)], [dict(run(w, 100), head_branch='other')],
                    [dict(run(w, 100), path='.github/workflows/other.yml')],
                    [dict(run(w, 100), status='unexpected')]]:
            with self.assertRaises(ValueError):
                m.decision(w, bad, NOW)

    def test_default_mode_never_posts_or_writes(self):
        api, state = API(), {}
        result = m.tick(api, state, NOW, False, lambda _: self.fail('write in dry run'))
        self.assertEqual([x['result'] for x in result], ['due']*3)
        self.assertEqual(api.calls, [])
        self.assertEqual(state, {})

    def test_write_ahead_and_accepted_not_success(self):
        api, state, receipts = API(), {}, []
        result = m.tick(api, state, NOW, True, lambda s: receipts.append(copy.deepcopy(s)))
        self.assertEqual(len(api.calls), 3)
        self.assertIsNone(receipts[0][api.calls[0]]['run_id'])
        self.assertTrue(all(x['result'] == 'dispatch_accepted' for x in result))
        self.assertTrue(all(x['run_id'] == 99 for x in state.values()))

    def test_ambiguous_post_never_blindly_retried(self):
        api, state = API(), {}
        api.fail = True
        m.tick(api, state, NOW, True, lambda _: None)
        result = m.tick(api, state, NOW+100000, True, lambda _: None)
        self.assertEqual(len(api.calls), 3)
        self.assertTrue(all(x['result'] == 'reconcile_pending' for x in result))

    def test_exact_run_required_for_reconciliation(self):
        api = API()
        state = {w: {'run_id': 99} for w in m.WORKFLOWS}
        result = m.tick(api, state, NOW, True, lambda _: None)
        self.assertTrue(all(x['result'] == 'reconcile_pending' for x in result))
        api.data = {w: [run(w, 0, ident=99)] for w in m.WORKFLOWS}
        result = m.tick(api, state, NOW, True, lambda _: None)
        self.assertEqual(state, {})
        self.assertEqual(api.calls, [])
        self.assertTrue(all(x['result'] == 'recent' for x in result))

    def test_api_failure_does_not_dispatch(self):
        api = API()
        api.data = {w: [] for w in m.WORKFLOWS}
        result = m.tick(api, {}, NOW, True, lambda _: None)
        self.assertEqual(api.calls, [])
        self.assertTrue(all(x['result'] == 'error_requires_review' for x in result))

    def test_fixed_destination_and_no_redirect(self):
        api = m.GitHub('test-only')
        with self.assertRaises(ValueError):
            api.dispatch('../other')
        with self.assertRaises(ValueError):
            m.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://example.org')
        self.assertEqual(m.BASE, 'https://api.github.com/repos/shalean-developer/faraios/')

    def test_atomic_private_state_and_symlink_refusal(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'pending.json'
            m.save(p, {'ok': 1})
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)
            self.assertIn('ok', m.private_file(p))
            link = Path(d) / 'link'
            link.symlink_to(p)
            with self.assertRaises(OSError):
                m.private_file(link)
            p.chmod(0o644)
            with self.assertRaises(ValueError):
                m.private_file(p)


if __name__ == '__main__':
    unittest.main()
