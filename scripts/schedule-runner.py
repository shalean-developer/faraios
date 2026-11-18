#!/usr/bin/env python3
"""Private Plesk timer receipts and independent-task freshness checks."""
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
import fcntl

HELPER_SHA = '8af66a3aaaceea271a2357baa6d0363ae9536ec3dcd370bc641cd7123945e2fd'
MAX_GAP = 900
EXPIRY = dt.datetime(2026, 12, 18, tzinfo=dt.timezone.utc).timestamp()


def load_helper(root):
    path = root / 'schedule-fallback.py'
    if hashlib.sha256(path.read_bytes()).hexdigest() != HELPER_SHA:
        raise ValueError('Helper drift')
    spec = importlib.util.spec_from_file_location('fallback', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_report(raw, workflows):
    report = json.loads(raw)
    rows = report['results']
    if report['mode'] != 'execute' or len(rows) != len(workflows):
        raise ValueError('Unexpected receipt')
    if {r['workflow'] for r in rows} != set(workflows):
        raise ValueError('Unexpected workflows')
    clean = []
    for row in rows:
        if row['result'] not in {'recent', 'active', 'dispatch_accepted', 'reconcile_pending', 'error_requires_review'}:
            raise ValueError('Unexpected result')
        item = {'workflow': row['workflow'], 'result': row['result']}
        if row['result'] == 'dispatch_accepted':
            ident = row.get('run_id')
            if type(ident) is not int or ident < 1:
                raise ValueError('Missing exact run ID')
            item['run_id'] = ident
        clean.append(item)
    return clean


def health(receipt, now, expiry=EXPIRY):
    issues = []
    if expiry - now <= 7 * 86400:
        issues.append('credential_expired' if now >= expiry else 'credential_expires_within_7_days')
    if not receipt:
        return issues + ['no_timer_receipt']
    started = receipt.get('started_at')
    finished = receipt.get('finished_at')
    if type(started) not in (int, float) or started > now + 30:
        return issues + ['invalid_timer_receipt']
    if now - started > MAX_GAP:
        issues.append('missed_timer_runs')
    if finished is None:
        if now - started > 180:
            issues.append('unfinished_timer_run')
    elif type(finished) not in (int, float) or finished < started or finished > now + 30:
        issues.append('invalid_timer_receipt')
    elif receipt.get('exit_code') != 0:
        issues.append('timer_execution_failed')
    return issues


def run_timer(root, helper, execute=subprocess.run, clock=time.time):
    lock = os.open(root / 'receipt.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        now = clock()
        previous = json.loads(helper.private_file(root / 'latest-receipt.json')) if (root / 'latest-receipt.json').exists() else None
        receipt = {'schema': 'faraios.timer.v1', 'id': uuid.uuid4().hex, 'started_at': now,
                   'finished_at': None, 'exit_code': None,
                   'previous_gap_seconds': now - previous['started_at'] if previous else None,
                   'results': []}
        # Start record must reach durable storage before any workflow dispatch.
        record = root / ('receipt-' + receipt['id'] + '.json')
        helper.save(record, receipt)
        helper.save(root / 'latest-receipt.json', receipt)
        try:
            if now >= EXPIRY:
                raise ValueError('Credential expired')
            result = execute([sys.executable, str(root / 'schedule-fallback.py'), '--execute', '--private-dir', str(root)],
                             capture_output=True, text=True, timeout=120, check=False)
            receipt['results'] = validate_report(result.stdout, helper.WORKFLOWS)
            receipt['exit_code'] = int(result.returncode != 0 or any(r['result'] in {'reconcile_pending', 'error_requires_review'} for r in receipt['results']))
        except Exception:
            receipt['exit_code'] = 1
            receipt['error'] = 'execution_requires_review'
        receipt['finished_at'] = clock()
        helper.save(record, receipt)
        helper.save(root / 'latest-receipt.json', receipt)
        return receipt
    finally:
        os.close(lock)


def check_timer(root, helper, now):
    receipt = json.loads(helper.private_file(root / 'latest-receipt.json')) if (root / 'latest-receipt.json').exists() else None
    issues = health(receipt, now)
    state_path = root / 'supervision.json'
    prior = json.loads(helper.private_file(state_path)) if state_path.exists() else {}
    notify = bool(issues) and (issues != prior.get('issues') or now - prior.get('notified_at', 0) >= 3600)
    helper.save(state_path, {'checked_at': now, 'issues': issues,
                            'notified_at': now if notify else prior.get('notified_at', 0)})
    return issues, notify


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--private-dir', required=True, type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    root = args.private_dir
    mode = root.lstat()
    import stat
    if not stat.S_ISDIR(mode.st_mode) or mode.st_uid != os.getuid() or mode.st_mode & 0o077:
        raise ValueError('Private directory required')
    helper = load_helper(root)
    if args.check:
        issues, notify = check_timer(root, helper, time.time())
        print(json.dumps({'mode': 'supervision', 'issues': issues, 'notification_due': notify}))
        if notify:
            print('FaraiOS MON-01 scheduler needs review: ' + ', '.join(issues) + '. Review private receipts and the owner task.', file=sys.stderr)
        return int(notify)
    receipt = run_timer(root, helper)
    print(json.dumps(receipt))
    return receipt['exit_code']


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        print('FaraiOS MON-01 scheduler receipt/check unavailable; review private configuration. Details suppressed.', file=sys.stderr)
        sys.exit(1)
