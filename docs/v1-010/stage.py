"""Reconstruct the pinned installed release plus scheduling and bounded V1-010 delta.
Never stage into a served directory. No hosted database connection or activation.
"""
from pathlib import Path
import importlib.util,shutil,hashlib,json
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[1]
spec=importlib.util.spec_from_file_location('communication_scheduling',ROOT/'docs/v1-005/stage.py');previous=importlib.util.module_from_spec(spec);spec.loader.exec_module(previous)
def stage(destination):
 destination=Path(destination);previous.stage(destination)
 for p in (BASE/'runtime').rglob('*'):
  if p.is_file():
   out=destination/p.relative_to(BASE/'runtime');out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
 return destination
def manifest():
 import tempfile
 with tempfile.TemporaryDirectory()as tmp:
  original=previous.stage(Path(tmp)/'baseline');items=[]
  for p in sorted((BASE/'runtime').rglob('*')):
   if not p.is_file():continue
   rel=p.relative_to(BASE/'runtime');old=original/rel
   items.append(dict(path=str(rel),previous_sha256=hashlib.sha256(old.read_bytes()).hexdigest()if old.exists()else None,candidate_sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
 return dict(task='V1-010',base='c6d943d038ccc2e08ea1e0dbae63ef76bd85f221',files=items,sql_sha256=hashlib.sha256((BASE/'install.sql').read_bytes()).hexdigest(),outbound_default=False,capture_default=False,backfill=False,hosted_installation=False)
if __name__=='__main__':
 import sys
 print(stage(sys.argv[1])if len(sys.argv)>1 else json.dumps(manifest(),indent=2))
