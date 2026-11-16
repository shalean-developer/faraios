"""Generate a synthetic-only hosted preview overlay without replacing live RPCs."""
from pathlib import Path
import hashlib,importlib.util,json,sys,subprocess
ROOT=Path(__file__).resolve().parents[2]
BUSINESSES=('2f16e658-e031-4c4a-930a-2731ec1d1492','4627f805-8243-4890-bf18-a14fdf3fd21b')
ALIASES={n:n+'_preview_d0106' for n in ('business_delegate_command','business_delegate_page')}
def sql(businesses=BUSINESSES):
 source=(ROOT/'docs/sc04/defect-repairs.sql').read_text()
 # Both functions retain their original bodies and authorization after this extra guard.
 guard=" if p_environment is distinct from 'preview' or p_business is null or p_business not in ("+','.join("'"+b+"'::uuid" for b in businesses)+") then raise exception 'Preview scope denied' using errcode='42501';end if;\n"
 assert source.count('begin\n role=authorization_private.require_member')==2
 source=source.replace('begin\n role=authorization_private.require_member','begin\n'+guard+' role=authorization_private.require_member')
 for name,alias in ALIASES.items():source=source.replace('public.'+name+'(', 'public.'+alias+'(')
 source=source.replace('create or replace function','create function')
 source=source.replace('begin;','begin;\ndo $guard$ begin if md5(pg_get_functiondef(\'public.business_delegate_command(uuid,text,text,jsonb)\'::regprocedure))<>\'2c2aeb980f2b7cf6e3be2d0410551020\' then raise exception \'Hosted command drift\';end if;end $guard$;',1) if businesses==BUSINESSES else source
 # The command copy is new too: remove all default execute grants explicitly.
 acl='revoke all on function public.'+ALIASES['business_delegate_command']+'(uuid,text,text,jsonb) from public,anon,authenticated,service_role;\ngrant execute on function public.'+ALIASES['business_delegate_command']+'(uuid,text,text,jsonb) to authenticated;\n'
 return source.replace('\ncommit;', '\n'+acl+"notify pgrst, 'reload schema';\ncommit;")
def overlay(path):
 path=Path(path)
 core=path/'account/core.php';delegated=path/'account/delegated.php'
 manifest=json.loads((ROOT/'docs/defects/d01-d06-scope.json').read_text())
 for item in manifest['application_delta']:
  p=path/item['path']
  if hashlib.sha256(p.read_bytes()).hexdigest()!=item['candidate_sha256']:raise RuntimeError('Candidate source drift: '+item['path'])
 text=delegated.read_text();needle="function work_rpc(string $name,array $args): array {return api("
 adapter="function work_rpc(string $name,array $args): array {$name=['business_delegate_command'=>'business_delegate_command_preview_d0106','business_delegate_page'=>'business_delegate_page_preview_d0106'][$name]??$name;return api("
 assert text.count(needle)==1
 delegated.write_text(text.replace(needle,adapter))
 text=core.read_text();needle="if(in_array($path,['/rest/v1/rpc/business_delegate_command',"
 assert text.count(needle)==1
 core.write_text(text.replace(needle,"if(in_array($path,['/rest/v1/rpc/business_delegate_command_preview_d0106','/rest/v1/rpc/business_delegate_page_preview_d0106','/rest/v1/rpc/business_delegate_command',"))
 return {str(p.relative_to(path)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (core,delegated)}
def stage(dest):
 spec=importlib.util.spec_from_file_location('ready',ROOT/'docs/sc04/readiness.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 path=m.stage(str(dest));hashes=overlay(path)
 (path/'preview-defect-rpcs.sql').write_text(sql())
 (path/'preview-defect-manifest.json').write_text(json.dumps({'source':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'worktree_dirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True)),'files':hashes,'businesses':BUSINESSES,'aliases':ALIASES,'sql_sha256':hashlib.sha256(sql().encode()).hexdigest(),'production_install':False},indent=2)+'\n')
 return path
if __name__=='__main__':print(stage(sys.argv[1]))
