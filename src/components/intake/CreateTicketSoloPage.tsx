import React, { useState, useEffect, useRef } from 'react';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { CameraQrScannerModal } from '../common/CameraQrScannerModal';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { 
  Plus, 
  Check, 
  X, 
  Sparkles, 
  Smartphone, 
  User, 
  CircleDot, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  CheckSquare,
  ShieldCheck,
  ArrowLeft,
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
  MessageSquare,
  Search
} from 'lucide-react';
import { 
  WorkOrder, 
  Customer, 
  Technician, 
  DiagnosticItemResult,
  SelectedRepairItem,
  SystemSettings
} from '../../types';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { 
  APPLE_MODEL_SERIES, 
  getAvailableColorsForModel, 
  WARRANTY_OPTIONS, 
  AVAILABLE_REPAIRS, 
  DIAGNOSTIC_NAMES,
  getRealisticColorStyle
} from './deviceData';
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
  technicians,
  systemSettings,
  priceCatalog,
  prefill,
  onSaveWorkOrder,
  onSelectPrintTag,
  onOpenAiAssistant,
  onViewRepairTickets,
  onCancelEdit,
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<WorkOrder | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
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
  const [customerAddress, setCustomerAddress] = useState('');
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
      setCustomerAddress(editWorkOrder.customerAddress || '');
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
        setCustomerTown(found.company || '');
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

  const toggleRepairItem = (repair: typeof AVAILABLE_REPAIRS[0]) => {
    const exists = selectedRepairs.some(r => r.id === repair.id);
    if (exists) {
      setSelectedRepairs(prev => prev.filter(r => r.id !== repair.id));
    } else {
      setSelectedRepairs(prev => [
        ...prev,
        {
          id: repair.id,
          name: repair.name,
          basePrice: repair.basePrice,
          discountPercent: 0,
          finalPrice: repair.basePrice
        }
      ]);
    }
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
    setIsRegistering(true);

    const prefix = systemSettings?.ticketPrefix || 'WO-';
    const baseWorkOrder = editWorkOrder || null;
    // Order numbers must never be reused: derive from the highest existing number
    // across ALL tickets (never the filtered list length) + current year.
    const maxExistingNum = workOrders.reduce((max, wo) => {
      const match = /(\d+)\s*$/.exec(wo.orderNumber || '');
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1000);
    const newOrderNumber = baseWorkOrder?.orderNumber || `${prefix}${new Date().getFullYear()}-${maxExistingNum + 1}`;
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
      customerAddress: customerTown || customerAddress || '',
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
    setCustomerAddress('');
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
      <div className="max-w-3xl xl:max-w-6xl mx-auto space-y-6 py-6">
        <div className="bg-white border border-[#D2D2D7] rounded-2xl p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 bg-[#E8F8EE] text-[#1E7E34] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-sm font-extrabold text-[#0071E3] px-3 py-1 bg-[#E5F1FF] rounded-full">
              {createdTicket.orderNumber}
            </span>
            <h1 className="text-2xl font-black text-[#1D1D1F] pt-2">
              {isEditMode ? 'Repair Ticket Successfully Updated!' : 'Repair Ticket Successfully Created!'}
            </h1>
            <p className="text-xs text-[#86868B]">
              {isEditMode ? 'Updated' : 'Registered'} {createdTicket.deviceModel} for {createdTicket.customerName}
            </p>
          </div>

          <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-[#D2D2D7] text-left text-xs space-y-3 max-w-md mx-auto">
            <div className="flex justify-between items-center">
              <span className="text-[#86868B]">Customer Phone:</span>
              <span className="font-semibold text-[#1D1D1F]">{createdTicket.customerPhone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#86868B]">Town / City:</span>
              <span className="font-bold text-[#1D1D1F] flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>{createdTicket.customerAddress || customerTown || '—'}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#86868B]">Device Color:</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-[#1D1D1F]">{createdTicket.deviceColor}</span>
                <span 
                  className={`w-5 h-5 rounded-full border border-white shadow-md ${selectedColorStyle.border}`}
                  style={{ background: selectedColorStyle.gradient, boxShadow: selectedColorStyle.shadow }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#86868B]">Warranty:</span>
              <span className="font-semibold text-[#1D1D1F]">{createdTicket.warrantyLabel}</span>
            </div>
            <div className="flex justify-between items-center border-t border-[#D2D2D7] pt-2.5">
              <span className="text-[#86868B] font-bold">Total Estimate:</span>
              <span className="font-black text-[#0071E3] text-base">{createdTicket.totalAmount.toLocaleString()} MMK</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!isEditMode && (
              <button
                onClick={() => onSelectPrintTag(createdTicket)}
                className="w-full sm:w-auto px-5 py-3 bg-white border border-[#D2D2D7] hover:bg-slate-50 text-[#1D1D1F] font-bold text-xs rounded-xl flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4 text-[#0071E3]" />
                <span>Print Sticker Tag Voucher</span>
              </button>
            )}

            <button
              onClick={onViewRepairTickets}
              className="w-full sm:w-auto px-5 py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center space-x-2"
            >
              <List className="w-4 h-4" />
              <span>{isEditMode ? 'Back to Ticket List' : 'View in Work Orders List'}</span>
            </button>

            <button
              onClick={isEditMode && onCancelEdit ? onCancelEdit : handleResetForm}
              className="w-full sm:w-auto px-4 py-3 bg-[#F8F9FA] hover:bg-slate-200 text-[#1D1D1F] font-semibold text-xs rounded-xl border border-[#D2D2D7]"
            >
              {isEditMode ? 'Discard Changes' : '+ Create Another Ticket'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeColorStyle = getRealisticColorStyle(deviceColor);

  return (
    <div className="max-w-3xl xl:max-w-6xl mx-auto space-y-3 pb-5">
      {/* Top Banner Header */}
      <div className="module-toolbar bg-white px-3.5 py-3 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F0F6FF] text-[#0071E3] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            {/* Non-heading on purpose: the App topbar already renders the page H1 — one H1 per page for a11y */}
            <div className="text-sm font-extrabold text-[#1D1D1F] truncate">{isEditMode ? 'Edit Intake Ticket' : 'New Intake Ticket Registration'}</div>
            <p className="text-[10px] text-[#86868B] truncate">{isEditMode ? 'Update customer, device and repair details' : 'Customer, device, repair estimate and intake diagnostics'}</p>
          </div>
        </div>
        <button
          onClick={onViewRepairTickets}
          className="text-[11px] text-[#0071E3] font-bold flex items-center gap-1 hover:bg-[#F0F6FF] rounded-lg px-2 py-1.5 shrink-0"
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="hidden sm:inline">{isEditMode ? 'Back to Ticket' : 'Back to Tickets'}</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-xs space-y-4">

        {/* UI Direction Helper Banner */}
        <div className="flex items-center gap-2 rounded-lg border border-[#0071E3]/20 bg-[#F0F7FF] px-3 py-2 text-[10px] text-[#51525C]">
          <HelpCircle className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
          <span>Enter customer details, choose the device, add repairs, then complete the intake check.</span>
        </div>

        {/* Stepper removed per Ko Hein 2026-08-05 — jump anchors (intake-customer/device/repairs/diagnostics)
           are kept for validation-error scrolling; scroll-mt-40 still applies. */}

        {/* Desktop 2-column layout for steps 1–4 (Customer/Device left, Color/Warranty + Serial/IMEI right) */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">

        {/* STEP 1: Customer Information */}
        <div id="intake-customer" className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] space-y-2.5 scroll-mt-40">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
            <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[11px] font-black">1</span>
              <span className="text-sm">Customer Information</span>
            </h3>
            {matchedCustomer && (
              <span className="text-[10px] bg-[#EAF8ED] text-[#28A745] px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1 border border-[#34C759]/20 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Editing Existing Ticket' : 'Existing Customer Profile Matched!'}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="field-customer-phone" className="flex items-center justify-between text-[#86868B] mb-1 font-medium">
                <span>Phone Number *</span>
                {customerPhone.replace(/\D/g, '').length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-[#86868B]">
                    {customerPhone.replace(/\D/g, '').length} digit(s)
                  </span>
                )}
              </label>
              <input
                id="field-customer-phone"
                type="text"
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors['field-customer-phone'])}
                value={customerPhone}
                onChange={(e) => { handlePhoneChange(e.target.value); clearFieldError('field-customer-phone'); }}
                placeholder="e.g. 09-123456789 or 09-987654321"
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm text-[#1D1D1F] focus:outline-none transition-all ${
                  fieldErrors['field-customer-phone']
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20'
                }`}
              />
              {fieldErrors['field-customer-phone'] && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-[#DC2626]">{fieldErrors['field-customer-phone']}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-customer-name" className="block text-[#86868B] mb-1 font-medium">Customer Name *</label>
              <input
                id="field-customer-name"
                type="text"
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors['field-customer-name'])}
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); clearFieldError('field-customer-name'); }}
                placeholder="e.g. Mg Mg / Daw Hla (Full Name)"
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm text-[#1D1D1F] focus:outline-none transition-all ${
                  fieldErrors['field-customer-name']
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20'
                }`}
              />
              {fieldErrors['field-customer-name'] && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-[#DC2626]">{fieldErrors['field-customer-name']}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-customer-town" className="block text-[#86868B] mb-1 font-medium">Town / City</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#0071E3] absolute left-3 top-2.5" />
                <input
                  id="field-customer-town"
                  type="text"
                  value={customerTown}
                  onChange={(e) => setCustomerTown(e.target.value)}
                  placeholder="e.g. Yangon, Mandalay, Bago"
                  className="w-full bg-white border border-[#E5E5EA] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none font-semibold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#86868B] mb-1 font-medium">Customer Type</label>
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
                buttonClassName="w-full bg-white border-[#E5E5EA] rounded-xl h-9 px-3 text-xs"
              />
            </div>
          </div>
        </div>

        {/* STEP 2: Choose Device Model */}
        <button
          type="button"
          id="intake-device"
          onClick={() => setIsModelModalOpen(true)}
          className="w-full text-left p-3 bg-[#F5F5F7]/80 rounded-xl border border-[#E5E5EA] space-y-2.5 cursor-pointer hover:border-[#0071E3]/50 hover:bg-[#F5F5F7] transition-all group scroll-mt-40 flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
            <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px] group-hover:scale-105 transition-transform">2</span>
              <span>Apple Hardware Device Model</span>
            </h3>
            <span className="text-xs font-bold text-[#0071E3] group-hover:underline">
              {deviceModel ? 'Change Model' : 'Select Model'}
            </span>
          </div>

          {!deviceModel ? (
            <div className="grow flex items-center justify-between bg-amber-50 p-2.5 rounded-lg border border-dashed border-amber-300 text-xs shadow-2xs group-hover:border-amber-400">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                <div>
                  <span className="font-extrabold text-amber-900 text-sm block">Choose Device Model First</span>
                  <span className="text-[11px] text-amber-700">Click to select Apple iPhone, iPad, MacBook, Watch, or Mac</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-white bg-amber-600 group-hover:bg-amber-700 px-3 py-1.5 rounded-lg shadow-2xs transition-colors shrink-0">
                Choose Model
              </span>
            </div>
          ) : (
            <div className="grow flex items-center justify-between bg-white p-3 rounded-xl border border-[#E5E5EA] text-xs shadow-sm group-hover:shadow-md transition-shadow">
              <div>
                <span className="text-[#86868B]">Selected Model: </span>
                <span className="font-extrabold text-[#1D1D1F] ml-1 text-sm">{deviceModel}</span>
              </div>
              <span className="text-[10px] text-[#0071E3] font-bold bg-[#F0F6FF] px-2.5 py-0.5 rounded-full border border-[#0071E3]/20">
                Real Model Verified
              </span>
            </div>
          )}
        </button>

        {/* STEP 3 & STEP 4: Color (REAL DEVICE COLOR BIG CIRCLE WITH SHADOW) & Warranty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* STEP 2b: Real Official Color Selection — only after a model is chosen */}
          {deviceModel ? (
            <button
              type="button"
              onClick={() => setIsColorModalOpen(true)}
              className="w-full text-left p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] space-y-2.5 cursor-pointer hover:border-[#0071E3]/50 transition-all group flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
                <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[#0071E3]/15 text-[#0071E3] flex items-center justify-center text-[10px] font-black group-hover:scale-105 transition-transform border border-[#0071E3]/30">2a</span>
                  <span className="text-xs">Realistic Color ({availableRealColors.length} Palette)</span>
                </h3>
                <span className="text-xs font-bold text-[#0071E3] group-hover:underline">Change</span>
              </div>

              <div className="grow bg-white p-3.5 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="block text-[10px] text-[#86868B]">Selected Color:</span>
                  <span className="text-sm font-extrabold text-[#1D1D1F]">{deviceColor}</span>
                </div>
                <div 
                  className={`w-11 h-11 rounded-full border-2 border-white shadow-xs ${activeColorStyle.border}`}
                  style={{ background: activeColorStyle.gradient }}
                />
              </div>
            </button>
          ) : (
            <div className="w-full p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] space-y-2.5 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
                <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[#0071E3]/15 text-[#0071E3] flex items-center justify-center text-[10px] font-black border border-[#0071E3]/30">2a</span>
                  <span className="text-xs">Realistic Color (0 Palette)</span>
                </h3>
              </div>
              <div className="grow bg-white p-3.5 rounded-xl border border-dashed border-[#D2D2D7] flex flex-col items-center justify-center text-center space-y-1.5 shadow-2xs">
                <Palette className="w-4 h-4 text-[#B6B6BC]" />
                <span className="text-[11px] text-[#86868B] font-semibold leading-snug">
                  Select a device model first<br />to see real color options
                </span>
              </div>
            </div>
          )}

          {/* STEP 2c: Warranty Selection */}
          <button
            type="button"
            onClick={() => setIsWarrantyModalOpen(true)}
            className="w-full text-left p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] space-y-2.5 cursor-pointer hover:border-[#0071E3]/50 transition-all group flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
              <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#0071E3]/15 text-[#0071E3] flex items-center justify-center text-[10px] font-black group-hover:scale-105 transition-transform border border-[#0071E3]/30">2b</span>
                <span className="text-xs">Warranty Policy</span>
              </h3>
              <span className="text-xs font-bold text-[#0071E3] group-hover:underline">Change</span>
            </div>

            <div className="grow bg-white p-3.5 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F] flex items-center justify-between shadow-2xs group-hover:shadow-sm transition-shadow">
              <div>
                <span className="block text-[10px] text-[#86868B]">Covered Warranty:</span>
                <span className="text-sm font-extrabold text-[#1D1D1F]">{warrantyLabel}</span>
              </div>
              <div className="p-2 bg-[#EAF8ED] text-[#34C759] rounded-xl shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>

        {/* Serial / IMEI Input */}
        <div className="p-3 bg-[#F5F5F7]/80 rounded-xl border border-[#E5E5EA] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
            <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-[#0071E3]" />
              <span>Serial Number & IMEI Information</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-3.5 py-1.5 bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Scan QR / Barcode</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="field-serial" className="block text-[#86868B] mb-1 font-medium">Serial Number</label>
              <input
                id="field-serial"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                placeholder="e.g. C02M2MAX2023 or F2LXK09PN6T"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-2.5 text-sm font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="field-imei" className="flex items-center justify-between text-[#86868B] mb-1 font-medium">
                <span>IMEI Number (15 Digits)</span>
                <span className={`text-[10px] font-mono font-bold ${imei.length === 15 ? 'text-[#34C759]' : 'text-[#86868B]'}`}>{imei.length}/15</span>
              </label>
              <input
                id="field-imei"
                type="text"
                inputMode="numeric"
                value={imei}
                maxLength={15}
                aria-invalid={Boolean(fieldErrors['field-imei'])}
                onChange={(e) => { setImei(e.target.value.replace(/\D/g, '')); clearFieldError('field-imei'); }}
                placeholder="e.g. 358921102938102"
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm font-mono text-[#1D1D1F] focus:outline-none transition-all ${
                  imei.length > 0 && imei.length !== 15
                    ? 'border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-300/30'
                    : imei.length === 15
                    ? 'border-[#34C759]/60 focus:border-[#34C759] focus:ring-2 focus:ring-[#34C759]/20'
                    : 'border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20'
                }`}
              />
              {fieldErrors['field-imei'] && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-[#DC2626]">{fieldErrors['field-imei']}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="field-passcode" className="block text-[#86868B] mb-1 font-medium">Device Passcode</label>
              <input
                id="field-passcode"
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode / PIN"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-2.5 text-sm font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
              />
            </div>
          </div>

        </div>

        </div>

        {/* STEP 3 (Phase 3): Choose Available Repairs (MMK CURRENCY) */}
        <div id="intake-repairs" className="p-3 bg-[#F5F5F7]/80 rounded-xl border border-[#E5E5EA] space-y-2.5 scroll-mt-40">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
            <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px]">3</span>
              <span>Available Repairs Selection (MMK Pricing)</span>
            </h3>
            {deviceModel && (
              <button
                onClick={() => setIsRepairsModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#0071E3] text-white text-xs font-bold rounded-xl hover:bg-[#0077ED] transition-colors"
              >
                + Add Repairs ({selectedRepairs.length})
              </button>
            )}
          </div>

          {!deviceModel ? (
            <div className="p-8 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/80 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs animate-bounce">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-amber-950">Choose Device Model First</h3>
                <p className="text-xs text-amber-800 max-w-md mt-1">
                  Please select a device model first above to view specific repair services, catalog prices, and apply discounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0071E3]/90 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
              >
                <Smartphone className="w-4 h-4" />
                <span>Choose Device Model</span>
              </button>
            </div>
          ) : (
            <>
              {savedAmount > 0 && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-extrabold shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                    <span>Catalog Discount Auto-Applied:</span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black font-mono">
                      {overallDiscountPercent}% OFF ({savedAmount.toLocaleString()} MMK Discount)
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-mono hidden sm:inline">
                    Base: <span className="line-through">{baseTotal.toLocaleString()} MMK</span> → <span className="font-extrabold text-emerald-800">{finalEstimate.toLocaleString()} MMK</span>
                  </span>
                </div>
              )}

              {/* Selected Repairs Table */}
              <div className="space-y-2.5">
                {selectedRepairs.map((repair) => (
                  <div
                    key={repair.id}
                    className="p-3.5 bg-white border border-[#E5E5EA] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-xs hover:border-[#0071E3]/30 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-[#F0F6FF] text-[#0071E3] p-1.5 rounded-lg">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-extrabold text-[#1D1D1F] text-[13px]">{repair.name}</span>
                        <span className="block text-[#86868B] text-[11px] font-medium">Base Price: {repair.basePrice.toLocaleString()} MMK</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end md:space-x-4 bg-[#F8F9FA] md:bg-transparent p-2 md:p-0 rounded-lg">
                      <div className="flex items-center space-x-2 bg-white md:bg-transparent px-2 py-1 md:p-0 border border-[#E5E5EA] md:border-none rounded-lg">
                        <span className="text-[11px] text-[#86868B] font-semibold">Discount:</span>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={repair.discountPercent}
                            onChange={(e) => updateRepairDiscount(repair.id, Number(e.target.value))}
                            className="w-16 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg px-2 py-1.5 font-bold text-center text-[#1D1D1F] focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3] focus:outline-none transition-all"
                          />
                          <span className="absolute right-2 top-1.5 text-[#86868B] text-[11px] font-bold pointer-events-none">%</span>
                        </div>
                      </div>

                      <div className="font-black text-[#0071E3] text-sm min-w-[100px] text-right">
                        {repair.finalPrice.toLocaleString()} MMK
                      </div>

                      <button
                        onClick={() => setSelectedRepairs(prev => prev.filter(r => r.id !== repair.id))}
                        className="bg-white md:bg-transparent border border-[#E5E5EA] md:border-none text-[#86868B] hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {selectedRepairs.length === 0 && (
                  <div className="p-8 text-center bg-white border border-dashed border-[#D2D2D7] rounded-xl text-[#86868B] text-xs font-medium">
                    No repairs selected. Click "+ Add Repairs" to build the estimate.
                  </div>
                )}
              </div>

              {/* Discount & Estimate Summary Box in MMK */}
              <div className="bg-[#E5F1FF]/60 border border-[#0071E3]/30 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-center text-xs shadow-sm">
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-[10px] text-[#86868B] font-semibold">Repairs Count</span>
                  <span className="font-extrabold text-[#1D1D1F] text-sm">{repairCount} items</span>
                </div>
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-[10px] text-[#86868B] font-semibold">Base Total</span>
                  <span className="font-extrabold text-[#1D1D1F] text-sm">{baseTotal.toLocaleString()} MMK</span>
                </div>
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-[10px] text-[#86868B] font-semibold">Saved Amount</span>
                  <span className="font-extrabold text-[#34C759] text-sm">{savedAmount.toLocaleString()} MMK</span>
                </div>
                <div className="bg-white/60 p-2 rounded-lg">
                  <span className="block text-[10px] text-[#86868B] font-semibold">Overall Discount</span>
                  <span className="font-extrabold text-[#AF52DE] text-sm">{overallDiscountPercent}%</span>
                </div>
                <div className="col-span-2 md:col-span-2 bg-[#0071E3] text-white rounded-xl p-2.5 flex flex-col justify-center">
                  <span className="block text-[9px] opacity-90 uppercase font-bold tracking-wider">Final Estimate</span>
                  <span className="font-black text-base">{finalEstimate.toLocaleString()} MMK</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* STEP 4A (Phase 4): Intake Notes */}
        <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#D2D2D7] space-y-2.5">
          <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2 border-b border-[#D2D2D7] pb-2">
            <span className="px-1.5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px] font-black">4A</span>
            <span>Intake Notes & Customer Symptoms</span>
          </h3>

          <label htmlFor="field-notes" className="sr-only">Customer symptoms or intake notes</label>
          <textarea
            id="field-notes"
            rows={2}
            value={extraReportedNotes}
            onChange={(e) => setExtraReportedNotes(e.target.value)}
            placeholder="Enter customer symptoms or intake notes"
            className="w-full bg-white border border-[#D2D2D7] rounded-xl p-3.5 text-sm text-[#1D1D1F] focus:border-[#0071E3]"
          />
        </div>

        {/* STEP 4B (Phase 4): 21-Point Repair Diagnostic Inspection with Comment Box & Dedicated Icons */}
        <div id="intake-diagnostics" className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-2.5 scroll-mt-40">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
            <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <span className="px-1.5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px] font-black">4B</span>
              <span>21-Point Repair Diagnostic List</span>
            </h3>
            <div className="flex items-center space-x-2">
              <span className="hidden md:inline-flex items-center space-x-1.5 text-[10px] font-bold">
                <span className="bg-[#16A34A]/10 text-[#16A34A] px-2 py-1 rounded-full">✓ {beforeDiagnostics.filter(d => d.status === 'Pass').length} Pass</span>
                <span className="bg-[#DC2626]/10 text-[#DC2626] px-2 py-1 rounded-full">✕ {beforeDiagnostics.filter(d => d.status === 'Fail').length} Fail</span>
              </span>
              <button 
                onClick={() => setBeforeDiagnostics(prev => prev.map(d => ({ ...d, status: 'Pass' })))}
                className="text-[10px] text-white font-bold bg-[#34C759] hover:bg-[#28A745] px-3 py-1 rounded-full shadow-xs transition-colors"
              >
                Mark All Pass
              </button>
              <button 
                onClick={() => setBeforeDiagnostics(prev => prev.map(d => ({ ...d, status: 'N/A' })))}
                className="text-[10px] text-[#1D1D1F] font-bold bg-[#F5F5F7] hover:bg-[#E5E5EA] px-3 py-1 rounded-full shadow-xs transition-colors border border-[#D2D2D7]"
              >
                Mark All N/A
              </button>
              <button 
                onClick={() => setBeforeDiagnostics(prev => prev.map(d => ({ ...d, status: 'N/A' as const, note: '' })))}
                title="Reset all statuses and comments"
                className="text-[10px] text-[#86868B] font-bold bg-white hover:bg-[#E5E5EA] px-3 py-1 rounded-full transition-colors border border-[#D2D2D7]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5 text-xs">
            {beforeDiagnostics.map((item, idx) => {
              const IconComp = getDiagnosticIcon(item.name);

              return (
                <div key={item.id} className="p-2.5 bg-white border border-[#E5E5EA] rounded-xl space-y-1.5 text-xs shadow-xs hover:border-[#0071E3]/50 transition-all">
                  <div className="font-bold text-[#1D1D1F] flex justify-between items-center">
                    <div className="flex items-center space-x-1.5 truncate">
                      <div className="w-5 h-5 rounded-md bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                        <span className="text-[11px] font-extrabold truncate">{idx + 1}. {item.name}</span>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0 shadow-2xs ${
                      item.status === 'Pass' ? 'bg-[#16A34A] text-white' :
                      item.status === 'Fail' ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#475569] text-white'
                    }`}>
                      {item.status === 'Pass' ? '✓ PASS' : item.status === 'Fail' ? '✕ FAIL' : 'N/A'}
                    </span>

                  </div>

                  <div className="flex space-x-1 text-[10px]">
                    <button
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].status = 'Pass';
                        setBeforeDiagnostics(updated);
                      }}
                        className={`flex-1 py-1 rounded-lg font-black transition-all ${
                        item.status === 'Pass' ? 'bg-[#16A34A] text-white shadow-xs' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                      }`}
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].status = 'Fail';
                        setBeforeDiagnostics(updated);
                      }}
                        className={`flex-1 py-1 rounded-lg font-black transition-all ${
                        item.status === 'Fail' ? 'bg-[#DC2626] text-white shadow-xs' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                      }`}
                    >
                      Fail
                    </button>
                    <button
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].status = 'N/A';
                        setBeforeDiagnostics(updated);
                      }}
                        className={`flex-1 py-1 rounded-lg font-black transition-all ${
                        item.status === 'N/A' ? 'bg-[#475569] text-white shadow-xs' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                      }`}
                    >
                      N/A
                    </button>
                  </div>

                  {/* Diagnostic Comment Box — only for Fail (or when a note exists); 90% of comments are on failed items */}
                  {(item.status === 'Fail' || (item.note || '').length > 0) ? (
                    <div className="relative pt-1">
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => {
                          const updated = [...beforeDiagnostics];
                          updated[idx].note = e.target.value;
                          setBeforeDiagnostics(updated);
                        }}
                        placeholder={`Comment for ${item.name}...`}
                        className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2.5 py-1.5 text-xs text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...beforeDiagnostics];
                        updated[idx].note = ' ';
                        setBeforeDiagnostics(updated);
                      }}
                      className="pt-1 text-[10px] font-semibold text-[#86868B] hover:text-[#0071E3] transition-colors"
                    >
                      + Add comment
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 4C (Phase 4): Before-Repair Condition Photos */}
        <div className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-2.5">
          <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2 border-b border-[#E5E5EA] pb-2">
            <span className="px-1.5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px] font-black">4C</span>
            <span>Before-Repair Condition Photos</span>
          </h3>

          <div className="flex flex-wrap gap-3">
            {intakePhotos.map((photo, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E5E5EA] group">
                <img src={photo} alt="Intake" className="w-full h-full object-cover" />
                <button
                  onClick={() => setIntakePhotos(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-black/70 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

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
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[#E5E5EA] hover:border-[#0071E3] flex flex-col items-center justify-center text-[#86868B] hover:text-[#0071E3] text-[10px] space-y-1 bg-white transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Take / Add Photo</span>
            </button>
          </div>
          <p className="text-[10px] text-[#86868B] font-medium">Up to 4MB per photo · hover a thumbnail to delete · on mobile the camera opens directly.</p>
        </div>

        {/* Spacer so the sticky bar never covers the content above it at full scroll */}
        <div className="h-20 shrink-0" aria-hidden="true" />

        {/* Sticky Action Bar — live ticket summary + register, always reachable on desktop */}
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 z-20 -mx-4 -mb-4 mt-1 rounded-b-xl bg-white/95 backdrop-blur border-t border-[#E5E5EA] px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {repairCount === 0 ? (
              <div className="flex-1 flex items-center gap-2 text-xs min-w-0" role="status">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-[#51525C] truncate">
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
                  <span className="block text-[9px] uppercase tracking-wider text-[#86868B] font-bold">Repairs</span>
                  <span className="font-black text-[#1D1D1F] text-sm">{repairCount} item{repairCount === 1 ? '' : 's'}</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block text-[9px] uppercase tracking-wider text-[#86868B] font-bold">Estimate</span>
                  <span className="font-black text-[#0071E3] text-sm">{finalEstimate.toLocaleString()} MMK</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block text-[9px] uppercase tracking-wider text-[#86868B] font-bold">{overallDiscountPercent > 0 ? `${overallDiscountPercent}% Off` : 'Saved'}</span>
                  <span className={`font-bold text-sm ${savedAmount > 0 ? 'text-[#34C759]' : 'text-[#86868B]'}`}>{savedAmount.toLocaleString()} MMK</span>
                </div>
              </div>
            )}
            <button
              onClick={handleRegisterDevice}
              disabled={isRegistering}
              className={`w-full sm:w-auto sm:min-w-72 px-6 py-3.5 font-black text-sm rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 shrink-0 ${
                isRegistering
                  ? 'bg-[#86868B] text-white cursor-not-allowed opacity-80'
                  : 'bg-[#0071E3] hover:bg-[#0077ED] text-white active:scale-95'
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
                  <span>{isEditMode ? 'Save Ticket Changes' : 'Register Device & Generate Voucher'}</span>
                </>
              )}
            </button>
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
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <button onClick={() => setIsColorModalOpen(false)} aria-label="Close color picker" className="absolute right-4 top-4 text-[#86868B] hover:text-[#1D1D1F]">
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#E5E5EA] pb-2">
              <h3 className="text-base font-black text-[#1D1D1F]">
                Official Colors for {deviceModel}
              </h3>
              <p className="text-xs text-[#86868B]">Real Apple color finishes with realistic metallic reflections</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
              {availableRealColors.map((colorName) => {
                const style = getRealisticColorStyle(colorName);
                const isSelected = deviceColor === colorName;

                return (
                  <button
                    key={colorName}
                    onClick={() => {
                      setDeviceColor(colorName);
                      setIsColorModalOpen(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center text-center space-y-2 transition-all hover:scale-105 ${
                      isSelected
                        ? 'border-[#0071E3] bg-[#F0F6FF] ring-2 ring-[#0071E3]/30'
                        : 'border-[#E5E5EA] bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Big Realistic Color Circle with Shadow */}
                    <div 
                      className={`w-14 h-14 rounded-full border-2 border-white shadow-lg ${style.border}`}
                      style={{ background: style.gradient, boxShadow: style.shadow }}
                    />
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#0071E3]' : 'text-[#1D1D1F]'}`}>
                      {colorName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Warranty Selection */}
      {isWarrantyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <button onClick={() => setIsWarrantyModalOpen(false)} aria-label="Close warranty info" className="absolute right-4 top-4 text-[#86868B] hover:text-[#1D1D1F]">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#E5E5EA] pb-2 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#28A745]" />
              <span>Standard Warranty Selection</span>
            </h3>

            <div className="space-y-2">
              {WARRANTY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setWarrantyDays(opt.days);
                    setWarrantyLabel(opt.label);
                    setIsWarrantyModalOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-xs font-bold text-left flex justify-between items-center transition-all ${
                    warrantyDays === opt.days
                      ? 'border-[#0071E3] bg-[#F0F6FF] text-[#0071E3]'
                      : 'border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span>{opt.days} Days</span>
                </button>
              ))}

              <div className="pt-2 border-t border-[#E5E5EA] flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Custom Days (e.g. 60)"
                  value={customWarrantyInput}
                  onChange={(e) => setCustomWarrantyInput(e.target.value)}
                  className="flex-1 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs"
                />
                <button
                  onClick={() => {
                    const days = Number(customWarrantyInput);
                    if (days >= 0) {
                      setWarrantyDays(days);
                      setWarrantyLabel(`Custom ${days} Days Warranty`);
                      setIsWarrantyModalOpen(false);
                    }
                  }}
                  className="px-3 py-2 bg-[#0071E3] text-white font-bold text-xs rounded-xl"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Available Repairs Chooser (Catalog Price List) */}
      {isRepairsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-2xl w-full p-6 space-y-4 text-xs shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsRepairsModalOpen(false)}
              className="absolute right-4 top-4 text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#E5E5EA] pb-3 space-y-1">
              <h3 className="text-base font-black text-[#1D1D1F] flex items-center space-x-2">
                <CircleDot className="w-5 h-5 text-[#0071E3]" />
                <span>Price Catalog Repair Selector ({matchedModelName})</span>
              </h3>
              <p className="text-xs text-[#86868B]">
                Select repair services with verified catalog pricing in MMK for {matchedModelName}
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={priceSearchQuery}
                  onChange={(e) => setPriceSearchQuery(e.target.value)}
                  placeholder={`Search repairs for ${matchedModelName} (e.g. Battery, Display, Face ID)...`}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:bg-white focus:border-[#0071E3] focus:outline-none transition-all"
                />
              </div>

              {/* Category Group Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                {['ALL', 'Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((grp) => (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroupFilter(grp)}
                    className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all ${
                      selectedGroupFilter === grp
                        ? 'bg-[#0071E3] text-white shadow-2xs'
                        : 'bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-200'
                    }`}
                  >
                    {grp}
                  </button>
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
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleCatalogRepair(item)}
                      className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer flex justify-between items-center transition-all ${
                        isSelected
                          ? 'border-[#0071E3] bg-[#F0F6FF] text-[#0071E3] font-bold shadow-2xs'
                          : 'border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected ? 'bg-[#0071E3] border-[#0071E3] text-white' : 'border-[#D2D2D7] bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="block font-extrabold text-[#1D1D1F] text-xs">{item.name}</span>
                          <div className="flex items-center space-x-2 text-[10px] text-[#86868B] pt-0.5 font-medium">
                            <span className="px-1.5 py-0.2 bg-[#F5F5F7] rounded text-[#1D1D1F] font-semibold">{item.group}</span>
                            <span>Warranty: {item.warranty}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-[#0071E3]">
                          {item.price.toLocaleString()} MMK
                        </span>
                        {item.isCatalogMatch && (
                          <span className="block text-[9px] text-[#34C759] font-bold">Catalog Verified</span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="pt-2 border-t border-[#E5E5EA] flex items-center justify-between">
              <span className="text-xs text-[#86868B] font-semibold">
                Selected: <strong className="text-[#1D1D1F]">{selectedRepairs.length} repair(s)</strong>
              </span>
              <button
                onClick={() => setIsRepairsModalOpen(false)}
                className="px-6 py-2.5 bg-[#0071E3] text-white font-bold rounded-xl text-xs hover:bg-[#0077ED] transition-colors shadow-sm"
              >
                Apply Selected Repairs ({selectedRepairs.length})
              </button>
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
