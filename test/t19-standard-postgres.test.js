import test from 'node:test';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {standardPostgresOptions} from '../src/t19-standard-postgres.js';
test('staging database configuration pins project, session pooler, role and verified TLS',()=>{
 const c={password:randomBytes(24).toString('hex'),ca:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----'};
 const o=standardPostgresOptions(c);assert.equal(o.port,5432);assert.equal(o.ssl.rejectUnauthorized,true);assert.equal(o.host,'aws-0-eu-west-1.pooler.supabase.com');assert.equal(o.user,'t19_standard_backend.xdmfyrsauvqznkloroxg');
 for(const extra of [{host:'other'},{port:6543},{user:'postgres'},{ssl:false}])assert.throws(()=>standardPostgresOptions({...c,...extra}));
 assert.throws(()=>standardPostgresOptions({...c,ca:''}));assert.throws(()=>standardPostgresOptions({...c,password:''}));
});
