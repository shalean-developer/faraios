import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('T19 Vault source preserves managed grants and uses installed function identity', async () => {
 const sql=await readFile(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8');
 assert.match(sql,/grant execute on function vault\.create_secret\(text,text,text,uuid\) to t19_runtime_owner;/i);
 assert.match(sql,/grant select on vault\.decrypted_secrets to t19_runtime_owner;/i);
 assert.doesNotMatch(sql,/revoke\s+(?:all|execute|select)\s+on\s+(?:all\s+tables|all\s+functions|(?:table|function))\s+in\s+schema\s+vault/i);
 assert.doesNotMatch(sql,/revoke\s+.*\bvault\./i);
 assert.doesNotMatch(sql,/grant execute on function vault\.create_secret\(text,text,text\)/i);
});
