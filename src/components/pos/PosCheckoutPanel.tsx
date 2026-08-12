import React from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Landmark,
  PackageCheck,
  PencilLine,
  Percent,
  Phone,
  Plus,
  Receipt,
  Smartphone,
  Split,
  Ticket,
  UserRound,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { WorkOrder, WorkOrderLineItem, Technician, PaymentMethodConfig } from '../../types';
import { Button, Input } from '../ui';
import { StatusChip } from '../common/StatusChip';
import { getRealisticColorStyle } from '../intake/deviceData';
import { getLineItemIcon, signedMoney } from './posUtils';

export interface PosCheckoutPanelProps {
  selectedWo: WorkOrder | null;
  currency: string;
  taxRate: number;
  laborItems: WorkOrderLineItem[];
  partsItems: WorkOrderLineItem[];
  perItemDiscountTotal: number;
  partsCostTotal: number;
  estCommission: number;
  activePaymentMethods: PaymentMethodConfig[];
  selectedMethodConfig?: PaymentMethodConfig;
  paymentMethod: string;
  setPaymentMethod: (m: string) => void;
  cashTendered: number;
  setCashTendered: (v: number) => void;
  splitPayments: { method: string; amount: number }[];
  setSplitPayments: React.Dispatch<React.SetStateAction<{ method: string; amount: number }[]>>;
  copiedAccount: boolean;
  setCopiedAccount: (v: boolean) => void;
  invoiceDiscountInput: string;
  setInvoiceDiscountInput: (v: string) => void;
  customRepairName: string;
  setCustomRepairName: (v: string) => void;
  customRepairPrice: number;
  setCustomRepairPrice: (v: number) => void;
  customRepairQty: number;
  setCustomRepairQty: (v: number) => void;
  isAddCustomRepairOpen: boolean;
  setIsAddCustomRepairOpen: (v: boolean) => void;
  isSheetEditMode: boolean;
  setIsSheetEditMode: (v: boolean) => void;
  isPaymentShort: boolean;
  isProcessingPayment: boolean;
  isMobileCheckoutFullOpen: boolean;
  cashInputRef: React.RefObject<HTMLInputElement | null>;
  technicians?: Technician[];
  handleUpdateLineItem: (lineItemId: string, field: 'unitPrice' | 'quantity' | 'lineItemDiscountPercent', value: number) => void;
  handleUpdateInvoiceDiscount: (newDiscount: number) => void;
  handleAddCustomRepair: () => void;
  handleApplyDiagnosticFeeOnly: () => void;
  handleRemoveInventoryPartFromWorkOrder: (lineItemId: string) => void;
  setIsAddPartOpen: (v: boolean) => void;
  setIsAddRepairFromPriceListOpen: (v: boolean) => void;
  setIsConfirmOpen: (v: boolean) => void;
  setIsInvoiceModalOpen: (v: boolean) => void;
  setPrintableInvoiceWo: (wo: WorkOrder) => void;
}

export const PosCheckoutPanel: React.FC<PosCheckoutPanelProps> = ({
  selectedWo,
  currency,
  taxRate,
  laborItems,
  partsItems,
  perItemDiscountTotal,
  partsCostTotal,
  estCommission,
  activePaymentMethods,
  selectedMethodConfig,
  paymentMethod,
  setPaymentMethod,
  cashTendered,
  setCashTendered,
  splitPayments,
  setSplitPayments,
  copiedAccount,
  setCopiedAccount,
  invoiceDiscountInput,
  setInvoiceDiscountInput,
  customRepairName,
  setCustomRepairName,
  customRepairPrice,
  setCustomRepairPrice,
  customRepairQty,
  setCustomRepairQty,
  isAddCustomRepairOpen,
  setIsAddCustomRepairOpen,
  isSheetEditMode,
  setIsSheetEditMode,
  isPaymentShort,
  isProcessingPayment,
  isMobileCheckoutFullOpen,
  cashInputRef,
  technicians,
  handleUpdateLineItem,
  handleUpdateInvoiceDiscount,
  handleAddCustomRepair,
  handleApplyDiagnosticFeeOnly,
  handleRemoveInventoryPartFromWorkOrder,
  setIsAddPartOpen,
  setIsAddRepairFromPriceListOpen,
  setIsConfirmOpen,
  setIsInvoiceModalOpen,
  setPrintableInvoiceWo,
}) => {
  return (
selectedWo ? (
            <div className="space-y-3">
              {/* Desktop: left column — ticket header + items + summary */}
              <div className="space-y-3 md:min-w-0">
              <div className="border border-line bg-gradient-to-r from-surface/70 via-white to-surface/40 rounded-xl px-3 py-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono font-black text-ink text-xs tracking-tight">
                        <Ticket className="w-3.5 h-3.5 text-muted shrink-0" />
                        {selectedWo.orderNumber}
                      </span>
                      <StatusChip status={selectedWo.status} />
                    </div>
                    <h2 className="flex items-center gap-1.5 text-base font-black text-ink leading-tight truncate">
                      <Smartphone className="w-4 h-4 text-muted shrink-0" />
                      <span className="truncate">{selectedWo.deviceModel}</span>
                      {/* Device color circle (Ko Hein 2026-08-11) */}
                      {selectedWo.deviceColor && (() => {
                        const st = getRealisticColorStyle(selectedWo.deviceColor);
                        return (
                          <span
                            className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-sm ${st.border}`}
                            style={{ background: st.gradient, boxShadow: st.shadow }}
                            title={`Color: ${selectedWo.deviceColor}`}
                          />
                        );
                      })()}
                    </h2>
                  </div>
                  <div className="shrink-0 text-right space-y-0.5">
                    <p className="inline-flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-wider text-muted">
                      <UserRound className="w-3 h-3" />
                      Customer
                    </p>
                    <p className="font-black text-ink text-sm leading-tight">{selectedWo.customerName}</p>
                    {selectedWo.customerPhone && (
                      <p className="inline-flex items-center justify-end gap-1 font-mono text-[11px] font-bold text-muted tabular-nums">
                        <Phone className="w-3 h-3" />
                        {selectedWo.customerPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Diagnostic Fee quick action — 5-row Excel table (Ko Hein) */}
              {(selectedWo.status === 'Cant Repair' || selectedWo.status === 'Customer Not Repair') && (
                <div className="border border-danger/40 rounded-lg overflow-hidden bg-white text-xs animate-fadeIn">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="bg-danger/5">
                        <td className="border border-danger/20 px-2 py-1.5">
                          <span className="flex items-center gap-1.5 text-danger font-extrabold">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            {selectedWo.status === 'Cant Repair' ? 'Unrepairable Device' : 'Customer Cancelled'}
                          </span>
                        </td>
                        <td className="border border-danger/20 px-2 py-1.5 text-right font-mono font-bold text-danger">
                          {selectedWo.orderNumber}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-line px-2 py-1.5 text-muted" colSpan={2}>
                          Option: charge Diagnostic / Inspection fee only before handing back device
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-line px-2 py-1.5 text-muted">Standard Diagnostic Fee</td>
                        <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums">
                          5,000 {currency}
                        </td>
                      </tr>
                      <tr className="bg-surface/50">
                        <td className="border border-line px-2 py-1.5 text-muted">Charged Items</td>
                        <td className="border border-line px-2 py-1.5 text-right text-muted">—</td>
                      </tr>
                      <tr>
                        <td className="border border-line px-2 py-1.5" colSpan={2}>
                          <Button
                            type="button"
                            onClick={handleApplyDiagnosticFeeOnly}
                            className="w-full py-1.5 rounded-md bg-danger hover:bg-danger-deep text-white font-extrabold text-xs transition-all cursor-pointer active:scale-[0.98] focus:outline-none"
                          >
                            Apply Diagnostic Fee Only (စက်စစ်ခ သာကောက်မည်)
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Itemized Line Items — Labor/Repair + System Parts (Ko Hein 2026-08-10) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-black text-ink text-xs uppercase tracking-wide">Itemized Labor & Parts</h3>
                    <span className="text-[10px] text-muted font-semibold">
                      {laborItems.length} repair{laborItems.length !== 1 ? 's' : ''}{partsItems.length > 0 ? ` · ${partsItems.length} part${partsItems.length !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddPartOpen(true)}
                      className="h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold text-ink hover:bg-transparent hover:text-ink hover:underline"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Add Part</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddCustomRepairOpen(!isAddCustomRepairOpen)}
                      className={`h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold hover:bg-transparent hover:underline ${
                        isAddCustomRepairOpen ? 'text-success-deep' : 'text-ink hover:text-ink'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Custom</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddRepairFromPriceListOpen(true)}
                      className="h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold text-ink hover:bg-transparent hover:text-ink hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Price List</span>
                    </Button>
                    {(laborItems.length > 0 || partsItems.length > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsSheetEditMode(!isSheetEditMode)}
                        className={`h-auto min-h-0 bg-transparent p-0 text-[11px] font-extrabold hover:bg-transparent hover:underline ${
                          isSheetEditMode ? 'text-success-deep' : 'text-ink hover:text-ink'
                        }`}
                      >
                        {isSheetEditMode ? <Check className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />}
                        <span>{isSheetEditMode ? 'Done' : 'Edit'}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Repair Items (Customer invoice) */}
                {laborItems.length === 0 && partsItems.length === 0 ? (
                  <div className="p-6 text-center text-muted text-xs border border-dashed border-line-strong rounded-lg bg-surface/30">
                    <Wrench className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-ink" />
                    <p className="font-extrabold text-ink">No items added yet</p>
                    <p>Use Add Part, Custom, or Price List above to add line items.</p>
                  </div>
                ) : (
                  <>
                    {/* Itemized sheet — repair rows + internal system-part rows together */}
                    {(laborItems.length > 0 || partsItems.length > 0) && (
                      <div className="border border-line-strong rounded-lg overflow-hidden bg-white">
                        <table className="w-full table-fixed border-collapse text-[11px]">
                          <colgroup>
                            <col className="w-[52%]" />
                            <col className="w-[7%]" />
                            <col className="w-[15%]" />
                            <col className="w-[9%]" />
                            <col className="w-[17%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-surface/80">
                              <th className="border border-line px-2 py-1 text-left font-black text-muted text-[10px] uppercase tracking-wide">Item</th>
                              <th className="border border-line px-2 py-1 text-center font-black text-muted text-[10px] uppercase tracking-wide">Qty</th>
                              <th className="border border-line px-2 py-1 text-center font-black text-muted text-[10px] uppercase tracking-wide">Original Price</th>
                              <th className="border border-line px-2 py-1 text-center font-black text-muted text-[10px] uppercase tracking-wide">Disc%</th>
                              <th className="border border-line px-2 py-1 text-right font-black text-muted text-[10px] uppercase tracking-wide">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {laborItems.map((li) => {
                              const isEditing = isSheetEditMode;
                              const hasDiscount = Boolean(li.lineItemDiscountPercent);
                              const lineTotal = li.unitPrice * li.quantity;
                              const itemDiscountAmt = hasDiscount ? Math.round(lineTotal * (li.lineItemDiscountPercent! / 100)) : 0;
                              const effectiveTotal = lineTotal - itemDiscountAmt;
                              const displayDiscountPct = li.lineItemDiscountPercent || 0;
                              const LineIcon = getLineItemIcon(li.description);
                              return (
                                <tr key={li.id} className="bg-white">
                                  {/* Item name + edit toggle */}
                                  <td className="border border-line px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <LineIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                                      <span className="font-bold text-ink min-w-0 truncate">{li.description}</span>
                                    </div>
                                  </td>

                                  {/* Qty — editable */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={1}
                                        value={li.quantity}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'quantity', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="text-muted tabular-nums">{li.quantity}</span>
                                    )}
                                  </td>

                                  {/* Unit Price — show original (strike) + discounted side by side if discounted */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={0}
                                        step={500}
                                        value={li.unitPrice}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'unitPrice', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="font-mono text-muted tabular-nums">{li.unitPrice.toLocaleString()}</span>
                                    )}
                                  </td>

                                  {/* Per-item discount % — editable */}
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center gap-0.5">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={li.lineItemDiscountPercent ?? ''}
                                          onChange={(e) => handleUpdateLineItem(li.id, 'lineItemDiscountPercent', Number(e.target.value))}
                                          placeholder="0"
                                          className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                        />
                                        <Percent className="w-3 h-3 text-muted shrink-0" />
                                      </div>
                                    ) : (
                                      <span className={`font-mono tabular-nums ${hasDiscount ? 'text-success-deep font-bold' : 'text-muted'}`}>
                                        {hasDiscount ? `${displayDiscountPct}%` : '—'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Amount = original → discount → final */}
                                  <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      <div className="flex min-w-0 flex-col items-end gap-0">
                                        {hasDiscount ? (
                                          <React.Fragment>
                                            <span className="font-black text-ink text-xs">{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        ) : (
                                          <React.Fragment>
                                            <span>{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="iconGhost"
                                        onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                        aria-label={`Remove ${li.description}`}
                                        title="Remove line item"
                                        className={`!h-5 !min-h-5 w-5 text-muted hover:text-danger p-0 rounded transition-colors cursor-pointer focus:outline-none ${isEditing ? '' : 'invisible pointer-events-none'}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {partsItems.map((li) => {
                              const isEditing = isSheetEditMode;
                              const hasDiscount = Boolean(li.lineItemDiscountPercent);
                              const lineTotal = li.unitPrice * li.quantity;
                              const itemDiscountAmt = hasDiscount ? Math.round(lineTotal * (li.lineItemDiscountPercent! / 100)) : 0;
                              const effectiveTotal = lineTotal - itemDiscountAmt;
                              const displayDiscountPct = li.lineItemDiscountPercent || 0;
                              const itemName = li.description || li.partName;
                              return (
                                <tr key={li.id} className="bg-surface/30">
                                  <td className="border border-line px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <PackageCheck className="w-3.5 h-3.5 text-muted shrink-0" />
                                      <span className="font-bold text-ink min-w-0 truncate">{itemName}</span>
                                    </div>
                                  </td>
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={1}
                                        value={li.quantity}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'quantity', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="text-muted tabular-nums">{li.quantity}</span>
                                    )}
                                  </td>
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={0}
                                        step={500}
                                        value={li.unitPrice}
                                        onChange={(e) => handleUpdateLineItem(li.id, 'unitPrice', Number(e.target.value))}
                                        className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                      />
                                    ) : (
                                      <span className="font-mono text-muted tabular-nums">{li.unitPrice.toLocaleString()}</span>
                                    )}
                                  </td>
                                  <td className="border border-line px-1 py-1 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center gap-0.5">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={li.lineItemDiscountPercent ?? ''}
                                          onChange={(e) => handleUpdateLineItem(li.id, 'lineItemDiscountPercent', Number(e.target.value))}
                                          placeholder="0"
                                          className="!h-5 !min-h-0 w-full text-center text-xs font-mono font-bold text-ink bg-transparent border-0 rounded px-1 py-0 outline-none focus:ring-0 focus:border-0"
                                        />
                                        <Percent className="w-3 h-3 text-muted shrink-0" />
                                      </div>
                                    ) : (
                                      <span className={`font-mono tabular-nums ${hasDiscount ? 'text-success-deep font-bold' : 'text-muted'}`}>
                                        {hasDiscount ? `${displayDiscountPct}%` : '—'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      <div className="flex min-w-0 flex-col items-end gap-0">
                                        {hasDiscount ? (
                                          <React.Fragment>
                                            <span className="font-black text-ink text-xs">{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        ) : (
                                          <React.Fragment>
                                            <span>{effectiveTotal.toLocaleString()}</span>
                                          </React.Fragment>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="iconGhost"
                                        onClick={() => handleRemoveInventoryPartFromWorkOrder(li.id)}
                                        aria-label={`Remove ${itemName}`}
                                        title="Remove system part"
                                        className={`!h-5 !min-h-5 w-5 text-muted hover:text-danger p-0 rounded transition-colors cursor-pointer focus:outline-none ${isEditing ? '' : 'invisible pointer-events-none'}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
                {/* Custom Repair Form (Ko Hein 2026-08-10) */}
                {isAddCustomRepairOpen && (
                  <div className="p-3 bg-surface/60 border border-line rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-ink shrink-0" />
                      <span className="text-xs font-extrabold text-ink">Add Custom Repair / Service</span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2">
                      <Input
                        value={customRepairName}
                        onChange={(e) => setCustomRepairName(e.target.value)}
                        placeholder="Repair name (e.g. Screen Replacement)"
                        className="bg-white border border-line rounded-lg p-2 text-xs font-bold text-ink"
                      />
                      <Input
                        type="number"
                        min={0}
                        step={500}
                        value={customRepairPrice || ''}
                        onChange={(e) => setCustomRepairPrice(Number(e.target.value))}
                        placeholder="Price"
                        className="bg-white border border-line rounded-lg p-2 text-xs font-mono font-bold text-ink"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={customRepairQty}
                        onChange={(e) => setCustomRepairQty(Math.max(1, Number(e.target.value) || 1))}
                        placeholder="Qty"
                        className="bg-white border border-line rounded-lg p-2 text-xs font-mono font-bold text-ink"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted">
                        Total: <strong className="text-ink">{((customRepairPrice || 0) * (customRepairQty || 1)).toLocaleString()} {currency}</strong>
                      </span>
                      <Button
                        type="button"
                        onClick={handleAddCustomRepair}
                        disabled={!customRepairName.trim() || !customRepairPrice}
                        className="px-3 py-1.5 rounded-lg bg-ink hover:bg-ink/90 text-white text-xs font-extrabold transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add to Invoice
                      </Button>
                    </div>
                  </div>
                )}

                {/* Calculation Summary — Customer & System totals (Ko Hein 2026-08-10) */}
                <div className="rounded-lg border border-line bg-white text-[11px] shadow-2xs overflow-hidden">
                  <table className="w-full border-collapse">
                    <tbody>
                      {/* Customer-facing section */}
                      <tr className="bg-surface/80">
                        <td className="border-b border-line px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted" colSpan={2}>
                          Customer Invoice
                        </td>
                      </tr>
                      <tr>
                        <td className="border-b border-line px-3 py-2 text-muted">Repair Subtotal <span className="text-[10px]">({laborItems.length} item{laborItems.length !== 1 ? 's' : ''})</span></td>
                        <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-ink tabular-nums">{(selectedWo.subtotal ?? 0).toLocaleString()} {currency}</td>
                      </tr>
                      {perItemDiscountTotal > 0 && (
                        <tr>
                          <td className="border-b border-line px-3 py-2 text-success-deep">Per-item Discounts</td>
                          <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-success-deep tabular-nums">-{perItemDiscountTotal.toLocaleString()} {currency}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="border-b border-line px-3 py-2 text-muted">Sales Tax ({Math.round(taxRate * 100)}%)</td>
                        <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-ink tabular-nums">{(selectedWo.taxAmount ?? 0).toLocaleString()} {currency}</td>
                      </tr>
                      {/* Invoice Discount — editable (Ko Hein 2026-08-10) */}
                      <tr>
                        <td className="border-b border-line px-3 py-1.5 text-success-deep">
                          <span className="flex items-center gap-1 leading-none">
                            <Percent className="w-3 h-3 shrink-0" />
                            Invoice Discount
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-1.5">
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              min={0}
                              step={1000}
                              value={invoiceDiscountInput || selectedWo.discountAmount || ''}
                              onChange={(e) => setInvoiceDiscountInput(e.target.value)}
                              onBlur={() => {
                                const val = Number(invoiceDiscountInput) || 0;
                                handleUpdateInvoiceDiscount(val);
                                setInvoiceDiscountInput('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = Number(invoiceDiscountInput) || 0;
                                  handleUpdateInvoiceDiscount(val);
                                  setInvoiceDiscountInput('');
                                }
                              }}
                              placeholder={selectedWo.discountAmount ? selectedWo.discountAmount.toLocaleString() : '0'}
                              className="h-auto min-h-0 w-20 text-right text-xs font-mono font-bold text-success-deep bg-transparent border-0 rounded-none px-1 py-0 outline-none focus:ring-0 focus:border-0"
                            />
                            <span className="text-success-deep font-mono tabular-nums text-xs shrink-0">{currency}</span>
                          </div>
                        </td>
                      </tr>
                      {selectedWo.depositAmount > 0 && (
                        <tr>
                          <td className="border-b border-line px-3 py-2 text-success-deep">Upfront Deposit Paid</td>
                          <td className="border-b border-line px-3 py-2 text-right font-mono font-bold text-success-deep tabular-nums">-{selectedWo.depositAmount.toLocaleString()} {currency}</td>
                        </tr>
                      )}
                      <tr className="bg-ink text-white hover:bg-ink hover:text-white">
                        <td className="px-3 py-2.5 text-xs font-black uppercase tracking-wide">Amount Due (Customer)</td>
                        <td className="px-3 py-2.5 text-right font-mono text-lg font-black tabular-nums">
                          {selectedWo.totalAmount.toLocaleString()} {currency}
                        </td>
                      </tr>

                      {/* System section — profit breakdown (Ko Hein 2026-08-11)
                          Gross Profit = Amount Due (Customer) − Parts Cost
                          Net Profit   = Gross Profit − Tech Commission
                          audit A-P3-3: show SIGNED values (clamping hid real
                          losses) and render the block whenever there are parts
                          OR a commission estimate — not only when parts exist. */}
                      {(partsItems.length > 0 || estCommission > 0) && (
                        <>
                          <tr className="bg-surface/30">
                            <td className="border border-line px-2 py-1 text-[10px] font-extrabold text-muted uppercase tracking-wider" colSpan={2}>System (incl. Parts)</td>
                          </tr>
                          {partsItems.length > 0 && (
                            <tr>
                              <td className="border border-line px-2 py-1.5 text-muted">Parts Cost (deducted)</td>
                              <td className="border border-line px-2 py-1.5 text-right font-mono text-warning tabular-nums">-{partsCostTotal.toLocaleString()} {currency}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="border border-line px-2 py-1.5 text-success-deep font-bold">Gross Profit</td>
                            <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-success-deep tabular-nums">{signedMoney((selectedWo.totalAmount || 0) - partsCostTotal)} {currency}</td>
                          </tr>
                          {estCommission > 0 && (
                            <tr>
                              <td className="border border-line px-2 py-1.5 text-muted">
                                Tech Commission{' '}
                                <span className="text-[10px] font-bold text-ink">
                                  ({(() => {
                                    const techId = selectedWo.assignedTechId || (selectedWo as WorkOrder & { qaTechnicianId?: string }).qaTechnicianId;
                                    const tech = techId ? technicians.find((t) => t.id === techId) : undefined;
                                    return tech?.name || selectedWo.assignedTechName || 'Unassigned';
                                  })()})
                                </span>
                              </td>
                              <td className="border border-line px-2 py-1.5 text-right font-mono text-muted tabular-nums">-{estCommission.toLocaleString()} {currency}</td>
                            </tr>
                          )}
                          {estCommission > 0 && (
                            <tr className="bg-surface/20">
                              <td className="border border-line px-2 py-1.5 text-ink font-bold">Net Profit</td>
                              <td className="border border-line px-2 py-1.5 text-right font-mono font-black text-ink tabular-nums">{signedMoney((selectedWo.totalAmount || 0) - partsCostTotal - estCommission)} {currency}</td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>


              {/* Payment Gateway Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-ink text-xs flex items-center space-x-1.5 uppercase tracking-wide">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payment Method Selection</span>
                  </h3>
                </div>

                {activePaymentMethods.length === 0 ? (
                  <div className="p-4 text-center bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning space-y-1">
                    <AlertTriangle className="w-5 h-5 mx-auto text-warning" />
                    <p className="font-extrabold">No payment methods enabled</p>
                    <p>Enable one in Settings → Payment Methods to accept payment.</p>
                  </div>
                ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activePaymentMethods.map((m) => {
                    const isSelected = paymentMethod === m.name;
                    return (
                      <Button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.name)}
                        variant="ghost"
                        className={`!h-7 !min-h-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border-0 shadow-none transition-all cursor-pointer focus:outline-none active:scale-95 ${
                          isSelected ? 'bg-ink text-white' : 'bg-transparent text-ink hover:bg-surface'
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        {m.name}
                      </Button>
                    );
                  })}

                  {/* Split Payment pill */}
                  <Button
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
                    variant="ghost"
                    className={`!h-7 !min-h-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border-0 shadow-none transition-all cursor-pointer focus:outline-none active:scale-95 ${
                      paymentMethod === 'Split Payment' ? 'bg-ink text-white' : 'bg-transparent text-ink hover:bg-surface'
                    }`}
                  >
                    {paymentMethod === 'Split Payment' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    Split Payment
                  </Button>
                </div>
                )}

                {/* Split Payment Interactive Breakdown UI */}
                {paymentMethod === 'Split Payment' && (
                  <div className="p-3.5 bg-purple/10 border border-purple/30 rounded-xl space-y-3 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-purple/30 pb-2">
                      <span className="font-extrabold text-ink flex items-center space-x-1.5">
                        <Split className="w-4 h-4 text-purple" />
                        <span>Split Payment Breakdown (အကွဲပေးချေမှု)</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-purple/10 text-purple px-2 py-0.5 rounded-full border border-purple/20">
                        Due: {selectedWo.totalAmount.toLocaleString()} {currency}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {splitPayments.map((sp, idx) => {
                        const otherSum = splitPayments.reduce((acc, curr, i) => (i === idx ? acc : acc + (curr.amount || 0)), 0);
                        const remForThis = Math.max(0, selectedWo.totalAmount - otherSum);

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-purple/20 shadow-2xs">
                            <span className="font-mono text-xs text-purple font-extrabold px-1.5 py-0.5 bg-purple/15 rounded shrink-0 self-start sm:self-auto">
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
                              className="bg-surface border border-line rounded-lg p-1.5 text-xs font-extrabold text-ink outline-none"
                            >
                              {activePaymentMethods.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({m.category})
                                </option>
                              ))}
                            </select>

                            {/* Amount Input */}
                            <div className="flex-1 flex items-center space-x-1.5">
                              <Input
                                type="number"
                                value={sp.amount || ''}
                                onChange={(e) => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = Math.max(0, Number(e.target.value) || 0);
                                  setSplitPayments(updated);
                                }}
                                placeholder="Amount MMK"
                                className="w-full bg-surface border border-line rounded-lg p-1.5 text-xs font-mono font-bold text-ink outline-none"
                              />
                              <Button variant="ghost"
                                type="button"
                                onClick={() => {
                                  const updated = [...splitPayments];
                                  updated[idx].amount = remForThis;
                                  setSplitPayments(updated);
                                }}
                                className="px-2 py-1.5 bg-purple/15 hover:bg-purple/15 text-purple font-bold text-xs rounded-lg border border-purple/30 shrink-0 cursor-pointer transition-all active:scale-95"
                                title="Auto-fill remaining amount"
                              >
                                Auto-Fill
                              </Button>
                            </div>

                            {/* Remove Row Button if > 2 */}
                            {splitPayments.length > 2 && (
                              <Button variant="ghost"
                                type="button"
                                onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                                className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove split method"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
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
                        <div className="pt-2 border-t border-purple/30 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="text-muted">
                              Paid Total: <strong className="font-mono text-ink">{currentTotalPaid.toLocaleString()} {currency}</strong>
                            </span>
                            {diff === 0 ? (
                              <span className="text-success-deep font-extrabold text-xs flex items-center space-x-1 bg-success/10 px-2 py-0.5 rounded-full border border-success/30">
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                <span>Balanced</span>
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-success-deep font-bold text-xs">
                                Change: +{diff.toLocaleString()} {currency}
                              </span>
                            ) : (
                              <span className="text-danger font-bold text-xs">
                                Short: {Math.abs(diff).toLocaleString()} {currency}
                              </span>
                            )}
                          </div>

                          {splitPayments.length < 4 && (
                            <Button variant="ghost"
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
                              className="px-2.5 py-1 bg-white hover:bg-purple/15 text-purple font-bold text-xs rounded-lg border border-purple/30 transition-all flex items-center space-x-1 cursor-pointer shrink-0 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Split Method</span>
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Account / QR details box if selected method has accountNumber or accountName */}
                {selectedMethodConfig && (selectedMethodConfig.accountNumber || selectedMethodConfig.notes) && (
                  <div className="p-3 bg-surface/70 border border-line rounded-xl space-y-2 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-ink flex items-center space-x-1.5">
                        <Landmark className="w-4 h-4 text-ink" />
                        <span>{selectedMethodConfig.name} - Account Transfer Details</span>
                      </span>
                      {selectedMethodConfig.accountNumber && (
                        <Button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedMethodConfig.accountNumber || '');
                            setCopiedAccount(true);
                            setTimeout(() => setCopiedAccount(false), 2000);
                          }}
                          variant="outline"
                          className="px-2 py-1 bg-white hover:bg-surface text-ink border border-line"
                        >
                          {copiedAccount ? (
                            <>
                              <Check className="w-3 h-3 text-success" />
                              <span className="text-xs text-success-deep">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-xs">Copy Number</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      {selectedMethodConfig.accountNumber && (
                        <div>
                          <span className="text-muted block text-xs">Account / Phone No:</span>
                          <span className="font-mono font-extrabold text-ink">{selectedMethodConfig.accountNumber}</span>
                        </div>
                      )}
                      {selectedMethodConfig.accountName && (
                        <div>
                          <span className="text-muted block text-xs">Beneficiary Name:</span>
                          <span className="font-bold text-ink">{selectedMethodConfig.accountName}</span>
                        </div>
                      )}
                      {selectedMethodConfig.notes && (
                        <div className="col-span-2">
                          <span className="text-muted block text-xs">Reference / Instructions:</span>
                          <span className="text-ink italic">{selectedMethodConfig.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === 'Cash' && (
                  <div className="px-0 py-1.5 bg-transparent border-0 rounded-none space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-extrabold text-ink">Cash Amount Tendered (MMK):</label>
                      <div className="flex flex-wrap items-center gap-1">
                        {[selectedWo.totalAmount, 50000, 100000, 200000, 500000]
                          .filter((v, i, arr) => arr.indexOf(v) === i)
                          .map((amt) => (
                            <Button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(amt)}
                              variant="ghost"
                              className={`h-8 px-2.5 rounded-lg border-0 shadow-none text-[11px] font-bold ${
                                cashTendered === amt
                                  ? 'bg-ink text-white'
                                  : 'bg-transparent text-ink hover:bg-surface'
                              }`}
                            >
                              {cashTendered === amt && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-white" />}
                              {amt === selectedWo.totalAmount ? 'Exact' : amt.toLocaleString()}
                            </Button>
                          ))}
                      </div>
                    </div>
                    <Input
                      ref={cashInputRef}
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="e.g. 250000"
                      inputMode="numeric"
                      className="w-full bg-white/70 border-0 rounded-lg px-2 py-1.5 text-ink font-mono shadow-none focus:ring-0 focus:border-0"
                    />
                    {/* On-screen numpad — cashier speed on phones */}
                    <div className="grid grid-cols-3 gap-1.5 md:hidden pt-0.5">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map((key) => (
                        <Button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (key === '⌫') {
                              setCashTendered(Math.floor(cashTendered / 10));
                            } else if (key === '0') {
                              // audit A-P3-5: append a literal zero — Number('0')||0
                              // made the key a no-op when tendered was 0, and
                              // Number('50'+'0') via string concat also worked
                              // but 0/00 needed an explicit path.
                              setCashTendered(cashTendered * 10);
                            } else if (key === '00') {
                              setCashTendered(cashTendered * 100);
                            } else {
                              setCashTendered(Number(String(cashTendered || '') + key) || 0);
                            }
                          }}
                          variant="outline"
                          className="h-11 font-mono text-sm font-black hover:bg-surface hover:border-line-strong"
                          aria-label={`Numpad ${key}`}
                        >
                          {key}
                        </Button>
                      ))}
                    </div>
                    {cashTendered > 0 && cashTendered < selectedWo.totalAmount && (
                      <p className="flex items-center gap-1.5 text-danger font-extrabold text-xs bg-danger/10 border border-danger/30 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Short: {(selectedWo.totalAmount - cashTendered).toLocaleString()} {currency}
                      </p>
                    )}
                    {cashTendered >= selectedWo.totalAmount && (
                      <p className="flex items-center gap-1.5 text-success-deep font-extrabold text-sm bg-success/10 border border-success/30 rounded-xl px-3 py-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-success-deep" />
                        Change Due: {(cashTendered - selectedWo.totalAmount).toLocaleString()} {currency}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => {
                    if (selectedWo) {
                      setPrintableInvoiceWo(selectedWo);
                      setIsInvoiceModalOpen(true);
                    }
                  }}
                  variant="secondary"
                  className="w-full sm:w-1/2 border border-line-strong"
                >
                  <FileText className="w-4 h-4 text-ink shrink-0" />
                  <span className="truncate">Print Itemized Invoice</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isProcessingPayment || isPaymentShort || selectedWo.isPaid}
                  className={`${isMobileCheckoutFullOpen ? 'flex' : 'hidden md:flex'} w-full sm:w-1/2 ${
                    isProcessingPayment
                      ? 'bg-muted text-white opacity-80'
                      : 'bg-success hover:bg-success/90 text-white'
                  }`}
                >
                  {isProcessingPayment ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay & Print Receipt</span>
                    </>
                  )}
                </Button>
              </div></div>

              
            </div>
          ) : (
            <div className="p-12 text-center text-muted flex flex-col items-center justify-center space-y-3 min-h-[380px]">
              <Receipt className="w-12 h-12 text-muted/30" />
              <p className="font-extrabold text-sm text-ink">No Finished Device Selected</p>
              <p className="text-xs max-w-xs text-muted">Finished repairs only — select one to process payment.</p>
            </div>
    )
  );
};
