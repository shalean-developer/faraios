// Reviewed live bindings belong only in the protected local profile.
export function validateScope(p,source) {
 const keys=['application','catalog','id','managed','source','tables','version'];
 if(!p || JSON.stringify(Object.keys(p).sort())!==JSON.stringify(keys) || p.version!==2 || p.source!==source ||
  typeof p.id!=='string' || !/^[a-z][a-z0-9-]{0,63}$/.test(p.id) ||
  !['catalog','application','managed'].every(k=>typeof p[k]==='string' && /^[a-f0-9]{64}$/.test(p[k])) ||
  !Array.isArray(p.tables) || p.tables.length===0 || p.tables.length>1000 ||
  p.tables.some(n=>typeof n!=='string'||!/^(public|audit)\.[a-z_][a-z0-9_]{0,62}$/.test(n)) ||
  new Set(p.tables).size!==p.tables.length || JSON.stringify([...p.tables].sort())!==JSON.stringify(p.tables) ||
  !['public.','audit.'].every(prefix=>p.tables.some(n=>n.startsWith(prefix)))) throw new Error('PRIVATE_PROFILE_INVALID');
 return Object.freeze({...p,tables:Object.freeze([...p.tables])});
}
export function matchesCurrentScope(m,scope) {
 if(!scope || !Array.isArray(m?.tables))return false;
 const tables=m.tables.filter(t=>['public','audit'].includes(t.schema));
 const names=tables.map(t=>t.schema+'.'+t.table).sort();
 return m.scope===scope.id && m.catalog_sha256===scope.catalog &&
  m.restore_catalog?.application===scope.application && m.restore_catalog?.managed===scope.managed &&
  JSON.stringify(names)===JSON.stringify(scope.tables) && tables.every(t=>t.owner==='postgres' && t.rls===true);
}

// Reuse both existing projections in the same read-only snapshot. Empty search
// path makes the portable restore projection agree with restore verification.
export function currentManifestSQL(raw,portable,scope) {
 // Only the current projection omits mutable sequence values from the pinned
 // schema hash. Keep them separately in the before/after capture manifest.
 const sequenceCatalog="jsonb_agg(to_jsonb(s) order by s.schemaname,s.sequencename) from pg_sequences s";
 if(raw.split(sequenceCatalog).length!==2)throw new Error('MANIFEST_PROJECTION_CHANGED');
 return raw.replace(sequenceCatalog,"jsonb_agg(to_jsonb(s)-'last_value' order by s.schemaname,s.sequencename) from pg_sequences s").replace("set local timezone = 'UTC';", "set local timezone = 'UTC';\nset local search_path = '';" )
  .replace("select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls", "select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls,pg_get_userbyid(c.relowner) as owner")
  .replace(" 'database_major',", " 'catalog_version',2,\n 'sequence_state',(select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'sequence',sequencename,'last_value',last_value::text) order by schemaname,sequencename),'[]'::jsonb) from pg_sequences where schemaname in ('public','audit','auth','storage','supabase_migrations')),\n 'scope','"+scope.id+"',\n 'restore_catalog',(select catalog from ("+portable.trim().replace(/;$/,'')+") portable),\n 'database_major',")
  .replace("'table',table_name,'rls',rls", "'table',table_name,'owner',owner,'rls',rls");
}
