import React, { useState, useMemo } from 'react';
import {
  Calculator,
  X,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Tag,
  DollarSign,
  Percent,
  Clock,
  Printer,
  RotateCcw,
  Search,
  Folder,
  Wrench,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Mail,
  Share2,
} from 'lucide-react';
import { ModelRepairPrice, REPAIR_CATEGORIES, FolderConfig } from '../../types/priceCatalog';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';

interface QuickPriceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ModelRepairPrice[];
  folders: FolderConfig[];
  currencySymbol?: string;
  initialDevice?: string;
  onSelectModelForCatalog?: (modelName: string) => void;
  onCreateTicketWithQuote?: (model: string, services: Array<{ name: string; price: number; warranty: string }>) => void;
}

export const QuickPriceCalculatorModal: React.FC<QuickPriceCalculatorModalProps> = ({
  isOpen,
  onClose,
  catalog,
  folders,
  currencySymbol = '$',
  initialDevice = 'iPhone 15 Pro',
  onSelectModelForCatalog,
  onCreateTicketWithQuote,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string>(initialDevice);
  const [isDeviceChooserOpen, setIsDeviceChooserOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Map<string, { price: number; warranty: string; label: string }>>(new Map());
  
  // Discount & Tax States
  const [globalDiscountPct, setGlobalDiscountPct] = useState<number>(0);
  const [flatDiscountAmount, setFlatDiscountAmount] = useState<number>(0);
  const [enableSalesTax, setEnableSalesTax] = useState<boolean>(false);
  const [salesTaxRate, setSalesTaxRate] = useState<number>(8.0);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Find price record for selected model
  const currentModelData = catalog.find((c) => c.model === selectedDevice) || catalog[0];

  // Helper formatting
  const formatPrice = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get available services for this model
  const availableServices = REPAIR_CATEGORIES.map((cat) => {
    const rawPrice = currentModelData?.prices[cat.key];
    const warranty = currentModelData?.warranties[cat.key] || '3 Month Warranty';
    const isPriced = rawPrice !== null && rawPrice !== undefined && rawPrice > 0;
    return {
      key: cat.key,
      label: cat.label,
      group: cat.group,
      price: isPriced ? rawPrice : 0,
      warranty: warranty,
      isAvailable: isPriced,
    };
  });

  // Filtered Services
  const filteredServices = availableServices.filter((s) => {
    if (!s.isAvailable) return false;
    if (categoryFilter !== 'All' && s.group !== categoryFilter) return false;
    if (searchQuery && !s.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Toggle service selection
  const handleToggleService = (key: string, label: string, price: number, warranty: string) => {
    setSelectedServices((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, { price, warranty, label });
      }
      return next;
    });
  };

  // Calculations
  const selectedList = Array.from(selectedServices.entries()).map(([key, data]) => ({
    key,
    ...data,
  }));

  const rawSubtotal = selectedList.reduce((sum, item) => sum + item.price, 0);

  // Discount Calculation
  let totalDiscount = 0;
  if (globalDiscountPct > 0) {
    totalDiscount += rawSubtotal * (globalDiscountPct / 100);
  }
  if (flatDiscountAmount > 0) {
    totalDiscount += flatDiscountAmount;
  }
  if (totalDiscount > rawSubtotal) {
    totalDiscount = rawSubtotal;
  }

  const subtotalAfterDiscount = rawSubtotal - totalDiscount;
  const taxAmount = enableSalesTax ? subtotalAfterDiscount * (salesTaxRate / 100) : 0;
  const grandTotal = subtotalAfterDiscount + taxAmount;
  const requiredDeposit = grandTotal * 0.5;

  // Estimated Turnaround Time
  const estimatedTime = useMemo(() => {
    const count = selectedList.length;
    if (count === 0) return '0 min';
    if (count === 1) return '30 - 45 min';
    if (count === 2) return '45 - 60 min';
    return '1 - 2 Hours';
  }, [selectedList.length]);

  // Generate Customer Text Quote formatted for WhatsApp / Email
  const generateTextQuote = () => {
    let text = `🛠️ *REPAIR ESTIMATE & QUOTE*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📱 *Device:* ${selectedDevice}\n`;
    text += `📅 *Date:* ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n`;
    text += `⏱️ *Est. Turnaround:* ~${estimatedTime}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📋 *SELECTED SERVICES & QUANTITIES:*\n`;
    if (selectedList.length === 0) {
      text += `• (No services selected)\n`;
    } else {
      selectedList.forEach((item, idx) => {
        text += `${idx + 1}. *1x ${item.label}*\n`;
        text += `   • Price: ${formatPrice(item.price)}\n`;
        text += `   • Warranty: ${item.warranty}\n`;
      });
      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 *FINANCIAL SUMMARY:*\n`;
      text += `• Subtotal (${selectedList.length} service${selectedList.length > 1 ? 's' : ''}): ${formatPrice(rawSubtotal)}\n`;
      if (totalDiscount > 0) {
        text += `• Discount: -${formatPrice(totalDiscount)}\n`;
      }
      if (enableSalesTax && taxAmount > 0) {
        text += `• Sales Tax (${salesTaxRate}%): ${formatPrice(taxAmount)}\n`;
      }
      text += `\n🏷️ *GRAND TOTAL: ${formatPrice(grandTotal)}*\n`;
      text += `💳 *Required 50% Deposit:* ${formatPrice(requiredDeposit)}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `*Estimate valid for 7 days. Includes full parts & labor warranty.\n`;
      text += `Thank you for choosing i35 Tech!`;
    }
    return text;
  };

  const handleCopyQuote = () => {
    const text = generateTextQuote();
    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  const handleReset = () => {
    setSelectedServices(new Map());
    setGlobalDiscountPct(0);
    setFlatDiscountAmount(0);
    setSearchQuery('');
  };

  const handlePrintQuote = () => {
    try {
      const printWindow = window.open('', '_blank', 'width=600,height=700');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Repair Estimate Slip - ${selectedDevice}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; padding: 24px; color: #1d1d1f; line-height: 1.5; }
                .header { text-align: center; border-bottom: 2px solid #0071e3; padding-bottom: 12px; margin-bottom: 16px; }
                .title { font-size: 18px; font-weight: 800; color: #0071e3; }
                .subtitle { font-size: 12px; color: #86868b; }
                .row { display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0; }
                .total-box { border-top: 2px solid #e5e5ea; border-bottom: 2px solid #e5e5ea; padding: 12px 0; margin-top: 16px; font-weight: bold; }
                .grand-total { font-size: 18px; color: #0071e3; font-weight: 900; }
                .footer { margin-top: 24px; font-size: 11px; color: #86868b; text-align: center; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">i35 TECH REPAIR ESTIMATE</div>
                <div class="subtitle">Fast Hardware Diagnostics & Component Replacement</div>
              </div>
              <div style="font-weight: 800; font-size: 14px; margin-bottom: 12px;">
                Device: ${selectedDevice}
              </div>
              <div style="font-size: 12px; font-weight: 700; color: #86868b; margin-bottom: 8px;">SELECTED SERVICES:</div>
              ${selectedList
                .map(
                  (item) => `
                <div class="row">
                  <span>• ${item.label} (${item.warranty})</span>
                  <span style="font-family: monospace; font-weight: bold;">${formatPrice(item.price)}</span>
                </div>
              `
                )
                .join('')}
              
              <div class="total-box">
                <div class="row">
                  <span>Subtotal:</span>
                  <span>${formatPrice(rawSubtotal)}</span>
                </div>
                ${
                  totalDiscount > 0
                    ? `<div class="row" style="color: #e11d48;">
                  <span>Discount Applied:</span>
                  <span>-${formatPrice(totalDiscount)}</span>
                </div>`
                    : ''
                }
                ${
                  enableSalesTax
                    ? `<div class="row">
                  <span>Tax (${salesTaxRate}%):</span>
                  <span>${formatPrice(taxAmount)}</span>
                </div>`
                    : ''
                }
                <div class="row" style="margin-top: 8px; font-size: 16px;">
                  <span>Total Estimate:</span>
                  <span class="grand-total">${formatPrice(grandTotal)}</span>
                </div>
              </div>

              <div style="margin-top: 12px; font-size: 12px;">
                <strong>Estimated Turnaround:</strong> ~${estimatedTime}<br/>
                <strong>Deposit Required (50%):</strong> ${formatPrice(requiredDeposit)}
              </div>

              <div class="footer">
                Thank you for choosing i35 Tech. All repair estimates include parts and labor.
              </div>
              <script>
                setTimeout(() => { window.print(); }, 250);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (err) {
      window.print();
    }
  };

  const groups = ['All', 'Display', 'Battery', 'Housing', 'Charging', 'Logic Board', 'Audio', 'Network', 'Sensors & Keys'];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
        <div className="bg-white border border-[#E5E5EA] rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Modal Top Header */}
          <div className="px-5 py-4 border-b border-[#E5E5EA] bg-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center font-black shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-extrabold text-base sm:text-lg text-[#1D1D1F]">
                    Quick Price Calculator & Estimate Generator
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    On-the-Spot Customer Quote
                  </span>
                </div>
                <p className="text-xs text-[#86868B]">
                  Instantly toggle repair services, apply bundle discounts, and calculate customer total estimate
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E5E5EA] hover:bg-[#D1D1D6] text-[#1D1D1F] transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Model Ribbon & Category Tabs */}
          <div className="p-4 border-b border-[#E5E5EA] bg-[#F5F5F7]/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Selected Device Badge & Model Switcher */}
              <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-2xl border border-[#E5E5EA] shadow-2xs min-w-0">
                <Smartphone className="w-4 h-4 text-[#0071E3] shrink-0" />
                <span className="text-xs font-bold text-[#86868B] shrink-0">Model:</span>
                <span className="text-xs sm:text-sm font-black text-[#1D1D1F] truncate min-w-0" title={selectedDevice}>
                  {selectedDevice}
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeviceChooserOpen(true)}
                  className="p-1.5 rounded-xl bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] transition-all cursor-pointer shrink-0 ml-1.5"
                  title="Change device model"
                >
                  <Folder className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                <input
                  type="text"
                  placeholder="Quick filter service name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E5E5EA] rounded-xl text-xs font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#86868B]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {groups.map((grp) => {
                const isActive = categoryFilter === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setCategoryFilter(grp)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#0071E3] text-white shadow-2xs'
                        : 'bg-white text-[#86868B] border border-[#E5E5EA] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {grp}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Main Content: Split Grid (8 Cols Services / 4 Cols Live Total Sidebar) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Services Toggle Grid (8 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#86868B] flex items-center space-x-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Available Repair Services for {selectedDevice}</span>
                </h3>
                <span className="text-[11px] font-bold text-[#86868B]">
                  {filteredServices.length} priced services
                </span>
              </div>

              {filteredServices.length === 0 ? (
                <div className="py-12 text-center bg-[#F5F5F7] rounded-2xl border border-[#E5E5EA] space-y-2">
                  <Wrench className="w-8 h-8 text-[#86868B] mx-auto opacity-40" />
                  <p className="text-xs font-bold text-[#1D1D1F]">No priced services match filter</p>
                  <p className="text-[11px] text-[#86868B]">
                    Try clearing search or picking another device model.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredServices.map((service) => {
                    const isSelected = selectedServices.has(service.key);

                    return (
                      <button
                        key={service.key}
                        type="button"
                        onClick={() =>
                          handleToggleService(service.key, service.label, service.price, service.warranty)
                        }
                        className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer min-h-[96px] select-none ${
                          isSelected
                            ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-md ring-2 ring-[#0071E3]/20'
                            : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:border-[#0071E3] hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 mb-1 flex-wrap gap-y-1">
                              <span
                                className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-[#F5F5F7] text-[#86868B]'
                                }`}
                              >
                                {service.group}
                              </span>
                            </div>
                            <h4 className="font-black text-xs sm:text-sm leading-snug truncate block">
                              {service.label}
                            </h4>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-white text-[#0071E3]' : 'border-2 border-[#E5E5EA] bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="flex items-end justify-between mt-2 pt-2 border-t border-current/10">
                          <div className="flex items-center space-x-1">
                            <ShieldCheck className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                            <span
                              className={`text-[9px] font-semibold ${
                                isSelected ? 'text-white/90' : 'text-[#86868B]'
                              }`}
                            >
                              {service.warranty}
                            </span>
                          </div>

                          <span className={`font-black font-mono text-sm sm:text-base ${isSelected ? 'text-white' : 'text-[#0071E3]'}`}>
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Calculation Sidebar (5 Cols) */}
            <div className="lg:col-span-5 bg-[#F5F5F7] p-4 sm:p-5 rounded-2xl border border-[#E5E5EA] space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Live Estimate Header */}
                <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-sm text-[#1D1D1F]">Live Total Estimate</h3>
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#0071E3] text-white">
                    {selectedList.length} Services Selected
                  </span>
                </div>

                {/* Selected Services Breakdown */}
                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                  {selectedList.length === 0 ? (
                    <div className="py-6 text-center text-[#86868B] space-y-1">
                      <Calculator className="w-7 h-7 mx-auto opacity-30 text-[#0071E3]" />
                      <p className="text-xs font-bold">No services selected yet</p>
                      <p className="text-[11px]">Click service cards on the left to add to estimate</p>
                    </div>
                  ) : (
                    selectedList.map((item) => (
                      <div
                        key={item.key}
                        className="bg-white px-2.5 py-1.5 rounded-xl border border-[#E5E5EA] flex items-center justify-between text-xs shadow-2xs group hover:border-[#0071E3]/40 transition-all"
                      >
                        <div className="min-w-0 pr-2 flex items-center space-x-1.5">
                          <span className="font-extrabold text-[11px] text-[#1D1D1F] truncate leading-tight min-w-0">
                            {item.label}
                          </span>
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-0.5 shrink-0">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0 inline" />
                            <span>{item.warranty}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-black font-mono text-[11px] text-[#0071E3]">
                            {formatPrice(item.price)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleService(item.key, item.label, item.price, item.warranty)
                            }
                            className="text-[#86868B] hover:text-[#FF3B30] hover:bg-rose-50 p-0.5 rounded-md transition-all cursor-pointer"
                            title="Remove service"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Bundle Discount Buttons */}
                <div className="space-y-1.5 pt-2 border-t border-[#E5E5EA]">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B] block">
                    Quick Bundle Discounts
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { label: '0% Off', pct: 0, flat: 0 },
                      { label: '5% Off', pct: 5, flat: 0 },
                      { label: '10% Off', pct: 10, flat: 0 },
                      { label: '15% Off', pct: 15, flat: 0 },
                      { label: '$10 Off', pct: 0, flat: 10 },
                      { label: '$20 Off', pct: 0, flat: 20 },
                    ].map((disc, idx) => {
                      const isSelected =
                        disc.pct > 0
                          ? globalDiscountPct === disc.pct
                          : disc.flat > 0
                          ? flatDiscountAmount === disc.flat
                          : globalDiscountPct === 0 && flatDiscountAmount === 0;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setGlobalDiscountPct(disc.pct);
                            setFlatDiscountAmount(disc.flat);
                          }}
                          className={`py-1.5 px-2 rounded-xl font-bold text-[11px] transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                              : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:border-[#0071E3]'
                          }`}
                        >
                          {disc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tax & Deposit Toggles */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E5E5EA] text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableSalesTax}
                      onChange={(e) => setEnableSalesTax(e.target.checked)}
                      className="rounded border-[#E5E5EA] text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span className="font-bold text-[#1D1D1F]">Include Sales Tax ({salesTaxRate}%)</span>
                  </label>

                  <div className="flex items-center space-x-1 text-[#86868B]">
                    <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span className="font-extrabold text-[11px]">Est. ~{estimatedTime}</span>
                  </div>
                </div>

                {/* Final Price Box */}
                <div className="bg-white p-4 rounded-2xl border-2 border-[#0071E3] space-y-2 shadow-xs">
                  <div className="flex justify-between text-xs text-[#86868B]">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-[#1D1D1F]">{formatPrice(rawSubtotal)}</span>
                  </div>

                  <div className="flex justify-between text-xs text-[#86868B] items-center min-h-[22px]">
                    <span>Bundle Discount:</span>
                    {totalDiscount > 0 ? (
                      <span className="font-mono font-bold text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-md border border-[#34C759]/20">
                        -{formatPrice(totalDiscount)}
                      </span>
                    ) : (
                      <span className="font-mono text-[#86868B] text-[11px]">0 MMK</span>
                    )}
                  </div>

                  {enableSalesTax && (
                    <div className="flex justify-between text-xs text-[#86868B]">
                      <span>Sales Tax ({salesTaxRate}%):</span>
                      <span className="font-mono">{formatPrice(taxAmount)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E5E5EA] flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-[#1D1D1F] block">
                        Grand Total
                      </span>
                      <span className="text-[10px] text-[#86868B] block">
                        Required 50% Deposit: {formatPrice(requiredDeposit)}
                      </span>
                    </div>
                    <span className="text-2xl font-black font-mono text-[#0071E3]">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={handleCopyQuote}
                  disabled={selectedList.length === 0}
                  className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0071E3]/90 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 shadow-2xs cursor-pointer active:scale-95"
                >
                  {copiedQuote ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Copied Estimate Text to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Estimate Text (WhatsApp & Email)</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {onCreateTicketWithQuote && (
                    <button
                      type="button"
                      disabled={selectedList.length === 0}
                      onClick={() => {
                        onCreateTicketWithQuote(
                          selectedDevice,
                          selectedList.map((s) => ({ name: s.label, price: s.price, warranty: s.warranty }))
                        );
                        onClose();
                      }}
                      className="col-span-2 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>Push to Ticket Intake</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePrintQuote}
                    disabled={selectedList.length === 0}
                    className={`${
                      onCreateTicketWithQuote ? 'col-span-1' : 'col-span-2'
                    } py-2 bg-white hover:bg-[#E5E5EA] disabled:opacity-50 text-[#1D1D1F] border border-[#E5E5EA] font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs`}
                  >
                    <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Print Slip</span>
                  </button>

                  {!onCreateTicketWithQuote && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="py-2 bg-white hover:bg-rose-50 text-rose-600 border border-[#E5E5EA] hover:border-rose-200 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-3 bg-[#F5F5F7] border-t border-[#E5E5EA] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#86868B]">
              Calculated for <strong className="text-[#1D1D1F]">{selectedDevice}</strong>
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[#FF3B30] font-extrabold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Calculator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Device Model Switcher */}
      <DeviceModelChooserModal
        isOpen={isDeviceChooserOpen}
        onClose={() => setIsDeviceChooserOpen(false)}
        selectedDevice={selectedDevice}
        onSelectDevice={(model) => {
          setSelectedDevice(model);
          if (onSelectModelForCatalog) {
            onSelectModelForCatalog(model);
          }
          setSelectedServices(new Map());
        }}
      />
    </>
  );
};
