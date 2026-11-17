"""Generate one read-only operator query. Not an API or identity-verification service.

Use only after the runbook's identity/scope checks. No credentials or connection.
The fixed allowlist omits bearer tokens and all Auth/provider/security tables.
"""
import argparse
import json
import uuid
from pathlib import Path

FIELDS = json.loads(Path(__file__).with_name('export-fields.json').read_text())

def query(business, owner, environment):
    business, owner = str(uuid.UUID(business)), str(uuid.UUID(owner))
    if environment not in ('preview', 'live'):
        raise ValueError('Exact environment required')
    ctes = [f"scope AS (SELECT id FROM public.businesses WHERE id='{business}'::uuid AND owner_id='{owner}'::uuid)"]
    for table, columns in FIELDS.items():
        predicate = 't.id IN (SELECT id FROM scope)' if table == 'businesses' else f"t.business_id IN (SELECT id FROM scope) AND t.environment='{environment}'"
        if table == 'business_enquiry_activity':
            predicate = f"EXISTS (SELECT 1 FROM public.business_enquiries e WHERE e.id=t.enquiry_id AND e.business_id IN (SELECT id FROM scope) AND e.environment='{environment}')"
        ctes.append(f"{table}_rows AS (SELECT {','.join('t.'+c for c in columns)} FROM public.{table} t WHERE {predicate})")
    pairs = []
    for table in FIELDS:
        pairs += [f"'{table}'", f"(SELECT jsonb_build_object('count',count(*),'rows',coalesce(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),'[]'::jsonb)) FROM {table}_rows r)"]
    return "WITH " + ',\n'.join(ctes) + f"\nSELECT jsonb_build_object('format','faraios-business-export-v1','business_id','{business}','environment','{environment}','captured_at',transaction_timestamp(),'scope_verified',EXISTS(SELECT 1 FROM scope),'datasets',jsonb_build_object(" + ',\n'.join(pairs) + ')) AS export;'

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--business', required=True)
    parser.add_argument('--verified-owner', required=True)
    parser.add_argument('--environment', choices=['preview','live'], required=True)
    args = parser.parse_args()
    print('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL statement_timeout=\'30s\';')
    print(query(args.business, args.verified_owner, args.environment))
    print('ROLLBACK;')
