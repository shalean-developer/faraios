"""Build and test a disposable pinned role-audit snapshot; never deploy or move refs."""
from pathlib import Path
import subprocess,sys,json,shutil
ROOT=Path(__file__).resolve().parents[2]
REPAIR='9fd4c0a6ec5192d570ef4efa4036459efb205cd8';MAIN='4cea37e553edd3d6b1faae277a3286f7134c3801'
if len(sys.argv)!=2:raise SystemExit('Pass a new absolute disposable destination directory')
dest=Path(sys.argv[1]).resolve()
if dest.exists():raise SystemExit('Destination must not exist')
source=subprocess.check_output(['git','show',REPAIR+':docs/defects/compatibility.py'],cwd=ROOT,text=True)
ns={'__file__':str(ROOT/'docs/defects/compatibility.py'),'__name__':'v1008_compat'};exec(compile(source,ns['__file__'],'exec'),ns);ns['ROOT']=ROOT
receipt=ns['build'](dest,MAIN,REPAIR)
shutil.copyfile(ROOT/'docs/v1-008/native-live-roles.py',dest/'tests/v1-008-live-roles.py')
results=[]
for suite in ['sc04-readiness','workflow-repairs','v1-008-live-roles']:
 p=subprocess.run([sys.executable,str(dest/'tests'/f'{suite}.py')],cwd=dest,capture_output=True,text=True)
 (dest/f'{suite}.log').write_text(p.stdout+p.stderr);results.append(dict(suite=suite,passed=p.returncode==0));print(suite,p.returncode)
 if p.returncode:print((p.stdout+p.stderr)[-2500:])
(dest/'v1008-source.json').write_text(json.dumps(receipt,indent=2)+'\n');(dest/'v1008-summary.json').write_text(json.dumps(results,indent=2)+'\n')
raise SystemExit(not all(r['passed'] for r in results))
