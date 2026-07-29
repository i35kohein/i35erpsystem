import { useState, useEffect } from 'react';
import { subscribeToCollection, saveDocument } from '../lib/firebase';

export interface SystemSettings {
  // Business Profile
  storeName: string;
  storePhone: string;
  storeEmail: string;
  storeAddress: string;
  receiptHeaderMsg: string;
  receiptFooterMsg: string;
  currencySymbol: string;
  taxRatePercent: number;
  enableSalesTax: boolean;
  defaultLaborRate: number;

  // Repair Automation & Ticket Settings
  ticketPrefix: string;
  defaultWarrantyDays: number;
  maxTechJobCapacity: number;
  enforceQaChecklist: boolean;
  lowStockReorderThreshold: number;
  autoPrintIntakeTag: boolean;

  // Price & Margin Settings
  defaultPartsMarkupPercent: number;
  bundleDiscountPercent: number;

  // Label & Printer Config
  printerPaperSize: 'a4' | '3x2-tag' | string;
  enableSoundAlerts: boolean;

  // Live Database Status
  dbProjectId: string;
  isFirestoreEnabled: boolean;
  lastBackupDate?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  storeName: 'AppleRepair Independent Operations',
  storePhone: '+95 9 790 123 456',
  storeEmail: 'support@applerepair.mm',
  storeAddress: 'No. 124, Pyay Road, Kamayut Township, Yangon',
  receiptHeaderMsg: 'Official ACMT Certified Independent Repair Center',
  receiptFooterMsg: 'Thank you for choosing AppleRepair! 90-Day Parts & Labor Warranty included.',
  currencySymbol: 'MMK',
  taxRatePercent: 0,
  enableSalesTax: false,
  defaultLaborRate: 25000,
  ticketPrefix: 'WO-2026-',
  defaultWarrantyDays: 90,
  maxTechJobCapacity: 5,
  enforceQaChecklist: true,
  lowStockReorderThreshold: 3,
  autoPrintIntakeTag: true,
  defaultPartsMarkupPercent: 20,
  bundleDiscountPercent: 10,
  printerPaperSize: 'a4',
  enableSoundAlerts: true,
  dbProjectId: 'nomadic-adapter-k9z5m',
  isFirestoreEnabled: true,
  lastBackupDate: new Date().toISOString().split('T')[0],
};

const LOCAL_STORAGE_KEY = 'applerepair_system_settings_v1';

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to parse settings from localStorage', e);
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });

  // Subscribe to live settings document in Firestore
  useEffect(() => {
    const unsub = subscribeToCollection<SystemSettings & { id: string }>(
      'systemSettings',
      (data) => {
        if (data && data.length > 0) {
          const mainSettings = data[0];
          setSettings((prev) => ({ ...prev, ...mainSettings }));
        }
      },
      [{ id: 'main_config', ...DEFAULT_SYSTEM_SETTINGS }]
    );

    return () => unsub();
  }, []);

  const updateSettings = async (partial: Partial<SystemSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      await saveDocument('systemSettings', { id: 'main_config', ...updated });
    } catch (e) {
      console.error('Failed to persist settings', e);
    }
  };

  const resetSettings = async () => {
    setSettings(DEFAULT_SYSTEM_SETTINGS);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      await saveDocument('systemSettings', { id: 'main_config', ...DEFAULT_SYSTEM_SETTINGS });
    } catch (e) {
      console.error('Failed to reset settings', e);
    }
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
