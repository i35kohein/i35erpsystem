import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { ChevronDown, Search, BadgePercent, ShieldCheck, Camera, X, Sparkles, CheckCircle2, Printer, List } from 'lucide-react';
import { WorkOrder, DiagnosticItemResult, AppleDeviceCategory, SelectedRepairItem, SystemSettings, CustomerType, RepairPriority, Technician } from '../../types';
import { toast } from '../../lib/toast';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { DIAGNOSTIC_NAMES, WARRANTY_OPTIONS, getAvailableColorsForModel, getRealisticColorStyle } from './deviceData';
import { nextOrderNumber as nextOrderNumberFrom, uniqueId } from '../../utils/orderNumbers';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { compressImageFile } from '../../lib/utils';
import { confirmDialog } from '../common/ConfirmDialog';
import { shortWarranty } from '../pos/posUtils';

const CameraQrScannerModal = lazy(() => import('../common/CameraQrScannerModal').then((m) => ({ default: m.CameraQrScannerModal })));

interface SimpleTicketCreatorProps {
  workOrders: WorkOrder[];
  customers?: Array<{ id: string; name: string; phone: string; type?: string }>;
  technicians?: Technician[];
  priceCatalog?: ModelRepairPrice[];
  systemSettings?: SystemSettings;
  onSaveWorkOrder: (wo: WorkOrder) => void;
  /** Open the Sticker Tag Voucher printer (same as New Intake Ticket) */
  onSelectPrintTag?: (wo: WorkOrder) => void;
  /** Jump to another tab (e.g. Work Intake) after saving (Ko Hein 2026-08-10) */
  onNavigateToTab?: (tab: string) => void;
  /** Open the AI diagnostic assistant (same as full Create Ticket) */
  onOpenAiAssistant?: () => void;
}

interface FormState {
  name: string;
  phone: string;
  model: string;
  color: string;
  imei: string;
  serial: string; // audit B-P2: serial kept separate from IMEI
  date: string;
  error: string;
  repairs: SelectedRepairItem[];
  passcode: string;
  reply: string;
  checks: { status: 'N/A' | 'Pass' | 'Fail'; note: string }[];
  // Full-form parity (Ko Hein 2026-08-11): the simple form now captures the
  // same fields as Create Ticket — customer type, town, priority, service type,
  // warranty, photos, scanner.
  customerType: CustomerType;
  town: string;
  priority: RepairPriority;
  serviceType: 'Standard Modular' | 'Micro-Soldering' | 'B2B Mail-In';
  warrantyDays: number;
  warrantyLabel: string;
  photos: string[];
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', model: '', color: '', imei: '', serial: '',
  date: new Date().toISOString().slice(0, 10),
  error: '', repairs: [], passcode: '', reply: '',
  checks: DIAGNOSTIC_NAMES.map(() => ({ status: 'N/A' as const, note: '' })),
  customerType: 'Retail',
  town: '',
  priority: 'Normal',
  serviceType: 'Standard Modular',
  warrantyDays: 90,
  warrantyLabel: '90 Days Standard Warranty',
  photos: [],
};

/** Popup-trigger rows styled exactly like the text inputs so all rows align. */
const boxBtnCls =
  'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-left text-sm text-ink transition-colors hover:border-brand/50 ';

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const SimpleTicketCreator: React.FC<SimpleTicketCreatorProps> = ({
  workOrders,
  customers = [],
  technicians = [],
  priceCatalog = [],
  systemSettings,
  onSaveWorkOrder,
  onSelectPrintTag,
  onNavigateToTab,
  onOpenAiAssistant,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [lastSavedWo, setLastSavedWo] = useState<WorkOrder | null>(null);
  // Full success screen after save (Ko Hein 2026-08-11) — same as Create
  // Ticket: Print / Work Intake / Create Another.
  const [showSuccess, setShowSuccess] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  // Same sequential order-number scheme as New Intake Ticket (max existing + 1,
  // prefix from Settings) so the two forms never collide or duplicate numbers.
  // Shared module-scoped helper (audit B P2): strict WO-YYYY-NNNN regex + an
  // issued-numbers Set that survives same-tick double creates.
  const ticketPrefix = systemSettings?.ticketPrefix || 'WO-';
  const nextOrderNumber = (): string => nextOrderNumberFrom(workOrders, ticketPrefix);
  // Reactive preview: recomputes once workOrders finish loading (useState would
  // freeze the initial empty-list value → off-by-one preview number).
  const previewNumber = useMemo(nextOrderNumber, [workOrders, ticketPrefix]);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isRepairsOpen, setIsRepairsOpen] = useState(false);
  const [repairSearch, setRepairSearch] = useState('');
  const [repairGroup, setRepairGroup] = useState('ALL');
  const [discountMenuFor, setDiscountMenuFor] = useState<string | null>(null);
  const [discountAnchor, setDiscountAnchor] = useState<{ top: number; left: number } | null>(null);
  const [customDiscountInput, setCustomDiscountInput] = useState('');
  // Full-form parity (Ko Hein 2026-08-11): camera scanner + intake photos.
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const catalogItemsForModel = getModelPriceCatalogItems(form.model, priceCatalog);
  // Single filter pass for the repair list (audit area-B): avoids running the
  // predicate twice per render and keeps the empty-state check in sync.
  const visibleRepairItems = useMemo(
    () =>
      catalogItemsForModel.filter((item) => {
        const matchesSearch =
          !repairSearch ||
          item.name.toLowerCase().includes(repairSearch.toLowerCase()) ||
          item.group.toLowerCase().includes(repairSearch.toLowerCase());
        const matchesGroup = repairGroup === 'ALL' || item.group === repairGroup;
        return matchesSearch && matchesGroup;
      }),
    [catalogItemsForModel, repairSearch, repairGroup]
  );

  const updateRepairDiscount = (repairId: string, newDiscountPercent: number) => {
    setForm((f) => ({
      ...f,
      repairs: f.repairs.map((item) => {
        if (item.id === repairId) {
          const clamped = Math.min(100, Math.max(0, Number.isFinite(newDiscountPercent) ? newDiscountPercent : 0));
          return { ...item, discountPercent: clamped, finalPrice: Math.round(item.basePrice * (1 - clamped / 100)) };
        }
        return item;
      }),
    }));
  };

  const baseTotal = form.repairs.reduce((sum, r) => sum + r.basePrice, 0);
  const finalEstimate = form.repairs.reduce((sum, r) => sum + r.finalPrice, 0);
  const savedAmount = Math.max(0, baseTotal - finalEstimate);
  // Sales tax applied at intake (Ko Hein 2026-08-11): totalAmount includes
  // tax so POS/Finance agree — the old code stored taxAmount: 0 and the POS
  // summary showed the tax rate but a 0 amount.
  const taxRate = ((systemSettings?.taxPercentage ?? 6) || 0) / 100;
  const taxAmountFor = (net: number) => Math.round(net * taxRate);
  // Currency token (audit area-B): same source as the success screen below.
  const currency = systemSettings?.currencySymbol || 'MMK';

  const closeRepairs = () => { setIsRepairsOpen(false); setRepairSearch(''); setRepairGroup('ALL'); };

  const toggleRepair = (item: ModelRepairCatalogItem) => {
    setForm((f) => {
      const exists = f.repairs.some((r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase());
      if (exists) {
        return {
          ...f,
          repairs: f.repairs.filter((r) => r.id !== item.id && r.name.toLowerCase() !== item.name.toLowerCase()),
        };
      }
      // Settings-driven default discount (Ko Hein 2026-08-11):
      // defaultLaborDiscountPercent now pre-fills the per-repair discount.
      const dflt = Math.min(50, Math.max(0, Number(systemSettings?.defaultLaborDiscountPercent) || 0));
      const basePrice = item.price;
      return {
        ...f,
        repairs: [
          ...f.repairs,
          {
            id: item.id,
            name: item.name,
            basePrice,
            discountPercent: dflt,
            finalPrice: dflt > 0 ? Math.round(basePrice * (1 - dflt / 100)) : basePrice,
          },
        ],
      };
    });
  };

  const [matchedCustomer, setMatchedCustomer] = useState<string | null>(null);
  // Settings-driven defaults (Ko Hein 2026-08-11): defaultTechnicianId
  // auto-assigns on NEW tickets (edit keeps its own tech).
  const defaultTech = systemSettings?.defaultTechnicianId
    ? technicians.find((t) => t.id === systemSettings.defaultTechnicianId)
    : undefined;
  const defaultTechId = defaultTech?.id || '';
  const defaultTechName = defaultTech?.name || '';

  const handlePhoneChange = (phone: string) => {
    setForm((f) => ({ ...f, phone }));
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 7) {
      const normalize = (p: string) => (p || '').replace(/\D/g, '');
      const exact = customers.find((c) => normalize(c.phone) === digits);
      const found = exact || (digits.length >= 9
        ? customers.find((c) => normalize(c.phone).slice(-9) === digits.slice(-9))
        : undefined);
      if (found) {
        setMatchedCustomer(found.name);
        setForm((f) => ({ ...f, name: found.name }));
      } else {
        setMatchedCustomer(null);
      }
    } else {
      setMatchedCustomer(null);
    }
  };

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setCheck = (idx: number, patch: Partial<{ status: 'N/A' | 'Pass' | 'Fail'; note: string }>) =>
    setForm((f) => ({
      ...f,
      checks: f.checks.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));

  // 3-state cycle: N/A → Pass → Fail → N/A (Ko Hein)
  const cycleCheck = (idx: number) => {
    setForm((f) => ({
      ...f,
      checks: f.checks.map((c, i) => {
        if (i !== idx) return c;
        const next = c.status === 'N/A' ? 'Pass' : c.status === 'Pass' ? 'Fail' : 'N/A';
        return { ...c, status: next };
      }),
    }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
    setMatchedCustomer(null);
    setShowSuccess(false);
  };

  // Esc closes any open picker (audit area-B): file-local handler, no shared shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isColorOpen) { setIsColorOpen(false); return; }
      if (isRepairsOpen) { setIsRepairsOpen(false); setRepairSearch(''); setRepairGroup('ALL'); return; }
      if (discountMenuFor) { setDiscountMenuFor(null); setDiscountAnchor(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isColorOpen, isRepairsOpen, discountMenuFor]);

  // Load an existing ticket into this form for editing (Ko Hein 2026-08-10).
  const loadTicket = (wo: WorkOrder) => {
    const diag = wo.beforeDiagnostics || [];
    setForm({
      name: wo.customerName || '',
      phone: wo.customerPhone || '',
      model: wo.deviceModel || '',
      color: wo.deviceColor || '',
      // Audit B-P2: keep IMEI and serial SEPARATE — the old code stuffed the
      // serial into the imei field, so editing a serial-only ticket wrote the
      // serial into imei (and vice-versa), corrupting both identifiers.
      imei: wo.imei || '',
      serial: wo.serialNumber || '',
      date: (wo.createdAt || new Date().toISOString()).slice(0, 10),
      error: '',
      repairs: wo.selectedRepairs || [],
      passcode: wo.passcode || '',
      reply: wo.symptomsReported || '',
      checks: DIAGNOSTIC_NAMES.map((_name, i) => {
        const d = diag[i];
        return {
          status: d?.status === 'Pass' || d?.status === 'Fail' ? (d.status as 'Pass' | 'Fail') : 'N/A',
          note: d?.note || '',
        };
      }),
      // Full-form parity fields (Ko Hein 2026-08-11): preserved on edit.
      customerType: wo.customerType || 'Retail',
      town: wo.customerAddress || '',
      priority: wo.priority || 'Normal',
      serviceType: wo.serviceType || 'Standard Modular',
      warrantyDays: wo.warrantyDays ?? systemSettings?.defaultWarrantyDays ?? 90,
      warrantyLabel: wo.warrantyLabel || `${wo.warrantyDays ?? systemSettings?.defaultWarrantyDays ?? 90} Days Standard Warranty`,
      photos: wo.intakePhotos || [],
    });
    setEditingId(wo.id);
  };

  // All Pass / All N/A for the 21-point checklist (Ko Hein 2026-08-10)
  const setAllChecks = (status: 'Pass' | 'N/A') =>
    setForm((f) => ({
      ...f,
      checks: f.checks.map((c) => ({ ...c, status, note: status === 'N/A' ? '' : c.note })),
    }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Double-submit guard (audit B-P2): a same-tick second submit would create
    // a duplicate ticket (the order-number Set only helps after the first save
    // commits). The ref is checked synchronously and stays locked for a second
    // so a rapid double-click / Enter+click can't fire twice.
    if (submittingRef.current || isSubmitting) {
      toast('Save in progress — please wait.', 'info', 'Submitting');
      return;
    }
    // Color is required (Ko Hein 2026-08-10): block save + open the color picker.
    if (!form.color.trim()) {
      toast('Select a device color to save the ticket.', 'error', 'Color Required');
      setIsColorOpen(true);
      return;
    }
    // Settings-driven gates (Ko Hein 2026-08-11): requirePasscodeIntake now
    // actually enforces the simple intake form.
    if (systemSettings?.requirePasscodeIntake && !form.passcode.trim()) {
      toast('Device passcode is required (Settings > Intake).', 'error', 'Passcode Required');
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
    const diagnostics: DiagnosticItemResult[] = DIAGNOSTIC_NAMES.map((name, i) => ({
      id: `simple-diag-${uniqueId('diag')}-${i}`,
      name,
      status: form.checks[i].status as DiagnosticItemResult['status'],
      note: form.checks[i].note || undefined,
    }));

    const modelLower = (form.model || '').toLowerCase();
    const deviceCategory: AppleDeviceCategory = /ipad/.test(modelLower)
      ? 'iPad'
      : /mac/.test(modelLower)
      ? 'MacBook'
      : /watch/.test(modelLower)
      ? 'AppleWatch'
      : /pod|buds/.test(modelLower)
      ? 'AirPods'
      : 'iPhone';

    // EDIT MODE (audit B-1): build from the EXISTING ticket so untouched
    // fields survive — workflow status, payment, QA checklists, after
    // diagnostics, warranty, photos, repair logs, completedAt, technician
    // assignment, customer linkage, deposit. The old code rebuilt the whole
    // object from hardcoded defaults, silently erasing all of it on save.
    const existing = editingId ? workOrders.find((w) => w.id === editingId) : null;
    // Keep part lines + any labor lines NOT represented in the form (e.g. POS
    // custom repairs) — only labor lines matching the form's repairs are rebuilt.
    const formLaborNames = new Set(form.repairs.map((r) => String(r.name || '').toLowerCase().trim()));
    const preservedLines = (existing?.lineItems || []).filter(
      (li) => !li.isLabor || !formLaborNames.has(String(li.description || '').toLowerCase().trim())
    );
    const newLaborLines: WorkOrder['lineItems'] = form.repairs.map((r) => ({
      id: uniqueId('li'),
      description: r.name,
      // Audit (Ko Hein 2026-08-11): no fabricated 50% cost on labor lines —
      // real parts cost enters via POS when the actual part used is added.
      unitCost: 0,
      unitPrice: r.basePrice,
      quantity: 1,
      isLabor: true,
      lineItemDiscountPercent: r.discountPercent || undefined,
    }));
    // If the form didn't change the repairs, keep the stored financial totals
    // (they may include POS updates / parts / discounts). Only recompute the
    // labor estimate when the repair list actually changed.
    const repairsChanged =
      JSON.stringify((existing?.selectedRepairs || []).map((r) => [r.name, r.basePrice, r.discountPercent])) !==
      JSON.stringify(form.repairs.map((r) => [r.name, r.basePrice, r.discountPercent]));
    const laborSubtotal = [...preservedLines, ...newLaborLines]
      .filter((li) => li.isLabor)
      .reduce((s, li) => s + (Number(li.unitPrice) || 0) * (Number(li.quantity) || 1), 0);
    const laborFinal = [...preservedLines, ...newLaborLines]
      .filter((li) => li.isLabor)
      .reduce(
        (s, li) =>
          s +
          (Number(li.unitPrice) || 0) *
            (1 - (Number(li.lineItemDiscountPercent) || 0) / 100) *
            (Number(li.quantity) || 1),
        0
      );

    const base: WorkOrder = {
      ...(existing || ({} as WorkOrder)), // preserve everything not edited below
      id: editingId || uniqueId('wo'),
      orderNumber: editingId
        ? (workOrders.find((w) => w.id === editingId)?.orderNumber || nextOrderNumber())
        : nextOrderNumber(),
      customerId: existing?.customerId || '',
      customerName: form.name.trim() || 'Walk-in Customer',
      customerPhone: form.phone.trim(),
      customerEmail: existing?.customerEmail || '',
      customerAddress: form.town.trim() || existing?.customerAddress,
      customerType: form.customerType,
      deviceCategory,
      deviceModel: form.model.trim() || 'Unknown Model',
      serialNumber: form.serial.trim() || existing?.serialNumber || '',
      imei: form.imei.trim() || existing?.imei || undefined,
      deviceColor: form.color.trim(),
      passcode: form.passcode.trim(),
      status: existing?.status || 'Receive',
      priority: form.priority,
      assignedTechId: existing?.assignedTechId || (existing ? '' : defaultTechId),
      assignedTechName: existing?.assignedTechName || (existing ? '' : defaultTechName),
      serviceType: form.serviceType,
      beforeDiagnostics: diagnostics,
      symptomsReported: [form.error.trim(), form.reply.trim()].filter(Boolean).join(' — '),
      selectedRepairs: form.repairs,
      lineItems: [...preservedLines, ...newLaborLines],
      // Financials: keep stored totals unless the repair list changed; parts
      // lines are preserved but never added to the customer total (audit B-1).
      // Tax is included in totalAmount (Ko Hein 2026-08-11).
      subtotal: repairsChanged ? laborSubtotal : (existing?.subtotal ?? laborSubtotal),
      depositAmount: existing?.depositAmount || 0,
      discountAmount: existing?.discountAmount || 0,
      discountFormat: existing?.discountFormat || 'new',
      taxAmount: repairsChanged ? taxAmountFor(laborFinal) : (existing?.taxAmount ?? taxAmountFor(laborFinal)),
      totalAmount: repairsChanged ? laborFinal + taxAmountFor(laborFinal) : (existing?.totalAmount ?? laborFinal + taxAmountFor(laborFinal)),
      intakeChecklist: existing?.intakeChecklist || {
        powerOn: false,
        screenDisplay: false,
        touchGrid: false,
        faceIdOrTouchId: false,
        trueTonePresent: false,
        frontCamera: false,
        rearCamera: false,
        microphones: false,
        speakers: false,
        wifiBluetooth: false,
        cellularSignal: false,
        wirelessCharging: false,
        liquidIndicatorTriggered: false,
        physicalDamageNotes: '',
      },
      warrantyDays: form.warrantyDays,
      warrantyLabel: form.warrantyLabel,
      intakePhotos: form.photos,
      estimatedCompletion: existing?.estimatedCompletion,
      isPaid: existing?.isPaid || false,
      paidAmount: existing?.paidAmount,
      paymentMethod: existing?.paymentMethod,
      createdAt: editingId ? (workOrders.find((w) => w.id === editingId)?.createdAt || now) : form.date ? `${form.date}T09:00:00.000Z` : now,
      updatedAt: now,
    };
    (base as any).simpleTicket = true;

    onSaveWorkOrder(base);
    setLastSavedWo(base);
    setSavedFlash(true);
    // Success screen (Ko Hein 2026-08-11): same choice as Create Ticket —
    // Print / Work Intake / Create Another.
    setShowSuccess(true);
    // Same as New Intake Ticket Registration: print goes through the Sticker Tag
    // Voucher modal (onSelectPrintTag) — no raw window.print (Ko Hein 2026-08-10).
    if (!editingId) resetForm();
    } finally {
      // Release the submit guard after a short window — long enough to swallow
      // rapid double-clicks/Enter+click, short enough not to block the next save.
      window.setTimeout(() => {
        submittingRef.current = false;
        setIsSubmitting(false);
      }, 1000);
    }
  };

  const checkedCount = form.checks.filter((c) => c.status === 'Pass').length;
  const editTarget = editingId ? workOrders.find((w) => w.id === editingId) : null;
  // Recent tickets available for editing (newest first).
  const editableTickets = useMemo(
    () =>
      [...workOrders]
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 30),
    [workOrders]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Success screen (Ko Hein 2026-08-11) — mirrors Create Ticket: after
          save offer Print / Work Intake / Create Another. */}
      {showSuccess && lastSavedWo && (
        <div className="bg-white border border-line-strong rounded-2xl p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 bg-success/10 text-success-deep rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-sm font-extrabold text-brand px-3 py-1 bg-brand-soft rounded-full">
              {lastSavedWo.orderNumber}
            </span>
            <h1 className="text-2xl font-black text-ink pt-2">
              {editingId ? 'Repair Ticket Successfully Updated!' : 'Repair Ticket Successfully Created!'}
            </h1>
            <p className="text-xs text-muted">
              {editingId ? 'Updated' : 'Registered'} {lastSavedWo.deviceModel} for {lastSavedWo.customerName}
            </p>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-line-strong text-left text-xs space-y-3 max-w-md mx-auto">
            <div className="flex justify-between items-center">
              <span className="text-muted">Customer Phone:</span>
              <span className="font-semibold text-ink">{lastSavedWo.customerPhone || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Device:</span>
              <span className="font-semibold text-ink">{lastSavedWo.deviceModel} · {lastSavedWo.deviceColor || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Warranty:</span>
              <span className="font-semibold text-ink">{lastSavedWo.warrantyLabel || `${lastSavedWo.warrantyDays || 90} Days Standard Warranty`}</span>
            </div>
            <div className="flex justify-between items-center border-t border-line-strong pt-2.5">
              <span className="text-muted font-bold">Total Estimate:</span>
              <span className="font-black text-brand text-base">{(lastSavedWo.totalAmount || 0).toLocaleString()} {systemSettings?.currencySymbol || 'MMK'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!editingId && onSelectPrintTag && (
              <button
                type="button"
                onClick={() => onSelectPrintTag(lastSavedWo)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-5 py-2.5 text-xs font-black text-ink transition hover:bg-surface cursor-pointer"
              >
                <Printer className="w-4 h-4 text-brand shrink-0" />
                <span className="truncate">Print Sticker Tag Voucher</span>
              </button>
            )}

            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('intake')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-white transition hover:bg-brand-deep cursor-pointer"
              >
                <List className="w-4 h-4 shrink-0" />
                <span className="truncate">{editingId ? 'Back to Work Intake' : 'View in Work Orders List'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto rounded-xl border border-line-strong bg-white px-5 py-2.5 text-xs font-black text-ink transition hover:bg-surface cursor-pointer"
            >
              {editingId ? 'Discard Changes' : '+ Create Another Ticket'}
            </button>
          </div>
        </div>
      )}

      {!showSuccess && (<>
      {/* Edit existing ticket — reload it into this form (Ko Hein 2026-08-10) */}
      {editableTickets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={editingId || ''}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) { resetForm(); return; }
              const wo = workOrders.find((w) => w.id === id);
              if (wo) loadTicket(wo);
            }}
            aria-label="Edit existing ticket"
            className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink outline-none transition-colors hover:border-brand/40"
          >
            <option value="">Edit existing ticket…</option>
            {editableTickets.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.orderNumber || wo.id} · {wo.deviceModel || 'Unknown'} · {wo.customerName || '—'}
              </option>
            ))}
          </select>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-line cursor-pointer"
            >
              + New Ticket
            </button>
          )}
        </div>
      )}
      {/* Paper sheet */}
      <div className="print:border-0 print:shadow-none overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              {editingId ? 'Editing simple ticket' : 'Service intake form'}
            </p>
          </div>
          <span className="shrink-0 font-mono text-sm font-black tracking-tight text-brand">
            {editingId ? editTarget?.orderNumber || previewNumber : previewNumber}
          </span>

        </header>

        <form onSubmit={handleSubmit} onReset={resetForm} className="px-4 py-3.5 sm:px-7 sm:py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <div className="flex flex-col divide-y divide-line">
            {/* LEFT header — mirrors the checklist header (Ko Hein) */}
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Customer Data</span>
              <span className="shrink-0 font-mono text-[11px] font-black text-brand">{form.repairs.length > 0 ? `${form.repairs.length} repair${form.repairs.length > 1 ? 's' : ''}` : '—'}</span>
            </div>
            {/* Phone */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                inputMode="tel"
                placeholder="09"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted"
              />
              {matchedCustomer && <span className="shrink-0 text-[10px] font-black text-success-deep">✓ {matchedCustomer}</span>}
            </label>
            {/* Name */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Name</span>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                placeholder="Customer name"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted"
              />
            </label>
            {/* Customer Type — full-form parity (Ko Hein 2026-08-11) */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Type</span>
              <select
                value={form.customerType}
                onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value as CustomerType }))}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors"
              >
                <option value="Retail">Retail</option>
                <option value="B2B Corporate">B2B Corporate</option>
                <option value="Wholesale Mail-In">Wholesale Mail-In</option>
              </select>
            </label>
            {/* Town / Address — full-form parity (Ko Hein 2026-08-11) */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Town</span>
              <input
                value={form.town}
                onChange={(e) => set('town', e.target.value)}
                placeholder="Customer town / address"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted"
              />
            </label>
            {/* Model → popup */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Model</span>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className={boxBtnCls}
              >
                <span className="truncate">{form.model || <span className="text-muted/70">Choose model…</span>}</span>
                <ChevronDown className="print:hidden h-4 w-4 shrink-0 text-muted" />
              </button>
            </label>
            {/* Color → popup */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Color</span>
              <button
                type="button"
                onClick={() => setIsColorOpen(true)}
                className={boxBtnCls}
              >
                <span className="flex min-w-0 items-center gap-2 truncate">
                  {form.color ? (
                    <>
                      <span className={`h-5 w-5 shrink-0 rounded-full border-2 border-white shadow ${(() => { const st = getRealisticColorStyle(form.color); return st.border; })()}`} style={{ background: (() => { const st = getRealisticColorStyle(form.color); return st.gradient; })() }} />
                      <span className="truncate">{form.color}</span>
                    </>
                  ) : (
                    <span className="text-muted/70">{form.model ? 'Choose color…' : 'Pick a device first'}</span>
                  )}
                </span>
                <ChevronDown className="print:hidden h-4 w-4 shrink-0 text-muted" />
              </button>
            </label>
            {/* IMEI — audit B-P2: separate field from Serial so editing one
                never corrupts the other (the old single field wrote the same
                value into both serialNumber and imei). */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">IMEI</span>
              <input
                value={form.imei}
                onChange={(e) => set('imei', e.target.value)}
                inputMode="numeric"
                placeholder="15-digit IMEI"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted"
              />
            </label>
            {/* Serial Number */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Serial</span>
              <input
                value={form.serial}
                onChange={(e) => set('serial', e.target.value.toUpperCase())}
                placeholder="Device serial number"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted"
              />
              {/* Camera scanner — full-form parity (Ko Hein 2026-08-11) */}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                title="Scan barcode / QR"
                aria-label="Scan barcode or QR code"
                className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-2 text-muted transition-colors hover:border-brand hover:text-brand cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>
            </label>
            {/* Received date */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Received</span>
              <input
                type="date"
                value={form.date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set('date', e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors [color-scheme:light]"
              />
            </label>
            {/* Error / Repairs → popup */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Repairs</span>
              <button
                type="button"
                onClick={() => setIsRepairsOpen(true)}
                className={boxBtnCls}
              >
                <span className="truncate">
                  {form.repairs.length === 0 ? (
                    <span className="text-muted/70">{form.model ? 'Tap to add repairs…' : 'Pick a device first'}</span>
                  ) : (
                    <span className="font-bold">
                      {form.repairs.length} repair{form.repairs.length > 1 ? 's' : ''}
                      <span className="ml-2 font-mono text-brand">{finalEstimate.toLocaleString()} {currency}</span>
                    </span>
                  )}
                </span>
                <ChevronDown className="print:hidden h-4 w-4 shrink-0 text-muted" />
              </button>
            </label>
            {/* Passcode */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Passcode</span>
              <input
                value={form.passcode}
                onChange={(e) => set('passcode', e.target.value)}
                autoComplete="off"
                placeholder="Device passcode"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted"
              />
            </label>
            {/* Priority — full-form parity (Ko Hein 2026-08-11) */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Priority</span>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as RepairPriority }))}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Rush">Rush</option>
                <option value="B2B Priority">B2B Priority</option>
                <option value="Warranty Redo">Warranty Redo</option>
              </select>
            </label>
            {/* Service Type — full-form parity (Ko Hein 2026-08-11) */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Service</span>
              <select
                value={form.serviceType}
                onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value as FormState['serviceType'] }))}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors"
              >
                <option value="Standard Modular">Standard Modular</option>
                <option value="Micro-Soldering">Micro-Soldering</option>
                <option value="B2B Mail-In">B2B Mail-In</option>
              </select>
            </label>
            {/* Warranty — full-form parity (Ko Hein 2026-08-11) */}
            <label className="flex flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-full shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Warranty</span>
              <select
                value={form.warrantyDays}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  const opt = WARRANTY_OPTIONS.find((o) => o.days === days);
                  setForm((f) => ({
                    ...f,
                    warrantyDays: days,
                    warrantyLabel: opt ? opt.label : `${days} Days Standard Warranty`,
                  }));
                }}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors"
              >
                {WARRANTY_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days}>{opt.label}</option>
                ))}
              </select>
            </label>
            {/* Intake note — flex-1 absorbs the remaining height so both columns balance */}
            <label className="flex flex-1 flex-col items-stretch gap-1 py-1.5 sm:flex-row sm:items-stretch sm:gap-3">
              <span className="w-full shrink-0 pt-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted sm:w-32">Intake Note</span>
              <textarea
                value={form.reply}
                onChange={(e) => set('reply', e.target.value)}
                rows={2}
                placeholder="Intake note & customer symptoms…"
                className="w-full flex-1 resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted"
              />
            </label>
          </div>

          {/* RIGHT column: 21-point checklist — plain header, balanced with the left column (Ko Hein) */}
          <div className="lg:mt-0">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Phone Testing & Checking</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllChecks('Pass')}
                  className="no-print rounded-lg border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-black text-success-deep transition-colors hover:bg-success/20 cursor-pointer"
                >
                  All Pass
                </button>
                <button
                  type="button"
                  onClick={() => setAllChecks('N/A')}
                  className="no-print rounded-lg border border-line bg-surface px-2 py-0.5 text-[10px] font-black text-muted transition-colors hover:bg-line cursor-pointer"
                >
                  All N/A
                </button>
                <span role="status" aria-label="Passed checks" className="font-mono text-[11px] font-black text-brand">{checkedCount}/{DIAGNOSTIC_NAMES.length}</span>
              </span>
            </div>
            <div className="mt-0 grid grid-cols-2 gap-x-3 gap-y-0.5 sm:gap-x-8">
              {DIAGNOSTIC_NAMES.map((name, i) => (
                <label key={name} className="group flex min-h-7 items-center gap-2 border-b border-line/60 py-1.5">
                  <button
                    type="button"
                    onClick={() => cycleCheck(i)}
                    title={form.checks[i].status === 'N/A' ? 'Not checked — tap for Pass' : form.checks[i].status === 'Pass' ? 'Pass — tap for Fail' : 'Fail — tap for N/A'}
                    className={`flex !h-6 !w-6 !min-h-6 !min-w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black leading-none transition-colors cursor-pointer ${
                      form.checks[i].status === 'Pass'
                        ? 'border-success bg-success text-white'
                        : form.checks[i].status === 'Fail'
                        ? 'border-danger bg-danger text-white'
                        : 'border-line bg-white text-muted hover:border-brand'
                    }`}
                  >
                    {form.checks[i].status === 'Pass' ? '✓' : form.checks[i].status === 'Fail' ? '✕' : ''}
                  </button>
                  <span className={`min-w-0 truncate text-xs font-semibold sm:text-sm ${form.checks[i].status !== 'N/A' ? 'text-ink' : 'text-muted'}`}>
                    {name}
                  </span>
                  <input
                    aria-label={`${name} note`}
                    value={form.checks[i].note}
                    onChange={(e) => setCheck(i, { note: e.target.value })}
                    placeholder={form.checks[i].status === 'Pass' ? 'ok' : form.checks[i].status === 'Fail' ? 'issue…' : 'n/a'}
                    title="Add note"
                    className="ml-auto min-w-[40px] max-w-[76px] flex-1 bg-transparent border-b border-line/50 px-1 text-xs outline-none transition-colors hover:bg-surface/60 focus:border-brand/40 focus:bg-brand-soft/50 sm:max-w-none"
                  />
                </label>
              ))}
            </div>
          </div>
          </div>

          <div className="no-print mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Summary stat tiles — 2×2 on mobile so the Final total never truncates (Ko Hein 2026-08-14) */}
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-2">
              <div className="rounded-lg bg-surface px-2 py-1.5 text-center sm:px-3">
                <span className="block text-[9px] font-black uppercase tracking-wider text-muted">Items</span>
                <span className="block font-mono text-[11px] font-black text-ink">{form.repairs.length}</span>
              </div>
              <div className="rounded-lg bg-surface px-2 py-1.5 text-center sm:px-3">
                <span className="block text-[9px] font-black uppercase tracking-wider text-muted">Base</span>
                <span className="block font-mono text-[11px] font-black text-ink">{baseTotal.toLocaleString()}</span>
              </div>
              <div className="rounded-lg bg-surface px-2 py-1.5 text-center sm:px-3">
                <span className="block text-[9px] font-black uppercase tracking-wider text-muted">Disc</span>
                <span className="block font-mono text-[11px] font-black text-danger">{savedAmount > 0 ? `-${savedAmount.toLocaleString()}` : '0'}</span>
              </div>
              <div className="rounded-lg bg-brand px-2 py-1.5 text-center sm:px-3">
                <span className="block text-[9px] font-black uppercase tracking-wider text-white/80">Final</span>
                <span className="block font-mono text-[11px] font-black text-white">{finalEstimate.toLocaleString()} {currency}</span>
              </div>
              {editingId && (
                <span className="col-span-2 text-center font-mono text-[10px] font-bold text-brand sm:col-auto sm:text-left">
                  · {editTarget?.orderNumber}
                </span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              {onOpenAiAssistant && (
                <button
                  type="button"
                  onClick={onOpenAiAssistant}
                  className="flex items-center gap-1.5 rounded-xl border border-purple/30 bg-purple/10 px-4 py-2 text-xs font-black text-purple transition hover:bg-purple/20"
                  title="Open AI diagnostic assistant"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: 'Clear form?',
                    message: 'This clears the half-filled form — repairs and photos will be lost.',
                    confirmLabel: 'Clear',
                    danger: true,
                  });
                  if (ok) resetForm();
                }}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
              >
                Clear
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white transition hover:bg-brand-deep"
              >
                {editingId ? 'Update Ticket' : 'Save Ticket'}
              </button>
            </div>
          </div>

          {/* Intake photos — full-form parity (Ko Hein 2026-08-11) */}
          <div className="no-print mt-3 rounded-xl border border-line bg-surface/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted">Device Photos ({form.photos.length}/6)</span>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-black text-brand transition hover:border-brand cursor-pointer"
              >
                + Add Photo
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.photos.map((photo, idx) => (
                <div key={idx} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line group">
                  <img src={photo} alt={`Device condition photo ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))}
                    aria-label={`Remove photo ${idx + 1}`}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-40 transition-opacity hover:opacity-100 sm:opacity-40 sm:group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.photos.length === 0 && (
                <p className="text-[11px] font-medium text-muted">No photos yet — tap Add Photo to capture the device condition.</p>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              aria-label="Upload device condition photos"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const MAX_INTAKE_PHOTOS = 6;
                const room = MAX_INTAKE_PHOTOS - form.photos.length;
                if (room <= 0) {
                  toast('Max 6 photos — remove one to add another.', 'error', 'Photo Limit');
                  e.target.value = '';
                  return;
                }
                files.slice(0, room).forEach((file) => {
                  if (file.size > 8_000_000) {
                    toast(`${file.name} is over 8MB — skipping.`, 'error', 'Photo Too Large');
                    return;
                  }
                  void compressImageFile(file).then((dataUrl) => {
                    if (dataUrl) setForm((f) => ({ ...f, photos: [...f.photos, dataUrl] }));
                  });
                });
                e.target.value = '';
              }}
            />
          </div>

          {savedFlash && (
            <div role="status" className="no-print mt-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-success/10 px-4 py-3 text-center text-sm font-bold text-success-deep">
              <span>{editingId ? 'Ticket updated and saved to the database.' : 'Inspection saved to the database.'}</span>
              {onSelectPrintTag && lastSavedWo && (
                <button
                  type="button"
                  onClick={() => onSelectPrintTag(lastSavedWo)}
                  className="rounded-lg border border-success/40 bg-white px-3 py-1.5 text-xs font-black text-success-deep transition hover:bg-success/10"
                >
                  🖨 Print Ticket
                </button>
              )}
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('intake')}
                  className="rounded-lg border border-success/40 bg-white px-3 py-1.5 text-xs font-black text-success-deep transition hover:bg-success/10"
                >
                  → Work Intake
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Color picker popup */}
      {isColorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" role="presentation" aria-hidden="true" onClick={() => setIsColorOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-2xl animate-i35-slide-up sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink">Choose Color</h3>
                <p className="text-xs text-muted">{form.model ? `Colors for ${form.model}` : 'Pick a device first'}</p>
              </div>
              <button type="button" onClick={() => setIsColorOpen(false)} className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">✕</button>
            </div>
            {!form.model ? (
              <p className="py-8 text-center text-xs font-bold text-muted">Pick a device first — go back and choose the model.</p>
            ) : (
              <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
                {getAvailableColorsForModel(form.model).map((c) => {
                  const style = getRealisticColorStyle(c);
                  const isSelected = form.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { set('color', c); setIsColorOpen(false); }}
                      className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all hover:scale-105 cursor-pointer ${
                        isSelected ? 'border-brand bg-brand-soft ring-2 ring-brand/30' : 'border-line bg-white hover:bg-surface'
                      }`}
                    >
                      {/* Big realistic color circle — same as New Intake Ticket */}
                      <span
                        className={`h-14 w-14 rounded-full border-2 border-white shadow-lg ${style.border}`}
                        style={{ background: style.gradient, boxShadow: style.shadow }}
                      />
                      <span className={`mt-2 text-xs font-bold ${isSelected ? 'text-brand' : 'text-ink'}`}>{c}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repairs / Error picker popup — same picker UI as New Intake Ticket */}
      {isRepairsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" role="presentation" aria-hidden="true" onClick={closeRepairs}>
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl animate-i35-slide-up sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-ink">Add Repairs & Details</h3>
                <p className="truncate text-xs text-muted">{form.model ? `Repairs for ${form.model}` : 'Pick a model first'}</p>
              </div>
              <button type="button" onClick={closeRepairs} className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">✕</button>
            </div>

            {!form.model ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
                <p className="text-xs font-extrabold text-warning">Choose Device Model First</p>
                <p className="text-xs text-muted">Pick a model to see its repair services and prices.</p>
              </div>
            ) : (
              <>
                {/* Search + group pills (like New Intake Ticket) */}
                <div className="space-y-2 border-b border-line px-4 py-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={repairSearch}
                      onChange={(e) => setRepairSearch(e.target.value)}
                      placeholder={`Search repairs (e.g. Battery, Display, Face ID)...`}
                      className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition-colors focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    {['ALL', 'Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setRepairGroup(grp)}
                        className={`shrink-0 rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                          repairGroup === grp ? 'bg-brand text-white shadow-2xs' : 'bg-surface text-muted hover:bg-line hover:text-ink'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repair list — small price-list style cards, ~4 cards visible then scroll (Ko Hein) */}
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {visibleRepairItems.map((item) => {
                      const sel = form.repairs.find((r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase());
                      const isSelected = !!sel;
                      const discPct = sel?.discountPercent || 0;
                      const finalPrice = sel?.finalPrice ?? item.price;
                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onClick={() => toggleRepair(item)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRepair(item); } }}
                          className={`group relative flex min-h-[92px] cursor-pointer flex-col gap-1.5 rounded-2xl border-2 bg-white p-2.5 shadow-2xs transition-colors select-none focus:outline-none ${
                            isSelected ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/50'
                          }`}
                        >
                          {/* Row 1: name (selection shown by border + discount circle) */}
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <h3 className="min-w-0 truncate text-[11px] font-extrabold text-ink leading-snug" title={item.name}>{item.name}</h3>
                          </div>
                          {/* Row 2: category plain text + warranty pill (price-list style) */}
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-muted">{item.group}</span>
                            <span className="inline-flex shrink-0 items-center space-x-0.5 rounded-full border border-success/30 bg-success/10 px-1 py-px text-[10px] font-extrabold text-success-deep">
                              <ShieldCheck className="h-1.5 w-1.5 text-success shrink-0" />
                              <span>{shortWarranty(item.warranty)}</span>
                            </span>
                          </div>
                          {/* Row 3: price + discount circle (circle space always reserved → no shift) */}
                          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-1.5">
                            <div className="min-w-0 leading-tight">
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-mono text-xs font-black text-ink">{finalPrice.toLocaleString()}</span>
                                <span className={`font-mono text-[10px] font-bold text-muted line-through ${discPct > 0 ? 'visible' : 'invisible'}`}>{item.price.toLocaleString()}</span>
                              </div>
                              <div className="h-3.5 overflow-hidden">
                                {discPct > 0 && (
                                  <span className="text-[9px] font-extrabold text-success">−{Math.round(item.price - finalPrice).toLocaleString()} · {discPct}%</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pw = 176;
                                let l = rect.right - pw;
                                l = Math.max(8, Math.min(l, window.innerWidth - pw - 8));
                                setDiscountAnchor({ top: rect.bottom + 6, left: l });
                                setDiscountMenuFor(item.id);
                              }}
                              title={discPct > 0 ? `${discPct}% discount applied` : 'Add discount'}
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer active:scale-95 ${
                                isSelected ? (discPct > 0 ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted hover:border-brand hover:text-brand') : 'invisible'
                              }`}
                            >
                              <BadgePercent className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {visibleRepairItems.length === 0 && (
                      <p className="col-span-full py-8 text-center text-xs font-bold text-muted">No repairs match your search.</p>
                    )}
                  </div>
                </div>

                {/* Summary box */}
                <div className="grid grid-cols-2 gap-2 border-t border-line px-4 py-3 text-center text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-surface p-2">
                    <span className="block text-muted font-semibold">Items</span>
                    <span className="font-extrabold text-ink">{form.repairs.length}</span>
                  </div>
                  <div className="rounded-lg bg-surface p-2">
                    <span className="block text-muted font-semibold">Base</span>
                    <span className="font-extrabold text-ink">{baseTotal.toLocaleString()} {currency}</span>
                  </div>
                  <div className="rounded-lg bg-surface p-2">
                    <span className="block text-muted font-semibold">Discount</span>
                    <span className="font-extrabold text-danger">{savedAmount > 0 ? `-${savedAmount.toLocaleString()} ${currency}` : `0 ${currency}`}</span>
                  </div>
                  <div className="rounded-lg bg-brand p-2 text-white">
                    <span className="block text-[10px] font-bold uppercase opacity-90">Final</span>
                    <span className="font-black">{finalEstimate.toLocaleString()} {currency}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
                  <button type="button" onClick={closeRepairs} className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white transition hover:bg-brand-deep">
                    Done
                  </button>
                </div>

                {/* Anchored discount popup (price-list style) */}
                {discountMenuFor && discountAnchor && (
                  <div
                    className="discount-popup fixed z-[80] w-44 rounded-2xl border border-line bg-white p-2 shadow-xl relative"
                    style={{ top: discountAnchor.top, left: discountAnchor.left }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span aria-hidden="true" className="absolute -top-1 right-3 h-2 w-2 rotate-45 border-l border-t border-line bg-white" />
                    <div className="flex items-center justify-between gap-2 px-1 pb-2">
                      <p className="text-xs font-extrabold text-ink">Discount</p>
                      <span className="max-w-[110px] truncate text-xs font-bold text-muted">
                        {form.repairs.find((r) => r.id === discountMenuFor)?.name || ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {DISCOUNT_OPTIONS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            updateRepairDiscount(discountMenuFor, pct);
                            setDiscountMenuFor(null);
                            setDiscountAnchor(null);
                          }}
                          className={`flex h-7 w-7 min-w-7 items-center justify-center rounded-full text-[10px] font-extrabold transition-all cursor-pointer active:scale-90 ${
                            form.repairs.find((r) => r.id === discountMenuFor)?.discountPercent === pct
                              ? 'border border-brand bg-brand text-white'
                              : 'border border-line bg-white text-ink hover:border-brand hover:text-brand'
                          }`}
                          title={pct === 0 ? 'No discount' : `${pct}% off`}
                        >
                          {pct === 0 ? '0' : pct}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 border-t border-line pt-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Custom %"
                        title="Type 1–100, Enter to apply"
                        value={customDiscountInput}
                        onChange={(e) => setCustomDiscountInput(e.target.value)}
                        onBlur={() => {
                          const v = Number(customDiscountInput);
                          if (v >= 1 && v <= 100) {
                            updateRepairDiscount(discountMenuFor, v);
                            setCustomDiscountInput('');
                            setDiscountMenuFor(null);
                            setDiscountAnchor(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Number(customDiscountInput);
                            if (v >= 1 && v <= 100) {
                              updateRepairDiscount(discountMenuFor, v);
                              setCustomDiscountInput('');
                              setDiscountMenuFor(null);
                              setDiscountAnchor(null);
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-center font-mono text-xs font-bold text-ink outline-none "
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Model picker — grouped by series, same modal as Create Ticket */}
      <DeviceModelChooserModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedDevice={form.model}
        onSelectDevice={(m) => {
          // Ko Hein: no auto color — let the user pick it (hint shown in the row)
          setForm((f) => ({ ...f, model: m, color: '' }));
          setIsModelModalOpen(false);
        }}
      />

      {/* Camera/QR scanner — full-form parity (Ko Hein 2026-08-11) */}
      {isScannerOpen && (
        <Suspense fallback={null}>
          <CameraQrScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanSuccess={(scannedText) => {
              const clean = (scannedText || '').trim().replace(/\s+/g, ' ');
              set('serial', clean.toUpperCase());
              setIsScannerOpen(false);
            }}
          />
        </Suspense>
      )}
      </>)}
    </div>
  );
};

export default SimpleTicketCreator;
