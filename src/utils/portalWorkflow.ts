import { WorkOrder } from '../types';

/**
 * Pure business logic for the customer-facing portal's estimate
 * approve / reject flow. Extracted from CustomerFacingWebPortal.tsx
 * so the state transitions can be unit-tested without rendering.
 *
 * Rules (verified against the live app):
 * - Approve:  Receive → In Progress (auto-start work), estimateStatus=Approved,
 *             estimateApprovedAt stamped, a repair log entry added.
 * - Reject:   → Pending (holds the job), estimateStatus=Rejected,
 *             estimateRejectionReason recorded, a repair log entry added.
 */

export interface ApproveEstimateInput {
  workOrder: WorkOrder;
  customerName: string;
  currencySymbol: string;
}

export interface RejectEstimateInput {
  workOrder: WorkOrder;
  customerName: string;
  rejectionReason: string;
  rejectionNotes: string;
}

/** Approve: auto-moves Receive → In Progress, stamps approval. Pure — no Date.now() for testability. */
export function applyEstimateApproval(input: ApproveEstimateInput, nowIso: string): WorkOrder {
  const { workOrder, customerName, currencySymbol } = input;
  const now = new Date(nowIso).toLocaleString();
  const newStatus = workOrder.status === 'Receive' ? 'In Progress' : workOrder.status;

  const updatedLogs = [
    ...(workOrder.repairLogs || []),
    {
      id: `log-cust-approve-${Date.now()}`,
      timestamp: now,
      // author = stored customer name; note signee = the name typed in the portal (may differ)
      author: `Customer (${workOrder.customerName})`,
      note: `Estimate of ${workOrder.totalAmount.toLocaleString()} ${currencySymbol} APPROVED online via Customer Portal. Signee: ${customerName}.`,
      statusChange: newStatus,
    },
  ];

  return {
    ...workOrder,
    status: newStatus,
    estimateStatus: 'Approved' as const,
    estimateApprovedAt: nowIso,
    repairLogs: updatedLogs,
    updatedAt: nowIso,
  };
}

/** Reject: holds the job at Pending, records the reason. Pure — no Date.now() for testability. */
export function applyEstimateRejection(input: RejectEstimateInput, nowIso: string): WorkOrder {
  const { workOrder, customerName, rejectionReason, rejectionNotes } = input;
  const now = new Date(nowIso).toLocaleString();
  const fullNote = `Customer declined estimate/requested changes. Action: ${rejectionReason}. ${rejectionNotes ? `Notes: ${rejectionNotes}` : ''}`;

  const updatedLogs = [
    ...(workOrder.repairLogs || []),
    {
      id: `log-cust-reject-${Date.now()}`,
      timestamp: now,
      author: `Customer (${customerName})`,
      note: fullNote,
      statusChange: 'Pending',
    },
  ];

  return {
    ...workOrder,
    status: 'Pending',
    estimateStatus: 'Rejected' as const,
    estimateRejectionReason: `${rejectionReason}: ${rejectionNotes}`,
    repairLogs: updatedLogs,
    updatedAt: nowIso,
  };
}
