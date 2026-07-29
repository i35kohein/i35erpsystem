export interface RepairCategoryDef {
  key: string;
  label: string;
  group: 'Battery' | 'Display' | 'Housing' | 'Charging' | 'Audio' | 'Logic Board' | 'Network' | 'Sensors & Keys';
}

export interface ModelRepairPrice {
  model: string;
  prices: Record<string, number | null>; // categoryKey -> price amount
  warranties: Record<string, string>; // categoryKey -> warranty string
}

export interface FolderConfig {
  id: string;
  name: string;
  family: 'iPhone' | 'iPad' | 'Apple Watch' | 'Mac' | 'Other';
  enabled: boolean;
}

export const DEFAULT_DEVICE_FOLDERS: FolderConfig[] = [
  { id: 'iphone-16', name: 'iPhone 16 Series', family: 'iPhone', enabled: true },
  { id: 'iphone-15', name: 'iPhone 15 Series', family: 'iPhone', enabled: true },
  { id: 'iphone-14', name: 'iPhone 14 Series', family: 'iPhone', enabled: true },
  { id: 'iphone-13', name: 'iPhone 13 Series', family: 'iPhone', enabled: true },
  { id: 'iphone-12', name: 'iPhone 12 Series', family: 'iPhone', enabled: true },
  { id: 'iphone-11', name: 'iPhone 11 Series', family: 'iPhone', enabled: true },
  { id: 'iphone-x', name: 'iPhone X / XS / XR', family: 'iPhone', enabled: true },
  { id: 'iphone-8-se', name: 'iPhone 8 / SE Series', family: 'iPhone', enabled: true },
  { id: 'iphone-7-6', name: 'iPhone 7 / 6 Series', family: 'iPhone', enabled: true },
  { id: 'ipad', name: 'iPad Series', family: 'iPad', enabled: true },
  { id: 'apple-watch', name: 'Apple Watch Series', family: 'Apple Watch', enabled: true },
  { id: 'mac', name: 'Mac & MacBook', family: 'Mac', enabled: true },
  { id: 'other', name: 'Other Devices', family: 'Other', enabled: true },
];

export function getModelFolderId(modelName: string): string {
  const m = modelName.trim();
  if (m.toLowerCase().includes('ipad')) return 'ipad';
  if (m.toLowerCase().includes('watch')) return 'apple-watch';
  if (m.toLowerCase().includes('mac')) return 'mac';
  if (m.includes('16')) return 'iphone-16';
  if (m.includes('15')) return 'iphone-15';
  if (m.includes('14')) return 'iphone-14';
  if (m.includes('13')) return 'iphone-13';
  if (m.includes('12')) return 'iphone-12';
  if (m.includes('11')) return 'iphone-11';
  if (m.includes('X') || m.includes('XS') || m.includes('XR')) return 'iphone-x';
  if (m.includes('8') || m.includes('SE')) return 'iphone-8-se';
  if (m.includes('7') || m.includes('6')) return 'iphone-7-6';
  return 'other';
}

export const REPAIR_CATEGORIES: RepairCategoryDef[] = [
  { key: 'Battery_Original', label: 'Battery Original', group: 'Battery' },
  { key: 'Display_Original', label: 'Display Original', group: 'Display' },
  { key: 'Display_Original_IDM', label: 'Display Original IDM', group: 'Display' },
  { key: 'Display_GX', label: 'Display GX (OLED)', group: 'Display' },
  { key: 'Display_LCD_AA', label: 'Display LCD AA', group: 'Display' },
  { key: 'Backglass', label: 'Backglass Replacement', group: 'Housing' },
  { key: 'Charing_Board_Repair', label: 'Charging Board Repair', group: 'Charging' },
  { key: 'Charging_Flex', label: 'Charging Flex Cable', group: 'Charging' },
  { key: 'Ear_Speaker', label: 'Ear Speaker', group: 'Audio' },
  { key: 'Ring_Speaker', label: 'Ring Speaker / Loudspeaker', group: 'Audio' },
  { key: 'Mic', label: 'Microphone Repair', group: 'Audio' },
  { key: 'Logic_Layer_Swap', label: 'Logic Layer Swap (Double Deck)', group: 'Logic Board' },
  { key: 'RF_Layer_Swap', label: 'RF Layer Swap (Baseband)', group: 'Logic Board' },
  { key: 'No_Power_Short_Repair', label: 'No Power Short Circuit Repair', group: 'Logic Board' },
  { key: 'No_Power_Logic_Repair', label: 'No Power Logic IC Repair', group: 'Logic Board' },
  { key: 'Network_Repair', label: 'Network / Baseband IC Repair', group: 'Network' },
  { key: 'Wifi_Bluetooth', label: 'Wifi & Bluetooth IC Repair', group: 'Network' },
  { key: 'Apple_Pay_NFC', label: 'Apple Pay & NFC IC Repair', group: 'Network' },
  { key: 'Power_Volume_Key', label: 'Power & Volume Key Flex', group: 'Sensors & Keys' },
  { key: 'Face_iD', label: 'Face ID / TrueDepth Repair', group: 'Sensors & Keys' },
];
