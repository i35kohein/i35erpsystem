import React, { useState, useEffect, useRef } from 'react';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { CameraQrScannerModal } from '../common/CameraQrScannerModal';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { useIsIpad } from '../../hooks/useIsIpad';
import {
  Check, 
  X, 
  Sparkles, 
  Smartphone, 
  CircleDot, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  CheckSquare,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  List,
  MapPin,
  Monitor, 
  Palette,
  Hand, 
  Scan, 
  Video, 
  Zap, 
  Volume2, 
  Activity, 
  Sun, 
  CreditCard, 
  Mic, 
  Battery, 
  Wifi, 
  Bluetooth, 
  Square, 
  Key, 
  Eye, 
  Compass, 
  RotateCcw, 
  AlertTriangle, 
  HelpCircle,
  Search,
  Wrench} from 'lucide-react';
import { 
  WorkOrder, 
  Customer, 
  Technician, 
  DiagnosticItemResult,
  SelectedRepairItem,
  SystemSettings
} from '../../types';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { Button , Input } from '../ui';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import {
  getAvailableColorsForModel, 
  WARRANTY_OPTIONS, 
  DIAGNOSTIC_NAMES,
  getRealisticColorStyle } from './deviceData';
import { toast } from '../../lib/toast';

export interface TicketPrefillData {
  model?: string;
  category?: string;
  service?: string;
  serialNumber?: string;
  imei?: string;
  selectedRepairs?: SelectedRepairItem[];
  price?: number;
  subtotal?: number;
  discountAmount?: number;
  discountPercent?: number;
  editWorkOrder?: WorkOrder | null;
}

interface CreateTicketSoloPageProps {
  workOrders: WorkOrder[];
  customers: Customer[];
  technicians: Technician[];
  systemSettings?: SystemSettings;
  priceCatalog?: ModelRepairPrice[];
  prefill?: TicketPrefillData | null;
  onSaveWorkOrder: (wo: WorkOrder) => void;
  onSelectPrintTag: (wo: WorkOrder) => void;
  onOpenAiAssistant: () => void;
  onViewRepairTickets: () => void;
  onCancelEdit?: () => void;
  embedded?: boolean;
  /** After quick-create: reopen the drawer in edit mode to add repairs/diagnostics. */
  onContinueEditing?: (wo: WorkOrder) => void;
}

const getDiagnosticIcon = (name: string) => {
  switch (name) {
    case 'Display': return Monitor;
    case 'Touch': return Hand;
    case 'Face ID': return Scan;
    case 'Main Camera': return Camera;
    case 'Front Camera': return Video;
    case 'Charger': return Zap;
    case 'Sound': return Volume2;
    case 'Vibrate': return Activity;
    case 'Flash Light': return Sun;
    case 'SIM': return CreditCard;
    case 'Microphone': return Mic;
    case 'Battery Health': return Battery;
    case 'WiFi': return Wifi;
    case 'Bluetooth': return Bluetooth;
    case 'Backglass': return Square;
    case 'Key': return Key;
    case 'Proximity': return Eye;
    case 'Compass': return Compass;
    case 'Gyroscope': return RotateCcw;
    case 'Panic Full Log': return AlertTriangle;
    case 'Other': default: return HelpCircle;
  }
};

export const CreateTicketSoloPage: React.FC<CreateTicketSoloPageProps> = ({
  workOrders,
  customers,
  systemSettings,
  priceCatalog,
  prefill,
  onSaveWorkOrder,
  onSelectPrintTag,
  onViewRepairTickets,
  onCancelEdit,
  embedded = false,
  onContinueEditing,
}) => {
  const [createdTicket, setCreatedTicket] = useState<WorkOrder | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  // Wizard mode: one step at a time (Customer → Device → Repairs → Review)
  const [wizardMode, setWizardMode] = useState(embedded); // drawer → wizard-first (3-step quick intake)
  const isIpad = useIsIpad();
  const [wizardStep, setWizardStep] = useState(0);
  const editWorkOrder = prefill?.editWorkOrder ?? null;
  const isEditMode = !!editWorkOrder;

  // Modals inside form
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [isRepairsModalOpen, setIsRepairsModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Inline validation errors — keyed by stable field id, rendered under the field + stepper flag
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => (prev[key] ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)) : prev));

  // Customer lookup match
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  // Customer Form State (Replaced Email with Town / City)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTown, setCustomerTown] = useState('');
  const [customerType, setCustomerType] = useState<'Retail' | 'B2B Corporate' | 'Wholesale Mail-In'>('Retail');

  // Device Form State - Default empty to force selecting model first if no prefill
  const [deviceModel, setDeviceModel] = useState<string>(editWorkOrder?.deviceModel || prefill?.model || '');
  const [deviceColor, setDeviceColor] = useState<string>(
    editWorkOrder?.deviceColor ||
      (prefill?.model ? (getAvailableColorsForModel(prefill.model)[0] || 'Standard') : '')
  );
  const [serialNumber, setSerialNumber] = useState(editWorkOrder?.serialNumber || '');
  const [imei, setImei] = useState(editWorkOrder?.imei || '');
  const [passcode, setPasscode] = useState(editWorkOrder?.passcode || '');
  const [findMyStatus, setFindMyStatus] = useState<'ON' | 'OFF' | 'UNKNOWN'>(editWorkOrder?.findMyStatus || 'OFF');

  const [warrantyDays, setWarrantyDays] = useState(editWorkOrder?.warrantyDays || systemSettings?.defaultWarrantyDays || 90);
  const [warrantyLabel, setWarrantyLabel] = useState(editWorkOrder?.warrantyLabel || `${systemSettings?.defaultWarrantyDays || 90} Days Standard Warranty`);
  const [customWarrantyInput, setCustomWarrantyInput] = useState('');

  // Default Repairs in MMK
  const [selectedRepairs, setSelectedRepairs] = useState<SelectedRepairItem[]>(editWorkOrder?.selectedRepairs || []);

  // Effect to process prefill from Price Catalog
  useEffect(() => {
    if (editWorkOrder) {
      setCustomerName(editWorkOrder.customerName || '');
      setCustomerPhone(editWorkOrder.customerPhone || '');
      setCustomerTown(editWorkOrder.customerAddress || '');
      setCustomerType(editWorkOrder.customerType || 'Retail');
      setDeviceModel(editWorkOrder.deviceModel || '');
      setDeviceColor(editWorkOrder.deviceColor || getAvailableColorsForModel(editWorkOrder.deviceModel)[0] || 'Standard');
      setSerialNumber(editWorkOrder.serialNumber || '');
      setImei(editWorkOrder.imei || '');
      setPasscode(editWorkOrder.passcode || '');
      setFindMyStatus(editWorkOrder.findMyStatus || 'OFF');
      setWarrantyDays(editWorkOrder.warrantyDays || systemSettings?.defaultWarrantyDays || 90);
      setWarrantyLabel(editWorkOrder.warrantyLabel || `${editWorkOrder.warrantyDays || systemSettings?.defaultWarrantyDays || 90} Days Standard Warranty`);
      setSelectedRepairs(editWorkOrder.selectedRepairs || []);
      setBeforeDiagnostics(editWorkOrder.beforeDiagnostics || beforeDiagnostics);
      setExtraReportedNotes(editWorkOrder.symptomsReported || '');
      setIntakePhotos(editWorkOrder.intakePhotos || []);
      return;
    }
    if (prefill) {
      if (prefill.model) {
        setDeviceModel(prefill.model);
        const colors = getAvailableColorsForModel(prefill.model);
        if (colors && colors.length > 0) {
          setDeviceColor(colors[0]);
        }
      }
      if (prefill.serialNumber) setSerialNumber(prefill.serialNumber);
      if (prefill.imei) setImei(prefill.imei);
      if (prefill.selectedRepairs && prefill.selectedRepairs.length > 0) {
        setSelectedRepairs(prefill.selectedRepairs);
      } else if (prefill.service) {
        setSelectedRepairs([
          {
            id: `prefill-${Date.now()}`,
            name: prefill.service,
            basePrice: prefill.subtotal || prefill.price || 0,
            discountPercent: prefill.discountPercent || 0,
            finalPrice: prefill.price || 0,
          }
        ]);
      }
    }
  }, [prefill, editWorkOrder, systemSettings?.defaultWarrantyDays]);

  // Price Catalog search & group filter state
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  // Dynamic Price Catalog lookup for current selected device model
  const catalogItemsForModel = getModelPriceCatalogItems(deviceModel, priceCatalog);
  const matchedModelName = catalogItemsForModel.length > 0 ? catalogItemsForModel[0].modelMatchedName : deviceModel;

  const toggleCatalogRepair = (item: ModelRepairCatalogItem) => {
    const exists = selectedRepairs.some(
      (r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase()
    );
    if (exists) {
      setSelectedRepairs((prev) =>
        prev.filter((r) => r.id !== item.id && r.name.toLowerCase() !== item.name.toLowerCase())
      );
    } else {
      setSelectedRepairs((prev) => [
        ...prev,
        {
          id: item.id,
          name: item.name,
          basePrice: item.price,
          discountPercent: 0,
          finalPrice: item.price,
        },
      ]);
    }
  };

  const [extraReportedNotes, setExtraReportedNotes] = useState('');

  // 21 Diagnostics with comment notes
  const [beforeDiagnostics, setBeforeDiagnostics] = useState<DiagnosticItemResult[]>(
    DIAGNOSTIC_NAMES.map((name, idx) => ({
      id: `diag-${idx}`,
      name,
      status: 'N/A',
      note: ''
    }))
  );

  // Photos
  const [intakePhotos, setIntakePhotos] = useState<string[]>([]);

  // Available real colors for current selected device
  const availableRealColors = getAvailableColorsForModel(deviceModel);

  // Handle Model Change -> Automatically update device model & default color to first real available color
  const handleSelectModel = (model: string) => {
    setDeviceModel(model);
    const colors = getAvailableColorsForModel(model);
    if (colors && colors.length > 0) {
      setDeviceColor(colors[0]);
    }
    setIsModelModalOpen(false);
  };

  // Handle Phone change & check customer match
  const handlePhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    const digits = phone.replace(/\D/g, '');
    const normalize = (p: string) => (p || '').replace(/\D/g, '');
    if (digits.length >= 7) {
      // Exact full-number match first; then tolerant last-9 match (handles
      // 09… / 959… / +959… prefixes). Never substring-match — that auto-filled
      // unrelated customers (e.g. "Ko Tun") from just a few typed digits.
      const exact = customers.find((c) => normalize(c.phone) === digits);
      const found = exact || (digits.length >= 9
        ? customers.find((c) => normalize(c.phone).slice(-9) === digits.slice(-9))
        : undefined);
      if (found) {
        setMatchedCustomer(found);
        setCustomerName(found.name);
        // Do NOT stuff company into Town/City — a company name is not a town.
        // The Customer type has no address/town field yet; leave Town for manual
        // entry (or prefill from a future Customer.city field).
        setCustomerType(found.type);
      } else {
        setMatchedCustomer(null);
      }
    } else {
      setMatchedCustomer(null);
    }
  };

  // Discount & Totals calculation in MMK
  const baseTotal = selectedRepairs.reduce((sum, item) => sum + item.basePrice, 0);
  const finalEstimate = selectedRepairs.reduce((sum, item) => sum + item.finalPrice, 0);
  const savedAmount = Math.max(0, baseTotal - finalEstimate);
  const repairCount = selectedRepairs.length;
  const overallDiscountPercent = baseTotal > 0 ? Math.round((savedAmount / baseTotal) * 100) : 0;

  const updateRepairDiscount = (repairId: string, newDiscountPercent: number) => {
    setSelectedRepairs(prev => prev.map(item => {
      if (item.id === repairId) {
        const clampedPercent = Math.min(100, Math.max(0, newDiscountPercent));
        const finalPrice = Math.round(item.basePrice * (1 - clampedPercent / 100));
        return { ...item, discountPercent: clampedPercent, finalPrice };
      }
      return item;
    }));
  };

  

  // Submit / Register Device — validates, then shows inline errors + scrolls to the first one
  const handleRegisterDevice = () => {
    if (isRegistering) return;
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs['field-customer-name'] = 'Customer name is required.';
    if (!customerPhone.trim()) errs['field-customer-phone'] = 'Phone number is required.';
    if (!deviceModel.trim()) errs['intake-device'] = 'Select a device model to continue.';
    if (imei.trim() && imei.trim().length !== 15) errs['field-imei'] = 'IMEI must be exactly 15 digits.';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const sectionMap: Record<string, string> = {
        'field-customer-name': 'intake-customer',
        'field-customer-phone': 'intake-customer',
        'intake-device': 'intake-device',
        'field-imei': 'intake-device',
      };
      scrollToSection(sectionMap[firstKey] || 'intake-customer');
      toast.error(Object.values(errs)[0], 'Please Complete the Form');
      return;
    }
    // Duplicate-device guard: warn if this IMEI/serial already has an open ticket
    const openTickets = workOrders.filter(
      (w) => !w.isArchived && ['Receive', 'In Progress', 'Pending'].includes(w.status) && w.id !== editWorkOrder?.id
    );
    const dupImei = imei.trim() ? openTickets.find((w) => (w.imei || '').trim() === imei.trim()) : null;
    const dupSerial = serialNumber.trim() ? openTickets.find((w) => (w.serialNumber || '').trim() === serialNumber.trim()) : null;
    const dupTicket = dupImei || dupSerial;
    if (dupTicket) {
      const dupKey = dupImei ? `IMEI ${imei.trim()}` : `serial ${serialNumber.trim()}`;
      const proceed = window.confirm(
        `⚠️ Duplicate device detected!\n\n${dupKey} already has an open ticket:\n  ${dupTicket.orderNumber} — ${dupTicket.deviceModel} (${dupTicket.customerName})\n\nCreate this new intake anyway?`
      );
      if (!proceed) {
        setIsRegistering(false);
        return;
      }
    }

    setIsRegistering(true);

    const prefix = systemSettings?.ticketPrefix || 'WO-';
    const baseWorkOrder = editWorkOrder || null;
    // Order numbers must never be reused: derive from the highest existing number
    // across ALL tickets (never the filtered list length) + current year.
    const maxExistingNum = workOrders.reduce((max, wo) => {
      const match = /(\d+)\s*$/.exec(wo.orderNumber || '');
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1000);
    // Collision guard: two rapid submits (or a stale workOrders prop) could compute
    // the same next number. Keep bumping until the number is actually unused.
    let nextNum = maxExistingNum + 1;
    const usedNumbers = new Set(workOrders.map((wo) => wo.orderNumber).filter(Boolean));
    const year = new Date().getFullYear();
    while (usedNumbers.has(`${prefix}${year}-${nextNum}`)) {
      nextNum += 1;
    }
    const newOrderNumber = baseWorkOrder?.orderNumber || `${prefix}${year}-${nextNum}`;
    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

    const newWorkOrder: WorkOrder = {
      ...(baseWorkOrder || {}),
      id: baseWorkOrder?.id || `wo-${Date.now()}`,
      orderNumber: newOrderNumber,
      customerId: baseWorkOrder?.customerId || (matchedCustomer ? matchedCustomer.id : `cust-${Date.now()}`),
      customerName,
      customerPhone,
      customerEmail: baseWorkOrder?.customerEmail || '',
      customerAddress: customerTown || '',
      customerType,
      deviceCategory: baseWorkOrder?.deviceCategory || (deviceModel.includes('iPad') ? 'iPad' : deviceModel.includes('MacBook') ? 'MacBook' : 'iPhone'),
      deviceModel,
      // No fake auto-generated serial/IMEI — left empty so the real values are entered manually.
      serialNumber: serialNumber.trim() || '',
      imei: imei.trim() || '',
      deviceColor,
      passcode: passcode || 'None',
      findMyStatus,
      status: baseWorkOrder?.status || 'Receive',
      priority: baseWorkOrder?.priority || 'Normal',
      // New intake tickets stay unassigned until the repair coordinator assigns a technician.
      assignedTechId: baseWorkOrder?.assignedTechId || '',
      assignedTechName: baseWorkOrder?.assignedTechName || '',
      serviceType: baseWorkOrder?.serviceType || 'Standard Modular',
      selectedRepairs,
      beforeDiagnostics: baseWorkOrder?.beforeDiagnostics || beforeDiagnostics.map((d) => ({ ...d, note: (d.note || '').trim() || undefined })),
      symptomsReported: extraReportedNotes.trim() || baseWorkOrder?.symptomsReported || '',
      diagnosticResult: beforeDiagnostics.some(d => d.status === 'Pass' || d.status === 'Fail')
        ? 'Initial 21-point repair diagnostic completed during intake.'
        : 'Diagnostic Pending',
      lineItems: selectedRepairs.map(r => ({
        id: `li-${r.id}`,
        description: r.name,
        unitCost: Math.round(r.basePrice * 0.5),
        unitPrice: r.finalPrice,
        quantity: 1,
        isLabor: true
      })),
      subtotal: baseTotal,
      depositAmount: baseWorkOrder?.depositAmount || 0,
      discountAmount: savedAmount,
      taxAmount: baseWorkOrder?.taxAmount || 0,
      totalAmount: finalEstimate,
      isPaid: baseWorkOrder?.isPaid || false,
      paidAmount: baseWorkOrder?.paidAmount,
      paymentMethod: baseWorkOrder?.paymentMethod,
      warrantyDays,
      warrantyLabel,
      intakePhotos: baseWorkOrder?.intakePhotos || intakePhotos,
      repairLogs: baseWorkOrder?.repairLogs || [
        {
          id: `log-${Date.now()}`,
          timestamp: formattedDate,
          author: 'Intake Desk',
          note: `Repair ticket ${newOrderNumber} created. Device: ${deviceModel} (${deviceColor}).`,
          statusChange: 'Receive'
        }
      ],
      createdAt: baseWorkOrder?.createdAt || nowIso,
      updatedAt: nowIso,
      estimatedCompletion: baseWorkOrder?.estimatedCompletion || new Date(Date.now() + 86400000).toISOString(),
      intakeChecklist: baseWorkOrder?.intakeChecklist || (() => {
        // No fabricated values: derive from the real 21-point diagnostics.
        const statusOf = (name: string) => beforeDiagnostics.find((d) => d.name === name)?.status;
        const passed = (name: string) => statusOf(name) === 'Pass';
        return {
          powerOn: passed('Display'),
          screenDisplay: passed('Display'),
          touchGrid: passed('Touch'),
          faceIdOrTouchId: passed('Face ID'),
          trueTonePresent: false, // no True Tone diagnostic item at intake
          frontCamera: passed('Front Camera'),
          rearCamera: passed('Main Camera'),
          microphones: passed('Microphone'),
          speakers: passed('Sound'),
          wifiBluetooth: passed('WiFi') || passed('Bluetooth'),
          cellularSignal: passed('SIM'),
          wirelessCharging: false, // no wireless-charging diagnostic item at intake
          liquidIndicatorTriggered: false, // only set when a liquid claim is logged
          batteryHealthPercent: undefined, // real % belongs in the Battery Health diagnostic note
          physicalDamageNotes: extraReportedNotes.trim() || '',
        };
      })(),
    };

    onSaveWorkOrder(newWorkOrder);
    setCreatedTicket(newWorkOrder);
    setIsRegistering(false);
  };

  const handleResetForm = () => {
    // FULL reset — never leak the previous ticket's device, color, warranty,
    // diagnostics or photos into the next intake (stale Fail marks are a data risk).
    setCreatedTicket(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerTown('');
    setCustomerType('Retail');
    setDeviceModel('');
    setDeviceColor('');
    setSerialNumber('');
    setImei('');
    setPasscode('');
    setFindMyStatus('OFF');
    setWarrantyDays(systemSettings?.defaultWarrantyDays || 90);
    setWarrantyLabel(`${systemSettings?.defaultWarrantyDays || 90} Days Standard Warranty`);
    setCustomWarrantyInput('');
    setSelectedRepairs([]);
    setExtraReportedNotes('');
    setBeforeDiagnostics(
      DIAGNOSTIC_NAMES.map((name, idx) => ({ id: `diag-${idx}`, name, status: 'N/A' as const, note: '' }))
    );
    setIntakePhotos([]);
    setMatchedCustomer(null);
    setFieldErrors({});
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (createdTicket) {
    const selectedColorStyle = getRealisticColorStyle(createdTicket.deviceColor);

    return (
      <div className={`mx-auto space-y-6 ${embedded ? 'w-full px-4 py-4 sm:px-5' : `py-6 ${isIpad ? 'max-w-6xl' : 'max-w-3xl xl:max-w-6xl'}`}`}>
        <div className="bg-white border border-line-strong rounded-2xl p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 bg-[#E8F8EE] text-[#1E7E34] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-sm font-extrabold text-brand px-3 py-1 bg-[#E5F1FF] rounded-full">
              {createdTicket.orderNumber}
            </span>
            <h1 className="text-2xl font-black text-ink pt-2">
              {isEditMode ? 'Repair Ticket Successfully Updated!' : 'Repair Ticket Successfully Created!'}
            </h1>
            <p className="text-xs text-muted">
              {isEditMode ? 'Updated' : 'Registered'} {createdTicket.deviceModel} for {createdTicket.customerName}
            </p>
          </div>

          <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-line-strong text-left text-xs space-y-3 max-w-md mx-auto">
            <div className="flex justify-between items-center">
              <span className="text-muted">Customer Phone:</span>
              <span className="font-semibold text-ink">{createdTicket.customerPhone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Town / City:</span>
              <span className="font-bold text-ink flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-brand" />
                <span>{createdTicket.customerAddress || customerTown || '—'}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Device Color:</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-ink">{createdTicket.deviceColor}</span>
                <span 
                  className={`w-5 h-5 rounded-full border border-white shadow-md ${selectedColorStyle.border}`}
                  style={{ background: selectedColorStyle.gradient, boxShadow: selectedColorStyle.shadow }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Warranty:</span>
              <span className="font-semibold text-ink">{createdTicket.warrantyLabel}</span>
            </div>
            <div className="flex justify-between items-center border-t border-line-strong pt-2.5">
              <span className="text-muted font-bold">Total Estimate:</span>
              <span className="font-black text-brand text-base">{createdTicket.totalAmount.toLocaleString()} MMK</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!isEditMode && (
              <>
              {onContinueEditing && (
                <Button
                  type="button"
                  onClick={() => onContinueEditing(createdTicket)}
                  variant="outline"
                  className="w-full sm:w-auto border-line-strong hover:bg-slate-50"
                >
                  <Wrench className="w-4 h-4 text-brand shrink-0" />
                  <span className="truncate">Add Repairs & Details</span>
                </Button>
              )}
              <Button
                type="button"
                onClick={() => onSelectPrintTag(createdTicket)}
                variant="outline"
                className="w-full sm:w-auto border-line-strong hover:bg-slate-50"
              >
                <Printer className="w-4 h-4 text-brand shrink-0" />
                <span className="truncate">Print Sticker Tag Voucher</span>
              </Button>
              </>
            )}

            <Button
              type="button"
              onClick={onViewRepairTickets}
              className="w-full sm:w-auto bg-brand hover:bg-[#0077ED] text-white"
            >
              <List className="w-4 h-4 shrink-0" />
              <span className="truncate">{isEditMode ? 'Back to Ticket List' : 'View in Work Orders List'}</span>
            </Button>

            <Button
              type="button"
              onClick={isEditMode && onCancelEdit ? onCancelEdit : handleResetForm}
              variant="secondary"
              className="w-full sm:w-auto border border-line-strong"
            >
              {isEditMode ? 'Discard Changes' : '+ Create Another Ticket'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeColorStyle = getRealisticColorStyle(deviceColor);

  return (
    <div className={`mx-auto space-y-3 ${embedded ? 'w-full px-4 pb-6 pt-4 sm:px-5' : `pb-5 ${isIpad ? 'max-w-6xl' : 'max-w-3xl xl:max-w-6xl'}`}`}>
      {/* Top Banner Header */}
      <div className="module-toolbar bg-white px-3.5 py-3 rounded-xl border border-line shadow-2xs flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            {/* Non-heading on purpose: the App topbar already renders the page H1 — one H1 per page for a11y */}
            <div className="text-sm font-extrabold text-ink truncate">{isEditMode ? 'Edit Intake Ticket' : 'New Intake Ticket Registration'}</div>
            <p className="text-xs text-muted truncate">{isEditMode ? 'Update customer, device and repair details' : 'Customer, device, repair estimate and intake diagnostics'}</p>
          </div>
        </div>
        <Button
          onClick={onViewRepairTickets}
          className="text-xs text-brand font-bold flex items-center gap-1 hover:bg-brand-soft rounded-lg px-2 py-1.5 shrink-0"
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="hidden sm:inline">{isEditMode ? 'Back to Ticket' : 'Back to Tickets'}</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-line rounded-xl p-4 shadow-xs space-y-4">

        {/* Stepper removed per Ko Hein 2026-08-05 — jump anchors (intake-customer/device/repairs/diagnostics)
           are kept for validation-error scrolling; scroll-mt-40 still applies. */}

        {/* Form mode toggle: Standard (all sections) vs Wizard (step by step) */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-2.5 shadow-2xs">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-ink">Ticket Form Mode</p>
            <p className="text-xs text-muted truncate">
              {wizardMode ? 'One step at a time — press Next to continue' : 'All sections visible on one page'}
            </p>
          </div>
          <div className="flex shrink-0 items-center rounded-lg border border-line bg-surface p-0.5">
            <Button
              type="button"
              onClick={() => { setWizardMode(false); setWizardStep(0); }}
              className={`rounded-md px-3 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${!wizardMode ? 'bg-white text-brand shadow-xs' : 'text-muted hover:text-ink'}`}
            >
              Standard
            </Button>
            <Button
              type="button"
              onClick={() => setWizardMode(true)}
              className={`rounded-md px-3 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${wizardMode ? 'bg-white text-brand shadow-xs' : 'text-muted hover:text-ink'}`}
            >
              Wizard
            </Button>
          </div>
        </div>

        {/* Desktop 2-column layout for steps 1–4 (Customer/Device left, Color/Warranty + Serial/IMEI right) */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">

        {/* STEP 1: Customer Information */}
        <div id="intake-customer" className={`p-3 bg-[#F8F9FA] rounded-xl border border-line space-y-2.5 scroll-mt-40 ${wizardMode && wizardStep !== 0 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black">1</span>
              <span className="text-sm">Customer Information</span>
            </h3>
            {matchedCustomer && (
              <span className="text-xs bg-[#EAF8ED] text-[#15803D] px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1 border border-success/20 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Editing Existing Ticket' : 'Existing Customer Profile Matched!'}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="field-customer-phone" className="flex items-center justify-between text-muted mb-1 font-medium">
                <span>Phone Number *</span>
                {customerPhone.replace(/\D/g, '').length > 0 && (
                  <span className="text-xs font-mono font-bold text-muted">
                    {customerPhone.replace(/\D/g, '').length} digit(s)
                  </span>
                )}
              </label>
              <Input
                id="field-customer-phone"
                type="text"
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors['field-customer-phone'])}
                value={customerPhone}
                onChange={(e) => { handlePhoneChange(e.target.value); clearFieldError('field-customer-phone'); }}
                placeholder="e.g. 09-123456789 or 09-987654321"
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none transition-all ${
                  fieldErrors['field-customer-phone']
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/20'
                }`}
              />
              {fieldErrors['field-customer-phone'] && (
                <p role="alert" className="mt-1 text-xs font-semibold text-[#DC2626]">{fieldErrors['field-customer-phone']}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-customer-name" className="block text-muted mb-1 font-medium">Customer Name *</label>
              <Input
                id="field-customer-name"
                type="text"
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors['field-customer-name'])}
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); clearFieldError('field-customer-name'); }}
                placeholder="e.g. Mg Mg / Daw Hla (Full Name)"
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none transition-all ${
                  fieldErrors['field-customer-name']
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/20'
                }`}
              />
              {fieldErrors['field-customer-name'] && (
                <p role="alert" className="mt-1 text-xs font-semibold text-[#DC2626]">{fieldErrors['field-customer-name']}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-customer-town" className="block text-muted mb-1 font-medium">Town / City</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-brand absolute left-3 top-2.5" />
                <Input
                  id="field-customer-town"
                  type="text"
                  value={customerTown}
                  onChange={(e) => setCustomerTown(e.target.value)}
                  placeholder="e.g. Yangon, Mandalay, Bago"
                  className="w-full bg-white border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none font-semibold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-muted mb-1 font-medium">Customer Type</label>
              <CustomDropdownMenu
                value={customerType}
                onChange={(value) => setCustomerType(value as 'Retail' | 'B2B Corporate' | 'Wholesale Mail-In')}
                options={[
                  { value: 'Retail', label: 'Retail Walk-In' },
                  { value: 'B2B Corporate', label: 'B2B Corporate Account' },
                  { value: 'Wholesale Mail-In', label: 'Wholesale Mail-In Partner' },
                ]}
                menuAlign="left"
                className="w-full"
                buttonClassName="w-full bg-white border-line rounded-xl h-9 px-3 text-xs"
              />
            </div>
          </div>
        </div>

        {/* STEP 2: Choose Device Model */}
        <Button
          type="button"
          id="intake-device"
          onClick={() => setIsModelModalOpen(true)}
          className={`w-full text-left p-3 bg-surface/80 rounded-xl border border-line space-y-2.5 cursor-pointer hover:border-brand/50 hover:bg-surface transition-all group scroll-mt-40 flex flex-col ${wizardMode && wizardStep !== 1 ? 'hidden' : ''}`}
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs group-hover:scale-105 transition-transform">2</span>
              <span>Apple Hardware Device Model</span>
            </h3>
            <span className="text-xs font-bold text-brand group-hover:underline">
              {deviceModel ? 'Change Model' : 'Select Model'}
            </span>
          </div>

          {!deviceModel ? (
            <div className="grow flex items-center justify-between bg-amber-50 p-2.5 rounded-lg border border-dashed border-amber-300 text-xs shadow-2xs group-hover:border-amber-400">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                <div>
                  <span className="font-extrabold text-amber-900 text-sm block">Choose Device Model First</span>
                  <span className="text-xs text-amber-700">Click to select Apple iPhone, iPad, MacBook, Watch, or Mac</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-white bg-amber-600 group-hover:bg-amber-700 px-3 py-1.5 rounded-lg shadow-2xs transition-colors shrink-0">
                Choose Model
              </span>
            </div>
          ) : (
            <div className="grow flex items-center justify-between bg-white p-3 rounded-xl border border-line text-xs shadow-sm group-hover:shadow-md transition-shadow">
              <div>
                <span className="text-muted">Selected Model: </span>
                <span className="font-extrabold text-ink ml-1 text-sm">{deviceModel}</span>
              </div>
              <span className="text-xs text-brand font-bold bg-brand-soft px-2.5 py-0.5 rounded-full border border-brand/20">
                Real Model Verified
              </span>
            </div>
          )}
        </Button>

        {/* STEP 3 & STEP 4: Color (REAL DEVICE COLOR BIG CIRCLE WITH SHADOW) & Warranty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* STEP 2b: Real Official Color Selection — only after a model is chosen */}
          {deviceModel ? (
            <Button
              type="button"
              onClick={() => setIsColorModalOpen(true)}
              className="w-full text-left p-3 bg-[#F8F9FA] rounded-xl border border-line space-y-2.5 cursor-pointer hover:border-brand/50 transition-all group flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-brand/15 text-brand-deep flex items-center justify-center text-xs font-black group-hover:scale-105 transition-transform border border-brand/30">2a</span>
                  <span className="text-xs">Realistic Color ({availableRealColors.length} Palette)</span>
                </h3>
                <span className="text-xs font-bold text-brand group-hover:underline">Change</span>
              </div>

              <div className="grow bg-white p-3.5 rounded-xl border border-line text-xs font-bold text-ink flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="block text-xs text-muted">Selected Color:</span>
                  <span className="text-sm font-extrabold text-ink">{deviceColor}</span>
                </div>
                <div 
                  className={`w-11 h-11 rounded-full border-2 border-white shadow-xs ${activeColorStyle.border}`}
                  style={{ background: activeColorStyle.gradient }}
                />
              </div>
            </Button>
          ) : (
            <div className="w-full p-3 bg-[#F8F9FA] rounded-xl border border-line space-y-2.5 flex flex-col">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-brand/15 text-brand-deep flex items-center justify-center text-xs font-black border border-brand/30">2a</span>
                  <span className="text-xs">Realistic Color (0 Palette)</span>
                </h3>
              </div>
              <div className="grow bg-white p-3.5 rounded-xl border border-dashed border-line-strong flex flex-col items-center justify-center text-center space-y-1.5 shadow-2xs">
                <Palette className="w-4 h-4 text-[#B6B6BC]" />
                <span className="text-xs text-muted font-semibold leading-snug">
                  Select a device model first<br />to see real color options
                </span>
              </div>
            </div>
          )}

          {/* STEP 2c: Warranty Selection */}
          <Button
            type="button"
            onClick={() => setIsWarrantyModalOpen(true)}
            className="w-full text-left p-3 bg-[#F8F9FA] rounded-xl border border-line space-y-2.5 cursor-pointer hover:border-brand/50 transition-all group flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-brand/15 text-brand-deep flex items-center justify-center text-xs font-black group-hover:scale-105 transition-transform border border-brand/30">2b</span>
                <span className="text-xs">Warranty Policy</span>
              </h3>
              <span className="text-xs font-bold text-brand group-hover:underline">Change</span>
            </div>

            <div className="grow bg-white p-3.5 rounded-xl border border-line text-xs font-bold text-ink flex items-center justify-between shadow-2xs group-hover:shadow-sm transition-shadow">
              <div>
                <span className="block text-xs text-muted">Covered Warranty:</span>
                <span className="text-sm font-extrabold text-ink">{warrantyLabel}</span>
              </div>
              <div className="p-2 bg-[#EAF8ED] text-success rounded-xl shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </Button>
        </div>

        {/* Serial / IMEI Input */}
        <div className="p-3 bg-surface/80 rounded-xl border border-line space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2 min-w-0">
              <Smartphone className="w-4 h-4 text-brand shrink-0" />
              <span className="truncate">Serial Number &amp; IMEI Information</span>
            </h3>
            <div className="flex items-center space-x-2 shrink-0">
            <Button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="bg-ink hover:bg-black text-white flex items-center space-x-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-brand" />
              <span>Scan QR / Barcode</span>
            </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="field-serial" className="block text-muted mb-1 font-medium">Serial Number</label>
              <Input
                id="field-serial"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                placeholder="e.g. C02M2MAX2023 or F2LXK09PN6T"
                className="w-full bg-white border border-line rounded-xl px-3 py-2.5 text-sm font-mono text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="field-imei" className="flex items-center justify-between gap-2 text-muted mb-1 font-medium">
                <span>IMEI Number</span>
                <span className={`shrink-0 text-xs font-mono font-bold ${imei.length === 15 ? 'text-success' : 'text-muted'}`}>{imei.length}/15</span>
              </label>
              <Input
                id="field-imei"
                type="text"
                inputMode="numeric"
                value={imei}
                maxLength={15}
                aria-invalid={Boolean(fieldErrors['field-imei'])}
                onChange={(e) => { setImei(e.target.value.replace(/\D/g, '')); clearFieldError('field-imei'); }}
                placeholder="e.g. 358921102938102"
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm font-mono text-ink focus:outline-none transition-all ${
                  imei.length > 0 && imei.length !== 15
                    ? 'border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-300/30'
                    : imei.length === 15
                    ? 'border-success/60 focus:border-success focus:ring-2 focus:ring-success/20'
                    : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/20'
                }`}
              />
              {fieldErrors['field-imei'] && (
                <p role="alert" className="mt-1 text-xs font-semibold text-[#DC2626]">{fieldErrors['field-imei']}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="field-passcode" className="block text-muted mb-1 font-medium">Device Passcode</label>
              <Input
                id="field-passcode"
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode / PIN"
                className="w-full bg-white border border-line rounded-xl px-3 py-2.5 text-sm font-mono text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all"
              />
            </div>
          </div>

        </div>

        </div>

        {/* STEP 3 (Phase 3): Choose Available Repairs (MMK CURRENCY) */}
        <div id="intake-repairs" className={`p-3 bg-surface/80 rounded-xl border border-line space-y-2.5 scroll-mt-40 ${wizardMode && wizardStep !== 2 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs">3</span>
              <span>Available Repairs Selection (MMK Pricing)</span>
            </h3>
            {deviceModel && (
              <Button
                type="button"
                onClick={() => setIsRepairsModalOpen(true)}
                className="bg-brand text-white hover:bg-[#0077ED]"
              >
                + Add Repairs ({selectedRepairs.length})
              </Button>
            )}
          </div>

          {!deviceModel ? (
            <div className="p-8 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/80 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs animate-bounce">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-amber-950">Choose Device Model First</h3>
                <p className="text-xs text-amber-800 max-w-md mt-1">Select a device model to see its repair services and prices.</p>
              </div>
              <Button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="bg-brand hover:bg-brand/90 text-white flex items-center space-x-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>Choose Device Model</span>
              </Button>
            </div>
          ) : (
            <>
              {savedAmount > 0 && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-extrabold shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                    <span>Catalog Discount Auto-Applied:</span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-xs font-black font-mono">
                      {overallDiscountPercent}% OFF ({savedAmount.toLocaleString()} MMK Discount)
                    </span>
                  </div>
                  <span className="text-xs text-emerald-700 font-mono hidden sm:inline">
                    Base: <span className="line-through">{baseTotal.toLocaleString()} MMK</span> → <span className="font-extrabold text-emerald-800">{finalEstimate.toLocaleString()} MMK</span>
                  </span>
                </div>
              )}

              {/* Selected Repairs Table */}
              <div className="space-y-2.5">
                {selectedRepairs.map((repair) => (
                  <div
                    key={repair.id}
                    className="p-3.5 bg-white border border-line rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-xs hover:border-brand/30 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-brand-soft text-brand p-1.5 rounded-lg">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-extrabold text-ink text-sm">{repair.name}</span>
                        <span className="block text-muted text-xs font-medium">Base Price: {repair.basePrice.toLocaleString()} MMK</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end md:space-x-4 bg-[#F8F9FA] md:bg-transparent p-2 md:p-0 rounded-lg">
                      <div className="flex items-center space-x-2 bg-white md:bg-transparent px-2 py-1 md:p-0 border border-line md:border-none rounded-lg">
                        <span className="text-xs text-muted font-semibold">Discount:</span>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={repair.discountPercent}
                            onChange={(e) => updateRepairDiscount(repair.id, Number(e.target.value))}
                            className="w-16 bg-surface border border-line-strong rounded-lg px-2 py-1.5 font-bold text-center text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all"
                          />
                          <span className="absolute right-2 top-1.5 text-muted text-xs font-bold pointer-events-none">%</span>
                        </div>
                      </div>

                      <div className="font-black text-brand text-sm min-w-[100px] text-right">
                        {repair.finalPrice.toLocaleString()} MMK
                      </div>

                      <Button
                        onClick={() => setSelectedRepairs(prev => prev.filter(r => r.id !== repair.id))}
                        className="bg-white md:bg-transparent border border-line md:border-none text-muted hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {selectedRepairs.length === 0 && (
                  <div className="p-8 text-center bg-white border border-dashed border-line-strong rounded-xl text-muted text-xs font-medium">
                    No repairs selected. Click "+ Add Repairs" to build the estimate.
                  </div>
                )}
              </div>

              {/* Discount & Estimate Summary Box in MMK */}
              <div className="bg-[#E5F1FF]/60 border border-brand/30 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-center text-xs shadow-sm">
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-xs text-muted font-semibold">Repairs Count</span>
                  <span className="font-extrabold text-ink text-sm">{repairCount} items</span>
                </div>
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-xs text-muted font-semibold">Base Total</span>
                  <span className="font-extrabold text-ink text-sm">{baseTotal.toLocaleString()} MMK</span>
                </div>
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-xs text-muted font-semibold">Saved Amount</span>
                  <span className="font-extrabold text-success text-sm">{savedAmount.toLocaleString()} MMK</span>
                </div>
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-xs text-muted font-semibold">Overall Discount</span>
                  <span className="font-extrabold text-[#AF52DE] text-sm">{overallDiscountPercent}%</span>
                </div>
                <div className="col-span-2 md:col-span-2 bg-brand text-white rounded-xl p-2.5 flex flex-col justify-center">
                  <span className="block text-xs opacity-90 uppercase font-bold tracking-wider">Final Estimate</span>
                  <span className="font-black text-base">{finalEstimate.toLocaleString()} MMK</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* STEP 4A (Phase 4): Intake Notes */}
        <div className="p-3 bg-[#F8F9FA] rounded-xl border border-line-strong space-y-2.5">
          <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2 border-b border-line-strong pb-2">
            <span className="px-1.5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black">4A</span>
            <span>Intake Notes & Customer Symptoms</span>
          </h3>

          <label htmlFor="field-notes" className="sr-only">Customer symptoms or intake notes</label>
          <textarea
            id="field-notes"
            rows={2}
            value={extraReportedNotes}
            onChange={(e) => setExtraReportedNotes(e.target.value)}
            placeholder="Enter customer symptoms or intake notes"
            className="w-full bg-white border border-line-strong rounded-xl p-3.5 text-sm text-ink focus:border-brand"
          />
        </div>

        {/* STEP 4B (Phase 4): 21-Point Repair Diagnostic Inspection with Comment Box & Dedicated Icons */}
        <div id="intake-diagnostics" className={`p-3 bg-surface rounded-xl border border-line space-y-2.5 scroll-mt-40 ${wizardMode && wizardStep !== 3 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
              <span className="px-1.5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black">4B</span>
              <span>21-Point Repair Diagnostic List</span>
            </h3>
            <div className="flex items-center space-x-2">
              <span className="hidden md:inline-flex items-center space-x-1.5 text-xs font-bold">
                <span className="bg-[#16A34A]/10 text-[#15803D] px-2 py-1 rounded-full">✓ {beforeDiagnostics.filter(d => d.status === 'Pass').length} Pass</span>
                <span className="bg-[#DC2626]/10 text-[#DC2626] px-2 py-1 rounded-full">✕ {beforeDiagnostics.filter(d => d.status === 'Fail').length} Fail</span>
              </span>
              <Button 
                onClick={() => {
                  if (beforeDiagnostics.some(d => d.status === 'Pass' || d.status === 'Fail')) {
                    // Never silently overwrite a technician's Pass/Fail verdicts with a bulk Pass.
                    if (!window.confirm('Mark ALL 21 items as Pass? This will overwrite existing Pass/Fail verdicts.')) return;
                  }
                  setBeforeDiagnostics(prev => prev.map(d => ({ ...d, status: 'Pass' })));
                }}
                className="text-xs text-white font-bold bg-success hover:bg-[#28A745] px-3 py-2 min-h-10 rounded-full shadow-xs transition-colors"
              >
                Mark All Pass
              </Button>
              <Button 
                onClick={() => setBeforeDiagnostics(prev => prev.map(d => ({ ...d, status: 'N/A' })))}
                className="text-xs text-ink font-bold bg-surface hover:bg-line px-3 py-2 min-h-10 rounded-full shadow-xs transition-colors border border-line-strong"
              >
                Mark All N/A
              </Button>
              <Button 
                onClick={() => setBeforeDiagnostics(prev => prev.map(d => ({ ...d, status: 'N/A' as const, note: '' })))}
                title="Reset all statuses and comments"
                className="text-xs text-muted font-bold bg-white hover:bg-line px-3 py-2 min-h-10 rounded-full transition-colors border border-line-strong"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5 text-xs">
            {beforeDiagnostics.map((item, idx) => {
              const IconComp = getDiagnosticIcon(item.name);

              return (
                <div key={item.id} className="p-2.5 bg-white border border-line rounded-xl space-y-1.5 text-xs shadow-xs hover:border-brand/50 transition-all">
                  <div className="font-bold text-ink flex justify-between items-center">
                    <div className="flex items-center space-x-1.5 truncate">
                      <div className="w-5 h-5 rounded-md bg-surface text-brand flex items-center justify-center shrink-0">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                        <span className="text-xs font-extrabold truncate">{idx + 1}. {item.name}</span>
                    </div>

                    <span className={`text-xs font-black px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0 shadow-2xs ${
                      item.status === 'Pass' ? 'bg-[#16A34A] text-white' :
                      item.status === 'Fail' ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#475569] text-white'
                    }`}>
                      {item.status === 'Pass' ? '✓ PASS' : item.status === 'Fail' ? '✕ FAIL' : 'N/A'}
                    </span>

                  </div>

                  <div className="flex space-x-1 text-xs">
                    <Button
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].status = 'Pass';
                        setBeforeDiagnostics(updated);
                      }}
                        className={`flex-1 min-h-10 py-2 rounded-lg font-black transition-all ${
                        item.status === 'Pass' ? 'bg-[#16A34A] text-white shadow-xs' : 'bg-surface text-ink hover:bg-slate-200'
                      }`}
                    >
                      Pass
                    </Button>
                    <Button
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].status = 'Fail';
                        setBeforeDiagnostics(updated);
                      }}
                        className={`flex-1 min-h-10 py-2 rounded-lg font-black transition-all ${
                        item.status === 'Fail' ? 'bg-[#DC2626] text-white shadow-xs' : 'bg-surface text-ink hover:bg-slate-200'
                      }`}
                    >
                      Fail
                    </Button>
                    <Button
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].status = 'N/A';
                        setBeforeDiagnostics(updated);
                      }}
                        className={`flex-1 min-h-10 py-2 rounded-lg font-black transition-all ${
                        item.status === 'N/A' ? 'bg-[#475569] text-white shadow-xs' : 'bg-surface text-ink hover:bg-slate-200'
                      }`}
                    >
                      N/A
                    </Button>
                  </div>

                  {/* Diagnostic Comment Box — only for Fail (or when a note exists); 90% of comments are on failed items */}
                  {(item.status === 'Fail' || (item.note || '').length > 0) ? (
                    <div className="relative pt-1">
                      <Input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => {
                          const updated = [...beforeDiagnostics];
                          updated[idx].note = e.target.value;
                          setBeforeDiagnostics(updated);
                        }}
                        placeholder={`Comment for ${item.name}...`}
                        className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:bg-white focus:border-brand focus:outline-none"
                      />
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].note = ' ';
                        setBeforeDiagnostics(updated);
                      }}
                      className="pt-1 text-xs font-semibold text-muted hover:text-brand transition-colors"
                    >
                      + Add comment
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 4C (Phase 4): Before-Repair Condition Photos */}
        <div className={`p-3 bg-surface rounded-xl border border-line space-y-2.5 ${wizardMode && wizardStep !== 3 ? 'hidden' : ''}`}>
          <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2 border-b border-line pb-2">
            <span className="px-1.5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black">4C</span>
            <span>Before-Repair Condition Photos</span>
          </h3>

          <div className="flex flex-wrap gap-3">
            {intakePhotos.map((photo, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-line group">
                <img src={photo} alt="Intake" className="w-full h-full object-cover" />
                <Button
                  onClick={() => setIntakePhotos(prev => prev.filter((_, i) => i !== idx))}
                  aria-label={`Remove photo ${idx + 1}`}
                  title="Remove photo"
                  className="absolute top-1 right-1 bg-black/70 text-white p-0.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:scale-90"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}

            <Input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              aria-label="Upload device condition photos"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => {
                  if (file.size > 4_000_000) {
                    toast.error(`${file.name} is over 4MB — skipping. Use a smaller photo.`, 'Photo Too Large');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = String(reader.result || '');
                    setIntakePhotos((prev) => [...prev, dataUrl]);
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-line hover:border-brand flex flex-col items-center justify-center text-muted hover:text-brand text-xs space-y-1 bg-white transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Take / Add Photo</span>
            </Button>
          </div>
          <p className="text-xs text-muted font-medium">Up to 4MB per photo · tap the × badge on a thumbnail to delete · on mobile the camera opens directly.</p>
        </div>

        {/* Spacer so the sticky bar never covers the content above it at full scroll */}
        <div className="h-20 shrink-0" aria-hidden="true" />

        {/* Wizard step indicator */}
        {wizardMode && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-brand/20 bg-brand-soft p-2.5">
            {['Customer', 'Device', 'Repairs', 'Review'].map((label, idx) => (
              <Button
                key={label}
                type="button"
                onClick={() => setWizardStep(idx)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-extrabold transition-colors cursor-pointer ${
                  wizardStep === idx ? 'bg-brand text-white shadow-xs' : 'text-brand hover:bg-white'
                }`}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-black ${wizardStep === idx ? 'bg-white/20' : 'bg-white border border-brand/30'}`}>
                  {idx + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Sticky Action Bar — live ticket summary + register, always reachable on desktop */}
        <div className={`sticky bottom-0 z-20 ${embedded ? 'rounded-b-none' : '-mx-4 -mb-4 mt-1 rounded-b-xl'} bg-white border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_16px_rgba(0,0,0,0.06)]`}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {repairCount === 0 ? (
              <div className="flex-1 flex items-center gap-2 text-xs min-w-0" role="status">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-[#51525C] line-clamp-2 leading-snug">
                  {!customerName.trim() || !customerPhone.trim()
                    ? 'Start with Step 1 — customer name & phone'
                    : !deviceModel
                    ? 'Next: choose a device model to unlock repairs'
                    : 'Next: tap "+ Add Repairs" to build the estimate'}
                </span>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-3 sm:flex sm:items-center sm:gap-6 text-xs min-w-0">
                <div className="text-center sm:text-left">
                  <span className="block text-xs uppercase tracking-wider text-muted font-bold">Repairs</span>
                  <span className="font-black text-ink text-sm">{repairCount} item{repairCount === 1 ? '' : 's'}</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block text-xs uppercase tracking-wider text-muted font-bold">Estimate</span>
                  <span className="font-black text-brand text-sm">{finalEstimate.toLocaleString()} MMK</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block text-xs uppercase tracking-wider text-muted font-bold">{overallDiscountPercent > 0 ? `${overallDiscountPercent}% Off` : 'Saved'}</span>
                  <span className={`font-bold text-sm ${savedAmount > 0 ? 'text-success' : 'text-muted'}`}>{savedAmount.toLocaleString()} MMK</span>
                </div>
              </div>
            )}
            {wizardMode && (
              <div className="flex w-full sm:w-auto items-center gap-2">
                {embedded && wizardStep === 0 && (
                  <Button
                    type="button"
                    onClick={handleRegisterDevice}
                    disabled={isRegistering}
                    variant="secondary"
                    className="shrink-0 border border-brand/30 bg-brand-soft text-brand font-black"
                    title="Create ticket with just customer, device and fault — add repairs later"
                  >
                    {isRegistering ? (
                      <span className="w-4 h-4 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
                    ) : (
                      <><Zap className="w-4 h-4" /><span>Quick Create</span></>
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardStep((step) => Math.max(0, step - 1))}
                  disabled={wizardStep === 0}
                  className="shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>
                {wizardStep < 3 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 0 && (!customerName.trim() || !customerPhone.trim())) {
                        toast.error('Enter customer name and phone to continue.', 'Step 1 Required');
                        return;
                      }
                      setWizardStep((step) => Math.min(3, step + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 h-10 sm:flex-none sm:min-w-40 bg-brand hover:bg-[#0077ED] text-white font-black"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleRegisterDevice}
                    disabled={isRegistering}
                    className="flex-1 h-10 sm:flex-none bg-brand hover:bg-[#0077ED] text-white font-black"
                  >
                    {isRegistering ? (
                      <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><CheckCircle2 className="w-5 h-5" /><span>Register Device</span></>
                    )}
                  </Button>
                )}
              </div>
            )}
            {!wizardMode && (
            <Button
              type="button"
              onClick={handleRegisterDevice}
              disabled={isRegistering}
              className={`h-10 w-full sm:w-auto sm:min-w-72 font-black text-sm ${
                isRegistering
                  ? 'bg-muted text-white opacity-80'
                  : 'bg-brand hover:bg-[#0077ED] text-white'
              }`}
            >
              {isRegistering ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Registering…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="hidden sm:inline">{isEditMode ? 'Save Ticket Changes' : 'Register Device & Generate Voucher'}</span>
                  <span className="sm:hidden">{isEditMode ? 'Save Changes' : 'Register Device'}</span>
                </>
              )}
            </Button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Select Device Model Chooser (Synced with Price Catalog Folders) */}
      <DeviceModelChooserModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedDevice={deviceModel}
        onSelectDevice={(model) => handleSelectModel(model)}
      />

      {/* MODAL 2: Realistic Device Color Picker (REAL COLORS IN BIG CIRCLE WITH SHADOW) */}
      {isColorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <Button onClick={() => setIsColorModalOpen(false)} aria-label="Close color picker" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </Button>

            <div className="border-b border-line pb-2">
              <h3 className="text-base font-black text-ink">
                Official Colors for {deviceModel}
              </h3>
              <p className="text-xs text-muted">Real Apple color finishes with realistic metallic reflections</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
              {availableRealColors.map((colorName) => {
                const style = getRealisticColorStyle(colorName);
                const isSelected = deviceColor === colorName;

                return (
                  <Button
                    key={colorName}
                    onClick={() => {
                      setDeviceColor(colorName);
                      setIsColorModalOpen(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center text-center space-y-2 transition-all hover:scale-105 ${
                      isSelected
                        ? 'border-brand bg-brand-soft ring-2 ring-brand/30'
                        : 'border-line bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Big Realistic Color Circle with Shadow */}
                    <div 
                      className={`w-14 h-14 rounded-full border-2 border-white shadow-lg ${style.border}`}
                      style={{ background: style.gradient, boxShadow: style.shadow }}
                    />
                    <span className={`text-xs font-bold ${isSelected ? 'text-brand' : 'text-ink'}`}>
                      {colorName}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Warranty Selection */}
      {isWarrantyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <Button onClick={() => setIsWarrantyModalOpen(false)} aria-label="Close warranty info" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </Button>

            <h3 className="text-sm font-bold text-ink border-b border-line pb-2 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#15803D]" />
              <span>Standard Warranty Selection</span>
            </h3>

            <div className="space-y-2">
              {WARRANTY_OPTIONS.map((opt) => (
                <Button
                  key={opt.label}
                  onClick={() => {
                    setWarrantyDays(opt.days);
                    setWarrantyLabel(opt.label);
                    setIsWarrantyModalOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-xs font-bold text-left flex justify-between items-center transition-all ${
                    warrantyDays === opt.days
                      ? 'border-brand bg-brand-soft text-brand'
                      : 'border-line bg-white text-ink hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span>{opt.days} Days</span>
                </Button>
              ))}

              <div className="pt-2 border-t border-line flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="Custom Days (e.g. 60)"
                  value={customWarrantyInput}
                  onChange={(e) => setCustomWarrantyInput(e.target.value)}
                  className="flex-1 bg-surface border border-line rounded-xl px-3 py-2 text-xs"
                />
                <Button
                  onClick={() => {
                    const days = Number(customWarrantyInput);
                    if (days >= 0) {
                      setWarrantyDays(days);
                      setWarrantyLabel(`Custom ${days} Days Warranty`);
                      setIsWarrantyModalOpen(false);
                    }
                  }}
                  className="px-3 py-2 bg-brand text-white font-bold text-xs rounded-xl"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Available Repairs Chooser (Catalog Price List) */}
      {isRepairsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-2xl w-full p-6 space-y-4 text-xs shadow-2xl relative max-h-[85vh] flex flex-col">
            <Button
              onClick={() => setIsRepairsModalOpen(false)}
              className="absolute right-4 top-4 text-muted hover:text-ink p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </Button>

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
                <Input
                  type="text"
                  value={priceSearchQuery}
                  onChange={(e) => setPriceSearchQuery(e.target.value)}
                  placeholder={`Search repairs for ${matchedModelName} (e.g. Battery, Display, Face ID)...`}
                  className="w-full bg-surface border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:bg-white focus:border-brand focus:outline-none transition-all"
                />
              </div>

              {/* Category Group Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                {['ALL', 'Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((grp) => (
                  <Button
                    key={grp}
                    onClick={() => setSelectedGroupFilter(grp)}
                    className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all ${
                      selectedGroupFilter === grp
                        ? 'bg-brand text-white shadow-2xs'
                        : 'bg-surface text-muted hover:text-ink hover:bg-slate-200'
                    }`}
                  >
                    {grp}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Catalog Repair List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {catalogItemsForModel
                .filter((item) => {
                  const matchesSearch =
                    !priceSearchQuery ||
                    item.name.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
                    item.group.toLowerCase().includes(priceSearchQuery.toLowerCase());
                  const matchesGroup = selectedGroupFilter === 'ALL' || item.group === selectedGroupFilter;
                  return matchesSearch && matchesGroup;
                })
                .map((item) => {
                  const isSelected = selectedRepairs.some(
                    (s) => s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase()
                  );
                  return (
                    <Button
                      type="button"
                      key={item.id}
                      onClick={() => toggleCatalogRepair(item)}
                      className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer flex justify-between items-center transition-all ${
                        isSelected
                          ? 'border-brand bg-brand-soft text-brand font-bold shadow-2xs'
                          : 'border-line bg-white text-ink hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected ? 'bg-brand border-brand text-white' : 'border-line-strong bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="block font-extrabold text-ink text-xs">{item.name}</span>
                          <div className="flex items-center space-x-2 text-xs text-muted pt-0.5 font-medium">
                            <span className="px-1.5 py-0.2 bg-surface rounded text-ink font-semibold">{item.group}</span>
                            <span>Warranty: {item.warranty}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-brand">
                          {item.price.toLocaleString()} MMK
                        </span>
                        {item.isCatalogMatch && (
                          <span className="block text-xs text-success-deep font-bold">Catalog Verified</span>
                        )}
                      </div>
                    </Button>
                  );
                })}
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between">
              <span className="text-xs text-muted font-semibold">
                Selected: <strong className="text-ink">{selectedRepairs.length} repair(s)</strong>
              </span>
              <Button
                onClick={() => setIsRepairsModalOpen(false)}
                className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl text-xs hover:bg-[#0077ED] transition-colors shadow-sm"
              >
                Apply Selected Repairs ({selectedRepairs.length})
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 5: Camera QR / Barcode Scanner */}
      <CameraQrScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(scannedText) => {
          const clean = scannedText.trim();
          if (/^\d{15}$/.test(clean)) {
            setImei(clean);
          } else {
            setSerialNumber(clean.toUpperCase());
          }
        }}
      />
    </div>
  );
};
