import React, { useState } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
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
  checks: { checked: boolean; note: string }[];
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', model: '', color: '', imei: '',
  date: new Date().toISOString().slice(0, 10),
  error: '', repairs: [], passcode: '', reply: '',
  checks: DIAGNOSTIC_NAMES.map(() => ({ checked: false, note: '' })),
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
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isRepairsOpen, setIsRepairsOpen] = useState(false);

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
  const overallDiscountPercent = baseTotal > 0 ? Math.round((savedAmount / baseTotal) * 100) : 0;

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
  const setCheck = (idx: number, patch: Partial<{ checked: boolean; note: string }>) =>
    setForm((f) => ({
      ...f,
      checks: f.checks.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));

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
      status: (form.checks[i].checked ? 'Pass' : 'Fail') as DiagnosticItemResult['status'],
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

  const checkedCount = form.checks.filter((c) => c.checked).length;
  const editTarget = editingId ? workOrders.find((w) => w.id === editingId) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Paper sheet */}
      <div className="print:border-0 print:shadow-none overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              {editingId ? 'Editing simple ticket' : 'Service intake form'}
            </p>
            <h1 className="text-lg font-black leading-tight tracking-tight text-ink sm:text-xl">
              {editingId ? `Edit — ${editTarget?.orderNumber || ''}` : 'Phone Testing & Checking'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-xs font-bold text-ink transition hover:bg-surface focus:outline-none"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
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
                placeholder="Optional — e.g. 09-…"
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
                    <span className="text-muted/70">Choose color…</span>
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
                    <span className="text-muted/70">Tap to add repairs…</span>
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
              <span className="w-36 shrink-0 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-muted">Note</span>
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
                  <input
                    type="checkbox"
                    checked={form.checks[i].checked}
                    onChange={(e) => setCheck(i, { checked: e.target.checked })}
                    className="h-4 w-4 shrink-0 rounded border-line accent-brand"
                  />
                  <span className={`text-xs font-semibold sm:text-sm ${form.checks[i].checked ? 'text-ink' : 'text-muted'}`}>
                    {name}
                  </span>
                  <input
                    aria-label={`${name} note`}
                    value={form.checks[i].note}
                    onChange={(e) => setCheck(i, { note: e.target.value })}
                    placeholder={form.checks[i].checked ? 'ok' : 'issue…'}
                    className="ml-auto min-w-0 flex-1 bg-transparent px-1 text-xs outline-none focus:bg-[#d9f99d]/40"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          </div>

          <div className="no-print mt-4 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-muted">
              {checkedCount}/{DIAGNOSTIC_NAMES.length} passed
              {editingId && <span className="ml-2 text-brand">· Editing {editTarget?.orderNumber}</span>}
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
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-ink">Choose Color</h3>
              <button type="button" onClick={() => setIsColorOpen(false)} className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">✕</button>
            </div>
            {!form.model ? (
              <p className="py-6 text-center text-xs font-bold text-muted">Pick a model first.</p>
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

      {/* Repairs / Error picker popup */}
      {isRepairsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={() => setIsRepairsOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-ink">Error / Repair Needed</h3>
                <p className="text-xs text-muted">{form.model ? `Price list repairs for ${form.model}` : 'Pick a model first'}</p>
              </div>
              <button type="button" onClick={() => setIsRepairsOpen(false)} className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">✕</button>
            </div>

            {form.model && (
              <>
                {catalogItemsForModel.length === 0 ? (
                  <p className="py-6 text-center text-xs font-bold text-muted">No price list entries for this model yet.</p>
                ) : (
                  <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
                    {catalogItemsForModel.map((item) => {
                      const on = form.repairs.some((r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase());
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleRepair(item)}
                          className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                            on ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-brand/50'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className={`shrink-0 font-mono ${on ? 'text-white/90' : 'text-muted'}`}>{item.price.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {form.repairs.length > 0 && (
                  <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto border-t border-line pt-3">
                    {form.repairs.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate font-bold text-ink">{r.name}</span>
                        <span className="font-mono text-muted">{r.basePrice.toLocaleString()}</span>
                        <div className="relative shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={r.discountPercent}
                            onChange={(e) => updateRepairDiscount(r.id, Number(e.target.value))}
                            aria-label={`${r.name} discount percent`}
                            className="w-14 rounded-lg border border-line bg-white px-2 py-1 text-center font-mono font-bold text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[10px] font-bold text-muted">%</span>
                        </div>
                        <span className={`w-20 shrink-0 text-right font-mono font-black ${r.finalPrice < r.basePrice ? 'text-brand' : 'text-ink'}`}>
                          {r.finalPrice.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, repairs: f.repairs.filter((x) => x.id !== r.id) }))}
                          className="shrink-0 rounded-md px-1 text-muted hover:text-danger"
                          aria-label={`Remove ${r.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-dotted border-line pt-1.5 text-xs font-mono">
                      <div className="flex justify-between text-muted"><span>Subtotal</span><span>{baseTotal.toLocaleString()} MMK</span></div>
                      {savedAmount > 0 && (
                        <div className="flex justify-between text-danger"><span>Discount ({overallDiscountPercent}%)</span><span>-{savedAmount.toLocaleString()} MMK</span></div>
                      )}
                      <div className="flex justify-between font-black text-ink"><span>Total</span><span>{finalEstimate.toLocaleString()} MMK</span></div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRepairsOpen(false)}
                className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white transition hover:bg-brand-deep"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model picker — grouped by series, same modal as Create Ticket */}
      <DeviceModelChooserModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedDevice={form.model}
        onSelectDevice={(m) => {
          const colors = getAvailableColorsForModel(m);
          setForm((f) => ({ ...f, model: m, color: colors.length ? colors[0] : f.color }));
          setIsModelModalOpen(false);
        }}
      />
    </div>
  );
};

export default SimpleTicketCreator;
