import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Receipt, 
  Boxes, 
  Users, 
  Truck, 
  Plus, 
  Filter, 
  Calendar, 
  Building2, 
  PieChart, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  Check, 
  X, 
  FileText,
  Percent,
  Coins,
  Wallet,
  Sparkles,
  Search,
  Download
} from 'lucide-react';
import { 
  WorkOrder, 
  PartItem, 
  Technician, 
  Supplier, 
  ExpenseItem, 
  SupplierDebtRecord, 
  TechnicianPayoutRecord, 
  SystemSettings 
} from '../../types';
import { getActivePaymentMethods } from '../../data/seedData';

interface ShopFinancePlModuleProps {
  workOrders: WorkOrder[];
  parts: PartItem[];
  technicians: Technician[];
  suppliers: Supplier[];
  expenses: ExpenseItem[];
  supplierDebts: SupplierDebtRecord[];
  technicianPayouts: TechnicianPayoutRecord[];
  systemSettings?: SystemSettings;
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  onRecordSupplierPayment: (debtId: string, paymentAmount: number, paymentMethod: string, note: string) => void;
  onUpdatePayoutStatus: (payoutId: string, status: 'Pending' | 'Approved' | 'Paid') => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
}

export const ShopFinancePlModule: React.FC<ShopFinancePlModuleProps> = ({
  workOrders,
  parts,
  technicians,
  suppliers,
  expenses,
  supplierDebts,
  technicianPayouts,
  systemSettings,
  onAddExpense,
  onRecordSupplierPayment,
  onUpdatePayoutStatus,
  dateFilter,
  setDateFilter,
}) => {
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'expenses' | 'inventory-asset' | 'commissions' | 'accounts-payable'>('overview');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<SupplierDebtRecord | null>(null);

  // New Expense State
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Rent' as ExpenseItem['category'],
    amount: 0,
    paymentMethod: 'Bank Transfer' as ExpenseItem['paymentMethod'],
    payee: '',
    description: '',
    createdByName: 'Shop Owner'
  });

  // Supplier Payment Modal State
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentMethodInput, setPaymentMethodInput] = useState<string>('Bank Transfer');
  const [paymentNoteInput, setPaymentNoteInput] = useState<string>('Supplier Invoice Payment');

  // Filtered Work Orders by Date
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      if (dateFilter === 'TODAY') {
        const today = new Date().toISOString().split('T')[0];
        return wo.createdAt.startsWith(today);
      }
      if (dateFilter === 'THIS_WEEK') {
        const woDate = new Date(wo.createdAt);
        const now = new Date();
        const diffDays = (now.getTime() - woDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (dateFilter === 'THIS_MONTH') {
        const woDate = new Date(wo.createdAt);
        const now = new Date();
        return woDate.getMonth() === now.getMonth() && woDate.getFullYear() === now.getFullYear();
      }
      return true; // ALL
    });
  }, [workOrders, dateFilter]);

  // Financial Calculations
  const financialSummary = useMemo(() => {
    let laborIncome = 0;
    let partsSalesIncome = 0;
    let cogsTotal = 0;

    const paymentMethodsBreakdown = {
      cashDrawer: 0,
      mobileBanking: 0, // KBZPay / WavePay / Banking
      cardPos: 0,
    };

    filteredWorkOrders.forEach((wo) => {
      // Calculate from line items if available
      if (wo.lineItems && wo.lineItems.length > 0) {
        wo.lineItems.forEach((li) => {
          const lineTotal = li.unitPrice * li.quantity;
          const lineCost = li.unitCost * li.quantity;

          if (li.isLabor) {
            laborIncome += lineTotal;
          } else {
            partsSalesIncome += lineTotal;
            cogsTotal += lineCost;
          }
        });
      } else {
        // Fallback ratio
        laborIncome += wo.totalAmount * 0.45;
        partsSalesIncome += wo.totalAmount * 0.55;
        cogsTotal += wo.totalAmount * 0.25;
      }

      // Payment method breakdown
      if (wo.isPaid || wo.paidAmount && wo.paidAmount > 0) {
        const amount = wo.paidAmount || wo.totalAmount;
        if (wo.paymentMethod === 'Cash') {
          paymentMethodsBreakdown.cashDrawer += amount;
        } else if (wo.paymentMethod === 'Credit Card' || wo.paymentMethod === 'Apple Pay') {
          paymentMethodsBreakdown.cardPos += amount;
        } else {
          paymentMethodsBreakdown.mobileBanking += amount;
        }
      }
    });

    const totalRevenue = laborIncome + partsSalesIncome;
    const grossProfit = totalRevenue - cogsTotal;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    // Total Expenses
    const totalOpEx = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = grossProfit - totalOpEx;
    const netMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Parts Inventory Valuation
    let totalInventoryAssetValue = 0;
    let totalRetailValuation = 0;

    parts.forEach((p) => {
      totalInventoryAssetValue += p.costPrice * p.quantityInStock;
      totalRetailValuation += p.sellingPrice * p.quantityInStock;
    });

    // Accounts Payable / Supplier Debt
    const totalSupplierDebt = supplierDebts.reduce((acc, curr) => acc + (curr.totalAmount - curr.paidAmount), 0);
    const overdueDebtsCount = supplierDebts.filter((d) => d.status !== 'Paid' && new Date(d.dueDate) < new Date()).length;

    // Technician Commissions
    const totalCommissionsEarned = technicianPayouts.reduce((acc, curr) => acc + curr.netPayout, 0);
    const pendingCommissionsAmount = technicianPayouts
      .filter((p) => p.status === 'Pending')
      .reduce((acc, curr) => acc + curr.netPayout, 0);

    return {
      laborIncome,
      partsSalesIncome,
      totalRevenue,
      cogsTotal,
      grossProfit,
      grossMarginPercent,
      totalOpEx,
      netProfit,
      netMarginPercent,
      paymentMethodsBreakdown,
      totalInventoryAssetValue,
      totalRetailValuation,
      totalSupplierDebt,
      overdueDebtsCount,
      totalCommissionsEarned,
      pendingCommissionsAmount,
    };
  }, [filteredWorkOrders, expenses, parts, supplierDebts, technicianPayouts]);

  const handleSaveExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || newExpense.amount <= 0 || !newExpense.description) {
      alert('Please fill out expense description and valid amount.');
      return;
    }

    onAddExpense(newExpense);
    setShowAddExpenseModal(false);
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      category: 'Rent',
      amount: 0,
      paymentMethod: 'Bank Transfer',
      payee: '',
      description: '',
      createdByName: 'Shop Owner'
    });
  };

  const handleConfirmSupplierPayment = () => {
    if (!selectedDebtForPayment || paymentAmountInput <= 0) return;
    onRecordSupplierPayment(
      selectedDebtForPayment.id,
      paymentAmountInput,
      paymentMethodInput,
      paymentNoteInput
    );
    setSelectedDebtForPayment(null);
  };

  return (
    <div className="space-y-6">
      {/* Title & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-2xs">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#1D1D1F] tracking-tight">
              Shop Finance, Profit & Loss (P&L) Engine
            </h1>
            <p className="text-xs text-[#86868B] font-medium">
              Labor & parts income, COGS margins, OpEx overhead, inventory asset valuation & supplier debts
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick Add Expense Button */}
          <button
            type="button"
            onClick={() => setShowAddExpenseModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E5E5EA] flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full text-xs shadow-2xs">
        {[
          { id: 'overview', label: 'Financial Overview', icon: PieChart },
          { id: 'revenue', label: '1. Revenue & Payment Methods', icon: TrendingUp },
          { id: 'expenses', label: '2. OpEx & COGS Costs', icon: Receipt },
          { id: 'inventory-asset', label: '3. Parts Asset Valuation', icon: Boxes },
          { id: 'commissions', label: '4. Tech Commissions', icon: Users },
          { id: 'accounts-payable', label: '5. Accounts Payable / Debts', icon: Truck, badge: financialSummary.overdueDebtsCount > 0 ? `${financialSummary.overdueDebtsCount} Overdue` : undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                isActive
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white animate-pulse'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: FINANCIAL OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key P&L Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Gross Revenue Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[#86868B]">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                <TrendingUp className="w-4 h-4 text-[#34C759]" />
              </div>
              <div className="text-2xl font-black text-[#1D1D1F] font-mono">
                {financialSummary.totalRevenue.toLocaleString()} MMK
              </div>
              <div className="pt-2 border-t border-[#F5F5F7] text-[11px] font-bold space-y-0.5">
                <div className="flex justify-between text-[#0071E3]">
                  <span>Labor Income:</span>
                  <span>{financialSummary.laborIncome.toLocaleString()} MMK</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Parts Sales:</span>
                  <span>{financialSummary.partsSalesIncome.toLocaleString()} MMK</span>
                </div>
              </div>
            </div>

            {/* COGS & Gross Profit Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[#86868B]">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Profit (Margin)</span>
                <Coins className="w-4 h-4 text-[#0071E3]" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#0071E3] font-mono">
                  {financialSummary.grossProfit.toLocaleString()} MMK
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  financialSummary.grossMarginPercent >= 50
                    ? 'bg-emerald-100 text-[#16A34A]'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {financialSummary.grossMarginPercent}% Gross
                </span>
              </div>
              <div className="pt-2 border-t border-[#F5F5F7] text-[11px] font-bold flex justify-between text-[#86868B]">
                <span>Parts COGS Cost:</span>
                <span className="text-rose-600 font-mono">-{financialSummary.cogsTotal.toLocaleString()} MMK</span>
              </div>
            </div>

            {/* OpEx Overhead Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[#86868B]">
                <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses (OpEx)</span>
                <Receipt className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {financialSummary.totalOpEx.toLocaleString()} MMK
              </div>
              <div className="pt-2 border-t border-[#F5F5F7] text-[11px] font-bold text-[#86868B] flex justify-between">
                <span>Shop Rent, Utils, Tools, Mktg</span>
                <span className="text-[#1D1D1F]">{expenses.length} Expense Records</span>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-900 shadow-md space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {financialSummary.netProfit.toLocaleString()} MMK
                </span>
                <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {financialSummary.netMarginPercent}% Net
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-300 flex justify-between font-bold">
                <span>Net Formula:</span>
                <span>Gross Profit - OpEx</span>
              </div>
            </div>
          </div>

          {/* Benchmark Target Banner (50%-70% Gross Margin Rule) */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#16A34A] text-white flex items-center justify-center font-black shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-[#1D1D1F] text-sm">Mobile Repair Shop Margin Benchmark (50% – 70% Target)</h4>
                <p className="text-[#86868B] font-medium mt-0.5">
                  Your current Gross Margin is <strong className="text-[#16A34A]">{financialSummary.grossMarginPercent}%</strong>. Healthy mobile repair labs maintain a 50%–70% combined gross margin across parts and technician labor.
                </p>
              </div>
            </div>
            <div className="shrink-0 bg-white border border-emerald-300 px-3 py-1.5 rounded-xl font-mono font-black text-xs text-[#16A34A]">
              {financialSummary.grossMarginPercent >= 50 ? '✓ TARGET ACHIEVED' : '⚠️ BELOW BENCHMARK'}
            </div>
          </div>

          {/* 2-Column Section: Drawer Reconciliation & Inventory Asset */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown & Cash Drawer */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-4">
              <h3 className="font-extrabold text-base text-[#1D1D1F] flex items-center space-x-2 border-b border-[#E5E5EA] pb-3">
                <Wallet className="w-5 h-5 text-[#0071E3]" />
                <span>Daily Cash Drawer & Bank Reconciliation</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Cash Drawer */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-amber-900 block">💵 Cash In Drawer (Physical Cash)</span>
                    <span className="text-[10px] text-amber-800">Must reconcile cleanly with daily opening/closing register</span>
                  </div>
                  <span className="font-mono font-black text-amber-950 text-sm">
                    {financialSummary.paymentMethodsBreakdown.cashDrawer.toLocaleString()} MMK
                  </span>
                </div>

                {/* KBZPay / WavePay / Banking */}
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-blue-900 block">📱 KBZPay / WavePay / Mobile Banking</span>
                    <span className="text-[10px] text-blue-800">Direct wallet transfers & bank QR payments</span>
                  </div>
                  <span className="font-mono font-black text-blue-950 text-sm">
                    {financialSummary.paymentMethodsBreakdown.mobileBanking.toLocaleString()} MMK
                  </span>
                </div>

                {/* Card / POS */}
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-purple-900 block">💳 Credit Card / POS Terminal</span>
                    <span className="text-[10px] text-purple-800">Bank merchant card settlement transfers</span>
                  </div>
                  <span className="font-mono font-black text-purple-950 text-sm">
                    {financialSummary.paymentMethodsBreakdown.cardPos.toLocaleString()} MMK
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory Asset Valuation & Supplier Debt */}
            <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-4">
              <h3 className="font-extrabold text-base text-[#1D1D1F] flex items-center space-x-2 border-b border-[#E5E5EA] pb-3">
                <Boxes className="w-5 h-5 text-[#0071E3]" />
                <span>Stockroom Asset Capital & Supplier Debts</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Total Stock Asset Value */}
                <div className="p-3.5 bg-slate-50 border border-[#E5E5EA] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-extrabold text-[#86868B] uppercase">Tied-Up Capital Asset Value</span>
                    <span className="font-extrabold text-[#1D1D1F] text-xs">Unsold Displays, Batteries & Chips</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-[#1D1D1F] text-sm block">
                      {financialSummary.totalInventoryAssetValue.toLocaleString()} MMK
                    </span>
                    <span className="text-[10px] text-[#34C759] font-bold">
                      Retail Potential: {financialSummary.totalRetailValuation.toLocaleString()} MMK
                    </span>
                  </div>
                </div>

                {/* Total Supplier Debt */}
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-extrabold text-rose-800 uppercase">Accounts Payable / Wholesaler Debts</span>
                    <span className="font-extrabold text-rose-950 text-xs">Unpaid balances to parts vendors</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-rose-700 text-sm block">
                      {financialSummary.totalSupplierDebt.toLocaleString()} MMK
                    </span>
                    {financialSummary.overdueDebtsCount > 0 && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-200/80 px-2 py-0.5 rounded-full">
                        ⚠️ {financialSummary.overdueDebtsCount} Overdue Invoices
                      </span>
                    )}
                  </div>
                </div>

                {/* Tech Commission Pool */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-extrabold text-emerald-800 uppercase">Technician Commission Payouts</span>
                    <span className="font-extrabold text-emerald-950 text-xs">Verified QA Pass Bounties & Rates</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-800 text-sm block">
                      {financialSummary.totalCommissionsEarned.toLocaleString()} MMK
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      Pending Payout: {financialSummary.pendingCommissionsAmount.toLocaleString()} MMK
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: REVENUE & INCOME TRACKING */}
      {activeTab === 'revenue' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#E5E5EA]">
            <div>
              <h3 className="font-extrabold text-base text-[#1D1D1F]">Revenue & Income Stream Analysis</h3>
              <p className="text-xs text-[#86868B] font-medium">Labor service charges vs direct parts sales with payment drawer breakdown</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-[#86868B]">Period Revenue:</span>
              <span className="block text-lg font-black text-[#0071E3]">{financialSummary.totalRevenue.toLocaleString()} MMK</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Labor Income Card */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">🛠️ Labor & Service Income</span>
              <div className="text-2xl font-black text-[#0071E3] font-mono">
                {financialSummary.laborIncome.toLocaleString()} MMK
              </div>
              <p className="text-[11px] text-blue-800 font-medium">
                Direct profit earned from service fees, micro-soldering, and technician labor charges.
              </p>
            </div>

            {/* Parts Sales Income Card */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">📱 Replacement Parts Sales Revenue</span>
              <div className="text-2xl font-black text-[#16A34A] font-mono">
                {financialSummary.partsSalesIncome.toLocaleString()} MMK
              </div>
              <p className="text-[11px] text-emerald-800 font-medium">
                Revenue generated from screen assemblies, batteries, back glass, and accessory sales.
              </p>
            </div>
          </div>

          {/* Work Orders Paid List */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs text-[#1D1D1F] uppercase tracking-wider">Completed Repair Income Records ({filteredWorkOrders.length})</h4>
            <div className="overflow-x-auto border border-[#E5E5EA] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F5F7] text-[#86868B] uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Ticket #</th>
                    <th className="p-3">Customer & Device</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3">Total Paid</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {filteredWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#0071E3]">{wo.orderNumber}</td>
                      <td className="p-3">
                        <span className="font-bold text-[#1D1D1F] block">{wo.deviceModel}</span>
                        <span className="text-[10px] text-[#86868B]">{wo.customerName}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-[#F5F5F7] text-[#1D1D1F] font-bold px-2.5 py-1 rounded-lg text-[11px] border border-[#E5E5EA]">
                          {wo.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{wo.subtotal.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-[#16A34A]">{wo.totalAmount.toLocaleString()} MMK</td>
                      <td className="p-3 text-right">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          wo.isPaid ? 'bg-emerald-100 text-[#16A34A]' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {wo.isPaid ? 'PAID' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: EXPENSES & OPEX TRACKING */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#E5E5EA]">
            <div>
              <h3 className="font-extrabold text-base text-[#1D1D1F]">Operating Expenses (OpEx) & Fixed Shop Overhead</h3>
              <p className="text-xs text-[#86868B] font-medium">Rent, electricity, tools, marketing, and logistics expense logs</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddExpenseModal(true)}
              className="px-3.5 py-2 bg-[#0071E3] text-white font-extrabold text-xs rounded-xl shadow-2xs flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense Entry</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-[#E5E5EA] rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] text-[#86868B] uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description & Payee</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Logged By</th>
                  <th className="p-3 text-right">Amount (MMK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#1D1D1F]">{exp.date}</td>
                    <td className="p-3">
                      <span className="bg-purple-50 text-purple-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px] border border-purple-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#1D1D1F] block">{exp.description}</span>
                      <span className="text-[10px] text-[#86868B]">Payee: {exp.payee}</span>
                    </td>
                    <td className="p-3 text-[#86868B] font-medium">{exp.paymentMethod}</td>
                    <td className="p-3 text-[#1D1D1F] font-bold">{exp.createdByName}</td>
                    <td className="p-3 text-right font-mono font-black text-rose-600">
                      -{exp.amount.toLocaleString()} MMK
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: PARTS INVENTORY ASSET VALUATION */}
      {activeTab === 'inventory-asset' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#E5E5EA]">
            <div>
              <h3 className="font-extrabold text-base text-[#1D1D1F]">Parts Inventory Capital Valuation & Stock Turnover</h3>
              <p className="text-xs text-[#86868B] font-medium">Tracking tied-up capital in unsold screen displays, batteries, chips & slow vs fast movers</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-[#86868B]">Asset Valuation:</span>
              <span className="block text-lg font-black text-[#1D1D1F]">
                {financialSummary.totalInventoryAssetValue.toLocaleString()} MMK
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E5EA] rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] text-[#86868B] uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Part Name & SKU</th>
                  <th className="p-3">Quality Tier</th>
                  <th className="p-3">In Stock Qty</th>
                  <th className="p-3">Unit Cost</th>
                  <th className="p-3">Total Asset Capital</th>
                  <th className="p-3">Retail Selling Value</th>
                  <th className="p-3 text-right">Potential Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {parts.map((part) => {
                  const assetCostVal = part.costPrice * part.quantityInStock;
                  const retailVal = part.sellingPrice * part.quantityInStock;
                  const marginVal = retailVal - assetCostVal;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-[#1D1D1F] block">{part.name}</span>
                        <span className="font-mono text-[10px] text-[#0071E3]">{part.sku}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-[#F5F5F7] text-[#1D1D1F] font-bold px-2 py-0.5 rounded text-[10px] border border-[#E5E5EA]">
                          {part.qualityTier}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-sm text-[#1D1D1F]">{part.quantityInStock}</td>
                      <td className="p-3 font-mono text-[#86868B]">{part.costPrice.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-[#1D1D1F]">{assetCostVal.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-[#16A34A]">{retailVal.toLocaleString()} MMK</td>
                      <td className="p-3 text-right font-mono font-black text-[#0071E3]">+{marginVal.toLocaleString()} MMK</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: TECHNICIAN COMMISSIONS */}
      {activeTab === 'commissions' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#E5E5EA]">
            <div>
              <h3 className="font-extrabold text-base text-[#1D1D1F]">Technician Commission & QA Payout Audit</h3>
              <p className="text-xs text-[#86868B] font-medium">Verified ticket payouts based on commission rates and zero-warranty QA passes</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-[#86868B]">Total Period Commissions:</span>
              <span className="block text-lg font-black text-[#16A34A]">
                {financialSummary.totalCommissionsEarned.toLocaleString()} MMK
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E5EA] rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] text-[#86868B] uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Technician</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Tickets Closed</th>
                  <th className="p-3">Labor Generated</th>
                  <th className="p-3">Rate %</th>
                  <th className="p-3">Commission + Bonus</th>
                  <th className="p-3">Payout Total</th>
                  <th className="p-3 text-right">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {technicianPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-[#1D1D1F]">{payout.technicianName}</td>
                    <td className="p-3 font-mono text-[#86868B]">{payout.period}</td>
                    <td className="p-3 font-mono font-bold">{payout.totalTicketsClosed} tickets</td>
                    <td className="p-3 font-mono font-bold text-[#0071E3]">{payout.totalLaborRevenue.toLocaleString()} MMK</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{payout.commissionRatePercent}%</td>
                    <td className="p-3 font-mono text-emerald-800">
                      {payout.commissionAmount.toLocaleString()} + {payout.bonusAmount.toLocaleString()} MMK
                    </td>
                    <td className="p-3 font-mono font-black text-[#16A34A] text-sm">{payout.netPayout.toLocaleString()} MMK</td>
                    <td className="p-3 text-right space-x-1.5">
                      {payout.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => onUpdatePayoutStatus(payout.id, 'Approved')}
                          className="px-2.5 py-1 bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {payout.status === 'Approved' && (
                        <button
                          type="button"
                          onClick={() => onUpdatePayoutStatus(payout.id, 'Paid')}
                          className="px-2.5 py-1 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                      {payout.status === 'Paid' && (
                        <span className="bg-emerald-100 text-[#16A34A] font-black px-2.5 py-1 rounded-lg text-[10px]">
                          ✓ PAID
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: ACCOUNTS PAYABLE & SUPPLIER DEBTS */}
      {activeTab === 'accounts-payable' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#E5E5EA]">
            <div>
              <h3 className="font-extrabold text-base text-[#1D1D1F]">Accounts Payable & Wholesaler Credit Debts</h3>
              <p className="text-xs text-[#86868B] font-medium">Managing outstanding unpaid invoices to parts suppliers to protect shop credit rating</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-[#86868B]">Total Outstanding Debts:</span>
              <span className="block text-lg font-black text-rose-600">
                {financialSummary.totalSupplierDebt.toLocaleString()} MMK
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E5EA] rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] text-[#86868B] uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Supplier & Invoice #</th>
                  <th className="p-3">Issue / Due Date</th>
                  <th className="p-3">Total Invoice</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Balance Owed</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {supplierDebts.map((debt) => {
                  const balance = debt.totalAmount - debt.paidAmount;
                  const isOverdue = debt.status !== 'Paid' && new Date(debt.dueDate) < new Date();

                  return (
                    <tr key={debt.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-[#1D1D1F] block">{debt.supplierName}</span>
                        <span className="font-mono text-[10px] text-[#0071E3]">{debt.invoiceNumber}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="block text-[#86868B]">Issued: {debt.issueDate}</span>
                        <span className={`font-bold ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-[#1D1D1F]'}`}>
                          Due: {debt.dueDate}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#1D1D1F]">{debt.totalAmount.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-[#16A34A]">{debt.paidAmount.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-black text-rose-600 text-sm">{balance.toLocaleString()} MMK</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${
                          debt.status === 'Paid' ? 'bg-emerald-100 text-[#16A34A]' :
                          debt.status === 'Partial' ? 'bg-blue-100 text-[#0071E3]' :
                          isOverdue ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isOverdue ? 'OVERDUE' : debt.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {debt.status !== 'Paid' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDebtForPayment(debt);
                              setPaymentAmountInput(balance);
                            }}
                            className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD EXPENSE */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveExpenseSubmit} className="bg-white border border-[#E5E5EA] rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-3">
              <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <span>Record New Shop Operating Expense (OpEx)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 font-bold text-xs"
                >
                  <option value="Rent">Shop Premises Rent</option>
                  <option value="Utilities">Electricity & Water</option>
                  <option value="Staff Salary">Technician / Staff Salary</option>
                  <option value="Tools & Equipment">Soldering Tools & Fluke</option>
                  <option value="Shipping & Logistics">Freight Cargo</option>
                  <option value="Marketing">Social Media Ads</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-[#1D1D1F] mb-1">Description *</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="e.g. July Air Conditioning Power Bill"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Amount (MMK) *</label>
                <input
                  type="number"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  placeholder="125000"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Payment Method</label>
                <select
                  value={newExpense.paymentMethod}
                  onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 font-bold text-xs"
                >
                  {activePaymentMethods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name} ({m.category})</option>
                  ))}
                  <option value="Supplier Credit">Supplier Credit</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-[#1D1D1F] mb-1">Payee / Vendor Name</label>
                <input
                  type="text"
                  value={newExpense.payee}
                  onChange={(e) => setNewExpense({ ...newExpense, payee: e.target.value })}
                  placeholder="e.g. Yangon Electricity Supply Corp"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-2xs cursor-pointer"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: RECORD SUPPLIER DEBT PAYMENT */}
      {selectedDebtForPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-3">
              <h3 className="text-base font-extrabold text-[#1D1D1F]">
                Record Supplier Debt Payment
              </h3>
              <button onClick={() => setSelectedDebtForPayment(null)}>
                <X className="w-5 h-5 text-[#86868B]" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-extrabold text-[#1D1D1F] block">{selectedDebtForPayment.supplierName}</span>
              <span className="text-[10px] text-[#86868B] block font-mono">Invoice #{selectedDebtForPayment.invoiceNumber}</span>
              <div className="flex justify-between text-xs pt-1 border-t border-[#E5E5EA]">
                <span>Total Invoice:</span>
                <span className="font-mono font-bold">{selectedDebtForPayment.totalAmount.toLocaleString()} MMK</span>
              </div>
              <div className="flex justify-between text-xs text-rose-600 font-bold">
                <span>Remaining Balance:</span>
                <span className="font-mono">{(selectedDebtForPayment.totalAmount - selectedDebtForPayment.paidAmount).toLocaleString()} MMK</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Payment Amount (MMK)</label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Payment Method</label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 font-bold text-xs"
                >
                  {activePaymentMethods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name} ({m.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Payment Note / Receipt Reference</label>
                <input
                  type="text"
                  value={paymentNoteInput}
                  onChange={(e) => setPaymentNoteInput(e.target.value)}
                  placeholder="e.g. Partial settlement via KBZPay"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setSelectedDebtForPayment(null)}
                className="px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSupplierPayment}
                className="px-4 py-2 bg-[#0071E3] text-white font-extrabold rounded-xl shadow-2xs cursor-pointer"
              >
                Submit Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
