"""Bounded Plesk installation; no database or tracker mutation."""
from pathlib import Path
import hashlib,urllib.request,subprocess,os,json
root=Path('/var/www/vhosts/shalean.com/faraios.com/account')
backup=Path('/var/www/vhosts/shalean.com/private/faraios-account/owner10-support-backup')
files={'platform-support.php':(None,'8b66ba758a19bb52631548376848a07b322a637877a5c3287e9ddbf32a878069'),'platform-support-page.php':(None,'87d40b0c7237ee5fbea341dd98e6370cad0d92ee8d3cbcc6e2c91d407eee1796'),'platform-navigation.php':('af232010b34b89d2807fef5bd24c11f7b30acd730ecc022ab16c102dcc50f543','8bad579100f60e211cf798b0b66f0695e45d037d93e217b208a95e98be59b8b2')}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for n,(old,new) in files.items():
 p=root/n;assert not p.is_symlink();assert (not p.exists()) if old is None else sha(p)==old,'Live source drift'
backup.mkdir(mode=0o700,exist_ok=False)
for n,(old,new) in files.items():
 b=urllib.request.urlopen('https://raw.githubusercontent.com/shalean-developer/faraios/3fd086c61d5cb29abc2bddb420ff4b3864dd7965/account/'+n,timeout=20).read();assert hashlib.sha256(b).hexdigest()==new
 if old:
  (backup/(n+'.before')).write_bytes((root/n).read_bytes());os.chmod(backup/(n+'.before'),0o600);assert sha(backup/(n+'.before'))==old
 (backup/n).write_bytes(b);subprocess.run(['/opt/plesk/php/8.4/bin/php','-l',str(backup/n)],check=True)
subprocess.run(['/opt/plesk/php/8.4/bin/php','-l',str(backup/'platform-navigation.php.before')],check=True)
done=[]
try:
 for n,(old,new) in files.items():
  p=root/n;assert (not p.exists()) if old is None else sha(p)==old
  tmp=root/(n+'.owner10-tmp');assert not tmp.exists();tmp.write_bytes((backup/n).read_bytes());os.chmod(tmp,0o644);os.replace(tmp,p);done.append(n)
 assert all(sha(root/n)==v[1] for n,v in files.items())
except Exception:
 for n in reversed(done):
  old,new=files[n];assert sha(root/n)==new,'Rollback drift; inspect'
  if old:(root/n).write_bytes((backup/(n+'.before')).read_bytes())
  else:os.replace(root/n,backup/(n+'.rolled-back'))
 raise
print('OWNER10_INSTALLED_AND_ROLLBACK_ORIGINAL_VERIFIED',json.dumps(list(files)))
