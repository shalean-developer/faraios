import hashlib,io,json,os,stat,time,zipfile
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener
from restore import restore
class SafeAssetRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u=urlsplit(newurl)
        if u.scheme!="https" or u.hostname!="release-assets.githubusercontent.com" or u.username or u.password or u.port not in (None,443):
            raise ValueError("Unexpected asset redirect")
        # Do not forward the API credential to the signed asset destination.
        return Request(newurl,headers={"Accept":"application/octet-stream","User-Agent":"FaraiOS-isolated-recovery"})
def drill():
    global stage; stage='key'; start=time.monotonic(); root=Path(os.environ["RUNNER_TEMP"]); os.umask(0o077)
    key=root/"key/encrypted-private.pem"
    stage='download'
    token=os.environ.pop("RECOVERY_READ_TOKEN")
    if not token or any(c.isspace() for c in token): raise ValueError()
    api="https://api.github.com/repos/shalean-developer/faraios-private-recovery/releases/assets/766742800"
    request=Request(api,headers={"Authorization":"Bearer "+token,"Accept":"application/octet-stream","X-GitHub-Api-Version":"2022-11-28","User-Agent":"FaraiOS-isolated-recovery"})
    with build_opener(SafeAssetRedirect()).open(request,timeout=90) as response:
        data=response.read(24000001)
    del token,request
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
