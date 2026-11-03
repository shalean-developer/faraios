import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderEft} from '../src/t21-eft.js';

// T30: render-only contract regression. This does not call a payment provider,
// submit financial evidence or exercise a hosted reconciliation action.
test('T30 EFT: existing payment form semantics survive narrow-screen layout fix',()=>{
 const html=renderEft({id:'synthetic-business',name:'Synthetic Business'},[{
  id:'synthetic-receipt',
  bank_reference:'SYNTHETIC-RECEIPT-LONG-REFERENCE-123456789',
  amount_cents:35500,
  received_on:'2026-11-02',
  evidence_reference:'SYNTHETIC-TEST-NO-FUNDS',
  invoice_id:null,
  verified_at:'2026-11-02T00:00:00Z',
  recorded_by:'synthetic-user',
  recorded_at:'2026-11-02T00:00:00Z',
  verified_by:'synthetic-user'
 }]);
 for(const section of ['eft-record','eft-payment','eft-receipts']){
  assert.ok(html.includes('class="panel '+section+'"'),section+' section');
 }
 for(const field of ['bankReference','evidenceReference','amount','receivedOn','invoice','invoiceId']){
  assert.ok(html.includes('name="'+field+'"'),field+' input');
 }
 for(const action of ['record','allocate']){
  assert.ok(html.includes('value="'+action+'"'),action+' action preserved');
 }
 assert.match(html,/SYNTHETIC-RECEIPT-LONG-REFERENCE/);
 assert.match(html,/Match verified payment/);
 const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
 for(const rule of ['.eft-record form>label','.eft-record form>label>input','.eft-payment form>label>input','.eft-receipts article']){
  assert.ok(css.includes(rule),rule+' style');
 }
 assert.match(css,/\.eft-receipts article\{[^}]*overflow-wrap:anywhere/);
 assert.match(css,/@media\(max-width:600px\)\{\s*\.eft-record form/);
});
