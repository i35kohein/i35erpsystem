import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { WorkOrder } from '../../types';

/** Shared helpers extracted from SystemManagementSettingsModule (Ko Hein 2026-08-12). */

export const RECEIPT_FOOTER_ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left', Icon: AlignLeft },
  { value: 'center', label: 'Center', Icon: AlignCenter },
  { value: 'right', label: 'Right', Icon: AlignRight },
] as const;

export const RECEIPT_FOOTER_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const;

export const splitFooterTextBySize = (
  text: string,
  start: number,
  ranges: Array<{ start: number; end: number; size: 'small' | 'medium' | 'large' }>,
  fallback: 'small' | 'medium' | 'large'
) => {
  const end = start + text.length;
  const boundaries = new Set([start, end]);
  ranges.forEach((range) => {
    if (range.start < end && range.end > start) {
      boundaries.add(Math.max(start, range.start));
      boundaries.add(Math.min(end, range.end));
    }
  });
  const points = [...boundaries].sort((a, b) => a - b);
  return points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return {
      text: text.slice(point - start, next - start),
      size: ranges.find((range) => range.start <= point && range.end >= next)?.size || fallback,
    };
  });
};

export const getSelectedFooterLineIndexes = (text: string, selectionStart: number, selectionEnd: number) => {
  const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd));
  // A non-empty selection ending immediately after a newline includes the
  // preceding line, not an accidental next empty line.
  const rangeEnd =
    selectionStart === selectionEnd ? rangeStart : Math.max(rangeStart, Math.max(selectionStart, selectionEnd) - 1);
  const startLine = text.slice(0, rangeStart).split('\n').length - 1;
  const endLine = text.slice(0, rangeEnd).split('\n').length - 1;

  return Array.from({ length: endLine - startLine + 1 }, (_, index) => startLine + index);
};

/** Sample ticket used by the receipt preview in Settings. */
export const SAMPLE_PRINT_WORK_ORDER: WorkOrder = {
  id: 'wo-sample-2026',
  orderNumber: 'WO-2026-88201',
  customerId: 'cust-88201',
  customerName: 'Daw Khin Than',
  customerPhone: '09-420192831',
  customerEmail: 'dawkhinthan@gmail.com',
  customerAddress: 'Kamayut Township, Yangon',
  customerType: 'Retail',
  deviceCategory: 'iPhone',
  deviceModel: 'iPhone 15 Pro',
  deviceColor: 'Natural Titanium',
  serialNumber: 'F17X8921LPM',
  passcode: '4920',
  serviceType: 'Standard Modular',
  status: 'In Progress',
  priority: 'Normal',
  assignedTechId: 'tech-001',
  warrantyDays: 90,
  findMyStatus: 'OFF',
  estimatedCompletion: '2026-07-25',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  symptomsReported: 'Display cracked with green line artifacts after accidental drop. Touch non-responsive on lower right.',
  lineItems: [],
  subtotal: 200000,
  depositAmount: 0,
  discountAmount: 0,
  taxAmount: 0,
  totalAmount: 200000,
  isPaid: false,
  intakePhotos: [],
  intakeChecklist: {
    powerOn: true,
    screenDisplay: false,
    touchGrid: false,
    faceIdOrTouchId: true,
    trueTonePresent: true,
    frontCamera: true,
    rearCamera: true,
    microphones: true,
    speakers: true,
    wifiBluetooth: true,
    cellularSignal: true,
    wirelessCharging: true,
    liquidIndicatorTriggered: false,
    physicalDamageNotes: 'Front Glass Cracked',
  },
  selectedRepairs: [
    { id: 'r1', name: 'Original OLED Display Panel Replacement', basePrice: 180000, discountPercent: 0, finalPrice: 180000 },
    { id: 'r2', name: '21-Point ACMT Hardware Diag & Seal Renewal', basePrice: 200000, discountPercent: 90, finalPrice: 20000 },
  ],
};
