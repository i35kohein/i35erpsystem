// Model list sorting: iPhone newest → oldest, everything else after.
// Used by Inventory, POS, Price Catalog & Intake model pickers so the
// dropdown order is consistent app-wide.

const IPHONE_ORDER: string[] = [
  // iPhone 16 series
  'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e',
  // iPhone 15 series
  'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
  // iPhone 14 series
  'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
  // iPhone SE (3rd Gen) — 2022
  'iPhone SE (3rd Gen)',
  // iPhone 13 series
  'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 Mini',
  // iPhone 12 series
  'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 Mini',
  // iPhone SE 2 — 2020
  'iPhone SE 2', 'iPhone SE (2nd Gen)',
  // iPhone 11 series
  'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
  // iPhone XS / XR / X
  'iPhone Xs Max', 'iPhone XS Max', 'iPhone Xs', 'iPhone XS', 'iPhone XR', 'iPhone X',
  // iPhone 8 / 7 / 6s / 6 / SE (1st)
  'iPhone 8 Plus', 'iPhone 8',
  'iPhone 7 Plus', 'iPhone 7',
  'iPhone 6s Plus', 'iPhone 6s',
  'iPhone 6 Plus', 'iPhone 6',
  'iPhone SE (1st Gen)', 'iPhone SE',
];

const ORDER_INDEX = new Map<string, number>();
IPHONE_ORDER.forEach((name, i) => ORDER_INDEX.set(name.toLowerCase(), i));

/** Fallback generation number so unlisted variants still sort newest-first. */
function generationNumber(model: string): number {
  const m = model.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function isIPhone(model: string): boolean {
  return /^iphone/i.test(model.trim());
}

export function compareModelsNewestFirst(a: string, b: string): number {
  const aClean = a.trim();
  const bClean = b.trim();
  const aIsIPhone = isIPhone(aClean);
  const bIsIPhone = isIPhone(bClean);
  // Non-iPhones go after iPhones
  if (aIsIPhone !== bIsIPhone) return aIsIPhone ? -1 : 1;

  if (aIsIPhone && bIsIPhone) {
    const ai = ORDER_INDEX.get(aClean.toLowerCase());
    const bi = ORDER_INDEX.get(bClean.toLowerCase());
    if (ai !== undefined && bi !== undefined) return ai - bi;
    // Unknown variant: sort by generation desc, then name
    const genDiff = generationNumber(bClean) - generationNumber(aClean);
    if (genDiff !== 0) return genDiff;
    return aClean.localeCompare(bClean, undefined, { numeric: true, sensitivity: 'base' });
  }

  // Non-iPhone: alphabetical
  return aClean.localeCompare(bClean, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortModelsNewestFirst(models: string[]): string[] {
  return [...models].sort(compareModelsNewestFirst);
}
