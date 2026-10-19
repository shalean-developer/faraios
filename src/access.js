/** Pure policy core. Inputs MUST come from authenticated server-side storage.
 * This does not implement authentication, API enforcement or database RLS.
 */
const permissions = Object.freeze({
  owner: ['staff.read','staff.manage','catalogue.read','catalogue.manage','business.read', 'business.manage', 'members.manage', 'customers.read', 'customers.manage', 'bookings.read', 'bookings.manage', 'finance.read', 'invoices.manage', 'payments.record', 'payouts.approve', 'refunds.issue', 'payment_settings.manage'],
  manager: ['staff.read','catalogue.read','business.read', 'customers.read', 'customers.manage', 'bookings.read', 'bookings.manage', 'finance.read', 'invoices.manage', 'payments.record'],
  staff: ['business.read', 'jobs.assigned.read', 'jobs.assigned.update', 'earnings.own.read'],
});
const validId = value => typeof value === 'string' && value.trim().length > 0;

export function accessibleBusinesses(userId, memberships) {
  if (!validId(userId) || !Array.isArray(memberships)) return [];
  return [...new Set(memberships.filter(m => m && m.userId === userId && m.status === 'active' && validId(m.businessId) && Object.hasOwn(permissions, m.role)).map(m => m.businessId))];
}

export function canAccess({ userId, businessId, permission, memberships }) {
  if (!validId(userId) || !validId(businessId) || !validId(permission) || !Array.isArray(memberships)) return false;
  return memberships.some(m => m && m.userId === userId && m.businessId === businessId && m.status === 'active' && Object.hasOwn(permissions, m.role) && permissions[m.role].includes(permission));
}

export function canAccessOwnedRecord({ userId, businessId, permission, memberships, record }) {
  if (!record || record.businessId !== businessId || !canAccess({ userId, businessId, permission, memberships })) return false;
  if (permission === 'earnings.own.read') return record.userId === userId;
  if (permission === 'jobs.assigned.read' || permission === 'jobs.assigned.update') return Array.isArray(record.assignedUserIds) && record.assignedUserIds.includes(userId);
  return true;
}

