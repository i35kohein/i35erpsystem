import React, { useEffect, useMemo, useState } from 'react';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import { 
  CreditCard,
  DollarSign,
  Receipt,
  Coins,
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  Smartphone, 
  User, 
  Percent,
  Plus,
  FileText,
  QrCode,
  Landmark,
  Copy,
  PackageX,
  PackageCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BellRing,
  AlertTriangle, 
  XCircle, 
  Split,
  Filter,
  Wrench,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import { WorkOrder, Customer, SystemSettings, PartItem, WorkOrderLineItem } from '../../types';
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

// Group a raw IMEI/S/N into readable chunks: 350627792231777 -> 3506 2779 2231 777
const formatSerialGrouped = (value: string): string => {
  const digits = value.replace(/[^0-9a-zA-Z]/g, '');
  if (/^\d{15}$/.test(digits)) return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  return value.trim();
};

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

export const PosInvoicingModule: React.FC<PosInvoicingModuleProps> = ({
  workOrders,
  customers,
  parts = [],
  systemSettings,
  onMarkPaid,
  onOpenPrintTag,
  onSaveWorkOrder,
  searchQuery = '',
  dateFilter: propDateFilter,
  setDateFilter: propSetDateFilter,
  statusFilter = 'ALL',
  onOpenSettings,
}) => {
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  const [selectedWoId, setSelectedWoId] = useState<string>(workOrders[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<string>(activePaymentMethods[0]?.name || 'Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [printableInvoiceWo, setPrintableInvoiceWo] = useState<WorkOrder | null>(null);
  const [localDateFilter, setLocalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifWo, setNotifWo] = useState<WorkOrder | null>(null);
  const [inventoryPartId, setInventoryPartId] = useState<string>('');
  const [inventoryPartQty, setInventoryPartQty] = useState<number>(1);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([
    { method: 'Cash', amount: 0 },
    { method: 'KBZPay', amount: 0 },
  ]);

  // Currently selected method config
  const selectedMethodConfig = activePaymentMethods.find((m) => m.name === paymentMethod);

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  // Filter Work Orders by date, search, and status - ONLY show devices AFTER diagnostic is completed
  const dateFiltered = filterByDateRange<WorkOrder>(workOrders, dateFilter);
  const filteredWorkOrders = dateFiltered.filter((wo) => {
    // Normal repair tickets enter POS only after the post-repair QA record is saved.
    // Declined/unrepairable tickets remain eligible so the diagnostic fee can be collected.
    const hasRecordedDiagnostic =
      (wo.beforeDiagnostics && wo.beforeDiagnostics.some((diagnostic) => diagnostic.status === 'Pass' || diagnostic.status === 'Fail')) ||
      (wo.diagnosticResult && wo.diagnosticResult.trim().length > 0 && wo.diagnosticResult !== 'Diagnostic Pending');
    const isDeclinedDiagnostic =
      (wo.status === 'Cant Repair' || wo.status === 'Customer Not Repair') &&
      hasRecordedDiagnostic;
    const isDiagnosticDone = Boolean(wo.postRepairChecklist) || isDeclinedDiagnostic;

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
      finalMethod = `Split Payment (${validSplits.map((s) => `${s.method}: ${s.amount.toLocaleString()} MMK`).join(' + ')})`;
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
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-12 pb-16 md:pb-0">
        {/* Left Column: Select Work Order to Checkout (5 cols) */}
        <div className="md:col-span-5 bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-xs md:self-start">
          <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
            <h2 className="font-bold text-[#1D1D1F] text-xs">Diagnostic Completed Devices ({filteredWorkOrders.length})</h2>
            <span className="text-[10px] font-mono font-bold bg-[#34C759]/10 text-[#28A745] px-2 py-0.5 rounded-full border border-[#34C759]/20">
              Diag Finished
            </span>
          </div>

          <div className="space-y-2 min-h-[360px] max-h-[calc(100dvh-280px)] overflow-y-auto">
            {filteredWorkOrders.length === 0 ? (
              <div className="p-8 text-center text-[#86868B] space-y-2 bg-[#F5F5F7] rounded-xl border border-dashed border-[#D2D2D7] my-4">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-70" />
                <p className="font-extrabold text-[#1D1D1F] text-xs">No Devices with Finished Diagnostics</p>
                <p className="text-[11px] text-[#86868B]">
                  New intakes pending diagnostic inspection are hidden. Work orders automatically appear here in POS after diagnostic testing is completed.
                </p>
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
                    role="button"
                    tabIndex={0}
                    onClick={handleSelectWo}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectWo();
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0F6FF] border-[#0071E3] shadow-xs'
                        : 'bg-[#F5F5F7] border-[#E5E5EA] hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-mono font-bold text-[#0071E3] flex items-center gap-1">
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                        {wo.orderNumber}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase ${
                          wo.status === 'Taken Out' ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {wo.status}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                          wo.isPaid ? 'bg-[#EAF8ED] text-[#28A745] border-[#34C759]/20' : 'bg-[#FFF4E5] text-[#D97706] border-[#FF9F0A]/20'
                        }`}>
                          {wo.isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 mt-1">
                      <p className="font-semibold text-[#1D1D1F] truncate">{wo.deviceModel}</p>
                      <span className="font-mono font-bold text-[#1D1D1F] shrink-0">{wo.totalAmount.toLocaleString()} MMK</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {(wo.selectedRepairs || []).filter((r) => r && r.name).slice(0, 2).map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md border border-[#0071E3]/20 bg-[#0071E3]/8 px-1.5 py-0.5 text-[9px] font-extrabold text-[#0071E3]">
                          <Wrench className="h-2.5 w-2.5" />
                          {r.name}
                        </span>
                      ))}
                      {(wo.selectedRepairs || []).filter((r) => r && r.name).length > 2 && (
                        <span className="text-[9px] font-bold text-[#86868B]">+{((wo.selectedRepairs || []).filter((r) => r && r.name).length) - 2}</span>
                      )}
                      {wo.deviceColor && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#1D1D1F] border border-[#E5E5EA]">
                          <Palette className="h-2.5 w-2.5 text-[#86868B]" />
                          {wo.deviceColor}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#86868B] mt-1">
                      <span className="truncate">
                        Cust: {wo.customerName}
                        {wo.depositAmount > 0 && (
                          <span className="text-[#0071E3] font-bold"> · Deposit {wo.depositAmount.toLocaleString()} MMK</span>
                        )}
                      </span>
                      {(wo.imei || wo.serialNumber) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const raw = wo.imei || wo.serialNumber || '';
                            navigator.clipboard?.writeText(raw).then(() => toast('IMEI copied')).catch(() => {});
                          }}
                          title="Copy IMEI"
                          aria-label={`Copy IMEI ${wo.imei || wo.serialNumber}`}
                          className="font-mono text-[10px] shrink-0 truncate text-[#86868B] hover:text-[#0071E3] transition-colors"
                        >
                          #{formatSerialGrouped(wo.imei || wo.serialNumber)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Invoice & Terminal Checkout (7 cols) */}
        <div className="md:col-span-7 bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          {selectedWo ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[#0071E3] text-sm">{selectedWo.orderNumber}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      selectedWo.status === 'Finished' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      selectedWo.status === 'Taken Out' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {selectedWo.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[#1D1D1F]">{selectedWo.deviceModel}</h2>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifWo(selectedWo);
                      setIsNotifModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#7360F2]/10 hover:bg-[#7360F2]/20 text-[#7360F2] font-extrabold text-xs rounded-xl border border-[#7360F2]/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                    title="Send SMS / Viber / Telegram Notification"
                  >
                    <BellRing className="w-3.5 h-3.5 text-[#7360F2]" />
                    <span>Notify Customer</span>
                  </button>

                  <div className="text-right border-l border-[#E5E5EA] pl-3">
                    <span className="text-[#86868B] text-[10px]">Customer:</span>
                    <p className="font-bold text-[#1D1D1F] text-xs">{selectedWo.customerName}</p>
                  </div>
                </div>
              </div>

              {/* Special Warning & Diagnostic Fee Quick Action if Cant Repair / Customer Cancelled */}
              {(selectedWo.status === 'Cant Repair' || selectedWo.status === 'Customer Not Repair') && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2.5 animate-fade-in">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-rose-900 text-xs block">
                          {selectedWo.status === 'Cant Repair' ? "Unrepairable Device" : "Customer Cancelled"}
                        </span>
                        <span className="text-[11px] text-rose-700">
                          Option to charge Diagnostic / Inspection fee only before handing back device.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-rose-200">
                    <span className="text-[11px] font-extrabold text-rose-950">
                      Standard Diagnostic Fee: 5,000 MMK
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyDiagnosticFeeOnly}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      Apply Diagnostic Fee Only (စက်စစ်ခ သာကောက်မည်)
                    </button>
                  </div>
                </div>
              )}

              {/* Itemized Line Items Breakdown */}
              <div className="space-y-2">
                <h3 className="font-bold text-[#0071E3] text-xs">Itemized Labor & Parts</h3>
                <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-[#F5F5F7]/80">
                  <table className="w-full text-left">
                    <thead className="bg-[#F5F5F7] text-[#86868B] text-[10px] uppercase font-mono border-b border-[#E5E5EA]">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
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
                        <tr key={li.id} className={li.partId && !li.isLabor ? 'bg-[#F8FBFF]' : ''}>
                          <td className="p-2.5 text-[#1D1D1F]">
                            <div className="space-y-1">
                              <div className="font-medium">{li.description}</div>
                              {hasDiscount && (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                                  Discount {quote.discountPercent}% off
                                </span>
                              )}
                              {li.partId && !li.isLabor && (
                                <span className="inline-flex items-center rounded-full border border-[#D6E7FF] bg-[#F0F6FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0071E3]">
                                  Inventory Part
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-right text-[#86868B]">{li.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-[#86868B]">
                            {Number(li.unitPrice || 0).toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono text-[#1D1D1F]">
                            <div className="inline-flex items-center justify-end gap-2">
                              <span className="text-right">
                                {hasDiscount && (
                                  <>
                                    <span className="mr-1.5 text-[10px] text-[#A5A5AA] line-through">
                                      {originalPrice.toLocaleString()} MMK
                                    </span>
                                    <span className="text-[#28A745] font-black">
                                      {(li.unitPrice * li.quantity).toLocaleString()} MMK
                                    </span>
                                  </>
                                )}
                                {!hasDiscount && <span>{(li.unitPrice * li.quantity).toLocaleString()} MMK</span>}
                              </span>
                              {li.partId && !li.isLabor && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                  title="Remove inventory part"
                                  aria-label={`Remove ${li.description}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border border-[#E5E5EA] rounded-xl p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPartOpen(!isAddPartOpen)}
                    aria-expanded={isAddPartOpen}
                    className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <span>
                      <h4 className="text-xs font-extrabold text-[#1D1D1F]">Add Inventory Part Used</h4>
                      <p className="text-[10px] text-[#86868B]">Pick the stock part used on this ticket before payment.</p>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#86868B] shrink-0 transition-transform ${isAddPartOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAddPartOpen && (
                  <div className="flex items-end gap-2 pt-1">
                    <label className="block min-w-0 flex-1">
                      <span className="block text-[10px] font-bold text-[#86868B] mb-1">Inventory part</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={inventoryPartId || (selectedInventoryPart ? selectedInventoryPart.id : '')}
                          onChange={(e) => setInventoryPartId(e.target.value)}
                          className="min-w-0 flex-1 truncate rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-2.5 py-2 text-[11px] font-semibold text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
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
                          <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-bold ${
                            selectedInventoryPart.quantityInStock <= selectedInventoryPart.reorderPoint
                              ? 'text-amber-600'
                              : 'text-[#34C759]'
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
                      <span className="block text-[10px] font-bold text-[#86868B] mb-1">Qty</span>
                      <input
                        type="number"
                        min={1}
                        max={selectedInventoryPart?.quantityInStock || 99}
                        value={inventoryPartQty || ''}
                        onChange={(e) => setInventoryPartQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        className="w-16 rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-2 py-2 text-[11px] font-mono font-bold text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleAddInventoryPartToWorkOrder}
                      disabled={!selectedInventoryPart}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#0071E3] px-3.5 py-2 text-[11px] font-extrabold text-white transition-all hover:bg-[#005BBB] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add Part
                    </button>
                  </div>
                  )}
                </div>

                {/* Calculation Summary */}
                <div className="bg-[#F5F5F7]/80 p-3 rounded-xl border border-[#E5E5EA] space-y-1.5 text-right">
                  <div className="flex justify-between text-[#86868B]">
                    <span>Subtotal:</span>
                    <span className="font-mono text-[#1D1D1F]">{selectedWo.subtotal.toLocaleString()} MMK</span>
                  </div>
                  <div className="flex justify-between text-[#86868B]">
                    <span>Sales Tax ({Math.round(taxRate * 100)}%):</span>
                    <span className="font-mono text-[#1D1D1F]">{selectedWo.taxAmount.toLocaleString()} MMK</span>
                  </div>
                  {selectedWo.discountAmount > 0 && (
                    <div className="flex justify-between text-[#28A745]">
                      <span>Discount:</span>
                      <span className="font-mono">-{selectedWo.discountAmount.toLocaleString()} MMK</span>
                    </div>
                  )}
                  {selectedWo.depositAmount > 0 && (
                    <div className="flex justify-between text-[#28A745]">
                      <span>Upfront Deposit Paid:</span>
                      <span className="font-mono">-{selectedWo.depositAmount.toLocaleString()} MMK</span>
                    </div>
                  )}
                  <div className="rounded-xl bg-[#F0F6FF] border border-[#0071E3]/20 p-3 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-[#1D1D1F]">Amount Due Now:</span>
                    <span className="text-[#0071E3] font-mono text-2xl font-black tracking-tight">
                      {selectedWo.totalAmount.toLocaleString()} <span className="text-sm font-extrabold">MMK</span>
                    </span>
                  </div>
                  {selectedWo.inventoryConsumptionAmount > 0 && selectedWo.inventorySettlementStatus !== 'settled' && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-amber-800 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-600 shrink-0" />
                        Parts cost used from stock — settle Inventory Fund
                      </span>
                      <span className="font-mono font-black text-amber-800">
                        {selectedWo.inventoryConsumptionAmount.toLocaleString()} MMK
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Gateway Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0071E3] text-xs flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payment Method Selection ({activePaymentMethods.length} Enabled)</span>
                  </h3>
                  <button type="button" onClick={onOpenSettings} className="text-[10px] text-[#0071E3] hover:underline font-semibold cursor-pointer" title="Open Settings → Payment Methods">Configured in Settings → Payment Methods</button>
                </div>

                {activePaymentMethods.length === 0 ? (
                  <div className="p-4 text-center bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                    <AlertTriangle className="w-5 h-5 mx-auto text-amber-600" />
                    <p className="font-extrabold">No payment methods enabled</p>
                    <p>Enable one in Settings → Payment Methods to accept payment.</p>
                  </div>
                ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {activePaymentMethods.map((m) => {
                    const isSelected = paymentMethod === m.name;
                    const meta = getPaymentMeta(m.name);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.name)}
                        className={`min-h-[56px] p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center space-x-2.5 ${
                          isSelected
                            ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                            : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F7]">
                          <Icon className="w-4 h-4" style={{ color: isSelected ? '#FFFFFF' : meta.color }} />
                        </span>
                        <div className="truncate min-w-0 flex-1">
                          <div className="truncate font-extrabold">{m.name}</div>
                          <div className={`text-[10px] font-normal truncate ${isSelected ? 'text-blue-100' : 'text-[#86868B]'}`}>
                            {m.category}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Split Payment Button */}
                  <button
                    type="button"
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
                    className={`min-h-[56px] p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center space-x-2.5 ${
                      paymentMethod === 'Split Payment'
                        ? 'bg-[#7360F2] text-white border-[#7360F2] shadow-2xs'
                        : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F7]">
                      <Split className="w-4 h-4" style={{ color: paymentMethod === 'Split Payment' ? '#FFFFFF' : '#7360F2' }} />
                    </span>
                    <div className="truncate min-w-0 flex-1">
                      <div className="truncate font-extrabold">Split Payment</div>
                      <div className={`text-[10px] font-normal truncate ${paymentMethod === 'Split Payment' ? 'text-purple-100' : 'text-[#86868B]'}`}>
                        Multi-Method
                      </div>
                    </div>
                  </button>
                </div>
                )}

                {/* Split Payment Interactive Breakdown UI */}
                {paymentMethod === 'Split Payment' && (
                  <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3 text-xs animate-fade-in">
                    <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                      <span className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                        <Split className="w-4 h-4 text-[#7360F2]" />
                        <span>Split Payment Breakdown (အကွဲပေးချေမှု)</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-[#7360F2]/10 text-[#7360F2] px-2 py-0.5 rounded-full border border-[#7360F2]/20">
                        Due: {selectedWo.totalAmount.toLocaleString()} MMK
                      </span>
                    </div>

                    <div className="space-y-2">
                      {splitPayments.map((sp, idx) => {
                        const otherSum = splitPayments.reduce((acc, curr, i) => (i === idx ? acc : acc + (curr.amount || 0)), 0);
                        const remForThis = Math.max(0, selectedWo.totalAmount - otherSum);

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-purple-100 shadow-2xs">
                            <span className="font-mono text-[10px] text-[#7360F2] font-extrabold px-1.5 py-0.5 bg-purple-100/70 rounded shrink-0 self-start sm:self-auto">
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
                              className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-1.5 text-xs font-extrabold text-[#1D1D1F] focus:border-[#7360F2] focus:ring-1 focus:ring-[#7360F2] outline-none"
                            >
                              {activePaymentMethods.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({m.category})
                                </option>
                              ))}
                            </select>

                            {/* Amount Input */}
                            <div className="flex-1 flex items-center space-x-1.5">
                              <input
                                type="number"
                                value={sp.amount || ''}
                                onChange={(e) => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = Math.max(0, Number(e.target.value) || 0);
                                  setSplitPayments(updated);
                                }}
                                placeholder="Amount MMK"
                                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-1.5 text-xs font-mono font-bold text-[#1D1D1F] focus:border-[#7360F2] focus:ring-1 focus:ring-[#7360F2] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = remForThis;
                                  setSplitPayments(updated);
                                }}
                                className="px-2 py-1.5 bg-purple-100 hover:bg-purple-200 text-[#7360F2] font-bold text-[10px] rounded-lg border border-purple-200 shrink-0 cursor-pointer transition-all active:scale-95"
                                title="Auto-fill remaining amount"
                              >
                                Auto-Fill
                              </button>
                            </div>

                            {/* Remove Row Button if > 2 */}
                            {splitPayments.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove split method"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
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
                        <div className="pt-2 border-t border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="text-[#86868B]">
                              Paid Total: <strong className="font-mono text-[#1D1D1F]">{currentTotalPaid.toLocaleString()} MMK</strong>
                            </span>
                            {diff === 0 ? (
                              <span className="text-emerald-700 font-extrabold text-[11px] flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Balanced</span>
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-700 font-bold text-[11px]">
                                Change: +{diff.toLocaleString()} MMK
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold text-[11px]">
                                Short: {Math.abs(diff).toLocaleString()} MMK
                              </span>
                            )}
                          </div>

                          {splitPayments.length < 4 && (
                            <button
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
                              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-[#7360F2] font-bold text-[11px] rounded-lg border border-purple-200 transition-all flex items-center space-x-1 cursor-pointer shrink-0 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Split Method</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Account / QR details box if selected method has accountNumber or accountName */}
                {selectedMethodConfig && (selectedMethodConfig.accountNumber || selectedMethodConfig.notes) && (
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                        <Landmark className="w-4 h-4 text-[#0071E3]" />
                        <span>{selectedMethodConfig.name} - Account Transfer Details</span>
                      </span>
                      {selectedMethodConfig.accountNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedMethodConfig.accountNumber || '');
                            setCopiedAccount(true);
                            setTimeout(() => setCopiedAccount(false), 2000);
                          }}
                          className="px-2 py-1 bg-white hover:bg-blue-100 text-[#0071E3] font-bold rounded-lg border border-blue-200 transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedAccount ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-[10px] text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-[10px]">Copy Number</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      {selectedMethodConfig.accountNumber && (
                        <div>
                          <span className="text-[#86868B] block text-[10px]">Account / Phone No:</span>
                          <span className="font-mono font-extrabold text-[#0071E3]">{selectedMethodConfig.accountNumber}</span>
                        </div>
                      )}
                      {selectedMethodConfig.accountName && (
                        <div>
                          <span className="text-[#86868B] block text-[10px]">Beneficiary Name:</span>
                          <span className="font-bold text-[#1D1D1F]">{selectedMethodConfig.accountName}</span>
                        </div>
                      )}
                      {selectedMethodConfig.notes && (
                        <div className="col-span-2">
                          <span className="text-[#86868B] block text-[10px]">Reference / Instructions:</span>
                          <span className="text-[#1D1D1F] italic">{selectedMethodConfig.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === 'Cash' && (
                  <div className="p-3 bg-[#F5F5F7]/80 border border-[#E5E5EA] rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-extrabold text-[#1D1D1F]">Cash Amount Tendered (MMK):</label>
                      <div className="flex flex-wrap items-center gap-1">
                        {[selectedWo.totalAmount, 50000, 100000, 200000, 500000]
                          .filter((v, i, arr) => arr.indexOf(v) === i)
                          .map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(amt)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer ${
                                cashTendered === amt
                                  ? 'bg-[#0071E3] text-white border-[#0071E3]'
                                  : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F0F6FF]'
                              }`}
                            >
                              {amt === selectedWo.totalAmount ? 'Exact' : amt.toLocaleString()}
                            </button>
                          ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="e.g. 250000"
                      className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] font-mono focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                    {cashTendered > 0 && cashTendered < selectedWo.totalAmount && (
                      <p className="text-rose-600 font-bold text-xs">
                        Short: {(selectedWo.totalAmount - cashTendered).toLocaleString()} MMK
                      </p>
                    )}
                    {cashTendered >= selectedWo.totalAmount && (
                      <p className="text-[#28A745] font-bold text-xs">
                        Change Due: {(cashTendered - selectedWo.totalAmount).toLocaleString()} MMK
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedWo) {
                      setPrintableInvoiceWo(selectedWo);
                      setIsInvoiceModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-1/2 py-3 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#D2D2D7] text-[#1D1D1F] font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <FileText className="w-4 h-4 text-[#0071E3]" />
                  <span>Print Itemized Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isProcessingPayment}
                  className={`w-full sm:w-1/2 py-3 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 ${
                    isProcessingPayment
                      ? 'bg-[#86868B] text-white cursor-not-allowed opacity-80'
                      : 'bg-[#34C759] hover:bg-[#30B753] text-white cursor-pointer active:scale-95'
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
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[#86868B] flex flex-col items-center justify-center space-y-3 min-h-[380px]">
              <Receipt className="w-12 h-12 text-[#86868B]/30" />
              <p className="font-extrabold text-sm text-[#1D1D1F]">No Finished Device Selected</p>
              <p className="text-xs max-w-xs text-[#86868B]">
                Only finished repairs appear in POS. Select a finished work order from the left list to process payment and automatically transition status to Taken Out.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky checkout bar: keeps Amount Due + Pay visible without
          scrolling past the device list (md:hidden so desktop keeps the
          in-flow action row). */}
      {selectedWo && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-[#E5E5EA] bg-white/95 backdrop-blur-sm px-4 py-2.5 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide">Amount Due</p>
              <p className="font-mono font-black text-[#0071E3] text-base leading-tight">{selectedWo.totalAmount.toLocaleString()} MMK</p>
            </div>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isProcessingPayment}
              className="flex-1 max-w-[220px] py-3 rounded-xl bg-[#34C759] hover:bg-[#30B753] text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay & Print Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Confirmation */}
      {isConfirmOpen && selectedWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#34C759]" />
                <h3 className="font-extrabold text-sm text-[#1D1D1F]">Confirm Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                aria-label="Close confirmation"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#86868B]">Order</span>
                <span className="font-mono font-bold text-[#0071E3]">{selectedWo.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Device</span>
                <span className="font-bold text-[#1D1D1F]">{selectedWo.deviceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Method</span>
                <span className="font-bold text-[#1D1D1F]">{paymentMethod}</span>
              </div>
              {paymentMethod === 'Cash' && cashTendered > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#86868B]">Tendered</span>
                    <span className="font-mono">{cashTendered.toLocaleString()} MMK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868B]">Change</span>
                    <span className="font-mono font-bold text-[#34C759]">
                      {Math.max(0, cashTendered - selectedWo.totalAmount).toLocaleString()} MMK
                    </span>
                  </div>
                </>
              )}
              {paymentMethod === 'Cash' && cashTendered > 0 && cashTendered < selectedWo.totalAmount && (
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Short</span>
                  <span className="font-mono font-bold text-rose-600">
                    {(selectedWo.totalAmount - cashTendered).toLocaleString()} MMK
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#F0F6FF] border border-[#0071E3]/20 p-3 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#1D1D1F]">Total to collect</span>
              <span className="text-[#0071E3] font-mono text-lg font-black">{selectedWo.totalAmount.toLocaleString()} MMK</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-2.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#D2D2D7] text-[#1D1D1F] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  handleProcessPayment();
                }}
                disabled={isProcessingPayment}
                className="flex-1 py-2.5 bg-[#34C759] hover:bg-[#30B753] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm & Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {isReceiptModalOpen && selectedWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
          <div className="printable-pos-receipt bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl">
            <div className="text-center space-y-1.5 border-b border-[#E5E5EA] pb-3">
              {systemSettings?.shopLogoUrl && (
                <div className="flex justify-center mb-1">
                  <img
                    src={systemSettings.shopLogoUrl}
                    alt="Shop Logo"
                    className="h-10 max-w-[140px] object-contain"
                  />
                </div>
              )}
              <h2 className="font-extrabold text-lg text-[#1D1D1F]">
                {systemSettings?.shopName || 'AppleRepair Pro'}
              </h2>
              <p className="text-[#86868B] text-[10px]">
                {systemSettings?.receiptHeaderTitle || 'Official ACMT Certified Service Voucher'}
              </p>
              {systemSettings?.shopPhone && (
                <p className="text-[10px] text-[#86868B] font-mono">
                  Tel: {systemSettings.shopPhone}
                </p>
              )}
              <p className="text-[#0071E3] font-mono font-bold pt-0.5">{selectedWo.orderNumber}</p>
            </div>

            <div className="space-y-1 text-[#1D1D1F]">
              <div className="flex justify-between">
                <span className="text-[#86868B]">Customer:</span>
                <span className="font-bold text-[#1D1D1F]">{selectedWo.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Device:</span>
                <span className="font-bold text-[#1D1D1F]">{selectedWo.deviceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Payment Method:</span>
                <span className="font-mono text-[#0071E3]">{paymentMethod}</span>
              </div>
            </div>

            <div className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-1 font-mono">
              <div className="flex justify-between text-[#28A745] font-bold">
                <span>TOTAL PAID:</span>
                <span>
                  {selectedWo.totalAmount.toLocaleString()} {systemSettings?.currencySymbol || 'MMK'}
                </span>
              </div>
            </div>

            <div className="p-2 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] text-[10px] text-[#86868B] text-center italic">
              {systemSettings?.receiptFooterNote || 'Thank you for choosing AppleRepair! All repairs covered by warranty.'}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 no-print">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-3 py-1.5 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setPrintableInvoiceWo(selectedWo);
                  setIsInvoiceModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#1D1D1F] font-bold rounded-xl flex items-center space-x-1 border border-[#D2D2D7]"
              >
                <FileText className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Full Invoice</span>
              </button>
              <button
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    console.warn('Print failed:', e);
                  }
                }}
                className="px-4 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-xl flex items-center space-x-1 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
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
