export interface AppleModelSeriesGroup {
  series: string;
  models: string[];
}

export const APPLE_MODEL_SERIES: AppleModelSeriesGroup[] = [
  {
    series: 'iPhone 17 Series',
    models: ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17']
  },
  {
    series: 'iPhone 16 Series',
    models: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16']
  },
  {
    series: 'iPhone 15 Series',
    models: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15']
  },
  {
    series: 'iPhone 14 Series',
    models: ['iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14']
  },
  {
    series: 'iPhone 13 Series',
    models: ['iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13']
  },
  {
    series: 'iPhone 12 & Older Series',
    models: ['iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 11 Pro Max', 'iPhone 11', 'iPhone SE (2022)']
  },
  {
    series: 'iPad Series',
    models: ['iPad Pro 13" (M4)', 'iPad Pro 11" (M4)', 'iPad Air 11" (M2)', 'iPad 10th Gen', 'iPad Mini 6']
  },
  {
    series: 'MacBook Series',
    models: ['MacBook Pro 16" (M3 Max)', 'MacBook Pro 14" (M3)', 'MacBook Air 15" (M3)', 'MacBook Air 13" (M2)']
  },
  {
    series: 'Apple Watch Series',
    models: ['Apple Watch Ultra 2', 'Apple Watch Series 9', 'Apple Watch SE (2023)']
  }
];

export const getAvailableColorsForModel = (modelName: string): string[] => {
  const name = modelName.toLowerCase();

  // iPhone 17 Series
  if (name.includes('iphone 17 pro')) {
    return ['Silver', 'Cosmic Orange', 'Deep Blue'];
  }
  if (name.includes('iphone air')) {
    return ['Space Black', 'Cloud White', 'Light Gold', 'Sky Blue'];
  }
  if (name.includes('iphone 17')) {
    return ['Black', 'Lavender', 'Mist Blue', 'Sage', 'White'];
  }

  // iPhone 16 Series
  if (name.includes('iphone 16 pro')) {
    return ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'];
  }
  if (name.includes('iphone 16')) {
    return ['Ultramarine', 'Teal', 'Pink', 'White', 'Black'];
  }

  // iPhone 15 Series
  if (name.includes('iphone 15 pro')) {
    return ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'];
  }
  if (name.includes('iphone 15')) {
    return ['Pink', 'Yellow', 'Green', 'Blue', 'Black'];
  }

  // iPhone 14 Series
  if (name.includes('iphone 14 pro')) {
    return ['Deep Purple', 'Space Black', 'Gold', 'Silver'];
  }
  if (name.includes('iphone 14')) {
    return ['Midnight', 'Starlight', '(PRODUCT)RED', 'Blue', 'Purple', 'Yellow'];
  }

  // iPhone 13 Series
  if (name.includes('iphone 13 pro')) {
    return ['Sierra Blue', 'Graphite', 'Gold', 'Silver', 'Alpine Green'];
  }
  if (name.includes('iphone 13')) {
    return ['Midnight', 'Starlight', 'Blue', 'Pink', 'Green', '(PRODUCT)RED'];
  }

  // iPhone 12 Series
  if (name.includes('iphone 12 pro')) {
    return ['Pacific Blue', 'Graphite', 'Gold', 'Silver'];
  }
  if (name.includes('iphone 12')) {
    return ['Black', 'White', 'Green', 'Purple', 'Blue', '(PRODUCT)RED'];
  }

  // iPhone 11 Series
  if (name.includes('iphone 11 pro')) {
    return ['Midnight Green', 'Space Gray', 'Silver', 'Gold'];
  }
  if (name.includes('iphone 11')) {
    return ['Purple', 'Yellow', 'Green', 'Black', 'White', '(PRODUCT)RED'];
  }

  // iPhone X / XS / XR Series
  if (name.includes('iphone xs max') || name.includes('iphone xs')) {
    return ['Gold', 'Space Gray', 'Silver'];
  }
  if (name.includes('iphone xr')) {
    return ['(PRODUCT)RED', 'Yellow', 'White', 'Coral', 'Black', 'Blue'];
  }
  if (/iphone\s*x(\s|$)/.test(name)) {
    return ['Silver', 'Space Gray'];
  }

  // iPhone SE / 8 / 7 / 6 Series
  if (name.includes('iphone se 2') || name.includes('iphone se (2020)')) {
    return ['Black', 'White', '(PRODUCT)RED'];
  }
  if (name.includes('iphone se 3') || name.includes('iphone se (2022)')) {
    return ['Midnight', 'Starlight', '(PRODUCT)RED'];
  }
  if (name.includes('iphone se')) {
    return ['Silver', 'Gold', 'Space Gray', 'Rose Gold'];
  }
  if (name.includes('iphone 8')) {
    return ['Gold', 'Silver', 'Space Gray', '(PRODUCT)RED'];
  }
  if (name.includes('iphone 7')) {
    return ['Rose Gold', 'Gold', 'Silver', 'Black', 'Jet Black', '(PRODUCT)RED'];
  }
  if (name.includes('iphone 6s')) {
    return ['Rose Gold', 'Gold', 'Silver', 'Space Gray'];
  }
  if (name.includes('iphone 6')) {
    return ['Silver', 'Gold', 'Space Gray'];
  }

  // iPad Series
  if (name.includes('ipad pro')) {
    return ['Space Black', 'Silver'];
  }
  if (name.includes('ipad air')) {
    return ['Space Gray', 'Starlight', 'Purple', 'Blue'];
  }
  if (name.includes('ipad')) {
    return ['Blue', 'Pink', 'Yellow', 'Silver'];
  }

  // MacBook Series
  if (name.includes('macbook pro') && name.includes('m3')) {
    return ['Space Black', 'Silver'];
  }
  if (name.includes('macbook pro')) {
    return ['Space Black', 'Silver', 'Space Gray'];
  }
  if (name.includes('macbook air')) {
    return ['Midnight', 'Starlight', 'Space Gray', 'Silver'];
  }

  // Apple Watch Series
  if (name.includes('ultra')) {
    return ['Natural Titanium', 'Black Titanium'];
  }
  if (name.includes('watch')) {
    return ['Midnight', 'Starlight', 'Silver', 'Pink', '(PRODUCT)RED'];
  }

  return ['Space Gray', 'Silver', 'Space Black', 'Midnight', 'Starlight'];
};

export const WARRANTY_OPTIONS = [
  { label: '30 Days Standard Warranty', days: 30 },
  { label: '90 Days Standard Warranty', days: 90 },
  { label: '180 Days Premium Warranty', days: 180 },
  { label: '1 Year ApplePro Warranty', days: 365 },
  { label: 'No Warranty', days: 0 }
];

export const AVAILABLE_REPAIRS = [
  { id: 'rep-1', name: 'Battery Original', basePrice: 120000 },
  { id: 'rep-2', name: 'Display Original IDM', basePrice: 320000 },
  { id: 'rep-3', name: 'Backglass', basePrice: 150000 },
  { id: 'rep-4', name: 'Ear Speaker', basePrice: 65000 },
  { id: 'rep-5', name: 'Charging Flex', basePrice: 85000 },
  { id: 'rep-6', name: 'Front Camera', basePrice: 110000 },
  { id: 'rep-7', name: 'Rear Camera', basePrice: 210000 },
  { id: 'rep-8', name: 'Logic Board Micro-Soldering', basePrice: 350000 }
];

export const DIAGNOSTIC_NAMES = [
  'Display',
  'Touch',
  'Face ID',
  'Main Camera',
  'Front Camera',
  'Charger',
  'Sound',
  'Vibrate',
  'Flash Light',
  'SIM',
  'Microphone',
  'Battery Health',
  'WiFi',
  'Bluetooth',
  'Backglass',
  'Key',
  'Proximity',
  'Compass',
  'Gyroscope',
  'Panic Full Log',
  'Other'
];

export interface RealisticColorInfo {
  name: string;
  gradient: string;
  border: string;
  shadow: string;
}

export const REALISTIC_COLOR_MAP: Record<string, RealisticColorInfo> = {
  'Cosmic Orange': {
    name: 'Cosmic Orange',
    gradient: 'linear-gradient(135deg, #B74B22 0%, #E98141 50%, #7C2D12 100%)',
    border: 'border-orange-700',
    shadow: '0 6px 16px rgba(183, 75, 34, 0.45)'
  },
  'Deep Blue': {
    name: 'Deep Blue',
    gradient: 'linear-gradient(135deg, #152A45 0%, #315476 50%, #0D1B2A 100%)',
    border: 'border-blue-900',
    shadow: '0 6px 16px rgba(21, 42, 69, 0.45)'
  },
  'Cloud White': {
    name: 'Cloud White',
    gradient: 'linear-gradient(135deg, #E3E6EA 0%, #FFFFFF 50%, #CED3D9 100%)',
    border: 'border-slate-300',
    shadow: '0 6px 16px rgba(206, 211, 217, 0.42)'
  },
  'Light Gold': {
    name: 'Light Gold',
    gradient: 'linear-gradient(135deg, #D6C28D 0%, #F4E9C5 50%, #B69A5A 100%)',
    border: 'border-amber-300',
    shadow: '0 6px 16px rgba(214, 194, 141, 0.45)'
  },
  'Lavender': {
    name: 'Lavender',
    gradient: 'linear-gradient(135deg, #B9A6D9 0%, #E2D8F3 50%, #937BB5 100%)',
    border: 'border-violet-300',
    shadow: '0 6px 16px rgba(185, 166, 217, 0.45)'
  },
  'Mist Blue': {
    name: 'Mist Blue',
    gradient: 'linear-gradient(135deg, #88AFC5 0%, #C8DFEA 50%, #5F889F 100%)',
    border: 'border-sky-300',
    shadow: '0 6px 16px rgba(136, 175, 197, 0.45)'
  },
  'Sage': {
    name: 'Sage',
    gradient: 'linear-gradient(135deg, #829B7B 0%, #B9CDB2 50%, #5E7558 100%)',
    border: 'border-green-600',
    shadow: '0 6px 16px rgba(130, 155, 123, 0.45)'
  },
  'Cosmic Amber': {
    name: 'Cosmic Amber',
    gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 50%, #b45309 100%)',
    border: 'border-amber-500',
    shadow: '0 6px 16px rgba(217, 119, 6, 0.45)'
  },
  'Desert Titanium': {
    name: 'Desert Titanium',
    gradient: 'linear-gradient(135deg, #C2A792 0%, #E2D1C3 50%, #A88F7B 100%)',
    border: 'border-[#A88F7B]',
    shadow: '0 6px 16px rgba(194, 167, 146, 0.45)'
  },
  'Natural Titanium': {
    name: 'Natural Titanium',
    gradient: 'linear-gradient(135deg, #9F9D98 0%, #C4C2BC 50%, #878580 100%)',
    border: 'border-[#878580]',
    shadow: '0 6px 16px rgba(159, 157, 152, 0.45)'
  },
  'Space Black': {
    name: 'Space Black',
    gradient: 'linear-gradient(135deg, #1C1C1E 0%, #3A3A3C 50%, #000000 100%)',
    border: 'border-slate-700',
    shadow: '0 6px 16px rgba(0, 0, 0, 0.65)'
  },
  'White Titanium': {
    name: 'White Titanium',
    gradient: 'linear-gradient(135deg, #E3E3E0 0%, #FFFFFF 50%, #D0D0CD 100%)',
    border: 'border-slate-300',
    shadow: '0 6px 16px rgba(180, 180, 180, 0.4)'
  },
  'Black Titanium': {
    name: 'Black Titanium',
    gradient: 'linear-gradient(135deg, #2A2B2D 0%, #45474A 50%, #1A1B1C 100%)',
    border: 'border-slate-800',
    shadow: '0 6px 16px rgba(30, 30, 30, 0.55)'
  },
  'Blue Titanium': {
    name: 'Blue Titanium',
    gradient: 'linear-gradient(135deg, #2F3E4E 0%, #4B5E73 50%, #1E2B38 100%)',
    border: 'border-slate-600',
    shadow: '0 6px 16px rgba(47, 62, 78, 0.45)'
  },
  'Ultramarine': {
    name: 'Ultramarine',
    gradient: 'linear-gradient(135deg, #3B52A4 0%, #6377D5 50%, #293B7B 100%)',
    border: 'border-indigo-600',
    shadow: '0 6px 16px rgba(59, 82, 164, 0.45)'
  },
  'Teal': {
    name: 'Teal',
    gradient: 'linear-gradient(135deg, #2E7980 0%, #54A3AA 50%, #1A5258 100%)',
    border: 'border-teal-600',
    shadow: '0 6px 16px rgba(46, 121, 128, 0.45)'
  },
  'Pink': {
    name: 'Pink',
    gradient: 'linear-gradient(135deg, #F2C3D2 0%, #FFE3EC 50%, #D99BB0 100%)',
    border: 'border-pink-300',
    shadow: '0 6px 16px rgba(242, 195, 210, 0.45)'
  },
  'Sky Blue': {
    name: 'Sky Blue',
    gradient: 'linear-gradient(135deg, #A1C5EC 0%, #CCE2FA 50%, #7FA8D8 100%)',
    border: 'border-sky-300',
    shadow: '0 6px 16px rgba(161, 197, 236, 0.45)'
  },
  'Deep Purple': {
    name: 'Deep Purple',
    gradient: 'linear-gradient(135deg, #4A3E54 0%, #6C597A 50%, #352B3E 100%)',
    border: 'border-purple-800',
    shadow: '0 6px 16px rgba(74, 62, 84, 0.45)'
  },
  'Sierra Blue': {
    name: 'Sierra Blue',
    gradient: 'linear-gradient(135deg, #9BB5CE 0%, #C2D5E6 50%, #7B9AB6 100%)',
    border: 'border-sky-400',
    shadow: '0 6px 16px rgba(155, 181, 206, 0.45)'
  },
  'Alpine Green': {
    name: 'Alpine Green',
    gradient: 'linear-gradient(135deg, #505E53 0%, #728476 50%, #39443B 100%)',
    border: 'border-emerald-800',
    shadow: '0 6px 16px rgba(80, 94, 83, 0.45)'
  },
  'Pacific Blue': {
    name: 'Pacific Blue',
    gradient: 'linear-gradient(135deg, #2C4A5A 0%, #446C82 50%, #1C323E 100%)',
    border: 'border-cyan-800',
    shadow: '0 6px 16px rgba(44, 74, 90, 0.45)'
  },
  'Midnight': {
    name: 'Midnight',
    gradient: 'linear-gradient(135deg, #1B2430 0%, #2C3848 50%, #0F1620 100%)',
    border: 'border-slate-800',
    shadow: '0 6px 16px rgba(27, 36, 48, 0.55)'
  },
  'Starlight': {
    name: 'Starlight',
    gradient: 'linear-gradient(135deg, #F0EAD6 0%, #FAF6EE 50%, #DDD5C0 100%)',
    border: 'border-amber-200/80',
    shadow: '0 6px 16px rgba(240, 234, 214, 0.55)'
  },
  'Silver': {
    name: 'Silver',
    gradient: 'linear-gradient(135deg, #E3E4E5 0%, #FFFFFF 50%, #D1D2D4 100%)',
    border: 'border-slate-300',
    shadow: '0 6px 16px rgba(200, 200, 200, 0.45)'
  },
  'Space Gray': {
    name: 'Space Gray',
    gradient: 'linear-gradient(135deg, #53555B 0%, #73757C 50%, #3B3C40 100%)',
    border: 'border-slate-600',
    shadow: '0 6px 16px rgba(83, 85, 91, 0.45)'
  },
  'Gold': {
    name: 'Gold',
    gradient: 'linear-gradient(135deg, #E6D0AC 0%, #FCE8CA 50%, #C7B08B 100%)',
    border: 'border-amber-300',
    shadow: '0 6px 16px rgba(230, 208, 172, 0.45)'
  },
  'Rose Gold': {
    name: 'Rose Gold',
    gradient: 'linear-gradient(135deg, #C68E86 0%, #F0C6BE 50%, #A96F68 100%)',
    border: 'border-rose-300',
    shadow: '0 6px 16px rgba(198, 142, 134, 0.45)'
  },
  'Jet Black': {
    name: 'Jet Black',
    gradient: 'linear-gradient(135deg, #060606 0%, #2A2A2A 48%, #080808 100%)',
    border: 'border-zinc-950',
    shadow: '0 6px 16px rgba(0, 0, 0, 0.7)'
  },
  'Coral': {
    name: 'Coral',
    gradient: 'linear-gradient(135deg, #E37C6B 0%, #F4B2A5 50%, #BC584B 100%)',
    border: 'border-orange-300',
    shadow: '0 6px 16px rgba(227, 124, 107, 0.45)'
  },
  '(PRODUCT)RED': {
    name: '(PRODUCT)RED',
    gradient: 'linear-gradient(135deg, #D01C28 0%, #F0323E 50%, #A30D17 100%)',
    border: 'border-red-600',
    shadow: '0 6px 16px rgba(208, 28, 40, 0.45)'
  },
  'Yellow': {
    name: 'Yellow',
    gradient: 'linear-gradient(135deg, #F8E27E 0%, #FFF0A5 50%, #D1BB50 100%)',
    border: 'border-yellow-400',
    shadow: '0 6px 16px rgba(248, 226, 126, 0.45)'
  },
  'Green': {
    name: 'Green',
    gradient: 'linear-gradient(135deg, #C5E3CA 0%, #E3F5E6 50%, #A1C9A7 100%)',
    border: 'border-green-300',
    shadow: '0 6px 16px rgba(197, 227, 202, 0.45)'
  },
  'Purple': {
    name: 'Purple',
    gradient: 'linear-gradient(135deg, #D1C5E2 0%, #EDE5F7 50%, #B0A1C7 100%)',
    border: 'border-purple-300',
    shadow: '0 6px 16px rgba(209, 197, 226, 0.45)'
  },
  'Graphite': {
    name: 'Graphite',
    gradient: 'linear-gradient(135deg, #4A4A4C 0%, #6B6B6D 50%, #323234 100%)',
    border: 'border-slate-600',
    shadow: '0 6px 16px rgba(74, 74, 76, 0.45)'
  },
  'White': {
    name: 'White',
    gradient: 'linear-gradient(135deg, #F9F9FB 0%, #FFFFFF 50%, #ECECEE 100%)',
    border: 'border-slate-300',
    shadow: '0 6px 16px rgba(210, 210, 210, 0.45)'
  },
  'Black': {
    name: 'Black',
    gradient: 'linear-gradient(135deg, #222325 0%, #383A3D 50%, #121314 100%)',
    border: 'border-slate-800',
    shadow: '0 6px 16px rgba(34, 35, 37, 0.55)'
  }
};

import {
  Smartphone,
  Zap,
  Camera,
  Volume2,
  Wifi,
  Radio,
  Cpu,
  ShieldAlert,
  BatteryCharging,
  Fingerprint,
  Mic,
  Disc,
  Sliders,
  Eye,
  Activity
} from 'lucide-react';

export const getDiagnosticIcon = (name: string) => {
  switch (name) {
    case 'Power/Boot': return Zap;
    case 'Display': return Smartphone;
    case 'Touch': return Sliders;
    case 'Battery & Charging': return BatteryCharging;
    case 'Main Camera': return Camera;
    case 'Front Camera': return Camera;
    case 'Face ID': return Fingerprint;
    case 'Sound': return Volume2;
    case 'Microphone': return Mic;
    case 'WiFi': return Wifi;
    case 'Bluetooth': return Radio;
    case 'SIM': return Disc;
    case 'Flashlight': return Zap;
    case 'Proximity Sensor': return Eye;
    case 'True Tone': return Eye;
    case 'NFC': return Radio;
    case 'Wireless Charge': return BatteryCharging;
    case 'Buttons': return Sliders;
    case 'Compass/Gyro': return Activity;
    case 'Panic Full Log': return ShieldAlert;
    default: return Cpu;
  }
};

export const getRealisticColorStyle = (colorName: string): RealisticColorInfo => {
  return REALISTIC_COLOR_MAP[colorName] || {
    name: colorName,
    gradient: 'linear-gradient(135deg, #8E8E93 0%, #AEAEB2 50%, #636366 100%)',
    border: 'border-slate-400',
    shadow: '0 6px 16px rgba(142, 142, 147, 0.35)'
  };
};
