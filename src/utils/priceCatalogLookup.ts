import { ModelRepairPrice, REPAIR_CATEGORIES, RepairCategoryDef } from '../types/priceCatalog';
import { INITIAL_REPAIR_PRICE_DATA } from '../data/repairPriceData';

export interface ModelRepairCatalogItem {
  id: string;
  categoryKey: string;
  name: string;
  group: RepairCategoryDef['group'];
  price: number;
  warranty: string;
  isCatalogMatch: boolean;
  modelMatchedName: string;
}

/**
 * Looks up repair prices from the Price Catalog for a specific device model.
 */
export function getModelPriceCatalogItems(
  deviceModel: string,
  customCatalog?: ModelRepairPrice[]
): ModelRepairCatalogItem[] {
  const catalogToSearch = customCatalog && customCatalog.length > 0 ? customCatalog : INITIAL_REPAIR_PRICE_DATA;
  const targetModel = (deviceModel || 'iPhone 15 Pro Max').trim();
  const lowerTarget = targetModel.toLowerCase();

  // 1. Direct exact match
  let matched = catalogToSearch.find((c) => c.model.toLowerCase() === lowerTarget);

  // 2. Partial/Includes match
  if (!matched) {
    matched = catalogToSearch.find(
      (c) => lowerTarget.includes(c.model.toLowerCase()) || c.model.toLowerCase().includes(lowerTarget)
    );
  }

  // 3. Fallback series match for newer models (e.g., iPhone 17 Pro Max -> iPhone 16 Pro Max / iPhone 15 Pro Max)
  if (!matched) {
    if (lowerTarget.includes('17 pro max') || lowerTarget.includes('16 pro max')) {
      matched = catalogToSearch.find((c) => c.model === 'iPhone 15 Pro Max');
    } else if (lowerTarget.includes('17 pro') || lowerTarget.includes('16 pro')) {
      matched = catalogToSearch.find((c) => c.model === 'iPhone 15 Pro');
    } else if (lowerTarget.includes('17 plus') || lowerTarget.includes('16 plus')) {
      matched = catalogToSearch.find((c) => c.model === 'iPhone 15 Plus');
    } else if (lowerTarget.includes('17') || lowerTarget.includes('16')) {
      matched = catalogToSearch.find((c) => c.model === 'iPhone 15');
    } else if (lowerTarget.includes('ipad')) {
      matched = catalogToSearch.find((c) => c.model.toLowerCase().includes('ipad'));
    } else if (lowerTarget.includes('macbook')) {
      matched = catalogToSearch.find((c) => c.model.toLowerCase().includes('macbook'));
    }
  }

  // 4. Default fallback if still no match
  if (!matched) {
    matched = catalogToSearch.find((c) => c.model === 'iPhone 15 Pro Max') || catalogToSearch[0];
  }

  const modelMatchedName = matched ? matched.model : targetModel;

  // Build catalog items array
  const items: ModelRepairCatalogItem[] = [];

  REPAIR_CATEGORIES.forEach((cat) => {
    const catalogPrice = matched?.prices?.[cat.key];
    const catalogWarranty = matched?.warranties?.[cat.key] || '3 Month Warranty';

    // If price exists in catalog, use it
    if (typeof catalogPrice === 'number' && catalogPrice > 0) {
      items.push({
        id: `price-${cat.key}-${modelMatchedName}`,
        categoryKey: cat.key,
        name: cat.label,
        group: cat.group,
        price: catalogPrice,
        warranty: catalogWarranty || '3 Month Warranty',
        isCatalogMatch: true,
        modelMatchedName,
      });
    } else if (cat.key === 'Green_White_Screen') {
      // Model-specific service: only show when the selected device model has a
      // real catalog price (e.g. iPhone 13 Pro / 13 Pro Max). No fallback price.
    } else {
      // Provide tier-adjusted baseline fallback price so UI is complete
      const fallbackPrice = getFallbackPriceForCategory(cat.key, lowerTarget);
      items.push({
        id: `price-${cat.key}-${modelMatchedName}`,
        categoryKey: cat.key,
        name: cat.label,
        group: cat.group,
        price: fallbackPrice,
        warranty: catalogWarranty || '3 Month Warranty',
        isCatalogMatch: false,
        modelMatchedName,
      });
    }
  });

  return items;
}

function getFallbackPriceForCategory(categoryKey: string, lowerModel: string): number {
  const isPro = lowerModel.includes('pro');
  const isMax = lowerModel.includes('max');

  let baseMultiplier = 1;
  if (isPro && isMax) baseMultiplier = 1.4;
  else if (isPro) baseMultiplier = 1.25;

  switch (categoryKey) {
    case 'Battery_Original':
      return Math.round(120000 * baseMultiplier);
    case 'Display_Original':
      return Math.round(380000 * baseMultiplier);
    case 'Display_Original_IDM':
      return Math.round(320000 * baseMultiplier);
    case 'Display_GX':
      return Math.round(220000 * baseMultiplier);
    case 'Display_LCD_AA':
      return Math.round(150000 * baseMultiplier);
    case 'Backglass':
      return Math.round(160000 * baseMultiplier);
    case 'Charing_Board_Repair':
    case 'Charging_Flex':
      return Math.round(90000 * baseMultiplier);
    case 'Ear_Speaker':
    case 'Ring_Speaker':
      return Math.round(75000 * baseMultiplier);
    case 'Mic':
      return Math.round(65000 * baseMultiplier);
    case 'Logic_Layer_Swap':
    case 'RF_Layer_Swap':
      return Math.round(380000 * baseMultiplier);
    case 'No_Power_Short_Repair':
    case 'No_Power_Logic_Repair':
      return Math.round(280000 * baseMultiplier);
    case 'Network_Repair':
    case 'Wifi_Bluetooth':
    case 'Apple_Pay_NFC':
      return Math.round(180000 * baseMultiplier);
    case 'Power_Volume_Key':
      return Math.round(70000 * baseMultiplier);
    case 'Face_iD':
      return Math.round(150000 * baseMultiplier);
    default:
      return Math.round(100000 * baseMultiplier);
  }
}
