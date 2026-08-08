
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIsIpad } from '../../hooks/useIsIpad';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import {CreditCard,
  DollarSign,
  Receipt,
  Coins,
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  Smartphone,
  Plus,
  FileText,
  QrCode,
  Landmark,
  Copy,
  PackageCheck,
  Check,
  ChevronDown,
  BellRing,
  AlertTriangle, 
  XCircle, 
  Split,
  UserCheck,
  ChevronsLeft,
  ChevronsRight,
  Tablet,
  Watch,
  Laptop,
  type LucideIcon,
} from 'lucide-react';
import { WorkOrder, Customer, SystemSettings, PartItem, WorkOrderLineItem } from '../../types';
import { PriorityBadge } from '../common/PriorityBadge';
import { Button , Input } from '../ui';
import { StatusChip } from '../common/StatusChip';
import { getActivePaymentMethods } from '../../data/seedData';
import { PrintableInvoiceModal } from '../common/PrintableInvoiceModal';
import { CustomerNotificationModal } from '../common/CustomerNotificationModal';
import { toast } from '../../lib/toast';

const isSameDeviceModel = (left: string, right: string) =>
  left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

const INVENTORY_CATEGORY_GROUPS: Array<{ match: RegExp; categories: string[] }> = [
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

// Brand meta for payment method tiles (icon + brand color) so the grid is
// scannable at a glance instead of text-only tiles.
const PAYMENT_METHOD_META: Record<string, { icon: LucideIcon; color: string }> = {
  'Cash': { icon: DollarSign, color: '#34C759' },
  'KBZ Pay': { icon: Smartphone, color: '#E4002B' },
  'UAB Pay': { icon: Landmark, color: '#0F4C81' },
  'AYA Pay': { icon: Landmark, color: '#0F7B3E' },
  'MMQR (National QR)': { icon: QrCode, color: '#0A66C2' },
  'Wave Money': { icon: Smartphone, color: '#00B5E2' },
  'CB Bank (CB Pay)': { icon: Landmark, color: '#E4002B' },
  'Yoma Bank (Next)': { icon: Landmark, color: '#6C1D45' },
  'KBZ Bank (iBanking)': { icon: Landmark, color: '#E4002B' },
  'AYA Bank (mBanking)': { icon: Landmark, color: '#0F7B3E' },
};
const getPaymentMeta = (name: string) => PAYMENT_METHOD_META[name] || { icon: DollarSign, color: '#0071E3' };

/** Payment method tile — shared by the method grid and Split Payment (was duplicated verbatim, P2 audit 2026-08-08) */
const tileBase = 'flex-1 min-w-[150px]! md:min-w-[165px]! min-h-[56px] p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center space-x-2.5';

function PaymentMethodTile({ selected, selectedClass, icon: Icon, iconColor, name, desc, onClick }: {
  selected: boolean;
  selectedClass: string;
  icon: any;
  iconColor: string;
  name: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={`${tileBase} ${
        selected ? selectedClass : 'bg-white text-ink border-line hover:bg-surface'
      }`}
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface">
        <Icon className="w-4 h-4" style={{ color: selected ? '#FFFFFF' : iconColor }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`leading-tight font-extrabold ${selected ? 'text-white' : 'text-ink'}`}>{name}</div>
        <div className={`text-xs font-normal leading-tight ${selected ? 'text-white' : 'text-muted'}`}>
          {desc}
        </div>
      </div>
    </Button>
  );
}

// Group a raw IMEI/S/N into readable chunks: 350627792231777 -> 3506 2779 2231 777
interface PosInvoicingModuleProps {
  workOrders: WorkOrder[];
  customers: Customer[];
  parts?: PartItem[];
  systemSettings?: SystemSettings;
  onMarkPaid: (workOrder: WorkOrder, method: string) => void;
  onOpenPrintTag?: (wo: WorkOrder) => void;
  onSaveWorkOrder?: (wo: WorkOrder) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
  onOpenSettings?: () => void;
}

const deviceIconOf = (model: string): LucideIcon => {
  const m = (model || '').toLowerCase();
  if (m.includes('ipad') || m.includes('tablet')) return Tablet;
  if (m.includes('watch')) return Watch;
  if (m.includes('mac') || m.includes('macbook') || m.includes('laptop') || m.includes('imac')) return Laptop;
  return Smartphone;
};

const repairSummaryOf = (wo: WorkOrder): string => {
  const repairs = (wo.selectedRepairs || []).filter((r) => r && r.name);
  if (repairs.length > 0) return repairs.map((r) => r.name).join(', ');
  const items = (wo.lineItems || []).map((li) => li.description || li.partName || '').filter(Boolean);
  if (items.length > 0) return items.join(', ');
  return wo.symptomsReported || 'General Repair';
};

export const PosInvoicingModule: React.FC<PosInvoicingModuleProps> = ({
  workOrders,
  parts = [],
  systemSettings,
  onMarkPaid,
  onOpenPrintTag,
  onSaveWorkOrder,
  searchQuery = '',
  dateFilter: propDateFilter,
  statusFilter = 'ALL',
  onOpenSettings,
}) => {
  const currency = systemSettings?.currencySymbol || 'MMK';
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  const [selectedWoId, setSelectedWoId] = useState<string>(workOrders[0]?.id || '');
  const isIpad = useIsIpad();
  const [paymentMethod, setPaymentMethod] = useState<string>(activePaymentMethods[0]?.name || 'Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [printableInvoiceWo, setPrintableInvoiceWo] = useState<WorkOrder | null>(null);
  const [localDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifWo, setNotifWo] = useState<WorkOrder | null>(null);
  const [inventoryPartId, setInventoryPartId] = useState<string>('');
  const [inventoryPartQty, setInventoryPartQty] = useState<number>(1);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Left (ticket queue) panel collapse toggle
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);

  // POS keyboard-first: focus the cash tendered field the moment the payment
  // confirmation panel opens, so staff can type the amount immediately.
  const cashInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (isConfirmOpen) {
      const t = setTimeout(() => cashInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isConfirmOpen]);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([
    { method: 'Cash', amount: 0 },
    { method: 'KBZPay', amount: 0 },
  ]);

  // Currently selected method config
  const selectedMethodConfig = activePaymentMethods.find((m) => m.name === paymentMethod);

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;

  // Filter Work Orders by date, search, and status - ONLY show devices AFTER diagnostic is completed
  const dateFiltered = filterByDateRange<WorkOrder>(workOrders, dateFilter);
  const filteredWorkOrders = dateFiltered.filter((wo) => {
    // Checkout-viable only: Finished / Taken Out tickets with a recorded QA
    // checklist (same set that gets the green $ icon on Trello/rosters).
    if (wo.status !== 'Finished' && wo.status !== 'Taken Out') return false;
    const isDiagnosticDone = Boolean(wo.postRepairChecklist);

    if (!isDiagnosticDone) return false;

    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      wo.orderNumber.toLowerCase().includes(q) ||
      wo.customerName.toLowerCase().includes(q) ||
      wo.deviceModel.toLowerCase().includes(q) ||
      wo.serialNumber.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Paid' && wo.isPaid) ||
      (statusFilter === 'Pending Payment' && !wo.isPaid);

    return matchesSearch && matchesStatus;
  });

  const selectedWo = filteredWorkOrders.find((w) => w.id === selectedWoId) || filteredWorkOrders[0] || null;
  const filteredInventoryParts = useMemo(() => {
    if (!selectedWo) return parts;

    const model = selectedWo.deviceModel || '';
    // Include ALL line items (labor + parts) so a "Battery" labor line or a
    // "Back Glass" part line both drive the category filter. Previously only
    // non-labor items were used, so battery/display repairs added as labor
    // items showed every inventory category (incl. Backglass).
    const repairText = (selectedWo.lineItems || [])
      .map((item) => {
        const extra = item as WorkOrderLineItem & { name?: string; category?: string };
        return `${item.description || ''} ${item.partName || ''} ${extra.name || ''} ${extra.category || ''}`;
      })
      .join(' ');
    const normalizedRepairText = normalizeText(repairText);

    const matchedCategories = Array.from(
      new Set(
        INVENTORY_CATEGORY_GROUPS
          .filter((group) => group.match.test(normalizedRepairText))
          .flatMap((group) => group.categories)
      )
    );

    return parts.filter((part) => {
      const matchesModel =
        !model ||
        part.deviceCompatibility.some((device) => isSameDeviceModel(device, model));

      const matchesCategory =
        matchedCategories.length === 0 ||
        matchedCategories.some((category) => normalizeText(category) === normalizeText(part.category || ''));

      return matchesModel && matchesCategory;
    });
  }, [parts, selectedWo]);

  const selectedInventoryPart = filteredInventoryParts.find((part) => part.id === inventoryPartId) || filteredInventoryParts[0] || null;
  const taxRate = ((systemSettings?.taxPercentage ?? 6) || 0) / 100;

  useEffect(() => {
    if (!selectedInventoryPart && filteredInventoryParts[0]) {
      setInventoryPartId(filteredInventoryParts[0].id);
    }
    if (selectedInventoryPart && !filteredInventoryParts.some((part) => part.id === selectedInventoryPart.id)) {
      setInventoryPartId(filteredInventoryParts[0]?.id || '');
    }
  }, [filteredInventoryParts, selectedInventoryPart]);

  const recalculateTotals = (lineItems: WorkOrder['lineItems'], discountAmount: number, depositAmount: number) => {
    const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);
    const taxAmount = Math.round(subtotal * taxRate);
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount - depositAmount);
    return { subtotal, taxAmount, totalAmount };
  };

  const handleAddInventoryPartToWorkOrder = () => {
    if (!selectedWo || !selectedInventoryPart) return;

    const qty = Math.max(1, Math.floor(Number(inventoryPartQty) || 1));
    const partLineId = `${selectedInventoryPart.id}-${Date.now()}`;
    const existingLines = [...(selectedWo.lineItems || [])];
    const samePartIndex = existingLines.findIndex(
      (item) =>
        !item.isLabor &&
        item.partId === selectedInventoryPart.id &&
        item.unitCost === selectedInventoryPart.costPrice &&
        item.unitPrice === selectedInventoryPart.sellingPrice
    );

    let nextLineItems: WorkOrder['lineItems'];
    if (samePartIndex >= 0) {
      nextLineItems = existingLines.map((item, idx) =>
        idx === samePartIndex
          ? {
              ...item,
              quantity: (Number(item.quantity) || 0) + qty,
            }
          : item
      );
    } else {
      nextLineItems = [
        ...existingLines,
        {
          id: partLineId,
          description: selectedInventoryPart.name,
          partId: selectedInventoryPart.id,
          partName: selectedInventoryPart.name,
          partQuality: selectedInventoryPart.qualityTier,
          unitCost: selectedInventoryPart.costPrice,
          unitPrice: selectedInventoryPart.sellingPrice,
          quantity: qty,
          isLabor: false,
        },
      ];
    }

    const totals = recalculateTotals(nextLineItems, selectedWo.discountAmount, selectedWo.depositAmount);
    const updatedWo: WorkOrder = {
      ...selectedWo,
      lineItems: nextLineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      updatedAt: new Date().toISOString(),
    };
    onSaveWorkOrder?.(updatedWo);
    setInventoryPartQty(1);
  };

  const handleRemoveInventoryPartFromWorkOrder = (lineItemId: string) => {
    if (!selectedWo || !onSaveWorkOrder) return;

    const nextLineItems = (selectedWo.lineItems || []).filter((item) => item.id !== lineItemId);
    const totals = recalculateTotals(nextLineItems, selectedWo.discountAmount, selectedWo.depositAmount);
    const updatedWo: WorkOrder = {
      ...selectedWo,
      lineItems: nextLineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      updatedAt: new Date().toISOString(),
    };
    onSaveWorkOrder(updatedWo);
  };

  const handleProcessPayment = () => {
    if (!selectedWo || isProcessingPayment) return;
    if (activePaymentMethods.length === 0) {
      toast.error('No payment methods enabled. Enable one in Settings → Payment Methods.', 'Payment Unavailable');
      return;
    }
    let finalMethod = paymentMethod;
    if (paymentMethod === 'Split Payment') {
      const validSplits = splitPayments.filter((s) => s.amount > 0);
      if (validSplits.length === 0) {
        toast.error('Please enter at least one split payment amount.', 'Split Payment Incomplete');
        return;
      }
      finalMethod = `Split Payment (${validSplits.map((s) => `${s.method}: ${s.amount.toLocaleString()} {currency}`).join(' + ')})`;
    }
    setIsProcessingPayment(true);
    try {
      onMarkPaid(selectedWo, finalMethod);
      // Reuse the intake A4 voucher printer (same document as intake) with PAID badge.
      if (onOpenPrintTag) {
        const paidWo = { ...selectedWo, isPaid: true, paymentMethod: finalMethod as any };
        onOpenPrintTag(paidWo);
      } else {
        setIsReceiptModalOpen(true);
      }
    } finally {
      // Release after a short window so rapid double-clicks cannot double-charge.
      window.setTimeout(() => setIsProcessingPayment(false), 1200);
    }
  };

  // Quick Action to charge Diagnostic Fee Only (စက်စစ်ခ) for Cant Repair / Customer Cancelled
  const handleApplyDiagnosticFeeOnly = () => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const diagFee = 5000; // 5000 MMK standard diagnostic inspection fee
    const updatedWo: WorkOrder = {
      ...selectedWo,
      lineItems: [
        {
          id: 'diag-fee-item',
          description: 'Diagnostic & Inspection Fee',
          quantity: 1,
          unitCost: 0,
          unitPrice: diagFee,
          isLabor: true,
        },
      ],
      subtotal: diagFee,
      taxAmount: Math.round(diagFee * taxRate),
      totalAmount: Math.round(diagFee * (1 + taxRate)) - selectedWo.discountAmount - selectedWo.depositAmount,
      updatedAt: new Date().toISOString(),
    };
    onSaveWorkOrder(updatedWo);
  };

  return (
    <div className={`space-y-3 ${isIpad ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      <div className={`flex flex-col md:flex-row gap-3 text-xs pb-16 md:pb-0 ${isIpad ? 'md:flex-1 md:min-h-0' : ''}`}>
        {/* Left Column: Select Work Order to Checkout (collapsible, hugs sidebar) */}
        <div className={`bg-white border border-line rounded-2xl p-3 space-y-3 shadow-xs shrink-0 ${
          isQueueCollapsed ? 'md:w-9' : 'md:w-[380px]'
        } ${isIpad ? 'md:flex md:flex-col md:min-h-0' : 'md:self-start'}`}>
          <div className="flex justify-between items-center border-b border-line pb-2">
            {!isQueueCollapsed ? (
              <>
                <h2 className="font-bold text-ink text-xs">Ready to Checkout ({filteredWorkOrders.length})</h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono font-bold bg-success/10 text-success-deep px-2 py-0.5 rounded-full border border-success/20">
                    Checkout
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQueueCollapsed(true)}
                    className="!h-6 !min-h-6 w-6 px-0 rounded flex items-center justify-center text-muted hover:bg-surface hover:text-ink transition-colors"
                    title="Collapse ticket list"
                    aria-label="Collapse ticket list"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsQueueCollapsed(false)}
                className="w-full h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface hover:text-brand transition-colors"
                title="Expand ticket list"
                aria-label="Expand ticket list"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {!isQueueCollapsed && (
          <div className={`space-y-2 overflow-y-auto ${isIpad ? 'md:flex md:flex-col md:min-h-0 md:flex-1 md:max-h-none' : 'min-h-[360px] max-h-[calc(100dvh-280px)]'}`}>
            {filteredWorkOrders.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center text-muted space-y-2 bg-surface rounded-xl border border-dashed border-line-strong my-4">
                <CheckCircle2 className="w-8 h-8 mx-auto text-success opacity-70" />
                <p className="font-extrabold text-ink text-xs">No Devices with Finished Diagnostics</p>
                <p className="text-xs text-muted">Appears here automatically after diagnostics.</p>
              </div>
            ) : (
              filteredWorkOrders.map((wo) => {
                const isSelected = wo.id === selectedWoId;
                const handleSelectWo = () => {
                  setSelectedWoId(wo.id);
                  // Reset per-transaction state so a previous customer's cash/split
                  // amounts never leak into the next checkout.
                  setCashTendered(0);
                  setSplitPayments([
                    { method: activePaymentMethods[0]?.name || 'Cash', amount: 0 },
                    { method: activePaymentMethods[1]?.name || 'KBZPay', amount: 0 },
                  ]);
                };

                return (
                  <div
                    key={wo.id}
                    role="radio"
                    tabIndex={0}
                    aria-checked={isSelected}
                    aria-label={`Select work order ${wo.orderNumber}`}
                    onClick={handleSelectWo}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectWo();
                      }
                    }}
                    className={`group cursor-pointer rounded-xl border bg-white p-3 shadow-2xs transition-all hover:shadow-md hover:border-brand/50 select-none ${
                      isSelected ? 'border-brand ring-2 ring-brand/20 bg-brand-soft/40' : 'border-line'
                    }`}
                  >
                    {/* Top row: order # + priority */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-[11px] font-extrabold text-brand truncate">{wo.orderNumber}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <PriorityBadge priority={wo.priority} size="xs" />
                        <span className={`text-[9px] font-black px-1.5 py-px rounded uppercase ${
                          wo.isPaid ? 'bg-success text-white' : 'bg-warning text-white'
                        }`}>
                          {wo.isPaid ? 'PAID' : 'DUE'}
                        </span>
                      </div>
                    </div>

                    {/* Device + customer */}
                    <p className="mt-1.5 text-xs font-extrabold text-ink truncate">{wo.deviceModel}</p>
                    <p className="text-[11px] text-muted truncate">{wo.customerName} · {wo.customerPhone}</p>

                    {/* Repair summary */}
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted leading-snug">
                      {repairSummaryOf(wo)}
                    </p>

                    {/* Footer: tech + amount */}
                    <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                      <span className="flex items-center space-x-1 text-[11px] font-bold text-brand min-w-0 truncate">
                        <UserCheck className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[80px]">{wo.assignedTechName || 'Unassigned'}</span>
                      </span>
                      <span className="font-mono text-[11px] font-black text-success-deep">{wo.totalAmount.toLocaleString()} {currency}</span>
                    </div>
                  </div>
                );
              })
            )}
            {filteredWorkOrders.length > 0 && (
              <p className="text-center text-xs font-mono font-bold text-muted pt-2 pb-1 tracking-widest select-none">
                — End of queue —
              </p>
            )}
          </div>
          )}

          {isQueueCollapsed && filteredWorkOrders.length > 0 && (
            <div className={`space-y-1.5 ${isIpad ? 'md:flex md:flex-col md:min-h-0 md:flex-1 md:max-h-none' : 'min-h-[360px] max-h-[calc(100dvh-280px)] overflow-y-auto'}`}>
              {filteredWorkOrders.map((wo) => {
                const DeviceIcon = deviceIconOf(wo.deviceModel);
                const isSel = wo.id === selectedWoId;
                return (
                  <button
                    key={wo.id}
                    type="button"
                    onClick={() => setSelectedWoId(wo.id)}
                    className={`w-full p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors ${
                      isSel ? 'bg-brand text-white' : 'bg-surface text-ink hover:bg-line'
                    }`}
                    title={`${wo.orderNumber} · ${wo.deviceModel} · ${wo.customerName}`}
                    aria-label={`Select ${wo.orderNumber} ${wo.deviceModel}`}
                  >
                    <DeviceIcon className={`w-4 h-4 ${isSel ? 'text-white' : 'text-brand'}`} />
                    <span className={`text-[8px] font-black leading-none ${isSel ? 'text-white' : 'text-muted'}`}>
                      {wo.isPaid ? '✓' : '$'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Invoice & Terminal Checkout (8 cols) */}
        <div className={`flex-1 min-w-0 bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs ${isIpad ? 'md:flex md:flex-col md:min-h-0 md:overflow-y-auto' : ''}`}>
          {selectedWo ? (
            <div className="space-y-5">
              <div className="border-b border-line pb-3 space-y-2">
                {/* Line 1: WO number + status + Notify */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-mono font-bold text-brand text-sm">{selectedWo.orderNumber}</span>
                    <StatusChip status={selectedWo.status} />
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      setNotifWo(selectedWo);
                      setIsNotifModalOpen(true);
                    }}
                    className="h-10 px-3 bg-purple/10 hover:bg-purple/20 text-purple font-extrabold text-xs rounded-xl border border-purple/30 transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                    title="Send SMS / Viber / Telegram Notification"
                  >
                    <BellRing className="w-3.5 h-3.5 text-purple" />
                    <span>Notify Customer</span>
                  </Button>
                </div>

                {/* Line 2: device + customer */}
                <div className="flex items-end justify-between gap-3">
                  <h2 className="text-base font-bold text-ink truncate">{selectedWo.deviceModel}</h2>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ink text-xs">{selectedWo.customerName}</p>
                  </div>
                </div>
              </div>

              {/* Special Warning & Diagnostic Fee Quick Action if Cant Repair / Customer Cancelled */}
              {(selectedWo.status === 'Cant Repair' || selectedWo.status === 'Customer Not Repair') && (
                <div className="bg-danger/10 border border-danger/30 p-3.5 rounded-2xl space-y-2.5 animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-danger shrink-0" />
                      <div>
                        <span className="font-extrabold text-danger text-xs block">
                          {selectedWo.status === 'Cant Repair' ? "Unrepairable Device" : "Customer Cancelled"}
                        </span>
                        <span className="text-xs text-danger">
                          Option to charge Diagnostic / Inspection fee only before handing back device.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-danger/30">
                    <span className="text-xs font-extrabold text-danger">
                      Standard Diagnostic Fee: 5,000 {currency}
                    </span>
                    <Button
                      type="button"
                      onClick={handleApplyDiagnosticFeeOnly}
                      className="px-3 py-1 bg-danger hover:bg-danger-deep text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      Apply Diagnostic Fee Only (စက်စစ်ခ သာကောက်မည်)
                    </Button>
                  </div>
                </div>
              )}

              {/* Itemized Line Items Breakdown */}
              <div className="space-y-2">
                <h3 className="font-bold text-brand text-xs">Itemized Labor & Parts</h3>
                {/* overflow-x-auto instead of overflow-hidden: the Amount cell
                    (strike-through + discounted price + remove button) and long
                    part names used to get clipped with no way to reach them on
                    ≤390px phones (audit P1-B). min-w lets it scroll on mobile
                    instead of crushing; desktop is wide enough to fit. */}
                <div className="relative">
                <div className="border border-line rounded-xl overflow-x-auto bg-surface/80">
                  <table className="w-full text-left min-w-[520px]">
                    <thead className="sticky top-0 z-10 bg-surface text-muted text-xs uppercase font-mono border-b border-line">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {selectedWo.lineItems.map((li) => {
                        // Match line item to its original repair quote so we can
                        // show the ORIGINAL price (before any discount).
                        const quote = (selectedWo.selectedRepairs || []).find(
                          (r) => r && r.name && r.name.toLowerCase() === String(li.description || '').toLowerCase()
                        );
                        const originalPrice = quote && typeof quote.basePrice === 'number' && quote.basePrice > 0
                          ? quote.basePrice
                          : li.unitPrice;
                        const hasDiscount = quote && typeof quote.discountPercent === 'number' && quote.discountPercent > 0;
                        return (
                        <tr key={li.id} className={li.partId && !li.isLabor ? 'bg-brand-soft/60' : ''}>
                          <td className="px-2.5 py-3 text-ink">
                            <div className="space-y-1">
                              <div className="font-medium">{li.description}</div>
                              {li.partId && !li.isLabor && (
                                <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-brand">
                                  Inventory Part
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-3 align-top text-right text-muted">{li.quantity}</td>
                          <td className="px-2.5 py-3 align-top text-right font-mono text-muted">
                            {Number(li.unitPrice || 0).toLocaleString()}
                          </td>
                          <td className="px-2.5 py-3 align-top text-right font-mono text-ink">
                            <div className="inline-flex items-center justify-end gap-2">
                              <span className="text-right">
                                {hasDiscount && (
                                  <>
                                    <span className="mr-1.5 text-xs text-muted line-through">
                                      {originalPrice.toLocaleString()} {currency}
                                    </span>
                                    <span className="text-success-deep font-black">
                                      {(li.unitPrice * li.quantity).toLocaleString()} {currency}
                                    </span>
                                  </>
                                )}
                                {!hasDiscount && <span>{(li.unitPrice * li.quantity).toLocaleString()} {currency}</span>}
                              </span>
                              {li.partId && !li.isLabor && (
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger/10 hover:text-danger active:scale-90"
                                  title="Remove inventory part"
                                  aria-label={`Remove ${li.description}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Right-edge fade for the horizontally-scrolling invoice (below xl) */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-white/70 to-transparent xl:hidden" />
                </div>

                <div className="bg-white border border-line rounded-xl p-4 space-y-2">
                  <Button
                    type="button"
                    onClick={() => setIsAddPartOpen(!isAddPartOpen)}
                    aria-expanded={isAddPartOpen}
                    className="w-full min-h-10 flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <span>
                      <h4 className="text-xs font-extrabold text-white">Add Inventory Part Used</h4>
                      <p className="text-xs text-white">Pick the stock part used on this ticket before payment.</p>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/70 shrink-0 transition-transform ${isAddPartOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {isAddPartOpen && (
                  <div className="flex items-end gap-2 pt-1">
                    <label className="block min-w-0 flex-1">
                      <span className="block text-xs font-bold text-muted mb-1">Inventory part</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={inventoryPartId || (selectedInventoryPart ? selectedInventoryPart.id : '')}
                          onChange={(e) => setInventoryPartId(e.target.value)}
                          className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-semibold text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                        >
                          {filteredInventoryParts
                            .filter((part) => part.quantityInStock > 0)
                            .map((part) => (
                              <option key={part.id} value={part.id}>
                                {part.name} • Stock: {part.quantityInStock}
                              </option>
                            ))}
                          {filteredInventoryParts.filter((part) => part.quantityInStock > 0).length === 0 && (
                            <option value="">No parts in stock</option>
                          )}
                        </select>
                        {selectedInventoryPart && selectedInventoryPart.quantityInStock > 0 && (
                          <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold ${
                            selectedInventoryPart.quantityInStock <= selectedInventoryPart.reorderPoint
                              ? 'text-warning'
                              : 'text-success'
                          }`}>
                            {selectedInventoryPart.quantityInStock <= selectedInventoryPart.reorderPoint ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <PackageCheck className="h-3 w-3" />
                            )}
                            Stock: {selectedInventoryPart.quantityInStock}
                            {selectedInventoryPart.quantityInStock <= selectedInventoryPart.reorderPoint
                              ? ' — Low'
                              : ' available'}
                          </span>
                        )}
                      </div>
                    </label>

                    <label className="block shrink-0">
                      <span className="block text-xs font-bold text-muted mb-1">Qty</span>
                      <Input
                        type="number"
                        min={1}
                        max={selectedInventoryPart?.quantityInStock || 99}
                        value={inventoryPartQty || ''}
                        onChange={(e) => setInventoryPartQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        className="w-16 rounded-lg border border-line bg-surface px-2 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                      />
                    </label>

                    <Button
                      type="button"
                      onClick={handleAddInventoryPartToWorkOrder}
                      disabled={!selectedInventoryPart}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand px-3.5 text-xs font-extrabold text-white transition-all hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add Part
                    </Button>
                  </div>
                  )}
                </div>

                {/* Calculation Summary */}
                <div className="bg-surface/80 p-4 rounded-xl border border-line space-y-1.5 text-right">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono text-ink">{selectedWo.subtotal.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Sales Tax ({Math.round(taxRate * 100)}%):</span>
                    <span className="font-mono text-ink">{selectedWo.taxAmount.toLocaleString()} {currency}</span>
                  </div>
                  {selectedWo.discountAmount > 0 && (
                    <div className="flex justify-between text-success-deep">
                      <span>Discount:</span>
                      <span className="font-mono">-{selectedWo.discountAmount.toLocaleString()} {currency}</span>
                    </div>
                  )}
                  {selectedWo.depositAmount > 0 && (
                    <div className="flex justify-between text-success-deep">
                      <span>Upfront Deposit Paid:</span>
                      <span className="font-mono">-{selectedWo.depositAmount.toLocaleString()} {currency}</span>
                    </div>
                  )}
                  <div className="rounded-xl bg-brand-soft border border-brand/20 p-4 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-ink">Amount Due Now:</span>
                    <span className="text-brand font-mono text-2xl font-black tracking-tight">
                      {selectedWo.totalAmount.toLocaleString()} <span className="text-sm font-extrabold">{currency}</span>
                    </span>
                  </div>
                  {selectedWo.inventoryConsumptionAmount > 0 && selectedWo.inventorySettlementStatus !== 'settled' && (
                    <div className="rounded-xl bg-warning/10 border border-warning/30 px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-warning flex items-center gap-1">
                        <Coins className="w-3 h-3 text-warning shrink-0" />
                        Parts cost used from stock — settle Inventory Fund
                      </span>
                      <span className="font-mono font-black text-warning">
                        {selectedWo.inventoryConsumptionAmount.toLocaleString()} {currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Gateway Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-brand text-xs flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payment Method Selection ({activePaymentMethods.length} Enabled)</span>
                  </h3>
                  <Button variant="ghost" type="button" onClick={onOpenSettings} className="text-xs text-brand hover:underline font-semibold cursor-pointer" title="Open Settings → Payment Methods">Configured in Settings → Payment Methods</Button>
                </div>

                {activePaymentMethods.length === 0 ? (
                  <div className="p-4 text-center bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning space-y-1">
                    <AlertTriangle className="w-5 h-5 mx-auto text-warning" />
                    <p className="font-extrabold">No payment methods enabled</p>
                    <p>Enable one in Settings → Payment Methods to accept payment.</p>
                  </div>
                ) : (
                <div className="flex flex-wrap gap-2">
                  {activePaymentMethods.map((m) => {
                    const isSelected = paymentMethod === m.name;
                    const meta = getPaymentMeta(m.name);
                    const Icon = meta.icon;
                    return (
                      <PaymentMethodTile
                        key={m.id}
                        selected={isSelected}
                        selectedClass="bg-brand text-white border-brand shadow-2xs"
                        icon={Icon}
                        iconColor={meta.color}
                        name={m.name}
                        desc={m.category}
                        onClick={() => setPaymentMethod(m.name)}
                      />
                    );
                  })}

                  {/* Split Payment Button */}
                  <PaymentMethodTile
                    selected={paymentMethod === 'Split Payment'}
                    selectedClass="bg-purple text-white border-purple shadow-2xs"
                    icon={Split}
                    iconColor="#7360F2"
                    name="Split Payment"
                    desc="Multi-Method"
                    onClick={() => {
                      setPaymentMethod('Split Payment');
                      if (selectedWo && splitPayments[0].amount === 0 && splitPayments[1].amount === 0) {
                        const half = Math.round(selectedWo.totalAmount / 2);
                        setSplitPayments([
                          { method: activePaymentMethods[0]?.name || 'Cash', amount: half },
                          { method: activePaymentMethods[1]?.name || 'KBZPay', amount: selectedWo.totalAmount - half },
                        ]);
                      }
                    }}
                  />
                </div>
                )}

                {/* Split Payment Interactive Breakdown UI */}
                {paymentMethod === 'Split Payment' && (
                  <div className="p-3.5 bg-purple/10/80 border border-purple/30 rounded-xl space-y-3 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-purple/30 pb-2">
                      <span className="font-extrabold text-ink flex items-center space-x-1.5">
                        <Split className="w-4 h-4 text-purple" />
                        <span>Split Payment Breakdown (အကွဲပေးချေမှု)</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-purple/10 text-purple px-2 py-0.5 rounded-full border border-purple/20">
                        Due: {selectedWo.totalAmount.toLocaleString()} {currency}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {splitPayments.map((sp, idx) => {
                        const otherSum = splitPayments.reduce((acc, curr, i) => (i === idx ? acc : acc + (curr.amount || 0)), 0);
                        const remForThis = Math.max(0, selectedWo.totalAmount - otherSum);

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-purple/20 shadow-2xs">
                            <span className="font-mono text-xs text-purple font-extrabold px-1.5 py-0.5 bg-purple/15/70 rounded shrink-0 self-start sm:self-auto">
                              #{idx + 1}
                            </span>

                            {/* Select Method */}
                            <select
                              value={sp.method}
                              onChange={(e) => {
                                const updated = [...splitPayments];
                                updated[idx].method = e.target.value;
                                setSplitPayments(updated);
                              }}
                              className="bg-surface border border-line rounded-lg p-1.5 text-xs font-extrabold text-ink focus:border-purple focus:ring-1 focus:ring-purple outline-none"
                            >
                              {activePaymentMethods.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({m.category})
                                </option>
                              ))}
                            </select>

                            {/* Amount Input */}
                            <div className="flex-1 flex items-center space-x-1.5">
                              <Input
                                type="number"
                                value={sp.amount || ''}
                                onChange={(e) => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = Math.max(0, Number(e.target.value) || 0);
                                  setSplitPayments(updated);
                                }}
                                placeholder="Amount MMK"
                                className="w-full bg-surface border border-line rounded-lg p-1.5 text-xs font-mono font-bold text-ink focus:border-purple focus:ring-1 focus:ring-purple outline-none"
                              />
                              <Button
                                type="button"
                                onClick={() => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = remForThis;
                                  setSplitPayments(updated);
                                }}
                                className="px-2 py-1.5 bg-purple/15 hover:bg-purple-200 text-purple font-bold text-xs rounded-lg border border-purple/30 shrink-0 cursor-pointer transition-all active:scale-95"
                                title="Auto-fill remaining amount"
                              >
                                Auto-Fill
                              </Button>
                            </div>

                            {/* Remove Row Button if > 2 */}
                            {splitPayments.length > 2 && (
                              <Button
                                type="button"
                                onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                                className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove split method"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Calculation Summary & Controls */}
                    {(() => {
                      const currentTotalPaid = splitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                      const diff = currentTotalPaid - selectedWo.totalAmount;
                      return (
                        <div className="pt-2 border-t border-purple/30 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="text-muted">
                              Paid Total: <strong className="font-mono text-ink">{currentTotalPaid.toLocaleString()} {currency}</strong>
                            </span>
                            {diff === 0 ? (
                              <span className="text-success-deep font-extrabold text-xs flex items-center space-x-1 bg-success/10 px-2 py-0.5 rounded-full border border-success/30">
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                <span>Balanced</span>
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-success-deep font-bold text-xs">
                                Change: +{diff.toLocaleString()} {currency}
                              </span>
                            ) : (
                              <span className="text-danger font-bold text-xs">
                                Short: {Math.abs(diff).toLocaleString()} {currency}
                              </span>
                            )}
                          </div>

                          {splitPayments.length < 4 && (
                            <Button
                              type="button"
                              onClick={() => {
                                const currentTotal = splitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                                const remaining = Math.max(0, selectedWo.totalAmount - currentTotal);
                                const unusedMethod =
                                  activePaymentMethods.find((m) => !splitPayments.some((s) => s.method === m.name))?.name ||
                                  activePaymentMethods[0]?.name ||
                                  'Cash';
                                setSplitPayments([...splitPayments, { method: unusedMethod, amount: remaining }]);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-purple/15 text-purple font-bold text-xs rounded-lg border border-purple/30 transition-all flex items-center space-x-1 cursor-pointer shrink-0 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Split Method</span>
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Account / QR details box if selected method has accountNumber or accountName */}
                {selectedMethodConfig && (selectedMethodConfig.accountNumber || selectedMethodConfig.notes) && (
                  <div className="p-3.5 bg-brand-soft/80 border border-brand/30 rounded-xl space-y-2 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-ink flex items-center space-x-1.5">
                        <Landmark className="w-4 h-4 text-brand" />
                        <span>{selectedMethodConfig.name} - Account Transfer Details</span>
                      </span>
                      {selectedMethodConfig.accountNumber && (
                        <Button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedMethodConfig.accountNumber || '');
                            setCopiedAccount(true);
                            setTimeout(() => setCopiedAccount(false), 2000);
                          }}
                          variant="outline"
                          className="px-2 py-1 bg-white hover:bg-brand/15 text-brand border border-brand/30"
                        >
                          {copiedAccount ? (
                            <>
                              <Check className="w-3 h-3 text-success" />
                              <span className="text-xs text-success-deep">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-xs">Copy Number</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      {selectedMethodConfig.accountNumber && (
                        <div>
                          <span className="text-muted block text-xs">Account / Phone No:</span>
                          <span className="font-mono font-extrabold text-brand">{selectedMethodConfig.accountNumber}</span>
                        </div>
                      )}
                      {selectedMethodConfig.accountName && (
                        <div>
                          <span className="text-muted block text-xs">Beneficiary Name:</span>
                          <span className="font-bold text-ink">{selectedMethodConfig.accountName}</span>
                        </div>
                      )}
                      {selectedMethodConfig.notes && (
                        <div className="col-span-2">
                          <span className="text-muted block text-xs">Reference / Instructions:</span>
                          <span className="text-ink italic">{selectedMethodConfig.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === 'Cash' && (
                  <div className="p-4 bg-surface/80 border border-line rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-extrabold text-ink">Cash Amount Tendered (MMK):</label>
                      <div className="flex flex-wrap items-center gap-1">
                        {[selectedWo.totalAmount, 50000, 100000, 200000, 500000]
                          .filter((v, i, arr) => arr.indexOf(v) === i)
                          .map((amt) => (
                            <Button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(amt)}
                              variant="outline"
                              className={`h-10 px-2 ${
                                cashTendered === amt
                                  ? 'bg-brand text-white border-brand'
                                  : 'bg-white text-ink border-line hover:bg-brand-soft'
                              }`}
                            >
                              {amt === selectedWo.totalAmount ? 'Exact' : amt.toLocaleString()}
                            </Button>
                          ))}
                      </div>
                    </div>
                    <Input
                      ref={cashInputRef}
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="e.g. 250000"
                      inputMode="numeric"
                      className="w-full bg-white border border-line rounded-lg p-2 text-ink font-mono focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                    {/* On-screen numpad — cashier speed on phones */}
                    <div className="grid grid-cols-3 gap-1.5 md:hidden pt-0.5">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map((key) => (
                        <Button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (key === '⌫') {
                              setCashTendered(Math.floor(cashTendered / 10));
                            } else {
                              setCashTendered(Number(String(cashTendered || '') + key) || 0);
                            }
                          }}
                          variant="outline"
                          className="h-11 font-mono text-sm font-black hover:bg-brand-soft hover:border-brand"
                          aria-label={`Numpad ${key}`}
                        >
                          {key}
                        </Button>
                      ))}
                    </div>
                    {cashTendered > 0 && cashTendered < selectedWo.totalAmount && (
                      <p className="flex items-center gap-1.5 text-danger font-extrabold text-xs bg-danger/10 border border-danger/30 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Short: {(selectedWo.totalAmount - cashTendered).toLocaleString()} {currency}
                      </p>
                    )}
                    {cashTendered >= selectedWo.totalAmount && (
                      <p className="flex items-center gap-1.5 text-success-deep font-extrabold text-sm bg-success/10 border border-success/30 rounded-xl px-3 py-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-success-deep" />
                        Change Due: {(cashTendered - selectedWo.totalAmount).toLocaleString()} {currency}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Receipt preview — what Pay & Print will produce */}
              <div className="rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-muted">Receipt Preview</span>
                  <FileText className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="mx-3 mb-3 rounded-lg border border-dashed border-line-strong bg-white px-3 py-2.5 font-mono text-xs leading-relaxed text-ink">
                  <div className="text-center font-black uppercase tracking-widest text-xs">i35 Apple Service</div>
                  <div className="text-center text-muted">No 1031, Pyi Htaung Su Main Rd, North Dagon</div>
                  <div className="my-1.5 border-t border-dashed border-line-strong" />
                  <div className="flex justify-between"><span className="text-muted">Invoice</span><span className="font-bold">{selectedWo.orderNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Device</span><span className="max-w-[55%] truncate font-bold">{selectedWo.deviceModel}</span></div>
                  <div className="my-1.5 border-t border-dashed border-line-strong" />
                  {(selectedWo.lineItems || []).slice(0, 3).map((li) => (
                    <div key={li.id} className="flex justify-between gap-2">
                      <span className="truncate">{li.description}</span>
                      <span className="shrink-0">{(Number(li.unitPrice || 0) * (li.quantity || 1)).toLocaleString()}</span>
                    </div>
                  ))}
                  {(selectedWo.lineItems || []).length > 3 && (
                    <div className="text-muted">… +{(selectedWo.lineItems || []).length - 3} more</div>
                  )}
                  <div className="my-1.5 border-t border-dashed border-line-strong" />
                  <div className="flex justify-between"><span className="text-muted">Discount</span><span>-{(selectedWo.discountAmount || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between font-black text-xs"><span>TOTAL</span><span>{selectedWo.totalAmount.toLocaleString()} {currency}</span></div>
                  <div className="text-center text-muted mt-1">Thank you for your business!</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => {
                    if (selectedWo) {
                      setPrintableInvoiceWo(selectedWo);
                      setIsInvoiceModalOpen(true);
                    }
                  }}
                  variant="secondary"
                  className="w-full sm:w-1/2 border border-line-strong"
                >
                  <FileText className="w-4 h-4 text-brand shrink-0" />
                  <span className="truncate">Print Itemized Invoice</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isProcessingPayment}
                  className={`w-full sm:w-1/2 ${
                    isProcessingPayment
                      ? 'bg-muted text-white opacity-80'
                      : 'bg-success hover:bg-success/90 text-white'
                  }`}
                >
                  {isProcessingPayment ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay & Print Receipt</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted flex flex-col items-center justify-center space-y-3 min-h-[380px]">
              <Receipt className="w-12 h-12 text-muted/30" />
              <p className="font-extrabold text-sm text-ink">No Finished Device Selected</p>
              <p className="text-xs max-w-xs text-muted">Finished repairs only — select one to process payment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky checkout bar: keeps Amount Due + Pay visible without
          scrolling past the device list (md:hidden so desktop keeps the
          in-flow action row). */}
      {selectedWo && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-sm px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:hidden shadow-raised-top">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-xs font-bold text-muted uppercase tracking-wide">Amount Due</p>
              <p className="font-mono font-black text-brand text-base leading-tight">{selectedWo.totalAmount.toLocaleString()} {currency}</p>
              {paymentMethod === 'Cash' && cashTendered >= selectedWo.totalAmount && (
                <p className="text-xs font-extrabold text-success-deep leading-tight">
                  Change: {(cashTendered - selectedWo.totalAmount).toLocaleString()} {currency}
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isProcessingPayment}
              variant="success"
              className="flex-1 max-w-[220px] py-3 hover:bg-success/90"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="truncate hidden sm:inline">Pay & Print Receipt</span>
              <span className="sm:hidden">Pay</span>
            </Button>
          </div>
        </div>
      )}

      {/* Payment Confirmation */}
      {isConfirmOpen && selectedWo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-success" />
                <h3 className="font-extrabold text-sm text-ink">Confirm Payment</h3>
              </div>
              <Button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                variant="iconGhost"
                size="iconSm"
                className="text-muted hover:text-ink"
                aria-label="Close confirmation"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Order</span>
                <span className="font-mono font-bold text-brand">{selectedWo.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Device</span>
                <span className="font-bold text-ink">{selectedWo.deviceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Method</span>
                <span className="font-bold text-ink">{paymentMethod}</span>
              </div>
              {paymentMethod === 'Cash' && cashTendered > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">Tendered</span>
                    <span className="font-mono">{cashTendered.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Change</span>
                    <span className="font-mono font-bold text-success">
                      {Math.max(0, cashTendered - selectedWo.totalAmount).toLocaleString()} {currency}
                    </span>
                  </div>
                </>
              )}
              {paymentMethod === 'Cash' && cashTendered > 0 && cashTendered < selectedWo.totalAmount && (
                <div className="flex justify-between">
                  <span className="text-muted">Short</span>
                  <span className="font-mono font-bold text-danger">
                    {(selectedWo.totalAmount - cashTendered).toLocaleString()} {currency}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-brand-soft border border-brand/20 p-4 flex items-center justify-between">
              <span className="text-xs font-extrabold text-ink">Total to collect</span>
              <span className="text-brand font-mono text-lg font-black">{selectedWo.totalAmount.toLocaleString()} {currency}</span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                variant="secondary"
                className="flex-1 border border-line-strong"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  handleProcessPayment();
                }}
                disabled={isProcessingPayment}
                className="flex-1 bg-success hover:bg-success/90 text-white"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Confirm & Print</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {isReceiptModalOpen && selectedWo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <style>{`
            @media print {
              nav, header, footer, aside, .no-print {
                display: none !important;
              }
              html, body, #root, #main-content-scroll, main {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
              }
              .fixed, .inset-0 {
                position: static !important;
                background: transparent !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
              }
              .printable-pos-receipt {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 20px !important;
                box-shadow: none !important;
                border: 1px solid #D2D2D7 !important;
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
              }
              @page {
                size: portrait;
                margin: 8mm;
              }
            }
          `}</style>
          <div className="printable-pos-receipt bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl">
            <div className="text-center space-y-1.5 border-b border-line pb-3">
              {systemSettings?.shopLogoUrl && (
                <div className="flex justify-center mb-1">
                  <img
                    src={systemSettings.shopLogoUrl}
                    alt="Shop Logo"
                    className="logo-chip h-10 max-w-[140px] object-contain bg-white border border-line rounded-lg p-0.5"
                  />
                </div>
              )}
              <h2 className="font-extrabold text-lg text-ink">
                {systemSettings?.shopName || 'AppleRepair Pro'}
              </h2>
              <p className="text-muted text-xs">
                {systemSettings?.receiptHeaderTitle || 'Official ACMT Certified Service Voucher'}
              </p>
              {systemSettings?.shopPhone && (
                <p className="text-xs text-muted font-mono">
                  Tel: {systemSettings.shopPhone}
                </p>
              )}
              <p className="text-brand font-mono font-bold pt-0.5">{selectedWo.orderNumber}</p>
            </div>

            <div className="space-y-1 text-ink">
              <div className="flex justify-between">
                <span className="text-muted">Customer:</span>
                <span className="font-bold text-ink">{selectedWo.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Device:</span>
                <span className="font-bold text-ink">{selectedWo.deviceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Payment Method:</span>
                <span className="font-mono text-brand">{paymentMethod}</span>
              </div>
            </div>

            <div className="p-4 bg-surface rounded-xl border border-line space-y-1 font-mono">
              <div className="flex justify-between text-success-deep font-bold">
                <span>TOTAL PAID:</span>
                <span>
                  {selectedWo.totalAmount.toLocaleString()} {systemSettings?.currencySymbol || 'MMK'}
                </span>
              </div>
            </div>

            <div className="p-2 bg-surface rounded-xl border border-line text-xs text-muted text-center italic">
              {systemSettings?.receiptFooterNote || 'Thank you for choosing AppleRepair! All repairs covered by warranty.'}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 no-print">
              <Button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setPrintableInvoiceWo(selectedWo);
                  setIsInvoiceModalOpen(true);
                }}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-1"
              >
                <FileText className="w-3.5 h-3.5 text-brand" />
                <span>Full Invoice</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    console.warn('Print failed:', e);
                  }
                }}
                size="sm"
                className="bg-brand hover:bg-brand-deep text-white flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Printable Invoice Modal */}
      <PrintableInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        workOrder={printableInvoiceWo}
        systemSettings={systemSettings}
      />

      {/* Customer Notification Trigger Modal */}
      {notifWo && (
        <CustomerNotificationModal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
          workOrder={notifWo}
          settings={systemSettings}
        />
      )}
    </div>
  );
};
