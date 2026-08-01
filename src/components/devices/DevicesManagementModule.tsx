import React, { useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { 
  Smartphone, 
  Search, 
  Plus, 
  Cpu, 
  Laptop, 
  Tablet, 
  Watch, 
  Tv, 
  ShieldCheck, 
  ShieldAlert, 
  CircleDot, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  ExternalLink, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Tag,
  Filter,
  Sparkles
} from 'lucide-react';
import { WorkOrder, Customer, AppleDeviceCategory } from '../../types';
import { checkIsDiagnosticCompleted, checkIsBeforeDiagnosticNeeded, checkIsAfterDiagnosticNeeded } from '../../utils/diagnosticUtils';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';

export interface HardwareDevice {
  id: string;
  serialNumber: string;
  imei?: string;
  deviceCategory: AppleDeviceCategory;
  deviceModel: string;
  deviceColor: string;
  passcode: string;
  findMyStatus: 'ON' | 'OFF' | 'UNKNOWN';
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerType: string;
  registeredDate: string;
  workOrders: WorkOrder[];
}

interface DevicesManagementModuleProps {
  workOrders: WorkOrder[];
  customers: Customer[];
  onOpenNewWorkOrder: (prefillDevice?: Partial<WorkOrder>) => void;
  onPrintTag: (wo: WorkOrder) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  categoryFilter?: string;
  setCategoryFilter?: (c: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  isRegisterModalOpen?: boolean;
  setIsRegisterModalOpen?: (open: boolean) => void;
}

export const DevicesManagementModule: React.FC<DevicesManagementModuleProps> = ({
  workOrders,
  customers,
  onOpenNewWorkOrder,
  onPrintTag,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery,
  categoryFilter: propCategoryFilter,
  setCategoryFilter: propSetCategoryFilter,
  dateFilter: propDateFilter,
  setDateFilter: propSetDateFilter,
  isRegisterModalOpen: propIsRegisterModalOpen,
  setIsRegisterModalOpen: propSetIsRegisterModalOpen,
}) => {
  const [localCategory, setLocalCategory] = useState<string>('All');
  const [localFindMy, setLocalFindMy] = useState<string>('All');
  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [localDateFilter, setLocalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [localIsRegisterModalOpen, setLocalIsRegisterModalOpen] = useState(false);

  const selectedCategory = propCategoryFilter !== undefined ? propCategoryFilter : localCategory;
  const setSelectedCategory = propSetCategoryFilter || setLocalCategory;

  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery || setLocalSearchQuery;

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  const isRegisterModalOpen = propIsRegisterModalOpen !== undefined ? propIsRegisterModalOpen : localIsRegisterModalOpen;
  const setIsRegisterModalOpen = propSetIsRegisterModalOpen || setLocalIsRegisterModalOpen;

  const [findMyFilter, setFindMyFilter] = useState<string>('All');
  const [selectedDevice, setSelectedDevice] = useState<HardwareDevice | null>(null);

  // New Device Form State
  const [newCategory, setNewCategory] = useState<AppleDeviceCategory>('iPhone');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newImei, setNewImei] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [newFindMy, setNewFindMy] = useState<'ON' | 'OFF'>('OFF');
  const [newCustomerId, setNewCustomerId] = useState(customers[0]?.id || '');

  // Extract unique hardware devices from all work orders
  const devicesMap = new Map<string, HardwareDevice>();

  workOrders.forEach((wo) => {
    const key = (wo.serialNumber || wo.imei || wo.id).toUpperCase().trim();
    if (!key) return;

    if (!devicesMap.has(key)) {
      devicesMap.set(key, {
        id: `dev-${key}`,
        serialNumber: wo.serialNumber || 'N/A',
        imei: wo.imei,
        deviceCategory: wo.deviceCategory,
        deviceModel: wo.deviceModel,
        deviceColor: wo.deviceColor,
        passcode: wo.passcode,
        findMyStatus: wo.findMyStatus,
        customerId: wo.customerId,
        customerName: wo.customerName,
        customerPhone: wo.customerPhone,
        customerEmail: wo.customerEmail,
        customerType: wo.customerType,
        registeredDate: wo.createdAt,
        workOrders: [wo],
      });
    } else {
      const existing = devicesMap.get(key)!;
      existing.workOrders.push(wo);
      // Keep earliest registered date
      if (new Date(wo.createdAt) < new Date(existing.registeredDate)) {
        existing.registeredDate = wo.createdAt;
      }
    }
  });

  const allDevices = Array.from(devicesMap.values());

  // Filter devices by category, date range, find My, and search query
  let filteredDevices = allDevices;

  if (selectedCategory !== 'All') {
    filteredDevices = filteredDevices.filter(d => d.deviceCategory === selectedCategory);
  }

  if (findMyFilter !== 'All') {
    filteredDevices = filteredDevices.filter(d => d.findMyStatus === findMyFilter);
  }

  // Filter by date range based on latest activity / registered date
  filteredDevices = filteredDevices.filter((device) => {
    const dates = device.workOrders.map(w => ({ createdAt: w.createdAt }));
    return filterByDateRange(dates, dateFilter).length > 0;
  });

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredDevices = filteredDevices.filter(
      d =>
        d.deviceModel.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        (d.imei && d.imei.toLowerCase().includes(q)) ||
        d.customerName.toLowerCase().includes(q) ||
        d.deviceColor.toLowerCase().includes(q)
    );
  }

  // Device Category Icons
  const getDeviceIcon = (category: AppleDeviceCategory) => {
    switch (category) {
      case 'iPhone': return <Smartphone className="w-5 h-5 text-[#0071E3]" />;
      case 'MacBook': return <Laptop className="w-5 h-5 text-indigo-600" />;
      case 'iPad': return <Tablet className="w-5 h-5 text-teal-600" />;
      case 'AppleWatch': return <Watch className="w-5 h-5 text-orange-500" />;
      case 'iMac': return <Tv className="w-5 h-5 text-blue-600" />;
      default: return <Cpu className="w-5 h-5 text-purple-600" />;
    }
  };

  // Quick Registration Handler
  const handleRegisterDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel || !newSerial) return;

    const cust = customers.find(c => c.id === newCustomerId) || customers[0];

    const mockWo: WorkOrder = {
      id: `wo-${Date.now()}`,
      orderNumber: `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerEmail: cust.email,
      customerType: cust.type,
      deviceCategory: newCategory,
      deviceModel: newModel,
      serialNumber: newSerial,
      imei: newImei || undefined,
      deviceColor: newColor || 'Space Gray',
      passcode: newPasscode || 'N/A',
      findMyStatus: newFindMy,
      status: 'Receive',
      priority: 'Normal',
      assignedTechId: 'tech-1',
      assignedTechName: 'Marcus Vance',
      serviceType: 'Standard Modular',
      intakeChecklist: {
        powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
        frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
        cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, physicalDamageNotes: 'Registered device'
      },
      symptomsReported: 'Registered in Hardware Devices Management Matrix.',
      lineItems: [],
      subtotal: 0, depositAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0, isPaid: false,
      warrantyDays: 90, intakePhotos: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), estimatedCompletion: new Date().toISOString()
    };

    onOpenNewWorkOrder(mockWo);
    setIsRegisterModalOpen(false);
    // Reset form
    setNewModel('');
    setNewSerial('');
    setNewImei('');
    setNewColor('');
    setNewPasscode('');
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Top Banner Header */}
      <div className="module-subheader flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#F0F6FF] text-[#0071E3] font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-[#0071E3]/20">
              Hardware Directory Matrix
            </span>
            <span className="text-[#86868B] font-medium">Apple Serial & IMEI Telemetry</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#1D1D1F] mt-1 flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-[#0071E3]" />
            <span>Devices Management & Service History</span>
          </h1>
          <p className="text-xs text-[#86868B] mt-0.5">
            Track serial numbers, Find My status, warranty history, and technical service dossier for all registered devices.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0F6FF] text-[#0071E3] flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase">Registered Devices</p>
            <p className="text-xl font-extrabold text-[#1D1D1F]">{allDevices.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#AF52DE] flex items-center justify-center shrink-0">
            <CircleDot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase">Total Repairs</p>
            <p className="text-xl font-extrabold text-[#1D1D1F]">{workOrders.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase">Initial Diag Pending</p>
            <p className="text-xl font-extrabold text-amber-600">
              {allDevices.filter(d => {
                const wo = d.workOrders[0];
                if (!wo) return false;
                return checkIsBeforeDiagnosticNeeded(wo);
              }).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase">Finished Needs Diag</p>
            <p className="text-xl font-extrabold text-rose-600">
              {allDevices.filter(d => {
                const wo = d.workOrders[0];
                if (!wo) return false;
                return checkIsAfterDiagnosticNeeded(wo);
              }).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase">Find My OFF</p>
            <p className="text-xl font-extrabold text-[#1D1D1F]">
              {allDevices.filter(d => d.findMyStatus === 'OFF').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5EA] shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase">Find My ON</p>
            <p className="text-xl font-extrabold text-[#1D1D1F]">
              {allDevices.filter(d => d.findMyStatus === 'ON').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-3">
        {/* Category Tabs & Find My Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] overflow-x-auto no-scrollbar">
            {['All', 'iPhone', 'MacBook', 'iPad', 'AppleWatch', 'iMac'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#0071E3] text-white shadow-2xs'
                    : 'text-[#424245] hover:text-[#1D1D1F]'
                }`}
              >
                {cat === 'All' ? 'All Devices' : cat}
              </button>
            ))}
          </div>

          {/* Find My Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold text-[#86868B] uppercase flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#0071E3]" />
              Find My:
            </span>
            <select
              value={findMyFilter}
              onChange={(e) => setFindMyFilter(e.target.value)}
              className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-2.5 py-1 text-xs font-bold text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
            >
              <option value="All">All Statuses</option>
              <option value="OFF">Find My OFF (Clear)</option>
              <option value="ON">Find My ON (Active Lock)</option>
            </select>
          </div>
        </div>

        {/* Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 border-t border-[#E5E5EA]">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search serial, IMEI, model, customer..."
              className="w-full bg-[#F5F5F7] text-xs text-[#1D1D1F] placeholder-[#86868B] pl-8 pr-6 py-1.5 rounded-xl border border-[#E5E5EA] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#86868B] hover:text-[#1D1D1F]"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hardware Devices Table */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9F9FB] border-b border-[#E5E5EA] text-[10px] font-extrabold text-[#86868B] uppercase">
                <th className="p-3.5">Device & Model</th>
                <th className="p-3.5">Serial / IMEI</th>
                <th className="p-3.5">Color & Lock</th>
                <th className="p-3.5">Owner / Customer</th>
                <th className="p-3.5 text-center">Service History</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] text-xs">
              {filteredDevices.length > 0 ? (
                filteredDevices.map((device) => {
                  const totalSpentOnDevice = device.workOrders.reduce((sum, w) => sum + w.subtotal, 0);
                  const latestWo = device.workOrders[0];
                  const isLatestDiagDone = latestWo ? (
                    (latestWo.beforeDiagnostics && latestWo.beforeDiagnostics.some((d) => d.status === 'Pass' || d.status === 'Fail')) ||
                    (latestWo.diagnosticResult && latestWo.diagnosticResult.trim().length > 0 && latestWo.diagnosticResult !== 'Diagnostic Pending')
                  ) : true;

                  return (
                    <tr key={device.id} className="hover:bg-[#F0F6FF]/30 transition-colors">
                      {/* Device & Model */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] shrink-0">
                            {getDeviceIcon(device.deviceCategory)}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#1D1D1F]">{device.deviceModel}</p>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="text-[10px] text-[#0071E3] font-bold bg-[#F0F6FF] px-1.5 py-0.2 rounded border border-[#0071E3]/20">
                                {device.deviceCategory}
                              </span>
                              {!isLatestDiagDone && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-0.5 animate-pulse">
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                  <span>Needs Diag</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Serial / IMEI */}
                      <td className="p-3.5 font-mono">
                        <p className="font-bold text-[#1D1D1F]">{device.serialNumber}</p>
                        {device.imei && <p className="text-[10px] text-[#86868B]">IMEI: {device.imei}</p>}
                      </td>

                      {/* Color & Lock Status */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#1D1D1F]">{device.deviceColor}</p>
                          <div className="flex items-center space-x-1">
                            {device.findMyStatus === 'OFF' ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Find My OFF</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>Find My ON</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer / Owner */}
                      <td className="p-3.5">
                        <div>
                          <p className="font-bold text-[#1D1D1F]">{device.customerName}</p>
                          <p className="text-[10px] text-[#86868B]">{device.customerPhone}</p>
                        </div>
                      </td>

                      {/* Service History Stats */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#0071E3] font-extrabold rounded-full border border-blue-200 text-[10px]">
                            {device.workOrders.length} Repair Ticket{device.workOrders.length > 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold mt-1">
                            {totalSpentOnDevice.toLocaleString()} MMK
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedDevice(device)}
                            className="px-2.5 py-1.5 bg-[#F0F6FF] hover:bg-[#0071E3] text-[#0071E3] hover:text-white font-bold text-xs rounded-lg border border-[#0071E3]/20 transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Dossier</span>
                          </button>

                          {latestWo && (
                            <button
                              onClick={() => onPrintTag(latestWo)}
                              className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
                              title="Print Device Tag"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#86868B]">
                    <Smartphone className="w-8 h-8 text-[#0071E3] mx-auto opacity-40 mb-2" />
                    <p className="font-bold text-[#1D1D1F]">No matching hardware devices found</p>
                    <p className="text-[11px] mt-1">Try resetting the search query or date filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device History Dossier Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#F9F9FB]">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl border border-[#E5E5EA] shadow-2xs">
                  {getDeviceIcon(selectedDevice.deviceCategory)}
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-[#1D1D1F]">
                    {selectedDevice.deviceModel}
                  </h2>
                  <p className="text-[10px] text-[#86868B] font-mono">
                    SN: {selectedDevice.serialNumber} {selectedDevice.imei ? `| IMEI: ${selectedDevice.imei}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDevice(null)}
                className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F5F5F7] p-3 rounded-xl border border-[#E5E5EA]">
                <div>
                  <p className="text-[10px] text-[#86868B] font-bold uppercase">Color</p>
                  <p className="font-extrabold text-[#1D1D1F]">{selectedDevice.deviceColor}</p>
                </div>

                <div>
                  <p className="text-[10px] text-[#86868B] font-bold uppercase">Passcode</p>
                  <p className="font-mono font-bold text-[#1D1D1F]">{selectedDevice.passcode}</p>
                </div>

                <div>
                  <p className="text-[10px] text-[#86868B] font-bold uppercase">Find My Status</p>
                  <p className={`font-bold ${selectedDevice.findMyStatus === 'OFF' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedDevice.findMyStatus}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-[#86868B] font-bold uppercase">Owner</p>
                  <p className="font-extrabold text-[#1D1D1F]">{selectedDevice.customerName}</p>
                </div>
              </div>

              {/* Service History Timeline */}
              <div>
                <h3 className="font-extrabold text-[#1D1D1F] border-b border-[#E5E5EA] pb-2 flex items-center justify-between">
                  <span>Complete Service History ({selectedDevice.workOrders.length} Tickets)</span>
                  <button
                    onClick={() => {
                      const latestWo = selectedDevice.workOrders[0];
                      if (latestWo) onOpenNewWorkOrder(latestWo);
                      setSelectedDevice(null);
                    }}
                    className="text-[11px] font-bold text-[#0071E3] hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Ticket for Device</span>
                  </button>
                </h3>

                <div className="space-y-3 mt-3">
                  {selectedDevice.workOrders.map((wo) => (
                    <div key={wo.id} className="p-3.5 rounded-xl border border-[#E5E5EA] bg-white space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-[#0071E3] font-mono">{wo.orderNumber}</span>
                          <span className="text-[10px] text-[#86868B]">{new Date(wo.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <StatusBadge status={wo.status} size="xs" />
                          <PriorityBadge priority={wo.priority} size="xs" />
                        </div>
                      </div>

                      <p className="text-xs text-[#1D1D1F] font-medium">{wo.symptomsReported}</p>

                      {wo.lineItems.length > 0 && (
                        <div className="bg-[#F9F9FB] p-2 rounded-lg text-[11px] space-y-1">
                          <p className="font-bold text-[#86868B] text-[9px] uppercase">Replaced Components & Labor:</p>
                          {wo.lineItems.map((li) => (
                            <div key={li.id} className="flex justify-between text-[#1D1D1F]">
                              <span>• {li.description}</span>
                              <span className="font-bold">{li.unitPrice.toLocaleString()} MMK</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] pt-1 text-[#86868B]">
                        <span>Tech: {wo.assignedTechName || 'Assigned'}</span>
                        <span className="font-extrabold text-[#28A745]">Total: {wo.subtotal.toLocaleString()} MMK</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register New Device */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#F9F9FB]">
              <h2 className="font-extrabold text-sm text-[#1D1D1F] flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#0071E3]" />
                <span>Register Hardware Device</span>
              </h2>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">Owner / Customer</label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F]"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AppleDeviceCategory)}
                    className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F]"
                  >
                    <option value="iPhone">iPhone</option>
                    <option value="MacBook">MacBook</option>
                    <option value="iPad">iPad</option>
                    <option value="AppleWatch">Apple Watch</option>
                    <option value="iMac">iMac</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">Device Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iPhone 15 Pro Max"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. C02M2MAX2023"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
                    className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-mono font-bold text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">IMEI (Optional)</label>
                  <input
                    type="text"
                    placeholder="358921102..."
                    value={newImei}
                    onChange={(e) => setNewImei(e.target.value)}
                    className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-mono text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="Deep Purple"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">Passcode</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-mono text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase mb-1">Find My</label>
                  <select
                    value={newFindMy}
                    onChange={(e) => setNewFindMy(e.target.value as 'ON' | 'OFF')}
                    className="w-full bg-[#F5F5F7] p-2 rounded-xl border border-[#E5E5EA] text-xs font-bold text-[#1D1D1F]"
                  >
                    <option value="OFF">OFF (Clear)</option>
                    <option value="ON">ON (Locked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-3 py-2 text-xs font-bold text-[#86868B] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold text-xs rounded-xl shadow-2xs"
                >
                  Register & Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
