
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIsIpad } from '../../hooks/useIsIpad';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import {
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Receipt,
  UserCheck,
  X,
} from 'lucide-react';
import { WorkOrder, Customer, SystemSettings, PartItem, WorkOrderLineItem, Technician, SelectedRepairItem } from '../../types';
import { ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { PriorityBadge } from '../common/PriorityBadge';
import { Button } from '../ui';
import { getActivePaymentMethods } from '../../data/seedData';
import { PrintableInvoiceModal } from '../common/PrintableInvoiceModal';
import { CustomerNotificationModal } from '../common/CustomerNotificationModal';
import { toast } from '../../lib/toast';
import { LITE_MODE } from '../../lib/lite';
import { confirmDialog } from '../common/ConfirmDialog';
import { normalizeText, INVENTORY_CATEGORY_GROUPS, repairSummaryOf, DIAGNOSTIC_FEE } from './posUtils';
import { PosConfirmPaymentModal, PosAddPartModal, PosDigitalReceiptModal, PosPriceListPickerModal } from './PosModals';
import { PosCheckoutPanel } from './PosCheckoutPanel';

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
  // Parts owner filter — APP (shop) stock (Ko Hein 2026-08-24: KZH removed)
  const [posOwner, setPosOwner] = useState<'ALL' | 'APP'>('ALL');
  // Add Inventory Part modal mode (Ko Hein 2026-08-11): Auto = exact device
  // + repair-category filtered suggestions; Manual = every part for the device.
  const [posPartMode, setPosPartMode] = useState<'auto' | 'manual' | 'external'>('auto');
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
  // External part (bought outside inventory) — Ko Hein 2026-08-11
  const [externalPartName, setExternalPartName] = useState('');
  const [externalPartCost, setExternalPartCost] = useState(0);
  const [externalPartSell, setExternalPartSell] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMobileCheckoutFullOpen, setIsMobileCheckoutFullOpen] = useState(false);
  // Left (ticket queue) panel collapse toggle
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);
  // POS queue date sort (Ko Hein 2026-08-11): Latest (newest first) / Oldest.
  const [posDateSort, setPosDateSort] = useState<'latest' | 'oldest'>('latest');

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

  // POS queue date sort (Ko Hein 2026-08-11): Latest = newest first, Oldest = oldest first.
  const sortedQueue = useMemo(() => {
    return [...filteredWorkOrders].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return posDateSort === 'oldest' ? tA - tB : tB - tA;
    });
  }, [filteredWorkOrders, posDateSort]);

  const selectedWo = sortedQueue.find((w) => w.id === selectedWoId) || sortedQueue[0] || null;

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
  const partsItems = useMemo(() => LITE_MODE ? [] as WorkOrderLineItem[] : displayLineItems.filter((li) => !li.isLabor && (li.partId || li.partName)), [displayLineItems]);
  // Parts value at SELLING price (Ko Hein 2026-08-11): repair price list
  // already includes parts, so the parts deduction uses the selling price.
  // Stock/expense bookkeeping (handleConsumeInventoryFromWorkOrder) still
  // uses purchase cost for the actual money out.
  const partsCostTotal = useMemo(() => partsItems.reduce((s, li) => s + (li.unitPrice || 0) * li.quantity, 0), [partsItems]);
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
        ? tech.commissionRateHardware ?? tech.commissionRate ?? 0
        : tech.commissionRateParts ?? tech.commissionRate ?? 0;
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
  const filteredInventoryParts = posPartMode === 'manual' ? manualInventoryParts : posPartMode === 'auto' ? autoInventoryParts : [];

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

  // External part — bought outside inventory, added without touching stock
  // (Ko Hein 2026-08-11). No partId => no stock deduction, no inventory-fund
  // debt; unitCost goes to expenses, unitPrice shows in the parts deduction.
  const handleAddExternalPartToWorkOrder = () => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const name = externalPartName.trim();
    const sell = Math.max(0, Number(externalPartSell) || 0);
    if (!name || sell <= 0) return;
    const qty = Math.max(1, Math.floor(Number(inventoryPartQty) || 1));
    const externalLine: WorkOrderLineItem = {
      id: `external-${Date.now()}`,
      description: name,
      partName: name,
      unitCost: Math.max(0, Number(externalPartCost) || 0),
      unitPrice: sell,
      quantity: qty,
      isLabor: false,
    };
    const existingLines = [...(pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? [])];
    commitLineItems([...existingLines, externalLine], { immediate: true });
    setExternalPartName('');
    setExternalPartCost(0);
    setExternalPartSell(0);
    setInventoryPartQty(1);
    setIsAddPartOpen(false);
  };

  const handleRemoveInventoryPartFromWorkOrder = (lineItemId: string) => {
    if (!selectedWo || !onSaveWorkOrder) return;

    // audit A-P2-3: remove from the pending draft when present.
    const sourceItems = pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? [];
    const removedItem = sourceItems.find((item) => item.id === lineItemId);
    const nextLineItems = sourceItems.filter((item) => item.id !== lineItemId);
    // Also drop the matching entry from selectedRepairs so the ticket doesn't
    // keep advertising a repair that is no longer on the invoice (Ko Hein
    // 2026-08-11: deleting a repair at checkout left it in selectedRepairs,
    // which other views/screens re-surface as if it were still on the ticket).
    const nextRepairs = (selectedWo.selectedRepairs || []).filter((r) => {
      if (!removedItem) return true;
      const name = String(removedItem.description || '').trim().toLowerCase();
      return !name || String(r.name || '').trim().toLowerCase() !== name;
    });
    commitLineItems(nextLineItems, { immediate: true, selectedRepairs: nextRepairs });
  };

  // Commit (or schedule) a full work-order save for the given line items.
  // immediate = discrete user action (add/remove part, discount change) —
  // saves right away. default = sheet-editor keystrokes, debounced so rapid
  // edits can't race each other's full-document PATCHes (audit A-P2-3).
  const commitLineItems = (
    nextLineItems: WorkOrder['lineItems'],
    opts: { immediate?: boolean; discountAmount?: number; depositAmount?: number; selectedRepairs?: SelectedRepairItem[] } = {}
  ) => {
    if (!selectedWo || !onSaveWorkOrderRef.current) return;
    const discount = opts.discountAmount !== undefined ? opts.discountAmount : selectedWo.discountAmount || 0;
    const deposit = opts.depositAmount !== undefined ? opts.depositAmount : selectedWo.depositAmount || 0;
    const totals = recalculateTotals(nextLineItems, discount, deposit, selectedWo.discountFormat);
    const updatedWo: WorkOrder = {
      ...selectedWo,
      lineItems: nextLineItems,
      ...(opts.selectedRepairs !== undefined ? { selectedRepairs: opts.selectedRepairs } : {}),
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
    // Keep selectedRepairs in sync so the ticket advertises exactly what is
    // on the invoice (Ko Hein 2026-08-11, mirrors the delete-side fix).
    const existingRepairs = selectedWo.selectedRepairs || [];
    const existingNames = new Set(existingRepairs.map((r) => String(r.name || '').trim().toLowerCase()));
    const addedRepairs = catalogItems
      .filter((item) => !existingNames.has(String(item.name || '').trim().toLowerCase()))
      .map((item) => ({
        id: item.categoryKey,
        name: item.name,
        basePrice: item.price,
        discountPercent: item.discountPercent || 0,
        finalPrice: Math.round(item.price * (1 - (item.discountPercent || 0) / 100)),
      }));
    // audit A-P2-3: append to the pending draft (if any) and save once.
    const nextLineItems = [...(pendingWoRef.current?.lineItems ?? selectedWo.lineItems ?? []), ...newLines];
    commitLineItems(nextLineItems, {
      immediate: true,
      selectedRepairs: [...existingRepairs, ...addedRepairs],
    });
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
    const diagFee = DIAGNOSTIC_FEE; // standard diagnostic inspection fee (shared with checkout panel)
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
      <PosCheckoutPanel
        selectedWo={selectedWo}
        currency={currency}
        posOwner={posOwner}
        taxRate={taxRate}
        laborItems={laborItems}
        partsItems={partsItems}
        perItemDiscountTotal={perItemDiscountTotal}
        partsCostTotal={partsCostTotal}
        estCommission={estCommission}
        activePaymentMethods={activePaymentMethods}
        selectedMethodConfig={selectedMethodConfig}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        cashTendered={cashTendered}
        setCashTendered={setCashTendered}
        splitPayments={splitPayments}
        setSplitPayments={setSplitPayments}
        copiedAccount={copiedAccount}
        setCopiedAccount={setCopiedAccount}
        invoiceDiscountInput={invoiceDiscountInput}
        setInvoiceDiscountInput={setInvoiceDiscountInput}
        customRepairName={customRepairName}
        setCustomRepairName={setCustomRepairName}
        customRepairPrice={customRepairPrice}
        setCustomRepairPrice={setCustomRepairPrice}
        customRepairQty={customRepairQty}
        setCustomRepairQty={setCustomRepairQty}
        isAddCustomRepairOpen={isAddCustomRepairOpen}
        setIsAddCustomRepairOpen={setIsAddCustomRepairOpen}
        isSheetEditMode={isSheetEditMode}
        setIsSheetEditMode={setIsSheetEditMode}
        isPaymentShort={isPaymentShort}
        isProcessingPayment={isProcessingPayment}
        cashInputRef={cashInputRef}
        technicians={technicians}
        handleUpdateLineItem={handleUpdateLineItem}
        handleUpdateInvoiceDiscount={handleUpdateInvoiceDiscount}
        handleAddCustomRepair={handleAddCustomRepair}
        handleApplyDiagnosticFeeOnly={handleApplyDiagnosticFeeOnly}
        handleRemoveInventoryPartFromWorkOrder={handleRemoveInventoryPartFromWorkOrder}
        setIsAddPartOpen={setIsAddPartOpen}
        setIsAddRepairFromPriceListOpen={setIsAddRepairFromPriceListOpen}
        setIsConfirmOpen={setIsConfirmOpen}
        setIsInvoiceModalOpen={setIsInvoiceModalOpen}
        setPrintableInvoiceWo={setPrintableInvoiceWo}
      />
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
        <div className={`bg-white border border-line rounded-xl p-2.5 space-y-2 shadow-xs shrink-0 transition-[width] duration-200 ${
          isQueueCollapsed ? 'md:w-32' : 'md:w-[340px]'
        } ${isIpad ? 'md:flex md:h-full md:flex-col md:min-h-0' : 'md:h-full md:self-stretch md:flex md:flex-col md:min-h-0 md:overflow-hidden'}`}>
          <div className="flex justify-between items-center border-b border-line pb-2">
            {!isQueueCollapsed ? (
              <>
                <h2 className="font-bold text-ink text-xs">Ready to Checkout ({filteredWorkOrders.length})</h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Date sort mini control (Ko Hein 2026-08-11) */}
                  <div className="flex items-center rounded-md border border-line bg-white overflow-hidden">
                    {(['latest', 'oldest'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPosDateSort(s)}
                        aria-pressed={posDateSort === s}
                        title={s === 'latest' ? 'Newest tickets first' : 'Oldest tickets first'}
                        className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide transition-colors cursor-pointer ${
                          posDateSort === s ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-surface'
                        }`}
                      >
                        {s === 'latest' ? 'New' : 'Old'}
                      </button>
                    ))}
                  </div>
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
          <div className="space-y-2 overflow-y-auto pr-1 min-h-[360px] md:min-h-0 md:flex-1">
            {filteredWorkOrders.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center text-muted space-y-2 bg-surface rounded-xl border border-dashed border-line-strong my-4">
                <CheckCircle2 className="w-8 h-8 mx-auto text-success opacity-70" />
                <p className="font-extrabold text-ink text-xs">No Devices with Finished Diagnostics</p>
                <p className="text-xs text-muted">Appears here automatically after diagnostics.</p>
              </div>
            ) : (
              sortedQueue.map((wo) => {
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
                    className={`group cursor-pointer rounded-lg border bg-white p-2.5 shadow-2xs transition-all hover:shadow-md hover:border-ink/30 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                      isSelected ? 'border-ink ring-2 ring-ink/10 bg-surface' : 'border-line'
                    }`}
                  >
                    {/* Top row: order # + priority */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-[11px] font-black text-ink truncate">{wo.orderNumber}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <PriorityBadge priority={wo.priority} size="xs" />
                        <span aria-live="polite" className={`text-[10px] font-black px-1.5 py-px rounded uppercase ${
                          wo.isPaid ? 'bg-success text-white' : 'bg-warning text-white'
                        }`}>
                          {wo.isPaid ? 'PAID' : 'DUE'}
                        </span>
                      </div>
                    </div>

                    {/* Device + customer + open date (Ko Hein 2026-08-11) */}
                    <p className="mt-1.5 text-xs font-extrabold text-ink truncate">{wo.deviceModel}</p>
                    <p className="text-[11px] text-muted truncate">{wo.customerName} · {wo.customerPhone}</p>
                    <p className="text-[10px] font-mono font-bold text-muted/80">
                      {new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

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
            <div className="space-y-1.5 overflow-y-auto pr-1 min-h-[360px] md:min-h-0 md:flex-1">
              {sortedQueue.map((wo) => {
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
                    <span className={`text-[10px] font-bold leading-tight truncate w-full ${isSel ? 'text-white/90' : 'text-ink'}`}>
                      {wo.deviceModel}
                    </span>
                    <span className={`text-[10px] font-black leading-tight ${isSel ? 'text-white/80' : 'text-muted'}`}>
                      {wo.isPaid ? '✓ PAID' : '· DUE'} · {wo.totalAmount.toLocaleString()}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Invoice & Terminal Checkout (8 cols) */}
        <div className={`hidden md:block flex-1 min-w-0 bg-white border border-line rounded-xl p-3 pb-24 md:pb-3 space-y-3 shadow-xs md:h-full md:min-h-0 md:overflow-y-auto ${isIpad ? 'md:flex md:flex-col' : ''}`}>
                    {renderCheckoutPanel()}
        </div>
      </div>

      {/* Mobile: full POS checkout popup — Pay tap opens the whole checkout (Ko Hein) */}
      {isMobileCheckoutFullOpen && selectedWo && (
        <div className="fixed inset-0 z-50 md:hidden bg-white flex flex-col pt-[calc(env(safe-area-inset-top)+8px)]">
          <div className="sticky top-0 z-10 flex items-center justify-between px-3 pt-1.5 shrink-0">
            <Button
              type="button"
              onClick={() => setIsMobileCheckoutFullOpen(false)}
              className="text-xs font-extrabold text-muted hover:text-ink px-2 py-1.5 rounded-lg hover:bg-surface transition-colors cursor-pointer"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setIsMobileCheckoutFullOpen(false)}
              aria-label="Close checkout"
              className="text-muted hover:text-ink p-3 rounded transition-colors cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {/* Scrollable content — Pay button stays pinned at the bottom */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            {renderCheckoutPanel()}
          </div>
          {/* Pinned Pay button (Ko Hein 2026-08-11): always reachable, sheet scrolls above */}
          {selectedWo && (
            <div className="shrink-0 border-t border-line bg-white/95 backdrop-blur-sm px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-raised-top">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 shrink-0">
                  <p className="text-xs font-bold text-muted uppercase tracking-wide">Amount Due</p>
                  <p className="font-mono font-black text-brand text-base leading-tight">{selectedWo.totalAmount.toLocaleString()} {currency}</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isProcessingPayment || isPaymentShort || selectedWo.isPaid}
                  variant="success"
                  className="flex-1 max-w-[240px] py-3 hover:bg-success/90"
                  title="You can backdate the checkout date in the confirm step."
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span className="truncate">Pay & Print Receipt</span>
                </Button>
              </div>
            </div>
          )}
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
              title="You can backdate the checkout date in the confirm step."
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="truncate hidden sm:inline">Pay & Print Receipt</span>
              <span className="sm:hidden">Pay</span>
            </Button>
          </div>
        </div>
      )}

      {/* Payment Confirmation */}
      <PosConfirmPaymentModal
        isOpen={isConfirmOpen}
        workOrder={selectedWo}
        paymentMethod={paymentMethod}
        checkoutDate={checkoutDate}
        onCheckoutDateChange={setCheckoutDate}
        cashTendered={cashTendered}
        currency={currency}
        isProcessingPayment={isProcessingPayment}
        isPaymentShort={isPaymentShort}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          handleProcessPayment();
        }}
      />

      {/* Add Inventory Part — beautiful picker popup (Ko Hein) */}
      <PosAddPartModal
        isOpen={isAddPartOpen}
        parts={parts}
        deviceModel={selectedWo?.deviceModel || ''}
        owner={posOwner}
        onOwnerChange={setPosOwner}
        mode={posPartMode}
        onModeChange={setPosPartMode}
        search={posPartSearch}
        onSearchChange={setPosPartSearch}
        filteredParts={filteredInventoryParts}
        selectedPartId={inventoryPartId}
        onSelectPartId={setInventoryPartId}
        qty={inventoryPartQty}
        onQtyChange={setInventoryPartQty}
        onAdd={() => {
          handleAddInventoryPartToWorkOrder();
          setIsAddPartOpen(false);
        }}
        onClose={() => setIsAddPartOpen(false)}
        externalName={externalPartName}
        onExternalNameChange={setExternalPartName}
        externalCost={externalPartCost}
        onExternalCostChange={setExternalPartCost}
        externalSell={externalPartSell}
        onExternalSellChange={setExternalPartSell}
        onAddExternal={handleAddExternalPartToWorkOrder}
      />

      {/* Digital Receipt Modal */}
      <PosDigitalReceiptModal
        isOpen={isReceiptModalOpen}
        workOrder={selectedWo}
        paymentMethod={paymentMethod}
        cashTendered={cashTendered}
        systemSettings={systemSettings}
        onClose={() => setIsReceiptModalOpen(false)}
        onFullInvoice={() => {
          setIsReceiptModalOpen(false);
          setPrintableInvoiceWo(selectedWo);
          setIsInvoiceModalOpen(true);
        }}
      />

      {/* Price List Repair Picker — intake-style modal (Ko Hein 2026-08-10) */}
      <PosPriceListPickerModal
        isOpen={isAddRepairFromPriceListOpen}
        workOrder={selectedWo}
        priceCatalog={priceCatalog}
        selection={posCatalogSelection}
        onSelectionChange={setPosCatalogSelection}
        discounts={posCatalogDiscounts}
        onDiscountChange={updatePosCatalogDiscount}
        search={priceSearchQuery}
        onSearchChange={setPriceSearchQuery}
        groupFilter={selectedGroupFilter}
        onGroupFilterChange={setSelectedGroupFilter}
        discountMenuFor={posDiscountMenuFor}
        setDiscountMenuFor={setPosDiscountMenuFor}
        discountAnchor={posDiscountAnchor}
        setDiscountAnchor={setPosDiscountAnchor}
        customDiscountInput={posCustomDiscountInput}
        setCustomDiscountInput={setPosCustomDiscountInput}
        currency={currency}
        onDone={(items) => {
          handleAddRepairsFromPriceList(items);
          closePriceListPicker();
        }}
        onClose={closePriceListPicker}
      />

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
