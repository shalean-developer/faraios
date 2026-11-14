"""SC-02 source evidence generator. Reads repository files only; never connects to services.
SQL lexer preserves function bodies and quoted semicolons. References are lexical,
not a SQL planner/call graph or a claim about a hosted catalogue.
"""
import hashlib, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/sc02'
BASE = 'e0d45923b441d7833e048faa041a3f0e16cfe1e2'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def statements(text):
    """Yield non-comment SQL statement text and source start line."""
    start = None
    buf = []
    line = 1
    start_line = 1
    i = 0
    quote = None
    block = 0
    while i < len(text):
        c = text[i]
        if block:
            if text.startswith('/*', i): block += 1; i += 2; continue
            if text.startswith('*/', i): block -= 1; i += 2; continue
            line += c == '\n'; i += 1; continue
        if quote:
            if text.startswith(quote, i):
                buf.append(quote); i += len(quote)
                if quote in ("'", '"') and text.startswith(quote, i):
                    buf.append(quote); i += len(quote)
                else: quote = None
                continue
            buf.append(c); line += c == '\n'; i += 1; continue
        if text.startswith('--', i):
            end = text.find('\n', i)
            if end == -1: break
            buf.append(' '); i = end; continue
        if text.startswith('/*', i): block = 1; buf.append(' '); i += 2; continue
        if start is None and not c.isspace(): start = i; start_line = line
        if c in ("'", '"'): quote = c
        elif c == '$':
            m = re.match(r'\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$', text[i:])
            if m: quote = m[0]; buf.append(quote); i += len(quote); continue
        if c == ';':
            sql = ''.join(buf).strip()
            if sql: yield sql, start_line
            buf = []; start = None
        else: buf.append(c)
        line += c == '\n'; i += 1
    if quote or block: raise ValueError('Unclosed SQL quote/comment')
    if ''.join(buf).strip(): yield ''.join(buf).strip(), start_line

NAME = r'[a-z_][a-z_0-9]*\.[a-z_][a-z_0-9]*'

def sql_sources():
    return sorted((ROOT/'supabase/migrations').glob('*.sql')) + sorted((ROOT/'release').glob('*.sql'))

def runtime_sources():
    # Includes deployment config, workflows, public assets and recovery tools.
    # Excludes documents, tests and git metadata; no baseline self-reference.
    return sorted(p for p in ROOT.rglob('*') if p.is_file()
                  and not any(x in p.relative_to(ROOT).parts for x in ('.git','docs','tests','test-results','__pycache__')))

def build():
    records = []; files = []
    for path in sql_sources():
        rel = str(path.relative_to(ROOT)); raw = path.read_bytes()
        files.append(dict(path=rel, sha256=digest(raw)))
        for n, (sql, line) in enumerate(statements(raw.decode()), 1):
            kind = 'other'; name = None; signature = None
            m = re.match(r'create\s+(?:or\s+replace\s+)?(function|view|table|policy|trigger|schema)\s+([^\s(]+)', sql, re.I)
            if m: kind, name = m[1].lower(), m[2]
            elif re.match(r'(grant|revoke|alter|drop)\b', sql, re.I): kind = sql.split()[0].lower()
            if kind == 'function': signature = sql[:sql.lower().index(' returns ')].strip() if ' returns ' in sql.lower() else sql.split('returns')[0].strip()
            refs = sorted(set(re.findall(NAME, sql, re.I)))
            reads = sorted(set(re.findall(r'(?:from|join)\s+('+NAME+r')', sql, re.I)))
            writes = sorted(set(re.findall(r'(?:insert\s+into|update|delete\s+from|truncate(?:\s+table)?)\s+('+NAME+r')', sql, re.I)))
            calls = sorted(set(re.findall(r'('+NAME+r')\s*\(', sql, re.I)) - ({name} if name else set()))
            records.append(dict(id=f'{rel}#{n}', path=rel, line=line, kind=kind, name=name,
                signature=signature, security=('definer' if re.search(r'security\s+definer', sql, re.I) else 'invoker/default') if kind=='function' else None,
                reads=reads, writes=writes, calls=calls, references=refs, sha256=digest(sql.encode()), sql=sql))
    # Order each migration then explicitly split activation and rollback scenarios.
    # Signature text includes parameter names/defaults: retain overload history rather than
    # accidentally collapsing overloads into a single last-name-wins definition.
    api = []
    patterns = r'/rest/v1/|/auth/v1/|/storage/v1/|\bprofile_rpc\(|\bmail_rpc\(|(?:->|\$)rpc\('
    for path in runtime_sources():
        if path.suffix not in ('.php','.js','.py'): continue
        for line, text in enumerate(path.read_text().splitlines(), 1):
            if re.search(patterns, text):
                api.append(dict(path=str(path.relative_to(ROOT)),line=line,text=text.strip(),
                    literal_rpcs=sorted(set(re.findall(r"['\"]((?:business|waitlist)_[a-z_]+)['\"]", text))),
                    methods=sorted(set(re.findall(r"['\"](GET|POST|PATCH|PUT|DELETE)['\"]", text)))))
    local_io = []
    for path in runtime_sources():
        if path.suffix not in ('.php','.js','.py'): continue
        for line, text in enumerate(path.read_text().splitlines(), 1):
            if re.search(r'file_put_contents|fopen\(|SQLite3|sessionStorage|localStorage|\.write_text\(|\.write_bytes\(|\b(?:sql|fingerprints|schema_grants)\(', text):
                local_io.append(dict(path=str(path.relative_to(ROOT)),line=line,text=text.strip()))
    dynamic = [dict(function='customer_private.link',reads=['public.business_customers'],
                    writes=['public.business_enquiries','public.business_quotes','public.business_bookings'],
                    reason='p_kind allowlist + format public.%I; tenant/environment/version/customer-null checks; lexical scanner cannot expand identifier placeholders')]
    effective = {}
    for scenario in ['migrations_only','manual_activation','manual_rollback']:
        selected = [r for r in records if r['path'].startswith('supabase/') or
                    (scenario=='manual_activation' and r['path']=='release/activate-foundation.sql') or
                    (scenario=='manual_rollback' and r['path']=='release/deactivate-foundation.sql')]
        # Keep all overloads by argument types; defaults do not identify an overload.
        definitions = {}
        for r in selected:
            if r['kind'] != 'function': continue
            args = r['signature'].split('(',1)[1].rsplit(')',1)[0]
            types = []
            for arg in args.split(','):
                arg = re.split(r'\s+default\s+',arg.strip(),flags=re.I)[0]
                words = arg.split()
                types.append(' '.join(words[1:]) if len(words)>1 else arg)
            key = r['name']+'('+','.join(types)+')'
            definitions[key] = r['id']
        effective[scenario] = definitions
    sql_names = sorted({r['name'] for r in records if r['kind']=='function'})
    result = dict(format=1,baseline_commit=BASE,scope='source only; migrations + separate manual activation/rollback; lexical references require native verification',
        files=files,sql=records,application_access_sites=api,local_access_sites=local_io,dynamic_sql_expansions=dynamic,effective_function_sources=effective,
        counts=dict(sql_files=len(files),statements=len(records),functions=len(sql_names),function_definitions=sum(r['kind']=='function' for r in records),
                    tables=len({r['name'] for r in records if r['kind']=='table'}),views=len({r['name'] for r in records if r['kind']=='view'}),
                    policies=sum(r['kind']=='policy' for r in records),grant_statements=sum(r['kind']=='grant' for r in records),
                    revoke_statements=sum(r['kind']=='revoke' for r in records),application_access_sites=len(api)))
    return result

def manifest():
    return dict(format=1,baseline_commit=BASE,scope='all tracked runtime/config/assets, migration and manual release bytes; no hosted row fingerprints',
        files=[dict(path=str(p.relative_to(ROOT)),sha256=digest(p.read_bytes())) for p in runtime_sources()])

def render(data):
    return json.dumps(data,indent=2,ensure_ascii=False)+'\n'

if __name__ == '__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    inventory=build()
    (OUT/'contract-inventory.json').write_text(render(inventory))
    (OUT/'preservation-manifest.json').write_text(render(manifest()))
    print(render(inventory['counts']))
