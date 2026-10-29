import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {IMAGES} from '../scripts/t19-bootstrap-engine.mjs';
import {verifyImageLineage,verifyCoreExtensionBootstrap,Host} from '../scripts/t19-bootstrap-host.mjs';
const root=new URL('../',import.meta.url);
const lineage=JSON.parse(readFileSync(new URL('config/t19-bootstrap-images.json',root)));
test('built derivative pins bind both parent chains and only the three reviewed changed files',()=>{
 assert.equal(lineage.scope,'owner-signed-synthetic-only');
 for(const [kind,id] of Object.entries(IMAGES))assert.equal(lineage.images[kind].imageId,id);
 assert.equal(lineage.images.postgres.layers,32);assert.deepEqual(lineage.images.postgres.ancestors.map(x=>x.layers),[30,29]);
 assert.equal(lineage.images.storage.layers,16);assert.deepEqual(lineage.images.storage.ancestors.map(x=>x.layers),[14]);
 const manifest=JSON.parse(readFileSync(new URL('config/t19-bootstrap-files.json',root)));
 for(const [component,path,source] of [
  ['postgres','/docker-entrypoint-initdb.d/migrate.sh','test-support/t19-postgres-stat-owner/migrate.sh'],
  ['storage','/app/migrations/tenant/0002-storage-schema.sql','test-support/t19-storage-history/0002-storage-schema.sql'],
  ['storage','/app/migrations/tenant/0062-object-versioning-core.sql','test-support/t19-storage-history/0062-object-versioning-core.sql']
 ])assert.equal(manifest.files.find(x=>x.component===component&&x.path===path).sha256,createHash('sha256').update(readFileSync(new URL(source,root))).digest('hex'));
});
test('lineage verification rejects wrong ancestors, layer prefixes, configuration and platforms',()=>{
 const id=x=>'sha256:'+x.repeat(64),config={User:'',Env:['PATH=/bin']};
 const image={Id:id('a'),Os:'linux',Architecture:'amd64',Config:config,RootFS:{Layers:['one','two','copy','docs']}};
 const parent={Id:id('b'),Os:'linux',Architecture:'amd64',Config:config,RootFS:{Layers:['one','two']}};
 const original={Id:id('c'),Os:'linux',Architecture:'amd64',Config:config,RootFS:{Layers:['one']}};
 const policy={imageId:image.Id,layers:4,ancestors:[{imageId:parent.Id,layers:2},{imageId:original.Id,layers:1}]};
 verifyImageLineage(image,[parent,original],policy);
 for(const change of [x=>x[0].Id=id('d'),x=>x[1].RootFS.Layers[0]='other',x=>x[0].Config={User:'0'},x=>x[0].Architecture='arm64',x=>x.pop()]){
  const xs=structuredClone([parent,original]);change(xs);assert.throws(()=>verifyImageLineage(image,xs,policy));
 }
 const changed=structuredClone(image);changed.RootFS.Layers.push('unexpected');assert.throws(()=>verifyImageLineage(changed,[parent,original],policy));
});
test('core-extension startup gate requires source owners and restored redirection configuration',()=>{
 const extensions=[['pg_stat_statements','1.11'],['pgcrypto','1.3'],['uuid-ossp','1.1']].map(([name,version])=>({name,version,schema:'extensions',owner:'postgres'}));
 const actual={extensions,privilegedExtensions:'btree_gist, pg_stat_statements, pgcrypto, uuid-ossp'};verifyCoreExtensionBootstrap(actual);
 verifyCoreExtensionBootstrap({...actual,extensions:[...extensions].reverse()});
 for(const change of [x=>x.extensions[0].owner='supabase_admin',x=>x.extensions[1].version='other',x=>x.extensions.pop(),x=>x.extensions[2]=x.extensions[0],x=>x.privilegedExtensions='',x=>x.privilegedExtensions=null,x=>x.extensions[2].schema='public']){
  const x=structuredClone(actual);change(x);assert.throws(()=>verifyCoreExtensionBootstrap(x),/POSTGRES_EXTENSION_OWNER_OR_CONFIG/);
 }
});
test('failed extension gate retains the actual readback before cleanup without a success record',async()=>{
 const h=Object.create(Host.prototype),records=[];
 h.record=async(kind,value)=>records.push({kind,value:structuredClone(value)});
 const actual={extensions:[{name:'pgcrypto',version:'1.3',schema:'extensions',owner:'supabase_admin'}],privilegedExtensions:'pgcrypto'};
 await assert.rejects(h.coreExtensionGate(actual),/POSTGRES_EXTENSION_OWNER_OR_CONFIG/);
 assert.deepEqual(records,[{kind:'postgres-extension-readback',value:actual}]);
});
