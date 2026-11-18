"""Bounded Plesk installation; no database or tracker mutation."""
from pathlib import Path
import hashlib,urllib.request,subprocess,os,json
root=Path('/var/www/vhosts/shalean.com/faraios.com/account')
backup=Path('/var/www/vhosts/shalean.com/private/faraios-account/owner-metrics-backup')
files={'platform-overview.php':('a6663d0ca39adc942f8f3e472b17121ebec21e578eb38d6a6f20c27b9e7e9665','c0fb748e009fa6bb2a10a57655ef0c730770579233456f2f7c2a8c14f4fb0566'),'platform-overview-page.php':('9c0718d66b55e4b87a95b2eed1fa0c78c963a88030c7ebc734f65cc1acff36b8','412b04da68e40659ff2b8277ed89ad3e3edea3c440ad0db8b95d66969d3fae47')}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for n,(old,new) in files.items():
 p=root/n;assert not p.is_symlink();assert (not p.exists()) if old is None else sha(p)==old,'Live source drift'
backup.mkdir(mode=0o700,exist_ok=False)
for n,(old,new) in files.items():
 b=urllib.request.urlopen('https://raw.githubusercontent.com/shalean-developer/faraios/f38405cb8ed838e4d50aede9f309e68ca73fa9e4/account/'+n,timeout=20).read();assert hashlib.sha256(b).hexdigest()==new
 if old:
  (backup/(n+'.before')).write_bytes((root/n).read_bytes());os.chmod(backup/(n+'.before'),0o600);assert sha(backup/(n+'.before'))==old
 (backup/n).write_bytes(b);subprocess.run(['/opt/plesk/php/8.4/bin/php','-l',str(backup/n)],check=True)
subprocess.run(['/opt/plesk/php/8.4/bin/php','-l',str(backup/'platform-overview.php.before')],check=True)
done=[]
try:
 for n,(old,new) in files.items():
  p=root/n;assert (not p.exists()) if old is None else sha(p)==old
  tmp=root/(n+'.owner-metrics-tmp');assert not tmp.exists();tmp.write_bytes((backup/n).read_bytes());os.chmod(tmp,0o644);os.replace(tmp,p);done.append(n)
 assert all(sha(root/n)==v[1] for n,v in files.items())
except Exception:
 for n in reversed(done):
  old,new=files[n];assert sha(root/n)==new,'Rollback drift; inspect'
  if old:(root/n).write_bytes((backup/(n+'.before')).read_bytes())
  else:os.replace(root/n,backup/(n+'.rolled-back'))
 raise
print('OWNER_METRICS_INSTALLED_AND_ROLLBACK_ORIGINAL_VERIFIED',json.dumps(list(files)))
