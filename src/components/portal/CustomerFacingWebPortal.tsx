import React, { useState } from 'react';
import { 
  CircleDot, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Smartphone, 
  MessageSquare, 
  ShieldCheck, 
  FileText, 
  Phone, 
  Mail, 
  User, 
  Printer, 
  Send, 
  X, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  Lock, 
  ClipboardCheck,
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw,
  Info,
  Calendar,
  CreditCard,
  MapPin,
  Award
} from 'lucide-react';
import { WorkOrder, SystemSettings, Customer } from '../../types';
import { applyEstimateApproval, applyEstimateRejection } from '../../utils/portalWorkflow';

interface CustomerFacingWebPortalProps {
  workOrders: WorkOrder[];
  customers?: Customer[];
  systemSettings: SystemSettings;
  onUpdateWorkOrder: (wo: WorkOrder) => void;
  onExitPortalMode?: () => void;
  initialIdentifier?: string;
}

export const CustomerFacingWebPortal: React.FC<CustomerFacingWebPortalProps> = ({
  workOrders,
  customers = [],
  systemSettings,
  onUpdateWorkOrder,
  onExitPortalMode,
  initialIdentifier = '',
}) => {
  // Login State
  const [identifierInput, setIdentifierInput] = useState<string>(initialIdentifier);
  const [authenticatedCustomerPhoneOrEmail, setAuthenticatedCustomerPhoneOrEmail] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Modals & Customer Interactions State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('Request Phone Call from Technician');
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [messageInput, setMessageInput] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [customerNameSig, setCustomerNameSig] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ESTIMATE' | 'DIAGNOSTICS' | 'MESSAGES'>('OVERVIEW');

  // Find matching work orders based on phone, email, order number, serial number, or IMEI
  const matchingWorkOrders = workOrders.filter((wo) => {
    if (!authenticatedCustomerPhoneOrEmail) return false;
    const target = authenticatedCustomerPhoneOrEmail.toLowerCase().trim();
    
    // Clean phone numbers for comparison (remove spaces, parens, hyphens)
    const cleanTarget = target.replace(/[^0-[#0-9a-z]/gi, '');
    const cleanPhone = wo.customerPhone?.replace(/[^0-9]/g, '');

    return (
      wo.orderNumber.toLowerCase().includes(target) ||
      (wo.customerPhone && wo.customerPhone.toLowerCase().includes(target)) ||
      (cleanPhone && cleanPhone.length > 3 && cleanTarget.includes(cleanPhone)) ||
      (wo.customerEmail && wo.customerEmail.toLowerCase().includes(target)) ||
      (wo.serialNumber && wo.serialNumber.toLowerCase() === target) ||
      (wo.imei && wo.imei.toLowerCase() === target)
    );
  });

  // Active Selected Work Order
  const currentWorkOrder = matchingWorkOrders.find((w) => w.id === selectedWorkOrderId) || matchingWorkOrders[0] || null;

  // Handle Login Lookup
  const handleLogin = (e?: React.FormEvent, directInput?: string) => {
    if (e) e.preventDefault();
    const query = (directInput || identifierInput).trim();
    
    if (!query) {
      setLoginError('Please enter your phone number, email, or order number.');
      return;
    }

    const cleanQuery = query.toLowerCase().replace(/[^0-[#0-9a-z]/gi, '');

    // Check if any work order matches
    const found = workOrders.filter((wo) => {
      const cleanPhone = wo.customerPhone?.replace(/[^0-9]/g, '');
      return (
        wo.orderNumber.toLowerCase() === query.toLowerCase() ||
        wo.orderNumber.toLowerCase().replace(/[^0-9a-z]/g, '') === cleanQuery ||
        (wo.customerPhone && wo.customerPhone.toLowerCase().includes(query.toLowerCase())) ||
        (cleanPhone && cleanPhone.length >= 4 && cleanQuery.includes(cleanPhone)) ||
        (wo.customerEmail && wo.customerEmail.toLowerCase().trim() === query.toLowerCase().trim()) ||
        (wo.serialNumber && wo.serialNumber.toLowerCase() === query.toLowerCase()) ||
        (wo.imei && wo.imei.toLowerCase() === query.toLowerCase())
      );
    });

    if (found.length > 0) {
      setAuthenticatedCustomerPhoneOrEmail(query);
      setSelectedWorkOrderId(found[0].id);
      setCustomerNameSig(found[0].customerName);
      setLoginError(null);
    } else {
      setLoginError(`No active repair ticket found for "${query}". Please check your voucher receipt or contact ${systemSettings.shopPhone}.`);
    }
  };

  // Handle Estimate Approval — delegates to pure applyEstimateApproval() (see portalWorkflow.test.ts)
  const handleApproveEstimate = () => {
    if (!currentWorkOrder) return;

    const updatedWo = applyEstimateApproval(
      {
        workOrder: currentWorkOrder,
        customerName: customerNameSig || currentWorkOrder.customerName,
        currencySymbol: systemSettings.currencySymbol,
      },
      new Date().toISOString()
    );

    onUpdateWorkOrder(updatedWo);
    setApprovalModalOpen(false);
  };

  // Handle Estimate Rejection / Request Call — delegates to pure applyEstimateRejection()
  const handleRejectEstimate = () => {
    if (!currentWorkOrder) return;

    const updatedWo = applyEstimateRejection(
      {
        workOrder: currentWorkOrder,
        customerName: currentWorkOrder.customerName,
        rejectionReason,
        rejectionNotes,
      },
      new Date().toISOString()
    );

    onUpdateWorkOrder(updatedWo);
    setRejectionModalOpen(false);
    setRejectionNotes('');
  };

  // Handle Customer Direct Messaging
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentWorkOrder) return;

    const now = new Date().toLocaleString();
    const newInquiry = {
      id: `inq-${Date.now()}`,
      timestamp: now,
      sender: 'Customer' as const,
      text: messageInput.trim(),
    };

    const updatedInquiries = [...(currentWorkOrder.customerInquiries || []), newInquiry];
    const updatedLogs = [
      ...(currentWorkOrder.repairLogs || []),
      {
        id: `log-msg-${Date.now()}`,
        timestamp: now,
        author: `Customer (${currentWorkOrder.customerName})`,
        note: `Message received from customer: "${messageInput.trim()}"`,
      },
    ];

    const updatedWo: WorkOrder = {
      ...currentWorkOrder,
      customerInquiries: updatedInquiries,
      repairLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    };

    onUpdateWorkOrder(updatedWo);
    setMessageInput('');
  };

  // Progress Pipeline Stage Helper
  const getProgressStage = (status: string) => {
    switch (status) {
      case 'Receive':
        return 1;
      case 'Pending':
        return 2;
      case 'In Progress':
        return 3;
      case 'Finished':
        return 4;
      case 'Taken Out':
        return 5;
      case 'Cant Repair':
      case 'Customer Not Repair':
        return -1;
      default:
        return 1;
    }
  };

  // Render Login View if not authenticated
  if (!authenticatedCustomerPhoneOrEmail || !currentWorkOrder) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-between p-4 sm:p-6 text-xs antialiased">
        {/* Top Header */}
        <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 px-4 bg-white/80 backdrop-blur-md rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0071E3] flex items-center justify-center text-white shrink-0">
              <CircleDot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-[#1D1D1F] tracking-tight">{systemSettings.shopName}</h1>
              <p className="text-[10px] text-[#86868B] font-medium">Customer Repair Status Portal</p>
            </div>
          </div>

          {onExitPortalMode && (
            <button
              onClick={onExitPortalMode}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl border border-[#E5E5EA] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Staff ERP</span>
            </button>
          )}
        </header>

        {/* Main Login Box */}
        <main className="max-w-md mx-auto w-full my-auto py-8">
          <div className="bg-white rounded-3xl border border-[#E5E5EA] p-6 sm:p-8 shadow-md space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F6FF] text-[#0071E3] border border-[#0071E3]/20 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-[#1D1D1F]">Check Your Repair Status</h2>
              <p className="text-xs text-[#86868B]">
                Enter your phone number, email, or Work Order # (e.g. WO-2026-1001) to view real-time repair progress, inspect diagnostic logs, and approve estimates.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl text-[#FF3B30] text-xs font-medium flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[#1D1D1F] font-bold mb-1">Unique Identifier</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={(e) => {
                      setIdentifierInput(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="e.g. (555) 234-5678 or WO-2026-1001"
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] focus:bg-white transition-all placeholder-[#86868B]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full max-w-md mx-auto py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-xl text-sm shadow-xs transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 focus-visible:ring-offset-2"
              >
                <span className="truncate">Track Repair Voucher</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </form>

          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-[#86868B] text-[11px] space-y-1">
          <p>© {new Date().getFullYear()} {systemSettings.shopName}. All rights reserved.</p>
          <p>Need support? Call <a href={`tel:${systemSettings.shopPhone}`} className="text-[#0071E3] underline">{systemSettings.shopPhone}</a> or visit {systemSettings.shopAddress}</p>
        </footer>
      </div>
    );
  }

  const currentStage = getProgressStage(currentWorkOrder.status);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col text-xs antialiased pb-12">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#0071E3] text-white flex items-center justify-center font-extrabold shadow-2xs">
              <CircleDot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-sm text-[#1D1D1F]">{systemSettings.shopName}</h1>
                <span className="bg-[#34C759]/15 text-[#34C759] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#34C759]/30">
                  LIVE PORTAL
                </span>
              </div>
              <p className="text-[10px] text-[#86868B]">Logged in: <strong className="text-[#1D1D1F]">{currentWorkOrder.customerName}</strong> ({currentWorkOrder.customerPhone || currentWorkOrder.customerEmail})</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Ticket Selector Dropdown if customer has multiple tickets */}
            {matchingWorkOrders.length > 1 && (
              <div className="flex items-center space-x-1.5 bg-[#F5F5F7] px-2.5 py-1.5 rounded-xl border border-[#E5E5EA]">
                <label className="text-[10px] text-[#86868B] font-bold">Select Device:</label>
                <select
                  value={currentWorkOrder.id}
                  onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                  className="bg-transparent text-[#0071E3] font-bold text-xs focus:outline-none"
                >
                  {matchingWorkOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.orderNumber} - {wo.deviceModel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onExitPortalMode && (
              <button
                onClick={onExitPortalMode}
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl border border-[#E5E5EA] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ERP Mode</span>
              </button>
            )}

            <button
              onClick={() => {
                setAuthenticatedCustomerPhoneOrEmail(null);
                setSelectedWorkOrderId(null);
              }}
              className="px-3 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] font-bold rounded-xl border border-[#FF3B30]/20 transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Portal Canvas */}
      <main className="max-w-6xl mx-auto w-full px-4 pt-6 space-y-6 flex-1">
        
        {/* Urgent Action Banner if Estimate is Pending Approval */}
        {(currentWorkOrder.estimateStatus === 'Pending Approval' || (currentWorkOrder.status === 'Receive' && !currentWorkOrder.estimateStatus)) && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm text-[#1D1D1F]">Action Required: Review Repair Quote Estimate</h3>
                  <span className="bg-[#FF9500] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                    Awaiting Approval
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73]">
                  Our technicians have completed the initial diagnostic inspection for your <strong>{currentWorkOrder.deviceModel}</strong>. Total estimated cost: <strong className="text-[#1D1D1F] font-mono text-sm">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setApprovalModalOpen(true)}
                className="px-4 py-2.5 bg-[#34C759] hover:bg-[#30B753] text-white font-extrabold rounded-xl shadow-xs transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Approve Estimate</span>
              </button>
              <button
                onClick={() => setRejectionModalOpen(true)}
                className="px-3 py-2.5 bg-white border border-[#E5E5EA] text-[#FF3B30] hover:bg-[#FF3B30]/10 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Decline / Request Call
              </button>
            </div>
          </div>
        )}

        {/* Work Order Header Summary Banner */}
        <div className="bg-white rounded-3xl border border-[#E5E5EA] p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E5EA] pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold font-mono text-[#0071E3] bg-[#F0F6FF] px-2.5 py-1 rounded-lg border border-[#0071E3]/20">
                  {currentWorkOrder.orderNumber}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  currentWorkOrder.status === 'Finished' ? 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/30' :
                  currentWorkOrder.status === 'In Progress' ? 'bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/30' :
                  'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/30'
                }`}>
                  Status: {currentWorkOrder.status}
                </span>
                {currentWorkOrder.priority === 'Rush' && (
                  <span className="bg-[#FF3B30]/10 text-[#FF3B30] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#FF3B30]/30">
                    RUSH SERVICE
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-[#1D1D1F] mt-2">
                {currentWorkOrder.deviceModel} ({currentWorkOrder.deviceColor})
              </h2>
              <p className="text-xs text-[#86868B] mt-0.5">
                Serial / IMEI: <span className="font-mono text-[#1D1D1F] font-semibold">{currentWorkOrder.serialNumber || currentWorkOrder.imei || 'N/A'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[#F5F5F7] p-3 rounded-2xl border border-[#E5E5EA]">
              <div className="text-right">
                <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-wider">Estimated Completion</p>
                <p className="text-sm font-extrabold text-[#0071E3] font-mono">
                  {currentWorkOrder.estimatedCompletion ? new Date(currentWorkOrder.estimatedCompletion).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Bench Test'}
                </p>
              </div>
              <button
                onClick={() => setPrintModalOpen(true)}
                className="p-2.5 bg-white border border-[#E5E5EA] text-[#1D1D1F] hover:bg-slate-50 rounded-xl font-bold transition-all shadow-2xs cursor-pointer"
                title="Print Digital Voucher Receipt"
              >
                <Printer className="w-4 h-4 text-[#0071E3]" />
              </button>
            </div>
          </div>

          {/* 5-Stage Visual Progress Bar */}
          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Live Repair Progress Timeline</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative">
              {/* Stage 1: Intake Received */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 1
                  ? 'bg-[#F0F6FF] border-[#0071E3]/40 text-[#0071E3]'
                  : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase">1. Received</span>
                  {currentStage >= 1 && <CheckCircle2 className="w-4 h-4 text-[#0071E3]" />}
                </div>
                <p className="font-bold text-xs text-[#1D1D1F]">Ticket Intake</p>
                <p className="text-[10px] text-[#86868B]">Checked in at shop</p>
              </div>

              {/* Stage 2: Diagnostics */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 2
                  ? 'bg-[#F0F6FF] border-[#0071E3]/40 text-[#0071E3]'
                  : currentStage === 1
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase">2. Diagnostics</span>
                  {currentStage >= 2 ? <CheckCircle2 className="w-4 h-4 text-[#0071E3]" /> : currentStage === 1 ? <Clock className="w-4 h-4 animate-spin text-amber-600" /> : null}
                </div>
                <p className="font-bold text-xs text-[#1D1D1F]">Testing & Quote</p>
                <p className="text-[10px] text-[#86868B]">Inspection complete</p>
              </div>

              {/* Stage 3: In Repair */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 3
                  ? 'bg-[#F0F6FF] border-[#0071E3]/40 text-[#0071E3]'
                  : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase">3. In Repair</span>
                  {currentStage >= 3 && <CheckCircle2 className="w-4 h-4 text-[#0071E3]" />}
                </div>
                <p className="font-bold text-xs text-[#1D1D1F]">Bench Service</p>
                <p className="text-[10px] text-[#86868B]">Parts & Assembly</p>
              </div>

              {/* Stage 4: QA Verified */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 4
                  ? 'bg-[#34C759]/10 border-[#34C759]/40 text-[#34C759]'
                  : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase">4. QA Passed</span>
                  {currentStage >= 4 && <CheckCircle2 className="w-4 h-4 text-[#34C759]" />}
                </div>
                <p className="font-bold text-xs text-[#1D1D1F]">Quality Check</p>
                <p className="text-[10px] text-[#86868B]">21-Point Verified</p>
              </div>

              {/* Stage 5: Ready for Collection */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 5
                  ? 'bg-[#34C759]/20 border-[#34C759]/60 text-[#34C759]'
                  : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase">5. Complete</span>
                  {currentStage >= 5 && <CheckCircle2 className="w-4 h-4 text-[#34C759]" />}
                </div>
                <p className="font-bold text-xs text-[#1D1D1F]">Ready Pickup</p>
                <p className="text-[10px] text-[#86868B]">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="flex border-b border-[#E5E5EA] space-x-2 bg-white px-4 pt-2 rounded-2xl border shadow-2xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'border-[#0071E3] text-[#0071E3]'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Repair Summary & Details</span>
          </button>

          <button
            onClick={() => setActiveTab('ESTIMATE')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap relative ${
              activeTab === 'ESTIMATE'
                ? 'border-[#0071E3] text-[#0071E3]'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Itemized Quote Estimate</span>
            {currentWorkOrder.estimateStatus === 'Pending Approval' && (
              <span className="w-2 h-2 rounded-full bg-[#FF9500] animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'DIAGNOSTICS'
                ? 'border-[#0071E3] text-[#0071E3]'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>21-Point Diagnostic Inspection</span>
          </button>

          <button
            onClick={() => setActiveTab('MESSAGES')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap relative ${
              activeTab === 'MESSAGES'
                ? 'border-[#0071E3] text-[#0071E3]'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Shop & Technician</span>
            {currentWorkOrder.customerInquiries && currentWorkOrder.customerInquiries.length > 0 && (
              <span className="bg-[#0071E3] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                {currentWorkOrder.customerInquiries.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Device & Tech Details */}
            <div className="md:col-span-7 space-y-6">
              {/* Reported Issues & Technical Findings */}
              <div className="bg-white rounded-3xl border border-[#E5E5EA] p-5 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-sm text-[#1D1D1F] flex items-center space-x-2">
                  <ClipboardCheck className="w-4 h-4 text-[#0071E3]" />
                  <span>Reported Symptoms & Diagnostic Findings</span>
                </h3>

                <div className="p-3.5 bg-[#F5F5F7] rounded-2xl border border-[#E5E5EA] space-y-1">
                  <span className="text-[10px] font-bold text-[#86868B] uppercase">Symptoms Reported at Intake</span>
                  <p className="text-xs text-[#1D1D1F] font-medium">{currentWorkOrder.symptomsReported || 'None specified at check-in'}</p>
                </div>

                {currentWorkOrder.diagnosticResult && (
                  <div className="p-3.5 bg-[#F0F6FF] rounded-2xl border border-[#0071E3]/20 space-y-1">
                    <span className="text-[10px] font-bold text-[#0071E3] uppercase">Technician Diagnostic Findings</span>
                    <p className="text-xs text-[#1D1D1F] font-medium">{currentWorkOrder.diagnosticResult}</p>
                  </div>
                )}

                {currentWorkOrder.assignedTechName && (
                  <div className="flex items-center space-x-3 pt-2 border-t border-[#E5E5EA]">
                    <div className="w-9 h-9 rounded-full bg-[#0071E3] text-white flex items-center justify-center font-bold">
                      {currentWorkOrder.assignedTechName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[#1D1D1F] text-xs">Assigned Technician: {currentWorkOrder.assignedTechName}</p>
                      <p className="text-[10px] text-[#86868B]">Specialized Apple Master Technician</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Activity & Status Log */}
              <div className="bg-white rounded-3xl border border-[#E5E5EA] p-5 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-sm text-[#1D1D1F] flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#0071E3]" />
                  <span>Real-Time Repair History & Logs</span>
                </h3>

                <div className="space-y-3">
                  {currentWorkOrder.repairLogs && currentWorkOrder.repairLogs.length > 0 ? (
                    currentWorkOrder.repairLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-[#86868B]">
                          <span className="font-bold text-[#1D1D1F]">{log.author || 'Shop Tech'}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className="text-xs text-[#1D1D1F]">{log.note}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#86868B] italic">No public log updates recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Warranty & Financial Overview */}
            <div className="md:col-span-5 space-y-6">
              {/* Financial Quick Card */}
              <div className="bg-white rounded-3xl border border-[#E5E5EA] p-5 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-sm text-[#1D1D1F] flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-[#0071E3]" />
                  <span>Payment & Financial Summary</span>
                </h3>

                <div className="space-y-2 bg-[#F5F5F7] p-4 rounded-2xl border border-[#E5E5EA] text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#86868B]">Subtotal:</span>
                    <span className="font-mono text-[#1D1D1F]">{currentWorkOrder.subtotal.toLocaleString()} {systemSettings.currencySymbol}</span>
                  </div>
                  {currentWorkOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-[#34C759]">
                      <span>Discount Applied:</span>
                      <span className="font-mono">-{currentWorkOrder.discountAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                    </div>
                  )}
                  {currentWorkOrder.depositAmount > 0 && (
                    <div className="flex justify-between text-[#0071E3]">
                      <span>Deposit Paid:</span>
                      <span className="font-mono">-{currentWorkOrder.depositAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#E5E5EA] flex justify-between font-extrabold text-sm">
                    <span className="text-[#1D1D1F]">Total Amount:</span>
                    <span className="font-mono text-[#0071E3]">
                      {currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#F0F6FF] rounded-xl border border-[#0071E3]/20 flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1D1D1F]">Payment Status:</span>
                  <span className={`font-extrabold text-xs px-2.5 py-0.5 rounded-full border ${
                    currentWorkOrder.isPaid
                      ? 'bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30'
                      : 'bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30'
                  }`}>
                    {currentWorkOrder.isPaid ? 'PAID IN FULL' : 'PAYMENT DUE AT PICKUP'}
                  </span>
                </div>
              </div>

              {/* Warranty Coverage Card */}
              <div className="bg-white rounded-3xl border border-[#E5E5EA] p-5 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 text-[#34C759]">
                  <Award className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm text-[#1D1D1F]">Warranty Coverage Guarantee</h3>
                </div>
                <p className="text-xs text-[#6E6E73]">
                  All modular repairs and replacement parts installed by {systemSettings.shopName} include full warranty protection.
                </p>

                <div className="p-3 bg-[#34C759]/10 border border-[#34C759]/30 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1D1D1F]">Covered Period:</span>
                  <span className="font-extrabold text-xs text-[#34C759] font-mono">
                    {currentWorkOrder.warrantyDays || 90} Days Guarantee
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ESTIMATE */}
        {activeTab === 'ESTIMATE' && (
          <div className="bg-white rounded-3xl border border-[#E5E5EA] p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5EA] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#1D1D1F]">Itemized Repair Quote Estimate</h3>
                <p className="text-xs text-[#86868B]">Official breakdown of required replacement components and repair labor</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#86868B]">Estimate Status:</span>
                <span className={`px-3 py-1 rounded-full font-extrabold text-xs border ${
                  currentWorkOrder.estimateStatus === 'Approved'
                    ? 'bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30'
                    : currentWorkOrder.estimateStatus === 'Rejected'
                    ? 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30'
                    : 'bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30 animate-pulse'
                }`}>
                  {currentWorkOrder.estimateStatus || 'Awaiting Approval'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden divide-y divide-[#E5E5EA]">
              <div className="bg-[#F5F5F7] px-4 py-2.5 grid grid-cols-12 font-bold text-[#86868B] text-[10px] uppercase tracking-wider">
                <div className="col-span-6">Description / Component</div>
                <div className="col-span-2 text-center">Type</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Price</div>
              </div>

              {currentWorkOrder.lineItems.map((li) => (
                <div key={li.id} className="px-4 py-3 grid grid-cols-12 items-center text-xs">
                  <div className="col-span-6 font-semibold text-[#1D1D1F]">
                    {li.description}
                    {li.partQuality && (
                      <span className="block text-[10px] text-[#0071E3] font-normal">{li.partQuality}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      li.isLabor ? 'bg-purple-50 text-purple-700' : 'bg-[#F0F6FF] text-[#0071E3]'
                    }`}>
                      {li.isLabor ? 'Labor' : 'Part'}
                    </span>
                  </div>
                  <div className="col-span-2 text-center font-mono font-medium">{li.quantity}</div>
                  <div className="col-span-2 text-right font-mono font-bold text-[#1D1D1F]">
                    {(li.unitPrice * li.quantity).toLocaleString()} {systemSettings.currencySymbol}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Box */}
            <div className="max-w-xs ml-auto space-y-2 bg-[#F5F5F7] p-4 rounded-2xl border border-[#E5E5EA]">
              <div className="flex justify-between text-xs text-[#86868B]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#1D1D1F]">{currentWorkOrder.subtotal.toLocaleString()} {systemSettings.currencySymbol}</span>
              </div>
              {currentWorkOrder.taxAmount > 0 && (
                <div className="flex justify-between text-xs text-[#86868B]">
                  <span>Tax:</span>
                  <span className="font-mono text-[#1D1D1F]">{currentWorkOrder.taxAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                </div>
              )}
              {currentWorkOrder.depositAmount > 0 && (
                <div className="flex justify-between text-xs text-[#0071E3]">
                  <span>Deposit Paid:</span>
                  <span className="font-mono">-{currentWorkOrder.depositAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#E5E5EA] flex justify-between font-extrabold text-sm text-[#1D1D1F]">
                <span>Total Authorized Estimate:</span>
                <span className="font-mono text-[#0071E3]">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
              </div>
            </div>

            {/* Approval Controls */}
            {currentWorkOrder.estimateStatus !== 'Approved' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-[#E5E5EA]">
                <button
                  onClick={() => setRejectionModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-white border border-[#E5E5EA] text-[#FF3B30] hover:bg-[#FF3B30]/10 font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]/40 focus-visible:ring-offset-2"
                >
                  <span className="hidden sm:inline">Decline / Request Callback</span>
                  <span className="sm:hidden">Decline</span>
                </button>
                <button
                  onClick={() => setApprovalModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-[#34C759] hover:bg-[#30B753] text-white font-extrabold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/40 focus-visible:ring-offset-2"
                >
                  <ThumbsUp className="w-4 h-4 shrink-0" />
                  <span className="truncate hidden sm:inline">Approve Estimate & Authorize Repair</span>
                  <span className="sm:hidden">Approve Estimate</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-[#34C759]/10 border border-[#34C759]/30 rounded-2xl flex items-center justify-between text-[#34C759]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="font-extrabold text-xs">Estimate Approved & Authorized</p>
                    <p className="text-[10px] opacity-90">Approved online on {currentWorkOrder.estimateApprovedAt ? new Date(currentWorkOrder.estimateApprovedAt).toLocaleString() : 'Record'}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: DIAGNOSTICS */}
        {activeTab === 'DIAGNOSTICS' && (
          <div className="bg-white rounded-3xl border border-[#E5E5EA] p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#1D1D1F]">21-Point Hardware Diagnostic Checklist</h3>
              <p className="text-xs text-[#86868B]">Full transparency report recorded during initial device intake inspection</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {currentWorkOrder.beforeDiagnostics && currentWorkOrder.beforeDiagnostics.length > 0 ? (
                currentWorkOrder.beforeDiagnostics.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      item.status === 'Pass' ? 'bg-[#34C759]/10 border-[#34C759]/30 text-[#1D1D1F]' :
                      item.status === 'Fail' ? 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#1D1D1F]' :
                      'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
                    }`}
                  >
                    <span className="font-bold text-xs">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      item.status === 'Pass' ? 'bg-[#34C759] text-white' :
                      item.status === 'Fail' ? 'bg-[#FF3B30] text-white' :
                      'bg-[#86868B] text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-6 text-center text-[#86868B] italic">
                  Standard intake inspection recorded. All primary core sensors tested.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: MESSAGES */}
        {activeTab === 'MESSAGES' && (
          <div className="bg-white rounded-3xl border border-[#E5E5EA] p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#1D1D1F]">Direct Shop Communication Channel</h3>
              <p className="text-xs text-[#86868B]">Send a direct message to our technical team regarding work order {currentWorkOrder.orderNumber}</p>
            </div>

            {/* Message Thread */}
            <div className="space-y-3 max-h-80 overflow-y-auto p-4 bg-[#F5F5F7] rounded-2xl border border-[#E5E5EA]">
              {currentWorkOrder.customerInquiries && currentWorkOrder.customerInquiries.length > 0 ? (
                currentWorkOrder.customerInquiries.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-md ${
                      msg.sender === 'Customer' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className={`p-3 rounded-2xl text-xs ${
                      msg.sender === 'Customer'
                        ? 'bg-[#0071E3] text-white rounded-br-none'
                        : 'bg-white border border-[#E5E5EA] text-[#1D1D1F] rounded-bl-none shadow-2xs'
                    }`}>
                      <p className="font-medium">{msg.text}</p>
                    </div>
                    <span className="text-[9px] text-[#86868B] mt-1 font-mono">{msg.timestamp}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#86868B] text-xs">
                  No messages sent yet. Use the box below to ask any question or leave instructions for the repair team.
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message or question here..."
                className="flex-1 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-xs text-[#1D1D1F] focus:outline-none focus:bg-white focus:border-[#0071E3] transition-all"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* APPROVAL CONFIRMATION MODAL */}
      {approvalModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-[#E5E5EA] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center space-x-2 text-[#34C759]">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-[#1D1D1F]">Authorize Repair Estimate</h3>
              </div>
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#1D1D1F]">
              <p>
                You are authorizing <strong>{systemSettings.shopName}</strong> to proceed with the repair for <strong>{currentWorkOrder.deviceModel}</strong> (WO #{currentWorkOrder.orderNumber}).
              </p>

              <div className="bg-[#F5F5F7] p-3.5 rounded-2xl border border-[#E5E5EA] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Device:</span>
                  <span className="font-bold">{currentWorkOrder.deviceModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Authorized Total:</span>
                  <span className="font-extrabold text-[#34C759]">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Warranty Coverage:</span>
                  <span className="font-bold">{currentWorkOrder.warrantyDays || 90} Days Guarantee</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Customer Digital Signature / Full Name</label>
                <input
                  type="text"
                  value={customerNameSig}
                  onChange={(e) => setCustomerNameSig(e.target.value)}
                  placeholder="Type your full name as signature"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <label className="flex items-start space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#0071E3]"
                />
                <span className="text-[11px] text-[#86868B]">
                  I authorize the shop to install required components and confirm that all estimates are understood and agreed upon.
                </span>
              </label>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="flex-1 py-2.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveEstimate}
                disabled={!agreedToTerms || !customerNameSig.trim()}
                className="flex-1 py-2.5 bg-[#34C759] hover:bg-[#30B753] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Confirm & Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION / CALL REQUEST MODAL */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-[#E5E5EA] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center space-x-2 text-[#FF3B30]">
                <ThumbsDown className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-[#1D1D1F]">Decline Estimate / Request Callback</h3>
              </div>
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#1D1D1F]">
              <div>
                <label className="block font-bold mb-1">Reason for Requesting Modification</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:border-[#0071E3]"
                >
                  <option value="Request Phone Call from Technician">Request Phone Call from Technician</option>
                  <option value="Price exceeds budget / Cancel repair">Price exceeds budget / Cancel repair</option>
                  <option value="Question regarding parts quality tier">Question regarding parts quality tier</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Additional Notes for Shop Manager</label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Tell us what you need or when you'd like us to call you back..."
                  rows={3}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3 text-xs focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="flex-1 py-2.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectEstimate}
                className="flex-1 py-2.5 bg-[#FF3B30] hover:bg-red-600 text-white font-extrabold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE VOUCHER MODAL */}
      {printModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <style>{`
            @media print {
              nav, header, footer, aside, .no-print, .print\\:hidden {
                display: none !important;
              }
              html, body, #root, #main-content-scroll, main {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
              }
              .fixed, .inset-0 {
                position: static !important;
                background: transparent !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
              }
              .printable-portal-voucher {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 12px !important;
                box-shadow: none !important;
                border: none !important;
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
              }
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
            }
          `}</style>
          <div className="printable-portal-voucher bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-[#E5E5EA] my-auto">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3 print:hidden">
              <h3 className="font-extrabold text-sm text-[#1D1D1F]">Digital Service Voucher & Estimate Receipt</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.warn('Print failed:', e);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#0071E3] text-white font-bold rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setPrintModalOpen(false)}
                  className="p-1 text-[#86868B] hover:text-[#1D1D1F]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-4 text-xs font-sans text-[#1D1D1F]">
              <div className="text-center border-b border-[#E5E5EA] pb-3 space-y-1">
                {systemSettings.shopLogoUrl && (
                  <div className="flex justify-center mb-1">
                    <img src={systemSettings.shopLogoUrl} alt="Logo" className="h-10 max-w-[140px] object-contain" />
                  </div>
                )}
                <h2 className="font-black text-base uppercase tracking-tight">{systemSettings.shopName}</h2>
                <p className="text-[10px] text-[#86868B]">{systemSettings.shopAddress} • Tel: {systemSettings.shopPhone}</p>
                <p className="text-[10px] text-[#86868B]">Tax ID: {systemSettings.taxId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#F5F5F7] p-3.5 rounded-2xl border border-[#E5E5EA]">
                <div>
                  <span className="text-[10px] font-bold text-[#86868B] uppercase">Voucher Number</span>
                  <p className="font-mono font-bold text-[#0071E3] text-sm">{currentWorkOrder.orderNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#86868B] uppercase">Customer Name</span>
                  <p className="font-bold text-[#1D1D1F]">{currentWorkOrder.customerName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#86868B] uppercase">Device Model</span>
                  <p className="font-bold text-[#1D1D1F]">{currentWorkOrder.deviceModel}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#86868B] uppercase">Serial / IMEI</span>
                  <p className="font-mono font-bold text-[#1D1D1F]">{currentWorkOrder.serialNumber || currentWorkOrder.imei || 'N/A'}</p>
                </div>
              </div>

              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden divide-y divide-[#E5E5EA]">
                <div className="bg-[#F5F5F7] px-3 py-1.5 font-bold text-[#86868B] text-[10px] flex justify-between uppercase">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                {currentWorkOrder.lineItems.map((li) => (
                  <div key={li.id} className="px-3 py-2 flex justify-between text-xs">
                    <span>{li.description} (x{li.quantity})</span>
                    <span className="font-mono font-bold">{(li.unitPrice * li.quantity).toLocaleString()} {systemSettings.currencySymbol}</span>
                  </div>
                ))}
              </div>

              <div className="text-right space-y-1 font-mono pt-2 border-t border-[#E5E5EA]">
                <p className="text-xs text-[#86868B]">Subtotal: {currentWorkOrder.subtotal.toLocaleString()} {systemSettings.currencySymbol}</p>
                <p className="text-sm font-black text-[#0071E3]">Total: {currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</p>
              </div>

              <p className="text-[10px] text-center text-[#86868B] pt-3 border-t border-[#E5E5EA]">
                {systemSettings.receiptFooterNote}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
