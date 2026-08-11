// Shared order-number / id generation for intake forms (audit B P2).
//
// The old per-form logic computed max-existing + 1 from the props snapshot, so
// two creates in the same tick produced the SAME number, and the regex
// /(\d+)\s*$/ matched legacy `wo-<13-digit-timestamp>` orderNumbers — the
// "next" number then became absurd (WO-2026-1712345678902) and stuck in the
// sequence. Also `wo-${Date.now()}` ids collide for same-millisecond creates.
//
// Fix: a module-scoped issued-numbers Set shared by all forms, a strict
// WO-\d{4}-\d+ regex for the sequence, and crypto.randomUUID() ids.

const issuedNumbers = new Set<string>();

/** Strict shape: WO-2026-1234. Legacy wo-<timestamp> ids are ignored. */
const ORDER_NUMBER_RE = /^([A-Za-z]+-)?(\d{4})-(\d+)$/;

export function nextOrderNumber(workOrders: Array<{ orderNumber?: string }>, ticketPrefix = 'WO-'): string {
  const year = new Date().getFullYear();
  let maxExistingNum = 1000;
  for (const wo of workOrders) {
    const match = ORDER_NUMBER_RE.exec(wo.orderNumber || '');
    if (!match) continue;
    const n = parseInt(match[3], 10);
    if (Number.isFinite(n)) maxExistingNum = Math.max(maxExistingNum, n);
  }
  const usedNumbers = new Set<string>();
  for (const wo of workOrders) {
    if (wo.orderNumber) usedNumbers.add(wo.orderNumber);
  }
  for (const n of issuedNumbers) usedNumbers.add(n);
  let nextNum = maxExistingNum + 1;
  while (usedNumbers.has(`${ticketPrefix}${year}-${nextNum}`) || issuedNumbers.has(`${ticketPrefix}${year}-${nextNum}`)) {
    nextNum += 1;
  }
  const orderNumber = `${ticketPrefix}${year}-${nextNum}`;
  issuedNumbers.add(orderNumber);
  return orderNumber;
}

/** Collision-safe id for work orders / customers / line items. */
export function uniqueId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}
