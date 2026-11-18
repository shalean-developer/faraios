#!/usr/bin/env python3
"""Real CLI + local HTTP fixture; no external network, database mutations or mail."""
import http.server, json, os, pathlib, subprocess, tempfile, threading
root = pathlib.Path(__file__).resolve().parents[1]
php = os.environ.get('PHP_BIN', 'php')
secret = 'SENSITIVE-CREDENTIAL-CUSTOMER-DATA'
class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        self.rfile.read(int(self.headers.get('Content-Length', 0)))
        self.server.calls.append(self.path)
        status, body = self.server.reply(self.path)
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
    def log_message(self, *args): pass
server = http.server.HTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
checks = 0
with tempfile.TemporaryDirectory() as directory:
    path = pathlib.Path(directory)
    path.joinpath('config.php').write_text("<?php return " + "['secret'=>'" + 'x'*40 + "','enabled'=>true,'environment'=>'test','transport'=>'capture','base_url'=>'http://localhost','supabase_url'=>'http://127.0.0.1:" + str(server.server_port) + "','supabase_key'=>'" + secret + "'];")
    env = dict(os.environ, FARAIOS_WAITLIST_DIR=directory)
    cases = [(401, {'code':'PGRST301','message':secret}, 'PGRST301'),
             (403, {'code':'42501','details':secret}, '42501'),
             (503, {'code':secret,'hint':secret}, None),
             (500, {'code':['PGRST301'], 'message':secret}, None),
             (429, {'code':'PGRST301\n'+secret}, None)]
    for status, body, code in cases:
        server.calls = []
        server.reply = lambda url, s=status, b=body: (200,True) if url.endswith("waitlist_rate") else (s,b)
        result = subprocess.run([php,str(root/'scripts/waitlist.php'),'work'],env=env,text=True,capture_output=True)
        assert result.returncode == 1 and result.stdout == ''
        lines = result.stderr.splitlines()
        assert len(lines) == 2 and lines[1] == 'Waitlist command failed: Database request failed'
        data = json.loads(lines[0])
        assert data['http_status'] == status and data['error_code'] == code
        assert data['operation'] == 'waitlist_claim' and data['category'] == 'http_rejection'
        assert secret not in result.stderr and len(lines[0]) < 400
        assert server.calls == ['/rest/v1/rpc/waitlist_rate','/rest/v1/rpc/waitlist_claim']
        checks += 1
    server.calls = []
    server.reply = lambda url: (200,True) if url.endswith('waitlist_rate') else ((200,None) if url.endswith('waitlist_claim') else (500,{'code':'XX000','details':secret}))
    result = subprocess.run([php,str(root/'scripts/waitlist.php'),'work'],env=env,text=True,capture_output=True)
    assert result.returncode == 1 and json.loads(result.stderr.splitlines()[0])['operation'] == 'waitlist_cleanup'
    assert server.calls == ['/rest/v1/rpc/waitlist_rate','/rest/v1/rpc/waitlist_claim','/rest/v1/rpc/waitlist_cleanup']
    assert not list(path.glob('*.eml')) and secret not in result.stderr
    checks += 1
    server.reply = lambda _: (200,{'subscribers':{},'mail':{}})
    result = subprocess.run([php,str(root/'scripts/waitlist.php'),'status'],env=env,text=True,capture_output=True)
    assert result.returncode == 0 and result.stderr == '' and json.loads(result.stdout) == {'subscribers':[],'mail':[]}
    checks += 1
    server.shutdown(); server.server_close()
    result = subprocess.run([php,str(root/'scripts/waitlist.php'),'work'],env=env,text=True,capture_output=True)
    data = json.loads(result.stderr.splitlines()[0])
    assert result.returncode == 1 and data['http_status'] == 0 and data['category'] == 'transport_or_unavailable_response'
    assert secret not in result.stderr
    checks += 1
print(f'PASS {checks} CLI failure/privacy/success scenarios; local fixtures only.')
