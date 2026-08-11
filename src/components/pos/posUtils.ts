import { Zap, Smartphone, Layers, Power, Volume2, Mic, Cpu, Wifi, Scan, ListChecks, LucideIcon } from 'lucide-react';
import { WorkOrder } from '../../types';

/** Shared helpers extracted from PosInvoicingModule (Ko Hein 2026-08-11). */

export const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export const normalizeText = (value: string) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// Signed MMK formatting for profit rows — a negative result must display as a
// real loss, never a clamped 0 (audit A-P3-3).
export const signedMoney = (n: number) =>
  `${n < 0 ? '−' : '+'}${Math.abs(Math.round(n)).toLocaleString()}`;

export const getLineItemIcon = (description: string): LucideIcon => {
  const text = normalizeText(description);
  if (text.includes('battery')) return Zap;
  if (text.includes('display') || text.includes('touch') || text.includes('lcd')) return Smartphone;
  if (text.includes('backglass') || text.includes('housing')) return Layers;
  if (text.includes('charing') || text.includes('charging') || text.includes('flex')) return Power;
  if (text.includes('speaker') || text.includes('ear') || text.includes('ring')) return Volume2;
  if (text.includes('mic')) return Mic;
  if (text.includes('logic') || text.includes('rf layer') || text.includes('no power')) return Cpu;
  if (text.includes('network') || text.includes('wifi') || text.includes('pay') || text.includes('nfc')) return Wifi;
  if (text.includes('face id') || text.includes('key') || text.includes('sensor')) return Scan;
  return ListChecks;
};

export const INVENTORY_CATEGORY_GROUPS: Array<{ match: RegExp; categories: string[] }> = [
  {
    match: /\bbattery\b/,
    categories: ['Battery', 'Battery Cell', 'Battery Genuine'],
  },
  {
    match: /\bback\s*glass\b|\bbackglass\b/,
    categories: ['Backglass', 'Backglass Ring', 'Back Glass', 'Back Glass Ring', 'Backglass Replacement'],
  },
  {
    match: /\bdisplay\b|\boled\b|\blcd\b/,
    categories: ['Display', 'Display GX (OLED)', 'Display Soft-OLED', 'Display Original', 'Display Original IDM', 'LCD'],
  },
  {
    match: /\bcharging\b|\bcharge\b|\bport\b/,
    categories: ['Charging Flex', 'Charging Board', 'Charging Port'],
  },
  {
    match: /\bear speaker\b|\bspeaker\b/,
    categories: ['Ear Speaker', 'Ring Speaker / Loudspeaker', 'Loudspeaker', 'Ring Speaker'],
  },
  {
    match: /\bmicrophone\b/,
    categories: ['Microphone', 'Mic', 'Audio IC'],
  },
  {
    match: /\bface id\b|\btruedepth\b/,
    categories: ['Face ID', 'TrueDepth', 'Face ID / TrueDepth'],
  },
  {
    match: /\bwifi\b|\bbluetooth\b/,
    categories: ['Wifi & Bluetooth IC Repair', 'WiFi & Bluetooth IC', 'Wifi / Bluetooth'],
  },
  {
    match: /\bnetwork\b|\bbaseband\b/,
    categories: ['Network / Baseband IC Repair', 'RF Layer Swap (Baseband)', 'Baseband Layer', 'RF Layer'],
  },
  {
    match: /\bapple pay\b|\bnfc\b/,
    categories: ['Apple Pay & NFC IC Repair', 'NFC', 'Apple Pay'],
  },
  {
    match: /\bpower\b|\bvolume\b|\bkey\b/,
    categories: ['Power & Volume Key Flex', 'Power Button', 'Volume Key Flex'],
  },
  {
    match: /\bcamera\b|\bfront cam\b|\brear cam\b|\bois\b/,
    categories: ['Front Camera', 'Rear Camera', 'Camera Module', 'Main Camera', 'Camera'],
  },
  {
    match: /\blogic board\b|\bmicro\s*soldering\b|\bic\b|\bno power\b/,
    categories: ['Logic Board Micro-Soldering', 'Logic Layer Swap (Double Deck)', 'RF Layer Swap (Baseband)', 'No Power Short Circuit Repair', 'No Power Logic IC Repair'],
  },
];

export const repairSummaryOf = (wo: WorkOrder): string => {
  const repairs = (wo.selectedRepairs || []).filter((r) => r && r.name);
  if (repairs.length > 0) return repairs.map((r) => r.name).join(', ');
  const items = (wo.lineItems || []).map((li) => li.description || li.partName || '').filter(Boolean);
  if (items.length > 0) return items.join(', ');
  return wo.symptomsReported || 'General Repair';
};
