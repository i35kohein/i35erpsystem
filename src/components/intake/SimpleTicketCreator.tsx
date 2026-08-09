import React, { useState } from 'react';
import { ChevronDown, Search, BadgePercent, ShieldCheck } from 'lucide-react';
import { WorkOrder, DiagnosticItemResult, AppleDeviceCategory, SelectedRepairItem } from '../../types';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { DIAGNOSTIC_NAMES, getAvailableColorsForModel } from './deviceData';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';

interface SimpleTicketCreatorProps {
  workOrders: WorkOrder[];
  customers?: Array<{ id: string; name: string; phone: string; type?: string }>;
  priceCatalog?: ModelRepairPrice[];
  onSaveWorkOrder: (wo: WorkOrder) => void;
}

interface FormState {
  name: string;
  phone: string;
  model: string;
  color: string;
  imei: string;
  date: string;
  error: string;
  repairs: SelectedRepairItem[];
  passcode: string;
  reply: string;
  checks: { status: 'N/A' | 'Pass' | 'Fail'; note: string }[];
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', model: '', color: '', imei: '',
  date: new Date().toISOString().slice(0, 10),
  error: '', repairs: [], passcode: '', reply: '',
  checks: DIAGNOSTIC_NAMES.map(() => ({ status: 'N/A' as const, note: '' })),
};

/** Popup-trigger rows styled exactly like the text inputs so all rows align. */
const boxBtnCls =
  'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-left text-sm text-ink transition-colors hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/15';

/** Approximate swatch color for a device color name (used by the color picker). */
function colorSwatch(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('black')) return '#1c1c1e';
  if (n.includes('white')) return '#f5f5f7';
  if (n.includes('silver')) return '#c7c9cc';
  if (n.includes('gold')) return '#f2d8a7';
  if (n.includes('titanium')) return '#8a8d92';
  if (n.includes('blue')) return '#3b6ea5';
  if (n.includes('purple')) return '#7d5ba6';
  if (n.includes('green')) return '#4a7c59';
  if (n.includes('orange')) return '#d97b4a';
  if (n.includes('pink')) return '#e8a2b0';
  if (n.includes('red')) return '#c0392b';
  if (n.includes('yellow')) return '#e5c158';
  return '#b8b8b8';
}

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/** '12 Month' → '12M', '6 Months' → '6M' (price-list style short warranty). */
function shortWarranty(warranty: string): string {
  return (warranty || '').replace(/(\d+)\s*(?:Months?|M)\b/gi, '$1M');
}

const SimpleTicketCreator: React.FC<SimpleTicketCreatorProps> = ({
  workOrders,
  customers = [],
  priceCatalog = [],
  onSaveWorkOrder,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [previewNumber] = useState(() => `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isRepairsOpen, setIsRepairsOpen] = useState(false);
  const [repairSearch, setRepairSearch] = useState('');
  const [repairGroup, setRepairGroup] = useState('ALL');
  const [discountMenuFor, setDiscountMenuFor] = useState<string | null>(null);
  const [discountAnchor, setDiscountAnchor] = useState<{ top: number; left: number } | null>(null);
  const [customDiscountInput, setCustomDiscountInput] = useState('');

  const catalogItemsForModel = getModelPriceCatalogItems(form.model, priceCatalog);

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

  const closeRepairs = () => { setIsRepairsOpen(false); setRepairSearch(''); setRepairGroup('ALL'); };

  const toggleRepair = (item: ModelRepairCatalogItem) => {
    setForm((f) => {
      const exists = f.repairs.some((r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase());
      return {
        ...f,
        repairs: exists
          ? f.repairs.filter((r) => r.id !== item.id && r.name.toLowerCase() !== item.name.toLowerCase())
          : [...f.repairs, { id: item.id, name: item.name, basePrice: item.price, discountPercent: 0, finalPrice: item.price }],
      };
    });
  };

  const [matchedCustomer, setMatchedCustomer] = useState<string | null>(null);

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
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMatchedCustomer(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const diagnostics: DiagnosticItemResult[] = DIAGNOSTIC_NAMES.map((name, i) => ({
      id: `simple-diag-${Date.now()}-${i}`,
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

    const base: WorkOrder = {
      id: editingId || `wo-${Date.now()}`,
      orderNumber: editingId
        ? (workOrders.find((w) => w.id === editingId)?.orderNumber || `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`)
        : `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      customerId: '',
      customerName: form.name.trim() || 'Walk-in Customer',
      customerPhone: form.phone.trim(),
      customerEmail: '',
      customerType: 'Retail',
      deviceCategory,
      deviceModel: form.model.trim() || 'Unknown Model',
      serialNumber: form.imei.trim(),
      imei: form.imei.trim() || undefined,
      deviceColor: form.color.trim(),
      passcode: form.passcode.trim(),
      findMyStatus: 'UNKNOWN',
      status: 'Receive',
      priority: 'Normal',
      assignedTechId: '',
      serviceType: 'Standard Modular',
      beforeDiagnostics: diagnostics,
      symptomsReported: [form.error.trim(), form.reply.trim()].filter(Boolean).join(' — '),
      selectedRepairs: form.repairs,
      lineItems: form.repairs.map((r) => ({
        id: `li-${r.id}`,
        description: r.name,
        unitCost: Math.round(r.basePrice * 0.5),
        unitPrice: r.finalPrice,
        quantity: 1,
        isLabor: true,
      })),
      subtotal: baseTotal,
      depositAmount: 0,
      discountAmount: savedAmount,
      taxAmount: 0,
      totalAmount: finalEstimate,
      intakeChecklist: {
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
      warrantyDays: 0,
      intakePhotos: [],
      estimatedCompletion: undefined,
      isPaid: false,
      createdAt: editingId ? (workOrders.find((w) => w.id === editingId)?.createdAt || now) : form.date ? `${form.date}T09:00:00.000Z` : now,
      updatedAt: now,
    };
    (base as any).simpleTicket = true;

    onSaveWorkOrder(base);
    setSavedFlash(true);
    // Same as New Intake Ticket Registration: after saving, print the ticket.
    setTimeout(() => { window.print(); setSavedFlash(false); }, 600);
    if (!editingId) resetForm();
  };

  const checkedCount = form.checks.filter((c) => c.status === 'Pass').length;
  const editTarget = editingId ? workOrders.find((w) => w.id === editingId) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Paper sheet */}
      <div className="print:border-0 print:shadow-none overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              {editingId ? 'Editing simple ticket' : 'Service intake form'}
            </p>
          </div>
          <span className="shrink-0 font-mono text-sm font-black tracking-tight text-brand">
            {editingId ? editTarget?.orderNumber || previewNumber : previewNumber}
          </span>

        </header>

        <form onSubmit={handleSubmit} onReset={resetForm} className="px-4 py-4 sm:px-7 sm:py-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <div className="divide-y divide-line">
            {/* Phone */}
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                inputMode="tel"
                placeholder="09"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted"
              />
              {matchedCustomer && <span className="shrink-0 text-[10px] font-black text-success-deep">✓ {matchedCustomer}</span>}
            </label>
            {/* Name */}
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Name</span>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                placeholder="Customer name"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted"
              />
            </label>
            {/* Model → popup */}
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Model</span>
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
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Color</span>
              <button
                type="button"
                onClick={() => setIsColorOpen(true)}
                className={boxBtnCls}
              >
                <span className="flex min-w-0 items-center gap-2 truncate">
                  {form.color ? (
                    <>
                      <span className="h-3 w-3 shrink-0 rounded-full border border-black/20" style={{ background: colorSwatch(form.color) }} />
                      <span className="truncate">{form.color}</span>
                    </>
                  ) : (
                    <span className="text-muted/70">{form.model ? 'Choose color…' : 'Pick a device first'}</span>
                  )}
                </span>
                <ChevronDown className="print:hidden h-4 w-4 shrink-0 text-muted" />
              </button>
            </label>
            {/* IMEI */}
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">IMEI</span>
              <input
                value={form.imei}
                onChange={(e) => set('imei', e.target.value)}
                inputMode="numeric"
                placeholder="Serial / IMEI"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted"
              />
            </label>
            {/* Received date */}
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Received</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 [color-scheme:light]"
              />
            </label>
            {/* Error / Repairs → popup */}
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Repairs</span>
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
                      <span className="ml-2 font-mono text-brand">{finalEstimate.toLocaleString()} MMK</span>
                    </span>
                  )}
                </span>
                <ChevronDown className="print:hidden h-4 w-4 shrink-0 text-muted" />
              </button>
            </label>
            {/* Passcode */}
            <label className="flex items-center gap-3 py-2">
              <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Passcode</span>
              <input
                value={form.passcode}
                onChange={(e) => set('passcode', e.target.value)}
                autoComplete="off"
                placeholder="Device passcode"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted"
              />
            </label>
            {/* Intake note */}
            <label className="flex items-start gap-3 py-2">
              <span className="w-32 shrink-0 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-muted">Note</span>
              <textarea
                value={form.reply}
                onChange={(e) => set('reply', e.target.value)}
                rows={2}
                placeholder="Intake note & customer symptoms…"
                className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted"
              />
            </label>
          </div>

          {/* RIGHT column: 21-point checklist */}
          <fieldset className="rounded-2xl border-2 border-brand/40 px-3 pb-3 pt-2 sm:px-5 lg:mt-0">
            <legend className="mx-auto rounded-full bg-brand px-5 py-1.5 text-center text-xs font-black uppercase tracking-[0.12em] text-white">
              Phone Testing & Checking
            </legend>
            <div className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2 sm:gap-x-8">
              {DIAGNOSTIC_NAMES.map((name, i) => (
                <label key={name} className="group flex min-h-9 items-center gap-2 border-b border-dotted border-stone-400 py-1">
                  <button
                    type="button"
                    onClick={() => cycleCheck(i)}
                    title={form.checks[i].status === 'N/A' ? 'Not checked — tap for Pass' : form.checks[i].status === 'Pass' ? 'Pass — tap for Fail' : 'Fail — tap for N/A'}
                    className={`flex !h-4 !w-4 !min-h-4 !min-w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-black leading-none transition-colors cursor-pointer ${
                      form.checks[i].status === 'Pass'
                        ? 'border-success bg-success text-white'
                        : form.checks[i].status === 'Fail'
                        ? 'border-danger bg-danger text-white'
                        : 'border-line bg-white text-muted hover:border-brand'
                    }`}
                  >
                    {form.checks[i].status === 'Pass' ? '✓' : form.checks[i].status === 'Fail' ? '✕' : ''}
                  </button>
                  <span className={`text-xs font-semibold sm:text-sm ${form.checks[i].status !== 'N/A' ? 'text-ink' : 'text-muted'}`}>
                    {name}
                  </span>
                  <input
                    aria-label={`${name} note`}
                    value={form.checks[i].note}
                    onChange={(e) => setCheck(i, { note: e.target.value })}
                    placeholder={form.checks[i].status === 'Pass' ? 'ok' : 'issue…'}
                    className="ml-auto min-w-0 flex-1 bg-transparent px-1 text-xs outline-none focus:bg-[#d9f99d]/40"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          </div>

          <div className="no-print mt-3 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[11px] font-bold text-muted">
              {checkedCount}/{DIAGNOSTIC_NAMES.length} passed
              <span className="mx-1.5 text-line">·</span>
              <span className="font-mono">Items {form.repairs.length}</span>
              <span className="mx-1 text-line">·</span>
              <span className="font-mono">Base {baseTotal.toLocaleString()}</span>
              <span className="mx-1 text-line">·</span>
              <span className="font-mono">Disc {savedAmount > 0 ? `-${savedAmount.toLocaleString()}` : '0'}</span>
              <span className="mx-1 text-line">·</span>
              <span className="font-mono font-black text-brand">Final {finalEstimate.toLocaleString()} MMK</span>
              {editingId && <span className="ml-2 text-brand">· {editTarget?.orderNumber}</span>}
            </p>
            <div className="flex justify-end gap-2">
              <button type="reset" className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface">
                Clear
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white transition hover:bg-brand-deep"
              >
                {editingId ? 'Update & Print' : 'Save & Print'}
              </button>
            </div>
          </div>

          {savedFlash && (
            <p role="status" className="no-print mt-4 rounded-2xl bg-success/10 px-4 py-3 text-center text-sm font-bold text-success-deep">
              {editingId ? 'Ticket updated and saved to the database.' : 'Inspection saved to the database.'}
            </p>
          )}
        </form>
      </div>

      {/* Color picker popup */}
      {isColorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={() => setIsColorOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
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
              <div className="grid grid-cols-2 gap-2">
                {getAvailableColorsForModel(form.model).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { set('color', c); setIsColorOpen(false); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                      form.color === c ? 'border-brand bg-brand-soft/60 text-ink' : 'border-line bg-white text-ink hover:border-brand/40'
                    }`}
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full border border-black/20" style={{ background: colorSwatch(c) }} />
                    <span className="truncate">{c}</span>
                    {form.color === c && <span className="ml-auto text-brand">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repairs / Error picker popup — same picker UI as New Intake Ticket */}
      {isRepairsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={closeRepairs}>
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
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
                      className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition-colors focus:border-brand focus:bg-white"
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
                <div className="h-[248px] overflow-y-auto px-4 py-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {catalogItemsForModel.filter((item) => {
                      const matchesSearch =
                        !repairSearch ||
                        item.name.toLowerCase().includes(repairSearch.toLowerCase()) ||
                        item.group.toLowerCase().includes(repairSearch.toLowerCase());
                      const matchesGroup = repairGroup === 'ALL' || item.group === repairGroup;
                      return matchesSearch && matchesGroup;
                    }).map((item) => {
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
                          className={`group relative flex min-h-[92px] cursor-pointer flex-col gap-1.5 rounded-2xl border-2 bg-white p-2.5 shadow-2xs transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
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
                    {catalogItemsForModel.filter((item) => !repairSearch || item.name.toLowerCase().includes(repairSearch.toLowerCase()) || item.group.toLowerCase().includes(repairSearch.toLowerCase())).filter((item) => repairGroup === 'ALL' || item.group === repairGroup).length === 0 && (
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
                    <span className="font-extrabold text-ink">{baseTotal.toLocaleString()}</span>
                  </div>
                  <div className="rounded-lg bg-surface p-2">
                    <span className="block text-muted font-semibold">Discount</span>
                    <span className="font-extrabold text-danger">{savedAmount > 0 ? `-${savedAmount.toLocaleString()}` : '0'}</span>
                  </div>
                  <div className="rounded-lg bg-brand p-2 text-white">
                    <span className="block text-[10px] font-bold uppercase opacity-90">Final</span>
                    <span className="font-black">{finalEstimate.toLocaleString()} MMK</span>
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
                    className="discount-popup fixed z-[80] w-44 rounded-2xl border border-line bg-white p-2 shadow-xl"
                    style={{ top: discountAnchor.top, left: discountAnchor.left }}
                    onClick={(e) => e.stopPropagation()}
                  >
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
                        className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-center font-mono text-xs font-bold text-ink outline-none focus:border-brand"
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
    </div>
  );
};

export default SimpleTicketCreator;
