import { describe, it, expect } from 'vitest';
import {
  getLoadBadge,
  isHardwareRepair,
  getRepairType,
  getDurationHours,
  getLaborRevenue,
  computeTechStats,
} from './techAnalytics';
import { WorkOrder, Technician } from '../types';

const baseWo = (overrides: Partial<WorkOrder> = {}): WorkOrder => ({
  id: 'wo-1',
  orderNumber: 'WO-2026-1001',
  customerId: 'c1',
  customerName: 'Test',
  customerPhone: '0',
  customerEmail: '',
  customerType: 'Retail',
  deviceCategory: 'iPhone',
  deviceModel: 'iPhone 12',
  serialNumber: '',
  deviceColor: 'Black',
  passcode: '',
  findMyStatus: 'OFF',
  status: 'Finished',
  priority: 'Normal',
  assignedTechId: 'tech-1',
  serviceType: 'Standard Modular',
  lineItems: [],
  subtotal: 0,
  depositAmount: 0,
  discountAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
  isPaid: false,
  warrantyDays: 30,
  intakePhotos: [],
  intakeChecklist: {
    powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true,
    charging: true, wifiBluetooth: true, cameraRear: true, cameraFront: true,
    microphone: true, speaker: true, earpiece: true, buttons: true,
    vibration: true, sensors: true, batteryHealth: true, backglass: true,
    frame: true, waterDamage: true, motherboard: true, dataBackup: true,
    customerAcknowledged: true,
  } as any,
  symptomsReported: '',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
  estimatedCompletion: '2026-08-02',
  ...overrides,
});

const tech = (overrides: Partial<Technician> = {}): Technician => ({
  id: 'tech-1',
  name: 'Aung Thu Moe',
  email: 'a@a.com',
  level: 'Level 2 Spareparts + Hardware',
  activeJobsCount: 2,
  completedThisMonth: 10,
  warrantyReturnCount: 1,
  commissionRate: 10,
  ...overrides,
});

describe('getLoadBadge', () => {
  it('classifies load thresholds', () => {
    expect(getLoadBadge(0).label).toBe('Available');
    expect(getLoadBadge(1).label).toBe('Optimal');
    expect(getLoadBadge(3).label).toBe('Moderate');
    expect(getLoadBadge(5).label).toBe('Heavy');
    expect(getLoadBadge(9).label).toBe('Heavy');
  });
});

describe('isHardwareRepair', () => {
  it('flags Micro-Soldering service type', () => {
    expect(isHardwareRepair(baseWo({ serviceType: 'Micro-Soldering' }))).toBe(true);
  });
  it('flags microSolderingLog presence', () => {
    expect(isHardwareRepair(baseWo({ microSolderingLog: { boardModel: '820-02020', diodeReadings: [], thermalNotes: '', icReplaced: [], schematicTags: [], multimeterDiodeShortFound: '' } as any }))).toBe(true);
  });
  it('detects board keywords in repair names', () => {
    expect(
      isHardwareRepair(
        baseWo({ selectedRepairs: [{ id: 'r1', name: 'Logic Board Repair', basePrice: 100, discountPercent: 0, finalPrice: 100 }] })
      )
    ).toBe(true);
  });
  it('defaults to spareparts for modular swaps', () => {
    expect(isHardwareRepair(baseWo({ selectedRepairs: [{ id: 'r1', name: 'Display Replacement', basePrice: 100, discountPercent: 0, finalPrice: 100 }] }))).toBe(false);
  });
  it('AI verdict overrides rules', () => {
    const wo = baseWo({ repairTypeAI: 'hardware', serviceType: 'Standard Modular', symptomsReported: 'screen cracked' });
    expect(getRepairType(wo)).toBe('hardware');
  });
});

describe('getDurationHours', () => {
  it('anchors to completedAt, min 0.5h', () => {
    const wo = baseWo({ createdAt: '2026-08-01T00:00:00.000Z', completedAt: '2026-08-01T02:00:00.000Z' });
    expect(getDurationHours(wo)).toBe(2);
  });
  it('falls back to updatedAt', () => {
    const wo = baseWo({ createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T01:30:00.000Z' });
    expect(getDurationHours(wo)).toBe(1.5);
  });
});

describe('getLaborRevenue', () => {
  it('sums only isLabor line items', () => {
    const wo = baseWo({
      lineItems: [
        { id: 'l1', description: 'Labor', isLabor: true, unitCost: 0, unitPrice: 80000, quantity: 1 },
        { id: 'l2', description: 'Battery', partId: 'p1', partName: 'Battery', isLabor: false, unitCost: 30000, unitPrice: 65000, quantity: 2 },
      ],
    });
    expect(getLaborRevenue(wo)).toBe(80000);
  });
});

describe('computeTechStats', () => {
  it('computes live completed + revenue from finished orders', () => {
    const wo = baseWo({
      status: 'Finished',
      completedAt: '2026-08-02T00:00:00.000Z',
      subtotal: 200000,
      lineItems: [
        { id: 'l1', description: 'Labor', isLabor: true, unitCost: 0, unitPrice: 50000, quantity: 1 },
        { id: 'l2', description: 'Battery', partId: 'p1', partName: 'Battery', isLabor: false, unitCost: 30000, unitPrice: 100000, quantity: 1 },
      ],
    });
    const stats = computeTechStats([wo], tech({ commissionRate: 10, commissionRateParts: 10, commissionRateHardware: 15 }));
    expect(stats.liveCompleted).toBe(1);
    expect(stats.revenue).toBe(200000);
    expect(stats.laborRevenue).toBe(50000);
    // spareparts job → parts rate 10%
    expect(stats.estCommission).toBe(5000);
    expect(stats.successRate).toBe(50); // 1 completed / (1 + 1 return)
  });
  it('est commission uses hardware rate for micro-soldering', () => {
    const wo = baseWo({ status: 'Finished', serviceType: 'Micro-Soldering', lineItems: [{ id: 'l1', description: 'Board', isLabor: true, unitCost: 0, unitPrice: 100000, quantity: 1 }] });
    const stats = computeTechStats([wo], tech({ commissionRateParts: 10, commissionRateHardware: 15 }));
    expect(stats.estCommission).toBe(15000);
  });
  it('no fabricated numbers when no data', () => {
    const stats = computeTechStats([], tech({ warrantyReturnCount: 0 }));
    expect(stats.liveCompleted).toBe(0);
    expect(stats.avgDurationHours).toBeNull();
    expect(stats.successRate).toBeNull();
    expect(stats.estCommission).toBeNull();
  });
});
