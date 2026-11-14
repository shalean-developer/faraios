"""Optional real Chromium smoke test. Install Playwright outside application dependencies.
Set BROWSER_BIN/PLAYWRIGHT_MODULE for an existing browser/runtime if required.
All writes use disposable PostgreSQL and simulated Auth/REST; no hosted calls.
"""
import json,os,subprocess,tempfile
from pathlib import Path
from rooms import Rooms
Rooms.setUpClass()
try:
 Rooms('test_rooms').test_rooms()
 Rooms.scope(Rooms.ids[0],f"select public.business_services_publish('{Rooms.bids[0]}','live',6)")
 with tempfile.TemporaryDirectory(prefix='faraios-rooms-browser-') as folder:
  fixture=Path(folder)/'fixture.json';fixture.write_text(json.dumps(dict(url=Rooms.url)))
  evidence=Path(os.environ.get('EVIDENCE_DIR',folder));evidence.mkdir(parents=True,exist_ok=True)
  subprocess.run(['node',str(Path(__file__).with_suffix('.cjs'))],check=True,env=dict(os.environ,ROOMS_FIXTURE=str(fixture),EVIDENCE_DIR=str(evidence)))
finally:Rooms.tearDownClass()
