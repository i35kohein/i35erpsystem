import React from 'react';
import { Button } from '../ui';
import {X, 
  Printer, 
  CheckCircle2, 
  Clock, 
  ReceiptText, 
  User, 
  Smartphone, 
  FileText, 
  ShieldCheck,
  Receipt,
  ExternalLink} from 'lucide-react';
import { WorkOrder, SystemSettings } from '../../types';

interface PrintableInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  systemSettings?: SystemSettings;
}

export const PrintableInvoiceModal: React.FC<PrintableInvoiceModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  systemSettings
}) => {
  if (!isOpen || !workOrder) return null;

  const shopName = systemSettings?.shopName || 'AppleRepair Pro Service Center';
  const shopPhone = systemSettings?.shopPhone || '+1 (800) 555-AAPL';
  const shopEmail = systemSettings?.shopEmail || 'support-brand@applerepairpro.com';
  const shopAddress = systemSettings?.shopAddress || '1 Infinite Loop, Suite 100, Cupertino, CA 95014';
  const currency = systemSettings?.currencySymbol || 'MMK';
  const taxRate = systemSettings?.taxRatePercent || 6;

  // Calculate Parts vs Labor breakdowns
  const partsItems = workOrder.lineItems?.filter((item) => !item.isLabor) || [];
  const laborItems = workOrder.lineItems?.filter((item) => item.isLabor) || [];

  const partsSubtotal = partsItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const laborSubtotal = laborItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const formattedDate = new Date(workOrder.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handlePopoutPrint = () => {
    const el = document.getElementById('printable-invoice-content');
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
            <title>Service Invoice - ${workOrder.orderNumber}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 0; margin: 0; color: #1d1d1f; line-height: 1.5; background: #fff; }
              .no-print { display: none !important; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 3px; border-bottom: 1px solid #e5e5ea; }
              .printable-invoice-modal { zoom: 0.84 !important; line-height: 1.15 !important; }
              @page { size: A4 portrait; margin: 4mm; }
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
      console.warn('Direct print blocked, attempting popout print:', err);
      handlePopoutPrint();
    }
  };

  return (
    <div className="printable-invoice-root fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print-bg">
      {/* Print CSS rules */}
      <style>{`
        @media print {
          body > #root > .basic-ui {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: transparent !important;
          }
          body > #root > .basic-ui > *:not(.printable-invoice-root) {
            display: none !important;
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
          .printable-invoice-modal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            zoom: 0.84 !important;
            line-height: 1.15 !important;
          }
          .printable-invoice-modal > div {
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm;
          }
        }
      `}</style>

      <div className="printable-invoice-modal bg-white border border-line-strong rounded-2xl max-w-3xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="no-print bg-surface px-5 py-3.5 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-brand" />
            <span className="font-extrabold text-ink text-sm">Official Service Invoice & Voucher</span>
            <span className="bg-brand/10 text-brand-deep font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
              {workOrder.orderNumber}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              onClick={handlePopoutPrint}
              title="Open print in new window if direct print is blocked"
              className="px-3 py-1.5 bg-white border border-line-strong hover:bg-surface text-ink font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand" />
              <span className="hidden sm:inline">Popout Print</span>
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-brand hover:bg-brand-deep text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-ink hover:bg-line rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div id="printable-invoice-content" className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-ink bg-white">
          {/* Top Invoice Header & Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-line pb-6 gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                {systemSettings?.shopLogoUrl ? (
                  <img 
                    src={systemSettings.shopLogoUrl} 
                    alt="Shop Logo" 
                    className="w-10 h-10 rounded-lg object-contain bg-white border border-line p-0.5 shrink-0" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center font-black text-sm shrink-0">
                    
                  </div>
                )}
                <div>
                  <h1 className="font-black text-lg text-ink tracking-tight">{shopName}</h1>
                  <p className="text-xs text-muted">
                    {systemSettings?.shopInfo || 'ACM Certified Hardware Repair & Component Service'}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-0.5 text-muted text-xs">
                <p className="flex items-center space-x-1">
                  <span>{shopAddress}</span>
                </p>
                <p className="flex items-center space-x-2">
                  <span>Tel: {shopPhone}</span>
                  <span>•</span>
                  <span>Email: {shopEmail}</span>
                </p>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="inline-block px-3 py-1 bg-surface border border-line rounded-lg text-right">
                <p className="text-xs uppercase font-bold text-muted tracking-wider">TAX INVOICE / SERVICE VOUCHER</p>
                <p className="font-mono font-black text-base text-brand">{workOrder.orderNumber}</p>
              </div>

              <div className="text-xs space-y-0.5 pt-1">
                <p><span className="text-muted">Date Issued:</span> <strong>{formattedDate}</strong></p>
                <p><span className="text-muted">Service Type:</span> <strong>{workOrder.serviceType || 'Standard Modular'}</strong></p>
                
                {/* Payment Status Badge */}
                <div className="pt-1.5">
                  {workOrder.isPaid ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-success/10 border border-success/30 text-success-deep font-extrabold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PAID FULLY ({workOrder.paymentMethod || 'Settled'})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-warning/10 border border-warning/30 text-warning font-extrabold text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>UNPAID / BALANCE DUE</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Device Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-line">
            {/* Bill To Customer */}
            <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-line pb-3 sm:pb-0 sm:pr-4">
              <div className="flex items-center space-x-1.5 text-brand font-extrabold text-xs uppercase tracking-wider">
                <User className="w-3.5 h-3.5" />
                <span>CUSTOMER / BILL TO</span>
              </div>

              <p className="font-extrabold text-sm text-ink">{workOrder.customerName}</p>
              <p className="text-muted">Town / City: <strong className="text-ink">{workOrder.customerAddress || ''}</strong></p>
              <p className="text-muted">Phone: <strong className="text-ink">{workOrder.customerPhone}</strong></p>
              {workOrder.customerEmail && <p className="text-muted">Email: <strong className="text-ink">{workOrder.customerEmail}</strong></p>}
              <div className="pt-1">
                <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-white border border-line-strong text-ink">
                  Account: {workOrder.customerType || 'Retail'}
                </span>
              </div>
            </div>

            {/* Device Dossier */}
            <div className="space-y-1.5 sm:pl-2">
              <div className="flex items-center space-x-1.5 text-brand font-extrabold text-xs uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>DEVICE & REPAIR SUMMARY</span>
              </div>

              <p className="font-extrabold text-sm text-ink">{workOrder.deviceCategory} - {workOrder.deviceModel}</p>
              <p className="text-muted">Serial / IMEI: <strong className="font-mono text-ink">{workOrder.serialNumber || workOrder.imei || 'N/A'}</strong></p>
              {workOrder.assignedTechName && (
                <p className="text-muted">Technician: <strong className="text-ink">{workOrder.assignedTechName}</strong></p>
              )}
              <p className="text-muted">Warranty Coverage: <strong className="text-brand">{workOrder.warrantyDays || 90} Days Warranty</strong></p>
            </div>
          </div>

          {/* Reported Problem Note */}
          {workOrder.symptomsReported && (
            <div className="p-3 bg-surface border border-line rounded-xl space-y-1">
              <span className="font-extrabold text-xs uppercase text-muted tracking-wider flex items-center space-x-1">
                <FileText className="w-3 h-3 text-brand" />
                <span>Reported Symptoms & Repair Scope</span>
              </span>
              <p className="text-xs text-ink italic">{workOrder.symptomsReported}</p>
            </div>
          )}

          {/* Itemized Parts & Labor Table */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-ink text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <ReceiptText className="w-3.5 h-3.5 text-brand" />
              <span>Itemized Labor & Parts Breakdown</span>
            </h3>

            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface text-muted text-xs font-mono uppercase border-b border-line">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {workOrder.lineItems && workOrder.lineItems.length > 0 ? (
                    workOrder.lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-surface/50'}>
                        <td className="p-3">
                          <p className="font-bold text-ink">{item.description}</p>
                          {item.partQuality && (
                            <span className="text-xs text-muted">{item.partQuality}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                            item.isLabor ? 'bg-brand-soft text-brand border border-brand/30' : 'bg-purple/10 text-purple border border-purple/30'
                          }`}>
                            {item.isLabor ? 'LABOR' : 'PART'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-muted">{item.quantity}</td>
                        <td className="p-3 text-right font-mono text-muted">{item.unitPrice.toLocaleString()} {currency}</td>
                        <td className="p-3 text-right font-mono font-bold text-ink">
                          {(item.unitPrice * item.quantity).toLocaleString()} {currency}
                        </td>
                      </tr>
                    ))
                  ) : (
                    /* Fallback if lineItems is empty */
                    <tr>
                      <td className="p-3 font-bold text-ink">
                        {workOrder.deviceCategory} Hardware Repair Service ({workOrder.deviceModel})
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand-soft text-brand border border-brand/30">
                          SERVICE
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-muted">1</td>
                      <td className="p-3 text-right font-mono text-muted">{workOrder.subtotal.toLocaleString()} {currency}</td>
                      <td className="p-3 text-right font-mono font-bold text-ink">{workOrder.subtotal.toLocaleString()} {currency}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Financial Calculation Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            {/* Payment & Warranty Terms Box */}
            <div className="sm:w-1/2 p-4 bg-surface rounded-xl border border-line space-y-2">
              <span className="font-extrabold text-xs uppercase text-ink tracking-wider flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span>Warranty & Policy Guarantee</span>
              </span>
              <p className="text-xs text-muted leading-relaxed">
                All installed hardware parts and labor services carry an official <strong>{workOrder.warrantyDays || 90}-day limited warranty</strong> from the completion date. Physical, liquid, or unauthorized third-party tampering post-repair voids warranty coverage.
              </p>
              {workOrder.isPaid && workOrder.paymentMethod && (
                <div className="pt-2 border-t border-line text-xs text-success-deep font-bold">
                  ✓ Payment Processed via {workOrder.paymentMethod}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="sm:w-1/2 w-full space-y-2 text-right">
              <div className="bg-white p-4 rounded-xl border border-line space-y-2 shadow-2xs font-mono">
                {partsSubtotal > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Parts Subtotal:</span>
                    <span>{partsSubtotal.toLocaleString()} {currency}</span>
                  </div>
                )}
                {laborSubtotal > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Labor Subtotal:</span>
                    <span>{laborSubtotal.toLocaleString()} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted">
                  <span>Subtotal:</span>
                  <span>{workOrder.subtotal.toLocaleString()} {currency}</span>
                </div>

                {workOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-success-deep font-semibold">
                    <span>Account / B2B Discount:</span>
                    <span>-{workOrder.discountAmount.toLocaleString()} {currency}</span>
                  </div>
                )}

                {workOrder.taxAmount > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Sales Tax ({taxRate}%):</span>
                    <span>+{workOrder.taxAmount.toLocaleString()} {currency}</span>
                  </div>
                )}

                {workOrder.depositAmount > 0 && (
                  <div className="flex justify-between text-success-deep font-semibold">
                    <span>Upfront Deposit Paid:</span>
                    <span>-{workOrder.depositAmount.toLocaleString()} {currency}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2.5 border-t border-line text-sm">
                  <span className="font-extrabold text-ink font-sans">
                    {workOrder.isPaid ? 'Total Amount Paid:' : 'Final Balance Due:'}
                  </span>
                  <span className="font-black text-lg text-brand">
                    {workOrder.totalAmount.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Authorization & Signatures */}
          <div className="pt-6 border-t border-line grid grid-cols-2 gap-8 text-xs text-muted">
            <div className="space-y-8">
              <p>Customer Authorization Signature:</p>
              {workOrder.customerSignatureUrl ? (
                <img src={workOrder.customerSignatureUrl} alt="Customer Signature" className="h-10 object-contain" />
              ) : (
                <div className="border-b border-line-strong h-8 w-4/5"></div>
              )}
              <p className="text-xs">Date: ________________________</p>
            </div>

            <div className="space-y-8 text-right">
              <p>ACMT Service Technician Stamp / Sign:</p>
              <div className="border-b border-line-strong h-8 w-4/5 ml-auto"></div>
              <p className="text-xs">Authorized Signature</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 text-center text-xs text-muted italic">
            Thank you for choosing {shopName}! For service inquiries or warranty support, call {shopPhone}.
          </div>
        </div>

        {/* Modal Action Footer (Hidden in Print) */}
        <div className="no-print bg-surface px-6 py-3 border-t border-line flex justify-between items-center shrink-0">
          <span className="text-xs text-muted">
            Invoice ready for printing or digital distribution.
          </span>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-line-strong text-ink font-semibold text-xs rounded-xl hover:bg-surface transition-colors cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
