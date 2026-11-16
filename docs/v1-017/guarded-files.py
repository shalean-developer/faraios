"""Isolated file rehearsal only; refuses served/live paths and symlinks."""
import hashlib,os
from pathlib import Path
def apply(root,plan):
 root=Path(root).resolve()
 if '/var/www/'in str(root) or root.is_symlink():raise ValueError('Isolated rehearsal only')
 # Validate the entire set before any replacement, including later-file drift.
 for name,row in plan.items():
  p=root/name
  if '..'in Path(name).parts or Path(name).is_absolute()or p.is_symlink():raise ValueError('Unsafe path')
  if hashlib.sha256(p.read_bytes()).hexdigest()!=row['expected']:raise ValueError('File drift: '+name)
 for name,row in plan.items():
  p=root/name;temp=p.with_name(p.name+'.v1017-new')
  if temp.exists():raise ValueError('Stale temporary file')
  temp.write_bytes(row['replacement']);os.replace(temp,p)
