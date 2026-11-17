import base64
import hashlib
import io
import json
import os
import time
import zipfile
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from restore import restore

def drill():
    started = time.monotonic()
    root = Path(os.environ["RUNNER_TEMP"])
    key = root / "key/encrypted-private.pem"
    private = serialization.load_pem_private_key(key.read_bytes(), os.environ["BACKUP_PASSPHRASE"].encode())
    algorithm = padding.OAEP(padding.MGF1(hashes.SHA256()), hashes.SHA256(), None)
    sealed = json.loads(os.environ["SEALED_RECEIPT"])
    link = b"".join(private.decrypt(base64.b64decode(piece, validate=True), algorithm) for piece in sealed).decode()
    if urlsplit(link).hostname != "release-assets.githubusercontent.com" or urlsplit(link).scheme != "https":
        raise ValueError()
    with urlopen(link, timeout=90) as response:
        data = response.read(24_000_000)
    if hashlib.sha256(data).hexdigest() != "52079d02a1edbef75d1515c73b34394221afce355136bc3bc32bc1e2299c4d5a":
        raise ValueError()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sorted(archive.namelist()) != ["manifest.json", "release.encrypted.json"]:
            raise ValueError()
        for item in archive.infolist():
            if item.file_size > 24_000_000:
                raise ValueError()
            (root / item.filename).write_bytes(archive.read(item))
    receipt = restore(root / "release.encrypted.json", root / "manifest.json", key, root / "key/public.pem", root / "v1023-offline")
    manifest = json.loads((root / "manifest.json").read_bytes())
    print(json.dumps(dict(receipt, captured_utc=manifest["captured_utc"], website=len(manifest["web"]),
                          private=len(manifest["private"]), elapsed_seconds=round(time.monotonic()-started,2))))

try:
    os.umask(0o077)
    drill()
except Exception:
    raise SystemExit("Scheduled restore failed. Private details suppressed.")
