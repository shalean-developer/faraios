import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {COMPONENTS,COMPONENT_PREFIX,ROLLBACK_MARKER,validateSchemaReplay,catalogComponentsSQL,parseDiagnosticOutput,compareCatalogComponents,diagnosticSQL,validateSequenceState} from '../scripts/restore-diagnostic.mjs';
import {RESTORE_CONFIG,restoreArchive} from '../scripts/restore-staging.mjs';

test('normal import and sequence completion are held before any file, key or network access',async()=>{
 assert.equal(RESTORE_CONFIG.importEnabled,false);
 for(const mode of ['restore','finish-sequences'])await assert.rejects(restoreArchive({archive:'never-read',password:'never-used',mode,runner:()=>{throw Error('must not run');}}),{code:'RESTORE_IMPORT_ON_HOLD'});
});
test('native schema envelope ignores quoted bodies/comments but rejects transaction, role, connection and data commands',()=>{
 const safe=`-- COMMIT; \\connect private\n/* outer /* END; */ ABORT; */\nCREATE FUNCTION public.example() RETURNS text LANGUAGE plpgsql AS $fn$ BEGIN RETURN 'COMMIT; SET ROLE other;'; END $fn$;
 CREATE FUNCTION public.quoted() RETURNS text LANGUAGE sql AS 'select ''ROLLBACK;''';
 SELECT pg_catalog.set_config('search_path', '', false);\nSET check_function_bodies=false;\nRESET ALL;`;
 assert.equal(validateSchemaReplay(safe),safe);
 for(const unsafe of ['COMMIT;','END;','ROLLBACK;','ABORT;','BEGIN;','START TRANSACTION;','PREPARE TRANSACTION \'probe\';','SET ROLE authenticated;','SET LOCAL "role" TO authenticated;','SET SESSION AUTHORIZATION postgres;','SET session_authorization=postgres;','RESET ROLE;','DISCARD ALL;','\\connect another','\\! private-command','COPY public.sample FROM stdin;','SELECT pg_catalog.set_config(\'role\',\'authenticated\',false);','SELECT 1;','DO $$BEGIN NULL;END$$;','CALL public.anything();','/* open','CREATE FUNCTION x() RETURNS text AS $fn$open'])assert.throws(()=>validateSchemaReplay(unsafe));
 assert.doesNotThrow(()=>validateSchemaReplay("CREATE FUNCTION public.escaped() RETURNS text LANGUAGE sql AS E'select \\'COMMIT;\\'';"));
 assert.doesNotThrow(()=>validateSchemaReplay('SET standard_conforming_strings=on;'));
 assert.throws(()=>validateSchemaReplay('SET standard_conforming_strings=off;'));
});
test('diagnostic projection derives from the unchanged full catalog and only reports fixed component labels',async()=>{
 const sql=await readFile(new URL('../scripts/restore-catalog.sql',import.meta.url),'utf8');
 const projected=catalogComponentsSQL(sql);assert.match(projected,/jsonb_each\(value\)/);assert.match(projected,/digest\(item::text/);assert.throws(()=>catalogComponentsSQL(sql+'\n'+sql));
 const expected=RESTORE_CONFIG.catalogComponents;assert.equal(expected.application.sha256,RESTORE_CONFIG.applicationCatalogSha256);assert.equal(expected.managed.sha256,RESTORE_CONFIG.managedCatalogSha256);
 assert.deepEqual(compareCatalogComponents(expected,expected),{matchingComponents:34,catalogMismatchComponents:[]});
 const actual=structuredClone(expected);actual.application.components.functions='0'.repeat(64);actual.application.sha256='1'.repeat(64);
 assert.deepEqual(compareCatalogComponents(actual,expected),{matchingComponents:33,catalogMismatchComponents:['APPLICATION_FUNCTIONS']});
 for(const mutate of [v=>v.application.components.extra='private',v=>delete v.managed.components.views,v=>v.application.components.columns='private-password',v=>v.application.sha256='0'.repeat(64)]){const v=structuredClone(expected);mutate(v);assert.throws(()=>compareCatalogComponents(v,expected));}
 assert.equal(COMPONENTS.length,17);
});
test('rollback acknowledgement and exact diagnostic shape are required; no raw output is returned',async()=>{
 const frame=COMPONENT_PREFIX+JSON.stringify(RESTORE_CONFIG.catalogComponents),valid=frame+'\n'+ROLLBACK_MARKER+'\n';
 assert.deepEqual(parseDiagnosticOutput(valid),RESTORE_CONFIG.catalogComponents);
 for(const text of [frame,valid+ROLLBACK_MARKER,valid+frame,ROLLBACK_MARKER+'\n'+frame,COMPONENT_PREFIX+'private-password\n'+ROLLBACK_MARKER])assert.throws(()=>parseDiagnosticOutput(text));
 const sql=await readFile(new URL('../scripts/restore-catalog.sql',import.meta.url),'utf8');
 const envelope=diagnosticSQL('-- reviewed schema replay\n',sql,"SET LOCAL search_path='';\n");
 assert.ok(envelope.indexOf('RESET ALL;')<envelope.indexOf(COMPONENT_PREFIX));assert.ok(envelope.indexOf('ROLLBACK;')>envelope.indexOf(COMPONENT_PREFIX));assert.ok(envelope.indexOf(ROLLBACK_MARKER)>envelope.indexOf('ROLLBACK;'));
 assert.ok(!envelope.includes('setval('));assert.ok(!envelope.includes('COMMIT;'));assert.ok(!envelope.includes('COPY '));
 for(const sequence_state of [[],['private',true],['1','true'],['9223372036854775808',false]])assert.throws(()=>validateSequenceState({sequence_state}));
 assert.deepEqual(validateSequenceState({sequence_state:['11',true]}),['11',true]);
});
