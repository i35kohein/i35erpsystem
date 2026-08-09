import React, { useState } from 'react';
import { Printer, PencilLine, Inbox, Trash2 } from 'lucide-react';
import { WorkOrder, DiagnosticItemResult, AppleDeviceCategory, SelectedRepairItem } from '../../types';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { DIAGNOSTIC_NAMES, APPLE_MODEL_SERIES, getAvailableColorsForModel } from './deviceData';

interface SimpleTicketCreatorProps {
  workOrders: WorkOrder[];
  priceCatalog?: ModelRepairPrice[];
  onSaveWorkOrder: (wo: WorkOrder) => void;
  onDeleteWorkOrder?: (id: string) => void;
  onNavigateToTab?: (tab: string) => void;
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

const fieldLine =
  'field-line mt-2 w-full border-0 border-b border-dotted border-stone-400 bg-transparent px-1 py-2 text-sm text-ink outline-none focus:bg-brand/5 transition-colors';

const selectLine =
  'field-line mt-2 w-full appearance-none border-0 border-b border-dotted border-stone-400 bg-transparent px-1 py-2 text-sm text-ink outline-none focus:bg-brand/5 transition-colors cursor-pointer';

const SimpleTicketCreator: React.FC<SimpleTicketCreatorProps> = ({
  workOrders,
  priceCatalog = [],
  onSaveWorkOrder,
  onDeleteWorkOrder,
  onNavigateToTab,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Simple tickets = tagged with simpleTicket flag
  const simpleTickets = workOrders
    .filter((wo) => (wo as any).simpleTicket === true)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

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

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setCheck = (idx: number, patch: Partial<{ checked: boolean; note: string }>) =>
    setForm((f) => ({
      ...f,
      checks: f.checks.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));

  const loadTicket = (wo: WorkOrder) => {
    const diagnostics = wo.beforeDiagnostics || [];
    setForm({
      name: wo.customerName || '',
      phone: wo.customerPhone || '',
      model: wo.deviceModel || '',
      color: wo.deviceColor || '',
      imei: wo.imei || wo.serialNumber || '',
      date: (wo.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      error: wo.symptomsReported || '',
      repairs: wo.selectedRepairs || [],
      passcode: wo.passcode || '',
      reply: wo.afterRepairSummary || '',
      checks: DIAGNOSTIC_NAMES.map((name) => {
        const d = diagnostics.find((x) => x.name === name);
        return { checked: d ? d.status !== 'Fail' : false, note: d?.note || '' };
      }),
    });
    setEditingId(wo.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
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
      afterRepairSummary: form.reply.trim() || undefined,
      symptomsReported: form.error.trim(),
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
    setTimeout(() => setSavedFlash(false), 2500);
    if (!editingId) resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this simple ticket?')) {
      onDeleteWorkOrder?.(id);
      if (editingId === id) resetForm();
    }
  };

  const checkedCount = form.checks.filter((c) => c.checked).length;
  const editTarget = editingId ? workOrders.find((w) => w.id === editingId) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Paper sheet */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
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
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:gap-x-8">
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Customer name</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Phone number</span>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" required className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Model</span>
              <select
                value={form.model}
                onChange={(e) => {
                  const m = e.target.value;
                  const colors = getAvailableColorsForModel(m);
                  setForm((f) => ({ ...f, model: m, color: colors.length ? colors[0] : f.color }));
                }}
                className={`${selectLine} ${form.model ? '' : 'text-stone-500'}`}
              >
                <option value="">Choose model…</option>
                {APPLE_MODEL_SERIES.map((g) => (
                  <optgroup key={g.series} label={g.series}>
                    {g.models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Color</span>
              <select
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className={`${selectLine} ${form.color ? '' : 'text-stone-500'}`}
              >
                <option value="">Choose color…</option>
                {getAvailableColorsForModel(form.model).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">IMEI</span>
              <input value={form.imei} onChange={(e) => set('imei', e.target.value)} inputMode="numeric" className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Received date</span>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={`${fieldLine} [color-scheme:light]`} />
            </label>
            <div className="col-span-2 block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Error / Repair needed</span>
              {form.model && catalogItemsForModel.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {catalogItemsForModel.map((item) => {
                    const on = form.repairs.some((r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase());
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleRepair(item)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                          on
                            ? 'border-brand bg-brand text-white'
                            : 'border-line bg-surface text-ink hover:border-brand hover:text-brand'
                        }`}
                      >
                        {on ? '✓ ' : ''}{item.name}
                        <span className={`font-mono ${on ? 'text-white/90' : 'text-muted'}`}>
                          {item.price.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1.5 text-xs font-semibold text-muted">
                  {form.model ? 'No price list entries for this model yet.' : 'Pick a model above to see price-list repairs.'}
                </p>
              )}
              <input
                value={form.error}
                onChange={(e) => set('error', e.target.value)}
                placeholder={form.repairs.length ? 'Extra notes about the issue…' : 'Describe the error…'}
                className={fieldLine}
              />
              {form.repairs.length > 0 && (
                <div className="mt-2 space-y-1.5">
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
                    <div className="flex justify-between text-muted">
                      <span>Subtotal</span><span>{baseTotal.toLocaleString()} MMK</span>
                    </div>
                    {savedAmount > 0 && (
                      <div className="flex justify-between text-danger">
                        <span>Discount ({overallDiscountPercent}%)</span><span>-{savedAmount.toLocaleString()} MMK</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-ink">
                      <span>Total</span><span>{finalEstimate.toLocaleString()} MMK</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Password / passcode</span>
              <input value={form.passcode} onChange={(e) => set('passcode', e.target.value)} autoComplete="off" className={fieldLine} />
            </label>
            <label className="col-span-2 block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Customer reply</span>
              <textarea value={form.reply} onChange={(e) => set('reply', e.target.value)} rows={1} className={`${fieldLine} mt-1 resize-none`} />
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
                {editingId ? 'Update ticket' : 'Save inspection'}
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

      {/* Recent simple tickets — click to edit */}
      <div className="no-print">
        <h2 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted">
          <Inbox className="h-4 w-4" />
          Simple Tickets ({simpleTickets.length})
        </h2>
        {simpleTickets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center text-xs font-bold text-muted">
            No simple tickets yet — save your first inspection above.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {simpleTickets.slice(0, 24).map((wo) => {
              const diags = wo.beforeDiagnostics || [];
              const passed = diags.filter((d) => d.status !== 'Fail').length;
              const dateLabel = (wo.createdAt || '').slice(0, 10);
              const active = wo.id === editingId;
              return (
                <div
                  key={wo.id}
                  className={`rounded-xl border bg-white p-3 text-xs shadow-2xs transition-all ${
                    active ? 'border-[#17201c] ring-2 ring-[#17201c]/20' : 'border-line hover:border-[#17201c]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-[#17201c]">{wo.orderNumber}</span>
                    <span className="text-[10px] font-bold text-muted">{dateLabel}</span>
                  </div>
                  <p className="mt-1 truncate font-extrabold text-ink">{wo.deviceModel}</p>
                  <p className="truncate text-muted">{wo.customerName} · {wo.customerPhone}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      passed === DIAGNOSTIC_NAMES.length ? 'bg-success/15 text-success-deep' : passed > 0 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
                    }`}>
                      {passed}/{DIAGNOSTIC_NAMES.length} pass
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => loadTicket(wo)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-line px-2 text-[10px] font-extrabold text-brand hover:bg-brand-soft"
                      >
                        <PencilLine className="h-3 w-3" />
                        Edit
                      </button>
                      {onDeleteWorkOrder && (
                        <button
                          type="button"
                          onClick={() => handleDelete(wo.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:border-danger hover:text-danger"
                          aria-label={`Delete ${wo.orderNumber}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] font-bold text-muted">
          Saved tickets appear in <button type="button" className="text-brand underline" onClick={() => onNavigateToTab?.('intake')}>Work Intake</button> — you can continue there with pricing &amp; checkout.
        </p>
      </div>
    </div>
  );
};

export default SimpleTicketCreator;
