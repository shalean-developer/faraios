import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../test-support/t19-local-disposable-rollback.sql',import.meta.url),'utf8');
test('local T19 fixture is pinned to disposable identity and explicit rollback',()=>{
  assert.match(sql,/current_database\(\) <> 'faraios_t19_local_qa'/);
  assert.match(sql,/current_setting\('faraios\.t19_local_qa',true\) IS DISTINCT FROM 'isolated-synthetic-only'/);
  assert.match(sql,/current_user <> 'postgres' OR session_user <> 'postgres'/);
  assert.match(sql,/\\set ON_ERROR_STOP on/);
  assert.match(sql,/EXCEPTION WHEN insufficient_privilege/);
  assert.match(sql,/RETURNED_SQLSTATE/);
  assert.match(sql,/IF observed <> '42501'/);
  assert.match(sql,/EXCEPTION WHEN SQLSTATE '55000'/);
  assert.match(sql,/^ROLLBACK;/m);
  assert.doesNotMatch(sql,/CREATE EXTENSION|\\\\connect|private_t19_custody|xdmfyrsauvqznkloroxg/i);
  assert.equal((sql.match(/^BEGIN;/gm)||[]).length,1);
  assert.equal((sql.match(/^ROLLBACK;/gm)||[]).length,1);
});
