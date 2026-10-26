import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {splitSql} from '../scripts/t19-b02-node24-runner.mjs';

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
