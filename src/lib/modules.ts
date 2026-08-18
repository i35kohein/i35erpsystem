// Module registry — single source of truth for which sidebar modules exist
// and can be hidden from Settings > Modules & Visibility (Ko Hein 2026-08-14).
//
// The ids here MUST match the sidebar item ids in Navigation.tsx and the
// `activeTab === '<id>'` render branches in App.tsx.
//
// `dashboard`, `settings` and `create-ticket` are NOT in this list on purpose:
// the dashboard is the landing view, Settings is the only way to re-enable a
// hidden module, and the Intake Ticket button is the primary CTA. They can
// never be disabled.

import { isLiteHiddenModule } from './lite';

export interface ModuleDef {
  /** Sidebar/tab id (must match Navigation.tsx item ids). */
  id: string;
  /** Short label shown in the settings list. */
  label: string;
  /** One-line plain-English description (Ko Hein's UI preference). */
  description: string;
  /** Which settings menu group this module appears in (informational). */
  group: string;
}

export const MODULES: ModuleDef[] = [
  // Repair
  { id: 'intake', label: 'Intake', description: 'New work order intake & ticket creation', group: 'Repair' },
  { id: 'simple-ticket', label: 'Simple Ticket', description: 'Quick ticket entry for walk-in repairs', group: 'Repair' },
  { id: 'trello', label: 'Ticket Board', description: 'Kanban-style ticket board (pipeline view)', group: 'Repair' },
  { id: 'qa', label: 'QA & Checklist', description: 'Post-repair QA checklist & diagnostics', group: 'Repair' },
  { id: 'follow-up', label: 'Follow-up Calls', description: 'Customer follow-up & satisfaction tracking', group: 'Repair' },
  { id: 'price-catalog', label: 'Price List', description: 'Repair price catalog & model pricing', group: 'Repair' },

  // Finance
  { id: 'pos', label: 'POS & Checkout', description: 'Point-of-sale checkout & payments', group: 'Finance' },
  { id: 'finance', label: 'Finance', description: 'Revenue, profit, commissions & reports', group: 'Finance' },

  // Inventory
  { id: 'inventory', label: 'Inventory', description: 'Parts stock, bins & reorder points', group: 'Inventory' },
  { id: 'suppliers', label: 'Suppliers', description: 'Supplier & RMA tracking', group: 'Inventory' },

  // Management
  { id: 'crm', label: 'CRM', description: 'Customer records & history', group: 'Management' },
  { id: 'mermaid', label: 'Workflow Diagram', description: 'Process/workflow diagram view', group: 'Management' },
].filter((m) => !isLiteHiddenModule(m.id));

/** Module ids that are always on and can never be disabled. */
export const ALWAYS_ON_MODULE_IDS = ['dashboard', 'settings', 'create-ticket'];

export function isModuleEnabled(disabledModules: string[] | undefined, moduleId: string): boolean {
  if (ALWAYS_ON_MODULE_IDS.includes(moduleId)) return true;
  if (isLiteHiddenModule(moduleId)) return false;
  return !(disabledModules || []).includes(moduleId);
}
