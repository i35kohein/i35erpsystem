// Lite mode: a stripped-down build of the ERP WITHOUT Inventory/Suppliers.
// Enabled at build time with VITE_APP_LITE=1 (deployed as erplite.i35appleservice.com).
//
// In lite mode:
//  - the inventory + suppliers modules do not exist (nav, routes, settings)
//  - parts/suppliers collections are not subscribed (no stock data in memory)
//  - POS runs labor-only (parts line items simply never appear)
//  - Finance hides the Parts Profit sub-tab & inventory asset valuation
//  - Dashboard hides the Inventory sub-tab and inventory fund widgets
//
// The data model (workOrders, customers, technicians, etc.) is unchanged, so
// the same Supabase project can be shared — or pointed at a fresh project via
// .env.lite for a standalone deployment.

export const LITE_MODE = import.meta.env.VITE_APP_LITE === '1';

/** Module ids that do not exist in the lite build. */
export const LITE_HIDDEN_MODULES = ['inventory', 'suppliers'] as const;

export function isLiteHiddenModule(moduleId: string): boolean {
  return LITE_MODE && (LITE_HIDDEN_MODULES as readonly string[]).includes(moduleId);
}
