import React, { useState } from 'react';
import { Printer, PencilLine, Inbox, Trash2 } from 'lucide-react';
import { WorkOrder, DiagnosticItemResult, AppleDeviceCategory } from '../../types';
import { DIAGNOSTIC_NAMES } from './deviceData';

interface SimpleTicketCreatorProps {
  workOrders: WorkOrder[];
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
  passcode: string;
  reply: string;
  checks: { checked: boolean; note: string }[];
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', model: '', color: '', imei: '',
  date: new Date().toISOString().slice(0, 10),
  error: '', passcode: '', reply: '',
  checks: DIAGNOSTIC_NAMES.map(() => ({ checked: false, note: '' })),
};

const fieldLine =
  'field-line mt-2 w-full border-0 border-b border-dotted border-stone-400 bg-transparent px-1 py-2 text-sm text-[#17201c] outline-none focus:bg-[#d9f99d]/30 transition-colors';

const SimpleTicketCreator: React.FC<SimpleTicketCreatorProps> = ({
  workOrders,
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
      lineItems: [],
      warrantyDays: 0,
      intakePhotos: [],
      estimatedCompletion: undefined,
      subtotal: 0,
      depositAmount: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
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
      <div className="overflow-hidden rounded-[20px] border border-black/10 bg-[#f5f4ee] shadow-[0_24px_70px_rgba(23,32,28,0.12)]">
        <header className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">
              {editingId ? 'Editing simple ticket' : 'Service intake form'}
            </p>
            <h1 className="text-xl font-black leading-tight tracking-tight text-[#17201c] sm:text-2xl">
              {editingId ? `Edit — ${editTarget?.orderNumber || ''}` : 'Phone Testing & Checking'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#17201c] px-4 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-black focus:outline-none"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </header>

        <form onSubmit={handleSubmit} onReset={resetForm} className="px-4 py-4 sm:px-7 sm:py-5">
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:gap-x-8">
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">Customer name</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">Phone number</span>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" required className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">Model</span>
              <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g. iPhone 14 Pro" className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">Color</span>
              <input value={form.color} onChange={(e) => set('color', e.target.value)} className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">IMEI</span>
              <input value={form.imei} onChange={(e) => set('imei', e.target.value)} inputMode="numeric" className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">Received date</span>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={`${fieldLine} [color-scheme:light]`} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">Error</span>
              <input value={form.error} onChange={(e) => set('error', e.target.value)} className={fieldLine} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#17201c]">Password / passcode</span>
              <input value={form.passcode} onChange={(e) => set('passcode', e.target.value)} autoComplete="off" className={fieldLine} />
            </label>
            <label className="col-span-2 block">
              <span className="text-sm font-bold text-[#17201c]">Customer reply</span>
              <textarea value={form.reply} onChange={(e) => set('reply', e.target.value)} rows={1} className={`${fieldLine} mt-1 resize-none`} />
            </label>
          </div>

          <fieldset className="mt-5 rounded-[18px] border-2 border-[#17201c] px-3 pb-3 pt-2 sm:px-5">
            <legend className="mx-auto rounded-full bg-[#17201c] px-5 py-1.5 text-center text-xs font-black uppercase tracking-[0.12em] text-white">
              Phone Testing & Checking
            </legend>
            <div className="mt-1 grid grid-cols-2 gap-x-4 sm:gap-x-8">
              {DIAGNOSTIC_NAMES.map((name, i) => (
                <label key={name} className="group flex min-h-9 items-center gap-2 border-b border-dotted border-stone-400 py-1">
                  <input
                    type="checkbox"
                    checked={form.checks[i].checked}
                    onChange={(e) => setCheck(i, { checked: e.target.checked })}
                    className="h-4 w-4 shrink-0 rounded border-stone-400 accent-[#17201c]"
                  />
                  <span className={`text-xs font-semibold sm:text-sm ${form.checks[i].checked ? 'text-[#17201c]' : 'text-stone-600'}`}>
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

          <div className="no-print mt-4 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-stone-500">
              {checkedCount}/{DIAGNOSTIC_NAMES.length} passed
              {editingId && <span className="ml-2 text-[#17201c]">· Editing {editTarget?.orderNumber}</span>}
            </p>
            <div className="flex justify-end gap-2">
              <button type="reset" className="rounded-full border border-black/15 px-4 py-2 text-xs font-bold text-[#17201c] hover:bg-white">
                Clear
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#d9f99d] px-5 py-2 text-xs font-black text-[#17201c] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {editingId ? 'Update ticket' : 'Save inspection'}
              </button>
            </div>
          </div>

          {savedFlash && (
            <p role="status" className="no-print mt-4 rounded-2xl bg-[#d9f99d]/60 px-4 py-3 text-center text-sm font-bold text-[#17201c]">
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
