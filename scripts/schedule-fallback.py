#!/usr/bin/env python3
"""External timer fallback. Read-only unless --execute is explicitly supplied."""
import argparse
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import stat
import sys
import time
import urllib.request

BASE = 'https://api.github.com/repos/shalean-developer/faraios/'
WORKFLOWS = {
    'operations-watchdog.yml': 15 * 60,
    'database-backup.yml': 6 * 60 * 60,
    'database-backup-health.yml': 60 * 60,
}
ACTIVE = {'queued', 'in_progress', 'waiting', 'pending', 'requested'}


def timestamp(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamp lacks timezone')
    return parsed.timestamp()


def decision(workflow, runs, now):
    """Never dispatch on missing, malformed or future-dated evidence."""
    if workflow not in WORKFLOWS or not runs:
        raise ValueError('Missing workflow evidence')
    validated = []
    for run in runs:
        if (run.get('head_branch') != 'main'
                or run.get('path') != '.github/workflows/' + workflow
                or not isinstance(run.get('id'), int)):
            raise ValueError('Unexpected workflow evidence')
        created = timestamp(run['created_at'])
        if created > now + 30:
            raise ValueError('Future run timestamp')
        status = run.get('status')
        if status not in ACTIVE | {'completed'}:
            raise ValueError('Unknown run status')
        validated.append((created, status))
    if any(status in ACTIVE for _, status in validated):
        return 'active'
    # A failed attempt still receives the normal cooldown; failures remain visible.
    return 'due' if now - max(t for t, _ in validated) >= WORKFLOWS[workflow] else 'recent'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Redirect refused')


class GitHub:
    def __init__(self, token=None):
        self.token = token
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, suffix, body=None):
        headers = {'Accept': 'application/vnd.github+json',
                   'X-GitHub-Api-Version': '2026-03-10',
                   'User-Agent': 'FaraiOS-MON01-fallback'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        data = None if body is None else json.dumps(body).encode()
        if data is not None:
            headers['Content-Type'] = 'application/json'
        with self.opener.open(urllib.request.Request(BASE + suffix, data=data, headers=headers), timeout=15) as response:
            payload = response.read(2 * 1024 * 1024 + 1)
            if len(payload) > 2 * 1024 * 1024:
                raise ValueError('Oversized response')
            return json.loads(payload) if payload else {}

    def runs(self, workflow):
        if workflow not in WORKFLOWS:
            raise ValueError('Workflow not allowed')
        return self.request('actions/workflows/' + workflow + '/runs?branch=main&per_page=100')['workflow_runs']

    def dispatch(self, workflow):
        if workflow not in WORKFLOWS or not self.token:
            raise ValueError('Dispatch not allowed')
        result = self.request('actions/workflows/' + workflow + '/dispatches', {'ref': 'main'})
        run_id = result.get('workflow_run_id')
        if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id < 1:
            raise ValueError('Dispatch outcome requires reconciliation')
        return run_id


def save(path, state):
    temporary = path.with_suffix('.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as handle:
        json.dump(state, handle)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)
    directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def tick(api, state, now, execute, persist):
    results = []
    for workflow in WORKFLOWS:
        try:
            runs = api.runs(workflow)
            action = decision(workflow, runs, now)
            pending = state.get(workflow)
            if pending:
                # Only the exact returned run ID can resolve an accepted request.
                if not pending.get('run_id') or not any(r['id'] == pending['run_id'] for r in runs):
                    results.append({'workflow': workflow, 'result': 'reconcile_pending'})
                    continue
                if execute:
                    del state[workflow]
                    persist(state)
            if action == 'due' and execute:
                # Write BEFORE POST. Timeout/crash must not cause blind duplicate POSTs.
                state[workflow] = {'attempted_at': now, 'run_id': None}
                persist(state)
                run_id = api.dispatch(workflow)
                state[workflow]['run_id'] = run_id
                persist(state)
                results.append({'workflow': workflow, 'result': 'dispatch_accepted', 'run_id': run_id})
            else:
                results.append({'workflow': workflow, 'result': action})
        except Exception:
            # Never emit response bodies, credential values, or exception URLs.
            results.append({'workflow': workflow, 'result': 'error_requires_review'})
    return results


def private_file(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd) as handle:
        mode = os.fstat(handle.fileno())
        if not stat.S_ISREG(mode.st_mode) or mode.st_uid != os.getuid() or mode.st_mode & 0o077:
            raise ValueError('Private file ownership or mode invalid')
        return handle.read(1024 * 1024)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--private-dir', type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    state, token, lock, path = {}, None, None, None
    if args.execute:
        if args.private_dir is None:
            parser.error('--execute requires --private-dir')
        directory = args.private_dir.lstat()
        if (not stat.S_ISDIR(directory.st_mode) or directory.st_uid != os.getuid()
                or directory.st_mode & 0o077):
            raise ValueError('Use an owned private 0700 directory')
        token = private_file(args.private_dir / 'github-token').strip()
        if not token or '\n' in token or '\r' in token:
            raise ValueError('Invalid token file')
        lock = os.open(args.private_dir / 'scheduler.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        path = args.private_dir / 'pending.json'
        if path.exists():
            state = json.loads(private_file(path))
            if not isinstance(state, dict) or set(state) - set(WORKFLOWS):
                raise ValueError('Invalid state')
    now = time.time()
    results = tick(GitHub(token), state, now, args.execute, lambda value: save(path, value))
    print(json.dumps({'observed_at': dt.datetime.fromtimestamp(now, dt.timezone.utc).isoformat(),
                      'mode': 'execute' if args.execute else 'read_only', 'results': results}))
    if lock is not None:
        os.close(lock)
    return int(any(r['result'] in {'error_requires_review', 'reconcile_pending'} for r in results))


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        print('Scheduler refused execution; review private configuration/state.', file=sys.stderr)
        sys.exit(1)
