import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import { confirmDialog } from '../common/ConfirmDialog';
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
  Banknote,
  Smartphone,
  CreditCard,
  Package,
  Sparkles, ChevronDown, ChevronRight, Calendar} from 'lucide-react';
import { 
  WorkOrder, 
  PartItem, 
  Technician, 
  ExpenseItem, 
  SupplierDebtRecord, 
  TechnicianPayoutRecord, 
  SystemSettings 
} from '../../types';
import { getActivePaymentMethods } from '../../data/seedData';
import { LITE_MODE } from '../../lib/lite';
import { Button , Input } from '../ui';
import { toast } from '../../lib/toast';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';

interface ShopFinancePlModuleProps {
  workOrders: WorkOrder[];
  parts: PartItem[];
  technicians: Technician[];
  suppliers?: never;

  expenses: ExpenseItem[];
  supplierDebts: SupplierDebtRecord[];
  technicianPayouts: TechnicianPayoutRecord[];
  systemSettings?: SystemSettings;
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  onRecordSupplierPayment: (debtId: string, paymentAmount: number, paymentMethod: string, note: string) => void;
  onUpdatePayoutStatus: (payoutId: string, status: 'Pending' | 'Approved' | 'Paid') => void;
  onSettleInventoryFund?: (ids: string[]) => void;
  dateFilter: DateFilterState;
  setDateFilter?: (filter: DateFilterState) => void;
}

export interface ShopFinancePlModuleHandle {
  openAddExpense: () => void;
}

export const ShopFinancePlModule = forwardRef<ShopFinancePlModuleHandle, ShopFinancePlModuleProps>(({
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
}, ref) => {
  const currency = systemSettings?.currencySymbol || 'MMK';
  // Shared short date formatter for tables — "Aug 10, 2026" (audit D-P2:
  // expenses/debts used raw YYYY-MM-DD while the fund table used the long form).
  const formatShortDate = (d: string) => {
    const t = new Date(d.includes('T') ? d : `${d}T00:00:00`).getTime();
    if (isNaN(t)) return '—';
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'expenses' | 'inventory-asset' | 'commissions' | 'accounts-payable' | 'inventory-fund' | 'parts-revenue'>('overview');
  // Parts Value owner filter — APP (shop) stock (Ko Hein 2026-08-24: KZH removed)
  const [partsOwner, setPartsOwner] = useState<'ALL' | 'APP'>('ALL');
  const ownerFilteredParts = useMemo(
    () => (partsOwner === 'ALL' ? parts : parts.filter((p) => (p.owner || 'APP') === partsOwner)),
    [parts, partsOwner]
  );
  const partsAssetTotal = useMemo(
    () => ownerFilteredParts.reduce((sum, p) => sum + (p.costPrice || 0) * (p.quantityInStock || 0), 0),
    [ownerFilteredParts]
  );
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  // Sub-tabs inside Parts Profit (Ko Hein 2026-08-11)
  const [partsSubTab, setPartsSubTab] = useState<'overview' | 'day' | 'category' | 'ticket'>('overview');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<SupplierDebtRecord | null>(null);
  // Double-click guard for "Mark All Settled" (audit D-P2)
  const [isSettlingFund, setIsSettlingFund] = useState(false);

  // Expose openAddExpense to the app navbar (Record Expense button moved there 2026-08-08)
  useImperativeHandle(ref, () => ({
    openAddExpense: () => setShowAddExpenseModal(true),
  }));

  // New Expense State — default date from LOCAL components, not toISOString()
  // (UTC would backdate entries made before 06:30 in UTC+6:30) (audit A-P2-15).
  const [newExpense, setNewExpense] = useState({
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
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

  // Filtered Work Orders by Date — the P&L window is when money actually
  // moved (audit A-P2-9): paid tickets bucket by their checkout/payment date
  // (completedAt anchors POS checkout incl. backdating), unpaid by createdAt.
  const filteredWorkOrders = useMemo(() => {
    return filterByDateRange(
      workOrders.map((wo) => ({
        ...wo,
        createdAt: wo.completedAt || wo.createdAt,
      })),
      dateFilter
    );
  }, [workOrders, dateFilter]);

  // Paid tickets inside the P&L window (audit A-P2-10): the revenue tab must
  // list PAID tickets only — unpaid/in-progress tickets are not income yet.
  const paidWorkOrders = useMemo(
    () => filteredWorkOrders.filter((wo) => Boolean(wo.isPaid) || (Number(wo.paidAmount) > 0)),
    [filteredWorkOrders]
  );

  // Technician payouts inside the same window (audit A-P2-15): "Period
  // Commissions" must not add up ALL-time payouts. Anchor by paidAt, fall
  // back to the period month (e.g. "2026-07" -> 2026-07-01).
  const dateFilteredPayouts = useMemo(() => {
    return filterByDateRange(
      technicianPayouts.map((p) => ({
        ...p,
        createdAt: p.paidAt || (p.period ? `${p.period}-01` : undefined),
      })),
      dateFilter
    );
  }, [technicianPayouts, dateFilter]);

  // Expenses must respect the same date window as revenue/COGS — otherwise
  // Net Profit for TODAY/THIS_WEEK/THIS_MONTH subtracts all-time expenses
  // (e.g. months of rent) from one day's profit (audit P1).
  const dateFilteredExpenses = useMemo(() => {
    return filterByDateRange(
      expenses.map((expense) => ({ ...expense, createdAt: expense.date })),
      dateFilter
    );
  }, [expenses, dateFilter]);

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

  // Owner split (Ko Hein 2026-08-11): stock is owned by APP (shop fund).
  // Ko Hein 2026-08-24: KZH removed — all stock is APP now.
  const ownerCostsOf = (wo: WorkOrder) => {
    let app = 0;
    (wo.lineItems || []).forEach((li) => {
      if (!li.partId || li.isLabor) return;
      const cost = (Number(li.unitCost) || 0) * (Number(li.quantity) || 1);
      app += cost;
    });
    return { app };
  };
  const pendingOwnerTotals = pendingFundTickets.reduce(
    (acc, wo) => {
      const { app } = ownerCostsOf(wo);
      acc.app += app;
      return acc;
    },
    { app: 0 }
  );

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
      other: 0, // Split Payment / Net 30 / anything unusual (audit P2)
    };

    filteredWorkOrders.forEach((wo) => {
      // Revenue is REAL money only (audit A-3): unpaid / in-progress tickets
      // are not income yet — they must not inflate revenue, COGS or units.
      const isPaid = Boolean(wo.isPaid) || (Number(wo.paidAmount) > 0);
      if (!isPaid) return;
      // Customer revenue per ticket = the amount actually collected. Per the
      // pricing model the customer pays ONLY the labor lines (after per-item
      // and invoice discounts) — parts are bundled into the labor charge and
      // are INTERNAL tracking, never extra customer revenue. So the simplest
      // correct revenue = totalAmount (audit A-3).
      const collected = Number(wo.paidAmount) || wo.totalAmount || 0;

      if (wo.lineItems && wo.lineItems.length > 0) {
        wo.lineItems.forEach((li) => {
          if (li.isLabor) {
            // Labor revenue = the COLLECTED amount below (post-discount); the
            // line loop only feeds the internal parts P&L.
          } else {
            // Internal parts P&L only — selling price vs cost for parts
            // actually sold on PAID tickets. Never added to customer revenue.
            partsSalesIncome += li.unitPrice * li.quantity;
            cogsTotal += li.unitCost * li.quantity;
            partsUnitsSold += li.quantity;
          }
        });
        // Customer revenue = amount collected (labor after discounts); parts
        // are bundled, so they never appear in totalRevenue (audit A-3).
        laborIncome += collected;
      } else {
        // Fallback for tickets without line items: whole collected amount is
        // customer revenue; no parts information to split (audit A-3 — no more
        // fabricated 45/55/25 ratios).
        laborIncome += collected;
      }

      // Payment method breakdown (already gated on isPaid above)
      const amount = wo.paidAmount || wo.totalAmount;
      const method = (wo.paymentMethod || '').toString();
      if (method === 'Cash') {
        paymentMethodsBreakdown.cashDrawer += amount;
      } else if (method === 'Credit Card' || method === 'Apple Pay') {
        paymentMethodsBreakdown.cardPos += amount;
      } else if (method.startsWith('Split Payment')) {
        // audit A-P3-6: allocate each split portion to its REAL bucket so the
        // drawer reconciliation matches — e.g. "Split Payment (Cash: 100,000 + KBZPay: 50,000)".
        const inner = method.replace(/^Split Payment\s*\(/, '').replace(/\)\s*$/, '');
        let allocated = 0;
        let hasPortions = false;
        for (const raw of inner.split('+')) {
          const m = raw.match(/([A-Za-z0-9][A-Za-z0-9 &]*?):\s*([\d,]+)/);
          if (!m) continue;
          hasPortions = true;
          const portionName = m[1].trim();
          const portionAmount = Number(m[2].replace(/,/g, '')) || 0;
          allocated += portionAmount;
          if (portionName === 'Cash') paymentMethodsBreakdown.cashDrawer += portionAmount;
          else if (portionName === 'Credit Card' || portionName === 'Apple Pay') paymentMethodsBreakdown.cardPos += portionAmount;
          else paymentMethodsBreakdown.mobileBanking += portionAmount;
        }
        if (!hasPortions || allocated < amount) paymentMethodsBreakdown.other += amount - allocated; // unparsed remainder
      } else if (method === 'Net 30') {
        paymentMethodsBreakdown.other += amount;
      } else {
        paymentMethodsBreakdown.mobileBanking += amount;
      }
    });

    // totalRevenue = CUSTOMER revenue only (labor collected). Parts selling
    // price is an internal metric (partsSalesIncome) and never inflates the
    // shop's revenue. Gross Profit = Amount Due − Parts Cost (POS formula).
    const totalRevenue = laborIncome;
    const grossProfit = totalRevenue - cogsTotal;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    // Parts-specific P&L: sold units, revenue, COGS, gross profit, margin %
    const partsProfit = partsSalesIncome - cogsTotal;
    const partsMarginPercent = partsSalesIncome > 0 ? Math.round((partsProfit / partsSalesIncome) * 100) : 0;

    // Total Expenses (date-filtered, matching the revenue/COGS window)
    const totalOpEx = dateFilteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
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

    // Technician Commissions — within the P&L date window (audit A-P2-15):
    // "Total Period Commissions" must not silently add up ALL-time payouts.
    const totalCommissionsEarned = dateFilteredPayouts.reduce((acc, curr) => acc + (curr.netPayout || 0), 0);
    const pendingCommissionsAmount = dateFilteredPayouts
      .filter((p) => p.status === 'Pending')
      .reduce((acc, curr) => acc + (curr.netPayout || 0), 0);

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
  }, [filteredWorkOrders, dateFilteredExpenses, parts, supplierDebts, dateFilteredPayouts]);

  // Parts profit by category: which parts make the money this period.
  const partsCategoryProfit = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number; cost: number }>();
    filteredWorkOrders.forEach((wo) => {
      // Only parts actually SOLD on PAID tickets count (audit A-3) — unpaid
      // tickets' parts are still in the customer's device / not yet income.
      const isPaid = Boolean(wo.isPaid) || (Number(wo.paidAmount) > 0);
      if (!isPaid) return;
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
      .filter((wo) => Boolean(wo.isPaid) || (Number(wo.paidAmount) > 0)) // paid only (audit A-3)
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

  // Parts sold grouped by DAY (sale date = inventoryConsumedAt → completedAt → updatedAt)
  const partsSalesByDay = useMemo(() => {
    const map = new Map<string, {
      date: string;
      label: string;
      tickets: Set<string>;
      units: number;
      revenue: number;
      cost: number;
      items: { name: string; qty: number; revenue: number; cost: number }[];
    }>();
    filteredWorkOrders.forEach((wo) => {
      // Parts grouped by day — PAID tickets only (audit A-3)
      const isPaid = Boolean(wo.isPaid) || (Number(wo.paidAmount) > 0);
      if (!isPaid) return;
      const ts = wo.inventoryConsumedAt || wo.completedAt || wo.updatedAt || wo.createdAt;
      if (!ts) return;
      const d = new Date(ts);
      if (isNaN(d.getTime())) return;
      // Local calendar day (toISOString() would bucket by UTC — off by one for
      // UTC+6:30 mornings).
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      (wo.lineItems || []).forEach((li) => {
        if (li.partId && !li.isLabor && li.quantity > 0) {
          const entry = map.get(key) || { date: key, label, tickets: new Set<string>(), units: 0, revenue: 0, cost: 0, items: [] };
          entry.tickets.add(wo.id);
          entry.units += li.quantity;
          entry.revenue += li.unitPrice * li.quantity;
          entry.cost += (li.unitCost || 0) * li.quantity;
          entry.items.push({
            name: li.partName || li.description || 'Part',
            qty: li.quantity,
            revenue: li.unitPrice * li.quantity,
            cost: (li.unitCost || 0) * li.quantity,
          });
          map.set(key, entry);
        }
      });
    });
    return [...map.entries()]
      .map(([, v]) => ({ ...v, tickets: v.tickets.size }))
      .sort((a, b) => b.date.localeCompare(a.date));
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
    const remaining = selectedDebtForPayment.totalAmount - (selectedDebtForPayment.paidAmount || 0);
    if (paymentAmountInput > remaining) {
      toast.error(
        `Payment of ${paymentAmountInput.toLocaleString()} ${currency} exceeds the remaining balance of ${remaining.toLocaleString()} ${currency}.`,
        'Overpayment Blocked'
      );
      return;
    }
    onRecordSupplierPayment(
      selectedDebtForPayment.id,
      paymentAmountInput,
      paymentMethodInput,
      paymentNoteInput
    );
    setSelectedDebtForPayment(null);
  };

  // Close modals with Escape (audit D-P2 a11y — mirrors PrintableInvoiceModal)
  useEffect(() => {
    if (!showAddExpenseModal && !selectedDebtForPayment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showAddExpenseModal) setShowAddExpenseModal(false);
      if (selectedDebtForPayment) setSelectedDebtForPayment(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAddExpenseModal, selectedDebtForPayment]);

  // Drawer & Stockroom derived figures (Ko Hein 2026-08-13 — polished cards)
  const pm = financialSummary.paymentMethodsBreakdown;
  const drawerTotal = pm.cashDrawer + pm.mobileBanking + pm.cardPos + pm.other;
  const shareOf = (v: number) => (drawerTotal > 0 ? Math.round((v / drawerTotal) * 100) : 0);
  const netStockroomEquity =
    financialSummary.totalInventoryAssetValue - financialSummary.totalSupplierDebt;
  const stockroomFinancedPct =
    financialSummary.totalInventoryAssetValue > 0
      ? Math.min(100, Math.round((financialSummary.totalSupplierDebt / financialSummary.totalInventoryAssetValue) * 100))
      : 0;

  return (
    <div className="finance-module space-y-3">
      {/* Title & Header Bar */}
      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-surface p-1.5 rounded-2xl border border-line flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full text-xs shadow-2xs">
        {[
          { id: 'overview', label: 'Financial Overview', icon: PieChart },
          { id: 'revenue', label: 'Revenue', icon: TrendingUp },
          { id: 'expenses', label: 'Expenses', icon: Receipt },
          ...(LITE_MODE ? [] : [{ id: 'inventory-asset', label: 'Parts Value', icon: Boxes }]),
          { id: 'commissions', label: 'Commissions', icon: Users },
          { id: 'accounts-payable', label: 'Debts', icon: Truck, badge: financialSummary.overdueDebtsCount > 0 ? `${financialSummary.overdueDebtsCount} Overdue` : undefined, badgeClass: 'bg-danger text-white' },
          ...(LITE_MODE ? [] : [{ id: 'inventory-fund', label: 'Inventory Fund', icon: Coins, badge: pendingFundCount > 0 ? `${pendingFundCount} To Settle` : undefined, badgeClass: 'bg-warning text-white' }]),
          ...(LITE_MODE ? [] : [{ id: 'parts-revenue', label: 'Parts Profit', icon: Boxes, badge: financialSummary.partsUnitsSold > 0 ? `${financialSummary.partsUnitsSold} Sold` : undefined, badgeClass: 'bg-brand text-white' }]),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-brand/50 ${
                isActive
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : (tab.badgeClass || 'bg-danger text-white')
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
          {/* Key P&L Summary Metric Cards — full-width responsive: 1 → 2 → 4 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Total Gross Revenue Card */}
            <div className="relative flex min-h-[168px] flex-col bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="pr-14">
                <span className="text-xs font-bold uppercase tracking-wider text-muted leading-4">Gross Revenue</span>
                <div className="text-2xl font-black text-ink font-mono leading-none mt-2">
                  {financialSummary.totalRevenue.toLocaleString()} {currency}
                </div>
              </div>
              <div className="mt-auto pt-2 border-t border-surface text-xs font-bold space-y-0.5">
                <div className="flex justify-between text-brand">
                  <span>Customer Paid (Labor):</span>
                  <span>{financialSummary.laborIncome.toLocaleString()} {currency}</span>
                </div>
                {!LITE_MODE && (
                <div className="flex justify-between text-muted">
                  <span>Parts Revenue (internal):</span>
                  <span>{financialSummary.partsSalesIncome.toLocaleString()} {currency}</span>
                </div>
                )}
              </div>
            </div>

            {/* Parts Cost & Gross Profit Card (hidden in lite — no inventory) */}
            {!LITE_MODE && (<div className="relative flex min-h-[168px] flex-col bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="absolute right-4 top-4 w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
              <div className="pr-14">
                <span className="text-xs font-bold uppercase tracking-wider text-muted leading-4">Gross Profit (Margin)</span>
                <div className="flex items-baseline justify-between gap-2 mt-2">
                  <span className="text-2xl font-black text-brand font-mono leading-none">
                    {financialSummary.grossProfit.toLocaleString()} {currency}
                  </span>
                  <span className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-full ${
                    financialSummary.grossMarginPercent >= 50
                      ? 'bg-success/10 text-success-deep'
                      : 'bg-warning/15 text-warning'
                  }`}>
                    {financialSummary.grossMarginPercent}% Gross
                  </span>
                </div>
              </div>
              <div className="mt-auto pt-2 border-t border-surface text-xs font-bold space-y-0.5">
                <div className="flex justify-between text-muted">
                  <span>Parts Cost:</span>
                  <span className="text-danger font-mono">-{financialSummary.cogsTotal.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between text-success-deep">
                  <span>Parts Profit:</span>
                  <span className="font-mono">+{financialSummary.partsProfit.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>)}

            {/* Expenses Card */}
            <div className="relative flex min-h-[168px] flex-col bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="pr-14">
                <span className="text-xs font-bold uppercase tracking-wider text-muted leading-4">Total Expenses</span>
                <div className="text-2xl font-black text-danger font-mono leading-none mt-2">
                  {financialSummary.totalOpEx.toLocaleString()} {currency}
                </div>
              </div>
              <div className="mt-auto pt-2 border-t border-surface text-xs font-bold text-muted flex justify-between gap-2">
                <span>Shop Rent, Utils, Tools, Mktg</span>
                <span className="text-ink shrink-0">{dateFilteredExpenses.length} Expense Records</span>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className="relative flex min-h-[168px] flex-col bg-white p-5 rounded-2xl border border-line shadow-2xs space-y-2">
              <div className="absolute right-4 top-4 w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="pr-14">
                <span className="text-xs font-bold uppercase tracking-wider text-muted leading-4">Net Profit</span>
                <div className="flex items-baseline justify-between gap-2 mt-2">
                  <span className="text-2xl font-black font-mono leading-none ${financialSummary.netProfit < 0 ? 'text-danger' : 'text-brand'}">
                    {financialSummary.netProfit.toLocaleString()} {currency}
                  </span>
                  <span className="shrink-0 text-xs font-black bg-surface text-ink px-2 py-0.5 rounded-full border border-line">
                    {financialSummary.netMarginPercent}% Net
                  </span>
                </div>
              </div>
              <div className="mt-auto pt-2 border-t border-surface text-xs text-muted flex justify-between font-bold gap-2">
                <span>Net Formula:</span>
                <span>Gross Profit - Expenses</span>
              </div>
            </div>
          </div>

          {/* Benchmark Target Banner (50%-70% Gross Margin Rule) */}
          <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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
            <div className="shrink-0 bg-white border border-success/30 px-3 py-1.5 rounded-xl font-mono font-black text-xs text-success-deep">
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
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-warning/20 text-warning flex items-center justify-center shrink-0">
                        <Banknote className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-warning block truncate">Cash In Drawer (Physical)</span>
                        <span className="text-[10px] text-warning/80 font-medium">Daily opening / closing register</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-warning text-sm block">
                        {pm.cashDrawer.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10px] font-bold text-warning/70">{shareOf(pm.cashDrawer)}% of intake</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-warning/15 overflow-hidden">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${shareOf(pm.cashDrawer)}%` }} />
                  </div>
                </div>

                {/* KBZPay / WavePay / Banking */}
                <div className="p-3 bg-brand-soft/80 border border-brand/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-brand/15 text-brand-deep flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-brand-deep block truncate">KBZPay / WavePay / Mobile Banking</span>
                        <span className="text-[10px] text-brand-deep/80 font-medium">Direct wallet transfers & bank QR payments</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-brand-deep text-sm block">
                        {pm.mobileBanking.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10px] font-bold text-brand-deep/70">{shareOf(pm.mobileBanking)}% of intake</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-brand/15 overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${shareOf(pm.mobileBanking)}%` }} />
                  </div>
                </div>

                {/* Card / POS */}
                <div className="p-3 bg-purple/10 border border-purple/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-purple/15 text-purple flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-purple block truncate">Credit Card / POS Terminal</span>
                        <span className="text-[10px] text-purple/80 font-medium">Bank merchant card settlement transfers</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-purple text-sm block">
                        {pm.cardPos.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10px] font-bold text-purple/70">{shareOf(pm.cardPos)}% of intake</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-purple/15 overflow-hidden">
                    <div className="h-full rounded-full bg-purple" style={{ width: `${shareOf(pm.cardPos)}%` }} />
                  </div>
                </div>

                {/* Split / Net-30 / Other — only shown when it actually has money (audit P2) */}
                {pm.other > 0 && (
                  <div className="p-3 bg-line/30 border border-line-strong rounded-xl">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-muted/15 text-muted flex items-center justify-center shrink-0">
                          <Coins className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="font-extrabold text-muted block truncate">Split / Net-30 & Other</span>
                          <span className="text-[10px] text-muted/80 font-medium">Mixed split payments & credit terms</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-muted text-sm block">
                          {pm.other.toLocaleString()} {currency}
                        </span>
                        <span className="text-[10px] font-bold text-muted/70">{shareOf(pm.other)}% of intake</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-line-strong/40 overflow-hidden">
                      <div className="h-full rounded-full bg-muted" style={{ width: `${shareOf(pm.other)}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Total Collected — stacked share bar + summary */}
              <div className="rounded-xl bg-surface border border-line p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-muted">Total Collected</span>
                  <span className="font-mono font-black text-ink text-base leading-tight block">
                    {drawerTotal.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="w-full max-w-[45%] shrink-0">
                  <div className="h-2.5 rounded-full bg-line overflow-hidden flex w-full">
                    <div className="h-full bg-warning" style={{ width: `${shareOf(pm.cashDrawer)}%` }} />
                    <div className="h-full bg-brand" style={{ width: `${shareOf(pm.mobileBanking)}%` }} />
                    <div className="h-full bg-purple" style={{ width: `${shareOf(pm.cardPos)}%` }} />
                    <div className="h-full bg-muted" style={{ width: `${shareOf(pm.other)}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] font-bold text-muted">
                    <span className="text-warning">Cash</span>
                    <span className="text-brand-deep">Wallet</span>
                    <span className="text-purple">Card</span>
                    {pm.other > 0 && <span className="text-muted">Other</span>}
                  </div>
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
                <div className="p-3.5 bg-surface border border-line rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-success/15 text-success-deep flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-muted">Tied-Up Capital Asset</span>
                        <span className="font-extrabold text-ink text-xs truncate block">Displays, Batteries & Chips in Stock</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-ink text-sm block">
                        {financialSummary.totalInventoryAssetValue.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10px] font-bold text-success-deep">
                        Retail: {financialSummary.totalRetailValuation.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Supplier Debt */}
                <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-danger/15 text-danger flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-danger">Accounts Payable</span>
                        <span className="font-extrabold text-danger text-xs truncate block">Unpaid balances to parts vendors</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-danger text-sm block">
                        {financialSummary.totalSupplierDebt.toLocaleString()} {currency}
                      </span>
                      {financialSummary.overdueDebtsCount > 0 && (
                        <span className="inline-block mt-0.5 text-[10px] font-black text-danger bg-danger/15 px-2 py-0.5 rounded-full">
                          ⚠️ {financialSummary.overdueDebtsCount} Overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tech Commission Pool */}
                <div className="p-3.5 bg-success/10 border border-success/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-success/20 text-success-deep flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-success-deep">Tech Commission Payouts</span>
                        <span className="font-extrabold text-success-deep text-xs truncate block">Verified QA pass bounties & rates</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-success-deep text-sm block">
                        {financialSummary.totalCommissionsEarned.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10px] font-bold text-success-deep">
                        Pending: {financialSummary.pendingCommissionsAmount.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Stockroom Position — owned capital vs supplier-financed */}
                <div className="p-3.5 bg-surface border border-line rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-muted">Net Stockroom Position</span>
                      <span className={`font-mono font-black text-sm block ${netStockroomEquity >= 0 ? 'text-success-deep' : 'text-danger'}`}>
                        {netStockroomEquity.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] font-bold text-muted">Supplier-financed</span>
                      <span className="font-mono font-black text-xs text-danger">{stockroomFinancedPct}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-line overflow-hidden flex">
                    <div className="h-full bg-success-deep" style={{ width: `${100 - stockroomFinancedPct}%` }} />
                    <div className="h-full bg-danger" style={{ width: `${stockroomFinancedPct}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] font-bold">
                    <span className="text-success-deep">Owned Capital</span>
                    <span className="text-danger">Supplier Debt</span>
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
              <h3 className="font-extrabold text-base text-ink">Revenue</h3>
              <p className="text-xs text-muted font-medium">Labor service charges vs direct parts sales with payment drawer breakdown</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Period Revenue:</span>
              <span className="block text-lg font-black text-brand">{financialSummary.totalRevenue.toLocaleString()} {currency}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Labor Income Card */}
            <div className="p-4 bg-brand-soft/60 border border-brand/30 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-brand-deep uppercase tracking-wider block">Labor & Service Income</span>
              <div className="text-2xl font-black text-brand font-mono">
                {financialSummary.laborIncome.toLocaleString()} {currency}
              </div>
            </div>

            {/* Parts Sales Income Card — internal parts P&L (audit A-3): parts
                are bundled into the labor charge; this is the internal parts
                revenue at selling price, NOT extra customer revenue. */}
            <div className="p-4 bg-success/10 border border-success/30 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-success-deep uppercase tracking-wider block">Parts Revenue (Internal)</span>
              <div className="text-2xl font-black text-success-deep font-mono">
                {financialSummary.partsSalesIncome.toLocaleString()} {currency}
              </div>
            </div>
          </div>

          {/* Work Orders Paid List */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">Completed Repair Income Records ({paidWorkOrders.length})</h4>
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
                  {/* audit A-P2-10: paid tickets only — unpaid/in-progress are
                      not income records; guard legacy rows missing subtotal. */}
                  {paidWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-surface">
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
                      <td className="p-3 font-mono">{(wo.subtotal ?? 0).toLocaleString()} {currency}</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{(wo.totalAmount ?? 0).toLocaleString()} {currency}</td>
                      <td className="p-3 text-right">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          wo.isPaid ? 'bg-success/15 text-success-deep' : 'bg-warning/15 text-warning'
                        }`}>
                          {wo.isPaid ? 'PAID' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            {paidWorkOrders.length === 0 && (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <DollarSign className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No completed repair income in this period</p>
                <p>Completed & paid tickets appear here once a checkout is registered.</p>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: EXPENSES & OPEX TRACKING */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Expenses</h3>
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
                  <th className="p-3 text-right">Amount ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dateFilteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-surface">
                    <td className="p-3 font-mono font-bold text-ink">{formatShortDate(exp.date)}</td>
                    <td className="p-3">
                      <span className="bg-purple/10 text-purple font-extrabold px-2.5 py-1 rounded-lg text-xs border border-purple/30">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-ink block">{exp.description}</span>
                      <span className="text-xs text-muted">Payee: {exp.payee}</span>
                    </td>
                    <td className="p-3 text-muted font-medium">{exp.paymentMethod}</td>
                    <td className="p-3 text-ink font-bold">{exp.createdByName}</td>
                    <td className="p-3 text-right font-mono font-black text-danger tabular-nums">
                      <span className="text-danger">−</span>{exp.amount.toLocaleString()} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dateFilteredExpenses.length === 0 && (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <Receipt className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No expense entries recorded</p>
                <p>Rent, electricity, tools and other shop overhead logs appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: PARTS INVENTORY ASSET VALUATION */}
      {!LITE_MODE && activeTab === 'inventory-asset' && (
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center gap-3 pb-3 border-b border-line">
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-ink">Parts Value</h3>
              <p className="text-xs text-muted font-medium">Tracking tied-up capital in unsold screen displays, batteries, chips & slow vs fast movers</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1">
                {(['ALL', 'APP'] as const).map((owner) => (
                  <Button
                    key={owner}
                    type="button"
                    onClick={() => setPartsOwner(owner)}
                    className={`rounded-lg px-2 py-1 min-h-9 text-xs font-bold transition-colors cursor-pointer ${
                      partsOwner === owner ? 'bg-brand text-white shadow-2xs' : 'bg-surface text-muted hover:bg-line hover:text-ink'
                    }`}
                  >
                    {owner}
                  </Button>
                ))}
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-muted">Asset Valuation:</span>
                <span className="block text-lg font-black text-ink">
                  {partsAssetTotal.toLocaleString()} {currency}
                </span>
              </div>
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
                {ownerFilteredParts.map((part) => {
                  const assetCostVal = part.costPrice * part.quantityInStock;
                  const retailVal = part.sellingPrice * part.quantityInStock;
                  const marginVal = retailVal - assetCostVal;

                  return (
                    <tr key={part.id} className="hover:bg-surface">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase bg-brand-soft text-brand border border-brand/30"
                          >
                            {part.owner || 'APP'}
                          </span>
                          <span className="min-w-0">
                            <span className="font-extrabold text-ink block">{part.name}</span>
                            <span className="font-mono text-xs text-brand">{part.sku}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="bg-surface text-ink font-bold px-2 py-0.5 rounded text-xs border border-line">
                          {part.qualityTier}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-sm text-ink">{part.quantityInStock}</td>
                      <td className="p-3 font-mono text-muted">{part.costPrice.toLocaleString()} {currency}</td>
                      <td className="p-3 font-mono font-bold text-ink">{assetCostVal.toLocaleString()} {currency}</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{retailVal.toLocaleString()} {currency}</td>
                      <td className="p-3 text-right font-mono font-black text-brand">+{marginVal.toLocaleString()} {currency}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ownerFilteredParts.length === 0 && (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <Boxes className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No inventory assets tracked yet</p>
                <p>Parts stock and their potential margin appear here once parts are registered.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: TECHNICIAN COMMISSIONS */}
      {activeTab === 'commissions' && (
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Commissions</h3>
              <p className="text-xs text-muted font-medium">Verified ticket payouts based on commission rates and zero-warranty QA passes</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Total Period Commissions:</span>
              <span className="block text-lg font-black text-success-deep">
                {financialSummary.totalCommissionsEarned.toLocaleString()} {currency}
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
                {/* audit A-P2-15: same date window as the "Total Period
                    Commissions" figure */}
                {dateFilteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-surface">
                    <td className="p-3 font-extrabold text-ink">{payout.technicianName}</td>
                    <td className="p-3 font-mono text-muted">{payout.period}</td>
                    <td className="p-3 font-mono font-bold">{payout.totalTicketsClosed} tickets</td>
                    <td className="p-3 font-mono font-bold text-brand">{payout.totalLaborRevenue.toLocaleString()} {currency}</td>
                    <td className="p-3 font-mono font-bold text-muted">{payout.commissionRatePercent}%</td>
                    <td className="p-3 font-mono text-success-deep">
                      {payout.commissionAmount.toLocaleString()} + {payout.bonusAmount.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 font-mono font-black text-success-deep text-sm">{payout.netPayout.toLocaleString()} {currency}</td>
                    <td className="p-3 text-right space-x-1.5">
                      {payout.status === 'Pending' && (
                        <Button
                          type="button"
                          onClick={() => onUpdatePayoutStatus(payout.id, 'Approved')}
                          className="px-2.5 py-1 min-h-9 bg-brand hover:bg-brand-deep text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Approve
                        </Button>
                      )}
                      {payout.status === 'Approved' && (
                        <Button
                          type="button"
                          onClick={() => onUpdatePayoutStatus(payout.id, 'Paid')}
                          className="px-2.5 py-1 min-h-9 bg-success hover:bg-success-deep text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Mark Paid
                        </Button>
                      )}
                      {payout.status === 'Paid' && (
                        <span className="bg-success/15 text-success-deep font-black px-2.5 py-1 rounded-lg text-xs">
                          ✓ PAID
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dateFilteredPayouts.length === 0 && (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <Users className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No technician payouts for this period</p>
                <p>Verified ticket commissions and QA bonus payouts appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: ACCOUNTS PAYABLE & SUPPLIER DEBTS */}
      {activeTab === 'accounts-payable' && (
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Debts</h3>
              <p className="text-xs text-muted font-medium">Managing outstanding unpaid invoices to parts suppliers to protect shop credit rating</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-muted">Total Outstanding Debts:</span>
              <span className="block text-lg font-black text-danger">
                {financialSummary.totalSupplierDebt.toLocaleString()} {currency}
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
                    <tr key={debt.id} className="hover:bg-surface">
                      <td className="p-3">
                        <span className="font-extrabold text-ink block">{debt.supplierName}</span>
                        <span className="font-mono text-xs text-brand">{debt.invoiceNumber}</span>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        <span className="block text-muted">Issued: {formatShortDate(debt.issueDate)}</span>
                        <span className={`font-bold ${isOverdue ? 'text-danger' : 'text-ink'}`}>
                          Due: {formatShortDate(debt.dueDate)}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-ink">{debt.totalAmount.toLocaleString()} {currency}</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{debt.paidAmount.toLocaleString()} {currency}</td>
                      <td className="p-3 font-mono font-black text-danger text-sm">{balance.toLocaleString()} {currency}</td>
                      <td className="p-3">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                          debt.status === 'Paid' ? 'bg-success/15 text-success-deep' :
                          debt.status === 'Partial' ? 'bg-brand/15 text-brand' :
                          isOverdue ? 'bg-danger text-white' : 'bg-warning/15 text-warning'
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
            {supplierDebts.length === 0 && (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <Truck className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No outstanding supplier debts</p>
                <p>Unpaid invoices to parts wholesalers appear here to protect your shop credit rating.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD EXPENSE */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add expense">
          <form onSubmit={handleSaveExpenseSubmit} className="bg-white border border-line rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl" tabIndex={-1}>
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-danger" />
                <span>Record New Shop Expense</span>
              </h3>
              <Button variant="ghost"
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                aria-label="Close add expense"
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
                <label className="block font-bold text-ink mb-1">Amount ({currency}) *</label>
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
                className="bg-danger hover:bg-danger-deep text-white"
              >
                Save Expense
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: RECORD SUPPLIER DEBT PAYMENT */}
      {selectedDebtForPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Record supplier debt payment">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl" tabIndex={-1}>
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-base font-extrabold text-ink">
                Record Supplier Debt Payment
              </h3>
              <Button variant="iconGhost" onClick={() => setSelectedDebtForPayment(null)} aria-label="Close debt payment" className="rounded-lg p-1 hover:bg-surface transition-colors">
                <X className="w-5 h-5 text-muted" />
              </Button>
            </div>

            <div className="p-3 bg-surface rounded-xl space-y-1">
              <span className="font-extrabold text-ink block">{selectedDebtForPayment.supplierName}</span>
              <span className="text-xs text-muted block font-mono">Invoice #{selectedDebtForPayment.invoiceNumber}</span>
              <div className="flex justify-between text-xs pt-1 border-t border-line">
                <span>Total Invoice:</span>
                <span className="font-mono font-bold">{selectedDebtForPayment.totalAmount.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-xs text-danger font-bold">
                <span>Remaining Balance:</span>
                <span className="font-mono">{(selectedDebtForPayment.totalAmount - selectedDebtForPayment.paidAmount).toLocaleString()} {currency}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-ink mb-1">Payment Amount ({currency})</label>
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
      {!LITE_MODE && activeTab === 'inventory-fund' && (
        <div className="bg-white border border-line rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Inventory Fund</h3>
              <p className="text-xs text-muted font-medium">
                Parts taken from stock are an internal debt to the shop's parts fund. Settle once the money is set aside or replacement stock is bought.
              </p>
            </div>
            <div className="flex items-center gap-3 text-right font-mono">
              <div>
                <span className="text-xs text-muted block">Parts Revenue</span>
                <span className="text-lg font-black text-success-deep">{partsRevenueTotal.toLocaleString()} {currency}</span>
              </div>
              <div className="hidden sm:block h-8 w-px bg-line" />
              <div>
                <span className="text-xs text-muted block">Pending Settlement</span>
                <span className="text-lg font-black text-warning">{pendingFundTotal.toLocaleString()} {currency}</span>
                {(pendingOwnerTotals.app > 0) && (
                  <span className="text-[10px] font-bold text-muted block mt-0.5">
                    APP {pendingOwnerTotals.app.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="hidden sm:block h-8 w-px bg-line" />
              <div>
                <span className="text-xs text-muted block">Settled This Period</span>
                <span className="text-lg font-black text-success">{settledFundTotal.toLocaleString()} {currency}</span>
              </div>
            </div>
          </div>

          {pendingFundTickets.length > 0 && (
            <Button variant="ghost"
              type="button"
              onClick={async () => {
                if (isSettlingFund) return;
                const ok = await confirmDialog({
                  title: 'Mark All Pending Tickets Settled',
                  message: `Settle the inventory fund for ${pendingFundTickets.length} ticket(s) totaling ${pendingFundTotal.toLocaleString()} ${currency}? This records the parts fund as repaid.`,
                  confirmLabel: `Settle ${pendingFundTickets.length} Tickets`,
                  danger: true,
                });
                if (!ok) return;
                setIsSettlingFund(true);
                onSettleInventoryFund?.(pendingFundTickets.map((wo) => wo.id));
                setTimeout(() => setIsSettlingFund(false), 1200);
              }}
              disabled={isSettlingFund}
              className="w-full p-3 bg-white border-2 border-warning/40 rounded-xl text-xs font-extrabold text-warning hover:bg-warning/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark All {pendingFundTickets.length} Pending Tickets Settled ({pendingFundTotal.toLocaleString()} {currency})
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
                  <th className="p-3">Owned By</th>
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
                  const { app } = ownerCostsOf(wo);
                  return (
                    <tr key={wo.id} className="hover:bg-surface">
                      <td className="p-3 font-mono font-bold text-brand">{wo.orderNumber}</td>
                      <td className="p-3 font-extrabold text-ink">{wo.deviceModel}</td>
                      <td className="p-3 font-mono font-bold text-success-deep">{partsRev.toLocaleString()} {currency}</td>
                      <td className="p-3 font-mono font-black text-ink">{partsCost.toLocaleString()} {currency}</td>
                      <td className="p-3 font-mono font-black text-brand">+{(partsRev - partsCost).toLocaleString()} {currency}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black">
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">APP</span>
                          <span className="font-mono">{app.toLocaleString()} {currency}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted">
                        {wo.inventoryConsumedAt ? new Date(wo.inventoryConsumedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                          pending ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success-deep'
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
                          <span className="text-xs text-success-deep font-bold">
                            ✓ {wo.inventorySettledAt ? new Date(wo.inventorySettledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
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
      {!LITE_MODE && activeTab === 'parts-revenue' && (
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
              <span className="block text-lg font-black text-success-deep">{financialSummary.partsSalesIncome.toLocaleString()} {currency}</span>
            </div>
          </div>

          {/* Sub-tabs (Ko Hein 2026-08-11) */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              { id: 'overview' as const, label: 'Overview' },
              { id: 'day' as const, label: 'Sales by Day' },
              { id: 'category' as const, label: 'Profit by Category' },
              { id: 'ticket' as const, label: 'Sold by Ticket' },
            ].map((st) => (
              <Button
                key={st.id}
                type="button"
                onClick={() => setPartsSubTab(st.id)}
                variant="ghost"
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                  partsSubTab === st.id ? 'bg-brand text-white shadow-2xs' : 'bg-surface text-muted hover:bg-surface/80 hover:text-ink'
                }`}
              >
                {st.label}
              </Button>
            ))}
          </div>

          {/* OVERVIEW — professional KPI + net profit panel (Ko Hein 2026-08-11) */}
          {partsSubTab === 'overview' && (
          <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-line rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Units Sold</span>
                <span className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center"><Boxes className="w-6 h-6" /></span>
              </div>
              <p className="text-2xl font-black text-ink mt-2 tabular-nums">{financialSummary.partsUnitsSold}</p>
              <span className="text-xs font-bold text-muted">parts this period</span>
            </div>
            <div className="p-4 bg-white border border-line rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Parts Revenue</span>
                <span className="w-12 h-12 rounded-2xl bg-success/10 text-success-deep flex items-center justify-center"><TrendingUp className="w-6 h-6" /></span>
              </div>
              <p className="text-2xl font-black text-success-deep mt-2 tabular-nums">{financialSummary.partsSalesIncome.toLocaleString()} {currency}</p>
              <span className="text-xs font-bold text-muted">selling price</span>
            </div>
            <div className="p-4 bg-white border border-line rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Parts Cost</span>
                <span className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center"><Coins className="w-6 h-6" /></span>
              </div>
              <p className="text-2xl font-black text-danger mt-2 tabular-nums">-{financialSummary.cogsTotal.toLocaleString()} {currency}</p>
              <span className="text-xs font-bold text-muted">unit cost</span>
            </div>
            <div className="p-4 bg-gradient-to-br from-success/10 to-surface border border-success/30 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-success-deep">Gross Profit</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  financialSummary.partsMarginPercent >= 40 ? 'bg-success/15 text-success-deep' : 'bg-warning/15 text-warning'
                }`}>
                  {financialSummary.partsMarginPercent}% margin
                </span>
              </div>
              <p className="text-2xl font-black text-success-deep mt-2 tabular-nums">+{financialSummary.partsProfit.toLocaleString()} {currency}</p>
              <span className="text-xs font-bold text-muted">revenue − cost</span>
            </div>
          </div>

          {/* Parts P&L panel — parts only, no tech commission (Ko Hein 2026-08-11) */}
          {(() => {
            const profit = financialSummary.partsProfit;
            const margin = financialSummary.partsMarginPercent;
            return (
              <div className="rounded-2xl bg-ink text-white p-5 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">Parts Profit Summary</span>
                  <span className="text-[11px] font-bold text-white/60">Parts Revenue − Parts Cost</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
                  <div className="grid grid-cols-2 flex-1 gap-3 text-center">
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-white/60">Parts Revenue</span>
                      <span className="block text-sm font-black tabular-nums mt-0.5">{financialSummary.partsSalesIncome.toLocaleString()} {currency}</span>
                    </div>
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-white/60">Parts Cost</span>
                      <span className="block text-sm font-black tabular-nums text-danger mt-0.5">-{financialSummary.cogsTotal.toLocaleString()} {currency}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center px-4 shrink-0">
                    <span className="text-2xl font-black text-white/50">=</span>
                  </div>
                  <div className="rounded-xl bg-success text-white px-5 py-3 text-center shrink-0 shadow-md">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-white/70">Parts Profit</span>
                    <span className="block text-xl font-black tabular-nums mt-0.5">+{profit.toLocaleString()} {currency}</span>
                    <span className="block text-[10px] font-black text-white/70 mt-0.5">{margin}% margin</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-white/60">
                  <span>{financialSummary.partsUnitsSold} units · this period</span>
                  <span>· {fundTickets.length} parts ticket{fundTickets.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            );
          })()}

          </>
          )}

          {/* SALES BY DAY — which day, how many units, what was sold, how much profit */}
          {partsSubTab === 'day' && (
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">Sales by Day ({partsSalesByDay.length} days)</h4>
            {partsSalesByDay.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong">
                <Calendar className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No part sales in this period</p>
                <p>Days with sold parts will appear here — tap a day to see exactly what was sold.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-muted uppercase font-mono text-xs">
                    <tr>
                      <th className="p-3"></th>
                      <th className="p-3">Day</th>
                      <th className="p-3 text-right">Tickets</th>
                      <th className="p-3 text-right">Units</th>
                      <th className="p-3 text-right">Revenue</th>
                      <th className="p-3 text-right">Parts Cost</th>
                      <th className="p-3 text-right">Profit</th>
                      <th className="p-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {partsSalesByDay.map((day) => {
                      const profit = day.revenue - day.cost;
                      const margin = day.revenue > 0 ? Math.round((profit / day.revenue) * 100) : 0;
                      const open = expandedDay === day.date;
                      return (
                        <React.Fragment key={day.date}>
                          <tr
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDay(open ? null : day.date); }
                            }}
                            aria-expanded={open}
                            className={`cursor-pointer hover:bg-surface ${open ? 'bg-brand-soft/50' : ''}`}
                            onClick={() => setExpandedDay(open ? null : day.date)}
                          >
                            <td className="p-3 text-muted">
                              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </td>
                            <td className="p-3 font-extrabold text-ink">{day.label}</td>
                            <td className="p-3 text-right font-mono font-bold">{day.tickets}</td>
                            <td className="p-3 text-right font-mono font-bold">{day.units}</td>
                            <td className="p-3 text-right font-mono text-success-deep">{day.revenue.toLocaleString()} {currency}</td>
                            <td className="p-3 text-right font-mono text-danger">{day.cost.toLocaleString()} {currency}</td>
                            <td className="p-3 text-right font-mono font-black text-success-deep">+{profit.toLocaleString()} {currency}</td>
                            <td className="p-3 text-right">
                              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black ${
                                margin >= 40 ? 'bg-success/15 text-success-deep' : margin >= 20 ? 'bg-brand/15 text-brand' : margin >= 0 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
                              }`}>{margin}%</span>
                            </td>
                          </tr>
                          {open && (
                            <tr className="bg-surface/60">
                              <td className="p-0" colSpan={8}>
                                <div className="px-4 py-2.5 space-y-1.5">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Items sold on {day.label}</p>
                                  {day.items.length === 0 ? (
                                    <p className="text-xs text-muted">No part items recorded.</p>
                                  ) : (
                                    day.items.map((it, idx) => {
                                      const itProfit = it.revenue - it.cost;
                                      return (
                                        <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                                          <span className="font-bold text-ink truncate min-w-0">
                                            {it.name} <span className="text-muted font-mono">× {it.qty}</span>
                                          </span>
                                          <span className="flex items-center gap-3 shrink-0 font-mono">
                                            <span className="text-muted">{it.revenue.toLocaleString()} {currency}</span>
                                            <span className="font-black text-success-deep w-24 text-right">+{itProfit.toLocaleString()} {currency}</span>
                                          </span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {/* PROFIT BY CATEGORY */}
          {partsSubTab === 'category' && (
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
                      <th className="p-3 text-right">Units</th>
                      <th className="p-3 text-right">Revenue</th>
                      <th className="p-3 text-right">Parts Cost</th>
                      <th className="p-3 text-right">Profit</th>
                      <th className="p-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {partsCategoryProfit.slice(0, 10).map((row) => (
                      <tr key={row.category} className="hover:bg-surface">
                        <td className="p-3 font-extrabold text-ink">{row.category}</td>
                        <td className="p-3 text-right font-mono font-bold">{row.units}</td>
                        <td className="p-3 text-right font-mono text-success-deep">{row.revenue.toLocaleString()} {currency}</td>
                        <td className="p-3 text-right font-mono text-danger">{row.cost.toLocaleString()} {currency}</td>
                        <td className="p-3 text-right font-mono font-black text-success-deep">+{row.profit.toLocaleString()} {currency}</td>
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
          )}

          {/* PARTS SOLD BY TICKET */}
          {partsSubTab === 'ticket' && (
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
                      <th className="p-3 text-right">Parts Units</th>
                      <th className="p-3 text-right">Parts Revenue</th>
                      <th className="p-3 text-right">Parts Cost</th>
                      <th className="p-3 text-right">Parts Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {partsTickets.map(({ wo, units, revenue, cost }) => (
                      <tr key={wo.id} className="hover:bg-surface">
                        <td className="p-3 font-mono font-bold text-brand">{wo.orderNumber}</td>
                        <td className="p-3">
                          <span className="font-bold text-ink block">{wo.deviceModel}</span>
                          <span className="text-xs text-muted">{wo.customerName}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold">{units}</td>
                        <td className="p-3 text-right font-mono text-success-deep">{revenue.toLocaleString()} {currency}</td>
                        <td className="p-3 text-right font-mono text-danger">{cost.toLocaleString()} {currency}</td>
                        <td className="p-3 text-right font-mono font-black text-success-deep">+{(revenue - cost).toLocaleString()} {currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
});
