import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const root=new URL('../',import.meta.url);
const proposal=JSON.parse(await readFile(new URL('config/t19-storage-history-proposal.json',root),'utf8'));
const hash=(bytes,algorithm)=>createHash(algorithm).update(bytes).digest('hex');
test('vendored public history is byte-bound to both verified historical revisions',async()=>{
 assert.equal(proposal.upstreamGitCommit,'db42280506a07a165376219b2d6ac7bc92ccdfcc');assert.deepEqual(proposal.files.map(f=>f.id),[2,62]);
 for(const f of proposal.files){const bytes=await readFile(new URL(proposal.context+'/'+f.fileName,root));assert.equal(hash(bytes,'sha256'),f.sourceSha256);assert.equal(hash(Buffer.concat([Buffer.from(f.fileName),bytes]),'sha1'),f.publicLedgerSha1);}
 assert.equal(hash(await readFile(new URL(proposal.context+'/LICENSE',root)),'sha256'),proposal.licenseSha256);
});
test('recipe adds two exact vendor files and attribution without running SQL or activating a runtime',async()=>{
 assert.equal(proposal.executionAllowed,false);assert.equal(proposal.runtimeActivationAllowed,false);
 assert.equal(proposal.baseImage,'supabase/storage-api@sha256:b8f956b64ea3aee1dfc2cd9f0c9ce8d74335405992a90281bb5a979d1d552c22');
 const recipe=await readFile(new URL(proposal.context+'/Dockerfile',root),'utf8');
 assert.deepEqual(recipe.split('\n').filter(l=>l&&!l.startsWith('#')),[
  'FROM '+proposal.localBaseTag,
  'COPY --chown=0:0 --chmod=0644 0002-storage-schema.sql 0062-object-versioning-core.sql /app/migrations/tenant/',
  'COPY --chown=0:0 --chmod=0644 LICENSE NOTICE /usr/share/doc/faraios-t19-storage-history/'
 ]);
 const active=JSON.parse(await readFile(new URL('config/t19-bootstrap-files.json',root),'utf8'));
 for(const f of proposal.files){const p=active.files.find(x=>x.component==='storage'&&x.path==='/app/migrations/tenant/'+f.fileName);assert.ok(p);assert.equal(p.sha256,f.sourceSha256);}
});
test('historical migration 62 enforces disabled versioning and rejects a real enabling write',async()=>{
 const db=new PGlite();try{
  await db.exec("SET storage.install_roles='false';");
  await db.exec(await readFile(new URL(proposal.context+'/0002-storage-schema.sql',root),'utf8'));
  // Minimal prerequisite fixture for this isolated migration, not a full 1–73 bootstrap.
  await db.exec("ALTER TABLE storage.buckets ADD COLUMN type text NOT NULL DEFAULT 'STANDARD';");
  await db.exec(await readFile(new URL(proposal.context+'/0062-object-versioning-core.sql',root),'utf8'));
  await db.exec("INSERT INTO storage.buckets(id,name) VALUES ('synthetic-history','synthetic-history');");
  await assert.rejects(db.exec("UPDATE storage.buckets SET versioning_status='ENABLED' WHERE id='synthetic-history';"),e=>e.code==='23514');
  assert.equal((await db.query("SELECT versioning_status FROM storage.buckets WHERE id='synthetic-history'")).rows[0].versioning_status,'DISABLED');
  const constraints=(await db.query("SELECT conname,convalidated FROM pg_constraint WHERE conrelid='storage.buckets'::regclass AND conname='buckets_versioning_dark_check'")).rows;assert.deepEqual(constraints,[{conname:'buckets_versioning_dark_check',convalidated:true}]);
 }finally{await db.close();}
});
