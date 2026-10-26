import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {splitSql,executeRollbackProbe} from '../scripts/t19-b02-node24-runner.mjs';

test('exact approved B02 SQL preserves transaction and DO blocks',async()=>{
 const s=await readFile(new URL('../docs/proposals/t19-b02-managed-role-rollback.sql',import.meta.url),'utf8');
 const statements=splitSql(s);
 const clean=x=>x.replace(/^(?:\s*--[^\n]*\n)*/,'').trim();
 assert.match(clean(statements[0]),/^BEGIN;/);
 assert.match(clean(statements.at(-2)),/^ROLLBACK;/);
 assert.match(clean(statements.at(-1)),/^SELECT /);
 assert.equal(statements.filter(x=>/DO \$denial\$/.test(x)).length,1);
 assert.equal(statements.filter(x=>/DO \$abort_probe\$/.test(x)).length,1);
 assert.equal(statements.filter(x=>/CREATE ROLE t19_b02_qa_/.test(x)).length,2);
 assert.ok(statements.length>=15);
});
test('reject trailing SQL and unsupported psql meta commands',()=>{
 assert.throws(()=>splitSql('BEGIN; SELECT 1'),/trailing/);
 assert.throws(()=>splitSql('\\echo forbidden\nBEGIN;'),/meta-command/);
});
test('single quoted semicolons and dollar quoted bodies stay intact',()=>{
 assert.equal(splitSql("DO $x$ BEGIN PERFORM 'a;b'; END $x$; ROLLBACK;").length,2);
});

test('rollback probe succeeds only after rollback and zero scratch readback',async()=>{
 const seen=[];
 const client={query:async sql=>{seen.push(sql);return sql==='SELECT final'?{rows:[{leftover_roles:0,leftover_schemas:0,leftover_functions:0}]}:{rows:[]};}};
 await executeRollbackProbe(client,['BEGIN;','DO $x$ BEGIN NULL; END $x$;','ROLLBACK;','SELECT final']);
 assert.deepEqual(seen,['BEGIN;','DO $x$ BEGIN NULL; END $x$;','ROLLBACK;','SELECT final']);
});
test('execution failure triggers same-client rollback and never claims success',async()=>{
 const seen=[];
 const client={query:async sql=>{seen.push(sql);if(sql==='FAIL')throw Object.assign(new Error('denied'),{code:'42501'});return {rows:[]};}};
 await assert.rejects(executeRollbackProbe(client,['BEGIN;','FAIL','ROLLBACK;','SELECT final']),{code:'42501'});
 assert.deepEqual(seen,['BEGIN;','FAIL','ROLLBACK']);
});
test('rollback failure is an explicit unknown outcome',async()=>{
 const client={query:async sql=>{if(sql==='BEGIN;')return {rows:[]};throw new Error('connection failed');}};
 await assert.rejects(executeRollbackProbe(client,['BEGIN;','FAIL','ROLLBACK;','SELECT final']),/Rollback uncertain/);
});
test('nonzero final scratch state is failure even after rollback',async()=>{
 const client={query:async sql=>sql==='SELECT final'?{rows:[{leftover_roles:1,leftover_schemas:0,leftover_functions:0}]}:{rows:[]}};
 await assert.rejects(executeRollbackProbe(client,['BEGIN;','ROLLBACK;','SELECT final']),/Scratch objects remained/);
});
