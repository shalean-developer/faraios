import test from 'node:test';
import assert from 'node:assert/strict';
import {GREENFIELD_T31_FILES} from '../src/t31-greenfield-manifest.js';

test('T31 greenfield source order is complete and isolated', () => {
  const files=GREENFIELD_T31_FILES;
  assert.equal(files.length,13);
  assert.equal(new Set(files).size,13);
  assert.equal(files[0],'database/identity-draft.sql');
  assert.equal(files[1],'database/audit-draft.sql');
  assert.ok(files.indexOf('database/bookings-draft.sql')<files.indexOf('database/staff-teams-draft.sql'));
  assert.ok(files.indexOf('database/t31-provisioning-candidate.sql')<files.indexOf('database/t31-branding-candidate.sql'));
  assert.ok(files.every(path=>path.startsWith('database/')));
});
