"""Emit rollback-only synthetic V1-015 tests; never commit or publish a website.
Uses existing registered synthetic owners only. No Auth mutations, messages or payments.
"""
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('export_query', Path(__file__).with_name('export-query.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
A = '2f16e658-e031-4c4a-930a-2731ec1d1492'
B = '4627f805-8243-4890-bf18-a14fdf3fd21b'
OA = '8a68ef34-a924-4035-be53-6af84b8fe1f9'
OB = '130ce5bc-3831-4fb7-8b30-befb06377dee'
def lit(value):
    return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"

print("BEGIN; SET LOCAL statement_timeout='25s';")
print(f"""DO $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='2f16e658-e031-4c4a-930a-2731ec1d1492' AND owner_id='{OA}' AND name='SC04 Synthetic Acceptance A')
OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='4627f805-8243-4890-bf18-a14fdf3fd21b' AND owner_id='{OB}' AND name='SC04 Synthetic Acceptance B')
THEN RAISE EXCEPTION 'Synthetic owner baseline drift'; END IF; END $$;""")
profile = dict(name='Synthetic V1-015',description='V1015-PRIVATE-DRAFT',email='public@example.test',phone='',website='',areas='Synthetic area',hours=[None]*7,logo=None)
print(f"INSERT INTO public.business_profiles(business_id,environment,slug,draft) VALUES('{A}','preview','synthetic-v1015-rollback',{lit(profile)});")
for number,bid,env,marker in [(11,A,'preview','V1015-ALLOW'),(12,A,'live','V1015-WRONG-ENV'),(13,B,'preview','V1015-WRONG-BUSINESS')]:
    details=dict(name=marker,email='synthetic@example.test',phone='',address='Synthetic test address',notes='Synthetic private note')
    print(f"INSERT INTO public.business_customers(id,business_id,environment,details) VALUES('01500000-0000-4000-8000-{number:012}','{bid}','{env}',{lit(details)});")
doc=dict(name='Synthetic quote',email='synthetic@example.test',phone='',notes='Synthetic agreement',currency='ZAR',items=[dict(name='Synthetic service',quantity=1,price=100)])
print(f"INSERT INTO public.business_quotes(id,business_id,environment,document,expires_on,status,share_token,sent_at,sender) VALUES('01500000-0000-4000-8000-000000000021','{A}','preview',{lit(doc)},current_date+1,'Sent',repeat('f',64),now(),'{chr(123)}\"name\":\"Synthetic\",\"email\":\"public@example.test\",\"phone\":\"\",\"time_zone\":\"Africa/Johannesburg\"{chr(125)}');")
print('CREATE TEMP TABLE v1015_export ON COMMIT DROP AS '+module.query(A,OA,'preview'))
print('CREATE TEMP TABLE v1015_wrong_owner ON COMMIT DROP AS '+module.query(A,OB,'preview'))
print("""DO $$ DECLARE x jsonb; w jsonb; BEGIN
SELECT export INTO x FROM v1015_export;
SELECT export INTO w FROM v1015_wrong_owner;
IF x->>'scope_verified'<>'true' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(x#>'{datasets,business_customers,rows}') r WHERE r->>'id'='01500000-0000-4000-8000-000000000011')
OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(x#>'{datasets,business_quotes,rows}') r WHERE r->>'id'='01500000-0000-4000-8000-000000000021')
OR (x#>>'{datasets,business_profiles,count}')::int<>1
OR (x#>>'{datasets,business_public_pages,count}')::int<>0
OR x::text NOT LIKE '%V1015-ALLOW%' OR x::text NOT LIKE '%V1015-PRIVATE-DRAFT%'
OR x::text LIKE '%V1015-WRONG-%' OR x::text LIKE '%share_token%' OR x::text LIKE '%'||repeat('f',64)||'%'
OR w->>'scope_verified'<>'false'
OR EXISTS(SELECT 1 FROM jsonb_each(w->'datasets') d WHERE (d.value->>'count')::int<>0)
OR EXISTS(SELECT 1 FROM jsonb_each(x->'datasets') d WHERE (d.value->>'count')::int<>jsonb_array_length(d.value->'rows'))
THEN RAISE EXCEPTION 'Export boundary failed'; END IF;
END $$;""")
print(f"SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='{OB}'; SET LOCAL request.jwt.claims='{{\"is_anonymous\":false}}';")
print(f"""DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.business_profiles WHERE business_id='{A}')
OR EXISTS(SELECT 1 FROM public.business_customers WHERE business_id='{A}')
OR EXISTS(SELECT 1 FROM public.business_quotes WHERE business_id='{A}')
THEN RAISE EXCEPTION 'Cross-owner disclosure'; END IF; END $$;""")
print(f"SET LOCAL request.jwt.claim.sub='{OA}';")
print(f"""DO $$ BEGIN IF (SELECT count(*) FROM public.business_profiles WHERE business_id='{A}')<>1
OR (SELECT count(*) FROM public.business_customers WHERE id='01500000-0000-4000-8000-000000000011' AND business_id='{A}' AND environment='preview')<>1
THEN RAISE EXCEPTION 'Owner positive control failed'; END IF; END $$;""")
print("SET LOCAL ROLE anon;")
print("""DO $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM public.business_public_pages) OR EXISTS(SELECT 1 FROM public.business_public_pages WHERE document::text LIKE '%V1015-PRIVATE-DRAFT%') THEN RAISE EXCEPTION 'Published snapshot boundary failed'; END IF;
BEGIN PERFORM draft FROM public.business_profiles; RAISE EXCEPTION 'Anonymous draft exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
BEGIN PERFORM details FROM public.business_customers; RAISE EXCEPTION 'Anonymous customer exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
BEGIN PERFORM document FROM public.business_quotes; RAISE EXCEPTION 'Anonymous quote table exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;""")
print("RESET ROLE; SELECT jsonb_build_object('export_scope',true,'wrong_owner_denied',true,'cross_environment_denied',true,'tokens_excluded',true,'row_counts_match',true,'owner_positive_control',true,'cross_owner_denied',true,'anonymous_private_denied',true,'published_snapshot_boundary',true,'website_publication',false,'messages_sent',false,'committed_records',false) AS v1015_rehearsal; ROLLBACK;")
