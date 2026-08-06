import React, { useState } from 'react';
import {CircleDot, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Smartphone, 
  MessageSquare, 
  ShieldCheck, 
  FileText, 
  Printer, 
  Send, 
  X, 
  ChevronRight, 
  ArrowLeft, 
  ClipboardCheck, 
  ThumbsUp, 
  ThumbsDown,
  Info,
  CreditCard,
  Award} from 'lucide-react';
import { WorkOrder, SystemSettings, Customer } from '../../types';
import { Button } from '../ui';
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
  // Phone matching is strict: the query digits must EQUAL the ticket digits or be the
  // trailing 6+ digits of it. Raw substring matching was leaking tickets (typing "0"
  // logged into the first ticket whose phone contained a 0).
  const cleanQueryDigits = (authenticatedCustomerPhoneOrEmail || '').toLowerCase().replace(/[^0-9]/g, '');
  const phoneMatch = (wo: WorkOrder) => {
    const digits = (wo.customerPhone || '').replace(/[^0-9]/g, '');
    if (!digits || cleanQueryDigits.length < 6) return false;
    return digits === cleanQueryDigits || digits.endsWith(cleanQueryDigits);
  };
  const matchingWorkOrders = workOrders.filter((wo) => {
    if (!authenticatedCustomerPhoneOrEmail) return false;
    const target = authenticatedCustomerPhoneOrEmail.toLowerCase().trim();

    return (
      wo.orderNumber.toLowerCase() === target ||
      wo.orderNumber.toLowerCase().replace(/[^0-9a-z]/g, '') === target.replace(/[^0-9a-z]/g, '') ||
      phoneMatch(wo) ||
      (wo.customerEmail && wo.customerEmail.toLowerCase() === target) ||
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

    const cleanQuery = query.toLowerCase().replace(/[^0-9a-z]/gi, '');
    const cleanQueryDigits = cleanQuery.replace(/[^0-9]/g, '');

    const phoneMatch = (wo: WorkOrder) => {
      const digits = (wo.customerPhone || '').replace(/[^0-9]/g, '');
      if (!digits || cleanQueryDigits.length < 6) return false;
      return digits === cleanQueryDigits || digits.endsWith(cleanQueryDigits);
    };

    // Check if any work order matches (strict: exact order#/email/serial/IMEI, or
    // phone digits equal / trailing-6+ digits — never a raw substring).
    const found = workOrders.filter((wo) => {
      return (
        wo.orderNumber.toLowerCase() === query.toLowerCase() ||
        wo.orderNumber.toLowerCase().replace(/[^0-9a-z]/g, '') === cleanQuery ||
        phoneMatch(wo) ||
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
      <div className="min-h-screen bg-surface flex flex-col justify-between p-4 sm:p-6 text-xs antialiased">
        {/* Top Header */}
        <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 px-4 bg-white/80 backdrop-blur-md rounded-2xl border border-line shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white shrink-0">
              <CircleDot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-ink tracking-tight">{systemSettings.shopName}</h1>
              <p className="text-xs text-muted font-medium">Customer Repair Status Portal</p>
            </div>
          </div>

          {onExitPortalMode && (
            <Button
              onClick={onExitPortalMode}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface hover:bg-line text-ink font-bold text-xs rounded-xl border border-line transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Staff ERP</span>
            </Button>
          )}
        </header>

        {/* Main Login Box */}
        <main className="max-w-md mx-auto w-full my-auto py-8">
          <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-md space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand border border-brand/20 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-ink">Check Your Repair Status</h2>
              <p className="text-xs text-muted">
                Enter your phone number, email, or Work Order # (e.g. WO-2026-1001) to view real-time repair progress, inspect diagnostic logs, and approve estimates.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-medium flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-ink font-bold mb-1">Unique Identifier</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={(e) => {
                      setIdentifierInput(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="e.g. (555) 234-5678 or WO-2026-1001"
                    className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-ink focus:outline-none focus:border-brand focus:bg-white transition-all placeholder-muted"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full max-w-md mx-auto py-3 bg-brand hover:bg-[#0077ED] text-white font-bold rounded-xl text-sm shadow-xs transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
              >
                <span className="truncate">Track Repair Voucher</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </Button>
            </form>

          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-muted text-xs space-y-1">
          <p>© {new Date().getFullYear()} {systemSettings.shopName}. All rights reserved.</p>
          <p>Need support? Call <a href={`tel:${systemSettings.shopPhone}`} className="text-brand underline">{systemSettings.shopPhone}</a> or visit {systemSettings.shopAddress}</p>
        </footer>
      </div>
    );
  }

  const currentStage = getProgressStage(currentWorkOrder.status);

  return (
    <div className="min-h-screen bg-surface flex flex-col text-xs antialiased pb-12">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-line px-4 py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-extrabold shadow-2xs">
              <CircleDot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-sm text-ink">{systemSettings.shopName}</h1>
                <span className="bg-success/15 text-success text-xs font-extrabold px-2 py-0.5 rounded-full border border-success/30">
                  LIVE PORTAL
                </span>
              </div>
              <p className="text-xs text-muted">Logged in: <strong className="text-ink">{currentWorkOrder.customerName}</strong> ({currentWorkOrder.customerPhone || currentWorkOrder.customerEmail})</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Ticket Selector Dropdown if customer has multiple tickets */}
            {matchingWorkOrders.length > 1 && (
              <div className="flex items-center space-x-1.5 bg-surface px-2.5 py-1.5 rounded-xl border border-line">
                <label className="text-xs text-muted font-bold">Select Device:</label>
                <select aria-label="{wo.orderNumber} -"
                  value={currentWorkOrder.id}
                  onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                  className="bg-transparent text-brand font-bold text-xs focus:outline-none"
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
              <Button
                onClick={onExitPortalMode}
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-surface hover:bg-line text-ink font-bold rounded-xl border border-line transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ERP Mode</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={() => {
                setAuthenticatedCustomerPhoneOrEmail(null);
                setSelectedWorkOrderId(null);
              }}
              variant="ghost"
              size="sm"
              className="bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20"
            >
              Log Out
            </Button>
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
                  <h3 className="font-extrabold text-sm text-ink">Action Required: Review Repair Quote Estimate</h3>
                  <span className="bg-[#FF9500] text-white text-xs font-black px-2 py-0.5 rounded-full uppercase">
                    Awaiting Approval
                  </span>
                </div>
                <p className="text-xs text-faint">
                  Our technicians have completed the initial diagnostic inspection for your <strong>{currentWorkOrder.deviceModel}</strong>. Total estimated cost: <strong className="text-ink font-mono text-sm">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <Button
                type="button"
                onClick={() => setApprovalModalOpen(true)}
                className="bg-success hover:bg-[#30B753] text-white flex items-center space-x-1.5"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Approve Estimate</span>
              </Button>
              <Button
                type="button"
                onClick={() => setRejectionModalOpen(true)}
                variant="outline"
                className="text-danger hover:bg-danger/10 hover:text-danger border-line"
              >
                Decline / Request Call
              </Button>
            </div>
          </div>
        )}

        {/* Work Order Header Summary Banner */}
        <div className="bg-white rounded-3xl border border-line p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold font-mono text-brand bg-brand-soft px-2.5 py-1 rounded-lg border border-brand/20">
                  {currentWorkOrder.orderNumber}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  currentWorkOrder.status === 'Finished' ? 'bg-success/10 text-success border-success/30' :
                  currentWorkOrder.status === 'In Progress' ? 'bg-brand/10 text-brand-deep border-brand/30' :
                  'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/30'
                }`}>
                  Status: {currentWorkOrder.status}
                </span>
                {currentWorkOrder.priority === 'Rush' && (
                  <span className="bg-danger/10 text-danger text-xs font-extrabold px-2 py-0.5 rounded-full border border-danger/30">
                    RUSH SERVICE
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-ink mt-2">
                {currentWorkOrder.deviceModel} ({currentWorkOrder.deviceColor})
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Serial / IMEI: <span className="font-mono text-ink font-semibold">{currentWorkOrder.serialNumber || currentWorkOrder.imei || 'N/A'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-line">
              <div className="text-right">
                <p className="text-xs text-muted font-bold uppercase tracking-wider">Estimated Completion</p>
                <p className="text-sm font-extrabold text-brand font-mono">
                  {currentWorkOrder.estimatedCompletion ? new Date(currentWorkOrder.estimatedCompletion).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Bench Test'}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                variant="outline"
                size="icon"
                title="Print Digital Voucher Receipt"
              >
                <Printer className="w-4 h-4 text-brand" />
              </Button>
            </div>
          </div>

          {/* 5-Stage Visual Progress Bar */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Live Repair Progress Timeline</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative">
              {/* Stage 1: Intake Received */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 1
                  ? 'bg-brand-soft border-brand/40 text-brand'
                  : 'bg-surface border-line text-muted'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold uppercase">1. Received</span>
                  {currentStage >= 1 && <CheckCircle2 className="w-4 h-4 text-brand" />}
                </div>
                <p className="font-bold text-xs text-ink">Ticket Intake</p>
                <p className="text-xs text-muted">Checked in at shop</p>
              </div>

              {/* Stage 2: Diagnostics */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 2
                  ? 'bg-brand-soft border-brand/40 text-brand'
                  : currentStage === 1
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-surface border-line text-muted'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold uppercase">2. Diagnostics</span>
                  {currentStage >= 2 ? <CheckCircle2 className="w-4 h-4 text-brand" /> : currentStage === 1 ? <Clock className="w-4 h-4 animate-spin text-amber-600" /> : null}
                </div>
                <p className="font-bold text-xs text-ink">Testing & Quote</p>
                <p className="text-xs text-muted">Inspection complete</p>
              </div>

              {/* Stage 3: In Repair */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 3
                  ? 'bg-brand-soft border-brand/40 text-brand'
                  : 'bg-surface border-line text-muted'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold uppercase">3. In Repair</span>
                  {currentStage >= 3 && <CheckCircle2 className="w-4 h-4 text-brand" />}
                </div>
                <p className="font-bold text-xs text-ink">Bench Service</p>
                <p className="text-xs text-muted">Parts & Assembly</p>
              </div>

              {/* Stage 4: QA Verified */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 4
                  ? 'bg-success/10 border-success/40 text-success'
                  : 'bg-surface border-line text-muted'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold uppercase">4. QA Passed</span>
                  {currentStage >= 4 && <CheckCircle2 className="w-4 h-4 text-success" />}
                </div>
                <p className="font-bold text-xs text-ink">Quality Check</p>
                <p className="text-xs text-muted">21-Point Verified</p>
              </div>

              {/* Stage 5: Ready for Collection */}
              <div className={`p-3 rounded-2xl border transition-all ${
                currentStage >= 5
                  ? 'bg-success/20 border-success/60 text-success'
                  : 'bg-surface border-line text-muted'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold uppercase">5. Complete</span>
                  {currentStage >= 5 && <CheckCircle2 className="w-4 h-4 text-success" />}
                </div>
                <p className="font-bold text-xs text-ink">Ready Pickup</p>
                <p className="text-xs text-muted">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="flex border-b border-line space-x-2 bg-white px-4 pt-2 rounded-2xl border shadow-2xs overflow-x-auto no-scrollbar">
          <Button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Repair Summary & Details</span>
          </Button>

          <Button
            onClick={() => setActiveTab('ESTIMATE')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap relative ${
              activeTab === 'ESTIMATE'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Itemized Quote Estimate</span>
            {currentWorkOrder.estimateStatus === 'Pending Approval' && (
              <span className="w-2 h-2 rounded-full bg-[#FF9500] animate-ping" />
            )}
          </Button>

          <Button
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'DIAGNOSTICS'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>21-Point Diagnostic Inspection</span>
          </Button>

          <Button
            onClick={() => setActiveTab('MESSAGES')}
            className={`pb-3 px-3 font-extrabold text-xs transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap relative ${
              activeTab === 'MESSAGES'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Shop & Technician</span>
            {currentWorkOrder.customerInquiries && currentWorkOrder.customerInquiries.length > 0 && (
              <span className="bg-brand text-white text-xs font-bold px-1.5 py-0.2 rounded-full">
                {currentWorkOrder.customerInquiries.length}
              </span>
            )}
          </Button>
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Device & Tech Details */}
            <div className="md:col-span-7 space-y-6">
              {/* Reported Issues & Technical Findings */}
              <div className="bg-white rounded-3xl border border-line p-5 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-sm text-ink flex items-center space-x-2">
                  <ClipboardCheck className="w-4 h-4 text-brand" />
                  <span>Reported Symptoms & Diagnostic Findings</span>
                </h3>

                <div className="p-3.5 bg-surface rounded-2xl border border-line space-y-1">
                  <span className="text-xs font-bold text-muted uppercase">Symptoms Reported at Intake</span>
                  <p className="text-xs text-ink font-medium">{currentWorkOrder.symptomsReported || 'None specified at check-in'}</p>
                </div>

                {currentWorkOrder.diagnosticResult && (
                  <div className="p-3.5 bg-brand-soft rounded-2xl border border-brand/20 space-y-1">
                    <span className="text-xs font-bold text-brand uppercase">Technician Diagnostic Findings</span>
                    <p className="text-xs text-ink font-medium">{currentWorkOrder.diagnosticResult}</p>
                  </div>
                )}

                {currentWorkOrder.assignedTechName && (
                  <div className="flex items-center space-x-3 pt-2 border-t border-line">
                    <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                      {currentWorkOrder.assignedTechName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-ink text-xs">Assigned Technician: {currentWorkOrder.assignedTechName}</p>
                      <p className="text-xs text-muted">Specialized Apple Master Technician</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Activity & Status Log */}
              <div className="bg-white rounded-3xl border border-line p-5 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-sm text-ink flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-brand" />
                  <span>Real-Time Repair History & Logs</span>
                </h3>

                <div className="space-y-3">
                  {currentWorkOrder.repairLogs && currentWorkOrder.repairLogs.length > 0 ? (
                    currentWorkOrder.repairLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-surface rounded-xl border border-line space-y-1">
                        <div className="flex justify-between items-center text-xs text-muted">
                          <span className="font-bold text-ink">{log.author || 'Shop Tech'}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className="text-xs text-ink">{log.note}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted italic">No public log updates recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Warranty & Financial Overview */}
            <div className="md:col-span-5 space-y-6">
              {/* Financial Quick Card */}
              <div className="bg-white rounded-3xl border border-line p-5 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-sm text-ink flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-brand" />
                  <span>Payment & Financial Summary</span>
                </h3>

                <div className="space-y-2 bg-surface p-4 rounded-2xl border border-line text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Subtotal:</span>
                    <span className="font-mono text-ink">{currentWorkOrder.subtotal.toLocaleString()} {systemSettings.currencySymbol}</span>
                  </div>
                  {currentWorkOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount Applied:</span>
                      <span className="font-mono">-{currentWorkOrder.discountAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                    </div>
                  )}
                  {currentWorkOrder.depositAmount > 0 && (
                    <div className="flex justify-between text-brand">
                      <span>Deposit Paid:</span>
                      <span className="font-mono">-{currentWorkOrder.depositAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-line flex justify-between font-extrabold text-sm">
                    <span className="text-ink">Total Amount:</span>
                    <span className="font-mono text-brand">
                      {currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-brand-soft rounded-xl border border-brand/20 flex items-center justify-between">
                  <span className="font-bold text-xs text-ink">Payment Status:</span>
                  <span className={`font-extrabold text-xs px-2.5 py-0.5 rounded-full border ${
                    currentWorkOrder.isPaid
                      ? 'bg-success/15 text-success border-success/30'
                      : 'bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30'
                  }`}>
                    {currentWorkOrder.isPaid ? 'PAID IN FULL' : 'PAYMENT DUE AT PICKUP'}
                  </span>
                </div>
              </div>

              {/* Warranty Coverage Card */}
              <div className="bg-white rounded-3xl border border-line p-5 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 text-success">
                  <Award className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm text-ink">Warranty Coverage Guarantee</h3>
                </div>
                <p className="text-xs text-faint">
                  All modular repairs and replacement parts installed by {systemSettings.shopName} include full warranty protection.
                </p>

                <div className="p-3 bg-success/10 border border-success/30 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-xs text-ink">Covered Period:</span>
                  <span className="font-extrabold text-xs text-success font-mono">
                    {currentWorkOrder.warrantyDays || 90} Days Guarantee
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ESTIMATE */}
        {activeTab === 'ESTIMATE' && (
          <div className="bg-white rounded-3xl border border-line p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h3 className="text-base font-extrabold text-ink">Itemized Repair Quote Estimate</h3>
                <p className="text-xs text-muted">Official breakdown of required replacement components and repair labor</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted">Estimate Status:</span>
                <span className={`px-3 py-1 rounded-full font-extrabold text-xs border ${
                  currentWorkOrder.estimateStatus === 'Approved'
                    ? 'bg-success/15 text-success border-success/30'
                    : currentWorkOrder.estimateStatus === 'Rejected'
                    ? 'bg-danger/15 text-danger border-danger/30'
                    : 'bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30 animate-pulse'
                }`}>
                  {currentWorkOrder.estimateStatus || 'Awaiting Approval'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-line rounded-2xl overflow-hidden divide-y divide-line">
              <div className="bg-surface px-4 py-2.5 grid grid-cols-12 font-bold text-muted text-xs uppercase tracking-wider">
                <div className="col-span-6">Description / Component</div>
                <div className="col-span-2 text-center">Type</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Price</div>
              </div>

              {currentWorkOrder.lineItems.map((li) => (
                <div key={li.id} className="px-4 py-3 grid grid-cols-12 items-center text-xs">
                  <div className="col-span-6 font-semibold text-ink">
                    {li.description}
                    {li.partQuality && (
                      <span className="block text-xs text-brand font-normal">{li.partQuality}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      li.isLabor ? 'bg-purple-50 text-purple-700' : 'bg-brand-soft text-brand'
                    }`}>
                      {li.isLabor ? 'Labor' : 'Part'}
                    </span>
                  </div>
                  <div className="col-span-2 text-center font-mono font-medium">{li.quantity}</div>
                  <div className="col-span-2 text-right font-mono font-bold text-ink">
                    {(li.unitPrice * li.quantity).toLocaleString()} {systemSettings.currencySymbol}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Box */}
            <div className="max-w-xs ml-auto space-y-2 bg-surface p-4 rounded-2xl border border-line">
              <div className="flex justify-between text-xs text-muted">
                <span>Subtotal:</span>
                <span className="font-mono text-ink">{currentWorkOrder.subtotal.toLocaleString()} {systemSettings.currencySymbol}</span>
              </div>
              {currentWorkOrder.taxAmount > 0 && (
                <div className="flex justify-between text-xs text-muted">
                  <span>Tax:</span>
                  <span className="font-mono text-ink">{currentWorkOrder.taxAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                </div>
              )}
              {currentWorkOrder.depositAmount > 0 && (
                <div className="flex justify-between text-xs text-brand">
                  <span>Deposit Paid:</span>
                  <span className="font-mono">-{currentWorkOrder.depositAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                </div>
              )}
              <div className="pt-2 border-t border-line flex justify-between font-extrabold text-sm text-ink">
                <span>Total Authorized Estimate:</span>
                <span className="font-mono text-brand">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
              </div>
            </div>

            {/* Approval Controls */}
            {currentWorkOrder.estimateStatus !== 'Approved' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-line">
                {(currentWorkOrder.status === 'Receive' || currentWorkOrder.status === 'Pending') && (
                  <Button
                    onClick={() => setRejectionModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-3 bg-white border border-line text-danger hover:bg-danger/10 font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2"
                  >
                    <span className="hidden sm:inline">Decline / Request Callback</span>
                    <span className="sm:hidden">Decline</span>
                  </Button>
                )}
                <Button
                  onClick={() => setApprovalModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-success hover:bg-[#30B753] text-white font-extrabold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 focus-visible:ring-offset-2"
                >
                  <ThumbsUp className="w-4 h-4 shrink-0" />
                  <span className="truncate hidden sm:inline">Approve Estimate & Authorize Repair</span>
                  <span className="sm:hidden">Approve Estimate</span>
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-success/10 border border-success/30 rounded-2xl flex items-center justify-between text-success">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="font-extrabold text-xs">Estimate Approved & Authorized</p>
                    <p className="text-xs opacity-90">Approved online on {currentWorkOrder.estimateApprovedAt ? new Date(currentWorkOrder.estimateApprovedAt).toLocaleString() : 'Record'}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: DIAGNOSTICS */}
        {activeTab === 'DIAGNOSTICS' && (
          <div className="bg-white rounded-3xl border border-line p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-ink">21-Point Hardware Diagnostic Checklist</h3>
              <p className="text-xs text-muted">Full transparency report recorded during initial device intake inspection</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {currentWorkOrder.beforeDiagnostics && currentWorkOrder.beforeDiagnostics.length > 0 ? (
                currentWorkOrder.beforeDiagnostics.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      item.status === 'Pass' ? 'bg-success/10 border-success/30 text-ink' :
                      item.status === 'Fail' ? 'bg-danger/10 border-danger/30 text-ink' :
                      'bg-surface border-line text-muted'
                    }`}
                  >
                    <span className="font-bold text-xs">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                      item.status === 'Pass' ? 'bg-success text-white' :
                      item.status === 'Fail' ? 'bg-danger text-white' :
                      'bg-muted text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-6 text-center text-muted italic">
                  Standard intake inspection recorded. All primary core sensors tested.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: MESSAGES */}
        {activeTab === 'MESSAGES' && (
          <div className="bg-white rounded-3xl border border-line p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-ink">Direct Shop Communication Channel</h3>
              <p className="text-xs text-muted">Send a direct message to our technical team regarding work order {currentWorkOrder.orderNumber}</p>
            </div>

            {/* Message Thread */}
            <div className="space-y-3 max-h-80 overflow-y-auto p-4 bg-surface rounded-2xl border border-line">
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
                        ? 'bg-brand text-white rounded-br-none'
                        : 'bg-white border border-line text-ink rounded-bl-none shadow-2xs'
                    }`}>
                      <p className="font-medium">{msg.text}</p>
                    </div>
                    <span className="text-xs text-muted mt-1 font-mono">{msg.timestamp}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted text-xs">
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
                className="flex-1 bg-surface border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:bg-white focus:border-brand transition-all"
              />
              <Button
                type="submit"
                disabled={!messageInput.trim()}
                className="bg-brand hover:bg-[#0077ED] disabled:opacity-50 text-white flex items-center space-x-1"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* APPROVAL CONFIRMATION MODAL */}
      {approvalModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-line animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-ink">Authorize Repair Estimate</h3>
              </div>
              <Button
                onClick={() => setApprovalModalOpen(false)}
                className="p-1 text-muted hover:text-ink rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-3 text-xs text-ink">
              <p>
                You are authorizing <strong>{systemSettings.shopName}</strong> to proceed with the repair for <strong>{currentWorkOrder.deviceModel}</strong> (WO #{currentWorkOrder.orderNumber}).
              </p>

              <div className="bg-surface p-3.5 rounded-2xl border border-line space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted">Device:</span>
                  <span className="font-bold">{currentWorkOrder.deviceModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Authorized Total:</span>
                  <span className="font-extrabold text-success">{currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Warranty Coverage:</span>
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
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-brand focus:outline-none"
                />
              </div>

              <label className="flex items-start space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded text-brand"
                />
                <span className="text-xs text-muted">
                  I authorize the shop to install required components and confirm that all estimates are understood and agreed upon.
                </span>
              </label>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-line">
              <Button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApproveEstimate}
                disabled={!agreedToTerms || !customerNameSig.trim()}
                className="flex-1 bg-success hover:bg-[#30B753] disabled:opacity-50 text-white"
              >
                Confirm & Authorize
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION / CALL REQUEST MODAL */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-line animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2 text-danger">
                <ThumbsDown className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-ink">Decline Estimate / Request Callback</h3>
              </div>
              <Button
                onClick={() => setRejectionModalOpen(false)}
                className="p-1 text-muted hover:text-ink rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4 text-xs text-ink">
              <div>
                <label className="block font-bold mb-1">Reason for Requesting Modification</label>
                <select aria-label="Select"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:border-brand"
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
                  className="w-full bg-surface border border-line rounded-xl p-3 text-xs focus:bg-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-line">
              <Button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRejectEstimate}
                className="flex-1 bg-danger hover:bg-red-600 text-white"
              >
                Submit Request
              </Button>
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
          <div className="printable-portal-voucher bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-line my-auto">
            <div className="flex items-center justify-between border-b border-line pb-3 print:hidden">
              <h3 className="font-extrabold text-sm text-ink">Digital Service Voucher & Estimate Receipt</h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.warn('Print failed:', e);
                    }
                  }}
                  className="px-3 py-1.5 bg-brand text-white font-bold rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </Button>
                <Button
                  onClick={() => setPrintModalOpen(false)}
                  className="p-1 text-muted hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-4 text-xs font-sans text-ink">
              <div className="text-center border-b border-line pb-3 space-y-1">
                {systemSettings.shopLogoUrl && (
                  <div className="flex justify-center mb-1">
                    <img src={systemSettings.shopLogoUrl} alt="Logo" className="logo-chip h-10 max-w-[140px] object-contain bg-white border border-line rounded-lg p-0.5" />
                  </div>
                )}
                <h2 className="font-black text-base uppercase tracking-tight">{systemSettings.shopName}</h2>
                <p className="text-xs text-muted">{systemSettings.shopAddress} • Tel: {systemSettings.shopPhone}</p>
                <p className="text-xs text-muted">Tax ID: {systemSettings.taxId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-surface p-3.5 rounded-2xl border border-line">
                <div>
                  <span className="text-xs font-bold text-muted uppercase">Voucher Number</span>
                  <p className="font-mono font-bold text-brand text-sm">{currentWorkOrder.orderNumber}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-muted uppercase">Customer Name</span>
                  <p className="font-bold text-ink">{currentWorkOrder.customerName}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-muted uppercase">Device Model</span>
                  <p className="font-bold text-ink">{currentWorkOrder.deviceModel}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-muted uppercase">Serial / IMEI</span>
                  <p className="font-mono font-bold text-ink">{currentWorkOrder.serialNumber || currentWorkOrder.imei || 'N/A'}</p>
                </div>
              </div>

              <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
                <div className="bg-surface px-3 py-1.5 font-bold text-muted text-xs flex justify-between uppercase">
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

              <div className="text-right space-y-1 font-mono pt-2 border-t border-line">
                <p className="text-xs text-muted">Subtotal: {currentWorkOrder.subtotal.toLocaleString()} {systemSettings.currencySymbol}</p>
                <p className="text-sm font-black text-brand">Total: {currentWorkOrder.totalAmount.toLocaleString()} {systemSettings.currencySymbol}</p>
              </div>

              <p className="text-xs text-center text-muted pt-3 border-t border-line">
                {systemSettings.receiptFooterNote}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
