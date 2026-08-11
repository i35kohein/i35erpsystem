
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIsIpad } from '../../hooks/useIsIpad';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import {CreditCard,
  Receipt,
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  BadgePercent,
  Zap,
  Layers,
  Power,
  Volume2,
  Mic,
  Cpu,
  Wifi,
  Scan,
  ListChecks,
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
  UserRound,
  Phone,
  Smartphone,
  Ticket,
  PencilLine,
  ChevronsLeft,
  ChevronsRight,
  Wrench,
  Percent,
  Search,
} from 'lucide-react';
import { WorkOrder, Customer, SystemSettings, PartItem, WorkOrderLineItem, Technician } from '../../types';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { PriorityBadge } from '../common/PriorityBadge';
import { Button , Input } from '../ui';
import { StatusChip } from '../common/StatusChip';
import { getActivePaymentMethods } from '../../data/seedData';
import { PrintableInvoiceModal } from '../common/PrintableInvoiceModal';
import { CustomerNotificationModal } from '../common/CustomerNotificationModal';
import { toast } from '../../lib/toast';
import { confirmDialog } from '../common/ConfirmDialog';

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// Signed MMK formatting for profit rows — a negative result must display as a
// real loss, never a clamped 0 (audit A-P3-3).
const signedMoney = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(Math.round(n)).toLocaleString()}`;

const getLineItemIcon = (description: string) => {
  const text = normalizeText(description);
  if (text.includes('battery')) return Zap;
  if (text.includes('display') || text.includes('touch') || text.includes('lcd')) return Smartphone;
  if (text.includes('backglass') || text.includes('housing')) return Layers;
  if (text.includes('charing') || text.includes('charging') || text.includes('flex')) return Power;
  if (text.includes('speaker') || text.includes('ear') || text.includes('ring')) return Volume2;
  if (text.includes('mic')) return Mic;
  if (text.includes('logic') || text.includes('rf layer') || text.includes('no power')) return Cpu;
  if (text.includes('network') || text.includes('wifi') || text.includes('pay') || text.includes('nfc')) return Wifi;
  if (text.includes('face id') || text.includes('key') || text.includes('sensor')) return Scan;
  return ListChecks;
};

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
  technicians?: Technician[];
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
  technicians = [],
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
  // Add Inventory Part modal mode (Ko Hein 2026-08-11): Auto = exact device
  // + repair-category filtered suggestions; Manual = every part for the device.
  const [posPartMode, setPosPartMode] = useState<'auto' | 'manual'>('auto');
  // Manual-mode search query (Ko Hein 2026-08-11).
  const [posPartSearch, setPosPartSearch] = useState('');
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
  const [posCatalogDiscounts, setPosCatalogDiscounts] = useState<Record<string, number>>({});
  const [posDiscountMenuFor, setPosDiscountMenuFor] = useState<string | null>(null);
  const [posDiscountAnchor, setPosDiscountAnchor] = useState<{ top: number; left: number } | null>(null);
  const [posCustomDiscountInput, setPosCustomDiscountInput] = useState('');
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');

  // Invoice-level discount input (Ko Hein 2026-08-10)
  const [invoiceDiscountInput, setInvoiceDiscountInput] = useState<string>('');

  // Sheet-wide line item editing (Ko Hein 2026-08-11)
  const [isSheetEditMode, setIsSheetEditMode] = useState(false);

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
    // Exclude already-paid tickets from the checkout queue (Ko Hein 2026-08-10)
    if (wo.isPaid) return false;
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
    // audit A-P2-5: never let the previous ticket's Price List selection leak
    // into the next checkout — clear selection/discounts/discount-menu state
    // on every ticket switch (not only on the "Done" button path).
    setPosCatalogSelection([]);
    setPosCatalogDiscounts({});
    setPosDiscountMenuFor(null);
    setPosDiscountAnchor(null);
    setPosCustomDiscountInput('');
  };

  // audit A-P2-3: sheet-editor line-item draft — keystrokes update this local
  // draft instantly; the full-document save is flushed once typing pauses, so
  // rapid edits can't race each other's full-document PATCHes (out-of-order
  // completions used to revert earlier edits).
  const [lineItemDraft, setLineItemDraft] = useState<WorkOrder['lineItems'] | null>(null);
  const pendingWoRef = useRef<WorkOrder | null>(null); // full doc incl. recomputed totals
  const lineItemSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveWorkOrderRef = useRef(onSaveWorkOrder);
  useEffect(() => {
    onSaveWorkOrderRef.current = onSaveWorkOrder;
  }, [onSaveWorkOrder]);

  // Flush any pending line-item edit when the ticket changes (it belongs to
  // the OLD ticket) or when the module unmounts (audit A-P2-3).
  useEffect(() => {
    if (lineItemSaveTimerRef.current) {
      clearTimeout(lineItemSaveTimerRef.current);
      lineItemSaveTimerRef.current = null;
    }
    const toSave = pendingWoRef.current;
    pendingWoRef.current = null;
    setLineItemDraft(null);
    if (toSave && onSaveWorkOrderRef.current) onSaveWorkOrderRef.current(toSave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWoId]);
  useEffect(() => {
    return () => {
      if (lineItemSaveTimerRef.current) clearTimeout(lineItemSaveTimerRef.current);
      const toSave = pendingWoRef.current;
      pendingWoRef.current = null;
      if (toSave && onSaveWorkOrderRef.current) onSaveWorkOrderRef.current(toSave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Computed: labor vs parts breakdown for customer / system views (Ko Hein 2026-08-10)
  const displayLineItems = lineItemDraft ?? selectedWo?.lineItems ?? [];
  const laborItems = useMemo(() => displayLineItems.filter((li) => li.isLabor), [displayLineItems]);
  const partsItems = useMemo(() => displayLineItems.filter((li) => !li.isLabor && li.partId), [displayLineItems]);
  const partsCostTotal = useMemo(() => partsItems.reduce((s, li) => s + (li.unitCost || 0) * li.quantity, 0), [partsItems]);
  // Parts at SELLING price (internal inventory margin view, Ko Hein 2026-08-11):
  // the customer does NOT pay parts separately (repair price includes parts),
  // but the shop still earns the markup between selling and purchase price.
  const partsSellTotal = useMemo(() => partsItems.reduce((s, li) => s + (li.unitPrice || 0) * li.quantity, 0), [partsItems]);
  const partsProfitTotal = useMemo(() => Math.max(0, partsSellTotal - partsCostTotal), [partsSellTotal, partsCostTotal]);
  // Estimated technician commission for this ticket — mirrors App.tsx handleMarkPaid
  // (Ko Hein 2026-08-11): commission base = labor revenue after per-item discounts.
  const estCommission = useMemo(() => {
    if (!selectedWo) return 0;
    const techId = selectedWo.assignedTechId || (selectedWo as WorkOrder & { qaTechnicianId?: string }).qaTechnicianId;
    const tech = techId ? technicians.find((t) => t.id === techId) : undefined;
    if (!tech) return 0;
    const repairType =
      selectedWo.repairTypeAI ||
      (selectedWo.serviceType === 'Micro-Soldering' ? ('hardware' as const) : ('spareparts' as const));
    const rate =
      repairType === 'hardware'
        ? tech.commissionRateHardware || tech.commissionRate || 0
        : tech.commissionRateParts || tech.commissionRate || 0;
    if (rate <= 0) return 0;
    // Commission base = profit AFTER parts cost (Ko Hein 2026-08-11):
    // Amount Due (Customer) − Parts Cost. Mirrors App.tsx handleMarkPaid.
    const commissionBase = Math.max(0, (selectedWo.totalAmount || 0) - partsCostTotal);
    return Math.round(commissionBase * (rate / 100));
  }, [selectedWo, technicians, partsCostTotal]);
  const perItemDiscountTotal = useMemo(
    () => laborItems.reduce((s, li) => {
      if (!li.lineItemDiscountPercent) return s;
      return s + Math.round(li.unitPrice * li.quantity * (li.lineItemDiscountPercent / 100));
    }, 0),
    [laborItems]
  );

  // Exact device-model match helper (Ko Hein 2026-08-11): a ticket for
  // "iPhone 13 Pro Max" must ONLY match parts whose deviceCompatibility names
  // the exact model — "iPhone 13" / "iPhone 13 Pro" must not leak in.
  const matchesDeviceExactly = (device: string, model: string) => {
    const d = device.trim().toLowerCase().replace(/\s+/g, ' ');
    const m = model.trim().toLowerCase().replace(/\s+/g, ' ');
    return d === m;
  };

  // Auto mode: exact device match AND repair-category match.
  const autoInventoryParts = useMemo(() => {
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
      // EXACT device match only (Ko Hein 2026-08-11) — no substring matching,
      // so "iPhone 13 Pro Max" never matches parts listed for "iPhone 13".
      const matchesModel =
        !model ||
        (part.deviceCompatibility || []).some((device) => matchesDeviceExactly(device, model));

      const matchesCategory =
        matchedCategories.length === 0 ||
        matchedCategories.some((category) => normalizeText(category) === normalizeText(part.category || ''));

      return matchesModel && matchesCategory;
    });
  }, [parts, selectedWo, posOwner]);

  // Manual mode: every part that fits the ticket's exact device model,
  // regardless of repair category.
  const manualInventoryParts = useMemo(() => {
    const ownerFiltered = posOwner === 'ALL' ? parts : parts.filter((part) => (part.owner || 'APP') === posOwner);
    const model = selectedWo?.deviceModel || '';
    if (!model) return ownerFiltered;
    return ownerFiltered.filter((part) =>
      (part.deviceCompatibility || []).some((device) => matchesDeviceExactly(device, model))
    );
  }, [parts, selectedWo, posOwner]);

  // The list shown in the modal depends on the active sub-tab.
  const filteredInventoryParts = posPartMode === 'manual' ? manualInventoryParts : autoInventoryParts;

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

  const recalculateTotals = (lineItems: WorkOrder['lineItems'], discountAmount: number, depositAmount: number, discountFormat?: WorkOrder['discountFormat']) => {
    const laborItems = lineItems.filter((li) => li.isLabor);
    // audit A-P2-1/P3-1: subtotal is ALWAYS the pre-discount original sum
    // (matches intake + self-heal). Per-line discounts are rounded exactly
    // like perItemDiscountTotal so the summary chain ties:
    // Subtotal − Per-item Discounts + Tax − Invoice Discount − Deposit = Due.
    let originalSubtotal = 0;
    let perItemDiscount = 0;
    for (const item of laborItems) {
      const lineTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
      originalSubtotal += lineTotal;
      if (item.lineItemDiscountPercent) {
        perItemDiscount += Math.round(lineTotal * (item.lineItemDiscountPercent / 100));
      }
    }
    // Invoice-level discount (Ko Hein 2026-08-11, audit A-1): always subtract
    // discountAmount for new-format tickets. Legacy tickets (unitPrice = FINAL
    // price, discountAmount = duplicate of embedded discount) carry the explicit
    // 'legacy' flag (self-heal stamps it); they must NOT get a second deduction.
    const effectiveDiscount = discountFormat === 'legacy' ? 0 : discountAmount;
    const taxBase = Math.max(0, originalSubtotal - perItemDiscount);
    const taxAmount = Math.round(taxBase * taxRate);
    const totalAmount = Math.max(0, Math.round(taxBase) + taxAmount - effectiveDiscount - depositAmount);
    return { subtotal: Math.round(originalSubtotal), taxAmount, totalAmount };
  };

  // Self-heal legacy tickets (Ko Hein 2026-08-11): old-format work orders
  // saved line items with unitPrice = FINAL price. The discount info either
  // lives in a duplicate discountAmount (format A) or only in selectedRepairs
  // (format B: basePrice + discountPercent). When such a ticket is selected
  // in POS (e.g. stale cache / pre-migration data), recover the ORIGINAL
  // price + per-item discount % and persist — so it displays as
  // Original − Discount = Final everywhere. New-format tickets (explicit
  // discountFormat 'new' OR stored total already matches new-format math) are
  // NEVER healed — their discountAmount is a real invoice-level discount
  // (audit A-1/A-2 guards).
  useEffect(() => {
    if (!selectedWo || !onSaveWorkOrder) return;
    if (selectedWo.discountFormat === 'new') return; // never heal new-format tickets
    const lis = selectedWo.lineItems || [];
    const dis = Number(selectedWo.discountAmount) || 0;
    const labor = lis.filter((li) => li.isLabor);
    if (labor.some((li) => Boolean(li.lineItemDiscountPercent))) return; // already new format
    const reps = ((selectedWo.selectedRepairs || []) as Array<{ name?: string; basePrice?: number; discountPercent?: number }>).filter((r) => r && r.name);
    const repByName = new Map(reps.map((r) => [String(r.name).toLowerCase().trim(), r]));
    const anyRepDisc = reps.some((r) => (Number(r.discountPercent) || 0) > 0);
    if (dis <= 0 && !anyRepDisc) return; // nothing to fix

    // New-format guard (audit A-1): if the stored total already matches
    // round(subtotal) + tax − discountAmount − deposit, this ticket's
    // discountAmount is a REAL invoice-level discount that was already
    // applied — healing it would corrupt the price.
    const newFormatTotal =
      Math.round(Number(selectedWo.subtotal) || 0) +
      Math.round(Number(selectedWo.taxAmount) || 0) -
      dis -
      (Number(selectedWo.depositAmount) || 0);
    if (Math.abs((Number(selectedWo.totalAmount) || 0) - newFormatTotal) <= 1) return;

    // Legacy evidence: a legacy ticket's unitPrice is the FINAL (discounted)
    // price, so its selectedRepairs basePrice is HIGHER than unitPrice. A
    // new-format ticket stores unitPrice == basePrice (original). If no labor
    // line shows that legacy signature, this is a new-format ticket with a
    // real invoice discount — never run legacy recovery on it (audit A-1/P1-2).
    // Data is cloud-only and fully migrated, so any ticket with discountAmount
    // and no per-item discounts is a new-format A-1 victim.
    const legacyEvidence = labor.some((li) => {
      const rep = repByName.get(String(li.description || '').toLowerCase().trim());
      return rep && Number(rep.basePrice) > 0 && Number(rep.basePrice) > (Number(li.unitPrice) || 0) + 0.5;
    });
    if (dis > 0 && !legacyEvidence) {
      // A-1 victim repair: new-format ticket (unitPrice == basePrice) whose
      // stored totalAmount never had the invoice discount subtracted (the
      // old recalculateTotals ignored discountAmount when no line had a
      // per-item discount). Recompute totals in place, KEEP discountAmount,
      // stamp 'new' — the discount now applies (audit A-1).
      const totals = recalculateTotals(lis, dis, Number(selectedWo.depositAmount) || 0, 'new');
      onSaveWorkOrder({
        ...selectedWo,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        discountFormat: 'new',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const qtyOf = (li: any) => Number(li.quantity) || 1;
    let origSum = 0;
    let finalSum = 0;
    const newLis = lis.map((li) => {
      const qty = qtyOf(li);
      if (li.isLabor) {
        const rep = repByName.get(String(li.description || '').toLowerCase().trim());
        if (rep && Number(rep.basePrice) > 0) {
          const unit = Number(rep.basePrice);
          const pct = Math.max(0, Math.min(99, Number(rep.discountPercent) || 0));
          origSum += unit * qty;
          finalSum += unit * (1 - pct / 100) * qty;
          return { ...li, unitPrice: unit, lineItemDiscountPercent: pct || undefined };
        }
        const unit = Number(li.unitPrice) || 0;
        origSum += unit * qty;
        finalSum += unit * qty;
        // audit A-P2-2: always copy — never hand the original prop-owned
        // object down for later in-place mutation (Format-A fallback below).
        return { ...li };
      }
      // Parts are INTERNAL tracking only — never charged to the customer, so
      // they contribute nothing to the customer total (audit A-2).
      // audit A-P2-2: copy, see above.
      return { ...li };
    });
    // Format A fallback: recover from duplicate discountAmount
    if (dis > 0 && origSum === finalSum) {
      const liFinal = labor.reduce((s, li) => s + (Number(li.unitPrice) || 0) * qtyOf(li), 0);
      if (liFinal > 0) {
        const ratio = (liFinal + dis) / liFinal;
        const discPct = Math.max(0, Math.min(99, Math.round((1 - liFinal / (liFinal + dis)) * 100)));
        newLis.forEach((li) => {
          if (li.isLabor && !li.lineItemDiscountPercent) {
            li.unitPrice = Math.round((Number(li.unitPrice) || 0) * ratio);
            li.lineItemDiscountPercent = discPct || undefined;
          }
        });
        origSum = Math.round(liFinal * ratio);
        finalSum = liFinal;
      }
    }
    if (origSum <= 0) return;
    const newSubtotal = newLis.filter((li) => li.isLabor).reduce((s, li) => s + (Number(li.unitPrice) || 0) * qtyOf(li), 0);
    // Recompute tax + total consistently: total = labor final + tax − deposit.
    // Parts stay out of the customer total; discountAmount is zeroed because the
    // discount now lives in per-item % (audit A-2).
    const healedTax = Math.round(finalSum * taxRate);
    const healedTotal = Math.max(0, Math.round(finalSum) + healedTax - (Number(selectedWo.depositAmount) || 0));
    onSaveWorkOrder({
      ...selectedWo,
      lineItems: newLis,
      discountAmount: 0,
      discountFormat: 'new',
      subtotal: newSubtotal || origSum,
      taxAmount: healedTax,
      totalAmount: healedTotal,
      updatedAt: new Date().toISOString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWo?.id]);

  const handleAddInventoryPartToWorkOrder = () => {
    if (!selectedWo || !selectedInventoryPart) return;

    const qty = Math.max(1, Math.floor(Number(inventoryPartQty) || 1));
    const availableStock = selectedInventoryPart.quantityInStock || 0;
    const existingQty = (selectedWo.lineItems || [])
      .filter((item) => item.partId === selectedInventoryPart.id)
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalNeeded = existingQty + qty;

    if (totalNeeded > availableStock) {
      toast.error(
        `Only ${availableStock} in stock (${existingQty} already in ticket). Cannot add ${qty} more.`,
        'Insufficient Stock'
      );
      return;
    }

    const partLineId = `${selectedInventoryPart.id}-${Date.now()}`;
    // audit A-P2-3: build on the pending draft (if any) so a debounced sheet
    // edit is not lost when a part is added before the save flushed.
    const existingLines = [...(pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? [])];
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

    // audit A-P2-3: commit once (immediate) — totals recomputed inside.
    commitLineItems(nextLineItems, { immediate: true });
    setInventoryPartQty(1);
  };

  const handleRemoveInventoryPartFromWorkOrder = (lineItemId: string) => {
    if (!selectedWo || !onSaveWorkOrder) return;

    // audit A-P2-3: remove from the pending draft when present.
    const nextLineItems = (pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? []).filter((item) => item.id !== lineItemId);
    commitLineItems(nextLineItems, { immediate: true });
  };

  // Commit (or schedule) a full work-order save for the given line items.
  // immediate = discrete user action (add/remove part, discount change) —
  // saves right away. default = sheet-editor keystrokes, debounced so rapid
  // edits can't race each other's full-document PATCHes (audit A-P2-3).
  const commitLineItems = (
    nextLineItems: WorkOrder['lineItems'],
    opts: { immediate?: boolean; discountAmount?: number; depositAmount?: number } = {}
  ) => {
    if (!selectedWo || !onSaveWorkOrderRef.current) return;
    const discount = opts.discountAmount !== undefined ? opts.discountAmount : selectedWo.discountAmount || 0;
    const deposit = opts.depositAmount !== undefined ? opts.depositAmount : selectedWo.depositAmount || 0;
    const totals = recalculateTotals(nextLineItems, discount, deposit, selectedWo.discountFormat);
    const updatedWo: WorkOrder = {
      ...selectedWo,
      lineItems: nextLineItems,
      discountAmount: discount,
      depositAmount: deposit,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      updatedAt: new Date().toISOString(),
    };
    if (opts.immediate) {
      if (lineItemSaveTimerRef.current) {
        clearTimeout(lineItemSaveTimerRef.current);
        lineItemSaveTimerRef.current = null;
      }
      pendingWoRef.current = null;
      setLineItemDraft(null);
      onSaveWorkOrderRef.current(updatedWo);
      return;
    }
    pendingWoRef.current = updatedWo;
    setLineItemDraft(nextLineItems);
    if (lineItemSaveTimerRef.current) clearTimeout(lineItemSaveTimerRef.current);
    lineItemSaveTimerRef.current = setTimeout(() => {
      lineItemSaveTimerRef.current = null;
      const toSave = pendingWoRef.current;
      pendingWoRef.current = null;
      setLineItemDraft(null);
      if (toSave && onSaveWorkOrderRef.current) onSaveWorkOrderRef.current(toSave);
    }, 500);
  };

  // Flush a pending debounced edit immediately (used before checkout so the
  // amount charged always matches the amounts shown) (audit A-P2-3).
  const flushLineItemDraft = () => {
    if (lineItemSaveTimerRef.current) {
      clearTimeout(lineItemSaveTimerRef.current);
      lineItemSaveTimerRef.current = null;
    }
    const toSave = pendingWoRef.current;
    pendingWoRef.current = null;
    setLineItemDraft(null);
    if (toSave && onSaveWorkOrderRef.current) onSaveWorkOrderRef.current(toSave);
  };

  // Update a single line item field (price, qty, or per-item discount) (Ko Hein 2026-08-10)
  const handleUpdateLineItem = (lineItemId: string, field: 'unitPrice' | 'quantity' | 'lineItemDiscountPercent', value: number) => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const baseLines = pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? [];
    const nextLineItems = baseLines.map((item) => {
      if (item.id !== lineItemId) return item;
      if (field === 'unitPrice') return { ...item, unitPrice: Math.max(0, value) };
      if (field === 'quantity') return { ...item, quantity: Math.max(1, Math.floor(value)) };
      if (field === 'lineItemDiscountPercent') return { ...item, lineItemDiscountPercent: Math.min(100, Math.max(0, value)) };
      return item;
    });
    // audit A-P2-3: debounced save — never a full-document PATCH per keystroke.
    commitLineItems(nextLineItems);
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
    // audit A-P2-3: append to the pending draft (if any) and save once.
    const nextLineItems = [...(pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? []), newLine];
    commitLineItems(nextLineItems, { immediate: true });
    setCustomRepairName('');
    setCustomRepairPrice(0);
    setCustomRepairQty(1);
    setIsAddCustomRepairOpen(false);
  };

  const updatePosCatalogDiscount = (categoryKey: string, newDiscountPercent: number) => {
    const clamped = Math.min(100, Math.max(0, Number.isFinite(newDiscountPercent) ? newDiscountPercent : 0));
    setPosCatalogDiscounts((prev) => ({
      ...prev,
      [categoryKey]: clamped,
    }));
  };

  // Add selected repairs from Price List as line items (Ko Hein 2026-08-10)
  const handleAddRepairsFromPriceList = (catalogItems: Array<ModelRepairCatalogItem & { discountPercent?: number }>) => {
    if (!selectedWo || !onSaveWorkOrder || catalogItems.length === 0) return;
    const newLines: WorkOrderLineItem[] = catalogItems.map((item) => ({
      id: `pricelist-${Date.now()}-${item.categoryKey}`,
      description: item.name,
      unitCost: 0,
      unitPrice: item.price,
      quantity: 1,
      isLabor: true,
      lineItemDiscountPercent: item.discountPercent || undefined,
    }));
    // audit A-P2-3: append to the pending draft (if any) and save once.
    const nextLineItems = [...(pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? []), ...newLines];
    commitLineItems(nextLineItems, { immediate: true });
    setIsAddRepairFromPriceListOpen(false);
    // audit A-P2-5: clear picker selection on every exit path (Done / X / backdrop).
    setPosCatalogSelection([]);
    setPosCatalogDiscounts({});
    setPosDiscountMenuFor(null);
    setPosDiscountAnchor(null);
    setPosCustomDiscountInput('');
    setPriceSearchQuery('');
    setSelectedGroupFilter('ALL');
  };

  // Close the Price List picker and drop its selection state (audit A-P2-5).
  const closePriceListPicker = () => {
    setIsAddRepairFromPriceListOpen(false);
    setPosCatalogSelection([]);
    setPosCatalogDiscounts({});
    setPosDiscountMenuFor(null);
    setPosDiscountAnchor(null);
    setPosCustomDiscountInput('');
    setPriceSearchQuery('');
    setSelectedGroupFilter('ALL');
  };

  // Update whole-invoice discount (Ko Hein 2026-08-10)
  const handleUpdateInvoiceDiscount = (newDiscount: number) => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const discount = Math.max(0, Number(newDiscount) || 0);
    // audit A-P2-3: apply on the pending draft (if any) and save once.
    const baseLines = pendingWoRef.current?.lineItems ?? selectedWo.lineItems;
    commitLineItems(baseLines, { immediate: true, discountAmount: discount });
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
    // audit A-P2-3: if a sheet edit is still in the debounce window, flush it
    // and ask staff to re-confirm — charging from a stale total would record
    // the wrong amount.
    if (pendingWoRef.current) {
      flushLineItemDraft();
      toast.info('Line item amounts were just updated — please review the new total and charge again.', 'Amount Updated');
      return;
    }
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
  const handleApplyDiagnosticFeeOnly = async () => {
    if (!selectedWo || !onSaveWorkOrder) return;
    // audit A-P2-4: replacing all line items destroys repair/part history with
    // no undo — confirm first.
    if ((selectedWo.lineItems || []).length > 0) {
      const ok = await confirmDialog({
        title: 'Apply Diagnostic Fee Only',
        message: 'This replaces ALL current line items (repairs + parts) on this ticket with the single Diagnostic & Inspection Fee. Continue?',
        confirmLabel: 'Apply Fee',
        danger: true,
      });
      if (!ok) return;
    }
    const diagFee = 5000; // 5000 MMK standard diagnostic inspection fee
    const diagLines: WorkOrder['lineItems'] = [
      {
        id: 'diag-fee-item',
        description: 'Diagnostic & Inspection Fee',
        quantity: 1,
        unitCost: 0,
        unitPrice: diagFee,
        isLabor: true,
      },
    ];
    // audit A-P2-4: reset discountAmount to 0 — on legacy tickets it is a
    // duplicate of the discount already embedded in prices and would zero out
    // the fee (recalculateTotals honors 'legacy' via the flag, but a fresh
    // fee line must never inherit an old invoice discount).
    commitLineItems(diagLines, { immediate: true, discountAmount: 0 });
  };

  const renderCheckoutPanel = () =>
    selectedWo ? (
            <div className="space-y-3">
              {/* Desktop: left column — ticket header + items + summary */}
              <div className="space-y-3 md:min-w-0">
              <div className="border border-line bg-gradient-to-r from-surface/70 via-white to-surface/40 rounded-xl px-3 py-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono font-black text-ink text-xs tracking-tight">
                        <Ticket className="w-3.5 h-3.5 text-muted shrink-0" />
                        {selectedWo.orderNumber}
                      </span>
                      <StatusChip status={selectedWo.status} />
                    </div>
                    <h2 className="flex items-center gap-1.5 text-base font-black text-ink leading-tight truncate">
                      <Smartphone className="w-4 h-4 text-muted shrink-0" />
                      <span className="truncate">{selectedWo.deviceModel}</span>
                    </h2>
                  </div>
                  <div className="shrink-0 text-right space-y-0.5">
                    <p className="inline-flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-wider text-muted">
                      <UserRound className="w-3 h-3" />
                      Customer
                    </p>
                    <p className="font-black text-ink text-sm leading-tight">{selectedWo.customerName}</p>
                    {selectedWo.customerPhone && (
                      <p className="inline-flex items-center justify-end gap-1 font-mono text-[11px] font-bold text-muted tabular-nums">
                        <Phone className="w-3 h-3" />
                        {selectedWo.customerPhone}
                      </p>
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
                          <Button
                            type="button"
                            onClick={handleApplyDiagnosticFeeOnly}
                            className="w-full py-1.5 rounded-md bg-danger hover:bg-danger-deep text-white font-extrabold text-xs transition-all cursor-pointer active:scale-[0.98] focus:outline-none"
                          >
                            Apply Diagnostic Fee Only (စက်စစ်ခ သာကောက်မည်)
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Itemized Line Items — Labor/Repair + System Parts (Ko Hein 2026-08-10) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-black text-ink text-xs uppercase tracking-wide">Itemized Labor & Parts</h3>
                    <span className="text-[10px] text-muted font-semibold">
                      {laborItems.length} repair{laborItems.length !== 1 ? 's' : ''}{partsItems.length > 0 ? ` · ${partsItems.length} part${partsItems.length !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddPartOpen(true)}
                      className="h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold text-ink hover:bg-transparent hover:text-ink hover:underline"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Add Part</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddCustomRepairOpen(!isAddCustomRepairOpen)}
                      className={`h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold hover:bg-transparent hover:underline ${
                        isAddCustomRepairOpen ? 'text-success-deep' : 'text-ink hover:text-ink'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Custom</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddRepairFromPriceListOpen(true)}
                      className="h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold text-ink hover:bg-transparent hover:text-ink hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Price List</span>
                    </Button>
                    {(laborItems.length > 0 || partsItems.length > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsSheetEditMode((v) => !v)}
                        className={`h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold hover:bg-transparent hover:underline ${
                          isSheetEditMode ? 'text-success-deep' : 'text-ink hover:text-ink'
                        }`}
                      >
                        {isSheetEditMode ? <Check className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />}
                        <span>{isSheetEditMode ? 'Done' : 'Edit'}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Repair Items (Customer invoice) */}
                {laborItems.length === 0 && partsItems.length === 0 ? (
                  <div className="p-6 text-center text-muted text-xs border border-dashed border-line-strong rounded-lg bg-surface/30">
                    <Wrench className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-ink" />
                    <p className="font-extrabold text-ink">No items added yet</p>
                    <p>Use Add Part, Custom, or Price List above to add line items.</p>
                  </div>
                ) : (
                  <>
                    {/* Itemized sheet — repair rows + internal system-part rows together */}
                    {(laborItems.length > 0 || partsItems.length > 0) && (
                      <div className="border border-line-strong rounded-lg overflow-hidden bg-white">
                        <table className="w-full table-fixed border-collapse text-[11px]">
                          <colgroup>
                            <col className="w-[52%]" />
                            <col className="w-[7%]" />
                            <col className="w-[15%]" />
                            <col className="w-[9%]" />
                            <col className="w-[17%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-surface/80">
                              <th className="border border-line px-2 py-1 text-left font-black text-muted text-[10px] uppercase tracking-wide">Item</th>
                              <th className="border border-line px-2 py-1 text-center font-black text-muted text-[10px] uppercase tracking-wide">Qty</th>
                              <th className="border border-line px-2 py-1 text-center font-black text-muted text-[10px] uppercase tracking-wide">Original Price</th>
                              <th className="border border-line px-2 py-1 text-center font-black text-muted text-[10px] uppercase tracking-wide">Disc%</th>
                              <th className="border border-line px-2 py-1 text-right font-black text-muted text-[10px] uppercase tracking-wide">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {laborItems.map((li) => {
                              const isEditing = isSheetEditMode;
                              const hasDiscount = Boolean(li.lineItemDiscountPercent);
                              const lineTotal = li.unitPrice * li.quantity;
                              const itemDiscountAmt = hasDiscount ? Math.round(lineTotal * (li.lineItemDiscountPercent! / 100)) : 0;
                              const effectiveTotal = lineTotal - itemDiscountAmt;
                              const displayDiscountPct = li.lineItemDiscountPercent || 0;
                              const LineIcon = getLineItemIcon(li.description);
                              return (
                                <tr key={li.id} className="bg-white">
                                  {/* Item name + edit toggle */}
                                  <td className="border border-line px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <LineIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                                      <span className="font-bold text-ink min-w-0 truncate">{li.description}</span>
                                    </div>
                                  </td>

                                  {/* Qty — editable */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={1}
                                        value={li.quantity}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'quantity', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="text-muted tabular-nums">{li.quantity}</span>
                                    )}
                                  </td>

                                  {/* Unit Price — show original (strike) + discounted side by side if discounted */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={0}
                                        step={500}
                                        value={li.unitPrice}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'unitPrice', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="font-mono text-muted tabular-nums">{li.unitPrice.toLocaleString()}</span>
                                    )}
                                  </td>

                                  {/* Per-item discount % — editable */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center gap-0.5">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={li.lineItemDiscountPercent ?? ''}
                                          onChange={(e) => handleUpdateLineItem(li.id, 'lineItemDiscountPercent', Number(e.target.value))}
                                          placeholder="0"
                                          className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                        />
                                        <Percent className="w-3 h-3 text-muted shrink-0" />
                                      </div>
                                    ) : (
                                      <span className={`font-mono tabular-nums ${hasDiscount ? 'text-success-deep font-bold' : 'text-muted'}`}>
                                        {hasDiscount ? `${displayDiscountPct}%` : '—'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Amount = original → discount → final */}
                                  <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      <div className="flex min-w-0 flex-col items-end gap-0">
                                        {hasDiscount ? (
                                          <React.Fragment>
                                            <span className="font-black text-ink text-xs">{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        ) : (
                                          <React.Fragment>
                                            <span>{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="iconGhost"
                                        onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                        aria-label={`Remove ${li.description}`}
                                        title="Remove line item"
                                        className={`!h-5 !min-h-5 w-5 text-muted hover:text-danger p-0 rounded transition-colors cursor-pointer focus:outline-none ${isEditing ? '' : 'invisible pointer-events-none'}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {partsItems.map((li) => {
                              const isEditing = isSheetEditMode;
                              const hasDiscount = Boolean(li.lineItemDiscountPercent);
                              const lineTotal = li.unitPrice * li.quantity;
                              const itemDiscountAmt = hasDiscount ? Math.round(lineTotal * (li.lineItemDiscountPercent! / 100)) : 0;
                              const effectiveTotal = lineTotal - itemDiscountAmt;
                              const displayDiscountPct = li.lineItemDiscountPercent || 0;
                              const itemName = li.description || li.partName;
                              return (
                                <tr key={li.id} className="bg-surface/30">
                                  <td className="border border-line px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <PackageCheck className="w-3.5 h-3.5 text-muted shrink-0" />
                                      <span className="font-bold text-ink min-w-0 truncate">{itemName}</span>
                                    </div>
                                  </td>
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={1}
                                        value={li.quantity}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'quantity', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="text-muted tabular-nums">{li.quantity}</span>
                                    )}
                                  </td>
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={0}
                                        step={500}
                                        value={li.unitPrice}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'unitPrice', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="font-mono text-muted tabular-nums">{li.unitPrice.toLocaleString()}</span>
                                    )}
                                  </td>
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center gap-0.5">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={li.lineItemDiscountPercent ?? ''}
                                          onChange={(e) => handleUpdateLineItem(li.id, 'lineItemDiscountPercent', Number(e.target.value))}
                                          placeholder="0"
                                          className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                        />
                                        <Percent className="w-3 h-3 text-muted shrink-0" />
                                      </div>
                                    ) : (
                                      <span className={`font-mono tabular-nums ${hasDiscount ? 'text-success-deep font-bold' : 'text-muted'}`}>
                                        {hasDiscount ? `${displayDiscountPct}%` : '—'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      <div className="flex min-w-0 flex-col items-end gap-0">
                                        {hasDiscount ? (
                                          <React.Fragment>
                                            <span className="font-black text-ink text-xs">{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        ) : (
                                          <React.Fragment>
                                            <span>{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="iconGhost"
                                        onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                        aria-label={`Remove ${itemName}`}
                                        title="Remove system part"
                                        className={`!h-5 !min-h-5 w-5 text-muted hover:text-danger p-0 rounded transition-colors cursor-pointer focus:outline-none ${isEditing ? '' : 'invisible pointer-events-none'}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
                {/* Custom Repair Form (Ko Hein 2026-08-10) */}
                {isAddCustomRepairOpen && (
                  <div className="p-3 bg-surface/60 border border-line rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-ink shrink-0" />
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
                      <Button
                        type="button"
                        onClick={handleAddCustomRepair}
                        disabled={!customRepairName.trim() || !customRepairPrice}
                        className="px-3 py-1.5 rounded-lg bg-ink hover:bg-ink/90 text-white text-xs font-extrabold transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add to Invoice
                      </Button>
                    </div>
                  </div>
                )}

                {/* Calculation Summary — Customer & System totals (Ko Hein 2026-08-10) */}
                <div className="rounded-lg border border-line bg-white text-[11px] shadow-2xs overflow-hidden">
                  <table className="w-full border-collapse">
                    <tbody>
                      {/* Customer-facing section */}
                      <tr className="bg-surface/80">
                        <td className="border-b border-line px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted" colSpan={2}>
                          Customer Invoice
                        </td>
                      </tr>
                      <tr>
                        <td className="border-b border-line px-3 py-2 text-muted">Repair Subtotal <span className="text-[10px]">({laborItems.length} item{laborItems.length !== 1 ? 's' : ''})</span></td>
                        <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-ink tabular-nums">{(selectedWo.subtotal ?? 0).toLocaleString()} {currency}</td>
                      </tr>
                      {perItemDiscountTotal > 0 && (
                        <tr>
                          <td className="border-b border-line px-3 py-2 text-success-deep">Per-item Discounts</td>
                          <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-success-deep tabular-nums">-{perItemDiscountTotal.toLocaleString()} {currency}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="border-b border-line px-3 py-2 text-muted">Sales Tax ({Math.round(taxRate * 100)}%)</td>
                        <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-ink tabular-nums">{(selectedWo.taxAmount ?? 0).toLocaleString()} {currency}</td>
                      </tr>
                      {/* Invoice Discount — editable (Ko Hein 2026-08-10) */}
                      <tr>
                        <td className="border-b border-line px-3 py-1.5 text-success-deep">
                          <span className="flex items-center gap-1 leading-none">
                            <Percent className="w-3 h-3 shrink-0" />
                            Invoice Discount
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-1.5">
                          <div className="flex items-center gap-1 justify-end">
                            <Input
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
                              className="h-auto min-h-0 w-20 text-right text-xs font-mono font-bold text-success-deep bg-transparent border-0 rounded-none px-1 py-0 outline-none focus:ring-0 focus:border-0"
                            />
                            <span className="text-success-deep font-mono tabular-nums text-xs shrink-0">{currency}</span>
                          </div>
                        </td>
                      </tr>
                      {selectedWo.depositAmount > 0 && (
                        <tr>
                          <td className="border-b border-line px-3 py-2 text-success-deep">Upfront Deposit Paid</td>
                          <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-success-deep tabular-nums">-{selectedWo.depositAmount.toLocaleString()} {currency}</td>
                        </tr>
                      )}
                      <tr className="bg-ink text-white hover:bg-ink hover:text-white">
                        <td className="px-3 py-2.5 text-xs font-black uppercase tracking-wide">Amount Due (Customer)</td>
                        <td className="px-3 py-2.5 text-right font-mono text-lg font-black tabular-nums">
                          {selectedWo.totalAmount.toLocaleString()} {currency}
                        </td>
                      </tr>

                      {/* System section — profit breakdown (Ko Hein 2026-08-11)
                          Gross Profit = Amount Due (Customer) − Parts Cost
                          Net Profit   = Gross Profit − Tech Commission
                          audit A-P3-3: show SIGNED values (clamping hid real
                          losses) and render the block whenever there are parts
                          OR a commission estimate — not only when parts exist. */}
                      {(partsItems.length > 0 || estCommission > 0) && (
                        <>
                          <tr className="bg-surface/30">
                            <td className="border border-line px-2 py-1 text-[10px] font-extrabold text-muted uppercase tracking-wider" colSpan={2}>System (incl. Parts)</td>
                          </tr>
                          {partsItems.length > 0 && (
                            <tr>
                              <td className="border border-line px-2 py-1.5 text-muted">Parts Cost (deducted)</td>
                              <td className="border border-line px-2 py-1.5 text-right font-mono text-warning tabular-nums">-{partsCostTotal.toLocaleString()} {currency}</td>
                            </tr>
                          )}
                          {partsItems.length > 0 && (
                            <tr>
                              <td className="border border-line px-2 py-1.5 text-muted">
                                Parts Profit (internal){' '}
                                <span className="text-[10px] font-semibold text-faint">(sell {partsSellTotal.toLocaleString()} − cost {partsCostTotal.toLocaleString()})</span>
                              </td>
                              <td className="border border-line px-2 py-1.5 text-right font-mono text-success-deep tabular-nums">+{partsProfitTotal.toLocaleString()} {currency}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="border border-line px-2 py-1.5 text-success-deep font-bold">Gross Profit</td>
                            <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-success-deep tabular-nums">{signedMoney((selectedWo.totalAmount || 0) - partsCostTotal)} {currency}</td>
                          </tr>
                          {estCommission > 0 && (
                            <tr>
                              <td className="border border-line px-2 py-1.5 text-muted">
                                Tech Commission{' '}
                                <span className="text-[10px] font-bold text-ink">
                                  ({(() => {
                                    const techId = selectedWo.assignedTechId || (selectedWo as WorkOrder & { qaTechnicianId?: string }).qaTechnicianId;
                                    const tech = techId ? technicians.find((t) => t.id === techId) : undefined;
                                    return tech?.name || selectedWo.assignedTechName || 'Unassigned';
                                  })()})
                                </span>
                              </td>
                              <td className="border border-line px-2 py-1.5 text-right font-mono text-muted tabular-nums">-{estCommission.toLocaleString()} {currency}</td>
                            </tr>
                          )}
                          {estCommission > 0 && (
                            <tr className="bg-surface/20">
                              <td className="border border-line px-2 py-1.5 text-ink font-bold">Net Profit</td>
                              <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums">{signedMoney((selectedWo.totalAmount || 0) - partsCostTotal - estCommission)} {currency}</td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>


              {/* Payment Gateway Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-ink text-xs flex items-center space-x-1.5 uppercase tracking-wide">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payment Method Selection</span>
                  </h3>
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
                      <Button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.name)}
                        variant="ghost"
                        className={`!h-7 !min-h-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border-0 shadow-none transition-all cursor-pointer focus:outline-none active:scale-95 ${
                          isSelected ? 'bg-ink text-white' : 'bg-transparent text-ink hover:bg-surface'
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        {m.name}
                      </Button>
                    );
                  })}

                  {/* Split Payment pill */}
                  <Button
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
                    variant="ghost"
                    className={`!h-7 !min-h-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border-0 shadow-none transition-all cursor-pointer focus:outline-none active:scale-95 ${
                      paymentMethod === 'Split Payment' ? 'bg-ink text-white' : 'bg-transparent text-ink hover:bg-surface'
                    }`}
                  >
                    {paymentMethod === 'Split Payment' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    Split Payment
                  </Button>
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
                  <div className="p-3 bg-surface/70 border border-line rounded-xl space-y-2 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-ink flex items-center space-x-1.5">
                        <Landmark className="w-4 h-4 text-ink" />
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
                          className="px-2 py-1 bg-white hover:bg-surface text-ink border border-line"
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
                          <span className="font-mono font-extrabold text-ink">{selectedMethodConfig.accountNumber}</span>
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
                  <div className="px-0 py-1.5 bg-transparent border-0 rounded-none space-y-2">
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
                              variant="ghost"
                              className={`h-8 px-2.5 rounded-lg border-0 shadow-none text-[11px] font-bold ${
                                cashTendered === amt
                                  ? 'bg-ink text-white'
                                  : 'bg-transparent text-ink hover:bg-surface'
                              }`}
                            >
                              {cashTendered === amt && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-white" />}
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
                      className="w-full bg-white/70 border-0 rounded-lg px-2 py-1.5 text-ink font-mono shadow-none focus:ring-0 focus:border-0"
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
                            } else if (key === '0') {
                              // audit A-P3-5: append a literal zero — Number('0')||0
                              // made the key a no-op when tendered was 0, and
                              // Number('50'+'0') via string concat also worked
                              // but 0/00 needed an explicit path.
                              setCashTendered(cashTendered * 10);
                            } else if (key === '00') {
                              setCashTendered(cashTendered * 100);
                            } else {
                              setCashTendered(Number(String(cashTendered || '') + key) || 0);
                            }
                          }}
                          variant="outline"
                          className="h-11 font-mono text-sm font-black hover:bg-surface hover:border-line-strong"
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
                  <FileText className="w-4 h-4 text-ink shrink-0" />
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
    <div className={`space-y-2 md:h-[calc(100dvh-58px)] md:min-h-0 md:overflow-hidden ${isIpad ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      <div className={`flex flex-col md:h-full md:min-h-0 md:overflow-hidden md:flex-row gap-2 text-xs pb-16 md:pb-0 ${isIpad ? 'md:flex-1' : ''}`}>
        {/* Left Column: Select Work Order to Checkout (collapsible, hugs sidebar) */}
        <div className={`bg-white border border-line rounded-xl p-2.5 space-y-2 shadow-xs shrink-0 ${
          isQueueCollapsed ? 'md:w-32' : 'md:w-[340px]'
        } ${isIpad ? 'md:flex md:h-full md:flex-col md:min-h-0' : 'md:h-full md:self-stretch md:flex md:flex-col md:min-h-0 md:overflow-hidden'}`}>
          <div className="flex justify-between items-center border-b border-line pb-2">
            {!isQueueCollapsed ? (
              <>
                <h2 className="font-bold text-ink text-xs">Ready to Checkout ({filteredWorkOrders.length})</h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono font-bold bg-success/10 text-success-deep px-2 py-0.5 rounded-full border border-success/20">
                    Checkout
                  </span>
                  <Button
                    type="button"
                    onClick={() => setIsQueueCollapsed(true)}
                    variant="iconGhost"
                    className="!h-6 !min-h-6 w-6 px-0 rounded flex items-center justify-center text-muted hover:bg-surface hover:text-ink transition-colors"
                    title="Collapse ticket list"
                    aria-label="Collapse ticket list"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => setIsQueueCollapsed(false)}
                className="w-full h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface hover:text-brand transition-colors"
                title="Expand ticket list"
                aria-label="Expand ticket list"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!isQueueCollapsed && (
          <div className={`space-y-2 overflow-y-auto pr-1 ${isIpad ? 'md:flex md:flex-col md:min-h-0 md:flex-1 md:max-h-none' : 'min-h-[360px] max-h-[calc(100dvh-280px)] md:max-h-none md:flex-1 md:min-h-0'}`}>
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
                    className={`group cursor-pointer rounded-lg border bg-white p-2.5 shadow-2xs transition-all hover:shadow-md hover:border-ink/30 select-none ${
                      isSelected ? 'border-ink ring-2 ring-ink/10 bg-surface' : 'border-line'
                    }`}
                  >
                    {/* Top row: order # + priority */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-[11px] font-black text-ink truncate">{wo.orderNumber}</span>
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
                      <span className="flex items-center space-x-1 text-[11px] font-bold text-ink min-w-0 truncate">
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
            <div className={`space-y-1.5 overflow-y-auto pr-1 ${isIpad ? 'md:flex md:flex-col md:min-h-0 md:flex-1 md:max-h-none' : 'min-h-[360px] max-h-[calc(100dvh-280px)] md:max-h-none md:flex-1 md:min-h-0'}`}>
              {filteredWorkOrders.map((wo) => {
                const isSel = wo.id === selectedWoId;
                return (
                  <Button
                    key={wo.id}
                    type="button"
                    onClick={() => {
                      setSelectedWoId(wo.id);
                      resetTransactionState();
                    }}
                    variant="outline"
                    className={`w-full px-2 py-1.5 rounded-lg flex flex-col items-start transition-colors ${
                      isSel ? 'bg-ink text-white border-transparent shadow-2xs' : 'bg-white text-ink border border-line hover:bg-surface'
                    }`}
                    title={`${wo.orderNumber} · ${wo.deviceModel} · ${wo.customerName}`}
                    aria-label={`Select ${wo.orderNumber} ${wo.deviceModel}`}
                  >
                    <span className={`font-mono text-[10px] font-black leading-tight ${isSel ? 'text-white' : 'text-ink'}`}>
                      {wo.orderNumber}
                    </span>
                    <span className={`text-[9px] font-bold leading-tight truncate w-full ${isSel ? 'text-white/90' : 'text-ink'}`}>
                      {wo.deviceModel}
                    </span>
                    <span className={`text-[8px] font-black leading-tight ${isSel ? 'text-white/80' : 'text-muted'}`}>
                      {wo.isPaid ? '✓ PAID' : '$ DUE'} · {wo.totalAmount.toLocaleString()}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Invoice & Terminal Checkout (8 cols) */}
        <div className={`hidden md:block flex-1 min-w-0 bg-white border border-line rounded-xl p-3 pb-24 md:pb-3 space-y-3 shadow-xs md:h-full md:min-h-0 md:overflow-hidden ${isIpad ? 'md:flex md:flex-col' : ''}`}>
                    {renderCheckoutPanel()}
        </div>
      </div>

      {/* Mobile: full POS checkout popup — Pay tap opens the whole checkout (Ko Hein) */}
      {isMobileCheckoutFullOpen && selectedWo && (
        <div className="fixed inset-0 z-50 md:hidden bg-white overflow-y-auto pt-[calc(env(safe-area-inset-top)+8px)] pb-28">
          <div className="sticky top-0 z-10 flex justify-end px-3 pt-1.5">
            <Button
              type="button"
              onClick={() => setIsMobileCheckoutFullOpen(false)}
              aria-label="Close checkout"
              className="text-muted hover:text-ink p-1.5 rounded transition-colors cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" />
            </Button>
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
                <Input
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
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md h-[80dvh] sm:h-[520px] flex flex-col p-4 space-y-3 shadow-xl animate-i35-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-ink">Add Inventory Part Used</h3>
                <p className="text-xs text-muted truncate">Pick the stock part used on this ticket</p>
              </div>
              <Button
                type="button"
                variant="iconGhost"
                onClick={() => setIsAddPartOpen(false)}
                aria-label="Close add part"
                className="text-muted hover:text-ink p-1.5 rounded transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Owner filter — compact text-only pills (Ko Hein 2026-08-11) */}
            <div className="flex items-center gap-2">
              {(['ALL', 'APP', 'KZH'] as const).map((owner) => (
                <button
                  key={owner}
                  type="button"
                  onClick={() => setPosOwner(owner)}
                  className={`text-[11px] font-extrabold tracking-wide uppercase transition-colors cursor-pointer ${
                    posOwner === owner ? 'text-ink underline underline-offset-4 decoration-2' : 'text-muted hover:text-ink'
                  }`}
                >
                  {owner}
                </button>
              ))}
              <span className="ml-auto text-[11px] font-semibold text-muted truncate">
                {selectedWo?.deviceModel || 'Device'}
              </span>
            </div>

            {/* Sub-tabs: Auto (exact device + repair category) / Manual (all for device) — Ko Hein 2026-08-11 */}
            <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
              {([['auto', 'Auto'], ['manual', 'Manual']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPosPartMode(mode)}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-extrabold transition-colors cursor-pointer ${
                    posPartMode === mode ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Manual-mode search (Ko Hein 2026-08-11) */}
            {posPartMode === 'manual' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={posPartSearch}
                  onChange={(e) => setPosPartSearch(e.target.value)}
                  placeholder="Search parts…"
                  className="w-full rounded-lg border border-line bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/40"
                />
              </div>
            )}

            {/* Part list — Auto mode (exact device + repair category) */}
            {posPartMode === 'auto' && (
            <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
              <div className="space-y-1">
              {filteredInventoryParts.filter((part) => part.quantityInStock > 0).length === 0 ? (
                <div className="p-8 text-center text-muted text-xs space-y-1">
                  <PackageCheck className="w-8 h-8 mx-auto opacity-40 text-ink" />
                  <p className="font-extrabold text-ink">
                    {parts.length === 0 ? 'No parts in database' : 'No exact-match parts in stock'}
                  </p>
                  <p>
                    {parts.length === 0
                      ? 'Add parts in Inventory module first.'
                      : 'Switch to Manual to see every part for this device, or change the owner filter.'}
                  </p>
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
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left text-ink transition-all cursor-pointer focus:outline-none ${
                        isSelected ? 'border-ink bg-surface ring-1 ring-ink/10' : 'border-line bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-ink truncate">{part.name}</p>
                        <p className={`text-[10px] font-semibold ${low ? 'text-warning' : 'text-muted'}`}>
                          {part.category} · {part.owner || 'APP'} · Stock: {part.quantityInStock}{low ? ' — Low' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-black text-brand tabular-nums">
                          {Number(part.sellingPrice || 0).toLocaleString()} {currency}
                        </span>
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-success' : 'border-line-strong'}`}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-success" />}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
              </div>
            </div>
            )}

            {/* Manual mode — every part for the exact device model, any category, searchable */}
            {posPartMode === 'manual' && (
            <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
              <div className="space-y-1">
              {(() => {
                const q = posPartSearch.trim().toLowerCase();
                const list = filteredInventoryParts.filter(
                  (part) => part.quantityInStock > 0 && (!q || part.name.toLowerCase().includes(q) || part.category.toLowerCase().includes(q))
                );
                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center text-muted text-xs space-y-1">
                      <PackageCheck className="w-8 h-8 mx-auto opacity-40 text-ink" />
                      <p className="font-extrabold text-ink">{posPartSearch ? 'No parts match your search' : 'No parts for this device'}</p>
                      <p>Add parts in Inventory module first, or change the owner filter.</p>
                    </div>
                  );
                }
                return list.map((part) => {
                  const isSelected = inventoryPartId === part.id;
                  const low = part.quantityInStock <= part.reorderPoint;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => setInventoryPartId(part.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left text-ink transition-all cursor-pointer focus:outline-none ${
                        isSelected ? 'border-ink bg-surface ring-1 ring-ink/10' : 'border-line bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-ink truncate">{part.name}</p>
                        <p className={`text-[10px] font-semibold ${low ? 'text-warning' : 'text-muted'}`}>
                          {part.category} · {part.owner || 'APP'} · Stock: {part.quantityInStock}{low ? ' — Low' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-black text-brand tabular-nums">
                          {Number(part.sellingPrice || 0).toLocaleString()} {currency}
                        </span>
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-success' : 'border-line-strong'}`}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-success" />}
                        </span>
                      </div>
                    </button>
                  );
                });
              })()}
              </div>
            </div>
            )}

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
                  className="flex-1 h-10 bg-ink hover:bg-ink/90 text-white font-extrabold text-xs rounded-lg"
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
        const catalogItems = getModelPriceCatalogItems(selectedWo.deviceModel || '', priceCatalog);
        const matchedModelName = catalogItems.length > 0 ? catalogItems[0].modelMatchedName : selectedWo.deviceModel;
        // audit A-P2-6: fabricated fallback prices (isCatalogMatch === false)
        // must never be addable to a live invoice — staff would charge a
        // made-up amount for an unlisted model.
        const selectedCatalogItems = catalogItems.filter(
          (item) => posCatalogSelection.includes(item.categoryKey) && item.isCatalogMatch && item.price > 0
        ).map((item) => ({ ...item, discountPercent: posCatalogDiscounts[item.categoryKey] || 0 }));
        const selectedCatalogTotal = selectedCatalogItems.reduce((sum, item) => sum + item.price, 0);
        const selectedCatalogFinalTotal = selectedCatalogItems.reduce(
          (sum, item) => sum + Math.round(item.price * (1 - (item.discountPercent || 0) / 100)),
          0
        );
        const selectedCatalogSaved = selectedCatalogTotal - selectedCatalogFinalTotal;
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
            onClick={closePriceListPicker}
            role="presentation"
          >
            <div
              className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-ink">Add Repairs & Details</h3>
                  <p className="truncate text-xs text-muted">Repairs for {matchedModelName}</p>
                </div>
                <Button
                  type="button"
                  variant="iconGhost"
                  onClick={closePriceListPicker}
                  className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Search + group pills — same feel as Simple Ticket */}
              <div className="space-y-2 border-b border-line px-4 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    type="text"
                    value={priceSearchQuery}
                    onChange={(e) => setPriceSearchQuery(e.target.value)}
                    placeholder="Search repairs (e.g. Battery, Display, Face ID)..."
                    className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition-colors focus:bg-white"
                  />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {['ALL', 'Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((grp) => (
                    <Button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedGroupFilter(grp)}
                      className={`shrink-0 rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                        selectedGroupFilter === grp
                          ? 'bg-brand text-white shadow-2xs'
                          : 'bg-surface text-muted hover:text-ink hover:bg-line'
                      }`}
                    >
                      {grp}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Repair list — Simple Ticket card grid */}
              <div className="h-[248px] overflow-y-auto px-4 py-3">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs space-y-1">
                    <FileText className="w-8 h-8 mx-auto opacity-40 text-brand" />
                    <p className="font-extrabold text-ink">No matching repairs found</p>
                    <p>Try a different search or group filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {filteredItems.map((item) => {
                      const isSelected = posCatalogSelection.includes(item.categoryKey);
                      const discountPct = posCatalogDiscounts[item.categoryKey] || 0;
                      const finalPrice = Math.round(item.price * (1 - discountPct / 100));
                      const alreadyInWo = (selectedWo.lineItems || []).some(
                        (li) => li.description?.toLowerCase() === item.name.toLowerCase()
                      );
                      // audit A-P2-6: fallback "estimate" items (not in the real
                      // catalog) are visible but never selectable — no made-up
                      // prices on a live invoice.
                      const notSelectable = alreadyInWo || !item.isCatalogMatch;
                      return (
                        <div
                          key={item.categoryKey}
                          role="button"
                          tabIndex={notSelectable ? -1 : 0}
                          aria-pressed={isSelected}
                          onClick={() => {
                            if (notSelectable) return;
                            setPosCatalogSelection((prev) => {
                              if (prev.includes(item.categoryKey)) {
                                setPosCatalogDiscounts((discounts) => {
                                  const next = { ...discounts };
                                  delete next[item.categoryKey];
                                  return next;
                                });
                                if (posDiscountMenuFor === item.categoryKey) {
                                  setPosDiscountMenuFor(null);
                                  setPosDiscountAnchor(null);
                                }
                                return prev.filter((k) => k !== item.categoryKey);
                              }
                              return [...prev, item.categoryKey];
                            });
                          }}
                          onKeyDown={(e) => {
                            if (notSelectable) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setPosCatalogSelection((prev) => {
                                if (prev.includes(item.categoryKey)) {
                                  setPosCatalogDiscounts((discounts) => {
                                    const next = { ...discounts };
                                    delete next[item.categoryKey];
                                    return next;
                                  });
                                  return prev.filter((k) => k !== item.categoryKey);
                                }
                                return [...prev, item.categoryKey];
                              });
                            }
                          }}
                          className={`group relative flex min-h-[92px] cursor-pointer select-none flex-col gap-1.5 rounded-2xl border-2 bg-white p-2.5 shadow-2xs transition-colors focus:outline-none ${
                            notSelectable
                              ? 'border-line bg-surface/50 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-brand bg-brand/5'
                                : 'border-line hover:border-brand/50'
                          }`}
                        >
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <h3 className="min-w-0 truncate text-[11px] font-extrabold leading-snug text-ink" title={item.name}>{item.name}</h3>
                          </div>
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-muted">{item.group}</span>
                            <span className="inline-flex shrink-0 items-center space-x-0.5 rounded-full border border-success/30 bg-success/10 px-1 py-px text-[10px] font-extrabold text-success-deep">
                              <ShieldCheck className="h-1.5 w-1.5 shrink-0 text-success" />
                              <span>{item.warranty}</span>
                            </span>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-1.5">
                            <div className="min-w-0 leading-tight">
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-mono text-xs font-black text-ink">{finalPrice.toLocaleString()}</span>
                                <span className={`font-mono text-[10px] font-bold text-muted line-through ${discountPct > 0 ? 'visible' : 'invisible'}`}>{item.price.toLocaleString()}</span>
                              </div>
                              <div className="h-3.5 overflow-hidden">
                                {discountPct > 0 ? (
                                  <span className="text-[9px] font-extrabold text-success">−{(item.price - finalPrice).toLocaleString()} · {discountPct}%</span>
                                ) : (
                                  <span className="text-[9px] font-extrabold text-muted">
                                    {alreadyInWo
                                      ? 'Already in invoice'
                                      : !item.isCatalogMatch
                                        ? 'Estimate only — not in catalog'
                                        : isSelected
                                          ? 'Selected'
                                          : 'Tap to add'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (alreadyInWo || !isSelected) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const popupWidth = 176;
                                let left = rect.right - popupWidth;
                                left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));
                                setPosDiscountAnchor({ top: rect.bottom + 6, left });
                                setPosDiscountMenuFor(item.categoryKey);
                              }}
                              title={discountPct > 0 ? `${discountPct}% discount applied` : 'Add discount'}
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer active:scale-95 ${
                                isSelected
                                  ? discountPct > 0
                                    ? 'border-brand bg-brand text-white'
                                    : 'border-line bg-white text-muted hover:border-brand hover:text-brand'
                                  : 'invisible'
                              }`}
                            >
                              <BadgePercent className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Summary + Done */}
              <div className="grid grid-cols-2 gap-2 border-t border-line px-4 py-3 text-center text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-surface p-2">
                  <span className="block font-semibold text-muted">Items</span>
                  <span className="font-extrabold text-ink">{posCatalogSelection.length}</span>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <span className="block font-semibold text-muted">Base</span>
                  <span className="font-extrabold text-ink">{selectedCatalogTotal.toLocaleString()}</span>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <span className="block font-semibold text-muted">Discount</span>
                  <span className="font-extrabold text-danger">{selectedCatalogSaved > 0 ? `-${selectedCatalogSaved.toLocaleString()}` : '0'}</span>
                </div>
                <div className="rounded-lg bg-brand p-2 text-white">
                  <span className="block text-[10px] font-bold uppercase opacity-90">Final</span>
                  <span className="font-black">{selectedCatalogFinalTotal.toLocaleString()} {currency}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
                <Button
                  type="button"
                  onClick={() => {
                    if (selectedCatalogItems.length > 0) {
                      handleAddRepairsFromPriceList(selectedCatalogItems);
                    } else {
                      // audit A-P2-5: closing via Done with nothing selected
                      // must also clear picker state (no stale selection).
                      closePriceListPicker();
                    }
                  }}
                  disabled={posCatalogSelection.length === 0}
                  className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white transition hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Done ({posCatalogSelection.length})
                </Button>
              </div>

              {/* Anchored discount popup — same as Simple Ticket */}
              {posDiscountMenuFor && posDiscountAnchor && (
                <div
                  className="discount-popup fixed z-[80] w-44 rounded-2xl border border-line bg-white p-2 shadow-xl"
                  style={{ top: posDiscountAnchor.top, left: posDiscountAnchor.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2 px-1 pb-2">
                    <p className="text-xs font-extrabold text-ink">Discount</p>
                    <span className="max-w-[110px] truncate text-xs font-bold text-muted">
                      {catalogItems.find((item) => item.categoryKey === posDiscountMenuFor)?.name || ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DISCOUNT_OPTIONS.map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        onClick={() => {
                          updatePosCatalogDiscount(posDiscountMenuFor, pct);
                          setPosDiscountMenuFor(null);
                          setPosDiscountAnchor(null);
                        }}
                        className={`flex h-7 w-7 min-w-7 items-center justify-center rounded-full text-[10px] font-extrabold transition-all cursor-pointer active:scale-90 ${
                          (posCatalogDiscounts[posDiscountMenuFor] || 0) === pct
                            ? 'border border-brand bg-brand text-white'
                            : 'border border-line bg-white text-ink hover:border-brand hover:text-brand'
                        }`}
                        title={pct === 0 ? 'No discount' : `${pct}% off`}
                      >
                        {pct === 0 ? '0' : pct}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-line pt-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Custom %"
                      value={posCustomDiscountInput}
                      onChange={(e) => setPosCustomDiscountInput(e.target.value)}
                      onBlur={() => {
                        const value = Number(posCustomDiscountInput);
                        if (value >= 1 && value <= 100) {
                          updatePosCatalogDiscount(posDiscountMenuFor, value);
                          setPosCustomDiscountInput('');
                          setPosDiscountMenuFor(null);
                          setPosDiscountAnchor(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = Number(posCustomDiscountInput);
                          if (value >= 1 && value <= 100) {
                            updatePosCatalogDiscount(posDiscountMenuFor, value);
                            setPosCustomDiscountInput('');
                            setPosDiscountMenuFor(null);
                            setPosDiscountAnchor(null);
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-center font-mono text-xs font-bold text-ink outline-none"
                    />
                  </div>
                </div>
              )}
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
