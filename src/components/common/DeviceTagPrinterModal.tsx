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
  MapPin,
  Loader2} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui';
import { WorkOrder, SystemSettings } from '../../types';

import { get21Diagnostics, get21AfterDiagnostics } from '../../utils/diagnosticUtils';

type FooterSizeRange = { start: number; end: number; size?: 'small' | 'medium' | 'large' };

/**
 * Split footer lines into styled segments from absolute character ranges.
 * Invalid ranges (start >= end / missing bounds) are ignored and ranges are
 * clamped to each line, so a malformed saved range can never drop footer text
 * (audit F-P3). Returns per-line segment lists; size '' means "inherit the
 * container size" (the caller applies the default class on the wrapper).
 */
function applyFooterTextRanges(
  lines: string[],
  ranges: FooterSizeRange[]
): Array<Array<{ text: string; size: 'small' | 'medium' | 'large' | '' }>> {
  const validRanges = (ranges || []).filter(
    (r) => typeof r.start === 'number' && typeof r.end === 'number' && r.start < r.end
  );
  return lines.map((line, lineIndex) => {
    if (!line) return [{ text: '\u00A0', size: '' }];
    const lineStart = lines.slice(0, lineIndex).reduce((offset, previousLine) => offset + previousLine.length + 1, 0);
    const lineEnd = lineStart + line.length;
    const boundaries = [
      ...new Set([
        lineStart,
        lineEnd,
        ...validRanges.flatMap((range) => {
          const start = Math.max(lineStart, range.start);
          const end = Math.min(lineEnd, range.end);
          return start < end ? [start, end] : [];
        }),
      ]),
    ].sort((a, b) => a - b);
    return boundaries.slice(0, -1).map((point, index) => {
      const next = boundaries[index + 1];
      const range = validRanges.find((r) => r.start <= point && r.end >= next);
      return { text: line.slice(point - lineStart, next - lineStart), size: range?.size ?? '' };
    });
  });
}

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
  // Transient "Preparing…" state while the print dialog is open (audit F-P3).
  const [printing, setPrinting] = useState(false);

  // ESC closes the print modal
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Clear the preparing state when the print dialog closes (also on cancel).
  React.useEffect(() => {
    if (!printing) return;
    const clear = () => setPrinting(false);
    window.addEventListener('afterprint', clear);
    return () => window.removeEventListener('afterprint', clear);
  }, [printing]);

  // Print layout is centrally managed in System Management → POS & Receipt Layout.
  // The voucher only reads those saved defaults to keep every print consistent.
  const a4ColorMode = systemSettings?.a4PrintColorMode ?? 'monochrome';
  const a4LayoutDensity = systemSettings?.a4PrintLayoutDensity ?? 'compact';
  const showDiagnostics = systemSettings?.a4ShowDiagnosticsTable ?? true;
  const diagDisplayFormat = systemSettings?.a4DiagnosticDisplayFormat ?? 'simple_checks';
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
    small: 'text-[10px]',
    medium: 'text-xs',
    large: 'text-sm',
  }[voucherFooterFontSize];
  // One date formatter for the whole header block — the old code mixed
  // locale-default and explicit formats, printing two different date shapes
  // on the same voucher (audit F-P2).
  const formatPrintDate = (value?: string | number | Date) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const voucherFooterSegments = applyFooterTextRanges(voucherFooterLines, voucherFooterTextSizeRanges);
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
  // Simple Checks is used regardless of after-QA state (it adapts: shows the
  // After circle only when QA exists) so before-only tickets print in the same
  // style (Ko Hein 2026-08-25). Other formats keep the hasAfterQa gating.
  const effectiveDiagDisplayFormat = diagDisplayFormat === 'simple_checks'
    ? 'simple_checks'
    : (hasAfterQa ? diagDisplayFormat : 'before_only');
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
        // audit F-P3: honor per-item discounts in the fallback so printed rows
        // sum to the shown total instead of contradicting it.
        discountPercent: item.lineItemDiscountPercent || 0,
        finalPrice: Math.round(item.unitPrice * item.quantity * (1 - (item.lineItemDiscountPercent || 0) / 100)),
      }));

  const handlePrint = () => {
    setPrinting(true);
    // Let React flush the "Preparing…" label before the (blocking) dialog opens.
    setTimeout(() => window.print(), 50);
  };

  // Estimated total must match the printed rows — rows show discounted
  // finalPrice, so the total is the discounted sum (was workOrder.subtotal =
  // pre-discount, which contradicted the rows; audit 2026-08-24).
  const estimatedTotal = printableRepairItems.reduce((sum, item) => sum + item.finalPrice, 0);

  // Simple Ticket-style check circle (Ko Hein 2026-08-25): compact circle
  // checkbox + note text on the A4 voucher, mirroring the Simple Ticket form.
  const renderDiagCircle = (status: string, isMono: boolean, label: string) => (
    <span
      title={`${label}: ${status}`}
      aria-label={`${label} ${status}`}
      className={`a4-diag-circle inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border text-[9px] font-black leading-none ${
        status === 'Pass'
          ? isMono ? 'border-black bg-black text-white' : 'border-success bg-success text-white'
          : status === 'Fail'
          ? isMono ? 'border-black bg-white text-black' : 'border-danger bg-danger text-white'
          : 'border-line bg-white'
      }`}
    >
      {status === 'Pass' ? '✓' : status === 'Fail' ? '✕' : ''}
    </span>
  );

  // Helper renderer for diagnostic status with clean text and icons
  const renderDiagStatus = (status: string, isMono: boolean) => {
    if (status === 'Pass') {
      return (
        <span className={`inline-flex items-center space-x-0.5 font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
          isMono 
            ? 'text-black bg-surface border border-line' 
            : 'text-success-deep bg-success/10 border border-success/30'
        }`}>
          <Check className={`w-3 h-3 ${isMono ? 'text-black' : 'text-success'} stroke-[2.5]`} />
          <span>PASS</span>
        </span>
      );
    }
    if (status === 'Fail') {
      return (
        <span className={`inline-flex items-center space-x-0.5 font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
          isMono 
            ? 'text-black bg-line border border-black' 
            : 'text-danger bg-danger/10 border border-danger/30'
        }`}>
          <X className={`w-3 h-3 ${isMono ? 'text-black' : 'text-danger'} stroke-[2.5]`} />
          <span>FAIL</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-0.5 font-mono text-xs text-muted font-medium">
        <span>— N/A</span>
      </span>
    );
  };

  // Helper renderer for single A4 Voucher Content
  const renderA4VoucherContent = (copyLabel?: string) => {
    const isMono = a4ColorMode === 'monochrome';

    const isPaidWo = !!workOrder.isPaid;

    return (
      <div className={`a4-voucher-content relative space-y-4 font-sans text-xs ${isMono ? 'text-black' : 'text-ink'}`}>
        {/* PAID watermark — large diagonal stamp across the body.
            NOTE: avoid the 'inset-0' utility class — the print CSS resets
            '.fixed, .inset-0 { position: static !important }' for modal
            overlays, which made the stamp float to the top of the page in
            print (Ko Hein 2026-08-25). */}
        {isPaidWo && (
          <div className="pointer-events-none absolute top-0 left-0 right-0 bottom-0 z-10 flex items-center justify-center overflow-hidden">
            <div className={`-rotate-[24deg] select-none border-4 px-10 py-3 font-black uppercase tracking-[0.35em] ${
              isMono
                ? 'border-black/20 text-black/25'
                : 'border-success/20 text-success/25'
            }`}
              style={{ fontSize: 'min(64px, 14vw)', lineHeight: 1 }}
            >
              PAID
            </div>
          </div>
        )}

        {/* Top Banner Header */}
        <div className={`a4-voucher-header flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b ${
          isMono ? 'border-black' : 'border-line'
        } gap-3`}>
          <div className="min-w-0">
            <div className="flex items-stretch space-x-2.5">
              {shopLogoUrl ? (
                <img 
                  src={shopLogoUrl} 
                  alt={shopName} 
                    className={`print-shop-logo w-10 h-auto min-h-[40px] self-stretch rounded-lg object-contain bg-white border p-0.5 shrink-0 ${
                    isMono ? 'border-black' : 'border-line'
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
                <div className="flex items-center space-x-2 min-w-0">
                  <h1 className="font-black text-base text-black tracking-tight leading-snug truncate" title={shopName}>{shopName}</h1>
                  {copyLabel && (
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white font-mono">
                      {copyLabel}
                    </span>
                  )}
                </div>
                <p
                  data-print-voucher-header-text
                  className={`text-xs font-semibold mb-0.5 leading-snug ${isMono ? 'text-ink' : 'text-muted'}`}
                >
                  {voucherHeaderText}
                </p>
                {/* Separated Store Address, Website, and Phone Lines */}
                <div className="space-y-0.5 text-xs text-muted font-medium pt-0.5">
                  {shopAddress && (
                    <p className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-muted shrink-0" />
                      <span>{shopAddress}</span>
                    </p>
                  )}
                  {shopWebsite && (
                    <p className="flex items-center space-x-1">
                      <Globe className="w-3 h-3 text-muted shrink-0" />
                      <span className="font-mono">{shopWebsite}</span>
                    </p>
                  )}
                  {shopPhoneStr && (
                    <p className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-muted shrink-0" />
                      <span>Phone: <strong className="text-black font-semibold font-mono">{shopPhoneStr}</strong></span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-left sm:text-right font-mono space-y-0.5 tabular-nums">
              <p className={`text-xs font-black ${isMono ? 'text-black' : 'text-brand'}`}>
                Voucher #: {workOrder.orderNumber}
              </p>
              <p className="text-xs text-muted">Date: {formatPrintDate(workOrder.createdAt)}</p>
              <p className="text-xs text-muted">
                Est. Return: {workOrder.estimatedCompletion ? formatPrintDate(workOrder.estimatedCompletion) : '—'}
              </p>
              {isPaidWo && (
                <p className="text-xs font-bold text-muted">
                  Taken Out: {formatPrintDate(workOrder.updatedAt || Date.now())}
                </p>
              )}
            </div>

            <div className={`print-qr p-1.5 bg-white border rounded-lg flex flex-col items-center shrink-0 ${
              isMono ? 'border-black' : 'border-line shadow-2xs'
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
            isMono ? 'bg-surface border-line text-black' : 'bg-surface/70 border-line text-ink'
          }`}>
            <h3 className={`font-extrabold text-xs flex items-center space-x-1.5 border-b pb-1 ${
              isMono ? 'border-line text-black' : 'border-line text-ink'
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
            isMono ? 'bg-surface border-line text-black' : 'bg-surface/70 border-line text-ink'
          }`}>
            <h3 className={`font-extrabold text-xs flex items-center space-x-1.5 border-b pb-1 ${
              isMono ? 'border-line text-black' : 'border-line text-ink'
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
              isMono ? 'border-black text-black' : 'border-line text-ink'
            }`}>
              <span>Requested Hardware Service Items</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="a4-service-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${
                    isMono ? 'bg-surface text-black border-line' : 'bg-surface text-muted border-line'
                  }`}>
                    <th className="p-1.5 font-bold">Repair Item</th>
                    <th className="p-1.5 text-right font-bold">Base Cost</th>
                    <th className="p-1.5 text-right font-bold">Discount</th>
                    <th className="p-1.5 text-right font-bold">Warranty</th>
                    <th className="p-1.5 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono tabular-nums ${isMono ? 'divide-slate-200 text-black' : 'divide-slate-200'}`}>
                  {printableRepairItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-1.5 font-sans font-semibold">{item.name}</td>
                      <td className="p-1.5 text-right">{item.basePrice.toLocaleString()} MMK</td>
                      <td className="p-1.5 text-right">{item.discountPercent}%</td>
                      <td className="p-1.5 text-right">{workOrder.warrantyDays ?? 0} Days</td>
                      <td className="p-1.5 text-right font-bold">{item.finalPrice.toLocaleString()} MMK</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t font-bold ${isMono ? 'border-black' : 'border-slate-800'}`}>
                    <td colSpan={4} className="p-1.5 text-right font-sans text-xs">Estimated Total Charge:</td>
                    <td className={`p-1.5 text-right text-sm font-mono tabular-nums ${isMono ? 'text-black font-extrabold' : 'text-brand'}`}>
                      {(estimatedTotal || 0).toLocaleString()} MMK
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 21-POINT HARDWARE DIAGNOSTIC INSPECTION REPORT SECTION (CLEAN BORDERS, PASS/FAIL TEXT & ICONS) */}
        {showDiagnostics && (
          <div className="a4-diagnostic-section space-y-2 pt-1 border-t border-line">
            <div className={`flex flex-wrap justify-between items-center border-b pb-1 gap-1 ${
              isMono ? 'border-line-strong' : 'border-line'
            }`}>
              <h3 className="font-extrabold text-xs text-black flex items-center space-x-1.5">
                <ShieldCheck className={`w-4 h-4 ${isMono ? 'text-black' : 'text-success'}`} />
                <span>Device Diagnostic Checklist</span>
              </h3>
              <div className="flex items-center space-x-2 text-xs font-bold font-mono">
                <span className="bg-surface text-muted px-1.5 py-0.5 rounded border border-line">
                  Before {beforeDiagnosticList.filter(d => d.status === 'Pass').length}/21
                </span>
                {hasAfterQa && (
                  <span className="bg-success/10 text-success-deep px-1.5 py-0.5 rounded border border-success/30">
                    After {afterDiagnosticList.filter(d => d.status === 'Pass').length}/21
                  </span>
                )}
              </div>
            </div>

            {/* FORMAT 0: SIMPLE CHECKS — circle checkboxes + note text in a
                bordered box (Simple Ticket style; Ko Hein 2026-08-25) */}
            {effectiveDiagDisplayFormat === 'simple_checks' && (
              <div className="a4-simple-checks rounded-lg border border-line p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-px">
                  {beforeDiagnosticList.map((beforeItem, idx) => {
                    const afterItem = hasAfterQa ? (afterDiagnosticList[idx] || beforeItem) : null;
                    const note = (
                      afterItem?.note || beforeItem.note ||
                      (beforeItem.status === 'Fail' && afterItem?.status === 'Pass' ? 'Repaired & Passed QA' : 'Normal')
                    ).trim();
                    return (
                      <div key={beforeItem.name} className="flex items-center gap-1.5 border-b border-line/70 py-[3px] min-h-[22px]">
                        {renderDiagCircle(beforeItem.status, isMono, 'Before')}
                        {hasAfterQa && renderDiagCircle(afterItem?.status || beforeItem.status, isMono, 'After QA')}
                        <span className="min-w-0 flex-1 truncate font-semibold text-[11px] text-black">
                          <strong className="font-mono text-muted">{idx + 1}.</strong> {beforeItem.name}
                        </span>
                        <span className="shrink-0 max-w-[45%] truncate text-[10px] italic text-muted" title={note}>
                          {note}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FORMAT 1: COMPARISON TABLE */}
            {effectiveDiagDisplayFormat === 'comparison_table' && hasAfterQa && (
              <div className="a4-diagnostic-table overflow-x-auto rounded-lg border border-line">
                <table className="a4-diagnostic-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase font-mono ${
                      isMono ? 'bg-surface text-black border-line' : 'bg-surface text-muted border-line'
                    }`}>
                      <th className="p-1.5 font-bold w-6 text-center">#</th>
                      <th className="p-1.5 font-bold">Diagnostic Item</th>
                      <th className="p-1.5 text-center font-bold">1. Before Intake</th>
                      <th className="p-1.5 text-center font-bold">2. After QA Pass</th>
                      <th className="p-1.5 font-bold">Technician Remarks & Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isMono ? 'divide-slate-200 text-black' : 'divide-slate-200 text-ink'}`}>
                    {beforeDiagnosticList.map((beforeItem, idx) => {
                      const afterItem = afterDiagnosticList[idx] || beforeItem;

                      return (
                        <tr key={beforeItem.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-surface/40'}>
                          <td className="p-1.5 font-mono text-muted font-medium text-center">{idx + 1}</td>
                          <td className="p-1.5 font-semibold text-ink">{beforeItem.name}</td>
                          <td className="p-1.5 text-center">{renderDiagStatus(beforeItem.status, isMono)}</td>
                          <td className="p-1.5 text-center">{renderDiagStatus(afterItem.status, isMono)}</td>
                          <td className="p-1.5 text-xs text-muted italic">
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
                <div className={`p-2 rounded-xl border space-y-1.5 ${isMono ? 'bg-white border-line' : 'bg-surface/60 border-line'}`}>
                  <div className="flex justify-between items-center border-b pb-1 border-line">
                    <span className="font-extrabold text-black uppercase tracking-wide">1. Before Repair Intake</span>
                    <span className="font-mono text-xs font-bold">{beforeDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {beforeDiagnosticList.map((item, idx) => (
                      <div key={item.name} className="p-1 rounded border border-line bg-white flex items-center justify-between">
                        <span className="truncate pr-1"><strong className="font-mono text-muted">{idx+1}.</strong> {item.name}</span>
                        {renderDiagStatus(item.status, isMono)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AFTER QA PANEL */}
                <div className={`p-2 rounded-xl border space-y-1.5 ${isMono ? 'bg-white border-line' : 'bg-surface/60 border-line'}`}>
                  <div className="flex justify-between items-center border-b pb-1 border-line">
                    <span className="font-extrabold text-black uppercase tracking-wide">2. After Repair QA Pass</span>
                    <span className="font-mono text-xs font-bold">{afterDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {afterDiagnosticList.map((item, idx) => (
                      <div key={item.name} className="p-1 rounded border border-line bg-white flex items-center justify-between">
                        <span className="truncate pr-1"><strong className="font-mono text-muted">{idx+1}.</strong> {item.name}</span>
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
                  <div key={item.name} className="a4-diagnostic-row min-h-[28px] p-1.5 rounded-lg border-0 border-b border-line bg-white grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_auto] items-center gap-2">
                    <span className="order-1 font-semibold text-black truncate pr-1"><strong className="font-mono text-muted">{idx+1}.</strong> {item.name}</span>
                    {item.note && (
                      <span className="order-2 border-l border-line pl-1 text-xs leading-tight text-muted italic truncate" title={item.note}>Note: {item.note}</span>
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
                  <div key={item.name} className="a4-diagnostic-row min-h-[28px] p-1.5 rounded-lg border-0 border-b border-line bg-white grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_auto] items-center gap-2">
                    <span className="order-1 font-semibold text-black truncate pr-1"><strong className="font-mono text-muted">{idx+1}.</strong> {item.name}</span>
                    {item.note && (
                      <span className="order-2 border-l border-line pl-1 text-xs leading-tight text-muted italic truncate" title={item.note}>Note: {item.note}</span>
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
          isMono ? 'border-line-strong text-ink' : 'border-line text-muted'
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
            {voucherFooterSegments.map((segments, lineIndex) => (
              <p
                key={lineIndex}
                style={{ textAlign: voucherFooterLineAlignments[lineIndex] || voucherFooterTextAlign }}
              >
                {segments.map((segment, index) => (
                  <span key={index} className={segment.size ? `footer-text-${segment.size}` : undefined}>
                    {segment.text}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="printable-print-root fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
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
            /* audit F-P3: keep the sticker on ONE 2-inch sheet — never split
               across pages, and compress spacing so it fits 2in height. */
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding: 2mm !important;
            font-size: 8.5px !important;
            line-height: 1.05 !important;
          }
          .tag-printable-area p,
          .tag-printable-area div {
            font-size: 8.5px !important;
            line-height: 1.05 !important;
          }
          .tag-printable-area .font-black.text-sm {
            font-size: 9px !important;
          }
          .tag-printable-area svg {
            width: 30px !important;
            height: 30px !important;
          }
          .tag-printable-area .h-8 {
            height: 20px !important;
          }
          /* A4 vouchers print at (near) preview scale — the on-screen Standard A4
             layout is what the customer should receive, not a receipt-like
             compressed sheet (Ko Hein 2026-08-24: 'preview ပြထားသလို လှလှလေး
             print မထွက်ဘူး'). Sections never split mid-way; if the 21-point
             checklist overflows, it flows cleanly onto page 2. */
          .a4-voucher-print {
            padding: 5mm !important;
            /* Full preview scale — A4 has room and the customer-facing voucher
               should read comfortably on paper (Ko Hein 2026-08-25: fonts were
               too small). */
            font-size: 12.5px !important;
            line-height: 1.35 !important;
          }
          .a4-voucher-print > .a4-voucher-content > * + * {
            margin-top: 10px !important;
          }
          .a4-voucher-print .a4-voucher-header,
          .a4-voucher-print .a4-info-card,
          .a4-voucher-print .a4-service-section,
          .a4-voucher-print .a4-terms {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .a4-voucher-print .a4-diagnostic-section {
            break-inside: auto !important;
          }
          .a4-voucher-print .a4-diagnostic-row {
            min-height: 20px !important;
            padding: 4px 5px !important;
            gap: 5px !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          .a4-voucher-print .a4-service-table {
            font-size: 11.5px !important;
          }
          .a4-voucher-print .a4-service-table th,
          .a4-voucher-print .a4-service-table td {
            padding: 4px 6px !important;
          }
          .a4-voucher-print tr,
          .a4-voucher-print .a4-diagnostic-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Layout density setting (System Management) still has a mild effect:
             compact tightens slightly, standard prints at full preview scale. */
          .a4-print-compact {
            font-size: 11.5px !important;
            line-height: 1.3 !important;
          }
          .a4-print-compact .a4-diagnostic-row {
            min-height: 18px !important;
            padding: 3px 4px !important;
            font-size: 10.5px !important;
          }
          .a4-print-compact .a4-service-table {
            font-size: 10.5px !important;
          }
          .a4-print-compact h1 { font-size: 17px !important; }
          .a4-print-compact h3 { font-size: 12px !important; }
          .a4-print-compact .a4-info-card p { font-size: 11px !important; }
          .a4-print-compact .print-shop-logo { border: none !important; }
          /* Simple Checks diagnostic format — compact circle rows (Ko Hein 2026-08-25) */
          .a4-voucher-print .a4-simple-checks {
            font-size: 11px !important;
            padding: 2.5mm !important;
          }
          .a4-voucher-print .a4-simple-checks > div > div {
            min-height: 19px !important;
            padding: 3px 0 !important;
            gap: 6px !important;
          }
          .a4-voucher-print .a4-simple-checks .a4-diag-circle {
            width: 14px !important;
            height: 14px !important;
            font-size: 9px !important;
          }
          .a4-voucher-print .a4-simple-checks > div > div > span:last-child {
            font-size: 10px !important;
          }
          @page {
            size: ${paperSize === 'a4_voucher' ? 'A4 portrait' : '3in 2in'};
            /* audit F-P3: zero margin for the 3x2 sticker — a 4mm margin left
               only ~2.69in x 1.69in of printable area, clipping the 3in-wide
               tag and spilling onto a second sheet. Printers that need margins
               apply them via driver settings. */
            margin: ${paperSize === 'a4_voucher' ? '3.5mm' : '0'};
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
              className="hover:bg-surface"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Printable Document Preview */}
        <div id="device-tag-printable-content" className="printable-modal-scroll flex-1 overflow-y-auto pr-1 space-y-4">
          {paperSize === '3x2_tag' ? (
            /* ---------------- 3x2 MONOCHROME STICKER TAG PREVIEW (CENTERED STAGE) ---------------- */
            <div className="printable-preview-stage flex flex-col items-center justify-center p-6 bg-surface/70 border border-dashed border-line rounded-2xl min-h-[380px]">
              <div className="mb-3 flex items-center space-x-2 text-xs font-bold text-muted bg-white px-3 py-1 rounded-full border border-line shadow-2xs">
                <QrCode className="w-3.5 h-3.5 text-brand" />
                <span>3" × 2" Device Sticker Tag Preview</span>
              </div>
              <div className="printable-area tag-printable-area bg-white text-black p-4 rounded-xl border-2 border-black font-sans space-y-2 select-none max-w-sm w-full shadow-md">
                <div className="flex justify-between items-start border-b-2 border-black pb-1">
                  <div className="flex items-center space-x-1.5">
                    {shopLogoUrl && (
                      <img src={shopLogoUrl} alt={shopName} className="w-6 h-6 object-contain border border-black p-0.5 rounded shrink-0" />
                    )}
                    <div>
                      <p className="font-black text-sm tracking-tight text-black">{shopName}</p>
                      <p className="font-mono text-xs text-muted">Ph: {shopPhones[0] || shopPhoneStr}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="font-mono text-xs font-bold text-black">{workOrder.orderNumber}</p>
                    <span className="max-w-[110px] truncate text-xs font-black bg-black text-white px-1.5 py-0.5 rounded inline-block" title={(workOrder.selectedRepairs || []).map((r) => r.name).join(', ') || workOrder.serviceType}>
                      {(workOrder.selectedRepairs || []).map((r) => r.name).filter(Boolean).join(', ') || workOrder.serviceType}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-extrabold text-sm leading-tight text-black">{workOrder.deviceModel}</p>
                  <div className="flex justify-between text-xs gap-2">
                    <span>Cust: <strong className="text-black">{workOrder.customerName}</strong></span>
                    <span className="font-mono">Pass: <strong className="bg-line text-black px-1 py-0.5 rounded border border-line-strong font-bold">{workOrder.passcode || 'None'}</strong></span>
                  </div>
                  <div className="flex justify-between text-xs text-black">
                    <span className="font-mono font-semibold">S/N: {workOrder.serialNumber}</span>
                    <span>Color: <strong>{workOrder.deviceColor}</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-black flex items-center justify-between">
                  <div className="font-mono text-center">
                    {/* Decorative S/N barcode — NOT scannable (audit F-P2): styled as
                        a dashed placeholder so customers don't try to scan it. The
                        scannable code on the sticker is the QR on the right. */}
                    <div
                      aria-hidden="true"
                      className="h-8 w-32 flex items-center justify-center rounded-sm border border-dashed border-black/50 bg-black/5 text-[9px] tracking-widest text-black/40 font-mono select-none"
                    >
                      |||| | |||||| | ||| | |||
                    </div>
                    <span className="text-xs font-mono text-black">{workOrder.orderNumber}</span>
                    <span className="block text-[7px] uppercase tracking-wide text-black/50">S/N lookup</span>
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
                    
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-3 font-mono text-xs font-black text-ink flex items-center space-x-1 border border-black rounded-full">
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
              disabled={printing}
              className={`h-10 px-5 ${
                a4ColorMode === 'monochrome' ? 'bg-black hover:bg-slate-800' : 'bg-brand hover:bg-brand-deep'
              }`}
            >
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{printing ? 'Preparing…' : paperSize === 'a4_voucher' ? 'Print / Save PDF' : 'Print Tag Sticker'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
