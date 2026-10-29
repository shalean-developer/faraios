import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const base=new URL('../test-support/t19-realtime-bootstrap/',import.meta.url);
const sql=readFileSync(new URL('tenant_db_dump_17.sql',base));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('Realtime PG17 fixture preserves exact immutable upstream bytes',()=>{
 assert.equal(sha(sql),'f98beb234131e3295d2d7651607db5b79a754b7c745b1a853ba0e1b76f757c47');
 assert.equal(sha(readFileSync(new URL('LICENSE',base))),'56351b5c92da783a59b13835c13dcdae5f6b2da04baaf69f4b02a9429f2c334e');
});
test('Realtime fixture contains the reviewed tenant boundary, not the later index migration',()=>{
 const versions=[...sql.toString().matchAll(/INSERT INTO realtime\."schema_migrations" \(version\) VALUES \((\d+)\);/g)].map(m=>m[1]);
 assert.equal(versions.length,91);assert.equal(new Set(versions).size,91);
 assert.equal(versions.at(-1),'20261009120000');assert.ok(!versions.includes('20261027120000'));
});
