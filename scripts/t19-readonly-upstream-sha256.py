#!/usr/bin/env python3
"""Read-only T19 pinned upstream migration SHA-256 inventory. Does not run SQL/Docker."""
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

MANIFEST = Path(__file__).resolve().parents[1] / "docs/t19-auth-storage-pinned-migration-inventory-v01.md"
REPOS = {"Auth": "supabase/auth", "Storage": "supabase/storage"}
COMMITS = {"Auth": "4eee58f296d9698a1c2c0ae14d7a0b379c7622d3", "Storage": "d2836fe9e8157f4fc558af0071a7671d373ff3ef"}
EXPECTED_COUNTS = {"Auth": 75, "Storage": 74}
MAX_BLOB_BYTES = 1024 * 1024

def fetch_blob(repo, blob):
    # Fixed public GitHub endpoint and pinned verified SHA only; no token/credentials.
    url = f"https://api.github.com/repos/{repo}/git/blobs/{blob}"
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "faraios-t19-readonly-inventory"})
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.load(response)
    import base64
    if data.get("sha") != blob or data.get("encoding") != "base64":
        raise ValueError("Blob identity/encoding mismatch")
    raw = base64.b64decode(data["content"], validate=False)
    if len(raw) > MAX_BLOB_BYTES or len(raw) != data.get("size"):
        raise ValueError("Unexpected blob size")
    calculated_git_blob = hashlib.sha1(b"blob " + str(len(raw)).encode() + bytes([0]) + raw).hexdigest()
    if calculated_git_blob != blob:
        raise ValueError("Fetched bytes do not match pinned Git blob")
    return hashlib.sha256(raw).hexdigest().upper()

def main():
    text = MANIFEST.read_text(encoding="utf-8")
    rows = {}
    current = None
    for line in text.splitlines():
        if line.startswith("## Auth"):
            current = "Auth"
        elif line.startswith("## Storage"):
            current = "Storage"
        elif line.startswith("## "):
            current = None
        match = re.match(r"^[|] `([^`]+[.]sql)` [|] `([a-f0-9]{40})` [|] PENDING [|]$", line)
        if current and match:
            rows.setdefault(current, []).append(match.groups())
    for section, required in EXPECTED_COUNTS.items():
        if len(rows.get(section, [])) != required:
            raise ValueError(f"{section}: expected {required} rows, got {len(rows.get(section, []))}")
        if len({path for path, _ in rows[section]}) != required:
            raise ValueError(f"{section}: duplicate path")
    print("component,path,git_blob_sha1,file_sha256", flush=True)
    for component in ("Auth", "Storage"):
        for path, sha in rows[component]:
            digest = fetch_blob(REPOS[component], sha)
            print(f"{component},{path},{sha},{digest}", flush=True)
    print("T19_PINNED_149_SHA256_SOURCE_VERIFIED", file=sys.stderr)

if __name__ == "__main__":
    main()
