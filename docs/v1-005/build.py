"""Rebuild deterministic SQL and the exact four-file runtime delta."""
import hashlib,importlib.util,json,re,zipfile
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[1]
def build():
 rows=json.loads((BASE/'preimages.json').read_text());parts=['begin;']
 for row in rows:
  identity=row['identity'];original=row['definition'];body=original.replace('\r\n','\n')
  statement='perform authorization_private.scheduling_lock_scope(p_business,p_environment);'
  if identity.startswith(('business_delegate_command(', 'business_delegate_command_preview_d0106(')):
   statement="if p_operation in ('business_booking_write','business_customer_booking_create','business_booking_request_action','business_staff_assign','business_staff_write','visit.execute','terminal.correct','availability.request') then "+statement+'end if;'
  body=re.sub(r'\bbegin\b','begin\n '+statement,body,count=1,flags=re.I)
  parts += ["do $guard$ begin if md5(pg_get_functiondef('"+identity+"'::regprocedure))<>'"+hashlib.md5(original.encode()).hexdigest()+"' then raise exception 'V1-005 function baseline drift: "+identity+"';end if;end $guard$;",body+';']
 (BASE/'lock-writers.sql').write_text('\n'.join(parts)+'\ncommit;\n')
 spec=importlib.util.spec_from_file_location('schedule_stage',BASE/'stage.py');stage=importlib.util.module_from_spec(spec);spec.loader.exec_module(stage)
 (BASE/'install.sql').write_text(stage.installation()+'\n')
 packet=zipfile.ZipFile(ROOT/'docs/v1-017/runtime.zip');files=[]
 for p in sorted((BASE/'runtime').rglob('*')):
  if p.is_file():
   name=str(p.relative_to(BASE/'runtime'));files.append(dict(path=name,baseline_sha256=hashlib.sha256(packet.read(name)).hexdigest()if name in packet.namelist()else None,candidate_sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
 manifest=json.loads((BASE/'release-scope.json').read_text());manifest['files']=files;manifest['sql_sha256']=hashlib.sha256((BASE/'install.sql').read_bytes()).hexdigest()
 (BASE/'release-scope.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':build()
