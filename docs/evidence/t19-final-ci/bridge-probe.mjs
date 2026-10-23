import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const input='Réka 😀\nsecond line\n';
const env={...process.env,PGHOST:'synthetic-host',PGPASSWORD:'synthetic-only'};
const result=spawnSync('docker',['run','--rm','--network','none','--label','faraios.scope=t19-bridge-probe','--interactive','--env','PGHOST','--env','PGPASSWORD','--entrypoint','/bin/sh','postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826','-c','test "$PGHOST" = synthetic-host && test "$PGPASSWORD" = synthetic-only && cat'],{env,input,encoding:'utf8',timeout:30000});
console.log('BRIDGE_EXIT='+result.status);
console.log('BRIDGE_ENV_AND_UNICODE_ROUNDTRIP='+(result.status===0&&result.stdout===input?'PASS':'FAIL'));
assert.equal(result.status,0,'Synthetic environment must survive Linux-to-Windows Docker invocation');
assert.equal(result.stdout,input,'Unicode and LF stdin/stdout must remain unchanged');
