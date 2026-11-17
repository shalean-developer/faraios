import base64
import hashlib
import json
import os
from pathlib import Path
import urllib.request
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from restore import restore

root = Path(os.environ["RUNNER_TEMP"])
bundle = root / "key"
key_path = bundle / "encrypted-private.pem"
public_path = bundle / "public.pem"
private_key = serialization.load_pem_private_key(key_path.read_bytes(), os.environ["BACKUP_PASSPHRASE"].encode())
pins = {"manifest.json": "531e030badb5fafb0d3dc16456cbd314d15b1d6e7391b5056a434cbf30b59845", "release.encrypted.json": "e184b68958271d9fd40c8c7c74ddc662556ded76abb94e3a5293f9dec47cd95d"}
commit = "65b0bf034a2e13d4ae763600349e83e2d1eee183"
def run():
    sealed = json.loads(os.environ["SEALED_READ_LINKS"])
    for name, expected in pins.items():
        link = private_key.decrypt(base64.b64decode(sealed[name]), padding.OAEP(padding.MGF1(hashes.SHA256()), hashes.SHA256(), None)).decode()
        prefix = f"https://raw.githubusercontent.com/shalean-developer/faraios-private-recovery/{commit}/{name}?token="
        if not link.startswith(prefix):
            raise ValueError()
        with urllib.request.urlopen(link, timeout=60) as response:
            content = response.read(15000000)
        if hashlib.sha256(content).hexdigest() != expected:
            raise ValueError()
        (root/name).write_bytes(content)
    receipt = restore(root/"release.encrypted.json", root/"manifest.json", key_path, public_path, root/"v1023-offline")
    if receipt["files"] != 1185 or receipt["tracker"] != {"revision":108,"tasks":43,"history":108}:
        raise ValueError()
    print(json.dumps(receipt))
try:
    os.umask(0o077)
    run()
except Exception:
    raise SystemExit("Recovery verification failed. Private details suppressed.")
