"""Restore OWNER-03 directory UI only, after verifying installed and backup hashes."""
import hashlib,json,os,pathlib,tempfile,argparse
MANIFEST=json.loads(pathlib.Path(__file__).with_name('rollback-manifest.json').read_text())
ROOT=pathlib.Path('/var/www/vhosts/shalean.com/faraios.com/account')
BACKUP=pathlib.Path('/var/www/vhosts/shalean.com/private/faraios-account/owner04-20261118')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def restore(root,backup,apply=False):
    for n,h in MANIFEST['after'].items():
        if (root/n).is_symlink() or digest(root/n)!=h:raise RuntimeError('Installed drift: '+n)
    for n,h in MANIFEST['before'].items():
        if (backup/n).is_symlink() or digest(backup/n)!=h:raise RuntimeError('Backup drift: '+n)
    if not apply:return {'status':'READY','changed':False}
    for n in ['platform-directory-page.php','platform-directory-https.php','platform-directory.php','platform-directory.css']:
        fd,p=tempfile.mkstemp(dir=backup)
        try:
            with os.fdopen(fd,'wb') as f:f.write((backup/n).read_bytes())
            os.chmod(p,0o644);os.replace(p,root/n)
        finally:
            if os.path.exists(p):os.unlink(p)
    (root/'platform-directory.js').unlink()
    return {'status':'RESTORED','changed':True,'business_or_tracker_data_changed':False}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--restore',action='store_true')
    print(json.dumps(restore(ROOT,BACKUP,parser.parse_args().restore)))
