import React, { useState, useMemo } from 'react';
import {DollarSign, 
  TrendingUp, 
  Receipt, 
  Boxes, 
  Users, 
  Truck, 
  Plus, 
  PieChart, 
  CheckCircle2, 
  X,
  Percent,
  Coins,
  Wallet,
  Sparkles} from 'lucide-react';
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
import { Button , Input } from '../ui';
import { toast } from '../../lib/toast';

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
  onSettleInventoryFund?: (ids: string[]) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
}

export const ShopFinancePlModule: React.FC<ShopFinancePlModuleProps> = ({
  workOrders,
  parts,
  expenses,
  supplierDebts,
  technicianPayouts,
  systemSettings,
  onAddExpense,
  onRecordSupplierPayment,
  onUpdatePayoutStatus,
  onSettleInventoryFund,
  dateFilter,
}) => {
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'expenses' | 'inventory-asset' | 'commissions' | 'accounts-payable' | 'inventory-fund' | 'parts-revenue'>('overview');
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

  // Inventory Fund: parts taken from stock awaiting settlement (internal debt
  // to the shop's parts fund — set aside money / restock to clear it).
  const fundTickets = filteredWorkOrders.filter((wo) => wo.inventoryConsumptionAmount);
  const pendingFundTickets = fundTickets.filter((wo) => wo.inventorySettlementStatus !== 'settled');
  const pendingFundCount = pendingFundTickets.length;
  const pendingFundTotal = pendingFundTickets.reduce((sum, wo) => sum + (wo.inventoryConsumptionAmount || 0), 0);
  const settledFundTotal = fundTickets
    .filter((wo) => wo.inventorySettlementStatus === 'settled')
    .reduce((sum, wo) => sum + (wo.inventoryConsumptionAmount || 0), 0);

  // Parts revenue per ticket: selling price of the inventory parts sold (same
  // lines that consumed stock — partId, non-labor).
  const partsRevenueOf = (wo: WorkOrder) =>
    (wo.lineItems || [])
      .filter((li) => li.partId && !li.isLabor && li.quantity > 0)
      .reduce((s, li) => s + li.unitPrice * li.quantity, 0);
  const partsRevenueTotal = fundTickets.reduce((s, wo) => s + partsRevenueOf(wo), 0);

  // Financial Calculations
  const financialSummary = useMemo(() => {
    let laborIncome = 0;
    let partsSalesIncome = 0;
    let cogsTotal = 0;
    let partsUnitsSold = 0;

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
            partsUnitsSold += li.quantity;
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

    // Parts-specific P&L: sold units, revenue, COGS, gross profit, margin %
    const partsProfit = partsSalesIncome - cogsTotal;
    const partsMarginPercent = partsSalesIncome > 0 ? Math.round((partsProfit / partsSalesIncome) * 100) : 0;

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
      partsUnitsSold,
      cogsTotal,
      partsProfit,
      partsMarginPercent,
      totalRevenue,
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

  // Parts profit by category: which parts make the money this period.
  const partsCategoryProfit = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number; cost: number }>();
    filteredWorkOrders.forEach((wo) => {
      (wo.lineItems || []).forEach((li) => {
        if (li.partId && !li.isLabor && li.quantity > 0) {
          const part = parts.find((p) => p.id === li.partId);
          const category = part?.category || 'Uncategorized';
          const entry = map.get(category) || { units: 0, revenue: 0, cost: 0 };
          entry.units += li.quantity;
          entry.revenue += li.unitPrice * li.quantity;
          entry.cost += (li.unitCost || part?.costPrice || 0) * li.quantity;
          map.set(category, entry);
        }
      });
    });
    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v, profit: v.revenue - v.cost }))
      .sort((a, b) => b.profit - a.profit);
  }, [filteredWorkOrders, parts]);

  // Parts sold per ticket (only tickets with part line items)
  const partsTickets = useMemo(() => {
    return filteredWorkOrders
      .map((wo) => {
        const lines = (wo.lineItems || []).filter((li) => li.partId && !li.isLabor && li.quantity > 0);
        if (!lines.length) return null;
        return {
          wo,
          units: lines.reduce((s, li) => s + li.quantity, 0),
          revenue: lines.reduce((s, li) => s + li.unitPrice * li.quantity, 0),
          cost: lines.reduce((s, li) => s + (li.unitCost || 0) * li.quantity, 0),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredWorkOrders]);

  const handleSaveExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || newExpense.amount <= 0 || !newExpense.description) {
      toast.error('Please fill out expense description and a valid amount.', 'Invalid Expense');
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
    <div className="finance-module space-y-3">
      {/* Title & Header Bar */}
      <div className="module-toolbar flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-line shadow-xs">
        <div className="module-subheader flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-2xs">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-ink tracking-tight">
              <span className="hidden sm:inline">Shop Finance, Profit & Loss (P&L) Engine</span>
              <span className="sm:hidden">Finance & P&L Engine</span>
            </h1>
            <p className="text-xs text-muted font-medium">
              Labor & parts income, COGS margins, OpEx overhead, inventory asset valuation & supplier debts
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Quick Add Expense Button */}
          <Button
            type="button"
            onClick={() => setShowAddExpenseModal(true)}
            className="w-full md:w-auto bg-brand hover:opacity-90 text-white flex items-center justify-center md:justify-start space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-surface p-1.5 rounded-2xl border border-line flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full text-xs shadow-2xs">
        {[
          { id: 'overview', label: 'Financial Overview', icon: PieChart },
          { id: 'revenue', label: '1. Revenue & Payment Methods', icon: TrendingUp },
          { id: 'expenses', label: '2. OpEx & COGS Costs', icon: Receipt },
          { id: 'inventory-asset', label: '3. Parts Asset Valuation', icon: Boxes },
          { id: 'commissions', label: '4. Tech Commissions', icon: Users },
          { id: 'accounts-payable', label: '5. Accounts Payable / Debts', icon: Truck, badge: financialSummary.overdueDebtsCount > 0 ? `${financialSummary.overdueDebtsCount} Overdue` : undefined },
          { id: 'inventory-fund', label: '6. Inventory Fund', icon: Coins, badge: pendingFundCount > 0 ? `${pendingFundCount} To Settle` : undefined },
          { id: 'parts-revenue', label: '7. Parts Revenue & Profit', icon: Boxes, badge: financialSummary.partsUnitsSold > 0 ? `${financialSummary.partsUnitsSold} Sold` : undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                isActive
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-faint hover:text-ink border-line'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white animate-pulse'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: FINANCIAL OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key P&L Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-6 4xl:grid-cols-8 gap-4">
            {/* Total Gross Revenue Card */}
            <div className="bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl font-black text-ink font-mono">
                {financialSummary.totalRevenue.toLocaleString()} MMK
              </div>
              <div className="pt-2 border-t border-surface text-xs font-bold space-y-0.5">
                <div className="flex justify-between text-brand">
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
            <div className="bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Profit (Margin)</span>
                <Coins className="w-4 h-4 text-brand" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-brand font-mono">
                  {financialSummary.grossProfit.toLocaleString()} MMK
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  financialSummary.grossMarginPercent >= 50
                    ? 'bg-emerald-50 text-success-deep'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {financialSummary.grossMarginPercent}% Gross
                </span>
              </div>
              <div className="pt-2 border-t border-surface text-xs font-bold space-y-0.5">
                <div className="flex justify-between text-muted">
                  <span>Parts COGS Cost:</span>
                  <span className="text-rose-600 font-mono">-{financialSummary.cogsTotal.toLocaleString()} MMK</span>
                </div>
                <div className="flex justify-between text-success-deep">
                  <span>Parts Profit:</span>
                  <span className="font-mono">+{financialSummary.partsProfit.toLocaleString()} MMK</span>
                </div>
              </div>
            </div>

            {/* OpEx Overhead Card */}
            <div className="bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses (OpEx)</span>
                <Receipt className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {financialSummary.totalOpEx.toLocaleString()} MMK
              </div>
              <div className="pt-2 border-t border-surface text-xs font-bold text-muted flex justify-between">
                <span>Shop Rent, Utils, Tools, Mktg</span>
                <span className="text-ink">{expenses.length} Expense Records</span>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className="bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
                <Sparkles className="w-4 h-4 text-brand" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-brand font-mono">
                  {financialSummary.netProfit.toLocaleString()} MMK
                </span>
                <span className="text-xs font-black bg-surface text-ink px-2 py-0.5 rounded-full border border-line">
                  {financialSummary.netMarginPercent}% Net
                </span>
              </div>
              <div className="pt-2 border-t border-surface text-xs text-muted flex justify-between font-bold">
                <span>Net Formula:</span>
                <span>Gross Profit - OpEx</span>
              </div>
            </div>
          </div>

          {/* Benchmark Target Banner (50%-70% Gross Margin Rule) */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-success text-white flex items-center justify-center font-black shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-ink text-sm">Mobile Repair Shop Margin Benchmark (50% – 70% Target)</h2>
                <p className="text-ink/70 font-medium mt-0.5">
                  Your current Gross Margin is <strong className="text-success-deep">{financialSummary.grossMarginPercent}%</strong>. Healthy labs target 50–70% combined margin.</p>
              </div>
            </div>
            <div className="shrink-0 bg-white border border-emerald-300 px-3 py-1.5 rounded-xl font-mono font-black text-xs text-success-deep">
              {financialSummary.grossMarginPercent >= 50 ? '✓ TARGET ACHIEVED' : '⚠️ BELOW BENCHMARK'}
            </div>
          </div>

          {/* 2-Column Section: Drawer Reconciliation & Inventory Asset */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown & Cash Drawer */}
            <div className="bg-white p-5 rounded-2xl border border-line shadow-xs space-y-4">
              <h3 className="font-extrabold text-base text-ink flex items-center space-x-2 border-b border-line pb-3">
                <Wallet className="w-5 h-5 text-brand" />
                <span>Daily Cash Drawer & Bank Reconciliation</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Cash Drawer */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-amber-900 block">💵 Cash In Drawer (Physical Cash)</span>
                    <span className="text-xs text-amber-800">Must reconcile cleanly with daily opening/closing register</span>
                  </div>
                  <span className="font-mono font-black text-amber-950 text-sm">
                    {financialSummary.paymentMethodsBreakdown.cashDrawer.toLocaleString()} MMK
                  </span>
                </div>

                {/* KBZPay / WavePay / Banking */}
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-blue-900 block">📱 KBZPay / WavePay / Mobile Banking</span>
                    <span className="text-xs text-blue-800">Direct wallet transfers & bank QR payments</span>
                  </div>
                  <span className="font-mono font-black text-blue-950 text-sm">
                    {financialSummary.paymentMethodsBreakdown.mobileBanking.toLocaleString()} MMK
                  </span>
                </div>

                {/* Card / POS */}
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-purple-900 block">💳 Credit Card / POS Terminal</span>
                    <span className="text-xs text-purple-800">Bank merchant card settlement transfers</span>
                  </div>
                  <span className="font-mono font-black text-purple-950 text-sm">
                    {financialSummary.paymentMethodsBreakdown.cardPos.toLocaleString()} MMK
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory Asset Valuation & Supplier Debt */}
            <div className="bg-white p-5 rounded-2xl border border-line shadow-xs space-y-4">
              <h3 className="font-extrabold text-base text-ink flex items-center space-x-2 border-b border-line pb-3">
                <Boxes className="w-5 h-5 text-brand" />
                <span>Stockroom Asset Capital & Supplier Debts</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Total Stock Asset Value */}
                <div className="p-3.5 bg-slate-50 border border-line rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-extrabold text-muted uppercase">Tied-Up Capital Asset Value</span>
                    <span className="font-extrabold text-ink text-xs">Unsold Displays, Batteries & Chips</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-ink text-sm block">
                      {financialSummary.totalInventoryAssetValue.toLocaleString()} MMK
                    </span>
                    <span className="text-xs text-success-deep font-bold">
                      Retail Potential: {financialSummary.totalRetailValuation.toLocaleString()} MMK
                    </span>
                  </div>
                </div>

                {/* Total Supplier Debt */}
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-extrabold text-rose-800 uppercase">Accounts Payable / Wholesaler Debts</span>
                    <span className="font-extrabold text-rose-950 text-xs">Unpaid balances to parts vendors</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-rose-700 text-sm block">
                      {financialSummary.totalSupplierDebt.toLocaleString()} MMK
                    </span>
                    {financialSummary.overdueDebtsCount > 0 && (
                      <span className="text-xs font-black text-rose-600 bg-rose-200/80 px-2 py-0.5 rounded-full">
                        ⚠️ {financialSummary.overdueDebtsCount} Overdue Invoices
                      </span>
                    )}
                  </div>
                </div>

                {/* Tech Commission Pool */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-extrabold text-emerald-800 uppercase">Technician Commission Payouts</span>
                    <span className="font-extrabold text-emerald-950 text-xs">Verified QA Pass Bounties & Rates</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-800 text-sm block">
                      {financialSummary.totalCommissionsEarned.toLocaleString()} MMK
                    </span>
                    <span className="text-xs text-emerald-700 font-bold">
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
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Revenue & Income Stream Analysis</h3>
              <p className="text-xs text-muted font-medium">Labor service charges vs direct parts sales with payment drawer breakdown</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Period Revenue:</span>
              <span className="block text-lg font-black text-brand">{financialSummary.totalRevenue.toLocaleString()} MMK</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Labor Income Card */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">🛠️ Labor & Service Income</span>
              <div className="text-2xl font-black text-brand font-mono">
                {financialSummary.laborIncome.toLocaleString()} MMK
              </div>
              <p className="text-xs text-blue-800 font-medium">
                Direct profit earned from service fees, micro-soldering, and technician labor charges.
              </p>
            </div>

            {/* Parts Sales Income Card */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">📱 Replacement Parts Sales Revenue</span>
              <div className="text-2xl font-black text-success-deep font-mono">
                {financialSummary.partsSalesIncome.toLocaleString()} MMK
              </div>
              <p className="text-xs text-emerald-800 font-medium">
                Revenue generated from screen assemblies, batteries, back glass, and accessory sales.
              </p>
            </div>
          </div>

          {/* Work Orders Paid List */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">Completed Repair Income Records ({filteredWorkOrders.length})</h4>
            <div className="overflow-x-auto border border-line rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-muted uppercase font-mono text-xs">
                  <tr>
                    <th className="p-3">Ticket #</th>
                    <th className="p-3">Customer & Device</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3">Total Paid</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-brand">{wo.orderNumber}</td>
                      <td className="p-3">
                        <span className="font-bold text-ink block">{wo.deviceModel}</span>
                        <span className="text-xs text-muted">{wo.customerName}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-surface text-ink font-bold px-2.5 py-1 rounded-lg text-xs border border-line">
                          {wo.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{wo.subtotal.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{wo.totalAmount.toLocaleString()} MMK</td>
                      <td className="p-3 text-right">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          wo.isPaid ? 'bg-emerald-100 text-success-deep' : 'bg-amber-100 text-amber-800'
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
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Operating Expenses (OpEx) & Fixed Shop Overhead</h3>
              <p className="text-xs text-muted font-medium">Rent, electricity, tools, marketing, and logistics expense logs</p>
            </div>
            <Button
              type="button"
              onClick={() => setShowAddExpenseModal(true)}
              className="bg-brand text-white flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense Entry</span>
            </Button>
          </div>

          <div className="overflow-x-auto border border-line rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-surface text-muted uppercase font-mono text-xs">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description & Payee</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Logged By</th>
                  <th className="p-3 text-right">Amount (MMK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-ink">{exp.date}</td>
                    <td className="p-3">
                      <span className="bg-purple-50 text-purple-800 font-extrabold px-2.5 py-1 rounded-lg text-xs border border-purple-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-ink block">{exp.description}</span>
                      <span className="text-xs text-muted">Payee: {exp.payee}</span>
                    </td>
                    <td className="p-3 text-muted font-medium">{exp.paymentMethod}</td>
                    <td className="p-3 text-ink font-bold">{exp.createdByName}</td>
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
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Parts Inventory Capital Valuation & Stock Turnover</h3>
              <p className="text-xs text-muted font-medium">Tracking tied-up capital in unsold screen displays, batteries, chips & slow vs fast movers</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Asset Valuation:</span>
              <span className="block text-lg font-black text-ink">
                {financialSummary.totalInventoryAssetValue.toLocaleString()} MMK
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-line rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-surface text-muted uppercase font-mono text-xs">
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
              <tbody className="divide-y divide-line">
                {parts.map((part) => {
                  const assetCostVal = part.costPrice * part.quantityInStock;
                  const retailVal = part.sellingPrice * part.quantityInStock;
                  const marginVal = retailVal - assetCostVal;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-ink block">{part.name}</span>
                        <span className="font-mono text-xs text-brand">{part.sku}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-surface text-ink font-bold px-2 py-0.5 rounded text-xs border border-line">
                          {part.qualityTier}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-sm text-ink">{part.quantityInStock}</td>
                      <td className="p-3 font-mono text-muted">{part.costPrice.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-ink">{assetCostVal.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{retailVal.toLocaleString()} MMK</td>
                      <td className="p-3 text-right font-mono font-black text-brand">+{marginVal.toLocaleString()} MMK</td>
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
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Technician Commission & QA Payout Audit</h3>
              <p className="text-xs text-muted font-medium">Verified ticket payouts based on commission rates and zero-warranty QA passes</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Total Period Commissions:</span>
              <span className="block text-lg font-black text-success-deep">
                {financialSummary.totalCommissionsEarned.toLocaleString()} MMK
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-line rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-surface text-muted uppercase font-mono text-xs">
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
              <tbody className="divide-y divide-line">
                {technicianPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-ink">{payout.technicianName}</td>
                    <td className="p-3 font-mono text-muted">{payout.period}</td>
                    <td className="p-3 font-mono font-bold">{payout.totalTicketsClosed} tickets</td>
                    <td className="p-3 font-mono font-bold text-brand">{payout.totalLaborRevenue.toLocaleString()} MMK</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{payout.commissionRatePercent}%</td>
                    <td className="p-3 font-mono text-emerald-800">
                      {payout.commissionAmount.toLocaleString()} + {payout.bonusAmount.toLocaleString()} MMK
                    </td>
                    <td className="p-3 font-mono font-black text-success-deep text-sm">{payout.netPayout.toLocaleString()} MMK</td>
                    <td className="p-3 text-right space-x-1.5">
                      {payout.status === 'Pending' && (
                        <Button
                          type="button"
                          onClick={() => onUpdatePayoutStatus(payout.id, 'Approved')}
                          className="px-2.5 py-1 bg-brand hover:bg-brand-deep text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Approve
                        </Button>
                      )}
                      {payout.status === 'Approved' && (
                        <Button
                          type="button"
                          onClick={() => onUpdatePayoutStatus(payout.id, 'Paid')}
                          className="px-2.5 py-1 bg-success hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Mark Paid
                        </Button>
                      )}
                      {payout.status === 'Paid' && (
                        <span className="bg-emerald-100 text-success-deep font-black px-2.5 py-1 rounded-lg text-xs">
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
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Accounts Payable & Wholesaler Credit Debts</h3>
              <p className="text-xs text-muted font-medium">Managing outstanding unpaid invoices to parts suppliers to protect shop credit rating</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Total Outstanding Debts:</span>
              <span className="block text-lg font-black text-rose-600">
                {financialSummary.totalSupplierDebt.toLocaleString()} MMK
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-line rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-surface text-muted uppercase font-mono text-xs">
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
              <tbody className="divide-y divide-line">
                {supplierDebts.map((debt) => {
                  const balance = debt.totalAmount - debt.paidAmount;
                  const isOverdue = debt.status !== 'Paid' && new Date(debt.dueDate) < new Date();

                  return (
                    <tr key={debt.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-ink block">{debt.supplierName}</span>
                        <span className="font-mono text-xs text-brand">{debt.invoiceNumber}</span>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        <span className="block text-muted">Issued: {debt.issueDate}</span>
                        <span className={`font-bold ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-ink'}`}>
                          Due: {debt.dueDate}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-ink">{debt.totalAmount.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{debt.paidAmount.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-black text-rose-600 text-sm">{balance.toLocaleString()} MMK</td>
                      <td className="p-3">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                          debt.status === 'Paid' ? 'bg-emerald-100 text-success-deep' :
                          debt.status === 'Partial' ? 'bg-blue-100 text-brand' :
                          isOverdue ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isOverdue ? 'OVERDUE' : debt.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {debt.status !== 'Paid' && (
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedDebtForPayment(debt);
                              setPaymentAmountInput(balance);
                            }}
                            className="px-3 py-1.5 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer"
                          >
                            Record Payment
                          </Button>
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
          <form onSubmit={handleSaveExpenseSubmit} className="bg-white border border-line rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <span>Record New Shop Operating Expense (OpEx)</span>
              </h3>
              <Button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="text-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-ink mb-1">Date</label>
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full bg-surface border border-line rounded-xl p-2 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                  className="w-full bg-surface border border-line rounded-xl p-2 font-bold text-xs"
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
                <label className="block font-bold text-ink mb-1">Description *</label>
                <Input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="e.g. July Air Conditioning Power Bill"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Amount (MMK) *</label>
                <Input
                  type="number"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  placeholder="125000"
                  className="w-full bg-surface border border-line rounded-xl p-2 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Payment Method</label>
                <select
                  value={newExpense.paymentMethod}
                  onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any })}
                  className="w-full bg-surface border border-line rounded-xl p-2 font-bold text-xs"
                >
                  {activePaymentMethods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name} ({m.category})</option>
                  ))}
                  <option value="Supplier Credit">Supplier Credit</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-ink mb-1">Payee / Vendor Name</label>
                <Input
                  type="text"
                  value={newExpense.payee}
                  onChange={(e) => setNewExpense({ ...newExpense, payee: e.target.value })}
                  placeholder="e.g. Yangon Electricity Supply Corp"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-line">
              <Button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Save Expense
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: RECORD SUPPLIER DEBT PAYMENT */}
      {selectedDebtForPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-base font-extrabold text-ink">
                Record Supplier Debt Payment
              </h3>
              <Button onClick={() => setSelectedDebtForPayment(null)} aria-label="Close debt payment" className="rounded-lg p-1 hover:bg-surface transition-colors">
                <X className="w-5 h-5 text-muted" />
              </Button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-extrabold text-ink block">{selectedDebtForPayment.supplierName}</span>
              <span className="text-xs text-muted block font-mono">Invoice #{selectedDebtForPayment.invoiceNumber}</span>
              <div className="flex justify-between text-xs pt-1 border-t border-line">
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
                <label className="block font-bold text-ink mb-1">Payment Amount (MMK)</label>
                <Input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-xl p-2.5 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Payment Method</label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl p-2.5 font-bold text-xs"
                >
                  {activePaymentMethods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name} ({m.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Payment Note / Receipt Reference</label>
                <Input
                  type="text"
                  value={paymentNoteInput}
                  onChange={(e) => setPaymentNoteInput(e.target.value)}
                  placeholder="e.g. Partial settlement via KBZPay"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-line">
              <Button
                type="button"
                onClick={() => setSelectedDebtForPayment(null)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSupplierPayment}
                className="bg-brand text-white"
              >
                Submit Payment
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* SUB-VIEW 7: INVENTORY FUND */}
      {activeTab === 'inventory-fund' && (
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Inventory Fund — Parts Cost Settlement</h3>
              <p className="text-xs text-muted font-medium">
                Parts taken from stock are an internal debt to the shop's parts fund. Settle once the money is set aside or replacement stock is bought.
              </p>
            </div>
            <div className="flex items-center gap-3 text-right font-mono">
              <div>
                <span className="text-xs text-muted block">Parts Revenue</span>
                <span className="text-lg font-black text-success-deep">{partsRevenueTotal.toLocaleString()} MMK</span>
              </div>
              <div className="h-8 w-px bg-line" />
              <div>
                <span className="text-xs text-muted block">Pending Settlement</span>
                <span className="text-lg font-black text-amber-600">{pendingFundTotal.toLocaleString()} MMK</span>
              </div>
              <div className="h-8 w-px bg-line" />
              <div>
                <span className="text-xs text-muted block">Settled This Period</span>
                <span className="text-lg font-black text-emerald-600">{settledFundTotal.toLocaleString()} MMK</span>
              </div>
            </div>
          </div>

          {pendingFundTickets.length > 0 && (
            <Button
              type="button"
              onClick={() => onSettleInventoryFund?.(pendingFundTickets.map((wo) => wo.id))}
              className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-extrabold text-amber-800 hover:bg-amber-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark All {pendingFundTickets.length} Pending Tickets Settled ({pendingFundTotal.toLocaleString()} MMK)
            </Button>
          )}

          <div className="overflow-x-auto border border-line rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-surface text-muted uppercase font-mono text-xs">
                <tr>
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Device</th>
                  <th className="p-3">Parts Revenue</th>
                  <th className="p-3">Parts Cost</th>
                  <th className="p-3">Parts Margin</th>
                  <th className="p-3">Consumed</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {fundTickets.map((wo) => {
                  const pending = wo.inventorySettlementStatus !== 'settled';
                  const partsRev = partsRevenueOf(wo);
                  const partsCost = wo.inventoryConsumptionAmount || 0;
                  return (
                    <tr key={wo.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-brand">{wo.orderNumber}</td>
                      <td className="p-3 font-extrabold text-ink">{wo.deviceModel}</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{partsRev.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-black text-ink">{partsCost.toLocaleString()} MMK</td>
                      <td className="p-3 font-mono font-black text-brand">+{(partsRev - partsCost).toLocaleString()} MMK</td>
                      <td className="p-3 font-mono text-muted">
                        {wo.inventoryConsumedAt ? new Date(wo.inventoryConsumedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                          pending ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-success-deep'
                        }`}>
                          {pending ? 'PENDING SETTLE' : 'SETTLED'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {pending ? (
                          <Button
                            type="button"
                            onClick={() => onSettleInventoryFund?.([wo.id])}
                            size="sm"
                            className="bg-brand hover:bg-brand-deep text-white"
                          >
                            Mark Settled
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-bold">
                            ✓ {wo.inventorySettledAt ? new Date(wo.inventorySettledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {fundTickets.length === 0 && (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <Coins className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No parts used from inventory in this period</p>
                <p>When a ticket consumes stock at checkout, its parts cost appears here for settlement.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* SUB-VIEW 8: PARTS REVENUE & PROFIT (standalone) */}
      {activeTab === 'parts-revenue' && (
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Parts Revenue & Profit</h3>
              <p className="text-xs text-muted font-medium">
                How much parts sold this period and how much profit they made — by category and by ticket.
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Parts Sold This Period:</span>
              <span className="block text-lg font-black text-success-deep">{financialSummary.partsSalesIncome.toLocaleString()} MMK</span>
            </div>
          </div>

          {/* P&L summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-line rounded-xl shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase block">Units Sold</span>
              <p className="text-xl font-black text-ink mt-1">{financialSummary.partsUnitsSold}</p>
              <span className="text-xs text-muted font-bold">parts this period</span>
            </div>
            <div className="p-3.5 bg-white border border-line rounded-xl shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase block">Parts Revenue</span>
              <p className="text-xl font-black text-success-deep mt-1">{financialSummary.partsSalesIncome.toLocaleString()} MMK</p>
              <span className="text-xs text-muted font-bold">selling price</span>
            </div>
            <div className="p-3.5 bg-white border border-line rounded-xl shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase block">Parts COGS</span>
              <p className="text-xl font-black text-rose-600 mt-1">-{financialSummary.cogsTotal.toLocaleString()} MMK</p>
              <span className="text-xs text-muted font-bold">unit cost</span>
            </div>
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-white border border-success/30 rounded-xl shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase block">Parts Profit</span>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-xl font-black text-success-deep">+{financialSummary.partsProfit.toLocaleString()} MMK</p>
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                  financialSummary.partsMarginPercent >= 40 ? 'bg-emerald-100 text-success-deep' : 'bg-amber-100 text-amber-800'
                }`}>
                  {financialSummary.partsMarginPercent}%
                </span>
              </div>
              <span className="text-xs text-muted font-bold">gross margin</span>
            </div>
          </div>

          {/* Top parts categories by profit */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">Profit by Parts Category</h4>
            {partsCategoryProfit.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong">
                <Boxes className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No parts sold in this period</p>
                <p>Parts sold on repair tickets will appear here grouped by category.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-muted uppercase font-mono text-xs">
                    <tr>
                      <th className="p-3">Parts Category</th>
                      <th className="p-3 text-center">Units</th>
                      <th className="p-3 text-center">Revenue</th>
                      <th className="p-3 text-center">COGS</th>
                      <th className="p-3 text-center">Profit</th>
                      <th className="p-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {partsCategoryProfit.slice(0, 10).map((row) => (
                      <tr key={row.category} className="hover:bg-slate-50">
                        <td className="p-3 font-extrabold text-ink">{row.category}</td>
                        <td className="p-3 text-center font-mono font-bold">{row.units}</td>
                        <td className="p-3 text-center font-mono text-success-deep">{row.revenue.toLocaleString()} MMK</td>
                        <td className="p-3 text-center font-mono text-rose-600">{row.cost.toLocaleString()} MMK</td>
                        <td className="p-3 text-center font-mono font-black text-success-deep">+{row.profit.toLocaleString()} MMK</td>
                        <td className="p-3 text-right font-mono font-bold text-brand">
                          {row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Parts sold per ticket */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">Parts Sold by Ticket ({partsTickets.length})</h4>
            {partsTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong">
                <p className="font-extrabold text-sm text-ink">No tickets with parts in this period</p>
                <p>Repair tickets that used/sold inventory parts will be listed here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-muted uppercase font-mono text-xs">
                    <tr>
                      <th className="p-3">Ticket</th>
                      <th className="p-3">Device / Customer</th>
                      <th className="p-3 text-center">Parts Units</th>
                      <th className="p-3 text-center">Parts Revenue</th>
                      <th className="p-3 text-center">Parts COGS</th>
                      <th className="p-3 text-right">Parts Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {partsTickets.map(({ wo, units, revenue, cost }) => (
                      <tr key={wo.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-brand">{wo.orderNumber}</td>
                        <td className="p-3">
                          <span className="font-bold text-ink block">{wo.deviceModel}</span>
                          <span className="text-xs text-muted">{wo.customerName}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">{units}</td>
                        <td className="p-3 text-center font-mono text-success-deep">{revenue.toLocaleString()} MMK</td>
                        <td className="p-3 text-center font-mono text-rose-600">{cost.toLocaleString()} MMK</td>
                        <td className="p-3 text-right font-mono font-black text-success-deep">+{(revenue - cost).toLocaleString()} MMK</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
