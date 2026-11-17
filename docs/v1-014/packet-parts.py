"""Transport only the pinned encrypted V1-014 packet via authenticated artifacts."""
import base64, hashlib, json, os, re, subprocess, sys
from pathlib import Path

EXPECTED = '83fa85776038e65cbbea3f9ad9bf8b229e09e172be5cba52d3c4ff0ca78558ec'
SIZE = 252107
REPO = 'shalean-developer/faraios'

def decode_part(index, value):
    if not re.fullmatch('[0-5]', index) or not 1 <= len(value) <= 60000:
        raise ValueError('Invalid encrypted fragment')
    raw = base64.b64decode(value, validate=True)
    if len(raw) != (45000 if index != '5' else SIZE - 225000):
        raise ValueError('Invalid fragment length')
    return raw

def combine(parts):
    if len(parts) != 6:
        raise ValueError('Missing fragments')
    raw = b''.join(parts)
    if len(raw) != SIZE or hashlib.sha256(raw).hexdigest() != EXPECTED:
        raise ValueError('Packet checksum mismatch')
    packet = json.loads(raw)
    if packet['schema'] != 'faraios.v1014.supplement.v1' or packet['project'] != 'rxelmugnucfajrqmphhe':
        raise ValueError('Wrong packet')
    return raw

def main():
    root = Path(os.environ['RUNNER_TEMP']) / 'v1014-parts'
    root.mkdir(mode=0o700)
    if sys.argv[1] == 'part':
        index = os.environ['V14_PART_INDEX']
        raw = decode_part(index, os.environ['V14_PART'])
        (root / (index + '.part')).write_bytes(raw)
        print('Validated encrypted fragment ' + index + '; no plaintext or keys accessed.')
        return
    ids = os.environ['V14_PART_RUNS'].split(',')
    if len(ids) != 6 or len(set(ids)) != 6 or any(not re.fullmatch('[0-9]{8,20}', n) for n in ids):
        raise ValueError('Six distinct successful fragment runs required')
    parts = []
    for index, run in enumerate(ids):
        meta = json.loads(subprocess.check_output(['gh','api',f'repos/{REPO}/actions/runs/{run}']))
        if meta['conclusion'] != 'success' or meta['head_branch'] != 'verify/v1-014-recovery-drill-20261117' or meta['event'] != 'workflow_dispatch':
            raise ValueError('Unexpected source run')
        dest = root / str(index)
        subprocess.run(['gh','run','download',run,'--repo',REPO,'--name','v1014-encrypted-part','--dir',str(dest)], check=True, capture_output=True)
        files = list(dest.iterdir())
        expected = dest / (str(index) + '.part')
        if files != [expected] or expected.is_symlink():
            raise ValueError('Unexpected fragment file')
        parts.append(expected.read_bytes())
    (root / 'packet.json').write_bytes(combine(parts))
    print('Six authenticated ciphertext fragments assembled; exact pinned checksum passed.')

if __name__ == '__main__':
    main()
