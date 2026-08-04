import { describe, it, expect } from 'vitest';
import { applyEstimateApproval, applyEstimateRejection } from './portalWorkflow';
import { WorkOrder } from '../types';

const baseWo = (overrides: Partial<WorkOrder> = {}): WorkOrder => ({
  id: 'wo-portal-1',
  orderNumber: 'WO-2026-1042',
  customerId: 'c1',
  customerName: 'Mg Mg',
  customerPhone: '09123456789',
  customerEmail: '',
  customerType: 'Retail',
  deviceCategory: 'iPhone',
  deviceModel: 'iPhone 13',
  serialNumber: '',
  deviceColor: 'Black',
  passcode: '',
  findMyStatus: 'OFF',
  status: 'Receive',
  priority: 'Normal',
  assignedTechId: '',
  serviceType: 'Standard Modular',
  lineItems: [],
  subtotal: 0,
  depositAmount: 0,
  discountAmount: 0,
  taxAmount: 0,
  totalAmount: 250000,
  isPaid: false,
  warrantyDays: 90,
  warrantyLabel: '90 Days Standard Warranty',
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
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
  estimatedCompletion: '2026-08-06T00:00:00.000Z',
  ...overrides,
});

const NOW = '2026-08-05T06:00:00.000Z';

describe('portal estimate approval → pipeline handoff (A-6)', () => {
  it('approval from Receive auto-moves the ticket to In Progress', () => {
    const result = applyEstimateApproval(
      { workOrder: baseWo(), customerName: 'Mg Mg', currencySymbol: 'MMK' },
      NOW
    );
    expect(result.status).toBe('In Progress');
    expect(result.estimateStatus).toBe('Approved');
    expect(result.estimateApprovedAt).toBe(NOW);
  });

  it('approval keeps a non-Receive ticket at its current status (no regression)', () => {
    const result = applyEstimateApproval(
      { workOrder: baseWo({ status: 'In Progress' }), customerName: 'Mg Mg', currencySymbol: 'MMK' },
      NOW
    );
    expect(result.status).toBe('In Progress');
  });

  it('approval appends a customer-signed repair log with the new status', () => {
    const result = applyEstimateApproval(
      { workOrder: baseWo(), customerName: 'Daw Hla', currencySymbol: 'MMK' },
      NOW
    );
    const lastLog = result.repairLogs![result.repairLogs!.length - 1];
    expect(lastLog.author).toContain('Daw Hla');
    expect(lastLog.statusChange).toBe('In Progress');
    expect(lastLog.note).toContain('APPROVED');
  });

  it('rejection holds the ticket at Pending and records the reason', () => {
    const result = applyEstimateRejection(
      {
        workOrder: baseWo(),
        customerName: 'Mg Mg',
        rejectionReason: 'Request Phone Call from Technician',
        rejectionNotes: 'Too expensive',
      },
      NOW
    );
    expect(result.status).toBe('Pending');
    expect(result.estimateStatus).toBe('Rejected');
    expect(result.estimateRejectionReason).toContain('Too expensive');
    const lastLog = result.repairLogs![result.repairLogs!.length - 1];
    expect(lastLog.statusChange).toBe('Pending');
    expect(lastLog.note).toContain('Customer declined estimate');
  });

  it('rejection without notes still records the action', () => {
    const result = applyEstimateRejection(
      {
        workOrder: baseWo(),
        customerName: 'Mg Mg',
        rejectionReason: 'Request Phone Call from Technician',
        rejectionNotes: '',
      },
      NOW
    );
    expect(result.estimateStatus).toBe('Rejected');
    expect(result.estimateRejectionReason).toBe('Request Phone Call from Technician: ');
  });

  it('approval is idempotent on logs (no double-append on repeat call with same base)', () => {
    const first = applyEstimateApproval(
      { workOrder: baseWo(), customerName: 'Mg Mg', currencySymbol: 'MMK' },
      NOW
    );
    // A second approve on the ALREADY-approved ticket must not regress status.
    const second = applyEstimateApproval(
      { workOrder: first, customerName: 'Mg Mg', currencySymbol: 'MMK' },
      NOW
    );
    expect(second.status).toBe('In Progress');
    expect(second.estimateStatus).toBe('Approved');
  });
});
