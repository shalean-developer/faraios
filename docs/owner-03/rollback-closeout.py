"""Narrow OWNER-03 UI rollback. Verify by default; --restore changes only named code files."""
import argparse, hashlib, json, os, pathlib, tempfile
ROOT=pathlib.Path('/var/www/vhosts/shalean.com/faraios.com/account')
BACKUP=pathlib.Path('/var/www/vhosts/shalean.com/private/faraios-account/owner03-closeout-20261118')
AFTER={
  "platform.php": "8ddebf4f0d6a1cfb4d91bf98a7253308491eca276cba18e5d41ef7a28af82b0b",
  "platform-directory.php": "b26f9e8e0697c0f490c8bf9f0d36ec50b43b50bd44b14af3db6e0238025c8c77",
  "platform-navigation.php": "be242f358d0b16fd3ebc52f7a1f98169b9c828d95401305861205f19156c4522",
  "platform-directory-page.php": "0884a939e0bc304434714b8171414ecdf33e97181a937b6b0bede1391c83d875",
  "platform-directory.css": "1b3859c61a6c3b196c2b4060cd51b5490c834be6012968bc322af83f06686f48"
}
BEFORE={'platform.php':'d7ac087c3568b7032214118130f173bdc963d6568d84c0715f3d3aa30fb0128b','platform-directory.php':'048f131ccab53c220ab020d23447e5015f002e5d2676701aacd4b01b1195fb39'}
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def restore(root,backup,apply=False):
    for n,h in AFTER.items():
        if (root/n).is_symlink() or digest(root/n)!=h:raise RuntimeError('Installed file drift: '+n)
    for n,h in BEFORE.items():
        if (backup/n).is_symlink() or digest(backup/n)!=h:raise RuntimeError('Backup drift: '+n)
    if not apply:return {'status':'READY','changed':False}
    # Remove caller navigation first; old entry does not require the new helper.
    for n in ['platform.php','platform-directory.php']:
        fd,p=tempfile.mkstemp(prefix='restore-',dir=backup)
        try:
            with os.fdopen(fd,'wb') as f:f.write((backup/n).read_bytes())
            os.chmod(p,0o644);os.replace(p,root/n)
        finally:
            if os.path.exists(p):os.unlink(p)
    for n in ['platform-directory-page.php','platform-navigation.php','platform-directory.css']:
        (root/n).unlink()
    return {'status':'RESTORED','changed':True,'database_or_tracker_data_changed':False}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--restore',action='store_true')
    print(json.dumps(restore(ROOT,BACKUP,parser.parse_args().restore)))
