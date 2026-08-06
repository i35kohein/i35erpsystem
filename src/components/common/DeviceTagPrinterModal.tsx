import React, { useState } from 'react';
import {Printer, 
  X, 
  QrCode, 
  FileText, 
  ShieldCheck, 
  CircleDot, 
  User, 
  Smartphone, 
  Check, 
  Scissors, 
  Phone,
  Globe,
  MapPin} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui';
import { WorkOrder, SystemSettings } from '../../types';

import { get21Diagnostics, get21AfterDiagnostics } from '../../utils/diagnosticUtils';

interface DeviceTagPrinterModalProps {
  workOrder: WorkOrder | null;
  systemSettings?: SystemSettings;
  onClose: () => void;
}

export const DeviceTagPrinterModal: React.FC<DeviceTagPrinterModalProps> = ({
  workOrder,
  systemSettings,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<'3x2_tag' | 'a4_voucher'>('a4_voucher');

  // ESC closes the print modal
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Print layout is centrally managed in System Management → POS & Receipt Layout.
  // The voucher only reads those saved defaults to keep every print consistent.
  const a4ColorMode = systemSettings?.a4PrintColorMode ?? 'monochrome';
  const a4LayoutDensity = systemSettings?.a4PrintLayoutDensity ?? 'compact';
  const showDiagnostics = systemSettings?.a4ShowDiagnosticsTable ?? true;
  const diagDisplayFormat = systemSettings?.a4DiagnosticDisplayFormat ?? 'comparison_table';
  const showPricing = systemSettings?.a4ShowPricingTable ?? true;
  const showTerms = systemSettings?.a4ShowTermsDisclaimer ?? true;
  // The shared receipt text is also used on the A4 voucher so POS receipts and
  // printed intake documents always carry the same shop wording. Keep this
  // separate from the optional A4 layout fields so a saved voucher message can
  // never be hidden by a layout toggle or an empty legacy field.
  const voucherHeaderText = systemSettings?.receiptHeaderTitle?.trim() ||
    systemSettings?.a4CustomHeaderNote?.trim() ||
    'Official Device Intake & Hardware Diagnostic Voucher';
  const voucherFooterText = systemSettings?.receiptFooterNote?.trim() ||
    `Thank you for choosing ${systemSettings?.shopName || 'our repair shop'}.`;
  const voucherFooterTextAlign = systemSettings?.receiptFooterTextAlign ?? 'left';
  const voucherFooterLineAlignments = systemSettings?.receiptFooterLineAlignments ?? {};
  const voucherFooterTextSizeRanges = systemSettings?.receiptFooterTextSizeRanges ?? [];
  const voucherFooterLines = voucherFooterText.split(/\r?\n/);
  const voucherFooterFontSize = systemSettings?.receiptFooterFontSize ?? 'medium';
  const voucherFooterPreviewSizeClass = {
    small: 'text-xs',
    medium: 'text-xs',
    large: 'text-xs',
  }[voucherFooterFontSize];
  const authorizationText = `Customer authorizes ${systemSettings?.shopName || 'the repair shop'} to perform diagnostics and hardware repairs. Please backup data prior to service. Replaced parts warrantied for ${workOrder?.warrantyDays ?? 0} days under standard conditions.`;

  if (!workOrder) return null;

  const shopName = systemSettings?.shopName || 'AppleRepair PRO';
  const shopLogoUrl = systemSettings?.shopLogoUrl || '';
  const shopAddress = systemSettings?.shopAddress || 'Downtown Tech Plaza, Yangon';
  const shopWebsite = systemSettings?.shopWebsite || '';
  const shopPhones = systemSettings?.shopPhones && systemSettings.shopPhones.length > 0 
    ? systemSettings.shopPhones 
    : [systemSettings?.shopPhone || '+95 9 790 000 000'];
  const shopPhoneStr = shopPhones.filter(Boolean).join(' • ');

  // Construct workshop ticket URL encoded inside QR code
  const ticketUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?ticket=${encodeURIComponent(workOrder.orderNumber || workOrder.id)}`
    : `https://applerepair.pro/ticket/${workOrder.orderNumber}`;

  // Build 21 diagnostic items list for BEFORE INTAKE and AFTER QA
  const beforeDiagnosticList = get21Diagnostics(
    workOrder.beforeDiagnostics,
    workOrder.symptomsReported,
    workOrder.intakeChecklist
  );

  const afterDiagnosticList = get21AfterDiagnostics(
    workOrder.afterDiagnostics,
    workOrder.beforeDiagnostics,
    workOrder.symptomsReported,
    workOrder.intakeChecklist
  );
  // New intake tickets do not have a post-repair QA result yet. Keep the
  // printed intake voucher focused on the initial inspection until QA exists.
  const hasAfterQa =
    (workOrder.status === 'Finished' || workOrder.status === 'Taken Out') &&
    Array.isArray(workOrder.afterDiagnostics) &&
    workOrder.afterDiagnostics.length > 0;
  const effectiveDiagDisplayFormat = hasAfterQa ? diagDisplayFormat : 'before_only';
  const printableRepairItems = workOrder.selectedRepairs?.length
    ? workOrder.selectedRepairs.map((item) => ({
        id: item.id,
        name: item.name,
        basePrice: item.basePrice,
        discountPercent: item.discountPercent,
        finalPrice: item.finalPrice,
      }))
    : (workOrder.lineItems || []).map((item) => ({
        id: item.id,
        name: item.description,
        basePrice: item.unitPrice * item.quantity,
        discountPercent: 0,
        finalPrice: item.unitPrice * item.quantity,
      }));

  const handlePrint = () => {
    window.print();
  };

  // Helper renderer for diagnostic status with clean text and icons
  const renderDiagStatus = (status: string, isMono: boolean) => {
    if (status === 'Pass') {
      return (
        <span className={`inline-flex items-center space-x-0.5 font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
          isMono 
            ? 'text-black bg-slate-100 border border-slate-300' 
            : 'text-emerald-800 bg-emerald-50 border border-emerald-200'
        }`}>
          <Check className={`w-3 h-3 ${isMono ? 'text-black' : 'text-emerald-600'} stroke-[2.5]`} />
          <span>PASS</span>
        </span>
      );
    }
    if (status === 'Fail') {
      return (
        <span className={`inline-flex items-center space-x-0.5 font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
          isMono 
            ? 'text-black bg-slate-200 border border-black' 
            : 'text-rose-800 bg-rose-50 border border-rose-200'
        }`}>
          <X className={`w-3 h-3 ${isMono ? 'text-black' : 'text-rose-600'} stroke-[2.5]`} />
          <span>FAIL</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-0.5 font-mono text-xs text-slate-400 font-medium">
        <span>— N/A</span>
      </span>
    );
  };

  // Helper renderer for single A4 Voucher Content
  const renderA4VoucherContent = (copyLabel?: string) => {
    const isMono = a4ColorMode === 'monochrome';

    const isPaidWo = !!workOrder.isPaid;

    return (
      <div className={`a4-voucher-content relative space-y-4 font-sans text-xs ${isMono ? 'text-black' : 'text-slate-900'}`}>
        {/* PAID watermark — large diagonal stamp across the body */}
        {isPaidWo && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
            <div className={`-rotate-[24deg] select-none border-4 px-10 py-3 font-black uppercase tracking-[0.35em] ${
              isMono
                ? 'border-black/20 text-black/25'
                : 'border-success/20 text-success/25'
            }`}
              style={{ fontSize: '64px', lineHeight: 1 }}
            >
              PAID
            </div>
          </div>
        )}

        {/* Top Banner Header */}
        <div className={`a4-voucher-header flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b ${
          isMono ? 'border-black' : 'border-slate-300'
        } gap-3`}>
          <div>
            <div className="flex items-stretch space-x-2.5">
              {shopLogoUrl ? (
                <img 
                  src={shopLogoUrl} 
                  alt={shopName} 
                    className={`print-shop-logo w-10 h-auto min-h-[40px] self-stretch rounded-lg object-contain bg-white border p-0.5 shrink-0 ${
                    isMono ? 'border-black' : 'border-slate-300'
                  }`}
                />
              ) : (
                <div className={`w-8 min-h-[32px] self-stretch rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isMono ? 'bg-black text-white' : 'bg-brand text-white'
                }`}>
                  <CircleDot className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-black text-base text-black tracking-tight">{shopName}</h1>
                  {copyLabel && (
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white font-mono">
                      {copyLabel}
                    </span>
                  )}
                </div>
                <p
                  data-print-voucher-header-text
                  className={`text-xs font-semibold mb-0.5 ${isMono ? 'text-slate-800' : 'text-slate-600'}`}
                >
                  {voucherHeaderText}
                </p>
                {/* Separated Store Address, Website, and Phone Lines */}
                <div className="space-y-0.5 text-xs text-slate-600 font-medium pt-0.5">
                  {shopAddress && (
                    <p className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{shopAddress}</span>
                    </p>
                  )}
                  {shopWebsite && (
                    <p className="flex items-center space-x-1">
                      <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-mono">{shopWebsite}</span>
                    </p>
                  )}
                  {shopPhoneStr && (
                    <p className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Phone: <strong className="text-black font-semibold font-mono">{shopPhoneStr}</strong></span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-left sm:text-right font-mono space-y-0.5">
              <p className={`text-xs font-black ${isMono ? 'text-black' : 'text-brand'}`}>
                Voucher #: {workOrder.orderNumber}
              </p>
              <p className="text-xs text-slate-700">Date: {new Date(workOrder.createdAt).toLocaleDateString()}</p>
              <p className="text-xs text-slate-600">
                Est. Return: {workOrder.estimatedCompletion
                  ? new Date(workOrder.estimatedCompletion).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—'}
              </p>
              {isPaidWo && (
                <p className="text-xs font-bold text-slate-700">
                  Taken Out: {new Date(workOrder.updatedAt || Date.now()).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className={`print-qr p-1.5 bg-white border rounded-lg flex flex-col items-center shrink-0 ${
              isMono ? 'border-black' : 'border-slate-300 shadow-2xs'
            }`}>
              <QRCodeSVG value={ticketUrl} size={a4LayoutDensity === 'compact' ? 40 : 48} level="M" />
              <span className="text-xs font-black text-black uppercase tracking-tight mt-0.5">Check Status</span>
            </div>
          </div>
        </div>

        {/* Customer & Device Information Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer Info */}
          <div className={`a4-info-card p-2.5 rounded-xl border space-y-1 ${
            isMono ? 'bg-slate-50 border-slate-300 text-black' : 'bg-slate-50/70 border-slate-200 text-slate-800'
          }`}>
            <h3 className={`font-extrabold text-xs flex items-center space-x-1.5 border-b pb-1 ${
              isMono ? 'border-slate-300 text-black' : 'border-slate-200 text-slate-800'
            }`}>
              <User className={`w-3.5 h-3.5 ${isMono ? 'text-black' : 'text-brand'}`} />
              <span>Customer Account Details</span>
            </h3>
            <div className="space-y-0.5 text-xs">
              <p><strong>Name:</strong> {workOrder.customerName}</p>
              <p><strong>Phone:</strong> {workOrder.customerPhone}</p>
              <p><strong>Town / City:</strong> {workOrder.customerAddress || ''}</p>
              <p><strong>Account Type:</strong> <span className="font-semibold text-black">{workOrder.customerType}</span></p>
            </div>
          </div>

          {/* Device Info (Passcode omitted for security on printed output) */}
          <div className={`a4-info-card p-2.5 rounded-xl border space-y-1 ${
            isMono ? 'bg-slate-50 border-slate-300 text-black' : 'bg-slate-50/70 border-slate-200 text-slate-800'
          }`}>
            <h3 className={`font-extrabold text-xs flex items-center space-x-1.5 border-b pb-1 ${
              isMono ? 'border-slate-300 text-black' : 'border-slate-200 text-slate-800'
            }`}>
              <Smartphone className={`w-3.5 h-3.5 ${isMono ? 'text-black' : 'text-brand'}`} />
              <span>Hardware Specifications</span>
            </h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
              <p><strong>Model:</strong> {workOrder.deviceModel}</p>
              <p><strong>Color:</strong> {workOrder.deviceColor}</p>
              <p className="font-mono"><strong>S/N:</strong> {workOrder.serialNumber}</p>
              <p className="font-mono"><strong>IMEI:</strong> {workOrder.imei || '—'}</p>
            </div>
          </div>
        </div>

        {/* Selected Repairs & Estimated Charges Table */}
        {showPricing && printableRepairItems.length > 0 && (
          <div className="a4-service-section space-y-1.5">
            <h3 className={`font-extrabold text-xs border-b pb-1 flex justify-between items-center ${
              isMono ? 'border-black text-black' : 'border-slate-300 text-slate-900'
            }`}>
              <span>Requested Hardware Service Items</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="a4-service-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${
                    isMono ? 'bg-slate-100 text-black border-slate-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <th className="p-1.5 font-bold">Repair Item</th>
                    <th className="p-1.5 text-right font-bold">Base Cost</th>
                    <th className="p-1.5 text-right font-bold">Discount</th>
                    <th className="p-1.5 text-right font-bold">Warranty</th>
                    <th className="p-1.5 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isMono ? 'divide-slate-200 text-black' : 'divide-slate-200'}`}>
                  {printableRepairItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-1.5 font-sans font-semibold">{item.name}</td>
                      <td className="p-1.5 text-right">{item.basePrice.toLocaleString()} MMK</td>
                      <td className="p-1.5 text-right">{item.discountPercent}%</td>
                      <td className="p-1.5 text-right">{workOrder.warrantyDays} Days</td>
                      <td className="p-1.5 text-right font-bold">{item.finalPrice.toLocaleString()} MMK</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t font-bold ${isMono ? 'border-black' : 'border-slate-800'}`}>
                    <td colSpan={4} className="p-1.5 text-right font-sans text-xs">Estimated Total Charge:</td>
                    <td className={`p-1.5 text-right text-sm font-mono ${isMono ? 'text-black font-extrabold' : 'text-brand'}`}>
                      {workOrder.subtotal.toLocaleString()} MMK
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 21-POINT HARDWARE DIAGNOSTIC INSPECTION REPORT SECTION (CLEAN BORDERS, PASS/FAIL TEXT & ICONS) */}
        {showDiagnostics && (
          <div className="a4-diagnostic-section space-y-2 pt-1 border-t border-slate-200">
            <div className={`flex flex-wrap justify-between items-center border-b pb-1 gap-1 ${
              isMono ? 'border-slate-400' : 'border-slate-200'
            }`}>
              <h3 className="font-extrabold text-xs text-black flex items-center space-x-1.5">
                <ShieldCheck className={`w-4 h-4 ${isMono ? 'text-black' : 'text-success'}`} />
                <span>{hasAfterQa ? '21-Point Hardware Diagnostic Checklist — Before Intake vs After QA Pass' : '21-Point Hardware Diagnostic Checklist — Before Intake'}</span>
              </h3>
              <div className="flex items-center space-x-2 text-xs font-bold font-mono">
                <span className="bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
                  Before: {beforeDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass
                </span>
                {hasAfterQa && (
                  <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                    After QA: {afterDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass
                  </span>
                )}
              </div>
            </div>

            {/* FORMAT 1: COMPARISON TABLE */}
            {effectiveDiagDisplayFormat === 'comparison_table' && hasAfterQa && (
              <div className="a4-diagnostic-table overflow-x-auto rounded-lg border border-slate-200">
                <table className="a4-diagnostic-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase font-mono ${
                      isMono ? 'bg-slate-100 text-black border-slate-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      <th className="p-1.5 font-bold w-6 text-center">#</th>
                      <th className="p-1.5 font-bold">Diagnostic Item</th>
                      <th className="p-1.5 text-center font-bold">1. Before Intake</th>
                      <th className="p-1.5 text-center font-bold">2. After QA Pass</th>
                      <th className="p-1.5 font-bold">Technician Remarks & Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isMono ? 'divide-slate-200 text-black' : 'divide-slate-200 text-slate-800'}`}>
                    {beforeDiagnosticList.map((beforeItem, idx) => {
                      const afterItem = afterDiagnosticList[idx] || beforeItem;

                      return (
                        <tr key={beforeItem.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                          <td className="p-1.5 font-mono text-slate-400 font-medium text-center">{idx + 1}</td>
                          <td className="p-1.5 font-semibold text-slate-900">{beforeItem.name}</td>
                          <td className="p-1.5 text-center">{renderDiagStatus(beforeItem.status, isMono)}</td>
                          <td className="p-1.5 text-center">{renderDiagStatus(afterItem.status, isMono)}</td>
                          <td className="p-1.5 text-xs text-slate-600 italic">
                            {afterItem.note || beforeItem.note || (beforeItem.status === 'Fail' && afterItem.status === 'Pass' ? 'Repaired & Passed QA' : 'Normal')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* FORMAT 2: DUAL CARDS GRID (SIDE BY SIDE) */}
            {effectiveDiagDisplayFormat === 'dual_grid' && hasAfterQa && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {/* BEFORE INTAKE PANEL */}
                <div className={`p-2 rounded-xl border space-y-1.5 ${isMono ? 'bg-white border-slate-300' : 'bg-slate-50/60 border-slate-200'}`}>
                  <div className="flex justify-between items-center border-b pb-1 border-slate-200">
                    <span className="font-extrabold text-black uppercase tracking-wide">1. Before Repair Intake</span>
                    <span className="font-mono text-xs font-bold">{beforeDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {beforeDiagnosticList.map((item, idx) => (
                      <div key={item.name} className="p-1 rounded border border-slate-200 bg-white flex items-center justify-between">
                        <span className="truncate pr-1"><strong className="font-mono text-slate-400">{idx+1}.</strong> {item.name}</span>
                        {renderDiagStatus(item.status, isMono)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AFTER QA PANEL */}
                <div className={`p-2 rounded-xl border space-y-1.5 ${isMono ? 'bg-white border-slate-300' : 'bg-slate-50/60 border-slate-200'}`}>
                  <div className="flex justify-between items-center border-b pb-1 border-slate-200">
                    <span className="font-extrabold text-black uppercase tracking-wide">2. After Repair QA Pass</span>
                    <span className="font-mono text-xs font-bold">{afterDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {afterDiagnosticList.map((item, idx) => (
                      <div key={item.name} className="p-1 rounded border border-slate-200 bg-white flex items-center justify-between">
                        <span className="truncate pr-1"><strong className="font-mono text-slate-400">{idx+1}.</strong> {item.name}</span>
                        {renderDiagStatus(item.status, isMono)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FORMAT 3: BEFORE INTAKE ONLY */}
            {effectiveDiagDisplayFormat === 'before_only' && (
              <div className="a4-diagnostic-grid grid grid-cols-1 gap-1.5 text-xs">
                {beforeDiagnosticList.map((item, idx) => (
                  <div key={item.name} className="a4-diagnostic-row min-h-[28px] p-1.5 rounded-lg border-0 border-b border-slate-200 bg-white grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_auto] items-center gap-2">
                    <span className="order-1 font-semibold text-black truncate pr-1"><strong className="font-mono text-slate-400">{idx+1}.</strong> {item.name}</span>
                    {item.note && (
                      <span className="order-2 border-l border-slate-200 pl-1 text-xs leading-tight text-slate-600 italic truncate" title={item.note}>Note: {item.note}</span>
                    )}
                    {!item.note && <span className="order-2 block h-[9px]" aria-hidden="true" />}
                    <span className="order-3">{renderDiagStatus(item.status, isMono)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* FORMAT 4: AFTER QA ONLY */}
            {effectiveDiagDisplayFormat === 'after_only' && hasAfterQa && (
              <div className="a4-diagnostic-grid grid grid-cols-1 gap-1.5 text-xs">
                {afterDiagnosticList.map((item, idx) => (
                  <div key={item.name} className="a4-diagnostic-row min-h-[28px] p-1.5 rounded-lg border-0 border-b border-slate-200 bg-white grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_auto] items-center gap-2">
                    <span className="order-1 font-semibold text-black truncate pr-1"><strong className="font-mono text-slate-400">{idx+1}.</strong> {item.name}</span>
                    {item.note && (
                      <span className="order-2 border-l border-slate-200 pl-1 text-xs leading-tight text-slate-600 italic truncate" title={item.note}>Note: {item.note}</span>
                    )}
                    {!item.note && <span className="order-2 block h-[9px]" aria-hidden="true" />}
                    <span className="order-3">{renderDiagStatus(item.status, isMono)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved voucher text always prints. The A4 toggle only controls the
            additional authorization line, not the user's own footer note. */}
        <div className={`a4-terms pt-3 border-t space-y-1 text-xs ${
          isMono ? 'border-slate-400 text-slate-800' : 'border-slate-300 text-slate-600'
        }`}>
          {showTerms && (
            <p className="leading-tight">
              * <strong>Terms & Authorization:</strong> {authorizationText}
            </p>
          )}
          <div
            data-print-voucher-footer-text
            className={`print-voucher-footer-text leading-tight font-medium whitespace-pre-wrap footer-text-${voucherFooterFontSize} ${voucherFooterPreviewSizeClass}`}
          >
            {voucherFooterLines.map((line, lineIndex) => {
              const lineStart = voucherFooterLines.slice(0, lineIndex).reduce((offset, previousLine) => offset + previousLine.length + 1, 0);
              const boundaries = [...new Set([lineStart, lineStart + line.length, ...voucherFooterTextSizeRanges.flatMap((range) => range.start < lineStart + line.length && range.end > lineStart ? [Math.max(lineStart, range.start), Math.min(lineStart + line.length, range.end)] : [])])].sort((a, b) => a - b);
              return <p
                key={`${lineIndex}-${line}`}
                style={{ textAlign: voucherFooterLineAlignments[lineIndex] || voucherFooterTextAlign }}
              >
                {line ? boundaries.slice(0, -1).map((point, index) => {
                  const next = boundaries[index + 1]; const size = voucherFooterTextSizeRanges.find((range) => range.start <= point && range.end >= next)?.size || voucherFooterFontSize;
                  return <span key={`${point}-${next}`} className={`footer-text-${size}`}>{line.slice(point - lineStart, next - lineStart)}</span>;
                }) : '\u00A0'}
              </p>;
            })}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="printable-print-root fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Printable CSS style block with Black & White / Grayscale print overrides */}
      <style>{`
        @media print {
          body > #root > .basic-ui {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: transparent !important;
          }
          /* The voucher can be opened from Settings, Intake, or Pipeline.
             Keep its full ancestor path visible and hide every other main
             descendant. This prevents the background screen and the ticket
             inspector from leaking into the printed A4 document. */
          body:has(.printable-print-root) .basic-ui > *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *),
          body:has(.printable-print-root) main *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *) {
            display: none !important;
          }
          .printable-print-root,
          .printable-print-root .printable-modal-wrapper,
          .printable-print-root #device-tag-printable-content {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
          }
          .printable-print-root,
          #device-tag-printable-content {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
          #device-tag-printable-content > * {
            display: none !important;
          }
          #device-tag-printable-content > .printable-area,
          #device-tag-printable-content > .printable-preview-stage,
          #device-tag-printable-content > *:has(.printable-area) {
            display: block !important;
          }
          #device-tag-printable-content > *:has(.printable-area) > .printable-area {
            margin: 0 auto !important;
          }
          .printable-preview-stage {
            padding: 0 !important;
            min-height: 0 !important;
            background: transparent !important;
            border: none !important;
          }
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
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          .printable-modal-wrapper, .printable-modal-scroll {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            ${a4ColorMode === 'monochrome' ? `
              filter: grayscale(100%) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            ` : ''}
          }
          .tag-printable-area {
            width: 76.2mm !important;
            max-width: 76.2mm !important;
            margin: 0 auto !important;
          }
          /* A4 vouchers are always print-condensed, even when the screen
             preview uses Standard A4. This keeps the full 21-point list on
             one physical A4 sheet without changing the on-screen layout. */
          .a4-voucher-print {
            padding: 2.5mm !important;
            font-size: 8px !important;
            line-height: 1.04 !important;
          }
          .a4-voucher-print > .a4-voucher-content > * + * {
            margin-top: 3px !important;
          }
          .a4-voucher-print .a4-voucher-header {
            gap: 4px !important;
            padding-bottom: 3px !important;
          }
          .a4-voucher-print .a4-voucher-header h1 {
            font-size: 12px !important;
            line-height: 1 !important;
          }
          .a4-voucher-print .a4-voucher-header p {
            font-size: 7px !important;
            line-height: 1.05 !important;
            margin: 1px 0 !important;
          }
          .a4-voucher-print .print-shop-logo {
            width: 34px !important;
            min-height: 34px !important;
            max-height: 34px !important;
          }
          .a4-voucher-print .print-qr {
            padding: 1px !important;
          }
          .a4-voucher-print .print-qr svg {
            width: 34px !important;
            height: 34px !important;
          }
          .a4-voucher-print .print-qr span {
            font-size: 6px !important;
            margin-top: 0 !important;
          }
          .a4-voucher-print .a4-info-card {
            padding: 4px !important;
            border-radius: 3px !important;
            gap: 1px !important;
          }
          .a4-voucher-print .a4-info-card h3 {
            font-size: 8px !important;
            line-height: 1 !important;
            padding-bottom: 2px !important;
            margin-bottom: 1px !important;
          }
          .a4-voucher-print .a4-info-card p {
            font-size: 7.5px !important;
            line-height: 1.06 !important;
            margin: 0 !important;
          }
          .a4-voucher-print .a4-service-section {
            gap: 2px !important;
          }
          .a4-voucher-print .a4-service-section h3 {
            font-size: 8px !important;
            padding-bottom: 2px !important;
          }
          .a4-voucher-print .a4-service-table {
            font-size: 7px !important;
            line-height: 1.04 !important;
          }
          .a4-voucher-print .a4-service-table th,
          .a4-voucher-print .a4-service-table td {
            padding: 1.5px 2px !important;
            line-height: 1.04 !important;
          }
          .a4-voucher-print .a4-diagnostic-section {
            padding-top: 2px !important;
            gap: 2px !important;
          }
          .a4-voucher-print .a4-diagnostic-section > div:first-child {
            padding-bottom: 2px !important;
            gap: 2px !important;
          }
          .a4-voucher-print .a4-diagnostic-section h3 {
            font-size: 8px !important;
            line-height: 1 !important;
          }
          .a4-voucher-print .a4-diagnostic-section h3 svg {
            width: 10px !important;
            height: 10px !important;
          }
          .a4-voucher-print .a4-diagnostic-section > div:first-child > div span {
            font-size: 7px !important;
            padding: 1px 3px !important;
          }
          .a4-voucher-print .a4-diagnostic-grid {
            gap: 0 !important;
          }
          .a4-voucher-print .a4-diagnostic-row {
            min-height: 12px !important;
            padding: 1px 2px !important;
            gap: 3px !important;
            font-size: 7px !important;
            line-height: 1 !important;
            border: none !important;
            border-bottom: 1px solid #d2d2d7 !important;
            border-radius: 0 !important;
            background: transparent !important;
          }
          .a4-voucher-print .a4-diagnostic-row > span:nth-child(2) {
            font-size: 6.5px !important;
            line-height: 1 !important;
            padding-left: 2px !important;
          }
          .a4-voucher-print .a4-diagnostic-row .inline-flex {
            font-size: 7px !important;
            line-height: 9px !important;
            padding: 0 2px !important;
          }
          .a4-voucher-print .a4-diagnostic-row .inline-flex svg {
            width: 7px !important;
            height: 7px !important;
          }
          .a4-voucher-print .a4-diagnostic-table {
            border: none !important;
            font-size: 7px !important;
            line-height: 1 !important;
          }
          .a4-voucher-print .a4-diagnostic-table th,
          .a4-voucher-print .a4-diagnostic-table td {
            padding: 1px 2px !important;
            line-height: 1 !important;
          }
          .a4-voucher-print .a4-diagnostic-table tr {
            height: 11px !important;
            border-bottom: 1px solid #d2d2d7 !important;
          }
          .a4-voucher-print .a4-terms {
            padding-top: 2px !important;
            gap: 0 !important;
            font-size: 7px !important;
            line-height: 1.05 !important;
          }
          .a4-voucher-print .a4-terms p {
            margin: 0 !important;
          }
          .a4-voucher-print .print-voucher-footer-text {
            white-space: pre-wrap !important;
          }
          .a4-voucher-print .print-voucher-footer-text.footer-text-small {
            font-size: 6.5px !important;
          }
          .a4-voucher-print .print-voucher-footer-text.footer-text-medium {
            font-size: 7px !important;
          }
          .a4-voucher-print .print-voucher-footer-text.footer-text-large {
            font-size: 8px !important;
          }
          .a4-voucher-print .print-voucher-footer-text .footer-text-small { font-size: 6.5px !important; }
          .a4-voucher-print .print-voucher-footer-text .footer-text-medium { font-size: 7px !important; }
          .a4-voucher-print .print-voucher-footer-text .footer-text-large { font-size: 8px !important; }
          .a4-voucher-print tr,
          .a4-voucher-print .a4-diagnostic-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .a4-print-compact {
            font-size: 10px !important;
            line-height: 1.15 !important;
            zoom: 1 !important;
          }
          .a4-print-compact > div,
          .a4-print-compact .space-y-5 > :not([hidden]) ~ :not([hidden]),
          .a4-print-compact .space-y-4 > :not([hidden]) ~ :not([hidden]),
          .a4-print-compact .space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 3px !important;
          }
          .a4-print-compact table th,
          .a4-print-compact table td {
            padding: 3px !important;
            line-height: 1.1 !important;
          }
          .a4-print-compact h1 { font-size: 14px !important; }
          .a4-print-compact h3 { font-size: 10px !important; }
          .a4-print-compact .a4-diagnostic-grid { gap: 0 !important; }
          .a4-print-compact .a4-diagnostic-row {
            min-height: 12px !important;
            padding: 1px 2px !important;
            gap: 3px !important;
            font-size: 7px !important;
            border: none !important;
            border-bottom: 1px solid #d2d2d7 !important;
            background: transparent !important;
          }
          .a4-print-compact .a4-diagnostic-table {
            border: none !important;
          }
          .a4-print-compact .a4-diagnostic-table tr {
            border-bottom: 1px solid #d2d2d7 !important;
          }
          .a4-print-compact .a4-diagnostic-table th,
          .a4-print-compact .a4-diagnostic-table td {
            border-left: none !important;
            border-right: none !important;
          }
          .a4-print-compact .print-shop-logo { border: none !important; }
          @page {
            size: ${paperSize === 'a4_voucher' ? 'A4 portrait' : '3in 2in'};
            margin: ${paperSize === 'a4_voucher' ? '3.5mm' : '4mm'};
          }
        }
      `}</style>

      <div className="printable-modal-wrapper bg-white border border-line rounded-2xl w-full max-w-4xl h-[90vh] max-h-[850px] p-4 sm:p-5 space-y-3 text-xs shadow-2xl relative my-auto flex flex-col">
        {/* Header Controls Bar (no-print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 shrink-0 no-print">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-brand" />
            <div>
              <h2 className="text-sm font-extrabold text-ink">Device Intake Print Voucher</h2>
              <p className="text-xs text-muted">A4 Job Sheet & 3"x2" Sticker Tag · Layout set in System Management</p>
            </div>
          </div>

          {/* Header Action Buttons (Aligned to same height and size) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Format Segment */}
            <div className="flex items-center bg-surface p-1 rounded-xl border border-line h-10">
              <Button
                type="button"
                onClick={() => setPaperSize('a4_voucher')}
                variant="ghost"
                size="sm"
                className={`h-8 px-3 ${
                  paperSize === 'a4_voucher' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>A4 Job Voucher</span>
              </Button>

              <Button
                type="button"
                onClick={() => setPaperSize('3x2_tag')}
                variant="ghost"
                size="sm"
                className={`h-8 px-3 ${
                  paperSize === '3x2_tag' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>3"x2" Sticker Tag</span>
              </Button>
            </div>

            <Button
              type="button"
              onClick={onClose}
              variant="iconGhost"
              size="icon"
              className="border border-transparent hover:border-line"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Printable Document Preview */}
        <div id="device-tag-printable-content" className="printable-modal-scroll flex-1 overflow-y-auto pr-1 space-y-4">
          {paperSize === '3x2_tag' ? (
            /* ---------------- 3x2 MONOCHROME STICKER TAG PREVIEW (CENTERED STAGE) ---------------- */
            <div className="printable-preview-stage flex flex-col items-center justify-center p-6 bg-slate-100/70 border border-dashed border-slate-300 rounded-2xl min-h-[380px]">
              <div className="mb-3 flex items-center space-x-2 text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                <QrCode className="w-3.5 h-3.5 text-brand" />
                <span>3" × 2" Device Sticker Tag Preview</span>
              </div>
              <div className="printable-area tag-printable-area bg-white text-black p-4 rounded-xl border-2 border-black font-sans space-y-2 select-none max-w-sm w-full shadow-md">
                <div className="flex justify-between items-start border-b-2 border-black pb-1">
                  <div className="flex items-center space-x-1.5">
                    {shopLogoUrl && (
                      <img src={shopLogoUrl} alt="Logo" className="w-6 h-6 object-contain border border-black p-0.5 rounded shrink-0" />
                    )}
                    <div>
                      <p className="font-black text-sm tracking-tight text-black">{shopName}</p>
                      <p className="font-mono text-xs text-slate-700">Ph: {shopPhones[0] || shopPhoneStr}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="font-mono text-xs font-bold text-black">{workOrder.orderNumber}</p>
                    <span className="text-xs font-black bg-black text-white px-1.5 py-0.5 rounded inline-block">
                      {workOrder.serviceType}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-extrabold text-sm leading-tight text-black">{workOrder.deviceModel}</p>
                  <div className="flex justify-between text-xs gap-2">
                    <span>Cust: <strong className="text-black">{workOrder.customerName}</strong></span>
                    <span className="font-mono">Pass: <strong className="bg-slate-200 text-black px-1 py-0.5 rounded border border-slate-400 font-bold">{workOrder.passcode || 'None'}</strong></span>
                  </div>
                  <div className="flex justify-between text-xs text-black">
                    <span className="font-mono font-semibold">S/N: {workOrder.serialNumber}</span>
                    <span>Color: <strong>{workOrder.deviceColor}</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-black flex items-center justify-between">
                  <div className="font-mono text-center">
                    <div className="h-8 bg-black w-32 flex items-center justify-center text-white text-xs tracking-widest font-mono rounded-sm">
                      |||| | |||||| | ||| | |||
                    </div>
                    <span className="text-xs font-mono text-black">{workOrder.orderNumber}</span>
                  </div>

                  <div className="flex flex-col items-center bg-white p-1 border-2 border-black rounded-md shrink-0">
                    <QRCodeSVG value={ticketUrl} size={46} level="M" />
                    <span className="text-xs font-black text-black uppercase tracking-tight mt-0.5">Check Status</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ---------------- A4 JOB SHEET PREVIEW (STANDARD / COMPACT / DUAL) ---------------- */
            <div className={`printable-area a4-voucher-print ${a4LayoutDensity === 'compact' ? 'a4-print-compact' : ''} bg-white text-black p-5 sm:p-6 rounded-2xl border font-sans space-y-5 shadow-xs transition-all ${
              a4ColorMode === 'monochrome' ? 'border-black grayscale contrast-105' : 'border-line'
            }`}>
              {a4LayoutDensity === 'dual_voucher' ? (
                /* DUAL SPLIT VOUCHER: TOP CUSTOMER COPY + BOTTOM SHOP COPY */
                <div className="space-y-6">
                  {/* Top Customer Copy */}
                  <div className="pb-4 border-b-2 border-dashed border-black relative">
                    {renderA4VoucherContent('CUSTOMER COPY')}
                    
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-3 font-mono text-xs font-black text-slate-800 flex items-center space-x-1 border border-black rounded-full">
                      <Scissors className="w-3 h-3 text-black" />
                      <span>CUT HERE — CUSTOMER COPY / SHOP WORKSHOP COPY</span>
                    </div>
                  </div>

                  {/* Bottom Shop Copy */}
                  <div className="pt-2">
                    {renderA4VoucherContent('SHOP WORKSHOP COPY')}
                  </div>
                </div>
              ) : (
                /* SINGLE PAGE VOUCHER (STANDARD / COMPACT) */
                renderA4VoucherContent()
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls (no-print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line no-print text-xs">
          <div className="flex items-center space-x-2 font-mono text-muted text-xs">
            <span className="font-bold text-ink">
              Mode: {a4ColorMode === 'monochrome' ? 'Black & White Grayscale' : 'Standard Color'}
            </span>
            <span>•</span>
            <span>
              Layout: {a4LayoutDensity === 'dual_voucher' ? 'Dual Cut Voucher' : a4LayoutDensity === 'compact' ? 'Compact A4' : 'Standard A4'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="h-10 px-4"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className={`h-10 px-5 ${
                a4ColorMode === 'monochrome' ? 'bg-black hover:bg-slate-800' : 'bg-brand hover:bg-brand-deep'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{paperSize === 'a4_voucher' ? 'Print / Save PDF' : 'Print Tag Sticker'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
