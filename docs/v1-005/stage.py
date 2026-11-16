"""Stage a new, non-served exact installed runtime plus bounded scheduling delta."""
import importlib.util,hashlib,json,shutil
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[1]
spec=importlib.util.spec_from_file_location('v1017_base',ROOT/'docs/v1-017/reconstruct.py');release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
def stage(destination):
 destination=Path(destination);release.runtime(destination)
 for p in (BASE/'runtime').rglob('*'):
  if p.is_file():
   out=destination/p.relative_to(BASE/'runtime');out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
 return destination
def installation():
 # One transaction: function baseline drift rolls back new schema and triggers.
 parts=[]
 for name in ['scheduling.sql','lock-writers.sql']:
  parts += [line for line in (BASE/name).read_text().splitlines()if line.strip().lower()not in ('begin;','commit;')]
 return "begin;\nset local lock_timeout='5s';set local statement_timeout='60s';\n"+'\n'.join(parts)+'\ncommit;'
def install_database(sql):
 return sql(installation())
def rollback_ready(sql):
 # Keep the additive data, audit and guards permanently. Old UI must not replace
 # the scheduling UI while any business still relies on strict operation.
 sql("do $guard$ begin if exists(select 1 from authorization_private.scheduling_policies where enabled) then raise exception 'Strict scheduling is enabled; retain compatible UI and use forward repair';end if;end $guard$;")
if __name__=='__main__':
 import sys
 print(stage(sys.argv[1]))
