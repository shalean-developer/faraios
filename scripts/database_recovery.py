"""Recovery metadata: no customer values are returned, only counts and fingerprints."""
import json

def literal(value):return "'"+value.replace("'","''")+"'"
def ident(value):return '"'+value.replace('"','""')+'"'
def table_query(schemas):
 return "select coalesce(json_agg(json_build_array(n.nspname,c.relname) order by n.nspname,c.relname),'[]'::json) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and not c.relispartition and n.nspname in ("+','.join(map(literal,schemas))+")"
def fingerprints(sql,schemas):
 tables=json.loads(sql(table_query(schemas)))
 if not tables:raise ValueError('No tables in recovery scope')
 parts=[]
 for schema,table in tables:
  parts.append('select '+literal(schema+'.'+table)+" as name,count(*)::text as rows,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text collate \"C\"),'')) as fingerprint from "+ident(schema)+'.'+ident(table)+' t')
 return json.loads(sql("select json_object_agg(name,json_build_object('rows',rows,'fingerprint',fingerprint) order by name) from ("+' union all '.join(parts)+') f'))
def schema_grants(sql,schemas):
 return json.loads(sql("select coalesce(json_agg(json_build_object('schema',n.nspname,'grantee',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by n.nspname,a.grantee,a.privilege_type),'[]'::json) from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a where n.nspname in ("+','.join(map(literal,schemas))+")"))
