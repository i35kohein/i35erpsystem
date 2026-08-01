import React, { useState } from 'react';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import { 
  CreditCard, 
  DollarSign, 
  Receipt, 
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  Smartphone, 
  User, 
  Percent,
  Plus,
  FileText,
  QrCode,
  Landmark,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  BellRing,
  AlertTriangle,
  XCircle,
  Split
} from 'lucide-react';
import { WorkOrder, Customer, SystemSettings } from '../../types';
import { getActivePaymentMethods } from '../../data/seedData';
import { PrintableInvoiceModal } from '../common/PrintableInvoiceModal';
import { CustomerNotificationModal } from '../common/CustomerNotificationModal';

interface PosInvoicingModuleProps {
  workOrders: WorkOrder[];
  customers: Customer[];
  systemSettings?: SystemSettings;
  onMarkPaid: (workOrderId: string, method: string) => void;
  onSaveWorkOrder?: (wo: WorkOrder) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
}

export const PosInvoicingModule: React.FC<PosInvoicingModuleProps> = ({
  workOrders,
  customers,
  systemSettings,
  onMarkPaid,
  onSaveWorkOrder,
  searchQuery = '',
  dateFilter: propDateFilter,
  setDateFilter: propSetDateFilter,
  statusFilter = 'ALL',
}) => {
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  const [selectedWoId, setSelectedWoId] = useState<string>(workOrders[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<string>(activePaymentMethods[0]?.name || 'Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [printableInvoiceWo, setPrintableInvoiceWo] = useState<WorkOrder | null>(null);
  const [localDateFilter, setLocalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifWo, setNotifWo] = useState<WorkOrder | null>(null);

  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([
    { method: 'Cash', amount: 0 },
    { method: 'KBZPay', amount: 0 },
  ]);

  // Currently selected method config
  const selectedMethodConfig = activePaymentMethods.find((m) => m.name === paymentMethod);

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  // Filter Work Orders by date, search, and status - ONLY show devices AFTER diagnostic is completed
  const dateFiltered = filterByDateRange<WorkOrder>(workOrders, dateFilter);
  const filteredWorkOrders = dateFiltered.filter((wo) => {
    // Normal repair tickets enter POS only after the post-repair QA record is saved.
    // Declined/unrepairable tickets remain eligible so the diagnostic fee can be collected.
    const hasRecordedDiagnostic =
      (wo.beforeDiagnostics && wo.beforeDiagnostics.some((diagnostic) => diagnostic.status === 'Pass' || diagnostic.status === 'Fail')) ||
      (wo.diagnosticResult && wo.diagnosticResult.trim().length > 0 && wo.diagnosticResult !== 'Diagnostic Pending');
    const isDeclinedDiagnostic =
      (wo.status === 'Cant Repair' || wo.status === 'Customer Not Repair') &&
      hasRecordedDiagnostic;
    const isDiagnosticDone = Boolean(wo.postRepairChecklist) || isDeclinedDiagnostic;

    if (!isDiagnosticDone) return false;

    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      wo.orderNumber.toLowerCase().includes(q) ||
      wo.customerName.toLowerCase().includes(q) ||
      wo.deviceModel.toLowerCase().includes(q) ||
      wo.serialNumber.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Paid' && wo.isPaid) ||
      (statusFilter === 'Pending Payment' && !wo.isPaid);

    return matchesSearch && matchesStatus;
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredWorkOrders.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedWorkOrders = filteredWorkOrders.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  const selectedWo = filteredWorkOrders.find((w) => w.id === selectedWoId) || filteredWorkOrders[0] || null;

  const handleProcessPayment = () => {
    if (!selectedWo) return;
    let finalMethod = paymentMethod;
    if (paymentMethod === 'Split Payment') {
      const validSplits = splitPayments.filter((s) => s.amount > 0);
      if (validSplits.length === 0) {
        alert('Please enter at least one split payment amount.');
        return;
      }
      finalMethod = `Split Payment (${validSplits.map((s) => `${s.method}: ${s.amount.toLocaleString()} MMK`).join(' + ')})`;
    }
    onMarkPaid(selectedWo.id, finalMethod);
    setIsReceiptModalOpen(true);
  };

  // Quick Action to charge Diagnostic Fee Only (စက်စစ်ခ) for Cant Repair / Customer Cancelled
  const handleApplyDiagnosticFeeOnly = () => {
    if (!selectedWo || !onSaveWorkOrder) return;
    const diagFee = 5000; // 5000 MMK standard diagnostic inspection fee
    const updatedWo: WorkOrder = {
      ...selectedWo,
      lineItems: [
        {
          id: 'diag-fee-item',
          description: 'Diagnostic & Inspection Fee (စက်စစ်ဆေးခ)',
          quantity: 1,
          unitCost: 0,
          unitPrice: diagFee,
          isLabor: true,
        },
      ],
      subtotal: diagFee,
      taxAmount: Math.round(diagFee * 0.06),
      totalAmount: Math.round(diagFee * 1.06) - selectedWo.discountAmount - selectedWo.depositAmount,
      updatedAt: new Date().toISOString(),
    };
    onSaveWorkOrder(updatedWo);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-12">
        {/* Left Column: Select Work Order to Checkout (5 cols) */}
        <div className="md:col-span-5 bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
            <h2 className="font-bold text-[#1D1D1F] text-xs">Diagnostic Completed Devices ({filteredWorkOrders.length})</h2>
            <span className="text-[10px] font-mono font-bold bg-[#34C759]/10 text-[#28A745] px-2 py-0.5 rounded-full border border-[#34C759]/20">
              Diag Finished
            </span>
          </div>

          <div className="space-y-2 min-h-[360px] max-h-[520px] overflow-y-auto">
            {paginatedWorkOrders.length === 0 ? (
              <div className="p-8 text-center text-[#86868B] space-y-2 bg-[#F5F5F7] rounded-xl border border-dashed border-[#D2D2D7] my-4">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-70" />
                <p className="font-extrabold text-[#1D1D1F] text-xs">No Devices with Finished Diagnostics</p>
                <p className="text-[11px] text-[#86868B]">
                  New intakes pending diagnostic inspection are hidden. Work orders automatically appear here in POS after diagnostic testing is completed.
                </p>
              </div>
            ) : (
              paginatedWorkOrders.map((wo) => {
                const isSelected = wo.id === selectedWoId;

                return (
                  <div
                    key={wo.id}
                    onClick={() => setSelectedWoId(wo.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0F6FF] border-[#0071E3] shadow-xs'
                        : 'bg-[#F5F5F7] border-[#E5E5EA] hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-mono font-bold text-[#0071E3]">{wo.orderNumber}</span>
                      <div className="flex items-center space-x-1">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase ${
                          wo.status === 'Taken Out' ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {wo.status}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                          wo.isPaid ? 'bg-[#EAF8ED] text-[#28A745] border-[#34C759]/20' : 'bg-[#FFF4E5] text-[#D97706] border-[#FF9F0A]/20'
                        }`}>
                          {wo.isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                    </div>

                    <p className="font-semibold text-[#1D1D1F] mt-1">{wo.deviceModel}</p>
                    <div className="flex justify-between items-center text-[#86868B] text-[11px] mt-1">
                      <span>Cust: {wo.customerName}</span>
                      <span className="font-bold text-[#1D1D1F]">{wo.totalAmount.toLocaleString()} MMK</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold rounded-md border border-emerald-200/60 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Diag Finished</span>
                      </span>
                      {wo.depositAmount > 0 && (
                        <span className="text-[#0071E3] font-bold">
                          Deposit: {wo.depositAmount.toLocaleString()} MMK
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Bar */}
          {filteredWorkOrders.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5EA] pt-2 text-[10px] text-[#86868B]">
              <span className="whitespace-nowrap font-semibold">
                <strong className="text-[#1D1D1F]">
                  {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredWorkOrders.length)}
                </strong>
                {' '}of {filteredWorkOrders.length} devices
              </span>

              {totalPages > 1 && (
              <div className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-7 w-7 !min-h-7 items-center justify-center rounded-md bg-white text-[#1D1D1F] transition-colors hover:bg-[var(--blue-tint)] disabled:cursor-not-allowed disabled:opacity-35"
                  title="Previous Page"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-0.5 text-[10px] text-[#86868B]">…</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            aria-label={`Page ${p}`}
                            aria-current={safeCurrentPage === p ? 'page' : undefined}
                            className={`inline-flex h-7 w-7 !min-h-7 items-center justify-center rounded-md text-[10px] font-extrabold transition-colors cursor-pointer ${
                              safeCurrentPage === p
                                ? 'bg-[#0071E3] text-white'
                                : 'bg-white text-[#1D1D1F] hover:bg-[var(--blue-tint)]'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-7 w-7 !min-h-7 items-center justify-center rounded-md bg-white text-[#1D1D1F] transition-colors hover:bg-[var(--blue-tint)] disabled:cursor-not-allowed disabled:opacity-35"
                  title="Next Page"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Invoice & Terminal Checkout (7 cols) */}
        <div className="md:col-span-7 bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          {selectedWo ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[#0071E3] text-sm">{selectedWo.orderNumber}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      selectedWo.status === 'Finished' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      selectedWo.status === 'Taken Out' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {selectedWo.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[#1D1D1F]">{selectedWo.deviceModel}</h2>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifWo(selectedWo);
                      setIsNotifModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#7360F2]/10 hover:bg-[#7360F2]/20 text-[#7360F2] font-extrabold text-xs rounded-xl border border-[#7360F2]/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                    title="Send SMS / Viber / Telegram Notification"
                  >
                    <BellRing className="w-3.5 h-3.5 animate-bounce text-[#7360F2]" />
                    <span>Notify Customer</span>
                  </button>

                  <div className="text-right border-l border-[#E5E5EA] pl-3">
                    <span className="text-[#86868B] text-[10px]">Customer:</span>
                    <p className="font-bold text-[#1D1D1F] text-xs">{selectedWo.customerName}</p>
                  </div>
                </div>
              </div>

              {/* Special Warning & Diagnostic Fee Quick Action if Cant Repair / Customer Cancelled */}
              {(selectedWo.status === 'Cant Repair' || selectedWo.status === 'Customer Not Repair') && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2.5 animate-fade-in">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-rose-900 text-xs block">
                          {selectedWo.status === 'Cant Repair' ? "Unrepairable Device (ပြင်၍မရပါ)" : "Customer Cancelled (မပြင်တော့ပါ)"}
                        </span>
                        <span className="text-[11px] text-rose-700">
                          Option to charge Diagnostic / Inspection fee only before handing back device.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-rose-200">
                    <span className="text-[11px] font-extrabold text-rose-950">
                      Standard Diagnostic Fee: 5,000 MMK
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyDiagnosticFeeOnly}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      Apply Diagnostic Fee Only (စက်စစ်ခ သာကောက်မည်)
                    </button>
                  </div>
                </div>
              )}

              {/* Itemized Line Items Breakdown */}
              <div className="space-y-2">
                <h3 className="font-bold text-[#0071E3] text-xs">Itemized Labor & Parts</h3>
                <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-[#F5F5F7]/80">
                  <table className="w-full text-left">
                    <thead className="bg-[#F5F5F7] text-[#86868B] text-[10px] uppercase font-mono border-b border-[#E5E5EA]">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5">Qty</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      {selectedWo.lineItems.map((li) => (
                        <tr key={li.id}>
                          <td className="p-2.5 text-[#1D1D1F]">{li.description}</td>
                          <td className="p-2.5 text-[#86868B]">{li.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-[#1D1D1F]">{(li.unitPrice * li.quantity).toLocaleString()} MMK</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary */}
                <div className="bg-[#F5F5F7]/80 p-3 rounded-xl border border-[#E5E5EA] space-y-1.5 text-right">
                  <div className="flex justify-between text-[#86868B]">
                    <span>Subtotal:</span>
                    <span className="font-mono text-[#1D1D1F]">{selectedWo.subtotal.toLocaleString()} MMK</span>
                  </div>
                  <div className="flex justify-between text-[#86868B]">
                    <span>Sales Tax (6%):</span>
                    <span className="font-mono text-[#1D1D1F]">{selectedWo.taxAmount.toLocaleString()} MMK</span>
                  </div>
                  {selectedWo.discountAmount > 0 && (
                    <div className="flex justify-between text-[#28A745]">
                      <span>B2B Account Discount:</span>
                      <span className="font-mono">-{selectedWo.discountAmount.toLocaleString()} MMK</span>
                    </div>
                  )}
                  {selectedWo.depositAmount > 0 && (
                    <div className="flex justify-between text-[#28A745]">
                      <span>Upfront Deposit Paid:</span>
                      <span className="font-mono">-{selectedWo.depositAmount.toLocaleString()} MMK</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-[#E5E5EA] font-extrabold text-sm">
                    <span className="text-[#1D1D1F]">Amount Due Now:</span>
                    <span className="text-[#0071E3] font-mono text-lg">{selectedWo.totalAmount.toLocaleString()} MMK</span>
                  </div>
                </div>
              </div>

              {/* Payment Gateway Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0071E3] text-xs flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payment Method Selection ({activePaymentMethods.length} Enabled)</span>
                  </h3>
                  <span className="text-[10px] text-[#86868B]">Configured in Settings → Payment Methods</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {activePaymentMethods.map((m) => {
                    const isSelected = paymentMethod === m.name;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.name)}
                        className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center space-x-2.5 ${
                          isSelected
                            ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                            : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <div className="truncate min-w-0 flex-1">
                          <div className="truncate font-extrabold">{m.name}</div>
                          <div className={`text-[10px] font-normal truncate ${isSelected ? 'text-blue-100' : 'text-[#86868B]'}`}>
                            {m.category}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Split Payment Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Split Payment');
                      if (selectedWo && splitPayments[0].amount === 0 && splitPayments[1].amount === 0) {
                        const half = Math.round(selectedWo.totalAmount / 2);
                        setSplitPayments([
                          { method: activePaymentMethods[0]?.name || 'Cash', amount: half },
                          { method: activePaymentMethods[1]?.name || 'KBZPay', amount: selectedWo.totalAmount - half },
                        ]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center space-x-2 ${
                      paymentMethod === 'Split Payment'
                        ? 'bg-[#7360F2] text-white border-[#7360F2] shadow-2xs'
                        : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <Split className="w-4 h-4 shrink-0" />
                    <div className="truncate min-w-0 flex-1">
                      <div className="truncate font-extrabold">Split Payment</div>
                      <div className={`text-[10px] font-normal truncate ${paymentMethod === 'Split Payment' ? 'text-purple-100' : 'text-[#86868B]'}`}>
                        Multi-Method
                      </div>
                    </div>
                  </button>
                </div>

                {/* Split Payment Interactive Breakdown UI */}
                {paymentMethod === 'Split Payment' && (
                  <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3 text-xs animate-fade-in">
                    <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                      <span className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                        <Split className="w-4 h-4 text-[#7360F2]" />
                        <span>Split Payment Breakdown (အကွဲပေးချေမှု)</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-[#7360F2]/10 text-[#7360F2] px-2 py-0.5 rounded-full border border-[#7360F2]/20">
                        Due: {selectedWo.totalAmount.toLocaleString()} MMK
                      </span>
                    </div>

                    <div className="space-y-2">
                      {splitPayments.map((sp, idx) => {
                        const otherSum = splitPayments.reduce((acc, curr, i) => (i === idx ? acc : acc + (curr.amount || 0)), 0);
                        const remForThis = Math.max(0, selectedWo.totalAmount - otherSum);

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-purple-100 shadow-2xs">
                            <span className="font-mono text-[10px] text-[#7360F2] font-extrabold px-1.5 py-0.5 bg-purple-100/70 rounded shrink-0 self-start sm:self-auto">
                              #{idx + 1}
                            </span>

                            {/* Select Method */}
                            <select
                              value={sp.method}
                              onChange={(e) => {
                                const updated = [...splitPayments];
                                updated[idx].method = e.target.value;
                                setSplitPayments(updated);
                              }}
                              className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-1.5 text-xs font-extrabold text-[#1D1D1F] focus:border-[#7360F2] focus:ring-1 focus:ring-[#7360F2] outline-none"
                            >
                              {activePaymentMethods.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({m.category})
                                </option>
                              ))}
                            </select>

                            {/* Amount Input */}
                            <div className="flex-1 flex items-center space-x-1.5">
                              <input
                                type="number"
                                value={sp.amount || ''}
                                onChange={(e) => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = Number(e.target.value);
                                  setSplitPayments(updated);
                                }}
                                placeholder="Amount MMK"
                                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-1.5 text-xs font-mono font-bold text-[#1D1D1F] focus:border-[#7360F2] focus:ring-1 focus:ring-[#7360F2] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = remForThis;
                                  setSplitPayments(updated);
                                }}
                                className="px-2 py-1.5 bg-purple-100 hover:bg-purple-200 text-[#7360F2] font-bold text-[10px] rounded-lg border border-purple-200 shrink-0 cursor-pointer transition-all active:scale-95"
                                title="Auto-fill remaining amount"
                              >
                                Auto-Fill
                              </button>
                            </div>

                            {/* Remove Row Button if > 2 */}
                            {splitPayments.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove split method"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Calculation Summary & Controls */}
                    {(() => {
                      const currentTotalPaid = splitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                      const diff = currentTotalPaid - selectedWo.totalAmount;
                      return (
                        <div className="pt-2 border-t border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="text-[#86868B]">
                              Paid Total: <strong className="font-mono text-[#1D1D1F]">{currentTotalPaid.toLocaleString()} MMK</strong>
                            </span>
                            {diff === 0 ? (
                              <span className="text-emerald-700 font-extrabold text-[11px] flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Balanced</span>
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-700 font-bold text-[11px]">
                                Change: +{diff.toLocaleString()} MMK
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold text-[11px]">
                                Short: {Math.abs(diff).toLocaleString()} MMK
                              </span>
                            )}
                          </div>

                          {splitPayments.length < 4 && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentTotal = splitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                                const remaining = Math.max(0, selectedWo.totalAmount - currentTotal);
                                const unusedMethod =
                                  activePaymentMethods.find((m) => !splitPayments.some((s) => s.method === m.name))?.name ||
                                  activePaymentMethods[0]?.name ||
                                  'Cash';
                                setSplitPayments([...splitPayments, { method: unusedMethod, amount: remaining }]);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-[#7360F2] font-bold text-[11px] rounded-lg border border-purple-200 transition-all flex items-center space-x-1 cursor-pointer shrink-0 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Split Method</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Account / QR details box if selected method has accountNumber or accountName */}
                {selectedMethodConfig && (selectedMethodConfig.accountNumber || selectedMethodConfig.notes) && (
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                        <QrCode className="w-4 h-4 text-[#0071E3]" />
                        <span>{selectedMethodConfig.name} - Account Transfer Details</span>
                      </span>
                      {selectedMethodConfig.accountNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedMethodConfig.accountNumber || '');
                            setCopiedAccount(true);
                            setTimeout(() => setCopiedAccount(false), 2000);
                          }}
                          className="px-2 py-1 bg-white hover:bg-blue-100 text-[#0071E3] font-bold rounded-lg border border-blue-200 transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedAccount ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-[10px] text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-[10px]">Copy Number</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      {selectedMethodConfig.accountNumber && (
                        <div>
                          <span className="text-[#86868B] block text-[10px]">Account / Phone No:</span>
                          <span className="font-mono font-extrabold text-[#0071E3]">{selectedMethodConfig.accountNumber}</span>
                        </div>
                      )}
                      {selectedMethodConfig.accountName && (
                        <div>
                          <span className="text-[#86868B] block text-[10px]">Beneficiary Name:</span>
                          <span className="font-bold text-[#1D1D1F]">{selectedMethodConfig.accountName}</span>
                        </div>
                      )}
                      {selectedMethodConfig.notes && (
                        <div className="col-span-2">
                          <span className="text-[#86868B] block text-[10px]">Reference / Instructions:</span>
                          <span className="text-[#1D1D1F] italic">{selectedMethodConfig.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === 'Cash' && (
                  <div className="p-3 bg-[#F5F5F7]/80 border border-[#E5E5EA] rounded-xl space-y-2">
                    <label className="block text-[#86868B] text-xs">Cash Amount Tendered (MMK):</label>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      placeholder="e.g. 250000"
                      className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] font-mono focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                    {cashTendered >= selectedWo.totalAmount && (
                      <p className="text-[#28A745] font-bold text-xs">
                        Change Due: {(cashTendered - selectedWo.totalAmount).toLocaleString()} MMK
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedWo) {
                      setPrintableInvoiceWo(selectedWo);
                      setIsInvoiceModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-1/2 py-3 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#D2D2D7] text-[#1D1D1F] font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <FileText className="w-4 h-4 text-[#0071E3]" />
                  <span>Print Itemized Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleProcessPayment}
                  className="w-full sm:w-1/2 py-3 bg-[#34C759] hover:bg-[#30B753] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay & Print Receipt</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[#86868B] flex flex-col items-center justify-center space-y-3 min-h-[380px]">
              <Receipt className="w-12 h-12 text-[#86868B]/30" />
              <p className="font-extrabold text-sm text-[#1D1D1F]">No Finished Device Selected</p>
              <p className="text-xs max-w-xs text-[#86868B]">
                Only finished repairs appear in POS. Select a finished work order from the left list to process payment and automatically transition status to Taken Out.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Digital Receipt Modal */}
      {isReceiptModalOpen && selectedWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <style>{`
            @media print {
              nav, header, footer, aside, .no-print {
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
              .printable-pos-receipt {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 20px !important;
                box-shadow: none !important;
                border: 1px solid #D2D2D7 !important;
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
              }
              @page {
                size: portrait;
                margin: 8mm;
              }
            }
          `}</style>
          <div className="printable-pos-receipt bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl">
            <div className="text-center space-y-1.5 border-b border-[#E5E5EA] pb-3">
              {systemSettings?.shopLogoUrl && (
                <div className="flex justify-center mb-1">
                  <img
                    src={systemSettings.shopLogoUrl}
                    alt="Shop Logo"
                    className="h-10 max-w-[140px] object-contain"
                  />
                </div>
              )}
              <h2 className="font-extrabold text-lg text-[#1D1D1F]">
                {systemSettings?.shopName || 'AppleRepair Pro'}
              </h2>
              <p className="text-[#86868B] text-[10px]">
                {systemSettings?.receiptHeaderTitle || 'Official ACMT Certified Service Voucher'}
              </p>
              {systemSettings?.shopPhone && (
                <p className="text-[10px] text-[#86868B] font-mono">
                  Tel: {systemSettings.shopPhone}
                </p>
              )}
              <p className="text-[#0071E3] font-mono font-bold pt-0.5">{selectedWo.orderNumber}</p>
            </div>

            <div className="space-y-1 text-[#1D1D1F]">
              <div className="flex justify-between">
                <span className="text-[#86868B]">Customer:</span>
                <span className="font-bold text-[#1D1D1F]">{selectedWo.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Device:</span>
                <span className="font-bold text-[#1D1D1F]">{selectedWo.deviceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Payment Method:</span>
                <span className="font-mono text-[#0071E3]">{paymentMethod}</span>
              </div>
            </div>

            <div className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-1 font-mono">
              <div className="flex justify-between text-[#28A745] font-bold">
                <span>TOTAL PAID:</span>
                <span>
                  {selectedWo.totalAmount.toLocaleString()} {systemSettings?.currencySymbol || 'MMK'}
                </span>
              </div>
            </div>

            <div className="p-2 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] text-[10px] text-[#86868B] text-center italic">
              {systemSettings?.receiptFooterNote || 'Thank you for choosing AppleRepair! All repairs covered by warranty.'}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 no-print">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-3 py-1.5 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setPrintableInvoiceWo(selectedWo);
                  setIsInvoiceModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#1D1D1F] font-bold rounded-xl flex items-center space-x-1 border border-[#D2D2D7]"
              >
                <FileText className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Full Invoice</span>
              </button>
              <button
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    console.warn('Print failed:', e);
                  }
                }}
                className="px-4 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-xl flex items-center space-x-1 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Printable Invoice Modal */}
      <PrintableInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        workOrder={printableInvoiceWo}
        systemSettings={systemSettings}
      />

      {/* Customer Notification Trigger Modal */}
      {notifWo && (
        <CustomerNotificationModal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
          workOrder={notifWo}
          settings={systemSettings}
        />
      )}
    </div>
  );
};
