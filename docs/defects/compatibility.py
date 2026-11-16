"""Build a disposable review snapshot; never merge or move a repository ref."""
from pathlib import Path
import io,json,re,subprocess,sys,tarfile,hashlib
ROOT=Path(__file__).resolve().parents[2]
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def build(destination,main,repair):
 for sha in [main,repair]:
  if not re.fullmatch('[a-f0-9]{40}',sha):raise ValueError('Pinned source SHA required')
 git('cat-file','-e',main+'^{commit}');git('cat-file','-e',repair+'^{commit}')
 dest=Path(destination);dest.mkdir(exist_ok=False)
 with tarfile.open(fileobj=io.BytesIO(git('archive',repair)))as archive:archive.extractall(dest,filter='data')
 changed=git('diff','--name-only','c75377d2e2adfdf6c173c0ad750687d80e6138b7',main).decode().splitlines()
 reconciled=['tests/sc02-baseline.py','tests/ui-only.py','docs/ui-consistency/source-delta.json']
 retained=[]
 for name in changed:
  if name in reconciled:continue
  if name.startswith('account/') or name.startswith('docs/sc04/') or name.startswith('supabase/') or name.endswith('.sql'):raise ValueError('Concurrent runtime/security overlap requires review: '+name)
  path=dest/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(git('show',main+':'+name));retained.append(name)
 # Keep both main's public-header preservation list and repair's onboarding assertions.
 path=dest/'tests/sc02-baseline.py';source=path.read_text();main_source=git('show',main+':tests/sc02-baseline.py').decode();pattern=r'self\.assertEqual\(set\(ui\),\{[^\n]+\}\)';match=re.search(pattern,main_source);assert match
 source,count=re.subn(pattern,lambda _:match[0],source);assert count==1;path.write_text(source)
 # These independently changed lines cover header class matching and staff logic preservation.
 path=dest/'tests/ui-only.py';source=path.read_text();old='self.assertEqual(s.count(\'class="site-header"\'),1,p.name)';new='self.assertEqual(len(re.findall(r\'<header\\b[^>]*class="[^\\"]*\\bsite-header\\b[^\\"]*"\',s)),1,p.name)';assert old in source;path.write_text(source.replace(old,new))
 path=dest/'docs/ui-consistency/source-delta.json';delta=json.loads(path.read_text());main_delta=json.loads(git('show',main+':docs/ui-consistency/source-delta.json'))
 for name in changed:
  if name in main_delta:delta[name]=main_delta[name]
 path.write_text(json.dumps(delta,indent=2)+'\n')
 receipt={'repair':repair,'main':main,'method':'disposable source snapshot; no merge or ref update','main_files_retained':{p:hashlib.sha256((dest/p).read_bytes()).hexdigest()for p in retained},'fixture_files_reconciled':{p:hashlib.sha256((dest/p).read_bytes()).hexdigest()for p in reconciled}}
 return receipt
if __name__=='__main__':print(json.dumps(build(*sys.argv[1:]),indent=2))
