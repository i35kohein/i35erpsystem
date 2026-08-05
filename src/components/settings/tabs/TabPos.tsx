import React from 'react';
import { AlignLeft, CheckCircle2, ChevronDown, ExternalLink, FileText, Globe, Mail, MapPin, Palette, Phone, Printer, QrCode, Store, Tag, Type } from 'lucide-react';
import type { SystemSettings } from '../../../types';

interface PosTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  settings: SystemSettings;
  isSectionOpen: (key: string) => boolean;
  toggleSection: (key: string) => void;
  setIsDeviceTagPrinterOpen: (v: boolean) => void;
  setActiveSubTab: (t: any) => void;
  visibleStorePhones: string[];
  receiptFooterEditorRef: React.RefObject<HTMLTextAreaElement>;
  receiptFooterPreviewLines: string[];
  receiptFooterPreviewFontSize: any;
  selectedFooterAlignment: any;
  updateSelectedFooterLines: (editor: HTMLTextAreaElement | null) => void;
  handleReceiptFooterChange: (value: string, editor: HTMLTextAreaElement) => void;
  applyReceiptFooterAlignment: (a: any) => void;
  applyReceiptFooterTextSize: (s: any) => void;
  RECEIPT_FOOTER_ALIGNMENT_OPTIONS: readonly any[];
  RECEIPT_FOOTER_SIZE_OPTIONS: readonly any[];
  splitFooterTextBySize: (text: string, start: number, ranges: Array<{ start: number; end: number; size: 'small' | 'medium' | 'large' }>, fallback: 'small' | 'medium' | 'large') => Array<{ text: string; size: string }>;
}

const PosTab: React.FC<PosTabProps> = ({ formData, setFormData, settings, isSectionOpen, toggleSection, setIsDeviceTagPrinterOpen, setActiveSubTab, visibleStorePhones, receiptFooterEditorRef, receiptFooterPreviewLines, receiptFooterPreviewFontSize, selectedFooterAlignment, updateSelectedFooterLines, handleReceiptFooterChange, applyReceiptFooterAlignment, applyReceiptFooterTextSize, RECEIPT_FOOTER_ALIGNMENT_OPTIONS, RECEIPT_FOOTER_SIZE_OPTIONS, splitFooterTextBySize }) => {
  return (
        <div className="space-y-6">
          {/* Top Banner Header */}
          <div className="bg-gradient-to-r from-[#0071E3]/10 via-[#0071E3]/5 to-transparent p-5 rounded-2xl border border-[#0071E3]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-extrabold text-[#1D1D1F]">POS & Document Print Layout Settings</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0071E3] text-white uppercase tracking-wider">
                    A4 & 3"x2" Tag Ready
                  </span>
                </div>
                <p className="text-xs text-[#526375] mt-0.5">
                  Configure official A4 workshop job sheets, customer invoices, and 3"×2" device intake sticker tags for your repair shop.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDeviceTagPrinterOpen(true)}
              className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Interactive Print Modal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Formats, Branding & Text Fields — collapsible (mobile-friendly) */}
          <div className="bg-white rounded-2xl border border-[#D2D2D7] shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('pos-formats')}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#F8F9FA] hover:bg-[#F0F1F4] transition-colors cursor-pointer"
              aria-expanded={isSectionOpen('pos-formats')}
            >
              <span className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Printer className="w-4 h-4 text-[#0071E3]" />
                <span>Formats, Branding & Text Fields</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-[#86868B] transition-transform ${isSectionOpen('pos-formats') ? '' : 'rotate-180'}`} />
            </button>
            {isSectionOpen('pos-formats') && (
            <div className="space-y-6 p-4">
            {/* Connected Store Branding Status Card — sourced only from Shop Settings. */}
            <div className="bg-white p-4 rounded-2xl border border-[#D2D2D7] shadow-2xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#F8FBFD] border border-[#D8E5ED] p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  {formData.shopLogoUrl ? (
                    <img
                      src={formData.shopLogoUrl}
                      alt="Shop Logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <Store className="w-6 h-6 text-[#0071E3]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-[#86868B] uppercase tracking-wider">Connected Store Branding</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700">Shop Settings source</span>
                  </div>
                  <p className="font-extrabold text-sm text-[#1D1D1F]">{formData.shopName || 'AppleRepair Pro'}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#86868B]">
                    {visibleStorePhones.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span>{visibleStorePhones.join(' • ')}</span>
                      </span>
                    )}
                    {formData.shopEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span>{formData.shopEmail}</span>
                      </span>
                    )}
                    {formData.shopWebsite && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span>{formData.shopWebsite}</span>
                      </span>
                    )}
                    {formData.shopAddress && (
                      <span className="inline-flex min-w-0 basis-full items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span className="truncate">{formData.shopAddress}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('shop')}
                className="px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#0071E3] font-extrabold text-xs rounded-xl border border-[#D2D2D7] transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Edit Shop Profile</span>
              </button>
            </div>

            {/* Standard Format Selection Cards */}
            <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-[#1D1D1F] text-xs flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#0071E3]" />
                  <span>Primary Print Layout Standards</span>
                </label>
                <span className="text-[10px] font-bold text-[#86868B]">No thermal printer required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Option 1: A4 Document */}
                <div 
                  className="p-4 rounded-xl border-2 border-[#0071E3] bg-[#F8FBFD] transition-all relative space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#0071E3] text-white uppercase">
                      Active Standard
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#1D1D1F] block text-xs">Standard A4 Workshop Sheet</span>
                    <p className="text-[11px] text-[#526375] mt-1 leading-snug">
                      Itemized job sheets, diagnostic reports, and customer tax invoices on standard A4 paper.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold text-[#0071E3]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Full 21-Point QA & Signatures</span>
                  </div>
                </div>

                {/* Option 2: 3"x2" Sticker Tag */}
                <div 
                  onClick={() => setIsDeviceTagPrinterOpen(true)}
                  className="p-4 rounded-xl border border-[#D2D2D7] bg-white hover:border-[#0071E3] hover:bg-[#F8FBFD] transition-all cursor-pointer space-y-2 group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-[#0071E3]/10 group-hover:text-[#0071E3] transition-all">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      Intake Tag
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#1D1D1F] block text-xs group-hover:text-[#0071E3] transition-colors">3" × 2" Device Sticker Label</span>
                    <p className="text-[11px] text-[#7F7F7F] mt-1 leading-snug">
                      Compact label sticker format with QR code and barcode for physical hardware tagging.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold text-slate-600 group-hover:text-[#0071E3]">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scannable IMEI & QR Tracking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Fields: Receipt Header & Disclaimer */}
            <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-4">
              <h4 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">
                Voucher Text & Disclaimer Customization
              </h4>
              <p className="text-[11px] text-[#86868B] -mt-2">
                Used by POS receipts and every A4 Device Intake Print Voucher after you save all settings.
              </p>

              <div className="grid grid-cols-1 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-extrabold text-[#1D1D1F]">Receipt & Voucher Header Subtitle</label>
                  <input
                    type="text"
                    value={formData.receiptHeaderTitle}
                    onChange={(e) => setFormData({ ...formData, receiptHeaderTitle: e.target.value })}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3.5 py-2.5 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all"
                    placeholder="e.g. Official ACMT Certified Service Voucher"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-[#1D1D1F]">Receipt Footer Terms & Warranty Note</label>
                  <textarea
                    ref={receiptFooterEditorRef}
                    value={formData.receiptFooterNote}
                    onChange={(e) => handleReceiptFooterChange(e.target.value, e.currentTarget)}
                    onClick={(e) => updateSelectedFooterLines(e.currentTarget)}
                    onKeyUp={(e) => updateSelectedFooterLines(e.currentTarget)}
                    onSelect={(e) => updateSelectedFooterLines(e.currentTarget)}
                    rows={2.5}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3.5 py-2.5 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all"
                    placeholder="e.g. Thank you for choosing AppleRepair! All repairs covered by warranty under standard terms."
                  />
                  <p className="text-[10px] text-[#86868B]">Plain text only. Select text in a line (or place the cursor there), then choose its alignment. Line breaks and text size are kept in the A4 print.</p>

                  <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] p-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#526375]">
                        <AlignLeft className="h-3 w-3" />
                        Selected line
                      </span>
                      <div className="flex rounded-md border border-[#D2D2D7] bg-white p-0.5">
                        {RECEIPT_FOOTER_ALIGNMENT_OPTIONS.map(({ value, label, Icon }) => {
                          const isActive = selectedFooterAlignment === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyReceiptFooterAlignment(value)}
                              style={{ height: 24, minHeight: 24, fontSize: 9, lineHeight: 1 }}
                              className={`flex h-6 items-center gap-0.5 rounded px-1.5 text-[9px] font-bold transition-colors ${
                                isActive ? 'bg-[#0071E3] text-white' : 'text-[#526375] hover:bg-[#F5F5F7]'
                              }`}
                              aria-pressed={isActive}
                              title={`Align selected line(s) ${label}`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#526375]">
                        <Type className="h-3 w-3" />
                        Text size
                      </span>
                      <div className="flex rounded-md border border-[#D2D2D7] bg-white p-0.5">
                        {RECEIPT_FOOTER_SIZE_OPTIONS.map(({ value, label }) => {
                          const isActive = (formData.receiptFooterFontSize || 'medium') === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyReceiptFooterTextSize(value)}
                              style={{ height: 24, minHeight: 24, fontSize: 9, lineHeight: 1 }}
                              className={`h-6 rounded px-1.5 text-[9px] font-bold transition-colors ${
                                isActive ? 'bg-[#0071E3] text-white' : 'text-[#526375] hover:bg-[#F5F5F7]'
                              }`}
                              aria-pressed={isActive}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div
                    data-testid="receipt-footer-live-preview"
                    className="min-h-[72px] rounded-lg border border-dashed border-[#D2D2D7] bg-white px-3 py-2.5 shadow-inner"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[9px] font-extrabold uppercase tracking-wide text-[#86868B]">
                      <span>Live A4 footer preview</span>
                      <span>Updates as you edit</span>
                    </div>
                    <div className="min-h-8 text-[#1D1D1F]">
                      {receiptFooterPreviewLines.map((line, lineIndex) => {
                        const lineStart = receiptFooterPreviewLines.slice(0, lineIndex).reduce((offset, previousLine) => offset + previousLine.length + 1, 0);
                        return (
                        <p
                          key={`${lineIndex}-${line}`}
                          className="min-h-3 leading-tight"
                          style={{
                            fontSize: receiptFooterPreviewFontSize,
                            textAlign: formData.receiptFooterLineAlignments?.[lineIndex] || formData.receiptFooterTextAlign || 'left',
                          }}
                        >
                          {line ? splitFooterTextBySize(line, lineStart, formData.receiptFooterTextSizeRanges || [], formData.receiptFooterFontSize || 'medium').map((segment, segmentIndex) => (
                            <span key={`${segmentIndex}-${segment.text}`} style={{ fontSize: ({ small: 10, medium: 11, large: 12 } as const)[segment.size] }}>{segment.text}</span>
                          )) : '\u00A0'}
                        </p>
                      ); })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            )}
          </div>

          {/* Dedicated A4 Print Voucher & Job Sheet Defaults Block */}
          <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-5">
            <div>
              <h4 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider flex items-center space-x-2">
                <Printer className="w-4 h-4 text-[#0071E3]" />
                <span>A4 Intake Print Voucher & Job Sheet Defaults</span>
              </h4>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                Configure the saved defaults used by every Device Intake Print Voucher. Changes apply after you save all settings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">Default Print Color Palette</label>
                <select
                  value={formData.a4PrintColorMode || 'monochrome'}
                  onChange={(e) => setFormData({ ...formData, a4PrintColorMode: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="monochrome">Black & White / Grayscale (Ink-Saver)</option>
                  <option value="color">Standard Color</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">Default A4 Sheet Layout</label>
                <select
                  value={formData.a4PrintLayoutDensity || 'compact'}
                  onChange={(e) => setFormData({ ...formData, a4PrintLayoutDensity: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="standard">Standard Single A4 Page</option>
                  <option value="compact">Compact Single A4 Page</option>
                  <option value="dual_voucher">Dual Cut Voucher (Cust + Shop Copy)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">Voucher Header Subtitle</label>
                <input
                  type="text"
                  value={formData.a4CustomHeaderNote || 'Official Device Intake & Hardware Diagnostic Voucher'}
                  onChange={(e) => setFormData({ ...formData, a4CustomHeaderNote: e.target.value })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">21-Point Diagnostic Layout</label>
                <select
                  value={formData.a4DiagnosticDisplayFormat || 'comparison_table'}
                  onChange={(e) => setFormData({ ...formData, a4DiagnosticDisplayFormat: e.target.value as SystemSettings['a4DiagnosticDisplayFormat'] })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="comparison_table">Before vs After Table</option>
                  <option value="dual_grid">Before & After Dual Cards</option>
                  <option value="before_only">Before Repair Only</option>
                  <option value="after_only">After QA Pass Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] cursor-pointer hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowDiagnosticsTable ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowDiagnosticsTable: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[#1D1D1F] text-xs block">Include 21-Point Diagnostics</span>
                  <span className="text-[10px] text-[#86868B]">Print pre-repair diagnostic inspection grid.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] cursor-pointer hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowPricingTable ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowPricingTable: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[#1D1D1F] text-xs block">Include Service & Price Matrix</span>
                  <span className="text-[10px] text-[#86868B]">Print requested repair charges & subtotal.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] cursor-pointer hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowTermsDisclaimer ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowTermsDisclaimer: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[#1D1D1F] text-xs block">Include Terms & Signatures</span>
                  <span className="text-[10px] text-[#86868B]">Print disclaimer and authorization lines.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
  );
};

export default PosTab;
