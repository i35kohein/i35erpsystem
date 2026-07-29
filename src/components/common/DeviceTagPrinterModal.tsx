import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  QrCode, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  CircleDot, 
  User, 
  Smartphone, 
  Sliders, 
  Check, 
  Scissors, 
  Palette, 
  Layout, 
  Eye, 
  EyeOff,
  Building2,
  CheckCircle2,
  Phone,
  Globe,
  MapPin
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { WorkOrder, SystemSettings } from '../../types';
import { DIAGNOSTIC_NAMES } from '../intake/deviceData';
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
  
  // A4 Print Customization States (defaulting to Black & White / Monochrome for crisp ink-saving output)
  const [a4ColorMode, setA4ColorMode] = useState<'monochrome' | 'color'>(
    systemSettings?.a4PrintColorMode || 'monochrome'
  );
  const [a4LayoutDensity, setA4LayoutDensity] = useState<'standard' | 'compact' | 'dual_voucher'>(
    systemSettings?.a4PrintLayoutDensity || 'standard'
  );
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(
    systemSettings?.a4ShowDiagnosticsTable ?? true
  );
  const [diagDisplayFormat, setDiagDisplayFormat] = useState<'comparison_table' | 'dual_grid' | 'before_only' | 'after_only'>('comparison_table');

  const [showPricing, setShowPricing] = useState<boolean>(
    systemSettings?.a4ShowPricingTable ?? true
  );
  const [showTerms, setShowTerms] = useState<boolean>(
    systemSettings?.a4ShowTermsDisclaimer ?? true
  );
  const [customHeaderNote, setCustomHeaderNote] = useState<string>(
    systemSettings?.a4CustomHeaderNote || 'Official Device Intake & Hardware Diagnostic Voucher'
  );

  const [showA4SettingsPanel, setShowA4SettingsPanel] = useState<boolean>(false);

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

  const handlePopoutPrint = () => {
    const el = document.getElementById('device-tag-printable-content');
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Job Voucher - ${workOrder.orderNumber}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #fff; color: #000; }
              .no-print { display: none !important; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 6px; border-bottom: 1px solid #e5e5ea; }
              @page { size: ${paperSize === 'a4_voucher' ? 'A4 portrait' : '3in 2in'}; margin: 6mm; }
            </style>
          </head>
          <body>
            ${el.outerHTML}
            <script>
              setTimeout(() => {
                window.print();
              }, 250);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct print blocked, using popout print fallback', err);
      handlePopoutPrint();
    }
  };

  // Helper renderer for diagnostic status with clean text and icons
  const renderDiagStatus = (status: string, isMono: boolean) => {
    if (status === 'Pass') {
      return (
        <span className={`inline-flex items-center space-x-0.5 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
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
        <span className={`inline-flex items-center space-x-0.5 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
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
      <span className="inline-flex items-center space-x-0.5 font-mono text-[9px] text-slate-400 font-medium">
        <span>— N/A</span>
      </span>
    );
  };

  // Helper renderer for single A4 Voucher Content
  const renderA4VoucherContent = (copyLabel?: string) => {
    const isMono = a4ColorMode === 'monochrome';

    return (
      <div className={`space-y-4 font-sans text-xs ${isMono ? 'text-black' : 'text-slate-900'}`}>
        {/* Top Banner Header */}
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b ${
          isMono ? 'border-black' : 'border-slate-300'
        } gap-3`}>
          <div>
            <div className="flex items-center space-x-2.5">
              {shopLogoUrl ? (
                <img 
                  src={shopLogoUrl} 
                  alt={shopName} 
                  className={`w-10 h-10 rounded-lg object-contain bg-white border p-0.5 shrink-0 ${
                    isMono ? 'border-black' : 'border-slate-300'
                  }`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isMono ? 'bg-black text-white' : 'bg-[#0071E3] text-white'
                }`}>
                  <CircleDot className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-black text-base text-black tracking-tight">{shopName}</h1>
                  {copyLabel && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white font-mono">
                      {copyLabel}
                    </span>
                  )}
                </div>
                {customHeaderNote && (
                  <p className={`text-[10px] font-semibold mb-0.5 ${isMono ? 'text-slate-800' : 'text-slate-600'}`}>
                    {customHeaderNote}
                  </p>
                )}
                {/* Separated Store Address, Website, and Phone Lines */}
                <div className="space-y-0.5 text-[9.5px] text-slate-600 font-medium pt-0.5">
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
              <p className={`text-xs font-black ${isMono ? 'text-black' : 'text-[#0071E3]'}`}>
                Voucher #: {workOrder.orderNumber}
              </p>
              <p className="text-[11px] text-slate-700">Date: {new Date(workOrder.createdAt).toLocaleDateString()}</p>
              <p className="text-[10px] text-slate-600">Est. Return: {workOrder.estimatedCompletion}</p>
            </div>

            <div className={`p-1.5 bg-white border rounded-lg flex flex-col items-center shrink-0 ${
              isMono ? 'border-black' : 'border-slate-300 shadow-2xs'
            }`}>
              <QRCodeSVG value={ticketUrl} size={a4LayoutDensity === 'compact' ? 40 : 48} level="M" />
              <span className="text-[7.5px] font-black text-black uppercase tracking-tight mt-0.5">Check Status</span>
            </div>
          </div>
        </div>

        {/* Customer & Device Information Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer Info */}
          <div className={`p-2.5 rounded-xl border space-y-1 ${
            isMono ? 'bg-slate-50 border-slate-300 text-black' : 'bg-slate-50/70 border-slate-200 text-slate-800'
          }`}>
            <h3 className={`font-extrabold text-xs flex items-center space-x-1.5 border-b pb-1 ${
              isMono ? 'border-slate-300 text-black' : 'border-slate-200 text-slate-800'
            }`}>
              <User className={`w-3.5 h-3.5 ${isMono ? 'text-black' : 'text-[#0071E3]'}`} />
              <span>Customer Account Details</span>
            </h3>
            <div className="space-y-0.5 text-[11px]">
              <p><strong>Name:</strong> {workOrder.customerName}</p>
              <p><strong>Phone:</strong> {workOrder.customerPhone}</p>
              <p><strong>Town / City:</strong> {workOrder.customerAddress || 'Yangon'}</p>
              <p><strong>Account Type:</strong> <span className="font-semibold text-black">{workOrder.customerType}</span></p>
            </div>
          </div>

          {/* Device Info (Passcode omitted for security on printed output) */}
          <div className={`p-2.5 rounded-xl border space-y-1 ${
            isMono ? 'bg-slate-50 border-slate-300 text-black' : 'bg-slate-50/70 border-slate-200 text-slate-800'
          }`}>
            <h3 className={`font-extrabold text-xs flex items-center space-x-1.5 border-b pb-1 ${
              isMono ? 'border-slate-300 text-black' : 'border-slate-200 text-slate-800'
            }`}>
              <Smartphone className={`w-3.5 h-3.5 ${isMono ? 'text-black' : 'text-[#0071E3]'}`} />
              <span>Hardware Specifications</span>
            </h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
              <p><strong>Model:</strong> {workOrder.deviceModel}</p>
              <p><strong>Color:</strong> {workOrder.deviceColor}</p>
              <p className="font-mono"><strong>S/N:</strong> {workOrder.serialNumber}</p>
              <p><strong>Find My:</strong> {workOrder.findMyStatus}</p>
              <p><strong>Warranty:</strong> {workOrder.warrantyDays} Days</p>
            </div>
          </div>
        </div>

        {/* Selected Repairs & Estimated Charges Table */}
        {showPricing && workOrder.selectedRepairs && workOrder.selectedRepairs.length > 0 && (
          <div className="space-y-1.5">
            <h3 className={`font-extrabold text-xs border-b pb-1 flex justify-between items-center ${
              isMono ? 'border-black text-black' : 'border-slate-300 text-slate-900'
            }`}>
              <span>Requested Hardware Service Items</span>
              <span className={`font-mono ${isMono ? 'text-black font-bold' : 'text-[#0071E3]'}`}>Currency: MMK</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className={`border-b ${
                    isMono ? 'bg-slate-100 text-black border-slate-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <th className="p-1.5 font-bold">Repair Item Description</th>
                    <th className="p-1.5 text-right font-bold">Base Cost</th>
                    <th className="p-1.5 text-right font-bold">Discount</th>
                    <th className="p-1.5 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isMono ? 'divide-slate-200 text-black' : 'divide-slate-200'}`}>
                  {workOrder.selectedRepairs.map((item) => (
                    <tr key={item.id}>
                      <td className="p-1.5 font-sans font-semibold">{item.name}</td>
                      <td className="p-1.5 text-right">{item.basePrice.toLocaleString()} MMK</td>
                      <td className="p-1.5 text-right">{item.discountPercent}%</td>
                      <td className="p-1.5 text-right font-bold">{item.finalPrice.toLocaleString()} MMK</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t font-bold ${isMono ? 'border-black' : 'border-slate-800'}`}>
                    <td colSpan={3} className="p-1.5 text-right font-sans text-xs">Estimated Total Charge:</td>
                    <td className={`p-1.5 text-right text-sm font-mono ${isMono ? 'text-black font-extrabold' : 'text-[#0071E3]'}`}>
                      {workOrder.subtotal.toLocaleString()} MMK
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Reported Symptoms */}
        {workOrder.symptomsReported && (
          <div className={`p-2 border rounded-xl space-y-0.5 text-[11px] ${
            isMono ? 'bg-slate-100 border-slate-400 text-black' : 'bg-amber-50/70 border-amber-200 text-slate-800'
          }`}>
            <p className="font-bold text-black">Customer Reported Symptoms & Notes:</p>
            <p className="italic text-slate-800">{workOrder.symptomsReported}</p>
          </div>
        )}

        {/* 21-POINT HARDWARE DIAGNOSTIC INSPECTION REPORT SECTION (CLEAN BORDERS, PASS/FAIL TEXT & ICONS) */}
        {showDiagnostics && (
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <div className={`flex flex-wrap justify-between items-center border-b pb-1 gap-1 ${
              isMono ? 'border-slate-400' : 'border-slate-200'
            }`}>
              <h3 className="font-extrabold text-xs text-black flex items-center space-x-1.5">
                <ShieldCheck className={`w-4 h-4 ${isMono ? 'text-black' : 'text-[#34C759]'}`} />
                <span>21-Point Hardware Diagnostic Checklist — 1. Before Intake vs 2. After QA Pass</span>
              </h3>
              <div className="flex items-center space-x-2 text-[10px] font-bold font-mono">
                <span className="bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
                  Before: {beforeDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass
                </span>
                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                  After QA: {afterDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass
                </span>
              </div>
            </div>

            {/* FORMAT 1: COMPARISON TABLE */}
            {diagDisplayFormat === 'comparison_table' && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className={`border-b text-[9.5px] uppercase font-mono ${
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
                          <td className="p-1.5 text-[9px] text-slate-600 italic">
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
            {diagDisplayFormat === 'dual_grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                {/* BEFORE INTAKE PANEL */}
                <div className={`p-2 rounded-xl border space-y-1.5 ${isMono ? 'bg-white border-slate-300' : 'bg-slate-50/60 border-slate-200'}`}>
                  <div className="flex justify-between items-center border-b pb-1 border-slate-200">
                    <span className="font-extrabold text-black uppercase tracking-wide">1. Before Repair Intake</span>
                    <span className="font-mono text-[9px] font-bold">{beforeDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass</span>
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
                    <span className="font-mono text-[9px] font-bold">{afterDiagnosticList.filter(d => d.status === 'Pass').length}/21 Pass</span>
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
            {diagDisplayFormat === 'before_only' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[10px]">
                {beforeDiagnosticList.map((item, idx) => (
                  <div key={item.name} className="p-1 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                    <span className="font-semibold text-black truncate pr-1"><strong className="font-mono text-slate-400">{idx+1}.</strong> {item.name}</span>
                    {renderDiagStatus(item.status, isMono)}
                  </div>
                ))}
              </div>
            )}

            {/* FORMAT 4: AFTER QA ONLY */}
            {diagDisplayFormat === 'after_only' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[10px]">
                {afterDiagnosticList.map((item, idx) => (
                  <div key={item.name} className="p-1 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                    <span className="font-semibold text-black truncate pr-1"><strong className="font-mono text-slate-400">{idx+1}.</strong> {item.name}</span>
                    {renderDiagStatus(item.status, isMono)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Signature & Disclaimer Footer */}
        {showTerms && (
          <div className={`pt-3 border-t space-y-2 text-[10px] ${
            isMono ? 'border-slate-400 text-slate-800' : 'border-slate-300 text-slate-600'
          }`}>
            <p className="leading-tight">
              * <strong>Terms & Authorization:</strong> Customer authorizes {shopName} to perform diagnostics and hardware repairs. Please backup data prior to service. Replaced parts warrantied for {workOrder.warrantyDays} days under standard conditions.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Printable CSS style block with Black & White / Grayscale print overrides */}
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
          @page {
            size: ${paperSize === 'a4_voucher' ? 'A4 portrait' : '3in 2in'};
            margin: 6mm;
          }
        }
      `}</style>

      <div className="printable-modal-wrapper bg-white border border-[#E5E5EA] rounded-2xl w-full max-w-4xl h-[90vh] max-h-[850px] p-4 sm:p-5 space-y-3 text-xs shadow-2xl relative my-auto flex flex-col">
        {/* Header Controls Bar (no-print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5EA] pb-3 shrink-0 no-print">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-[#0071E3]" />
            <div>
              <h2 className="text-sm font-extrabold text-[#1D1D1F]">Device Intake Print Voucher</h2>
              <p className="text-[11px] text-[#86868B]">Customizable A4 Job Sheet & 3"x2" Sticker Tag</p>
            </div>
          </div>

          {/* Header Action Buttons (Aligned to same height and size) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Format Segment */}
            <div className="flex items-center bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] h-9">
              <button
                type="button"
                onClick={() => setPaperSize('a4_voucher')}
                className={`h-7 flex items-center space-x-1.5 px-3 rounded-lg font-bold text-xs transition-all ${
                  paperSize === 'a4_voucher' ? 'bg-[#0071E3] text-white shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>A4 Job Voucher</span>
              </button>

              <button
                type="button"
                onClick={() => setPaperSize('3x2_tag')}
                className={`h-7 flex items-center space-x-1.5 px-3 rounded-lg font-bold text-xs transition-all ${
                  paperSize === '3x2_tag' ? 'bg-[#0071E3] text-white shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>3"x2" Sticker Tag</span>
              </button>
            </div>

            {/* Customization Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setShowA4SettingsPanel(!showA4SettingsPanel)}
              className={`h-9 px-3 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition-all ${
                showA4SettingsPanel
                  ? 'bg-[#0071E3] text-white border-[#0071E3]'
                  : 'bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#E5E5EA]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>Customize Settings</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] rounded-xl hover:bg-[#F5F5F7] transition-colors border border-transparent hover:border-[#E5E5EA]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Settings Customization Drawer */}
        {showA4SettingsPanel && (
          <div className="bg-[#F8FBFD] p-3.5 rounded-xl border border-[#0071E3]/30 space-y-3 text-xs shrink-0 no-print animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
              <span className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Print Voucher & Layout Customization Settings</span>
              </span>
              <span className="text-[10px] text-[#86868B]">Changes apply immediately to preview and print output</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Color Mode & Theme Selector */}
              <div>
                <label className="text-[11px] font-bold text-[#1D1D1F] block mb-1 flex items-center space-x-1">
                  <Palette className="w-3 h-3 text-[#0071E3]" />
                  <span>Color Mode</span>
                </label>
                <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-lg border border-[#D2D2D7]">
                  <button
                    type="button"
                    onClick={() => setA4ColorMode('color')}
                    className={`py-1 flex items-center justify-center space-x-1 text-[11px] font-bold rounded-md transition-all ${
                      a4ColorMode === 'color' ? 'bg-[#0071E3] text-white' : 'text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    <Palette className="w-3 h-3 shrink-0" />
                    <span>Color</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setA4ColorMode('monochrome')}
                    className={`py-1 flex items-center justify-center space-x-1 text-[11px] font-bold rounded-md transition-all ${
                      a4ColorMode === 'monochrome' ? 'bg-black text-white' : 'text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    <CircleDot className="w-3 h-3 shrink-0" />
                    <span>Grey Mode</span>
                  </button>
                </div>
              </div>

              {/* Layout Density Selector */}
              <div>
                <label className="text-[11px] font-bold text-[#1D1D1F] block mb-1 flex items-center space-x-1">
                  <Layout className="w-3 h-3 text-[#0071E3]" />
                  <span>A4 Sheet Layout</span>
                </label>
                <select
                  value={a4LayoutDensity}
                  onChange={(e) => setA4LayoutDensity(e.target.value as any)}
                  className="w-full bg-white text-[#1D1D1F] font-bold px-2 py-1.5 rounded-lg border border-[#D2D2D7] text-xs focus:outline-none"
                >
                  <option value="standard">Standard Single A4 Page</option>
                  <option value="compact">Compact Single A4 Page</option>
                  <option value="dual_voucher">Dual Voucher (Cust + Shop Copy)</option>
                </select>
              </div>

              {/* 21 Diag Format Selector */}
              <div>
                <label className="text-[11px] font-bold text-[#1D1D1F] block mb-1 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#0071E3]" />
                  <span>21 Diag Print Format</span>
                </label>
                <select
                  value={diagDisplayFormat}
                  onChange={(e) => setDiagDisplayFormat(e.target.value as any)}
                  className="w-full bg-white text-[#1D1D1F] font-bold px-2 py-1.5 rounded-lg border border-[#D2D2D7] text-xs focus:outline-none"
                >
                  <option value="comparison_table">Before vs After Table</option>
                  <option value="dual_grid">Before & After Dual Cards</option>
                  <option value="before_only">Before Repair Only</option>
                  <option value="after_only">After QA Pass Only</option>
                </select>
              </div>

              {/* Custom Header Subtitle */}
              <div>
                <label className="text-[11px] font-bold text-[#1D1D1F] block mb-1 flex items-center space-x-1">
                  <Building2 className="w-3 h-3 text-[#0071E3]" />
                  <span>Voucher Header Subtitle</span>
                </label>
                <input
                  type="text"
                  value={customHeaderNote}
                  onChange={(e) => setCustomHeaderNote(e.target.value)}
                  className="w-full bg-white text-[#1D1D1F] font-semibold px-2 py-1.5 rounded-lg border border-[#D2D2D7] text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Toggle Section Display Switches */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border flex items-center space-x-1 transition-all ${
                  showDiagnostics ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {showDiagnostics ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>21-Point Diagnostics ({showDiagnostics ? 'SHOW' : 'HIDE'})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPricing(!showPricing)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border flex items-center space-x-1 transition-all ${
                  showPricing ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {showPricing ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>Repair Costs ({showPricing ? 'SHOW' : 'HIDE'})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border flex items-center space-x-1 transition-all ${
                  showTerms ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {showTerms ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>Terms & Notes ({showTerms ? 'SHOW' : 'HIDE'})</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Printable Document Preview */}
        <div id="device-tag-printable-content" className="printable-modal-scroll flex-1 overflow-y-auto pr-1 space-y-4">
          {paperSize === '3x2_tag' ? (
            /* ---------------- 3x2 MONOCHROME STICKER TAG PREVIEW (CENTERED STAGE) ---------------- */
            <div className="flex flex-col items-center justify-center p-6 bg-slate-100/70 border border-dashed border-slate-300 rounded-2xl min-h-[380px]">
              <div className="mb-3 flex items-center space-x-2 text-[11px] font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                <QrCode className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>3" × 2" Device Sticker Tag Preview</span>
              </div>
              <div className="printable-area bg-white text-black p-4 rounded-xl border-2 border-black font-sans space-y-2 select-none max-w-sm w-full shadow-md">
                <div className="flex justify-between items-start border-b-2 border-black pb-1">
                  <div className="flex items-center space-x-1.5">
                    {shopLogoUrl && (
                      <img src={shopLogoUrl} alt="Logo" className="w-6 h-6 object-contain border border-black p-0.5 rounded shrink-0" />
                    )}
                    <div>
                      <p className="font-black text-sm tracking-tight text-black">{shopName}</p>
                      <p className="font-mono text-[9px] text-slate-700">Ph: {shopPhones[0] || shopPhoneStr}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="font-mono text-xs font-bold text-black">{workOrder.orderNumber}</p>
                    <span className="text-[9px] font-black bg-black text-white px-1.5 py-0.5 rounded inline-block">
                      {workOrder.serviceType}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-extrabold text-sm leading-tight text-black">{workOrder.deviceModel}</p>
                  <div className="flex justify-between text-[11px] gap-2">
                    <span>Cust: <strong className="text-black">{workOrder.customerName}</strong></span>
                    <span className="font-mono">Pass: <strong className="bg-slate-200 text-black px-1 py-0.5 rounded border border-slate-400 font-bold">{workOrder.passcode || 'None'}</strong></span>
                  </div>
                  <div className="flex justify-between text-[10px] text-black">
                    <span className="font-mono font-semibold">S/N: {workOrder.serialNumber}</span>
                    <span>Color: <strong>{workOrder.deviceColor}</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-black flex items-center justify-between">
                  <div className="font-mono text-center">
                    <div className="h-8 bg-black w-32 flex items-center justify-center text-white text-[9px] tracking-widest font-mono rounded-sm">
                      |||| | |||||| | ||| | |||
                    </div>
                    <span className="text-[9px] font-mono text-black">{workOrder.orderNumber}</span>
                  </div>

                  <div className="flex flex-col items-center bg-white p-1 border-2 border-black rounded-md shrink-0">
                    <QRCodeSVG value={ticketUrl} size={46} level="M" />
                    <span className="text-[7.5px] font-black text-black uppercase tracking-tight mt-0.5">Check Status</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ---------------- A4 JOB SHEET PREVIEW (STANDARD / COMPACT / DUAL) ---------------- */
            <div className={`printable-area bg-white text-black p-5 sm:p-6 rounded-2xl border font-sans space-y-5 shadow-xs transition-all ${
              a4ColorMode === 'monochrome' ? 'border-black grayscale contrast-105' : 'border-[#E5E5EA]'
            }`}>
              {a4LayoutDensity === 'dual_voucher' ? (
                /* DUAL SPLIT VOUCHER: TOP CUSTOMER COPY + BOTTOM SHOP COPY */
                <div className="space-y-6">
                  {/* Top Customer Copy */}
                  <div className="pb-4 border-b-2 border-dashed border-black relative">
                    {renderA4VoucherContent('CUSTOMER COPY')}
                    
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-3 font-mono text-[10px] font-black text-slate-800 flex items-center space-x-1 border border-black rounded-full">
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E5E5EA] no-print text-xs">
          <div className="flex items-center space-x-2 font-mono text-[#86868B] text-[11px]">
            <span className="font-bold text-[#1D1D1F]">
              Mode: {a4ColorMode === 'monochrome' ? 'Black & White Grayscale' : 'Standard Color'}
            </span>
            <span>•</span>
            <span>
              Layout: {a4LayoutDensity === 'dual_voucher' ? 'Dual Cut Voucher' : a4LayoutDensity === 'compact' ? 'Compact A4' : 'Standard A4'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className={`px-5 py-2 font-bold text-white rounded-xl flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                a4ColorMode === 'monochrome' ? 'bg-black hover:bg-slate-800' : 'bg-[#0071E3] hover:bg-[#0077ED]'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print {paperSize === 'a4_voucher' ? 'A4 Job Voucher' : 'Tag Sticker'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
