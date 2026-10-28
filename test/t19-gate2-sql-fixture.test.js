// Embedded PostgreSQL/WASM source regression only. Not native Gate 2 acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const source=await readFile(new URL('../database/t19-gate2-disposable-integrity.sql',import.meta.url),'utf8');
const transaction=source.slice(source.indexOf('BEGIN;'),source.indexOf('ROLLBACK;')+'ROLLBACK;'.length);
const denial=source.slice(source.indexOf('DO $$'),source.indexOf('END $$;')+'END $$;'.length);
test('embedded engine executes permitted/denied/duplicate/collision SQL and rolls back synthetic objects',async t=>{
 const db=new PGlite();t.after(()=>db.close());const notices=[];
 const before=(await db.query('select oid,rolname from pg_roles order by oid')).rows;
 await db.exec(transaction,{onNotice:n=>notices.push(n.message)});
 for(const marker of ['T19_ALLOWED_WRITE_PASS','T19_SQLSTATE_42501_PASS','T19_DUPLICATE_23505_PASS','T19_COLLISION_42P06_PASS','T19_COLLISION_55000_PASS'])assert.equal(notices.filter(n=>n===marker).length,1,marker);
 assert.deepEqual((await db.query('select oid,rolname from pg_roles order by oid')).rows,before);
 const final=(await db.query("select to_regnamespace('t19_gate2_synthetic') is null as absent,current_user=session_user as restored")).rows[0];
 assert.deepEqual(final,{absent:true,restored:true});
});
test('denial fixture cannot misclassify inability to SET ROLE as protected-table denial',async t=>{
 const db=new PGlite();t.after(()=>db.close());const notices=[];
 // SET ROLE is checked against session_user, not just current_user. Model a
 // genuine unprivileged session rather than a superuser temporarily SET ROLE.
 await db.exec('create role t19_gate2_denied nologin;create role t19_unprivileged nologin;create schema t19_gate2_synthetic;create table t19_gate2_synthetic.protected(id integer,value text);set session authorization t19_unprivileged;');
 await assert.rejects(db.exec(denial,{onNotice:n=>notices.push(n.message)}),e=>e.code==='42501');
 assert.equal(notices.includes('T19_SQLSTATE_42501_PASS'),false);
 await db.exec('reset session authorization;');
});
