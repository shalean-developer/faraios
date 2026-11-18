"""Scoped OWNER-08 file rollback; default is verification only."""
import argparse,hashlib,json,os,pathlib,tempfile
MANIFEST=json.loads(pathlib.Path(__file__).with_name('rollback-manifest.json').read_text())
ROOT=pathlib.Path('/var/www/vhosts/shalean.com/faraios.com/account')
BACKUP=pathlib.Path('/var/www/vhosts/shalean.com/private/faraios-account/owner08-20261118')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def restore(root,backup,apply=False):
    for n,h in MANIFEST['after'].items():
        if (root/n).is_symlink() or digest(root/n)!=h:raise RuntimeError('Installed drift: '+n)
    for n,h in MANIFEST['before'].items():
        if (backup/n).is_symlink() or digest(backup/n)!=h:raise RuntimeError('Backup drift: '+n)
    if not apply:return {'status':'READY','changed':False}
    for n in ['platform-navigation.php']:
        fd,p=tempfile.mkstemp(dir=backup)
        try:
            with os.fdopen(fd,'wb') as f:f.write((backup/n).read_bytes())
            os.chmod(p,0o644);os.replace(p,root/n)
        finally:
            if os.path.exists(p):os.unlink(p)
    for n in MANIFEST['after']:
        if n not in MANIFEST['before']:(root/n).unlink()
    return {'status':'RESTORED','changed':True,'business_data_changed':False}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--restore',action='store_true')
    print(json.dumps(restore(ROOT,BACKUP,p.parse_args().restore)))
