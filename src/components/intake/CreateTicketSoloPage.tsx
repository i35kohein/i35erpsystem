import React, { useState, useEffect } from 'react';
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
    if (phone.trim().length >= 4) {
      const found = customers.find(c => c.phone.replace(/\D/g, '').includes(phone.replace(/\D/g, '')));
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

  // Submit / Register Device
  const handleRegisterDevice = () => {
    if (isRegistering) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Please enter customer name and phone number.', 'Missing Customer Info');
      return;
    }
    if (!deviceModel.trim()) {
      toast.error('Please select a device model.', 'Missing Device');
      return;
    }
    setIsRegistering(true);

    const prefix = systemSettings?.ticketPrefix || 'WO-';
    const baseWorkOrder = editWorkOrder || null;
    const newOrderNumber = baseWorkOrder?.orderNumber || `${prefix}2026-${1000 + workOrders.length + 1}`;
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
      beforeDiagnostics: baseWorkOrder?.beforeDiagnostics || beforeDiagnostics,
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
      intakeChecklist: baseWorkOrder?.intakeChecklist || {
        powerOn: true,
        screenDisplay: true,
        touchGrid: true,
        faceIdOrTouchId: true,
        trueTonePresent: true,
        frontCamera: true,
        rearCamera: true,
        microphones: true,
        speakers: true,
        wifiBluetooth: true,
        cellularSignal: true,
        wirelessCharging: true,
        liquidIndicatorTriggered: false,
        batteryHealthPercent: 88,
        physicalDamageNotes: extraReportedNotes.trim() || baseWorkOrder?.intakeChecklist?.physicalDamageNotes || '',
      }
    };

    onSaveWorkOrder(newWorkOrder);
    setCreatedTicket(newWorkOrder);
    setIsRegistering(false);
  };

  const handleResetForm = () => {
    setCreatedTicket(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerTown('');
    setCustomerAddress('');
    setSerialNumber('');
    setImei('');
    setPasscode('');
    setSelectedRepairs([]);
    setExtraReportedNotes('');
  };

  if (createdTicket) {
    const selectedColorStyle = getRealisticColorStyle(createdTicket.deviceColor);

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
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
              onClick={handleResetForm}
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
    <div className="max-w-5xl mx-auto space-y-3 pb-5">
      {/* Top Banner Header */}
      <div className="module-toolbar bg-white px-3.5 py-3 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F0F6FF] text-[#0071E3] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-[#1D1D1F] truncate">{isEditMode ? 'Edit Intake Ticket' : 'New Intake Ticket Registration'}</h1>
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

        {/* Stepper Progress — 4 phases, completes as fields are filled */}
        {(() => {
          const steps = [
            { label: 'Customer', done: Boolean(customerName.trim() && customerPhone.trim()) },
            { label: 'Device', done: Boolean(deviceModel) },
            { label: 'Repairs', done: selectedRepairs.length > 0 },
            { label: 'Diagnostics', done: beforeDiagnostics.some((d) => d.status === 'Pass' || d.status === 'Fail') },
          ];
          const doneCount = steps.filter((s) => s.done).length;
          const pct = Math.round((doneCount / steps.length) * 100);
          return (
            <div className="px-1 pt-1" role="group" aria-label="Intake progress">
              <div className="flex items-center gap-2">
                {steps.map((s, i) => (
                  <div key={s.label} className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                          s.done ? 'bg-[#34C759] text-white' : 'bg-[#E5E5EA] text-[#86868B]'
                        }`}
                      >
                        {s.done ? <Check className="w-3 h-3" /> : i + 1}
                      </span>
                      <span className={`text-[11px] font-bold truncate ${s.done ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <div className="h-0.5 mt-2 -ml-1 mr-1 rounded-full bg-[#E5E5EA]"><div className="h-full rounded-full bg-[#34C759] transition-all" style={{ width: s.done ? '100%' : '0%' }} /></div>}
                  </div>
                ))}
              </div>
              <div className="mt-2 h-1 rounded-full bg-[#E5E5EA] overflow-hidden">
                <div className="h-full bg-[#0071E3] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-[#86868B] font-medium">{doneCount}/4 complete — {pct}%</p>
            </div>
          );
        })()}

        {/* STEP 1: Customer Information */}
        <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] space-y-2.5">
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
              <label className="block text-[#86868B] mb-1 font-medium">Phone Number *</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 09-123456789 or 09-987654321"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[#86868B] mb-1 font-medium">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Mg Mg / Daw Hla (Full Name)"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[#86868B] mb-1 font-medium">Town / City *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#0071E3] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={customerTown}
                  onChange={(e) => setCustomerTown(e.target.value)}
                  placeholder="e.g. Yangon, Mandalay, Bago"
                  className="w-full bg-white border border-[#E5E5EA] rounded-xl pl-9 pr-3 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none font-semibold transition-all"
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
        <div 
          onClick={() => setIsModelModalOpen(true)}
          className="p-3 bg-[#F5F5F7]/80 rounded-xl border border-[#E5E5EA] space-y-2.5 cursor-pointer hover:border-[#0071E3]/50 hover:bg-[#F5F5F7] transition-all group"
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
            <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-lg border border-dashed border-amber-300 text-xs shadow-2xs group-hover:border-amber-400">
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
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E5E5EA] text-xs shadow-sm group-hover:shadow-md transition-shadow">
              <div>
                <span className="text-[#86868B]">Selected Model: </span>
                <span className="font-extrabold text-[#1D1D1F] ml-1 text-sm">{deviceModel}</span>
              </div>
              <span className="text-[10px] text-[#0071E3] font-bold bg-[#F0F6FF] px-2.5 py-0.5 rounded-full border border-[#0071E3]/20">
                Real Model Verified
              </span>
            </div>
          )}
        </div>

        {/* STEP 3 & STEP 4: Color (REAL DEVICE COLOR BIG CIRCLE WITH SHADOW) & Warranty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* STEP 3: Real Official Color Selection */}
          <div 
            onClick={() => setIsColorModalOpen(true)}
            className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] space-y-2.5 cursor-pointer hover:border-[#0071E3]/50 transition-all group"
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
              <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[11px] font-black group-hover:scale-105 transition-transform">3</span>
                <span className="text-xs">Realistic Color ({availableRealColors.length} Palette)</span>
              </h3>
              <span className="text-xs font-bold text-[#0071E3] group-hover:underline">Change</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="block text-[10px] text-[#86868B]">Selected Color:</span>
                <span className="text-sm font-extrabold text-[#1D1D1F]">{deviceColor}</span>
              </div>
              <div 
                className={`w-11 h-11 rounded-full border-2 border-white shadow-xs ${activeColorStyle.border}`}
                style={{ background: activeColorStyle.gradient }}
              />
            </div>
          </div>

          {/* STEP 4: Warranty Selection */}
          <div 
            onClick={() => setIsWarrantyModalOpen(true)}
            className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] space-y-2.5 cursor-pointer hover:border-[#0071E3]/50 transition-all group"
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
              <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[11px] font-black group-hover:scale-105 transition-transform">4</span>
                <span className="text-xs">Warranty Policy</span>
              </h3>
              <span className="text-xs font-bold text-[#0071E3] group-hover:underline">Change</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F] flex items-center justify-between shadow-2xs group-hover:shadow-sm transition-shadow">
              <div>
                <span className="block text-[10px] text-[#86868B]">Covered Warranty:</span>
                <span className="text-sm font-extrabold text-[#1D1D1F]">{warrantyLabel}</span>
              </div>
              <div className="p-2 bg-[#EAF8ED] text-[#34C759] rounded-xl shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[#86868B] mb-1 font-medium">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                placeholder="e.g. C02M2MAX2023 or F2LXK09PN6T"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-2 font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[#86868B] mb-1 font-medium">IMEI Number (15 Digits)</label>
              <input
                type="text"
                value={imei}
                maxLength={15}
                onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 358921102938102"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-2 font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[#86868B] mb-1 font-medium">Device Passcode</label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode / PIN"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-2 font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* STEP 5: Choose Available Repairs (MMK CURRENCY) */}
        <div className="p-3 bg-[#F5F5F7]/80 rounded-xl border border-[#E5E5EA] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
            <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px]">5</span>
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
              <div className="bg-[#E5F1FF]/60 border border-[#0071E3]/30 rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-xs shadow-sm">
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
                <div className="col-span-2 md:col-span-1 bg-[#0071E3] text-white rounded-xl p-2.5 flex flex-col justify-center">
                  <span className="block text-[9px] opacity-90 uppercase font-bold tracking-wider">Final Estimate</span>
                  <span className="font-black text-base">{finalEstimate.toLocaleString()} MMK</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* STEP 6: Intake Notes */}
        <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#D2D2D7] space-y-2.5">
          <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2 border-b border-[#D2D2D7] pb-2">
            <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px]">6</span>
            <span>Intake Notes & Customer Symptoms</span>
          </h3>

          <textarea
            rows={2}
            value={extraReportedNotes}
            onChange={(e) => setExtraReportedNotes(e.target.value)}
            placeholder="Enter customer symptoms or intake notes"
            className="w-full bg-white border border-[#D2D2D7] rounded-xl p-3 text-xs text-[#1D1D1F] focus:border-[#0071E3]"
          />
        </div>

        {/* STEP 7: 21-Point Repair Diagnostic Inspection with Comment Box & Dedicated Icons */}
        <div className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
            <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px]">7</span>
              <span>21-Point Repair Diagnostic List</span>
            </h3>
            <div className="flex space-x-2">
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
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

                  {/* Diagnostic Comment Box */}
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
                      className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2.5 py-1 text-[11px] text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 8: Before-Repair Condition Photos */}
        <div className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-2.5">
          <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2 border-b border-[#E5E5EA] pb-2">
            <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px]">8</span>
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

            <button
              onClick={() => {
                const newPhoto = prompt('Enter photo URL:');
                if (newPhoto) setIntakePhotos(prev => [...prev, newPhoto]);
              }}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[#E5E5EA] hover:border-[#0071E3] flex flex-col items-center justify-center text-[#86868B] hover:text-[#0071E3] text-[10px] space-y-1 bg-white transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Add Photo</span>
            </button>
          </div>
        </div>

        {/* Final Register Action Button (No Customer Signature Needed) */}
        <div className="pt-2">
          <button
            onClick={handleRegisterDevice}
            disabled={isRegistering}
            className={`w-full py-4 font-black text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-2 ${
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
                <span>{isEditMode ? 'Save Ticket Changes' : 'Register Device & Generate Repair Ticket Voucher'}</span>
              </>
            )}
          </button>
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
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:bg-white focus:border-[#0071E3] focus:outline-none transition-all"
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
                    <div
                      key={item.id}
                      onClick={() => toggleCatalogRepair(item)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex justify-between items-center transition-all ${
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
                    </div>
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
