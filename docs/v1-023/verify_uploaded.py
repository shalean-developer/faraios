import base64,hashlib,io,json,os,stat,time,zipfile
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
from restore import restore
def drill():
    global stage; stage='key'; start=time.monotonic(); root=Path(os.environ["RUNNER_TEMP"]); os.umask(0o077)
    key=root/"key/encrypted-private.pem"
    private=serialization.load_pem_private_key(key.read_bytes(),os.environ["BACKUP_PASSPHRASE"].encode())
    alg=padding.OAEP(padding.MGF1(hashes.SHA256()),hashes.SHA256(),None)
    link=b"".join(private.decrypt(base64.b64decode(p,validate=True),alg) for p in ["JELo6/+UVg6/F1mHAs5wCywlVEdtrTr8N094C4utHaxHMQaLAN9nY2w//XlkCad/zUciZBAKAcLP8e/4aNixJxfgsW4xFNWVRV4+FdmLEEdYYAy1ptI2/RzXzlejEMlcKRWkj17mubGZgVecUzqtsiYDvbCCWfs5mktapijACR4arOizvKP5NHsW3UfqZc72OWyzl8qgBQyPHhK7lUJ+hhjCle6Vwp0vDOro/dmy7/KpyLkIrEiO2Pe+jt7jMRif59pC6eppflgJ9hYatn5IetYff6x1X60qmQm+k7HjFNbYYhC2Dh14vPgFbLKzZK4iTvsknHljs3D+uMH4Mo6F+3uckk4lJ2P72Ndej88Aa8wQETqIlnu6SmfwVHQ1ZkKwhgm1XTTrqHPI0O5KB+eCxwUwGKbC35k9sqE3rKmaDuSxHhlQzC6RWljomC9HKp1jtxcnWxHMlf4xQ6oCCkcrXDvm1wk1yt25ZVe4Dtt6/WMU4GPeUtw3qDJ9D1OAAAge"]).decode()
    stage='download'; u=urlsplit(link)
    expected="/shalean-developer/faraios-private-recovery/58074ba/faraios-20261119T074502Z-1e3a8125feeb.zip"
    if u.scheme!="https" or u.hostname!="raw.githubusercontent.com" or u.path!=expected: raise ValueError()
    with urlopen(link,timeout=90) as response: data=response.read(24000001)
    if len(data)!=14111203 or hashlib.sha256(data).hexdigest()!="1e3a8125feeb2dcc373fc91ee64e292c08cbd44d48986caeed853a5f0e71b2a5": raise ValueError()
    stage='zip';
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        if sorted(z.namelist())!=["manifest.json","release.encrypted.json"] or len(z.infolist())!=2: raise ValueError()
        for i in z.infolist():
            if i.file_size>24000000: raise ValueError()
            (root/i.filename).write_bytes(z.read(i))
    stage='manifest'; m=json.loads((root/"manifest.json").read_bytes())
    if m["captured_utc"]!="2026-11-19T07:45:02.918601+00:00" or len(m["web"])!=1221 or len(m["private"])!=9: raise ValueError()
    out=root/"v1023-offline"
    stage='restore'; receipt=restore(root/"release.encrypted.json",root/"manifest.json",key,root/"key/public.pem",out)
    stage='permissions';
    for f in [out,*out.rglob("*")]:
        if stat.S_IMODE(f.stat().st_mode)!=(0o700 if f.is_dir() else 0o600): raise ValueError()
    print(json.dumps(dict(receipt,captured_utc=m["captured_utc"],website=1221,private=9,private_modes=True,zip_sha256=hashlib.sha256(data).hexdigest(),elapsed_seconds=round(time.monotonic()-start,2))))
try: drill()
except Exception as e:
    print(json.dumps({"status":"FAIL","stage":globals().get("stage","startup"),"type":type(e).__name__,"http_status":getattr(e,"code",None)}))
    raise SystemExit("Isolated restore failed; private details suppressed.")
