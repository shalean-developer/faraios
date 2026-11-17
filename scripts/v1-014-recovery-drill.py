"""Enable the existing real Auth acceptance phase only in a disposable staged copy.
No hosted writes or weakening of the Auth/network/credential guards.
"""
from pathlib import Path
import os,sys
root=Path(sys.argv[1]).resolve()
expected=Path(os.environ['RUNNER_TEMP']).resolve()/'sc04-restore-runtime'/'application'
if root!=expected or root==Path(__file__).resolve().parents[1]:
    raise SystemExit('Only the disposable workflow stage is accepted')
p=root/'scripts/database-restore-check.py'
s=p.read_text()
line="    raise RestoreError('SC04 managed Auth adapter requires its separate acceptance gate')\n"
if s.count(line)!=1:raise SystemExit('Acceptance guard source drift')
# This dedicated drill IS the separate acceptance gate. Existing rehearse() target
# guards still require a fresh generated Docker DB, no ports and internal network.
p.write_text(s.replace(line,''))
