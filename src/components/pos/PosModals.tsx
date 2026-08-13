import React, { useEffect } from 'react';
import {
  ShieldCheck,
  XCircle,
  X,
  Search,
  PackageCheck,
  FileText,
  Printer,
  BadgePercent,
} from 'lucide-react';
import { WorkOrder, PartItem, SystemSettings } from '../../types';
import { ModelRepairPrice } from '../../types/priceCatalog';
import { getModelPriceCatalogItems, ModelRepairCatalogItem } from '../../utils/priceCatalogLookup';
import { Button, Input } from '../ui';
import { DISCOUNT_OPTIONS, shortWarranty } from './posUtils';

/** Modals extracted from PosInvoicingModule (Ko Hein 2026-08-11). */

// ---------------------------------------------------------------------------
// Payment Confirmation
// ---------------------------------------------------------------------------
export interface PosConfirmModalProps {
  isOpen: boolean;
  workOrder: WorkOrder | null;
  paymentMethod: string;
  checkoutDate: string;
  onCheckoutDateChange: (v: string) => void;
  cashTendered: number;
  currency: string;
  isProcessingPayment: boolean;
  isPaymentShort: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PosConfirmPaymentModal: React.FC<PosConfirmModalProps> = ({
  isOpen,
  workOrder: selectedWo,
  paymentMethod,
  checkoutDate,
  onCheckoutDateChange,
  cashTendered,
  currency,
  isProcessingPayment,
  isPaymentShort,
  onCancel,
  onConfirm,
}) => {
  // Esc closes the confirm modal; file-local handler (audit area-B).
  useEffect(() => {
    if (!isOpen || !selectedWo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, selectedWo, onCancel]);

  if (!isOpen || !selectedWo) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center pt-[env(safe-area-inset-top)]"
      onClick={onCancel}
    >
      <div
        className="bg-white border border-line rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm h-[92dvh] sm:h-auto p-5 space-y-4 shadow-xl overflow-y-auto animate-i35-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-success" />
            <h3 className="font-extrabold text-sm text-ink">Confirm Payment</h3>
          </div>
          <Button
            type="button"
            onClick={onCancel}
            variant="iconGhost"
            size="iconSm"
            className="text-muted hover:text-ink"
            aria-label="Close confirmation"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Order</span>
            <span className="font-mono font-bold text-brand">{selectedWo.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Device</span>
            <span className="font-bold text-ink">{selectedWo.deviceModel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Method</span>
            <span className="font-bold text-ink">{paymentMethod}</span>
          </div>
          {/* Backdate checkout (Ko Hein 2026-08-10) */}
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
            <span className="text-muted">Checkout Date</span>
            <Input
              type="date"
              value={checkoutDate}
              onChange={(e) => onCheckoutDateChange(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold text-ink outline-none [color-scheme:light]"
              aria-label="Checkout date"
            />
          </div>
          {paymentMethod === 'Cash' && cashTendered > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted">Tendered</span>
                <span className="font-mono">{cashTendered.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Change</span>
                <span className="font-mono font-bold text-success">
                  {Math.max(0, cashTendered - selectedWo.totalAmount).toLocaleString()} {currency}
                </span>
              </div>
            </>
          )}
          {paymentMethod === 'Cash' && cashTendered > 0 && cashTendered < selectedWo.totalAmount && (
            <div className="flex justify-between">
              <span className="text-muted">Short</span>
              <span className="font-mono font-bold text-danger">
                {(selectedWo.totalAmount - cashTendered).toLocaleString()} {currency}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-brand-soft border border-brand/20 p-4 flex items-center justify-between">
          <span className="text-xs font-extrabold text-ink">Total to collect</span>
          <span className="text-brand font-mono text-lg font-black">{selectedWo.totalAmount.toLocaleString()} {currency}</span>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="flex-1 border border-line-strong"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isProcessingPayment || isPaymentShort || selectedWo.isPaid}
            className={`flex-1 ${isProcessingPayment || isPaymentShort ? 'bg-muted text-white opacity-60' : 'bg-success hover:bg-success/90 text-white'}`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Confirm & Print</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add Inventory Part picker
// ---------------------------------------------------------------------------
export interface PosAddPartModalProps {
  isOpen: boolean;
  parts: PartItem[];
  deviceModel: string;
  owner: 'ALL' | 'APP' | 'KZH';
  onOwnerChange: (o: 'ALL' | 'APP' | 'KZH') => void;
  mode: 'auto' | 'manual' | 'external';
  onModeChange: (m: 'auto' | 'manual' | 'external') => void;
  search: string;
  onSearchChange: (s: string) => void;
  filteredParts: PartItem[];
  selectedPartId: string;
  onSelectPartId: (id: string) => void;
  qty: number;
  onQtyChange: (q: number) => void;
  onAdd: () => void;
  onClose: () => void;
  /** External part (bought outside, not in inventory) — Ko Hein 2026-08-11 */
  externalName: string;
  onExternalNameChange: (s: string) => void;
  externalCost: number;
  onExternalCostChange: (n: number) => void;
  externalSell: number;
  onExternalSellChange: (n: number) => void;
  onAddExternal: () => void;
}

export const PosAddPartModal: React.FC<PosAddPartModalProps> = ({
  isOpen,
  parts,
  deviceModel,
  owner,
  onOwnerChange,
  mode,
  onModeChange,
  search,
  onSearchChange,
  filteredParts,
  selectedPartId,
  onSelectPartId,
  qty,
  onQtyChange,
  onAdd,
  onClose,
  externalName,
  onExternalNameChange,
  externalCost,
  onExternalCostChange,
  externalSell,
  onExternalSellChange,
  onAddExternal,
}) => {
  // Esc closes the add-part picker; file-local handler (audit area-B).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const inStock = filteredParts.filter((part) => part.quantityInStock > 0);
  const selectedPart = filteredParts.find((part) => part.id === selectedPartId) || filteredParts[0] || null;
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center pt-[env(safe-area-inset-top)]"
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md h-[80dvh] sm:h-[520px] flex flex-col p-4 space-y-3 shadow-xl animate-i35-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-ink">Add Inventory Part Used</h3>
            <p className="text-xs text-muted truncate">Pick the stock part used on this ticket</p>
          </div>
          <Button
            type="button"
            variant="iconGhost"
            onClick={onClose}
            aria-label="Close add part"
            className="text-muted hover:text-ink p-1.5 rounded transition-colors cursor-pointer focus:outline-none"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Owner filter — compact text-only pills (Ko Hein 2026-08-11) */}
        <div className="flex items-center gap-2">
          {(['ALL', 'APP', 'KZH'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onOwnerChange(o)}
              className={`text-[11px] font-extrabold tracking-wide uppercase transition-colors cursor-pointer ${
                owner === o ? 'text-ink underline underline-offset-4 decoration-2' : 'text-muted hover:text-ink'
              }`}
            >
              {o}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-semibold text-muted truncate">
            {deviceModel || 'Device'}
          </span>
        </div>

        {/* Sub-tabs: Auto (exact device + repair category) / Manual (all for device) / External (bought outside) — Ko Hein 2026-08-11 */}
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
          {([['auto', 'Auto'], ['manual', 'Manual'], ['external', 'External']] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-extrabold transition-colors cursor-pointer ${
                mode === m ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* External part form — bought outside, not in inventory (Ko Hein 2026-08-11) */}
        {mode === 'external' && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-muted">Part Name</label>
              <input
                type="text"
                value={externalName}
                onChange={(e) => onExternalNameChange(e.target.value)}
                placeholder="e.g. Battery 11 Pro (bought outside)"
                autoFocus
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/40"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-muted">Cost (buy-in)</label>
                <input
                  type="number"
                  min={0}
                  value={externalCost || ''}
                  onChange={(e) => onExternalCostChange(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-mono font-bold text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/40"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-muted">Sell Price</label>
                <input
                  type="number"
                  min={0}
                  value={externalSell || ''}
                  onChange={(e) => onExternalSellChange(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-mono font-bold text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/40"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-muted">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={qty || ''}
                  onChange={(e) => onQtyChange(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  placeholder="1"
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-mono font-bold text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/40"
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={!externalName.trim() || externalSell <= 0}
              onClick={onAddExternal}
              className="w-full h-10 bg-ink hover:bg-ink/90 text-white font-extrabold text-xs rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add External Part to Ticket
            </Button>
            <p className="text-[10px] font-semibold text-muted leading-snug">
              Adds a part line without touching stock — for parts bought outside inventory. Cost goes to expenses; sell price shows in the parts deduction.
            </p>
          </div>
        )}

        {/* Manual-mode search (Ko Hein 2026-08-11) */}
        {mode === 'manual' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search parts…"
              className="w-full rounded-lg border border-line bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/40"
            />
          </div>
        )}

        {/* Part list — Auto mode (exact device + repair category) */}
        {mode !== 'external' && (<>
        <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
          <div className="space-y-1">
            {inStock.length === 0 ? (
              <div className="p-8 text-center text-muted text-xs space-y-1">
                <PackageCheck className="w-8 h-8 mx-auto opacity-40 text-ink" />
                <p className="font-extrabold text-ink">
                  {parts.length === 0 ? 'No parts in database' : 'No exact-match parts in stock'}
                </p>
                <p>
                  {parts.length === 0
                    ? 'Add parts in Inventory module first.'
                    : 'Switch to Manual to see every part for this device, or change the owner filter.'}
                </p>
              </div>
            ) : (
              inStock.map((part) => {
                const isSelected = selectedPartId === part.id;
                const low = part.quantityInStock <= part.reorderPoint;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => onSelectPartId(part.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left text-ink transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand/40 ${
                      isSelected ? 'border-ink bg-surface ring-1 ring-ink/10' : 'border-line bg-white hover:bg-surface'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink truncate">{part.name}</p>
                      <p className={`text-[10px] font-semibold ${low ? 'text-warning' : 'text-muted'}`}>
                        {part.category} · {part.owner || 'APP'} · Stock: {part.quantityInStock}{low ? ' — Low' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-black text-brand">
                      {(part.sellingPrice || part.costPrice || 0).toLocaleString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Qty + Add */}
        {selectedPart && (
          <div className="flex items-end gap-2 pt-1">
            <label htmlFor="pos-part-qty" className="block shrink-0">
              <span className="block text-[11px] font-bold text-muted mb-1">Qty</span>
              <Input
                id="pos-part-qty"
                type="number"
                min={1}
                max={selectedPart.quantityInStock || 99}
                value={qty || ''}
                onChange={(e) => onQtyChange(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-line bg-white px-2 py-2 text-xs font-mono font-bold text-ink outline-none "
              />
            </label>
            <Button
              type="button"
              onClick={onAdd}
              className="flex-1 h-10 bg-ink hover:bg-ink/90 text-white font-extrabold text-xs rounded-lg"
            >
              Add Part to Ticket
            </Button>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Digital Receipt
// ---------------------------------------------------------------------------
export interface PosReceiptModalProps {
  isOpen: boolean;
  workOrder: WorkOrder | null;
  paymentMethod: string;
  /** Tendered cash amount (audit area-B): shown on the receipt when Cash over-paid. */
  cashTendered?: number;
  systemSettings?: SystemSettings;
  onClose: () => void;
  onFullInvoice: () => void;
}

export const PosDigitalReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  workOrder: selectedWo,
  paymentMethod,
  cashTendered = 0,
  systemSettings,
  onClose,
  onFullInvoice,
}) => {
  if (!isOpen || !selectedWo) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
      <div className="printable-pos-receipt bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl">
        <div className="text-center space-y-1.5 border-b border-line pb-3">
          {systemSettings?.shopLogoUrl && (
            <div className="flex justify-center mb-1">
              <img
                src={systemSettings.shopLogoUrl}
                alt="Shop Logo"
                className="logo-chip h-10 max-w-[140px] object-contain bg-white border border-line rounded-lg p-0.5"
              />
            </div>
          )}
          <h2 className="font-extrabold text-lg text-ink">
            {systemSettings?.shopName || 'AppleRepair Pro'}
          </h2>
          <p className="text-muted text-xs">
            {systemSettings?.receiptHeaderTitle || 'Official ACMT Certified Service Voucher'}
          </p>
          {systemSettings?.shopPhone && (
            <p className="text-xs text-muted font-mono">
              Tel: {systemSettings.shopPhone}
            </p>
          )}
          <p className="text-brand font-mono font-bold pt-0.5">{selectedWo.orderNumber}</p>
        </div>

        <div className="space-y-1 text-ink">
          <div className="flex justify-between">
            <span className="text-muted">Customer:</span>
            <span className="font-bold text-ink">{selectedWo.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Device:</span>
            <span className="font-bold text-ink">{selectedWo.deviceModel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Payment Method:</span>
            <span className="font-mono text-brand">{paymentMethod}</span>
          </div>
        </div>

        <div className="p-4 bg-surface rounded-xl border border-line space-y-1 font-mono">
          <div className="flex justify-between text-success-deep font-bold">
            <span>TOTAL PAID:</span>
            <span>
              {selectedWo.totalAmount.toLocaleString()} {systemSettings?.currencySymbol || 'MMK'}
            </span>
          </div>
        </div>

        {paymentMethod === 'Cash' && cashTendered > (selectedWo.totalAmount || 0) && (
          <div className="p-4 bg-surface rounded-xl border border-line space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-muted">Tendered</span>
              <span>{cashTendered.toLocaleString()} {systemSettings?.currencySymbol || 'MMK'}</span>
            </div>
            <div className="flex justify-between text-success-deep font-bold">
              <span>Change</span>
              <span>{(cashTendered - (selectedWo.totalAmount || 0)).toLocaleString()} {systemSettings?.currencySymbol || 'MMK'}</span>
            </div>
          </div>
        )}

        <div className="p-2 bg-surface rounded-xl border border-line text-xs text-muted text-center italic">
          {systemSettings?.receiptFooterNote || 'Thank you for choosing AppleRepair! All repairs covered by warranty.'}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 no-print">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={onFullInvoice}
            variant="secondary"
            size="sm"
            className="flex items-center space-x-1"
          >
            <FileText className="w-3.5 h-3.5 text-brand" />
            <span>Full Invoice</span>
          </Button>
          <Button
            type="button"
            onClick={() => {
              try {
                window.print();
              } catch (e) {
                console.warn('Print failed:', e);
              }
            }}
            size="sm"
            className="bg-brand hover:bg-brand-deep text-white flex items-center space-x-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Price List Repair Picker — intake-style modal (Ko Hein 2026-08-10)
// ---------------------------------------------------------------------------
export interface PosPriceListPickerProps {
  isOpen: boolean;
  workOrder: WorkOrder | null;
  priceCatalog: ModelRepairPrice[];
  selection: string[];
  onSelectionChange: (sel: string[]) => void;
  discounts: Record<string, number>;
  onDiscountChange: (categoryKey: string, pct: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
  groupFilter: string;
  onGroupFilterChange: (g: string) => void;
  discountMenuFor: string | null;
  setDiscountMenuFor: (k: string | null) => void;
  discountAnchor: { top: number; left: number } | null;
  setDiscountAnchor: (a: { top: number; left: number } | null) => void;
  customDiscountInput: string;
  setCustomDiscountInput: (s: string) => void;
  currency: string;
  onDone: (items: Array<ModelRepairCatalogItem & { discountPercent?: number }>) => void;
  onClose: () => void;
}

export const PosPriceListPickerModal: React.FC<PosPriceListPickerProps> = ({
  isOpen,
  workOrder: selectedWo,
  priceCatalog,
  selection,
  onSelectionChange,
  discounts,
  onDiscountChange,
  search,
  onSearchChange,
  groupFilter,
  onGroupFilterChange,
  discountMenuFor,
  setDiscountMenuFor,
  discountAnchor,
  setDiscountAnchor,
  customDiscountInput,
  setCustomDiscountInput,
  currency,
  onDone,
  onClose,
}) => {
  if (!isOpen || !selectedWo) return null;
  const catalogItems = getModelPriceCatalogItems(selectedWo.deviceModel || '', priceCatalog);
  const matchedModelName = catalogItems.length > 0 ? catalogItems[0].modelMatchedName : selectedWo.deviceModel;
  // audit A-P2-6: fabricated fallback prices (isCatalogMatch === false)
  // must never be addable to a live invoice — staff would charge a
  // made-up amount for an unlisted model.
  const selectedCatalogItems = catalogItems
    .filter((item) => selection.includes(item.categoryKey) && item.isCatalogMatch && item.price > 0)
    .map((item) => ({ ...item, discountPercent: discounts[item.categoryKey] || 0 }));
  const selectedCatalogTotal = selectedCatalogItems.reduce((sum, item) => sum + item.price, 0);
  const selectedCatalogFinalTotal = selectedCatalogItems.reduce(
    (sum, item) => sum + Math.round(item.price * (1 - (item.discountPercent || 0) / 100)),
    0
  );
  const selectedCatalogSaved = selectedCatalogTotal - selectedCatalogFinalTotal;
  const filteredItems = catalogItems.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.group.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = groupFilter === 'ALL' || item.group === groupFilter;
    return matchesSearch && matchesGroup && item.price > 0;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-ink">Add Repairs & Details</h3>
            <p className="truncate text-xs text-muted">Repairs for {matchedModelName}</p>
          </div>
          <Button
            type="button"
            variant="iconGhost"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search + group pills — same feel as Simple Ticket */}
        <div className="space-y-2 border-b border-line px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search repairs (e.g. Battery, Display, Face ID)..."
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition-colors focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {['ALL', 'Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((grp) => (
              <Button
                key={grp}
                type="button"
                onClick={() => onGroupFilterChange(grp)}
                className={`shrink-0 rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                  groupFilter === grp
                    ? 'bg-brand text-white shadow-2xs'
                    : 'bg-surface text-muted hover:text-ink hover:bg-line'
                }`}
              >
                {grp}
              </Button>
            ))}
          </div>
        </div>

        {/* Repair list — Simple Ticket card grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted text-xs space-y-1">
              <FileText className="w-8 h-8 mx-auto opacity-40 text-brand" />
              <p className="font-extrabold text-ink">No matching repairs found</p>
              <p>Try a different search or group filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredItems.map((item) => {
                const isSelected = selection.includes(item.categoryKey);
                const discountPct = discounts[item.categoryKey] || 0;
                const finalPrice = Math.round(item.price * (1 - discountPct / 100));
                const alreadyInWo = (selectedWo.lineItems || []).some(
                  (li) => li.description?.toLowerCase() === item.name.toLowerCase()
                );
                // audit A-P2-6: fallback "estimate" items (not in the real
                // catalog) are visible but never selectable — no made-up
                // prices on a live invoice.
                const notSelectable = alreadyInWo || !item.isCatalogMatch;
                return (
                  <div
                    key={item.categoryKey}
                    role="button"
                    tabIndex={notSelectable ? -1 : 0}
                    aria-pressed={notSelectable ? undefined : isSelected}
                    aria-disabled={notSelectable || undefined}
                    onClick={() => {
                      if (notSelectable) return;
                      const isIn = selection.includes(item.categoryKey);
                      if (isIn) {
                        onSelectionChange(selection.filter((k) => k !== item.categoryKey));
                        if (discountMenuFor === item.categoryKey) {
                          setDiscountMenuFor(null);
                          setDiscountAnchor(null);
                        }
                        // propagate discount removal to parent state
                        onDiscountChange(item.categoryKey, 0);
                      } else {
                        onSelectionChange([...selection, item.categoryKey]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (notSelectable) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const isIn = selection.includes(item.categoryKey);
                        if (isIn) {
                          onSelectionChange(selection.filter((k) => k !== item.categoryKey));
                          onDiscountChange(item.categoryKey, 0);
                        } else {
                          onSelectionChange([...selection, item.categoryKey]);
                        }
                      }
                    }}
                    className={`group relative flex min-h-[92px] cursor-pointer select-none flex-col gap-1.5 rounded-2xl border-2 bg-white p-2.5 shadow-2xs transition-colors focus:outline-none ${
                      notSelectable
                        ? 'border-line bg-surface/50 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-brand bg-brand/5'
                          : 'border-line hover:border-brand/50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <h3 className="min-w-0 truncate text-[11px] font-extrabold leading-snug text-ink" title={item.name}>{item.name}</h3>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-muted">{item.group}</span>
                      <span className="inline-flex shrink-0 items-center space-x-0.5 rounded-full border border-success/30 bg-success/10 px-1 py-px text-[10px] font-extrabold text-success-deep">
                        <ShieldCheck className="h-1.5 w-1.5 shrink-0 text-success" />
                        <span>{shortWarranty(item.warranty)}</span>
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-1.5">
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-xs font-black text-ink">{finalPrice.toLocaleString()}</span>
                          <span className={`font-mono text-[10px] font-bold text-muted line-through ${discountPct > 0 ? 'visible' : 'invisible'}`}>{item.price.toLocaleString()}</span>
                        </div>
                        <div className="h-3.5 overflow-hidden">
                          {discountPct > 0 ? (
                            <span className="text-[9px] font-extrabold text-success">−{(item.price - finalPrice).toLocaleString()} · {discountPct}%</span>
                          ) : (
                            <span className="text-[9px] font-extrabold text-muted">
                              {alreadyInWo
                                ? 'Already in invoice'
                                : !item.isCatalogMatch
                                  ? 'Estimate only — not in catalog'
                                  : isSelected
                                    ? 'Selected'
                                    : 'Tap to add'}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (alreadyInWo || !isSelected) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const popupWidth = 176;
                          let left = rect.right - popupWidth;
                          left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));
                          setDiscountAnchor({ top: rect.bottom + 6, left });
                          setDiscountMenuFor(item.categoryKey);
                        }}
                        title={discountPct > 0 ? `${discountPct}% discount applied` : 'Add discount'}
                        aria-label={`Set discount for ${item.name}`}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer active:scale-95 ${
                          isSelected
                            ? discountPct > 0
                              ? 'border-brand bg-brand text-white'
                              : 'border-line bg-white text-muted hover:border-brand hover:text-brand'
                            : 'invisible'
                        }`}
                      >
                        <BadgePercent className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary + Done */}
        <div className="grid grid-cols-2 gap-2 border-t border-line px-4 py-3 text-center text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-surface p-2">
            <span className="block font-semibold text-muted">Items</span>
            <span className="font-extrabold text-ink">{selection.length}</span>
          </div>
          <div className="rounded-lg bg-surface p-2">
            <span className="block font-semibold text-muted">Base</span>
            <span className="font-extrabold text-ink">{selectedCatalogTotal.toLocaleString()} {currency}</span>
          </div>
          <div className="rounded-lg bg-surface p-2">
            <span className="block font-semibold text-muted">Discount</span>
            <span className="font-extrabold text-danger">{selectedCatalogSaved > 0 ? `-${selectedCatalogSaved.toLocaleString()} ${currency}` : `0 ${currency}`}</span>
          </div>
          <div className="rounded-lg bg-brand p-2 text-white">
            <span className="block text-[10px] font-bold uppercase opacity-90">Final</span>
            <span className="font-black">{selectedCatalogFinalTotal.toLocaleString()} {currency}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <Button
            type="button"
            onClick={() => {
              if (selectedCatalogItems.length > 0) {
                onDone(selectedCatalogItems);
              } else {
                // audit A-P2-5: closing via Done with nothing selected
                // must also clear picker state (no stale selection).
                onClose();
              }
            }}
            disabled={selection.length === 0}
            className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white transition hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Done ({selectedCatalogItems.length})
          </Button>
        </div>

        {/* Anchored discount popup — same as Simple Ticket */}
        {discountMenuFor && discountAnchor && (
          <div
            className="discount-popup fixed z-[80] w-44 rounded-2xl border border-line bg-white p-2 shadow-xl"
            style={{ top: discountAnchor.top, left: discountAnchor.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <p className="text-xs font-extrabold text-ink">Discount</p>
              <span className="max-w-[110px] truncate text-xs font-bold text-muted">
                {catalogItems.find((item) => item.categoryKey === discountMenuFor)?.name || ''}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {DISCOUNT_OPTIONS.map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  onClick={() => {
                    onDiscountChange(discountMenuFor, pct);
                    setDiscountMenuFor(null);
                    setDiscountAnchor(null);
                  }}
                  className={`flex h-7 w-7 min-w-7 items-center justify-center rounded-full text-[10px] font-extrabold transition-all cursor-pointer active:scale-90 ${
                    (discounts[discountMenuFor] || 0) === pct
                      ? 'border border-brand bg-brand text-white'
                      : 'border border-line bg-white text-ink hover:border-brand hover:text-brand'
                  }`}
                  title={pct === 0 ? 'No discount' : `${pct}% off`}
                >
                  {pct === 0 ? '0' : pct}
                </Button>
              ))}
            </div>
            <div className="mt-2 border-t border-line pt-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Custom %"
                value={customDiscountInput}
                onChange={(e) => setCustomDiscountInput(e.target.value)}
                onBlur={() => {
                  const value = Number(customDiscountInput);
                  if (value >= 1 && value <= 100) {
                    onDiscountChange(discountMenuFor, value);
                    setCustomDiscountInput('');
                    setDiscountMenuFor(null);
                    setDiscountAnchor(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = Number(customDiscountInput);
                    if (value >= 1 && value <= 100) {
                      onDiscountChange(discountMenuFor, value);
                      setCustomDiscountInput('');
                      setDiscountMenuFor(null);
                      setDiscountAnchor(null);
                    }
                  }
                }}
                className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-center font-mono text-xs font-bold text-ink outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
