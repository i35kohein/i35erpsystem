import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, ChevronDown, ClipboardList,
  Search, ShieldCheck, Smartphone, Sparkles, Wrench, X, Zap, MapPin, AlertCircle,
} from 'lucide-react';
import { Button, Input } from '../ui';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { CameraQrScannerModal } from '../common/CameraQrScannerModal';
import { WorkOrder, Customer, SystemSettings, WorkOrderLineItem } from '../../types';
import { getAvailableColorsForModel, WARRANTY_OPTIONS, getRealisticColorStyle } from './deviceData';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { DIAGNOSTIC_NAMES } from './deviceData';

/**
 * CreateTicketWizardV2 — NEW ticket registration UI (2026-08-06).
 * Ko Hein's intake workflow, wizard flow only, fresh design:
 *   1 Customer → 2 Device → 3 Repairs & Estimate → 4 Diagnostics & Notes → 5 Review & Create
 * The old CreateTicketSoloPage is kept untouched (classic form still available).
 *
 * Design rules (2026-08-06 redesign):
 * - Carbon theme tokens only (brand #0f62fe / ink / muted / line / surface)
 * - Font floor 12px (text-xs); labels are text-xs font-semibold text-ink
 * - Every interactive element = <Button>/<Input> from the ui kit (policy)
 * - Compact single header + connected step pills; no triple-header bloat
 * - Inline field validation (red hint + invalid ring) — no floating toasts for step gating
 */
interface CreateTicketWizardV2Props {
  workOrders: WorkOrder[];
  customers: Customer[];
  systemSettings?: SystemSettings;
  priceCatalog?: ModelRepairCatalogItem[];
  onSaveWorkOrder: (wo: WorkOrder) => void;
  onSelectPrintTag?: (wo: WorkOrder) => void;
  onViewRepairTickets: () => void;
  onOpenClassicForm?: () => void;
}

const STEPS = ['Customer', 'Device', 'Repairs', 'Diagnostics', 'Review'];
const diagnosticKeys = DIAGNOSTIC_NAMES.slice(0, 21);

export const CreateTicketWizardV2: React.FC<CreateTicketWizardV2Props> = ({
  workOrders,
  customers,
  systemSettings,
  priceCatalog,
  onSaveWorkOrder,
  onSelectPrintTag,
  onViewRepairTickets,
  onOpenClassicForm,
}) => {
  const [step, setStep] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<WorkOrder | null>(null);

  // Step 1 — Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTown, setCustomerTown] = useState('');
  const [customerType, setCustomerType] = useState<'Retail' | 'B2B Corporate' | 'Wholesale Mail-In'>('Retail');
  const [triedNext, setTriedNext] = useState(false); // inline validation after first Continue

  // Step 2 — Device
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [imei, setImei] = useState('');
  const [passcode, setPasscode] = useState('');
  const [warrantyDays, setWarrantyDays] = useState(systemSettings?.defaultWarrantyDays ?? 90);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Step 3 — Repairs
  const [repairSearch, setRepairSearch] = useState('');
  const [selectedRepairs, setSelectedRepairs] = useState<Array<{ id: string; name: string; basePrice: number; discountPercent: number }>>([]);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);

  // Step 4 — Diagnostics & Notes
  const [beforeDiagnostics, setBeforeDiagnostics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  // Inline validation
  const phoneDigits = customerPhone.replace(/\D/g, '');
  const nameError = triedNext && !customerName.trim();
  const phoneError = triedNext && phoneDigits.length < 7;
  const modelError = triedNext && !deviceModel.trim();
  const repairsError = triedNext && step === 2 && selectedRepairs.length === 0;

  const goNext = () => {
    if (step === 0 && (!customerName.trim() || phoneDigits.length < 7)) {
      setTriedNext(true);
      return;
    }
    if (step === 1 && !deviceModel.trim()) {
      setTriedNext(true);
      return;
    }
    if (step === 2 && selectedRepairs.length === 0) {
      setTriedNext(true);
      return;
    }
    setTriedNext(false);
    setStep((s) => Math.min(4, s + 1));
  };
  const goBack = () => {
    setTriedNext(false);
    setStep((s) => Math.max(0, s - 1));
  };

  // Repair catalog for the chosen model
  const catalog = useMemo(() => getModelPriceCatalogItems(deviceModel, priceCatalog as any), [deviceModel, priceCatalog]);
  const filteredCatalog = useMemo(() => {
    const q = repairSearch.trim().toLowerCase();
    const list = catalog.length > 0 ? catalog : [];
    return q ? list.filter((r) => r.name.toLowerCase().includes(q)) : list;
  }, [catalog, repairSearch]);

  const availableColors = useMemo(() => (deviceModel ? getAvailableColorsForModel(deviceModel) : []), [deviceModel]);

  const toggleRepair = (item: ModelRepairCatalogItem) => {
    setSelectedRepairs((prev) => {
      const exists = prev.find((r) => r.id === item.id);
      if (exists) return prev.filter((r) => r.id !== item.id);
      return [...prev, { id: item.id, name: item.name, basePrice: item.price, discountPercent: 0 }];
    });
  };

  const finalEstimate = useMemo(() => {
    const sum = selectedRepairs.reduce((acc, r) => acc + Math.round(r.basePrice * (1 - r.discountPercent / 100)), 0);
    return Math.round(sum * (1 - overallDiscountPercent / 100));
  }, [selectedRepairs, overallDiscountPercent]);

  const setDiag = (key: string, status: string) =>
    setBeforeDiagnostics((prev) => ({ ...prev, [key]: status }));

  const diagPassCount = diagnosticKeys.filter((k) => beforeDiagnostics[k] === 'Pass').length;
  const diagFailCount = diagnosticKeys.filter((k) => beforeDiagnostics[k] === 'Fail').length;

  // Register the ticket
  const handleRegister = () => {
    if (!customerName.trim() || phoneDigits.length < 7) {
      setStep(0);
      setTriedNext(true);
      return;
    }
    setIsRegistering(true);

    const prefix = systemSettings?.ticketPrefix || 'WO-';
    const maxExistingNum = workOrders.reduce((max, wo) => {
      const match = /(\d+)\s*$/.exec(wo.orderNumber || '');
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1000);
    let nextNum = maxExistingNum + 1;
    const usedNumbers = new Set(workOrders.map((wo) => wo.orderNumber).filter(Boolean));
    const year = new Date().getFullYear();
    while (usedNumbers.has(`${prefix}${year}-${nextNum}`)) nextNum += 1;

    const matchedCustomer = customers.find(
      (c) => c.phone && c.phone.replace(/\D/g, '') === phoneDigits
    );

    const nowIso = new Date().toISOString();
    const newWorkOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      orderNumber: `${prefix}${year}-${nextNum}`,
      customerId: matchedCustomer?.id || `cust-${Date.now()}`,
      customerName,
      customerPhone,
      customerAddress: customerTown,
      customerType,
      deviceModel,
      deviceColor,
      serialNumber,
      imei,
      passcode,
      symptomsReported: notes,
      selectedRepairs: selectedRepairs.map((r) => ({
        id: r.id,
        name: r.name,
        basePrice: r.basePrice,
        discountPercent: r.discountPercent,
        finalPrice: Math.round(r.basePrice * (1 - r.discountPercent / 100)),
      })),
      lineItems: [] as WorkOrderLineItem[],
      beforeDiagnostics: Object.entries(beforeDiagnostics).map(([name, status]) => ({ id: 'diag-' + name, name, status: status as any })),
      afterDiagnostics: [],
      warrantyDays,
      warrantyLabel: WARRANTY_OPTIONS.find((w) => w.days === warrantyDays)?.label || `${warrantyDays} Days Standard Warranty`,
      totalAmount: finalEstimate,
      subtotal: finalEstimate,
      discountAmount: 0,
      depositAmount: 0,
      taxAmount: 0,
      status: 'Receive',
      priority: 'Normal',
      serviceType: 'Standard Modular',
      isPaid: false,
      customerEmail: '',
      deviceCategory: 'iPhone' as any,
      findMyStatus: 'UNKNOWN' as const,
      assignedTechId: '',
      intakeChecklist: {} as any,
      isArchived: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      inventoryConsumedAt: null,
      intakePhotos: [],
      estimatedCompletion: null,
    };

    setTimeout(() => {
      onSaveWorkOrder(newWorkOrder);
      setIsRegistering(false);
      setCreatedTicket(newWorkOrder);
    }, 400);
  };

  const resetForm = () => {
    setStep(0);
    setTriedNext(false);
    setCreatedTicket(null);
    setCustomerName(''); setCustomerPhone(''); setCustomerTown(''); setCustomerType('Retail');
    setDeviceModel(''); setDeviceColor(''); setSerialNumber(''); setImei(''); setPasscode('');
    setSelectedRepairs([]); setOverallDiscountPercent(0);
    setBeforeDiagnostics({}); setNotes('');
  };

  /* ---------------- Success screen ---------------- */
  if (createdTicket) {
    return (
      <div className="w-full px-4 sm:px-6 py-8 space-y-6 text-center">
        <div className="w-16 h-16 bg-success/10 text-success-deep rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="font-mono text-sm font-extrabold text-brand px-3 py-1 bg-brand-soft rounded-full">{createdTicket.orderNumber}</span>
          <h2 className="text-2xl font-black text-ink pt-2">Repair Ticket Created!</h2>
          <p className="text-xs text-muted">{createdTicket.deviceModel} · {createdTicket.customerName}</p>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-5 text-left text-xs space-y-3 max-w-md mx-auto">
          {[
            ['Customer', `${createdTicket.customerName} (${createdTicket.customerPhone})`],
            ['Device', createdTicket.deviceModel || '—'],
            ['Repairs', `${selectedRepairs.length} item(s)`],
            ['Estimate', `${finalEstimate.toLocaleString()} MMK`],
            ['Warranty', createdTicket.warrantyLabel || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span className="text-muted shrink-0">{k}</span>
              <span className="font-bold text-ink text-right">{v}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onSelectPrintTag && (
            <Button variant="outline" onClick={() => onSelectPrintTag(createdTicket)} className="border-line-strong">
              <ShieldCheck className="w-4 h-4 text-brand shrink-0" /> Print Sticker
            </Button>
          )}
          <Button onClick={onViewRepairTickets} className="bg-brand text-white">
            <ClipboardList className="w-4 h-4 shrink-0" /> View in Work Orders
          </Button>
          <Button variant="secondary" onClick={resetForm} className="border border-line-strong">
            <Zap className="w-4 h-4 shrink-0" /> + New Ticket
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Wizard ---------------- */
  return (
    <div className="w-full space-y-5 create-ticket-wizard">
      {/* Header — single compact row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-ink leading-tight">New Repair Ticket</h2>
            <p className="text-xs text-muted leading-tight">Quick wizard · {STEPS.length} steps</p>
          </div>
        </div>
        {onOpenClassicForm && (
          <Button variant="link" onClick={onOpenClassicForm} className="shrink-0 text-xs">
            Classic form
          </Button>
        )}
      </div>

      {/* Progress — connected step pills + thin bar (single block, no bloat) */}
      <div className="space-y-2.5">
        <div className="flex items-center">
          {STEPS.map((label, idx) => {
            const state = idx < step ? 'done' : idx === step ? 'active' : 'todo';
            return (
              <React.Fragment key={label}>
                {idx > 0 && <div className={`flex-1 h-0.5 mx-1.5 rounded-full ${idx <= step ? 'bg-brand' : 'bg-line'}`} />}
                <Button
                  type="button"
                  variant={state === 'active' ? 'secondary' : 'ghost'}
                  size="sm"
                  disabled={state === 'todo'}
                  onClick={() => idx < step && setStep(idx)}
                  className={`gap-1.5 px-2.5 ${state === 'active' ? 'bg-brand-soft text-brand border border-brand/30' : state === 'done' ? 'text-success-deep' : 'text-muted'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    state === 'done' ? 'bg-success text-white' : state === 'active' ? 'bg-brand text-white' : 'bg-line text-muted'
                  }`}>
                    {state === 'done' ? <Check className="w-3 h-3" /> : idx + 1}
                  </span>
                  <span className="hidden md:inline text-xs font-bold">{label}</span>
                </Button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="h-1 w-full rounded-full bg-line overflow-hidden">
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[280px] pt-0.5">
        {/* STEP 1 — CUSTOMER */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-extrabold text-ink">Customer Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1.5">Phone Number *</label>
                <Input
                  type="tel"
                  inputMode="tel"
                  invalid={phoneError}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="09 123 456 789"
                />
                {phoneError && <p className="mt-2 text-xs font-semibold text-rose-600 bg-rose-500/10 rounded-lg px-2 py-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Phone number is required (min 7 digits)</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1.5">Customer Name *</label>
                <Input
                  invalid={nameError}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Mg Mg"
                />
                {nameError && <p className="mt-2 text-xs font-semibold text-rose-600 bg-rose-500/10 rounded-lg px-2 py-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Customer name is required</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Town / City</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={customerTown} onChange={(e) => setCustomerTown(e.target.value)} placeholder="Yangon" className="pl-9" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Customer Type</label>
                <CustomDropdownMenu
                  value={customerType}
                  onChange={(v) => setCustomerType(v as typeof customerType)}
                  options={[
                    { value: 'Retail', label: 'Retail Walk-In' },
                    { value: 'B2B Corporate', label: 'B2B Corporate' },
                    { value: 'Wholesale Mail-In', label: 'Wholesale Mail-In' },
                  ]}
                  buttonClassName="w-full bg-white border border-line rounded-xl h-10 px-3 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pl-0.5">
              <AlertCircle className="w-3.5 h-3.5 text-brand shrink-0" />
              {matchedCustomerHint(customers, customerPhone)}
            </p>
          </div>
        )}

        {/* STEP 2 — DEVICE */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-extrabold text-ink">Device Details</h3>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Device Model *</label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModelModalOpen(true)}
                className={`w-full min-h-12 justify-between bg-white ${modelError ? 'border-rose-500' : 'border-line'}`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-bold text-ink truncate">{deviceModel || 'Select Apple Device Model'}</span>
                    <span className="block text-xs text-muted">{deviceModel ? 'Tap to change' : 'iPhone, iPad, MacBook, Watch…'}</span>
                  </span>
                </span>
                <ChevronDown className="w-4 h-4 text-muted shrink-0" />
              </Button>
              {modelError && <p className="mt-2 text-xs font-semibold text-rose-600 bg-rose-500/10 rounded-lg px-2 py-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Select a device model to continue</p>}
            </div>

            {deviceModel && (
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableColors.map((c) => {
                    const style = getRealisticColorStyle(c);
                    const selected = deviceColor === c;
                    return (
                      <Button
                        key={c}
                        type="button"
                        variant={selected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setDeviceColor(selected ? '' : c)}
                        className={selected ? 'border-brand text-brand' : ''}
                      >
                        <span className="w-3 h-3 rounded-full border border-line" style={{ background: style.gradient }} />
                        <span>{c}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Serial Number</label>
                <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value.toUpperCase())} placeholder="F2LXK09PN6T" className="font-mono" />
              </div>
              <div>
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-ink mb-1.5">
                  <span>IMEI Number</span>
                  <span className={`font-mono font-bold ${imei.length === 15 ? 'text-success-deep' : 'text-muted'}`}>{imei.length}/15</span>
                </label>
                <div className="relative">
                  <Input
                    type="text" inputMode="numeric" maxLength={15}
                    value={imei}
                    onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
                    placeholder="15 digits"
                    className="font-mono pr-10"
                  />
                  <Button
                    type="button"
                    variant="iconGhost" size="iconSm"
                    onClick={() => setIsScannerOpen(true)}
                    aria-label="Scan barcode"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    <Camera className="w-4 h-4 text-brand" />
                  </Button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1.5">Device Passcode <span className="text-muted font-normal">(optional)</span></label>
                <Input value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="1234 or Face ID" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Warranty</label>
              <CustomDropdownMenu
                value={WARRANTY_OPTIONS.find((w) => w.days === warrantyDays)?.label || `${warrantyDays} Days Standard Warranty`}
                onChange={(label) => {
                  const opt = WARRANTY_OPTIONS.find((w) => w.label === label);
                  if (opt) setWarrantyDays(opt.days);
                }}
                options={WARRANTY_OPTIONS.map((w) => ({ value: w.label, label: w.label }))}
                buttonClassName="w-full bg-white border border-line rounded-xl h-10 px-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 3 — REPAIRS */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-ink">Repairs &amp; Estimate</h3>
              <span className="font-mono font-black text-brand text-base">{finalEstimate.toLocaleString()} MMK</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={repairSearch}
                onChange={(e) => setRepairSearch(e.target.value)}
                placeholder="Search repairs…"
                className="pl-9"
              />
            </div>

            {!deviceModel ? (
              <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line space-y-2">
                <Smartphone className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-ink">Select a device model first</p>
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>Go to Step 2</Button>
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line">
                No repair items found for this model.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 pb-1">
                {filteredCatalog.map((item) => {
                  const selected = selectedRepairs.find((r) => r.id === item.id);
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant={selected ? 'secondary' : 'outline'}
                      onClick={() => toggleRepair(item)}
                      className={`w-full min-h-12 justify-between gap-3 px-3.5 text-left ${
                        selected ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:bg-surface'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-ink">{item.name}</span>
                        {item.group && item.group !== item.name && (
                          <span className="block text-xs text-muted">{item.group}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-ink">{item.price.toLocaleString()} MMK</span>
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${selected ? 'bg-brand border-brand text-white' : 'border-line text-transparent'}`}>
                          <Check className="w-3 h-3" />
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}

            {repairsError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-500/10 rounded-lg px-2 py-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Add at least one repair to continue</p>
            )}

            {selectedRepairs.length > 0 && (
              <div className="bg-surface rounded-xl border border-line p-3 space-y-1.5">
                {selectedRepairs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-ink truncate">{r.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-muted">{Math.round(r.basePrice * (1 - r.discountPercent / 100)).toLocaleString()} MMK</span>
                      <Button type="button" variant="iconGhost" size="iconSm" onClick={() => toggleRepair({ id: r.id, name: r.name, price: r.basePrice } as ModelRepairCatalogItem)} aria-label={`Remove ${r.name}`}>
                        <X className="w-3.5 h-3.5 text-muted" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-line pt-2 flex justify-between items-center">
                  <span className="text-xs font-extrabold text-ink">Estimate</span>
                  <span className="font-mono font-black text-brand text-sm">{finalEstimate.toLocaleString()} MMK</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — DIAGNOSTICS & NOTES */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-ink leading-6">Diagnostics &amp; Notes</h3>
              <div className="flex items-center gap-1.5 text-xs font-bold leading-6">
                <span className="px-2 py-0.5 rounded-full bg-success/10 text-success-deep">{diagPassCount} Pass</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{diagFailCount} Fail</span>
              </div>
            </div>

            <div className="max-h-[260px] overflow-y-auto pr-2 space-y-1">
              {diagnosticKeys.map((name, idx) => {
                const status = beforeDiagnostics[name] || 'N/A';
                return (
                  <div key={name} className="flex items-center gap-2 p-2 rounded-lg border border-line bg-white">
                    <span className="w-5 text-center font-mono text-xs text-muted shrink-0">{idx + 1}</span>
                    <span className="flex-1 min-w-0 text-xs font-semibold text-ink truncate">{name}</span>
                    <div className="flex gap-1 shrink-0">
                      {(['Pass', 'Fail', 'N/A'] as const).map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="iconSm"
                          variant={status === s ? (s === 'Pass' ? 'secondary' : s === 'Fail' ? 'destructive' : 'outline') : 'ghost'}
                          onClick={() => setDiag(name, status === s ? 'N/A' : s)}
                          className={status === s ? (s === 'Pass' ? 'bg-success text-white' : s === 'Fail' ? 'bg-rose-600 text-white' : '') : ''}
                        >
                          {s === 'N/A' ? '—' : s === 'Pass' ? '✓' : '✕'}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Symptoms / Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Describe the issue or customer notes…"
                className="w-full bg-white border border-line rounded-xl p-3 text-sm text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none placeholder:text-muted"
              />
            </div>
          </div>
        )}

        {/* STEP 5 — REVIEW */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-extrabold text-ink">Review &amp; Create</h3>
            <div className="bg-surface rounded-xl border border-line p-4 space-y-2.5 text-xs">
              {[
                ['Customer', `${customerName} — ${customerPhone}`],
                ['Device', `${deviceModel || '—'}${deviceColor ? ' · ' + deviceColor : ''}`],
                ['Serial / IMEI', serialNumber || imei || '—'],
                ['Warranty', WARRANTY_OPTIONS.find((w) => w.days === warrantyDays)?.label || '—'],
                ['Diagnostics', `${diagPassCount} pass · ${diagFailCount} fail`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-muted shrink-0">{k}</span>
                  <span className="font-bold text-ink text-right break-words">{v}</span>
                </div>
              ))}
              <div className="border-t border-line pt-2.5 flex justify-between items-center">
                <span className="font-extrabold text-ink">Estimated Total</span>
                <span className="font-mono font-black text-brand text-base">{finalEstimate.toLocaleString()} MMK</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {selectedRepairs.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-brand-soft text-brand px-2.5 py-1 text-xs font-bold border border-brand/20">
                  <Wrench className="w-3 h-3" /> {r.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 border-t border-line pt-4">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 0} className="shrink-0">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex-1" />
        <span className="text-xs font-bold text-muted mr-1 hidden sm:inline">Step {step + 1} / {STEPS.length}</span>
        {step < 4 ? (
          <Button type="button" onClick={goNext} className="bg-brand hover:bg-brand-deep text-white font-black shrink-0">
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleRegister} disabled={isRegistering} className="bg-brand hover:bg-brand-deep text-white font-black shrink-0">
            {isRegistering ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Create Ticket</>
            )}
          </Button>
        )}
      </div>

      {/* Model chooser + barcode scanner */}
      <DeviceModelChooserModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedDevice={deviceModel}
        onSelectDevice={(m) => { setDeviceModel(m); setDeviceColor(''); setSelectedRepairs([]); setIsModelModalOpen(false); }}
      />
      <CameraQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(text) => {
          const digits = text.replace(/\D/g, '');
          if (digits.length === 15) setImei(digits.slice(0, 15));
          else setSerialNumber(text.toUpperCase());
          setIsScannerOpen(false);
        }}
        title="Scan Device Barcode / IMEI"
      />
    </div>
  );
};

/* Helper: existing-customer hint */
function matchedCustomerHint(customers: Customer[], phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return 'Enter phone to auto-match an existing customer.';
  const match = customers.find((c) => c.phone && c.phone.replace(/\D/g, '') === digits);
  return match ? `Existing customer matched: ${match.name}` : 'New customer — will be created on registration.';
}
