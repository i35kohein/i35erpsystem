
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIsIpad } from '../../hooks/useIsIpad';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import {CreditCard,
  Receipt,
  Coins,
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  Plus,
  FileText,
  Landmark,
  Copy,
  PackageCheck,
  Check,
  AlertTriangle, 
  XCircle, 
  X,
  Split,
  UserCheck,
  ChevronsLeft,
  ChevronsRight,
  ChevronsDown,
  Pencil,
  Wrench,
  Percent,
  Search,
  CircleDot,
} from 'lucide-react';
import { WorkOrder, Customer, SystemSettings, PartItem, WorkOrderLineItem } from '../../types';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { ModelRepairPrice } from '../../types/priceCatalog';
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
// Group a raw IMEI/S/N into readable chunks: 350627792231777 -> 3506 2779 2231 777
interface PosInvoicingModuleProps {
  workOrders: WorkOrder[];
  customers: Customer[];
  parts?: PartItem[];
  systemSettings?: SystemSettings;
  onMarkPaid: (workOrder: WorkOrder, method: string, completedAtIso?: string) => void;
  onOpenPrintTag?: (wo: WorkOrder) => void;
  onSaveWorkOrder?: (wo: WorkOrder) => void;
  priceCatalog?: ModelRepairPrice[];
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
}

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
  priceCatalog,
  searchQuery = '',
  dateFilter: propDateFilter,
  statusFilter = 'ALL',
}) => {
  const currency = systemSettings?.currencySymbol || 'MMK';
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  // Parts owner filter — APP (shop) vs KZH (Ko Hein) (Ko Hein 2026-08-10)
  const [posOwner, setPosOwner] = useState<'ALL' | 'APP' | 'KZH'>('ALL');
  const [selectedWoId, setSelectedWoId] = useState<string>(workOrders[0]?.id || '');
  const isIpad = useIsIpad();
  const [paymentMethod, setPaymentMethod] = useState<string>(activePaymentMethods[0]?.name || 'Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  // Backdate checkout support (Ko Hein 2026-08-10): default today, staff can
  // pick an earlier date when re-entering past data.
  const [checkoutDate, setCheckoutDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [printableInvoiceWo, setPrintableInvoiceWo] = useState<WorkOrder | null>(null);
  const [localDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifWo] = useState<WorkOrder | null>(null);
  const [inventoryPartId, setInventoryPartId] = useState<string>('');
  const [inventoryPartQty, setInventoryPartQty] = useState<number>(1);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMobileCheckoutFullOpen, setIsMobileCheckoutFullOpen] = useState(false);
  // Left (ticket queue) panel collapse toggle
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);

  // Custom repair / service line item form (Ko Hein 2026-08-10)
  const [isAddCustomRepairOpen, setIsAddCustomRepairOpen] = useState(false);
  const [customRepairName, setCustomRepairName] = useState('');
  const [customRepairPrice, setCustomRepairPrice] = useState<number>(0);
  const [customRepairQty, setCustomRepairQty] = useState<number>(1);

  // Price List repair picker (Ko Hein 2026-08-10)
  const [isAddRepairFromPriceListOpen, setIsAddRepairFromPriceListOpen] = useState(false);
  const [posCatalogSelection, setPosCatalogSelection] = useState<string[]>([]);
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');

  // Invoice-level discount input (Ko Hein 2026-08-10)
  const [invoiceDiscountInput, setInvoiceDiscountInput] = useState<string>('');

  // Line item inline editing (Ko Hein 2026-08-10)
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

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
    { method: activePaymentMethods[1]?.name || 'KBZPay', amount: 0 },
  ]);

  // Keep split-row methods valid as payment settings load/change (audit P2):
  // a stale 'KBZPay' row would record an invalid method string on checkout.
  const activeMethodNames = activePaymentMethods.map((m) => m.name).join('|');
  useEffect(() => {
    if (activePaymentMethods.length === 0) return;
    setSplitPayments((prev) => {
      let changed = false;
      const next = prev.map((s, i) => {
        const valid = activePaymentMethods.some((m) => m.name === s.method);
        if (valid) return s;
        changed = true;
        return {
          ...s,
          method: activePaymentMethods[i % activePaymentMethods.length]?.name || activePaymentMethods[0].name,
        };
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMethodNames]);

  // Currently selected method config
  const selectedMethodConfig = activePaymentMethods.find((m) => m.name === paymentMethod);

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;

  // Filter Work Orders by date, search, and status - ONLY show devices AFTER diagnostic is completed
  const dateFiltered = filterByDateRange<WorkOrder>(workOrders, dateFilter);
  const filteredWorkOrders = dateFiltered.filter((wo) => {
    // Checkout-viable only: Finished / Taken Out tickets with a recorded QA
    // checklist (same set that gets the green $ icon on Trello/rosters), plus
    // Cant Repair / Customer Not Repair tickets so the Diagnostic-Fee-Only
    // quick action is reachable (they never get a QA checklist).
    if (wo.status !== 'Finished' && wo.status !== 'Taken Out' && wo.status !== 'Cant Repair' && wo.status !== 'Customer Not Repair') return false;
    const isDiagnosticDone =
      Boolean(wo.postRepairChecklist) ||
      wo.status === 'Cant Repair' ||
      wo.status === 'Customer Not Repair';

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

  // Keep the selection in sync with the list — otherwise the right panel shows
  // the first ticket while the left queue highlights a stale id (audit P2).
  useEffect(() => {
    if (selectedWoId && !filteredWorkOrders.some((w) => w.id === selectedWoId)) {
      setSelectedWoId(filteredWorkOrders[0]?.id || '');
    }
  }, [filteredWorkOrders, selectedWoId]);

  // Per-transaction reset shared by every ticket-selection path (expanded rows
  // AND the collapsed queue) so a previous customer's cash/split never leaks
  // into the next checkout (audit P2).
  // Per-transaction reset shared by every ticket-selection path (expanded rows
  // AND the collapsed queue) so a previous customer's cash/split never leaks
  // into the next checkout (audit P2).
  const resetTransactionState = () => {
    setCashTendered(0);
    setSplitPayments([
      { method: activePaymentMethods[0]?.name || 'Cash', amount: 0 },
      { method: activePaymentMethods[1]?.name || 'Cash', amount: 0 },
    ]);
  };

  // Computed: labor vs parts breakdown for customer / system views (Ko Hein 2026-08-10)
  const laborItems = useMemo(() => (selectedWo?.lineItems || []).filter((li) => li.isLabor), [selectedWo]);
  const partsItems = useMemo(() => (selectedWo?.lineItems || []).filter((li) => !li.isLabor && li.partId), [selectedWo]);
  const laborSubtotal = useMemo(() => laborItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0), [laborItems]);
  const partsSubtotal = useMemo(() => partsItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0), [partsItems]);
  const partsCostTotal = useMemo(() => partsItems.reduce((s, li) => s + (li.unitCost || 0) * li.quantity, 0), [partsItems]);
  const perItemDiscountTotal = useMemo(
    () => laborItems.reduce((s, li) => {
      if (!li.lineItemDiscountPercent) return s;
      return s + Math.round(li.unitPrice * li.quantity * (li.lineItemDiscountPercent / 100));
    }, 0),
    [laborItems]
  );

  const filteredInventoryParts = useMemo(() => {
    const ownerFiltered = posOwner === 'ALL' ? parts : parts.filter((part) => (part.owner || 'APP') === posOwner);
    if (!selectedWo) return ownerFiltered;

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

    return ownerFiltered.filter((part) => {
      const matchesModel =
        !model ||
        part.deviceCompatibility.some((device) => isSameDeviceModel(device, model));

      const matchesCategory =
        matchedCategories.length === 0 ||
        matchedCategories.some((category) => normalizeText(category) === normalizeText(part.category || ''));

      return matchesModel && matchesCategory;
    });
  }, [parts, selectedWo, posOwner]);

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
    const subtotal = lineItems.reduce((sum, item) => {
      const lineTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
      const itemDiscount = item.lineItemDiscountPercent ? lineTotal * (item.lineItemDiscountPercent / 100) : 0;
      return sum + lineTotal - itemDiscount;
    }, 0);
    const taxAmount = Math.round(subtotal * taxRate);
    const totalAmount = Math.max(0, Math.round(subtotal) + taxAmount - discountAmount - depositAmount);
    return { subtotal: Math.round(subtotal), taxAmount, totalAmount };
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

  // Update a single line item field (price, qty, or per-item discount) (Ko Hein 2026-08-10)
  const handleUpdateLineItem = (lineItemId: string, field: 'unitPrice' | 'quantity' | 'lineItemDiscountPercent', value: number) => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const nextLineItems = (selectedWo.lineItems || []).map((item) => {
      if (item.id !== lineItemId) return item;
      if (field === 'unitPrice') return { ...item, unitPrice: Math.max(0, value) };
      if (field === 'quantity') return { ...item, quantity: Math.max(1, Math.floor(value)) };
      if (field === 'lineItemDiscountPercent') return { ...item, lineItemDiscountPercent: Math.min(100, Math.max(0, value)) };
      return item;
    });
    const totals = recalculateTotals(nextLineItems, selectedWo.discountAmount, selectedWo.depositAmount);
    onSaveWorkOrder({
      ...selectedWo,
      lineItems: nextLineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add custom repair / service line item (Ko Hein 2026-08-10)
  const handleAddCustomRepair = () => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const name = customRepairName.trim();
    const price = Math.max(0, Number(customRepairPrice) || 0);
    const qty = Math.max(1, Math.floor(Number(customRepairQty) || 1));
    if (!name || price <= 0) {
      toast.error('Enter a repair name and price greater than 0.', 'Incomplete');
      return;
    }
    const newLine: WorkOrderLineItem = {
      id: `custom-${Date.now()}`,
      description: name,
      unitCost: 0,
      unitPrice: price,
      quantity: qty,
      isLabor: true,
    };
    const nextLineItems = [...(selectedWo.lineItems || []), newLine];
    const totals = recalculateTotals(nextLineItems, selectedWo.discountAmount, selectedWo.depositAmount);
    onSaveWorkOrder({
      ...selectedWo,
      lineItems: nextLineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      updatedAt: new Date().toISOString(),
    });
    setCustomRepairName('');
    setCustomRepairPrice(0);
    setCustomRepairQty(1);
    setIsAddCustomRepairOpen(false);
  };

  // Add selected repairs from Price List as line items (Ko Hein 2026-08-10)
  const handleAddRepairsFromPriceList = (catalogItems: ModelRepairCatalogItem[]) => {
    if (!selectedWo || !onSaveWorkOrder || catalogItems.length === 0) return;
    const newLines: WorkOrderLineItem[] = catalogItems.map((item) => ({
      id: `pricelist-${Date.now()}-${item.categoryKey}`,
      description: item.name,
      unitCost: 0,
      unitPrice: item.price,
      quantity: 1,
      isLabor: true,
    }));
    const nextLineItems = [...(selectedWo.lineItems || []), ...newLines];
    const totals = recalculateTotals(nextLineItems, selectedWo.discountAmount, selectedWo.depositAmount);
    onSaveWorkOrder({
      ...selectedWo,
      lineItems: nextLineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      updatedAt: new Date().toISOString(),
    });
    setIsAddRepairFromPriceListOpen(false);
  };

  // Update whole-invoice discount (Ko Hein 2026-08-10)
  const handleUpdateInvoiceDiscount = (newDiscount: number) => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const discount = Math.max(0, Number(newDiscount) || 0);
    const totals = recalculateTotals(selectedWo.lineItems, discount, selectedWo.depositAmount);
    onSaveWorkOrder({
      ...selectedWo,
      discountAmount: discount,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      updatedAt: new Date().toISOString(),
    });
  };

  // Tendered amount depends on the active method: split = sum of splits,
  // cash = numpad tendered, everything else = full amount (assumed exact).
  const tenderedAmount =
    paymentMethod === 'Split Payment'
      ? splitPayments.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
      : paymentMethod === 'Cash'
        ? Number(cashTendered) || 0
        : selectedWo
          ? selectedWo.totalAmount
          : 0;
  const isPaymentShort = selectedWo ? tenderedAmount < selectedWo.totalAmount : false;

  const handleProcessPayment = () => {
    if (!selectedWo || isProcessingPayment) return;
    if (selectedWo.isPaid) {
      toast.error('This order is already paid — no double charging. Pick a different ticket.', 'Already Paid');
      return;
    }
    if (isPaymentShort) {
      toast.error(
        `Tendered ${tenderedAmount.toLocaleString()} ${currency} is less than due ${selectedWo.totalAmount.toLocaleString()} ${currency}.`,
        'Payment Short'
      );
      return;
    }
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
      finalMethod = `Split Payment (${validSplits.map((s) => `${s.method}: ${s.amount.toLocaleString()} ${currency}`).join(' + ')})`;
    }
    setIsProcessingPayment(true);
    try {
      const checkoutIso = checkoutDate
        ? new Date(`${checkoutDate}T17:30:00`).toISOString() // 17:30 local = 12:00 UTC (stable day anchor)
        : undefined;
      onMarkPaid(selectedWo, finalMethod, checkoutIso);
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
      totalAmount: Math.max(0, Math.round(diagFee * (1 + taxRate)) - (selectedWo.discountAmount || 0) - (selectedWo.depositAmount || 0)),
      updatedAt: new Date().toISOString(),
    };
    onSaveWorkOrder(updatedWo);
  };

  const renderCheckoutPanel = () =>
    selectedWo ? (
            <div className="space-y-5">
              {/* Desktop: left column — ticket header + items + summary */}
              <div className="space-y-5 md:min-w-0">
              <div className="border-b border-line pb-3 space-y-2">
                {/* Line 1: WO number + status + Notify */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-mono font-bold text-brand text-sm">{selectedWo.orderNumber}</span>
                    <StatusChip status={selectedWo.status} />
                  </div>

                </div>

                {/* Line 2: device + customer */}
                <div className="flex items-end justify-between gap-3">
                  <h2 className="text-base font-bold text-ink truncate">{selectedWo.deviceModel}</h2>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ink text-xs">{selectedWo.customerName}</p>
                    {selectedWo.customerPhone && (
                      <p className="text-[11px] font-semibold text-muted mt-0.5">{selectedWo.customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Diagnostic Fee quick action — 5-row Excel table (Ko Hein) */}
              {(selectedWo.status === 'Cant Repair' || selectedWo.status === 'Customer Not Repair') && (
                <div className="border border-danger/40 rounded-lg overflow-hidden bg-white text-xs animate-fadeIn">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="bg-danger/5">
                        <td className="border border-danger/20 px-2 py-1.5">
                          <span className="flex items-center gap-1.5 text-danger font-extrabold">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            {selectedWo.status === 'Cant Repair' ? 'Unrepairable Device' : 'Customer Cancelled'}
                          </span>
                        </td>
                        <td className="border border-danger/20 px-2 py-1.5 text-right font-mono font-bold text-danger">
                          {selectedWo.orderNumber}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-line px-2 py-1.5 text-muted" colSpan={2}>
                          Option: charge Diagnostic / Inspection fee only before handing back device
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-line px-2 py-1.5 text-muted">Standard Diagnostic Fee</td>
                        <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums">
                          5,000 {currency}
                        </td>
                      </tr>
                      <tr className="bg-surface/50">
                        <td className="border border-line px-2 py-1.5 text-muted">Charged Items</td>
                        <td className="border border-line px-2 py-1.5 text-right text-muted">—</td>
                      </tr>
                      <tr>
                        <td className="border border-line px-2 py-1.5" colSpan={2}>
                          <button
                            type="button"
                            onClick={handleApplyDiagnosticFeeOnly}
                            className="w-full py-1.5 rounded-md bg-danger hover:bg-danger-deep text-white font-extrabold text-xs transition-all cursor-pointer active:scale-[0.98] focus:outline-none"
                          >
                            Apply Diagnostic Fee Only (စက်စစ်ခ သာကောက်မည်)
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Itemized Line Items — Labor/Repair + System Parts (Ko Hein 2026-08-10) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-brand text-xs">Itemized Labor & Parts</h3>
                  <span className="text-[10px] text-muted font-semibold">
                    {laborItems.length} repair{laborItems.length !== 1 ? 's' : ''}{partsItems.length > 0 ? ` · ${partsItems.length} part${partsItems.length !== 1 ? 's' : ''}` : ''}
                  </span>
                </div>

                {/* Repair Items (Customer invoice) */}
                {laborItems.length === 0 && partsItems.length === 0 ? (
                  <div className="p-6 text-center text-muted text-xs border border-dashed border-line-strong rounded-lg bg-surface/30">
                    <Wrench className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-brand" />
                    <p className="font-extrabold text-ink">No items added yet</p>
                    <p>Use Add Part, Custom, or Price List below to add line items.</p>
                  </div>
                ) : (
                  <>
                    {/* Repair Items Table */}
                    {laborItems.length > 0 && (
                      <div className="border border-line-strong rounded-lg overflow-hidden bg-white">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface">
                              <th className="border border-line px-2 py-1.5 text-left font-extrabold text-muted text-[11px] uppercase tracking-wide">Repair / Service</th>
                              <th className="border border-line px-2 py-1.5 text-center font-extrabold text-muted text-[11px] uppercase tracking-wide w-14">Qty</th>
                              <th className="border border-line px-2 py-1.5 text-center font-extrabold text-muted text-[11px] uppercase tracking-wide w-24">Unit Price</th>
                              <th className="border border-line px-2 py-1.5 text-center font-extrabold text-muted text-[11px] uppercase tracking-wide w-16">Disc%</th>
                              <th className="border border-line px-2 py-1.5 text-right font-extrabold text-muted text-[11px] uppercase tracking-wide">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {laborItems.map((li) => {
                              const isEditing = editingLineId === li.id;
                              const lineTotal = li.unitPrice * li.quantity;
                              const itemDiscountAmt = li.lineItemDiscountPercent ? Math.round(lineTotal * (li.lineItemDiscountPercent / 100)) : 0;
                              const effectiveTotal = lineTotal - itemDiscountAmt;
                              const originalPrice = li.lineItemDiscountPercent ? lineTotal : null;
                              return (
                                <tr key={li.id} className={`bg-white ${isEditing ? 'ring-2 ring-brand/30' : ''}`}>
                                  {/* Item name + edit toggle */}
                                  <td className="border border-line px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-ink min-w-0 truncate">{li.description}</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingLineId(isEditing ? null : li.id)}
                                        className={`shrink-0 p-0.5 rounded transition-colors cursor-pointer focus:outline-none ${isEditing ? 'text-brand' : 'text-muted hover:text-brand'}`}
                                        title={isEditing ? 'Done editing' : 'Edit price / qty / discount'}
                                      >
                                        {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </td>

                                  {/* Qty — editable */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min={1}
                                        value={li.quantity}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'quantity', Number(e.target.value))}
                                        className="w-full text-center text-xs font-mono font-bold text-ink bg-surface border border-brand rounded px-1 py-0.5 outline-none"
                                      />
                                    ) : (
                                      <span className="text-muted tabular-nums">{li.quantity}</span>
                                    )}
                                  </td>

                                  {/* Unit Price — editable, strike-through if discounted */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min={0}
                                        step={500}
                                        value={li.unitPrice}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'unitPrice', Number(e.target.value))}
                                        className="w-full text-center text-xs font-mono font-bold text-ink bg-surface border border-brand rounded px-1 py-0.5 outline-none"
                                      />
                                    ) : (
                                      <span className={`font-mono tabular-nums ${li.lineItemDiscountPercent ? 'text-muted line-through' : 'text-muted'}`}>
                                        {li.unitPrice.toLocaleString()}
                                      </span>
                                    )}
                                  </td>

                                  {/* Per-item discount % — editable */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={li.lineItemDiscountPercent || ''}
                                          onChange={(e) => handleUpdateLineItem(li.id, 'lineItemDiscountPercent', Number(e.target.value))}
                                          placeholder="0"
                                          className="w-full text-center text-xs font-mono font-bold text-ink bg-surface border border-brand rounded px-1 py-0.5 outline-none"
                                        />
                                        <Percent className="w-3 h-3 text-muted shrink-0" />
                                      </div>
                                    ) : (
                                      <span className={`font-mono tabular-nums ${li.lineItemDiscountPercent ? 'text-success-deep font-bold' : 'text-muted'}`}>
                                        {li.lineItemDiscountPercent ? `${li.lineItemDiscountPercent}%` : '—'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Amount = final after discount */}
                                  <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums whitespace-nowrap">
                                    <div className="flex flex-col items-end gap-0">
                                      <span className="inline-flex items-center gap-1.5">
                                        {effectiveTotal.toLocaleString()}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                          aria-label={`Remove ${li.description}`}
                                          title="Remove line item"
                                          className="text-muted hover:text-danger p-0.5 rounded transition-colors cursor-pointer focus:outline-none"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                      {itemDiscountAmt > 0 && (
                                        <span className="text-[10px] font-semibold text-success">-{itemDiscountAmt.toLocaleString()} off</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* System Parts Section — hidden from customer invoice */}
                    {partsItems.length > 0 && (
                      <div className="border border-dashed border-line rounded-lg overflow-hidden bg-surface/30">
                        <div
                          className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer select-none hover:bg-surface transition-colors"
                          onClick={() => setEditingLineId(editingLineId === '__parts_toggle' ? null : '__parts_toggle')}
                        >
                          <span className="text-[11px] font-extrabold text-muted flex items-center gap-1.5">
                            <PackageCheck className="w-3 h-3 text-brand shrink-0" />
                            System Parts Used ({partsItems.length}) — hidden from customer invoice
                          </span>
                          <ChevronsDown className={`w-3 h-3 text-muted transition-transform ${editingLineId === '__parts_toggle' ? '' : '-rotate-90'}`} />
                        </div>
                        {editingLineId === '__parts_toggle' && (
                          <div className="border-t border-dashed border-line">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-surface/50">
                                  <th className="border border-line px-2 py-1 text-left font-extrabold text-muted text-[10px] uppercase">Part</th>
                                  <th className="border border-line px-2 py-1 text-center font-extrabold text-muted text-[10px] uppercase w-14">Qty</th>
                                  <th className="border border-line px-2 py-1 text-right font-extrabold text-muted text-[10px] uppercase w-20">Unit Cost</th>
                                  <th className="border border-line px-2 py-1 text-right font-extrabold text-muted text-[10px] uppercase w-24">Sell Price</th>
                                  <th className="border border-line px-2 py-1 text-right font-extrabold text-muted text-[10px] uppercase w-16">Subtotal</th>
                                  <th className="border border-line px-2 py-1 text-center w-8"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {partsItems.map((li) => {
                                  const costTotal = (li.unitCost || 0) * li.quantity;
                                  const sellTotal = li.unitPrice * li.quantity;
                                  const margin = sellTotal - costTotal;
                                  return (
                                    <tr key={li.id} className="bg-white">
                                      <td className="border border-line px-2 py-1">
                                        <span className="font-semibold text-ink text-[10px]">{li.description || li.partName}</span>
                                      </td>
                                      <td className="border border-line px-2 py-1 text-center text-muted tabular-nums text-[10px]">{li.quantity}</td>
                                      <td className="border border-line px-2 py-1 text-right font-mono text-muted tabular-nums text-[10px]">{costTotal.toLocaleString()}</td>
                                      <td className="border border-line px-2 py-1 text-right font-mono text-muted tabular-nums text-[10px]">{sellTotal.toLocaleString()}</td>
                                      <td className="border border-line px-2 py-1 text-right font-mono text-ink font-bold tabular-nums text-[10px]">{sellTotal.toLocaleString()}</td>
                                      <td className="border border-line px-2 py-1 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                          aria-label={`Remove ${li.description}`}
                                          className="text-muted hover:text-danger p-0.5 rounded transition-colors cursor-pointer focus:outline-none"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-surface/50">
                                  <td colSpan={4} className="border border-line px-2 py-1 text-right font-extrabold text-[10px] text-muted">Parts Total</td>
                                  <td className="border border-line px-2 py-1 text-right font-mono font-black text-ink tabular-nums text-[10px]">{partsSubtotal.toLocaleString()}</td>
                                  <td></td>
                                </tr>
                                <tr className="bg-surface/50">
                                  <td colSpan={4} className="border border-line px-2 py-1 text-right font-extrabold text-[10px] text-muted">Parts Cost</td>
                                  <td className="border border-line px-2 py-1 text-right font-mono font-black text-warning tabular-nums text-[10px]">-{partsCostTotal.toLocaleString()}</td>
                                  <td></td>
                                </tr>
                                <tr className="bg-surface/50">
                                  <td colSpan={4} className="border border-line px-2 py-1 text-right font-extrabold text-[10px] text-success-deep">Parts Profit</td>
                                  <td className="border border-line px-2 py-1 text-right font-mono font-black text-success-deep tabular-nums text-[10px]">+{(partsSubtotal - partsCostTotal).toLocaleString()}</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
          
                            {/* Deduct from total reminder */}
                            <div className="px-2.5 py-1.5 bg-warning/5 border-t border-dashed border-line">
                              <div className="flex items-center gap-1.5">
                                <Coins className="w-3 h-3 text-warning shrink-0" />
                                <span className="text-[10px] font-semibold text-warning">
                                  Parts cost {partsCostTotal.toLocaleString()} {currency} deducted from system profit. Customer invoice shows repair items only.
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

                {/* Add buttons row */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPartOpen(true)}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-line-strong bg-white hover:bg-surface transition-colors cursor-pointer focus:outline-none"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                      <PackageCheck className="w-3.5 h-3.5 text-brand shrink-0" />
                      Add Part
                    </span>
                    <Plus className="w-3.5 h-3.5 text-muted shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddCustomRepairOpen(!isAddCustomRepairOpen)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer focus:outline-none ${
                      isAddCustomRepairOpen ? 'border-brand bg-brand-soft' : 'border-line-strong bg-white hover:bg-surface'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                      <Wrench className="w-3.5 h-3.5 text-brand shrink-0" />
                      Custom
                    </span>
                    <Plus className="w-3.5 h-3.5 text-muted shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddRepairFromPriceListOpen(true)}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-line-strong bg-white hover:bg-surface transition-colors cursor-pointer focus:outline-none"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                      <FileText className="w-3.5 h-3.5 text-brand shrink-0" />
                      Price List
                    </span>
                    <Plus className="w-3.5 h-3.5 text-muted shrink-0" />
                  </button>
                </div>

                {/* Custom Repair Form (Ko Hein 2026-08-10) */}
                {isAddCustomRepairOpen && (
                  <div className="p-3 bg-brand-soft/50 border border-brand/30 rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-brand shrink-0" />
                      <span className="text-xs font-extrabold text-ink">Add Custom Repair / Service</span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2">
                      <Input
                        value={customRepairName}
                        onChange={(e) => setCustomRepairName(e.target.value)}
                        placeholder="Repair name (e.g. Screen Replacement)"
                        className="bg-white border border-line rounded-lg p-2 text-xs font-bold text-ink"
                      />
                      <Input
                        type="number"
                        min={0}
                        step={500}
                        value={customRepairPrice || ''}
                        onChange={(e) => setCustomRepairPrice(Number(e.target.value))}
                        placeholder="Price"
                        className="bg-white border border-line rounded-lg p-2 text-xs font-mono font-bold text-ink"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={customRepairQty}
                        onChange={(e) => setCustomRepairQty(Math.max(1, Number(e.target.value) || 1))}
                        placeholder="Qty"
                        className="bg-white border border-line rounded-lg p-2 text-xs font-mono font-bold text-ink"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted">
                        Total: <strong className="text-ink">{((customRepairPrice || 0) * (customRepairQty || 1)).toLocaleString()} {currency}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleAddCustomRepair}
                        disabled={!customRepairName.trim() || !customRepairPrice}
                        className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-deep text-white text-xs font-extrabold transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add to Invoice
                      </button>
                    </div>
                  </div>
                )}

                {/* Calculation Summary — Customer & System totals (Ko Hein 2026-08-10) */}
                <div className="border border-line-strong rounded-lg overflow-hidden bg-white text-xs">
                  <table className="w-full border-collapse">
                    <tbody>
                      {/* Customer-facing section */}
                      <tr className="bg-surface/30">
                        <td className="border border-line px-2 py-1 text-[10px] font-extrabold text-muted uppercase tracking-wider" colSpan={2}>Customer Invoice</td>
                      </tr>
                      <tr>
                        <td className="border border-line px-2 py-1.5 text-muted">Repair Subtotal ({laborItems.length} item{laborItems.length !== 1 ? 's' : ''})</td>
                        <td className="border border-line px-2 py-1.5 text-right font-mono text-ink tabular-nums">{laborSubtotal.toLocaleString()} {currency}</td>
                      </tr>
                      {perItemDiscountTotal > 0 && (
                        <tr>
                          <td className="border border-line px-2 py-1.5 text-success-deep">Per-item Discounts</td>
                          <td className="border border-line px-2 py-1.5 text-right font-mono text-success-deep tabular-nums">-{perItemDiscountTotal.toLocaleString()} {currency}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="border border-line px-2 py-1.5 text-muted">Sales Tax ({Math.round(taxRate * 100)}%)</td>
                        <td className="border border-line px-2 py-1.5 text-right font-mono text-ink tabular-nums">{selectedWo.taxAmount.toLocaleString()} {currency}</td>
                      </tr>
                      {/* Invoice Discount — editable (Ko Hein 2026-08-10) */}
                      <tr>
                        <td className="border border-line px-2 py-1.5 text-success-deep flex items-center gap-1">
                          <Percent className="w-3 h-3 shrink-0" />
                          Invoice Discount
                        </td>
                        <td className="border border-line px-2 py-1.5">
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={invoiceDiscountInput || selectedWo.discountAmount || ''}
                              onChange={(e) => setInvoiceDiscountInput(e.target.value)}
                              onBlur={() => {
                                const val = Number(invoiceDiscountInput) || 0;
                                handleUpdateInvoiceDiscount(val);
                                setInvoiceDiscountInput('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = Number(invoiceDiscountInput) || 0;
                                  handleUpdateInvoiceDiscount(val);
                                  setInvoiceDiscountInput('');
                                }
                              }}
                              placeholder={selectedWo.discountAmount ? selectedWo.discountAmount.toLocaleString() : '0'}
                              className="w-24 text-right text-xs font-mono font-bold text-success-deep bg-surface border border-line rounded px-1.5 py-0.5 outline-none focus:border-success"
                            />
                            <span className="text-success-deep font-mono tabular-nums text-xs shrink-0">{currency}</span>
                          </div>
                        </td>
                      </tr>
                      {selectedWo.depositAmount > 0 && (
                        <tr>
                          <td className="border border-line px-2 py-1.5 text-success-deep">Upfront Deposit Paid</td>
                          <td className="border border-line px-2 py-1.5 text-right font-mono text-success-deep tabular-nums">-{selectedWo.depositAmount.toLocaleString()} {currency}</td>
                        </tr>
                      )}
                      <tr className="bg-brand-soft">
                        <td className="border border-line px-2 py-2 text-sm font-extrabold text-ink">Amount Due (Customer)</td>
                        <td className="border border-line px-2 py-2 text-right font-mono text-base font-black text-brand tabular-nums">
                          {(() => {
                            const custTotal = Math.max(0, laborSubtotal - perItemDiscountTotal + selectedWo.taxAmount - selectedWo.discountAmount - selectedWo.depositAmount);
                            return `${custTotal.toLocaleString()} ${currency}`;
                          })()}
                        </td>
                      </tr>

                      {/* System section (with parts) */}
                      {partsItems.length > 0 && (
                        <>
                          <tr className="bg-surface/30">
                            <td className="border border-line px-2 py-1 text-[10px] font-extrabold text-muted uppercase tracking-wider" colSpan={2}>System (incl. Parts)</td>
                          </tr>
                          <tr>
                            <td className="border border-line px-2 py-1.5 text-muted">System Total (incl. parts)</td>
                            <td className="border border-line px-2 py-1.5 text-right font-mono text-ink tabular-nums">{selectedWo.subtotal.toLocaleString()} {currency}</td>
                          </tr>
                          <tr>
                            <td className="border border-line px-2 py-1.5 text-muted">Parts Cost (deducted)</td>
                            <td className="border border-line px-2 py-1.5 text-right font-mono text-warning tabular-nums">-{partsCostTotal.toLocaleString()} {currency}</td>
                          </tr>
                          <tr>
                            <td className="border border-line px-2 py-1.5 text-success-deep font-bold">Gross Profit</td>
                            <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-success-deep tabular-nums">+{(selectedWo.subtotal - partsCostTotal).toLocaleString()} {currency}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>


              {/* Payment Gateway Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-brand text-xs flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payment Method Selection</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-muted">({activePaymentMethods.length} Enabled)</span>
                </div>

                {activePaymentMethods.length === 0 ? (
                  <div className="p-4 text-center bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning space-y-1">
                    <AlertTriangle className="w-5 h-5 mx-auto text-warning" />
                    <p className="font-extrabold">No payment methods enabled</p>
                    <p>Enable one in Settings → Payment Methods to accept payment.</p>
                  </div>
                ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activePaymentMethods.map((m) => {
                    const isSelected = paymentMethod === m.name;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.name)}
                        className={`!min-h-0 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer focus:outline-none active:scale-95 ${
                          isSelected ? 'bg-brand text-white border-brand shadow-2xs' : 'bg-white text-ink border-line hover:border-brand hover:text-brand'
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}

                  {/* Split Payment pill */}
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
                    className={`!min-h-0 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer focus:outline-none active:scale-95 ${
                      paymentMethod === 'Split Payment' ? 'bg-purple text-white border-purple shadow-2xs' : 'bg-white text-ink border-line hover:border-purple hover:text-purple'
                    }`}
                  >
                    Split Payment
                  </button>
                </div>
                )}

                {/* Split Payment Interactive Breakdown UI */}
                {paymentMethod === 'Split Payment' && (
                  <div className="p-3.5 bg-purple/10 border border-purple/30 rounded-xl space-y-3 text-xs animate-fadeIn">
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
                            <span className="font-mono text-xs text-purple font-extrabold px-1.5 py-0.5 bg-purple/15 rounded shrink-0 self-start sm:self-auto">
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
                              className="bg-surface border border-line rounded-lg p-1.5 text-xs font-extrabold text-ink outline-none"
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
                                className="w-full bg-surface border border-line rounded-lg p-1.5 text-xs font-mono font-bold text-ink outline-none"
                              />
                              <Button variant="ghost"
                                type="button"
                                onClick={() => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = remForThis;
                                  setSplitPayments(updated);
                                }}
                                className="px-2 py-1.5 bg-purple/15 hover:bg-purple/15 text-purple font-bold text-xs rounded-lg border border-purple/30 shrink-0 cursor-pointer transition-all active:scale-95"
                                title="Auto-fill remaining amount"
                              >
                                Auto-Fill
                              </Button>
                            </div>

                            {/* Remove Row Button if > 2 */}
                            {splitPayments.length > 2 && (
                              <Button variant="ghost"
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
                            <Button variant="ghost"
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
                      className="w-full bg-white border border-line rounded-lg p-2 text-ink font-mono "
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
                  disabled={isProcessingPayment || isPaymentShort || selectedWo.isPaid}
                  className={`${isMobileCheckoutFullOpen ? 'flex' : 'hidden md:flex'} w-full sm:w-1/2 ${
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
              </div></div>

              
            </div>
          ) : (
            <div className="p-12 text-center text-muted flex flex-col items-center justify-center space-y-3 min-h-[380px]">
              <Receipt className="w-12 h-12 text-muted/30" />
              <p className="font-extrabold text-sm text-ink">No Finished Device Selected</p>
              <p className="text-xs max-w-xs text-muted">Finished repairs only — select one to process payment.</p>
            </div>
    );

  return (
    <div className={`space-y-3 ${isIpad ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      <div className={`flex flex-col md:flex-row gap-3 text-xs pb-16 md:pb-0 ${isIpad ? 'md:flex-1 md:min-h-0' : ''}`}>
        {/* Left Column: Select Work Order to Checkout (collapsible, hugs sidebar) */}
        <div className={`bg-white border border-line rounded-2xl p-3 space-y-3 shadow-xs shrink-0 ${
          isQueueCollapsed ? 'md:w-36' : 'md:w-[380px]'
        } ${isIpad ? 'md:flex md:flex-col md:min-h-0' : 'md:self-stretch md:flex md:flex-col md:min-h-0'}`}>
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
          <div className={`space-y-2 overflow-y-auto ${isIpad ? 'md:flex md:flex-col md:min-h-0 md:flex-1 md:max-h-none' : 'min-h-[360px] max-h-[calc(100dvh-280px)] md:max-h-none md:flex-1 md:min-h-0'}`}>
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
                  resetTransactionState();
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
                const isSel = wo.id === selectedWoId;
                return (
                  <button
                    key={wo.id}
                    type="button"
                    onClick={() => {
                      setSelectedWoId(wo.id);
                      resetTransactionState();
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg flex flex-col items-start transition-colors ${
                      isSel ? 'bg-brand text-white shadow-2xs' : 'bg-white text-ink border border-line hover:bg-brand-soft hover:border-brand/30'
                    }`}
                    title={`${wo.orderNumber} · ${wo.deviceModel} · ${wo.customerName}`}
                    aria-label={`Select ${wo.orderNumber} ${wo.deviceModel}`}
                  >
                    <span className={`font-mono text-[10px] font-black leading-tight ${isSel ? 'text-white' : 'text-brand'}`}>
                      {wo.orderNumber}
                    </span>
                    <span className={`text-[9px] font-bold leading-tight truncate w-full ${isSel ? 'text-white/90' : 'text-ink'}`}>
                      {wo.deviceModel}
                    </span>
                    <span className={`text-[8px] font-black leading-tight ${isSel ? 'text-white/80' : 'text-muted'}`}>
                      {wo.isPaid ? '✓ PAID' : '$ DUE'} · {wo.totalAmount.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Invoice & Terminal Checkout (8 cols) */}
        <div className={`hidden md:block flex-1 min-w-0 bg-white border border-line rounded-2xl p-5 pb-24 md:pb-5 space-y-5 shadow-xs ${isIpad ? 'md:flex md:flex-col md:min-h-0 md:overflow-y-auto' : ''}`}>
                    {renderCheckoutPanel()}
        </div>
      </div>

      {/* Mobile: full POS checkout popup — Pay tap opens the whole checkout (Ko Hein) */}
      {isMobileCheckoutFullOpen && selectedWo && (
        <div className="fixed inset-0 z-50 md:hidden bg-white overflow-y-auto pt-[calc(env(safe-area-inset-top)+8px)] pb-28">
          <div className="sticky top-0 z-10 flex justify-end px-3 pt-1.5">
            <button
              type="button"
              onClick={() => setIsMobileCheckoutFullOpen(false)}
              aria-label="Close checkout"
              className="text-muted hover:text-ink p-1.5 rounded transition-colors cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            {renderCheckoutPanel()}
          </div>
        </div>
      )}

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
              onClick={() => setIsMobileCheckoutFullOpen(true)}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center pt-[env(safe-area-inset-top)]">
          <div className="bg-white border border-line rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm h-[92dvh] sm:h-auto p-5 space-y-4 shadow-xl overflow-y-auto">
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
              {/* Backdate checkout (Ko Hein 2026-08-10) */}
              <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
                <span className="text-muted">Checkout Date</span>
                <input
                  type="date"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold text-ink outline-none [color-scheme:light]"
                  aria-label="Checkout date"
                />
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
                disabled={isProcessingPayment || isPaymentShort || selectedWo.isPaid}
                className="flex-1 bg-success hover:bg-success/90 text-white"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Confirm & Print</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Inventory Part — beautiful picker popup (Ko Hein) */}
      {isAddPartOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center pt-[env(safe-area-inset-top)]"
          onClick={() => setIsAddPartOpen(false)}
          role="presentation"
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md h-[85dvh] sm:h-auto p-5 space-y-4 overflow-y-auto shadow-xl animate-i35-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-ink">Add Inventory Part Used</h3>
                <p className="text-xs text-muted truncate">Pick the stock part used on this ticket</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartOpen(false)}
                aria-label="Close add part"
                className="text-muted hover:text-ink p-1.5 rounded transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Owner filter — APP / KZH (Ko Hein 2026-08-10) */}
            <div className="flex items-center gap-1">
              {(['ALL', 'APP', 'KZH'] as const).map((owner) => (
                <button
                  key={owner}
                  type="button"
                  onClick={() => setPosOwner(owner)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition-colors cursor-pointer ${
                    posOwner === owner ? 'bg-brand text-white shadow-2xs' : 'bg-surface text-muted hover:bg-line hover:text-ink'
                  }`}
                >
                  {owner}
                </button>
              ))}
            </div>

            {/* Automatic — visual part list (Ko Hein) */}
            <div>
              <p className="text-[11px] font-bold text-muted mb-1.5">Automatic — tap a part</p>
              <div className="space-y-1.5">
              {filteredInventoryParts.filter((part) => part.quantityInStock > 0).length === 0 ? (
                <div className="p-8 text-center text-muted text-xs space-y-1">
                  <PackageCheck className="w-8 h-8 mx-auto opacity-40 text-brand" />
                  <p className="font-extrabold text-ink">No parts in stock</p>
                  <p>Add parts in Inventory first.</p>
                </div>
              ) : (
                filteredInventoryParts.filter((part) => part.quantityInStock > 0).map((part) => {
                  const isSelected = inventoryPartId === part.id;
                  const low = part.quantityInStock <= part.reorderPoint;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => setInventoryPartId(part.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer focus:outline-none active:scale-[0.99] ${
                        isSelected ? 'border-brand bg-brand/5 ring-1 ring-brand/30' : 'border-line bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-ink truncate">{part.name}</p>
                        <p className={`text-[11px] font-semibold ${low ? 'text-warning' : 'text-muted'}`}>
                          <span
                            className={`mr-1.5 rounded px-1 py-px text-[9px] font-black uppercase ${
                              (part.owner || 'APP') === 'KZH'
                                ? 'bg-success/10 text-success-deep border border-success/30'
                                : 'bg-brand-soft text-brand border border-brand/30'
                            }`}
                          >
                            {part.owner || 'APP'}
                          </span>
                          Stock: {part.quantityInStock}{low ? ' — Low' : ''}
                        </p>
                      </div>
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-brand' : 'border-line-strong'}`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-brand" />}
                      </span>
                    </button>
                  );
                })
              )}
              </div>
            </div>

            {/* Manual — choose from inventory (Ko Hein) */}
            <div>
              <p className="text-[11px] font-bold text-muted mb-1.5">Manual — choose from inventory</p>
              <select
                value={inventoryPartId || ''}
                onChange={(e) => setInventoryPartId(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-semibold text-ink outline-none "
              >
                <option value="">— Choose a part —</option>
                {filteredInventoryParts
                  .filter((part) => part.quantityInStock > 0)
                  .map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name} • Stock: {part.quantityInStock}
                    </option>
                  ))}
              </select>
            </div>

            {/* Qty + Add */}
            {selectedInventoryPart && (
              <div className="flex items-end gap-2 pt-1">
                <label className="block shrink-0">
                  <span className="block text-[11px] font-bold text-muted mb-1">Qty</span>
                  <Input
                    type="number"
                    min={1}
                    max={selectedInventoryPart.quantityInStock || 99}
                    value={inventoryPartQty || ''}
                    onChange={(e) => setInventoryPartQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-20 rounded-lg border border-line bg-white px-2 py-2 text-xs font-mono font-bold text-ink outline-none "
                  />
                </label>
                <Button
                  type="button"
                  onClick={() => {
                    handleAddInventoryPartToWorkOrder();
                    setIsAddPartOpen(false);
                  }}
                  className="flex-1 h-10 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-lg"
                >
                  Add Part to Ticket
                </Button>
              </div>
            )}
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

      {/* Price List Repair Picker — intake-style modal (Ko Hein 2026-08-10) */}
      {isAddRepairFromPriceListOpen && selectedWo && (() => {
        const catalogItems = getModelPriceCatalogItems(selectedWo.deviceModel || '', priceCatalog as any);
        const matchedModelName = catalogItems.length > 0 ? catalogItems[0].modelMatchedName : selectedWo.deviceModel;
        const filteredItems = catalogItems.filter((item) => {
          const matchesSearch =
            !priceSearchQuery ||
            item.name.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
            item.group.toLowerCase().includes(priceSearchQuery.toLowerCase());
          const matchesGroup = selectedGroupFilter === 'ALL' || item.group === selectedGroupFilter;
          return matchesSearch && matchesGroup && item.price > 0;
        });
        return (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsAddRepairFromPriceListOpen(false)}
            role="presentation"
          >
            <div
              className="bg-white border border-line rounded-2xl max-w-2xl w-full p-6 space-y-4 text-xs shadow-2xl relative max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsAddRepairFromPriceListOpen(false)}
                className="absolute right-4 top-4 text-muted hover:text-ink p-1 rounded-lg hover:bg-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-line pb-3 space-y-1">
                <h3 className="text-base font-black text-ink flex items-center space-x-2">
                  <CircleDot className="w-5 h-5 text-brand" />
                  <span>Price Catalog Repair Selector ({matchedModelName})</span>
                </h3>
                <p className="text-xs text-muted">
                  Select repair services with verified catalog pricing in MMK for {matchedModelName}
                </p>
              </div>

              {/* Filter & Search Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={priceSearchQuery}
                    onChange={(e) => setPriceSearchQuery(e.target.value)}
                    placeholder={`Search repairs for ${matchedModelName} (e.g. Battery, Display, Face ID)...`}
                    className="w-full bg-surface border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                {/* Category Group Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                  {['ALL', 'Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedGroupFilter(grp)}
                      className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                        selectedGroupFilter === grp
                          ? 'bg-brand text-white shadow-2xs'
                          : 'bg-surface text-muted hover:text-ink hover:bg-line'
                      }`}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Catalog Repair List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs space-y-1">
                    <FileText className="w-8 h-8 mx-auto opacity-40 text-brand" />
                    <p className="font-extrabold text-ink">No matching repairs found</p>
                    <p>Try a different search or group filter.</p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = posCatalogSelection.includes(item.categoryKey);
                    const alreadyInWo = (selectedWo.lineItems || []).some(
                      (li) => li.description?.toLowerCase() === item.name.toLowerCase()
                    );
                    return (
                      <button
                        type="button"
                        key={item.categoryKey}
                        onClick={() => {
                          if (alreadyInWo) return;
                          setPosCatalogSelection((prev) =>
                            prev.includes(item.categoryKey)
                              ? prev.filter((k) => k !== item.categoryKey)
                              : [...prev, item.categoryKey]
                          );
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer flex justify-between items-center transition-all ${
                          alreadyInWo
                            ? 'border-line bg-surface/50 opacity-60'
                            : isSelected
                              ? 'border-brand bg-brand-soft text-brand font-bold shadow-2xs'
                              : 'border-line bg-white text-ink hover:bg-surface'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-brand border-brand text-white' : alreadyInWo ? 'border-line-strong bg-surface' : 'border-line-strong bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {alreadyInWo && !isSelected && <Check className="w-3.5 h-3.5 text-muted" />}
                          </div>
                          <div>
                            <span className="block font-extrabold text-ink text-xs">{item.name}</span>
                            <div className="flex items-center space-x-2 text-xs text-muted pt-0.5 font-medium">
                              <span className="px-1.5 py-0.5 bg-surface rounded text-ink font-semibold">{item.group}</span>
                              <span>Warranty: {item.warranty}</span>
                              {alreadyInWo && <span className="text-muted font-semibold">· Already in invoice</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-brand">
                            {item.price.toLocaleString()} MMK
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Apply button */}
              <div className="pt-2 border-t border-line flex items-center justify-between">
                <span className="text-xs text-muted font-semibold">
                  Selected: <strong className="text-ink">{posCatalogSelection.length} repair(s)</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const selected = catalogItems.filter(
                      (item) => posCatalogSelection.includes(item.categoryKey) && item.price > 0
                    );
                    if (selected.length > 0) {
                      handleAddRepairsFromPriceList(selected);
                    }
                    setPosCatalogSelection([]);
                    setPriceSearchQuery('');
                    setSelectedGroupFilter('ALL');
                  }}
                  disabled={posCatalogSelection.length === 0}
                  className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl text-xs hover:bg-brand-deep transition-colors shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply Selected Repairs ({posCatalogSelection.length})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
