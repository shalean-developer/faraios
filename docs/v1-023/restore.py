"""Offline recovery into a NEW directory; never executes restored files.
Requires cryptography. Password via BACKUP_PASSPHRASE environment, never CLI.
python restore.py PACKET MANIFEST ENCRYPTED_PRIVATE_PEM PUBLIC_PEM NEW_OUTPUT
"""
import base64, hashlib, io, json, os, pathlib, sys, tarfile
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
PRIVATE = ['faraios-account/config.php','faraios-account/production.php','faraios-enquiry-mail/config.php','faraios-waitlist/config.php','faraios-staff-invite/web.php','faraios-staff-invite/worker.php','faraios-account/platform-owner.php','faraios-lifecycle/config.php','faraios-account/platform-tracker-d7a1fa306749/tracker.json']
HEAD = ['schema','project','captured_utc','key_fingerprint','archive_sha256','manifest_sha256']
def digest(b): return hashlib.sha256(b).hexdigest()
def require(ok):
    if not ok: raise ValueError('Recovery input rejected')
def restore(packet_path, manifest_path, private_path, public_path, out):
    out=pathlib.Path(out); require(not out.exists() and not out.is_symlink())
    require(out.parent.is_dir() and out.parent.resolve()==out.parent.absolute())
    raw=pathlib.Path(packet_path).read_bytes(); require(len(raw)<200_000_000)
    p=json.loads(raw); h={k:p[k] for k in HEAD}
    require(h['schema']=='faraios.release.v1' and h['project']=='rxelmugnucfajrqmphhe')
    pub=pathlib.Path(public_path).read_bytes(); require(digest(pub)==h['key_fingerprint'])
    mraw=pathlib.Path(manifest_path).read_bytes(); require(digest(mraw)==h['manifest_sha256']); m=json.loads(mraw)
    require(m['project']==h['project'] and m['captured_utc']==h['captured_utc'])
    require(set(m['private'])==set(PRIVATE))
    key=serialization.load_pem_private_key(pathlib.Path(private_path).read_bytes(),password=os.environ['BACKUP_PASSPHRASE'].encode())
    require(key.key_size>=3072)
    require(key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo)==pub)
    b64=lambda k:base64.b64decode(p[k],validate=True)
    secret=key.decrypt(b64('sealed_key'),padding.OAEP(mgf=padding.MGF1(hashes.SHA1()),algorithm=hashes.SHA1(),label=None))
    data=AESGCM(secret).decrypt(b64('iv'),b64('ciphertext')+b64('tag'),json.dumps(h,separators=(',',':')).encode())
    require(digest(data)==h['archive_sha256'])
    expected={'faraios.com/'+n:v for n,v in m['web'].items()} | {'private/'+n:v for n,v in m['private'].items()}
    payload={}; total=0
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
        for member in archive:
            name=member.name; path=pathlib.PurePosixPath(name)
            require(not path.is_absolute() and '..' not in path.parts and '\\' not in name)
            if member.isdir(): continue
            require(member.isfile() and name in expected and name not in payload)
            total+=member.size; require(total<500_000_000 and member.size<100_000_000)
            content=archive.extractfile(member).read(); require(digest(content)==expected[name]); payload[name]=content
    require(set(payload)==set(expected))
    tracker=json.loads(payload['private/'+PRIVATE[-1]])
    require({'revision':tracker['revision'],'tasks':len(tracker['tasks']),'history':len(tracker['history'])}==m['tracker'])
    out.mkdir(mode=0o700)
    for name,content in payload.items():
        f=out/name; f.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
        with f.open('xb') as stream: stream.write(content)
        f.chmod(0o600); require(digest(f.read_bytes())==expected[name])
    return {'status':'PASS','files':len(payload),'tracker':m['tracker'],'packet_sha256':digest(raw),'private_key_unwrapped':True,'configuration_executed':False}
if __name__=='__main__':
    try:
        os.umask(0o077); print(json.dumps(restore(*sys.argv[1:])))
    except Exception:
        print('Recovery failed; private details suppressed',file=sys.stderr); sys.exit(1)
