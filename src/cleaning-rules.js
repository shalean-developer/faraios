/** Isolated rule contracts. No live rates, provider calls or persistence.
 * Authenticate and authorise business configuration writes before using this module.
 */
const text = v => typeof v === 'string' && v.trim().length > 0;
const integer = v => Number.isSafeInteger(v) && v >= 0;
const fail = message => { throw new TypeError(message); };

export function validateCleaningRules(rules, businessId) {
  if (!text(businessId) || !rules || rules.businessId !== businessId) fail('Business scope mismatch');
  if (!text(rules.version)) fail('Rule version required');
  if (rules.currency !== 'ZAR') fail('V1 contract supports ZAR only');
  const p = rules.pricing;
  if (!p || !['fixed', 'hourly', 'per_unit'].includes(p.model) || !integer(p.rateCents)) fail('Invalid pricing model or integer-cent rate');
  const e = rules.earnings;
  if (!e || !['fixed_per_worker', 'percentage_pool'].includes(e.model)) fail('Invalid earnings model');
  if (e.model === 'fixed_per_worker' && !integer(e.rateCents)) fail('Invalid worker rate');
  if (e.model === 'percentage_pool' && (!integer(e.basisPoints) || e.basisPoints > 10000)) fail('Invalid earnings percentage');
  if (rules.payoutSchedule !== 'monthly_bank_transfer') fail('Unsupported payout schedule');
  // No defaults for policies that affect customer rights or financial outcomes.
  if (!text(rules.cancellationPolicyVersion) || !text(rules.recurrencePolicyVersion)) fail('Explicit policy references required');
  return true;
}

export function createPriceSnapshot({ businessId, rules, quantity }) {
  validateCleaningRules(rules, businessId);
  // Fixed prices always represent exactly one service, preventing accidental multiplication.
  if (!Number.isSafeInteger(quantity) || quantity < 1 || (rules.pricing.model === 'fixed' && quantity !== 1)) fail('Invalid quantity');
  const amountCents = rules.pricing.rateCents * quantity;
  if (!Number.isSafeInteger(amountCents)) fail('Amount exceeds safe integer limit');
  return Object.freeze({businessId,ruleVersion:rules.version,currency:rules.currency,model:rules.pricing.model,rateCents:rules.pricing.rateCents,quantity,amountCents,cancellationPolicyVersion:rules.cancellationPolicyVersion,recurrencePolicyVersion:rules.recurrencePolicyVersion});
}

// These are only synthetic examples for contract tests, not active business policies.
// Earnings distribution, extras, taxes, discounts and settlement are not implemented.
